/*
 * S3 controlled-write procedures. Message order follows g200kg's StoreAll
 * (index.html:1659-1680, commit 5bf930c8e1622b0c70c0c3d761424f84955a227a):
 * Program Change, Send Patch 0x28, Store 0x32, ack. The fw 2.10 ack takes
 * ~2.5 s; it is awaited up to 4 s and the read-back decides. Differences: every write goes through withApprovedWrites() with the exact
 * bytes, the slot is read back from memory after switching away and back,
 * and the original program is restored at the end.
 *
 * MIT License
 * Copyright (c) 2017 — zoom-ms-utility by g200kg (original LICENSE names no holder)
 * See THIRD_PARTY_NOTICES.md for the full license text.
 */
import type { MidiMessage, MidiTransport } from '../transport/MidiTransport'
import { withApprovedWrites, type WriteApproval } from '../transport/approvedWrites'
import { readOnly } from '../transport/readOnlyGuard'
import { parseProgramChange, PATCH_SLOTS, programChange, requestCurrentProgram, requestPatch } from './messages'
import { isPatchData60B } from './patch60b'
import type { LogEntry } from './scanBank'
import { isStoreAck, parameterEdit, sendPatch, storePatch } from './writeMessages'

export class S3Error extends Error {}

export interface SessionOptions {
  gapMs?: number
  timeoutMs?: number
  sleep?: (ms: number) => Promise<void>
  now?: () => number
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Sends/receives over one guarded transport and appends to a shared log. */
export class MidiSession {
  private waiter: { match: (m: MidiMessage) => boolean; resolve: (m: MidiMessage) => void } | null = null
  private readonly unsubscribe: () => void
  private readonly gapMs: number
  private readonly timeoutMs: number
  readonly sleep: (ms: number) => Promise<void>
  private readonly now: () => number
  private readonly io: MidiTransport
  readonly log: LogEntry[]
  private readonly t0: number

  constructor(io: MidiTransport, log: LogEntry[], t0: number, opts: SessionOptions = {}) {
    this.io = io
    this.log = log
    this.t0 = t0
    this.gapMs = opts.gapMs ?? 80
    this.timeoutMs = opts.timeoutMs ?? 1500
    this.sleep = opts.sleep ?? defaultSleep
    this.now = opts.now ?? (() => performance.now())
    this.unsubscribe = io.onMessage((m) => {
      this.log.push({ t: this.now() - this.t0, dir: 'in', bytes: Array.from(m) })
      if (this.waiter?.match(m)) {
        const w = this.waiter
        this.waiter = null
        w.resolve(m)
      }
    })
  }

  async send(m: Uint8Array) {
    this.io.send(m)
    this.log.push({ t: this.now() - this.t0, dir: 'out', bytes: Array.from(m) })
    await this.sleep(this.gapMs)
  }

  async request(m: Uint8Array, match: (r: MidiMessage) => boolean, what: string): Promise<MidiMessage> {
    let timer: ReturnType<typeof setTimeout> | undefined
    const reply = new Promise<MidiMessage>((resolve, reject) => {
      this.waiter = { match, resolve }
      timer = setTimeout(() => {
        this.waiter = null
        reject(new S3Error(`timeout esperando ${what}`))
      }, this.timeoutMs)
    })
    try {
      this.io.send(m)
      this.log.push({ t: this.now() - this.t0, dir: 'out', bytes: Array.from(m) })
      return await reply
    } finally {
      clearTimeout(timer)
      await this.sleep(this.gapMs)
    }
  }

  close() {
    this.unsubscribe()
  }
}

export interface S3Context {
  transport: MidiTransport
  log: LogEntry[]
  t0: number
  opts?: SessionOptions
}

async function withSession<T>(ctx: S3Context, io: MidiTransport, fn: (s: MidiSession) => Promise<T>): Promise<T> {
  const s = new MidiSession(io, ctx.log, ctx.t0, ctx.opts)
  try {
    return await fn(s)
  } finally {
    s.close()
  }
}

const neighbour = (slot: number) => (slot + 1) % PATCH_SLOTS

async function readStored(s: MidiSession, slot: number): Promise<number[]> {
  // Switch away and back so the read comes from memory, not from the edit buffer.
  await s.send(programChange(neighbour(slot)))
  await s.send(programChange(slot))
  return Array.from(await s.request(requestPatch(), isPatchData60B, `patch ${slot + 1}`))
}

export const currentProgram = (ctx: S3Context) =>
  withSession(ctx, readOnly(ctx.transport), async (s) =>
    parseProgramChange(await s.request(requestCurrentProgram(), (r) => parseProgramChange(r) !== null, 'patch activo'))!,
  )

/** Read one slot (read class). */
export const readSlot = (ctx: S3Context, slot: number) =>
  withSession(ctx, readOnly(ctx.transport), async (s) => {
    await s.send(programChange(slot))
    return Array.from(await s.request(requestPatch(), isPatchData60B, `patch ${slot + 1}`))
  })

/** Program Change back to a slot (read with notice). */
export const selectProgram = (ctx: S3Context, slot: number) =>
  withSession(ctx, readOnly(ctx.transport), (s) => s.send(programChange(slot)))

export const writeApproval = (slot: number, bytes: ArrayLike<number>, label: string): WriteApproval => ({
  label,
  writes: [sendPatch(bytes), storePatch(slot)],
})

export interface WriteResult {
  /** Store acknowledgement, if it arrived. MS-60B fw 2.10: F0 52 00 5F 00 00 F7 about 2.5 s after Store (docs/protocol.md §9.2). */
  ack: number[] | null
  readBack: number[]
  /** Byte offsets where readBack differs from what was written. */
  diff: number[]
}

export const diffOffsets = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => i).filter((i) => a[i] !== b[i])

/**
 * C0 pp → 0x28 → 0x32 → wait for the ack (up to ackTimeoutMs) → read back
 * from memory. Needs the approval built by writeApproval() for these bytes.
 * The ack is recorded but success is decided by the read-back.
 */
export function writeSlot(
  ctx: S3Context,
  slot: number,
  bytes: ArrayLike<number>,
  approval: WriteApproval,
  ackTimeoutMs = 4000,
): Promise<WriteResult> {
  const io = withApprovedWrites(ctx.transport, approval)
  return withSession(ctx, io, async (s) => {
    await s.send(programChange(slot))
    await s.send(sendPatch(bytes))
    const from = s.log.length
    await s.send(storePatch(slot))
    const findAck = () => s.log.slice(from).find((l) => l.dir === 'in' && isStoreAck(l.bytes))
    for (let waited = 0; !findAck() && waited < ackTimeoutMs; waited += 100) await s.sleep(100)
    const ack = findAck()?.bytes ?? null
    if (io.pending() !== 0) throw new S3Error('quedaron escrituras aprobadas sin enviar')
    const readBack = await readStored(s, slot)
    return { ack, readBack, diff: diffOffsets(bytes, readBack) }
  })
}

export const autoSaveApproval = (bytes: ArrayLike<number>, slot: number): WriteApproval => ({
  label: `Enviar al buffer de edición del patch ${slot + 1} (0x28, sin Store)`,
  writes: [sendPatch(bytes)],
})

export interface AutoSaveResult {
  /** What the slot holds in memory after sending 0x28 only and switching away and back. */
  stored: number[]
  persisted: boolean
}

/**
 * Send-only probe (spec §3, S3): C0 pp → 0x28 (no Store) → wait → switch
 * away and back → read. If the slot now holds the sent bytes, the pedal kept
 * the 0x28 without Store. On fw 2.10 it does, with AUTO SAVE ON or OFF, and
 * it survives a power cycle (docs/protocol.md §9.2).
 */
export function autoSaveProbe(
  ctx: S3Context,
  slot: number,
  bytes: ArrayLike<number>,
  approval: WriteApproval,
  waitMs = 3000,
): Promise<AutoSaveResult> {
  const io = withApprovedWrites(ctx.transport, approval)
  return withSession(ctx, io, async (s) => {
    await s.send(programChange(slot))
    await s.send(sendPatch(bytes))
    await s.sleep(waitMs)
    const stored = await readStored(s, slot)
    return { stored, persisted: diffOffsets(stored, bytes).length === 0 }
  })
}

export interface ParamEdit {
  effect: number
  param: number
  value: number
}

export const paramEditApproval = (slot: number, edits: readonly ParamEdit[]): WriteApproval => ({
  label: `Enviar ${edits.length} Parameter Edit (0x31) al patch ${slot + 1}`,
  writes: edits.map((e) => parameterEdit(e.effect, e.param, e.value)),
})

export interface ParamEditResult {
  /** Edit buffer right after the 0x31 messages (0x29 without leaving the patch). */
  buffer: number[]
  /** Slot after switching away and back. */
  stored: number[]
}

/**
 * 0x31 probe (spec §3, live listening): C0 pp → 0x31 × n → wait → read the
 * buffer → switch away and back → read again. Shows whether 0x31 changes
 * what sounds, on which effects, and whether it is kept.
 */
export function paramEditProbe(
  ctx: S3Context,
  slot: number,
  edits: readonly ParamEdit[],
  approval: WriteApproval,
  waitMs = 500,
): Promise<ParamEditResult> {
  const io = withApprovedWrites(ctx.transport, approval)
  return withSession(ctx, io, async (s) => {
    await s.send(programChange(slot))
    for (const e of edits) await s.send(parameterEdit(e.effect, e.param, e.value))
    await s.sleep(waitMs)
    const buffer = Array.from(await s.request(requestPatch(), isPatchData60B, `buffer ${slot + 1}`))
    const stored = await readStored(s, slot)
    return { buffer, stored }
  })
}

/**
 * 0x28 timing probe: C0 pp → 0x28, and stay on the patch (no switching).
 * The user then power-cycles the pedal and the slot is read again.
 */
export function sendAndStay(ctx: S3Context, slot: number, bytes: ArrayLike<number>, approval: WriteApproval): Promise<void> {
  const io = withApprovedWrites(ctx.transport, approval)
  return withSession(ctx, io, async (s) => {
    await s.send(programChange(slot))
    await s.send(sendPatch(bytes))
  })
}
