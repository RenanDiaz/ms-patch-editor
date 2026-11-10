import { describe, expect, it, vi } from 'vitest'
import cap from '../__fixtures__/ms60b-bank-2026-11-10-fw2.10.json'
import { fakePedal } from '../../test/fakePedal'
import { isAllowedReadMessage, parseParamEdit } from '../messages'
import { PedalSession, type PedalEvent } from '../pedalSession'

const fast = { gapMs: 0, timeoutMs: 50, sleep: () => Promise.resolve(), now: () => 0 }

describe('parseParamEdit', () => {
  it('parses the 0x31 the pedal emits (14-bit value)', () => {
    expect(parseParamEdit([0xf0, 0x52, 0x00, 0x5f, 0x31, 1, 4, 0x08, 0x02, 0xf7])).toEqual({ effect: 1, param: 4, value: 0x108 })
    expect(parseParamEdit([0xf0, 0x52, 0x00, 0x5f, 0x28, 1, 4, 0, 0, 0xf7])).toBeNull()
  })
})

describe('PedalSession (simulated pedal)', () => {
  it('scans the real bank and knows the active patch; sends only read messages', async () => {
    const pedal = fakePedal()
    const s = new PedalSession(pedal.transport, fast)
    const c = await s.scan()
    expect(c.patches.map((p) => p.map((v) => v.toString(16).padStart(2, '0')).join(' '))).toEqual(cap.patches)
    expect(s.activeProgram).toBe(cap.originalProgram)
    expect(pedal.program).toBe(cap.originalProgram)
    pedal.sent.forEach((m) => expect(isAllowedReadMessage(m)).toBe(true))
  })

  it('readSlot of another slot goes there and back to the active patch', async () => {
    const pedal = fakePedal({ current: 23 })
    const s = new PedalSession(pedal.transport, fast)
    await s.scan()
    pedal.sent.length = 0
    expect(await s.readSlot(5)).toEqual(pedal.memory[5])
    expect(pedal.sent.map((m) => m.slice(0, 2))).toEqual([[0xc0, 5], [0xf0, 0x52], [0xc0, 23]])
    pedal.sent.length = 0
    await s.readSlot(23)
    expect(pedal.sent).toEqual([[0xf0, 0x52, 0x00, 0x5f, 0x29, 0xf7]])
  })

  it('reports patch changes and knob turns made on the pedal, but not its replies during an operation', async () => {
    const pedal = fakePedal()
    const s = new PedalSession(pedal.transport, fast)
    const events: PedalEvent[] = []
    s.onEvent((e) => events.push(e))
    await s.scan()
    expect(events).toEqual([]) // C0 replies during the scan are not events
    pedal.selectOnPedal(7)
    pedal.turnKnob(0, 2, 50)
    expect(events).toEqual([
      { type: 'program', slot: 7 },
      { type: 'param', effect: 0, param: 2, value: 50 },
    ])
    expect(s.activeProgram).toBe(7)
  })

  it('runs operations one at a time', async () => {
    const pedal = fakePedal()
    const s = new PedalSession(pedal.transport, fast)
    await s.scan()
    pedal.sent.length = 0
    const spy = vi.fn()
    await Promise.all([s.readSlot(1).then(() => spy(1)), s.readSlot(2).then(() => spy(2))])
    expect(spy.mock.calls).toEqual([[1], [2]])
    expect(pedal.sent.filter((m) => m[0] === 0xc0).map((m) => m[1])).toEqual([1, cap.originalProgram, 2, cap.originalProgram])
  })
})
