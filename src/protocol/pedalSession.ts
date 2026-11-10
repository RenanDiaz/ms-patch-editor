/*
 * Read-only connection to the pedal for the editor (v1): bank scan, re-reading
 * one slot, and events the pedal sends on its own (patch change, knob turned).
 * Every message goes through readOnly(): this file cannot write.
 */
import type { MidiMessage, MidiTransport } from '../transport/MidiTransport'
import { readOnly } from '../transport/readOnlyGuard'
import { parseParamEdit, parseProgramChange, programChange, requestPatch, type ParamEditEvent } from './messages'
import { isPatchData60B } from './patch60b'
import { MidiSession, type SessionOptions } from './s3'
import { scanBank, type BankCapture, type LogEntry, type ScanOptions } from './scanBank'

export type PedalEvent = { type: 'program'; slot: number } | ({ type: 'param' } & ParamEditEvent)

const LOG_LIMIT = 2000

export class PedalSession {
  private readonly io: MidiTransport
  private readonly listeners = new Set<(e: PedalEvent) => void>()
  private readonly unsubscribe: () => void
  private queue: Promise<unknown> = Promise.resolve()
  private busy = 0
  private readonly t0: number
  readonly log: LogEntry[] = []
  /** Pedal's active patch as last known (scan start, our own Program Changes, or the pedal's C0). */
  activeProgram: number | null = null

  private readonly opts: SessionOptions & Pick<ScanOptions, 'gapMs' | 'timeoutMs' | 'sleep'>

  constructor(transport: MidiTransport, opts: SessionOptions & Pick<ScanOptions, 'gapMs' | 'timeoutMs' | 'sleep'> = {}) {
    this.opts = opts
    this.io = readOnly(transport)
    this.t0 = (opts.now ?? (() => performance.now()))()
    this.unsubscribe = this.io.onMessage((m) => this.onIdleMessage(m))
  }

  /** Messages that arrive while no operation runs are the pedal's own events. */
  private onIdleMessage(m: MidiMessage) {
    if (this.busy) return
    const slot = parseProgramChange(m)
    if (slot !== null) {
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

  close() {
    this.unsubscribe()
    this.listeners.clear()
  }
}
