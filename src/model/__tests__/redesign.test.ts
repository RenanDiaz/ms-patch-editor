import { describe, expect, it } from 'vitest'
import { fakeBank, FAKE_FIRMWARE } from '../../fixtures/fakeBank'
import { bankReducer, canRedo, canUndo, initBank, isDirty, MERGE_MS, type BankAction, type BankState } from '../bank'
import { CATALOG, effectsForFirmware } from '../catalog'
import { deviceBlockFor, diffPatch, undoChange } from '../changes'
import { searchEffects } from '../effectSearch'
import { moveBlock, newBlock, rename, setParam, toggleBlock, type Patch } from '../patch'

const id = (n: string) => CATALOG.find((e) => e.name === n)!.id
const base: Patch = { name: 'T', blocks: [newBlock(id('OptComp')), newBlock(id('BassDrive')), newBlock(id('Delay'))] }

describe('changes vs pedal (diffPatch)', () => {
  it('compares with the pedal copy, not with defaults', () => {
    // A patch read with non-default values has no changes until something is edited.
    const device = setParam(base, 1, 3, 60)
    expect(diffPatch(device, device)).toEqual([])
    const working = setParam(device, 1, 3, 72)
    expect(diffPatch(device, working)).toEqual([
      { kind: 'param', block: 1, param: 3, effect: 'BassDrive', name: 'Gain', from: 60, to: 72 },
    ])
  })

  it('lists name, bypass and chain changes; values of moved blocks still compare with their pedal block', () => {
    const working = setParam(toggleBlock(rename(moveBlock(base, 2, 0), 'New'), 1), 0, 0, 7)
    const kinds = diffPatch(base, working).map((c) => c.kind)
    expect(kinds).toEqual(['name', 'chain', 'param', 'bypass']) // per block, in chain order
    expect(deviceBlockFor(base, working, 0)).toBe(base.blocks[2]) // Delay moved to the front
  })

  it('a new block has no pedal counterpart', () => {
    const working = { ...base, blocks: [...base.blocks, newBlock(id('SVT'))] }
    expect(deviceBlockFor(base, working, 3)).toBeNull()
  })

  it('undoChange puts back only that value', () => {
    const working = setParam(setParam(base, 1, 3, 90), 1, 4, 10)
    const [gain, blend] = diffPatch(base, working)
    const after = undoChange(working, base, gain)
    expect(diffPatch(base, after)).toEqual([blend])
    const chainBack = undoChange(moveBlock(base, 0, 2), base, diffPatch(base, moveBlock(base, 0, 2))[0])
    expect(diffPatch(base, chainBack)).toEqual([])
  })
})

describe('undo / redo of the working copy', () => {
  const start = () => initBank(FAKE_FIRMWARE, fakeBank())
  const run = (s: BankState, ...a: BankAction[]) => a.reduce(bankReducer, s)
  const gain = (v: number, at?: number): BankAction => ({ type: 'edit', fn: (p) => setParam(p, 0, 0, v), merge: at === undefined ? undefined : 'k', at })

  it('steps back and forward, and a new edit clears redo', () => {
    let s = run(start(), gain(1), gain(2), gain(3))
    expect(s.slots[0].working.blocks[0].params[0]).toBe(3)
    s = run(s, { type: 'undo' }, { type: 'undo' })
    expect(s.slots[0].working.blocks[0].params[0]).toBe(1)
    expect(canRedo(s)).toBe(true)
    s = run(s, { type: 'redo' })
    expect(s.slots[0].working.blocks[0].params[0]).toBe(2)
    s = run(s, gain(9))
    expect(canRedo(s)).toBe(false)
    s = run(s, { type: 'undo' }, { type: 'undo' }, { type: 'undo' })
    expect(isDirty(s.slots[0])).toBe(false)
    expect(canUndo(s)).toBe(false)
  })

  it('a burst of edits of one control (knob drag) is one step', () => {
    const s = run(start(), gain(1, 0), gain(2, 100), gain(3, 200), gain(4, 200 + MERGE_MS + 1))
    expect(run(s, { type: 'undo' }).slots[0].working.blocks[0].params[0]).toBe(3)
    expect(isDirty(run(s, { type: 'undo' }, { type: 'undo' }).slots[0])).toBe(false)
  })

  it('edits that change nothing add no step; Revert can be undone', () => {
    let s = run(start(), gain(fakeBank()[0].blocks[0].params[0]))
    expect(canUndo(s)).toBe(false)
    s = run(s, gain(5), { type: 'revert' })
    expect(isDirty(s.slots[0])).toBe(false)
    s = run(s, { type: 'undo' })
    expect(s.slots[0].working.blocks[0].params[0]).toBe(5)
  })

  it('history is per patch', () => {
    let s = run(start(), gain(5), { type: 'save' }, { type: 'selectPatch', index: 1 })
    expect(canUndo(s)).toBe(false)
    s = run(s, { type: 'selectPatch', index: 0 })
    expect(canUndo(s)).toBe(true)
  })

  it('loadSlot from the pedal adds a step only when asked (Revert on the pedal)', () => {
    let s = run(start(), gain(5))
    const device = s.slots[0].device
    s = run(s, { type: 'loadSlot', index: 0, patch: device, raw: [], mode: 'replace', undoable: true })
    expect(run(s, { type: 'undo' }).slots[0].working.blocks[0].params[0]).toBe(5)
    const t = run(start(), { type: 'loadSlot', index: 0, patch: fakeBank()[1], raw: [], mode: 'replace' })
    expect(canUndo(t)).toBe(false)
  })
})

describe('effect search', () => {
  const all = effectsForFirmware(2.1)
  const names = (q: string) => searchEffects(all, q).map((e) => e.name)

  it('"delay" finds every delay, including AnalogDly and TapeEcho (category), names first', () => {
    const r = names('delay')
    expect(r).toEqual(expect.arrayContaining(['Delay', 'AnalogDly', 'TapeEcho', 'ModDelay']))
    expect(r[0]).toBe('Delay')
    expect(r.indexOf('ModDelay')).toBeLessThan(r.indexOf('AnalogDly'))
  })

  it('matches the manual category code and ignores case and punctuation', () => {
    expect(names('dly/rev')).toEqual(names('DLYREV'))
    expect(names('driveecho')).toEqual(['DriveEcho'])
    expect(names('ba chorus')[0]).toBe('Ba Chorus')
  })

  it('the name as typed wins: "D.I" picks D.I Plus before DirtyGate (found in a real test)', () => {
    expect(names('D.I')[0]).toBe('D.I Plus')
    expect(names('d.i plus')[0]).toBe('D.I Plus')
    expect(names('svt')[0]).toBe('SVT')
  })

  it('every word must match; nothing found returns an empty list', () => {
    expect(names('zzzz')).toEqual([])
    expect(names('delay comp')).toEqual([])
  })
})
