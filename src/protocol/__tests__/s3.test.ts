import { describe, expect, it } from 'vitest'
import cap from '../__fixtures__/ms60b-bank-2026-11-10-fw2.10.json'
import type { MidiMessage, MidiTransport } from '../../transport/MidiTransport'
import { InvalidApprovalError, withApprovedWrites } from '../../transport/approvedWrites'
import { BlockedWriteError } from '../../transport/readOnlyGuard'
import { decodePatch60B, encodePatch60B } from '../patch60b'
import { autoSaveApproval, autoSaveProbe, currentProgram, readSlot, writeApproval, writeSlot, type S3Context } from '../s3'
import { isKnownWriteMessage, isStoreAck, sendPatch, storePatch } from '../writeMessages'

const bytes = (h: string) => h.split(' ').map((x) => parseInt(x, 16))
const bank = cap.patches.map(bytes)

/**
 * Simulated pedal with memory, edit buffer and an AUTO SAVE switch.
 * Starts from the real capture bytes; this is a model, not the pedal.
 */
function fakePedal(opts: { autoSave?: boolean; current?: number; noAck?: boolean } = {}) {
  const memory = bank.map((p) => p.slice())
  let program = opts.current ?? 27
  let buffer = memory[program].slice()
  const sent: number[][] = []
  const listeners = new Set<(m: MidiMessage) => void>()
  const reply = (b: number[]) => queueMicrotask(() => listeners.forEach((l) => l(Uint8Array.from(b))))
  const transport: MidiTransport = {
    send(m) {
      const b = Array.from(m)
      sent.push(b)
      if (b[0] === 0xc0) {
        program = b[1]
        buffer = memory[program].slice()
      } else if (b[4] === 0x33) {
        reply([0xb0, 0, 0])
        reply([0xb0, 0x20, 0])
        reply([0xc0, program])
      } else if (b[4] === 0x29) reply(buffer)
      else if (b[4] === 0x28) {
        buffer = b
        if (opts.autoSave) memory[program] = b.slice()
      } else if (b[4] === 0x32) {
        memory[b[8]] = buffer.slice()
        if (!opts.noAck) reply([0xf0, 0x52, 0x00, 0x5f, 0x00, 0x00, 0xf7])
      }
    },
    onMessage(l) {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    close() {},
  }
  return { transport, sent, memory, get program() { return program } }
}

const ctxFor = (transport: MidiTransport): S3Context => ({
  transport,
  log: [],
  t0: 0,
  opts: { gapMs: 0, timeoutMs: 20, sleep: () => Promise.resolve(), now: () => 0 },
})

const SLOT = 49
const testPatch = () => {
  const d = decodePatch60B(bank[SLOT])
  return encodePatch60B(bank[SLOT], {
    name: 'S3 TEST',
    effects: d.effects.slice(0, d.maxFx).map((e, i) => (i === 0 ? { ...e, on: !e.on } : e)),
  })
}

describe('write messages', () => {
  it('Store Patch bytes match g200kg (midimessage.md)', () => {
    expect(Array.from(storePatch(5))).toEqual([0xf0, 0x52, 0x00, 0x5f, 0x32, 0x01, 0x00, 0x00, 0x05, 0, 0, 0, 0, 0, 0xf7])
    expect(() => storePatch(50)).toThrow(RangeError)
  })
  it('Send Patch only accepts a 105-byte MS-60B patch', () => {
    expect(() => sendPatch([0xf0, 0xf7])).toThrow(RangeError)
    expect(Array.from(sendPatch(bank[0]))).toEqual(bank[0])
  })
  it('known writes are only 0x28 patches and well-formed 0x32', () => {
    expect(isKnownWriteMessage(bank[0])).toBe(true)
    expect(isKnownWriteMessage(storePatch(0))).toBe(true)
    expect(isKnownWriteMessage([0xf0, 0x52, 0x00, 0x5f, 0x60, 0xf7])).toBe(false)
    expect(isKnownWriteMessage([0xf0, 0x52, 0x00, 0x5f, 0x31, 0, 2, 50, 0, 0xf7])).toBe(false)
    const badStore = Array.from(storePatch(0))
    badStore[8] = 60
    expect(isKnownWriteMessage(badStore)).toBe(false)
  })
  it('recognises the Store ack prefix', () => {
    expect(isStoreAck([0xf0, 0x52, 0x00, 0x5f, 0x00, 0xf7])).toBe(true)
    expect(isStoreAck(bank[0])).toBe(false)
  })
})

describe('withApprovedWrites', () => {
  const sink = () => {
    const sent: number[][] = []
    const t: MidiTransport = { send: (m) => void sent.push(Array.from(m)), onMessage: () => () => {}, close() {} }
    return { t, sent }
  }
  it('sends reads, then exactly the approved writes in order, once each', () => {
    const { t, sent } = sink()
    const io = withApprovedWrites(t, writeApproval(3, bank[3], 'x'))
    io.send(Uint8Array.of(0xc0, 3))
    expect(() => io.send(storePatch(3))).toThrow(BlockedWriteError) // out of order
    io.send(sendPatch(bank[3]))
    io.send(storePatch(3))
    expect(io.pending()).toBe(0)
    expect(() => io.send(storePatch(3))).toThrow(BlockedWriteError) // used up
    expect(sent).toHaveLength(3)
  })
  it('blocks writes that differ from the approved bytes', () => {
    const { t, sent } = sink()
    const io = withApprovedWrites(t, writeApproval(3, bank[3], 'x'))
    expect(() => io.send(sendPatch(bank[4]))).toThrow(BlockedWriteError)
    expect(() => io.send(Uint8Array.of(0xf0, 0x52, 0x00, 0x5f, 0x60, 0xf7))).toThrow(BlockedWriteError)
    expect(sent).toEqual([])
  })
  it('refuses an approval containing anything but 0x28 / 0x32', () => {
    const { t } = sink()
    expect(() => withApprovedWrites(t, { label: 'x', writes: [Uint8Array.of(0xf0, 0x52, 0x00, 0x5f, 0x60, 0xf7)] })).toThrow(
      InvalidApprovalError,
    )
  })
})

describe('S3 procedures (simulated pedal)', () => {
  it('reads current program and a slot with read messages only', async () => {
    const pedal = fakePedal()
    const ctx = ctxFor(pedal.transport)
    expect(await currentProgram(ctx)).toBe(27)
    expect(await readSlot(ctx, SLOT)).toEqual(bank[SLOT])
    expect(pedal.sent.some((m) => m[4] === 0x28 || m[4] === 0x32)).toBe(false)
  })

  it('writeSlot stores, reads back from memory and reports no diff', async () => {
    const pedal = fakePedal()
    const ctx = ctxFor(pedal.transport)
    const t = testPatch()
    const r = await writeSlot(ctx, SLOT, t, writeApproval(SLOT, t, 'test'))
    expect(r.diff).toEqual([])
    expect(pedal.memory[SLOT]).toEqual(Array.from(t))
    expect(decodePatch60B(r.readBack).name).toBe('S3 TEST')
    // exact order: C0 pp, 0x28, 0x32, then switch away/back and read
    expect(pedal.sent.map((m) => (m[0] === 0xc0 ? `c0 ${m[1]}` : m[4].toString(16)))).toEqual(['c0 49', '28', '32', 'c0 0', 'c0 49', '29'])
  })

  it('restoring the backup brings the slot back byte for byte', async () => {
    const pedal = fakePedal()
    const ctx = ctxFor(pedal.transport)
    const t = testPatch()
    await writeSlot(ctx, SLOT, t, writeApproval(SLOT, t, 'test'))
    const r = await writeSlot(ctx, SLOT, bank[SLOT], writeApproval(SLOT, bank[SLOT], 'restore'))
    expect(r.diff).toEqual([])
    expect(pedal.memory).toEqual(bank)
  })

  it('records the Store ack when it comes', async () => {
    const pedal = fakePedal()
    const t = testPatch()
    const r = await writeSlot(ctxFor(pedal.transport), SLOT, t, writeApproval(SLOT, t, 'x'))
    expect(r.ack).toEqual([0xf0, 0x52, 0x00, 0x5f, 0x00, 0x00, 0xf7])
  })

  it('without an ack (as the real fw 2.10 behaved) the read-back decides', async () => {
    const pedal = fakePedal({ noAck: true })
    const t = testPatch()
    const r = await writeSlot(ctxFor(pedal.transport), SLOT, t, writeApproval(SLOT, t, 'x'))
    expect(r.ack).toBeNull()
    expect(r.diff).toEqual([])
  })

  it('writeSlot refuses bytes that are not the approved ones', async () => {
    const pedal = fakePedal()
    await expect(writeSlot(ctxFor(pedal.transport), SLOT, testPatch(), writeApproval(SLOT, bank[SLOT], 'x'))).rejects.toThrow(
      BlockedWriteError,
    )
    expect(pedal.sent.some((m) => m[4] === 0x28)).toBe(false)
  })

  it.each([
    [false, false],
    [true, true],
  ])('AUTO SAVE probe: autoSave=%s → persisted=%s, never sends Store', async (autoSave, persisted) => {
    const pedal = fakePedal({ autoSave })
    const t = testPatch()
    const r = await autoSaveProbe(ctxFor(pedal.transport), SLOT, t, autoSaveApproval(t, SLOT), 0)
    expect(r.persisted).toBe(persisted)
    expect(pedal.sent.some((m) => m[4] === 0x32)).toBe(false)
  })
})
