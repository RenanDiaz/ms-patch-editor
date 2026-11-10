/*
 * Read-only scan of the 50 MS-60B patches.
 *
 * Sequence follows MidiIf.StartScan / MidiIf.recv of g200kg/zoom-ms-utility
 * (index.html lines 321-339 and 237-298, commit 5bf930c8e1622b0c70c0c3d761424f84955a227a):
 * Identity Request, Parameter Edit Enable, Request Current Program, then for
 * each slot Program Change + Request Patch, and finally Program Change back to
 * the original slot. Differences from g200kg: explicit timeouts and one retry
 * per patch, the device id is checked before any Program Change, and the
 * original program is restored even if the scan fails.
 *
 * MIT License
 * Copyright (c) 2017 — zoom-ms-utility by g200kg (original LICENSE names no holder)
 * See THIRD_PARTY_NOTICES.md for the full license text.
 */
import type { MidiMessage, MidiTransport } from '../transport/MidiTransport'
import { readOnly } from '../transport/readOnlyGuard'
import {
  identityRequest,
  parameterEditEnable,
  parseIdentityReply,
  parseProgramChange,
  PATCH_SLOTS,
  programChange,
  requestCurrentProgram,
  requestPatch,
  type IdentityReply,
} from './messages'
import { DEVICE_ID_60B, isPatchData60B } from './patch60b'

export interface LogEntry {
  /** ms since scan start */
  t: number
  dir: 'out' | 'in'
  bytes: number[]
}

export interface BankCapture {
  identity: IdentityReply
  originalProgram: number
  /** Raw 105-byte patch messages, index = slot. */
  patches: number[][]
  log: LogEntry[]
}

export interface ScanOptions {
  /** Delay after each sent message. g200kg sends one message per 80 ms. */
  gapMs?: number
  /** How long to wait for each reply. */
  timeoutMs?: number
  onProgress?: (slot: number) => void
  sleep?: (ms: number) => Promise<void>
  now?: () => number
}

export class ScanError extends Error {}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export async function scanBank(transport: MidiTransport, opts: ScanOptions = {}): Promise<BankCapture> {
  const gapMs = opts.gapMs ?? 80
  const timeoutMs = opts.timeoutMs ?? 1500
  const sleep = opts.sleep ?? defaultSleep
  const now = opts.now ?? (() => performance.now())
  const t0 = now()
  const log: LogEntry[] = []
  const io = readOnly(transport)

  // Single listener; waiters pick the first message matching their predicate.
  type Waiter = { match: (m: MidiMessage) => boolean; resolve: (m: MidiMessage) => void }
  let waiter: Waiter | null = null
  const unsubscribe = io.onMessage((m) => {
    log.push({ t: now() - t0, dir: 'in', bytes: Array.from(m) })
    if (waiter && waiter.match(m)) {
      const w = waiter
      waiter = null
      w.resolve(m)
    }
  })

  const send = async (m: Uint8Array) => {
    io.send(m)
    log.push({ t: now() - t0, dir: 'out', bytes: Array.from(m) })
    await sleep(gapMs)
  }

  const request = async (m: Uint8Array, match: (r: MidiMessage) => boolean, what: string) => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const reply = new Promise<MidiMessage>((resolve, reject) => {
      waiter = { match, resolve }
      timer = setTimeout(() => {
        waiter = null
        reject(new ScanError(`timeout waiting for ${what}`))
      }, timeoutMs)
    })
    try {
      io.send(m)
      log.push({ t: now() - t0, dir: 'out', bytes: Array.from(m) })
      return await reply
    } finally {
      clearTimeout(timer)
      await sleep(gapMs)
    }
  }

  let originalProgram: number | null = null
  let changedProgram = false
  try {
    const idMsg = await request(identityRequest(), (r) => parseIdentityReply(r) !== null, 'Identity Reply')
    const identity = parseIdentityReply(idMsg)!
    if (identity.manufacturer !== 0x52 || identity.deviceId !== DEVICE_ID_60B) {
      throw new ScanError(
        `not an MS-60B: manufacturer 0x${identity.manufacturer.toString(16)}, device 0x${identity.deviceId.toString(16)}`,
      )
    }

    await send(parameterEditEnable())
    const pcMsg = await request(requestCurrentProgram(), (r) => parseProgramChange(r) !== null, 'current program')
    originalProgram = parseProgramChange(pcMsg)!

    const patches: number[][] = []
    for (let slot = 0; slot < PATCH_SLOTS; slot++) {
      opts.onProgress?.(slot)
      changedProgram = true
      await send(programChange(slot))
      let data: MidiMessage
      try {
        data = await request(requestPatch(), isPatchData60B, `patch ${slot}`)
      } catch (e) {
        if (!(e instanceof ScanError)) throw e
        data = await request(requestPatch(), isPatchData60B, `patch ${slot} (retry)`)
      }
      patches.push(Array.from(data))
    }
    opts.onProgress?.(PATCH_SLOTS)
    return { identity, originalProgram, patches, log }
  } finally {
    if (changedProgram && originalProgram !== null) {
      try {
        await send(programChange(originalProgram))
      } catch {
        // best effort; the caller sees the original error
      }
    }
    unsubscribe()
  }
}
