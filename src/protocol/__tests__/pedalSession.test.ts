import { describe, expect, it, vi } from 'vitest'
import cap from '../__fixtures__/ms60b-bank-2026-11-10-fw2.10.json'
import { fakePedal } from '../../test/fakePedal'
import { isAllowedReadMessage, parseParamEdit } from '../messages'
import { PedalSession, SessionClosedError, WrongPatchError, type PedalEvent } from '../pedalSession'
import { sendPatch } from '../writeMessages'

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

  it('sees patch changes made on the pedal by polling 0x33, and knob turns by their 0x31', async () => {
    const pedal = fakePedal()
    const s = new PedalSession(pedal.transport, fast)
    const events: PedalEvent[] = []
    s.onEvent((e) => events.push(e))
    await s.scan()
    expect(events).toEqual([]) // C0 replies during the scan are not events
    s.startPolling(10)
    pedal.selectOnPedal(7)
    await new Promise((r) => setTimeout(r, 450))
    pedal.turnKnob(0, 2, 50)
    s.close()
    expect(events).toEqual([
      { type: 'program', slot: 7 },
      { type: 'param', effect: 0, param: 2, value: 50 },
    ])
    expect(s.activeProgram).toBe(7)
    expect(pedal.sent.filter((m) => !isAllowedReadMessage(m))).toEqual([])
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

  it('a live write is refused, with nothing sent, if the pedal is not on the expected patch', async () => {
    const pedal = fakePedal()
    const s = new PedalSession(pedal.transport, fast)
    await s.scan()
    pedal.selectOnPedal(5) // not yet seen by polling
    const events: PedalEvent[] = []
    s.onEvent((e) => events.push(e))
    await expect(s.sendLive(cap.originalProgram, [sendPatch(pedal.memory[0])])).rejects.toBeInstanceOf(WrongPatchError)
    expect(pedal.sent.filter((m) => !isAllowedReadMessage(m))).toEqual([])
    await Promise.resolve()
    expect(events).toEqual([{ type: 'program', slot: 5 }])
    expect(s.activeProgram).toBe(5)
  })

  it('emergencyRestore does nothing if the pedal is known to be elsewhere', async () => {
    const pedal = fakePedal()
    const s = new PedalSession(pedal.transport, fast)
    await s.scan()
    s.emergencyRestore(3, pedal.memory[3])
    expect(pedal.sent.filter((m) => !isAllowedReadMessage(m))).toEqual([])
  })

  it('a closed session cannot write', async () => {
    const pedal = fakePedal()
    const s = new PedalSession(pedal.transport, fast)
    await s.scan()
    s.close()
    await expect(s.sendLive(cap.originalProgram, [sendPatch(pedal.memory[0])])).rejects.toBeInstanceOf(SessionClosedError)
    s.emergencyRestore(cap.originalProgram, pedal.memory[0])
    expect(pedal.sent.filter((m) => !isAllowedReadMessage(m))).toEqual([])
  })
})
