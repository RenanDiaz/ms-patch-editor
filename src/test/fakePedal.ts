import cap from '../protocol/__fixtures__/ms60b-bank-2026-11-10-fw2.10.json'
import { decodePatch60B, encodePatch60B } from '../protocol/patch60b'
import type { MidiMessage, MidiTransport } from '../transport/MidiTransport'

const bytes = (h: string) => h.split(' ').map((x) => parseInt(x, 16))

/**
 * Simulated MS-60B for tests, starting from the real capture bytes (fw 2.10).
 * Follows what was measured on the pedal (docs/protocol.md §9.2-9.3):
 * - 0x28 and 0x31 change the edit buffer of the active patch;
 * - the buffer is kept in the slot when leaving the patch (Program Change);
 * - 0x31 only works on effects 1-3;
 * - Store 0x32 keeps the buffer in slot pp and answers F0 52 00 5F 00 00 F7.
 * `pedalSends` helpers simulate what the user does on the pedal. A model, not the pedal.
 */
export function fakePedal(opts: { current?: number } = {}) {
  const memory = cap.patches.map(bytes)
  let program = opts.current ?? cap.originalProgram
  let buffer = memory[program].slice()
  const sent: number[][] = []
  const listeners = new Set<(m: MidiMessage) => void>()
  const deliver = (b: number[]) => listeners.forEach((l) => l(Uint8Array.from(b)))
  const reply = (b: number[]) => queueMicrotask(() => deliver(b))
  const leaveTo = (slot: number) => {
    memory[program] = buffer.slice()
    program = slot
    buffer = memory[program].slice()
  }
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
      } else if (b[0] === 0xc0) leaveTo(b[1])
      else if (hex === 'f052005f29f7') reply(buffer.slice())
      else if (b[4] === 0x28) buffer = b
      else if (b[4] === 0x31 && b[5] < 3 && b[6] >= 2) {
        const d = decodePatch60B(buffer)
        const effects = d.effects.slice(0, d.maxFx).map((e, i) =>
          i === b[5] ? { ...e, params: e.params.map((v, j) => (j === b[6] - 2 ? b[7] + (b[8] << 7) : v)) } : e,
        )
        buffer = Array.from(encodePatch60B(buffer, { name: d.name, effects }))
      } else if (b[4] === 0x32) {
        memory[b[8]] = buffer.slice()
        reply([0xf0, 0x52, 0x00, 0x5f, 0x00, 0x00, 0xf7])
      }
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
    get buffer() {
      return buffer
    },
    /**
     * The user changes patch on the pedal (the edited buffer is kept, as on the
     * real pedal). The pedal does not announce it: the app sees it by polling 0x33.
     */
    selectOnPedal(slot: number) {
      leaveTo(slot)
    },
    /** The user turns a knob on the pedal: the buffer changes and the pedal emits 0x31. */
    turnKnob(effect: number, param: number, value: number, newBytes?: number[]) {
      if (newBytes) buffer = newBytes
      deliver([0xf0, 0x52, 0x00, 0x5f, 0x31, effect, param, value & 0x7f, value >> 7, 0xf7])
    },
    /** A change on the pedal that it does not announce (e.g. effect 4 on/off): only the buffer changes. */
    silentEdit(newBytes: number[]) {
      buffer = newBytes
    },
    /** Power cycle: the unsaved buffer is lost. */
    powerCycle() {
      buffer = memory[program].slice()
    },
  }
}
