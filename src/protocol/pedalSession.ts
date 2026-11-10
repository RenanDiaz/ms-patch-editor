/*
 * Connection to the pedal for the editor: bank scan, re-reading a slot,
 * events the pedal sends on its own (patch change, knob turned), and the
 * writes the user triggers in the app (live listening, Save, restore).
 *
 * Reads go through readOnly(). Every write goes through withApprovedWrites()
 * with the exact bytes of that one operation (CLAUDE.md rules 1 and 3).
 */
import type { MidiMessage, MidiTransport } from '../transport/MidiTransport'
import { withApprovedWrites } from '../transport/approvedWrites'
import { readOnly } from '../transport/readOnlyGuard'
import { parseParamEdit, parseProgramChange, programChange, requestCurrentProgram, requestPatch, type ParamEditEvent } from './messages'
import { isPatchData60B } from './patch60b'
import { MidiSession, writeApproval, writeSlot, type SessionOptions, type WriteResult } from './s3'
import { scanBank, type BankCapture, type LogEntry, type ScanOptions } from './scanBank'

/** A live write was refused because the pedal is not on the expected patch. Nothing was sent. */
export class WrongPatchError extends Error {
  readonly expected: number
  readonly actual: number
  constructor(expected: number, actual: number) {
    super(`El pedal está en el patch ${actual + 1}, no en el ${expected + 1}: no se envió nada.`)
    this.expected = expected
    this.actual = actual
  }
}

export type PedalEvent = { type: 'program'; slot: number } | ({ type: 'param' } & ParamEditEvent)

const LOG_LIMIT = 2000

export class PedalSession {
  private readonly io: MidiTransport
  private readonly raw: MidiTransport
  private readonly listeners = new Set<(e: PedalEvent) => void>()
  private readonly unsubscribe: () => void
  private queue: Promise<unknown> = Promise.resolve()
  private busy = 0
  /** Program Change replies right after an operation may be stale; ignore them until this time. */
  private quietUntil = 0
  private pollTimer: ReturnType<typeof setInterval> | undefined
  private readonly clock: () => number
  private readonly t0: number
  readonly log: LogEntry[] = []
  /** Pedal's active patch as last known (scan start, our own Program Changes, or the pedal's C0). */
  activeProgram: number | null = null

  private readonly opts: SessionOptions & Pick<ScanOptions, 'gapMs' | 'timeoutMs' | 'sleep'>

  constructor(transport: MidiTransport, opts: SessionOptions & Pick<ScanOptions, 'gapMs' | 'timeoutMs' | 'sleep'> = {}) {
    this.opts = opts
    this.raw = transport
    this.io = readOnly(transport)
    this.clock = () => performance.now()
    this.t0 = (opts.now ?? this.clock)()
    this.unsubscribe = this.io.onMessage((m) => this.onIdleMessage(m))
  }

  /** Messages that arrive while no operation runs are the pedal's own events (or replies to polling). */
  private onIdleMessage(m: MidiMessage) {
    if (this.busy) return
    const slot = parseProgramChange(m)
    if (slot !== null) {
      if (this.clock() < this.quietUntil || slot === this.activeProgram) return
      this.activeProgram = slot
      this.emit({ type: 'program', slot })
      return
    }
    const p = parseParamEdit(m)
    if (p) this.emit({ type: 'param', ...p })
  }

  private emit(e: PedalEvent) {
    this.listeners.forEach((l) => l(e))
  }

  onEvent(l: (e: PedalEvent) => void): () => void {
    this.listeners.add(l)
    return () => this.listeners.delete(l)
  }

  /** Runs operations one at a time; pedal events are ignored while one runs. */
  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = async () => {
      this.busy++
      try {
        return await fn()
      } finally {
        this.busy--
        this.quietUntil = this.clock() + 300
        if (this.log.length > LOG_LIMIT) this.log.splice(0, this.log.length - LOG_LIMIT)
      }
    }
    const p = this.queue.then(run, run)
    this.queue = p.catch(() => undefined)
    return p
  }

  /** Reads the 50 patches (read with notice: Program Change 0..49, then back to the active patch). */
  scan(onProgress?: (slot: number) => void): Promise<BankCapture> {
    return this.exclusive(async () => {
      const cap = await scanBank(this.io, { ...this.opts, onProgress })
      this.log.push(...cap.log)
      this.activeProgram = cap.originalProgram
      return cap
    })
  }

  /** Re-reads one slot. If it is not the active patch: C0 slot, 0x29, then C0 back to the active patch. */
  readSlot(slot: number): Promise<number[]> {
    return this.exclusive(async () => {
      const s = new MidiSession(this.io, this.log, this.t0, this.opts)
      const back = this.activeProgram
      try {
        if (back !== slot) await s.send(programChange(slot))
        return Array.from(await s.request(requestPatch(), isPatchData60B, `patch ${slot + 1}`))
      } finally {
        if (back !== null && back !== slot) await s.send(programChange(back)).catch(() => undefined)
        s.close()
      }
    })
  }

  /** Program Change to a slot (read with notice). Leaving a patch makes the pedal keep its edit buffer. */
  select(slot: number): Promise<void> {
    return this.exclusive(async () => {
      if (this.activeProgram === slot) return
      const s = new MidiSession(this.io, this.log, this.t0, this.opts)
      try {
        await s.send(programChange(slot))
        this.activeProgram = slot
      } finally {
        s.close()
      }
    })
  }

  /**
   * Live listening: sends 0x28 / 0x31 messages to the active patch's edit
   * buffer. The pedal keeps them in the slot only when leaving the patch.
   */
  sendLive(slot: number, messages: readonly Uint8Array[], label = 'Escucha en vivo'): Promise<void> {
    if (messages.length === 0) return Promise.resolve()
    return this.exclusive(async () => {
      // The edit buffer belongs to whatever patch the pedal is on: confirm it is `slot` first.
      const check = new MidiSession(this.io, this.log, this.t0, this.opts)
      let now: number
      try {
        now = parseProgramChange(await check.request(requestCurrentProgram(), (r) => parseProgramChange(r) !== null, 'patch activo'))!
      } finally {
        check.close()
      }
      if (now !== slot) {
        const was = this.activeProgram
        this.activeProgram = now
        if (was !== now) queueMicrotask(() => this.emit({ type: 'program', slot: now }))
        throw new WrongPatchError(slot, now)
      }
      const io = withApprovedWrites(this.raw, { label, writes: messages })
      const s = new MidiSession(io, this.log, this.t0, { ...this.opts, gapMs: Math.min(this.opts.gapMs ?? 10, 10) })
      try {
        for (const m of messages) await s.send(m)
      } finally {
        s.close()
      }
    })
  }

  /** Save: C0 slot, 0x28, 0x32, ack, read back from memory (writeSlot, S3). The pedal ends on `slot`. */
  save(slot: number, bytes: ArrayLike<number>): Promise<WriteResult> {
    return this.exclusive(async () => {
      const r = await writeSlot({ transport: this.raw, log: this.log, t0: this.t0, opts: this.opts }, slot, bytes, writeApproval(slot, bytes, `Guardar en la ranura ${slot + 1}`))
      this.activeProgram = slot
      return r
    })
  }

  /**
   * Best effort, synchronous: puts the original bytes back in the edit buffer
   * when the page is closing (no awaiting possible). Not verified.
   */
  emergencyRestore(slot: number, bytes: ArrayLike<number>) {
    if (this.activeProgram !== slot) return
    const m = Uint8Array.from(bytes)
    withApprovedWrites(this.raw, { label: 'Restaurar al cerrar', writes: [m] }).send(m)
  }

  /**
   * The pedal does not announce patch changes made on it (g200kg polls 0x33
   * every 80 ms, index.html:448). Polls while idle; replies are not logged.
   */
  startPolling(intervalMs = 250) {
    this.stopPolling()
    this.pollTimer = setInterval(() => {
      if (!this.busy) this.io.send(requestCurrentProgram())
    }, intervalMs)
  }

  stopPolling() {
    clearInterval(this.pollTimer)
    this.pollTimer = undefined
  }

  close() {
    this.stopPolling()
    this.unsubscribe()
    this.listeners.clear()
  }
}
