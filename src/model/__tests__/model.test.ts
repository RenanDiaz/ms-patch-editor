import { describe, expect, it } from 'vitest'
import cap from '../../protocol/__fixtures__/ms60b-bank-2026-11-10-fw2.10.json'
import { decodePatch60B } from '../../protocol/patch60b'
import { fakeBank, FAKE_FIRMWARE } from '../../fixtures/fakeBank'
import { bankReducer, initBank, isDirty, type BankState } from '../bank'
import { CATALOG, CATEGORIES, effectsForFirmware, getEffect, THRU_ID } from '../catalog'
import {
  addBlock,
  canSave,
  changeType,
  dspTotal,
  moveBlock,
  newBlock,
  removeBlock,
  setParam,
  toggleBlock,
  type Patch,
} from '../patch'

const byName = (n: string) => CATALOG.find((e) => e.name === n)!.id
const p0: Patch = { name: 'T', blocks: [newBlock(byName('M Comp')), newBlock(byName('Ba GEQ')), newBlock(byName('SVT'))] }

describe('catalog', () => {
  it('maps firmware-1 effects onto the manual categories with the manual counts', () => {
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0]))
    CATALOG.filter((e) => e.minFirmware === 1).forEach((e) => counts[e.category!]++)
    expect(counts).toEqual({ 'DYN/FLTR': 19, 'OD/DIST': 11, AMP: 6, 'MOD/SFX': 14, 'DLY/REV': 8 })
  })
  it('every 60B effect has a category', () => {
    expect(CATALOG.filter((e) => e.id !== THRU_ID && !e.category)).toEqual([])
  })
  it('filters by firmware and never offers THRU as a type', () => {
    expect(effectsForFirmware(1)).toHaveLength(58)
    expect(effectsForFirmware(2.1).length).toBe(58 + 84)
    expect(effectsForFirmware(2.1).some((e) => e.id === THRU_ID)).toBe(false)
  })
})

describe('patch operations', () => {
  it('newBlock uses g200kg defaults, ON', () => {
    const b = newBlock(byName('M Comp'))
    expect(b.on).toBe(true)
    expect(b.params.slice(0, 4)).toEqual(getEffect(byName('M Comp'))!.params.map((p) => p.def))
    expect(b.params.slice(4)).toEqual([0, 0, 0, 0, 0])
  })
  it('toggle, move, add, remove, change type', () => {
    expect(toggleBlock(p0, 1).blocks[1].on).toBe(false)
    expect(moveBlock(p0, 0, 2).blocks.map((b) => b.effectId)).toEqual([byName('Ba GEQ'), byName('SVT'), byName('M Comp')])
    const four = addBlock(p0, byName('Delay'))
    expect(four.blocks).toHaveLength(4)
    expect(addBlock(four, byName('Delay'))).toBe(four) // full
    expect(removeBlock(p0, 0).blocks).toHaveLength(2)
    expect(removeBlock({ name: 'x', blocks: [newBlock(byName('SVT'))] }, 0).blocks.map((b) => b.effectId)).toEqual([THRU_ID])
    const off = toggleBlock(p0, 0)
    const changed = changeType(setParam(off, 0, 0, 1), 0, byName('OptComp'))
    expect(changed.blocks[0]).toEqual({ ...newBlock(byName('OptComp')), on: false })
  })
  it('does not mutate its input', () => {
    const before = JSON.stringify(p0)
    toggleBlock(p0, 0); moveBlock(p0, 0, 1); addBlock(p0, 0); removeBlock(p0, 0); changeType(p0, 0, 0); setParam(p0, 0, 0, 9)
    expect(JSON.stringify(p0)).toBe(before)
  })
})

describe('DSP check', () => {
  it('blocks Save above 100% estimated and explains why', () => {
    const heavy: Patch = { name: 'H', blocks: [newBlock(byName('DriveEcho')), newBlock(byName('TremDelay'))] }
    expect(dspTotal(heavy)).toBeGreaterThan(1)
    const r = canSave(heavy)
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/DSP/)
    expect(canSave(p0).ok).toBe(true)
  })
  it('counts OFF blocks (manual: effects use DSP whether ON or OFF)', () => {
    expect(dspTotal(toggleBlock(p0, 0))).toBe(dspTotal(p0))
  })
  it('no patch on the real pedal exceeds 100% by the estimate (sanity check against real data)', () => {
    const over = cap.patches
      .map((h) => decodePatch60B(h.split(' ').map((x) => parseInt(x, 16))))
      .map((d) => ({ name: d.name, blocks: d.effects.slice(0, d.maxFx).map((e) => ({ effectId: e.id, on: e.on, params: e.params })) }))
      .filter((p) => dspTotal(p) > 1)
      .map((p) => `${p.name} ${Math.round(dspTotal(p) * 100)}%`)
    expect(over).toEqual([])
  })
})

describe('bank reducer (save model, spec §3)', () => {
  const init = (): BankState => initBank(FAKE_FIRMWARE, fakeBank())
  const edit = (s: BankState) => bankReducer(s, { type: 'edit', fn: (p) => toggleBlock(p, 0) })

  it('edits mark the patch dirty; Save clears it; Revert restores', () => {
    let s = edit(init())
    expect(isDirty(s.slots[0])).toBe(true)
    s = bankReducer(s, { type: 'save' })
    expect(isDirty(s.slots[0])).toBe(false)
    expect(s.slots[0].device.blocks[0].on).toBe(false)
    s = bankReducer(edit(s), { type: 'revert' })
    expect(isDirty(s.slots[0])).toBe(false)
    expect(s.slots[0].working.blocks[0].on).toBe(false)
  })

  it('editing back to the original value is not dirty', () => {
    expect(isDirty(edit(edit(init())).slots[0])).toBe(false)
  })

  it('switching with changes asks; cancel stays, discard drops, save keeps', () => {
    let s = edit(init())
    s = bankReducer(s, { type: 'selectPatch', index: 2 })
    expect(s.current).toBe(0)
    expect(s.pendingSwitch).toBe(2)
    expect(bankReducer(s, { type: 'resolveSwitch', choice: 'cancel' })).toMatchObject({ current: 0, pendingSwitch: null })
    const d = bankReducer(s, { type: 'resolveSwitch', choice: 'discard' })
    expect(d.current).toBe(2)
    expect(isDirty(d.slots[0])).toBe(false)
    expect(d.slots[0].working.blocks[0].on).toBe(true)
    const sv = bankReducer(s, { type: 'resolveSwitch', choice: 'save' })
    expect(sv.current).toBe(2)
    expect(sv.slots[0].device.blocks[0].on).toBe(false)
  })

  it('switching without changes does not ask', () => {
    expect(bankReducer(init(), { type: 'selectPatch', index: 3 })).toMatchObject({ current: 3, pendingSwitch: null })
  })

  it('Save over DSP is refused with a reason, also from the switch dialog', () => {
    let s = bankReducer(init(), { type: 'selectPatch', index: 3 }) // FAKE Verb ~90%
    s = bankReducer(s, { type: 'edit', fn: (p) => addBlock(p, byName('Z-Syn')) })
    const refused = bankReducer(s, { type: 'save' })
    expect(refused.saveError).toMatch(/DSP/)
    expect(isDirty(refused.slots[3])).toBe(true)
    const viaSwitch = bankReducer(bankReducer(s, { type: 'selectPatch', index: 0 }), { type: 'resolveSwitch', choice: 'save' })
    expect(viaSwitch.current).toBe(3)
    expect(viaSwitch.saveError).toMatch(/DSP/)
  })

  it('fake bank: 50 patches, all within DSP, names ≤ 10 chars', () => {
    const b = fakeBank()
    expect(b).toHaveLength(50)
    b.forEach((p) => {
      expect(canSave(p).ok).toBe(true)
      expect(p.name.length).toBeLessThanOrEqual(10)
    })
  })
})

describe('patches read from the pedal', () => {
  it('all 50 real patches convert to the model and are saveable by the DSP estimate', async () => {
    const { patchFromDevice } = await import('../fromDevice')
    cap.patches.forEach((h) => {
      const p = patchFromDevice(h.split(' ').map((x) => parseInt(x, 16)))
      expect(p.blocks.length).toBeGreaterThanOrEqual(1)
      expect(p.blocks.length).toBeLessThanOrEqual(4)
      expect(canSave(p).ok).toBe(true)
    })
  })

  it('loadSlot replace vs deviceOnly', () => {
    let s = bankReducer(initBank(FAKE_FIRMWARE, fakeBank()), { type: 'edit', fn: (p) => toggleBlock(p, 0) })
    const fromPedal: Patch = { name: 'PEDAL', blocks: [newBlock(byName('SVT'))] }
    const kept = bankReducer(s, { type: 'loadSlot', index: 0, patch: fromPedal, raw: [1], mode: 'deviceOnly' })
    expect(kept.slots[0].device).toBe(fromPedal)
    expect(kept.slots[0].working).toBe(s.slots[0].working)
    expect(kept.slots[0].raw).toEqual([1])
    s = bankReducer(s, { type: 'loadSlot', index: 0, patch: fromPedal, raw: [2], mode: 'replace' })
    expect(s.slots[0].working).toBe(fromPedal)
    expect(isDirty(s.slots[0])).toBe(false)
  })
})

describe('rename', () => {
  it('keeps printable ASCII, cuts to 10, trims trailing spaces; empty or same name is a no-op', async () => {
    const { rename, cleanName } = await import('../patch')
    expect(cleanName('Año Nuevo!!!')).toBe('Ao Nuevo!!')
    expect(cleanName('a"b*c/d:e<f>g?h\\i|j')).toBe('abcdefghij') // not offered by the pedal
    expect(cleanName("!#$%&'()+,")).toBe("!#$%&'()+,")
    expect(cleanName('-.;=@[]^_`')).toBe('-.;=@[]^_`')
    expect(cleanName('{}~ Az09')).toBe('{}~ Az09')
    expect(cleanName('Bass   ')).toBe('Bass')
    expect(rename(p0, 'Slap Bass').name).toBe('Slap Bass')
    expect(rename(p0, '   ')).toBe(p0)
    expect(rename(p0, 'T')).toBe(p0)
  })
})
