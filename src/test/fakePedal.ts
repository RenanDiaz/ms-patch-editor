import cap from '../protocol/__fixtures__/ms60b-bank-2026-11-10-fw2.10.json'
import type { MidiMessage, MidiTransport } from '../transport/MidiTransport'

const bytes = (h: string) => h.split(' ').map((x) => parseInt(x, 16))

/**
 * Simulated MS-60B for tests, starting from the real capture bytes (fw 2.10).
 * Answers Identity, 0x33, Program Change and 0x29; `pedalSends` simulates
 * messages the pedal emits on its own. A model, not the pedal.
 */
export function fakePedal(opts: { current?: number } = {}) {
  const memory = cap.patches.map(bytes)
  let program = opts.current ?? cap.originalProgram
  const sent: number[][] = []
  const listeners = new Set<(m: MidiMessage) => void>()
  const deliver = (b: number[]) => listeners.forEach((l) => l(Uint8Array.from(b)))
  const reply = (b: number[]) => queueMicrotask(() => deliver(b))
  const transport: MidiTransport = {
    send(m) {
      const b = Array.from(m)
      sent.push(b)
      const hex = b.map((v) => v.toString(16).padStart(2, '0')).join('')
      if (hex === 'f07e000601f7') reply(bytes(cap.log.find((l) => l.dir === 'in' && l.hex.startsWith('f0 7e'))!.hex))
      else if (hex === 'f052005f33f7') {
        reply([0xb0, 0, 0])
        reply([0xb0, 0x20, 0])
        reply([0xc0, program])
      } else if (b[0] === 0xc0) program = b[1]
      else if (hex === 'f052005f29f7') reply(memory[program])
    },
    onMessage(l) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    close() {},
  }
  return {
    transport,
    sent,
    memory,
    get program() {
      return program
    },
    /** The user changes patch on the pedal. */
    selectOnPedal(slot: number) {
      program = slot
      deliver([0xb0, 0, 0])
      deliver([0xb0, 0x20, 0])
      deliver([0xc0, slot])
    },
    /** The user turns a knob on the pedal: memory of the active slot changes and the pedal emits 0x31. */
    turnKnob(effect: number, param: number, value: number, newBytes?: number[]) {
      if (newBytes) memory[program] = newBytes
      deliver([0xf0, 0x52, 0x00, 0x5f, 0x31, effect, param, value & 0x7f, value >> 7, 0xf7])
    },
  }
}
