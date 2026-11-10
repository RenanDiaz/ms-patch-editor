import { describe, expect, it } from 'vitest'
import type { MidiMessage, MidiTransport } from '../../transport/MidiTransport'
import { readOnly, BlockedWriteError } from '../../transport/readOnlyGuard'
import { scanBank, ScanError } from '../scanBank'
import golden from './g200kg-readbin-golden.json'

/**
 * Simulated pedal for tests. Patch bytes are the synthetic g200kg golden
 * cases, NOT pedal captures. Replies are delivered asynchronously.
 */
function fakePedal(opts: { deviceId?: number; current?: number; dropPatchOnce?: number; silentFrom?: number } = {}) {
  const sent: number[][] = []
  let program = opts.current ?? 7
  let dropped = false
  const listeners = new Set<(m: MidiMessage) => void>()
  const reply = (bytes: number[]) =>
    queueMicrotask(() => listeners.forEach((l) => l(Uint8Array.from(bytes))))
  const transport: MidiTransport = {
    send(m) {
      const b = Array.from(m)
      sent.push(b)
      const hex = b.map((v) => v.toString(16).padStart(2, '0')).join('')
      if (hex === 'f07e000601f7') {
        reply([0xf0, 0x7e, 0x00, 0x06, 0x02, 0x52, opts.deviceId ?? 0x5f, 0, 0, 0, 0x31, 0x2e, 0x30, 0x30, 0xf7])
      } else if (hex === 'f052005f33f7') {
        reply([0xb0, 0x00, 0x00])
        reply([0xb0, 0x20, 0x00])
        reply([0xc0, program])
      } else if (b[0] === 0xc0) {
        program = b[1]
      } else if (hex === 'f052005f29f7') {
        if (opts.silentFrom !== undefined && program >= opts.silentFrom) return
        if (program === opts.dropPatchOnce && !dropped) {
          dropped = true
          return
        }
        reply(golden.cases[program].bytes)
      }
    },
    onMessage(l) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    close() {},
  }
  return { transport, sent, get program() { return program } }
}

const fast = { gapMs: 0, timeoutMs: 20, sleep: () => Promise.resolve() }

describe('scanBank (simulated pedal)', () => {
  it('reads 50 patches in slot order and restores the original program', async () => {
    const pedal = fakePedal({ current: 7 })
    const cap = await scanBank(pedal.transport, fast)
    expect(cap.patches).toHaveLength(50)
    cap.patches.forEach((p, i) => expect(p).toEqual(golden.cases[i].bytes))
    expect(cap.originalProgram).toBe(7)
    expect(cap.identity.version).toBe('1.00')
    expect(pedal.sent.at(-1)).toEqual([0xc0, 7])
    expect(pedal.program).toBe(7)
  })

  it('sends only read messages, in the g200kg order', async () => {
    const pedal = fakePedal()
    await scanBank(pedal.transport, fast)
    const head = pedal.sent.slice(0, 6).map((b) => b.map((v) => v.toString(16).padStart(2, '0')).join(' '))
    expect(head).toEqual([
      'f0 7e 00 06 01 f7',
      'f0 52 00 5f 50 f7',
      'f0 52 00 5f 33 f7',
      'c0 00',
      'f0 52 00 5f 29 f7',
      'c0 01',
    ])
    // No 0x28 / 0x31 / 0x32 / 0x51 / 0x60 ever.
    const writes = pedal.sent.filter((b) => b[0] === 0xf0 && b[1] === 0x52 && ![0x29, 0x33, 0x50].includes(b[4]))
    expect(writes).toEqual([])
  })

  it('aborts before any Program Change if the device is not an MS-60B', async () => {
    const pedal = fakePedal({ deviceId: 0x58 })
    await expect(scanBank(pedal.transport, fast)).rejects.toThrow(/not an MS-60B/)
    expect(pedal.sent.some((b) => b[0] === 0xc0)).toBe(false)
  })

  it('retries a missing patch once', async () => {
    const pedal = fakePedal({ dropPatchOnce: 3 })
    const cap = await scanBank(pedal.transport, fast)
    expect(cap.patches[3]).toEqual(golden.cases[3].bytes)
  })

  it('fails on a second timeout and still restores the original program', async () => {
    const pedal = fakePedal({ current: 12, silentFrom: 5 })
    await expect(scanBank(pedal.transport, fast)).rejects.toThrow(ScanError)
    expect(pedal.sent.at(-1)).toEqual([0xc0, 12])
  })
})

describe('readOnly guard', () => {
  const sink: MidiTransport = { send() {}, onMessage: () => () => {}, close() {} }
  const guarded = readOnly(sink)
  const blocked: [string, number[]][] = [
    ['Send Patch 0x28', [0xf0, 0x52, 0x00, 0x5f, 0x28, ...new Array(99).fill(0), 0xf7]],
    ['Parameter Edit 0x31', [0xf0, 0x52, 0x00, 0x5f, 0x31, 0, 2, 50, 0, 0xf7]],
    ['Store 0x32', [0xf0, 0x52, 0x00, 0x5f, 0x32, 0x01, 0, 0, 3, 0, 0, 0, 0, 0, 0xf7]],
    ['Edit Disable 0x51', [0xf0, 0x52, 0x00, 0x5f, 0x51, 0xf7]],
    ['unknown 0x60', [0xf0, 0x52, 0x00, 0x5f, 0x60, 0xf7]],
    ['Tuner CC74', [0xb0, 0x4a, 0x7f]],
    ['Program Change 50', [0xc0, 50]],
    ['other device 0x58', [0xf0, 0x52, 0x00, 0x58, 0x29, 0xf7]],
  ]
  it.each(blocked)('blocks %s', (_, bytes) => {
    expect(() => guarded.send(Uint8Array.from(bytes))).toThrow(BlockedWriteError)
  })
})
