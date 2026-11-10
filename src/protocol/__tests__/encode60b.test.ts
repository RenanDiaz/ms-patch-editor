import { describe, expect, it } from 'vitest'
import cap from '../__fixtures__/ms60b-bank-2026-11-10-fw2.10.json'
import { EFFECTS_60B } from '../effects60b.generated'
import { decodePatch60B, EMPTY_SLOT, encodePatch60B, PatchEncodeError, type EncodablePatch } from '../patch60b'
import golden from './g200kg-makebin-golden.json'

const bytes = (h: string) => h.split(' ').map((x) => parseInt(x, 16))
const patches = cap.patches.map(bytes)
const asTarget = (raw: number[]): EncodablePatch => {
  const d = decodePatch60B(raw)
  return { name: d.name, effects: d.effects.slice(0, Math.max(1, d.maxFx)) }
}
const CAB_BYTE = [23, 43, 64, 84]
const byName = (n: string) => EFFECTS_60B.find((e) => e.name === n)!.id

describe('encodePatch60B on the 50 real patches', () => {
  it('unchanged patch → identical bytes', () => {
    patches.forEach((raw) => expect(Array.from(encodePatch60B(raw, asTarget(raw)))).toEqual(raw))
  })

  it('rewriting every slot from decoded fields reproduces the pedal bytes (slot rules match the pedal)', () => {
    patches.forEach((raw, i) => expect(Array.from(encodePatch60B(raw, asTarget(raw), { rewriteAllSlots: true })), `patch ${i}`).toEqual(raw))
  })

  it('does not mutate the base bytes', () => {
    const raw = patches[0].slice()
    encodePatch60B(raw, { ...asTarget(raw), name: 'X' })
    expect(raw).toEqual(patches[0])
  })
})

describe('encodePatch60B vs g200kg MakeBin (differential, 150 random edits of real patches)', () => {
  it('has the expected number of cases', () => expect(golden.cases).toHaveLength(150))

  golden.cases.forEach((c, i) => {
    it(`case ${i} (slot ${c.slot + 1})`, () => {
      const target: EncodablePatch = {
        name: c.name,
        effects: c.fx.slice(0, c.maxfx).map((v) => ({ on: v[0] === 1, id: v[1], params: v.slice(2) })),
      }
      const ours = Array.from(encodePatch60B(c.base, target))
      // Only allowed difference: MakeBin's "NZ" bit on the cabinet byte of a non-AMP slot (docs/protocol.md §8).
      const expected = c.out.slice()
      c.fx.forEach((v, f) => {
        const def = EFFECTS_60B.find((e) => e.id === v[1])
        if (def?.group !== 'AMP') expected[CAB_BYTE[f]] &= ~0x40
      })
      expect(ours).toEqual(expected)
      const back = decodePatch60B(ours)
      expect(back.name).toBe(c.name.replace(/ +$/, ''))
      back.effects.forEach((e, f) => expect([e.on ? 1 : 0, e.id, ...e.params]).toEqual(c.fx[f]))
    })
  })
})

describe('encodePatch60B: chain changes', () => {
  const raw = patches[6] // "Octaver", 4 effects
  const d = decodePatch60B(raw)

  it('removing effects writes empty slots like the pedal does and lowers maxFx', () => {
    const out = encodePatch60B(raw, { name: d.name, effects: d.effects.slice(0, 2) })
    const back = decodePatch60B(out)
    expect(back.maxFx).toBe(2)
    expect(back.effects.slice(2)).toEqual([
      { ...EMPTY_SLOT, params: [...EMPTY_SLOT.params] },
      { ...EMPTY_SLOT, params: [...EMPTY_SLOT.params] },
    ])
    expect(back.focus).toBeLessThan(2)
  })

  it('reordering moves fields, and the result reads back as the new order', () => {
    const rev = [...d.effects].reverse()
    const back = decodePatch60B(encodePatch60B(raw, { name: d.name, effects: rev }))
    expect(back.effects).toEqual(rev)
  })

  it('a single THRU is a valid patch (like the real "Empty" patch)', () => {
    const back = decodePatch60B(encodePatch60B(raw, { name: 'Empty', effects: [{ on: true, id: 0, params: [] }] }))
    expect(back.maxFx).toBe(1)
    expect(back.effects[0].id).toBe(0)
  })

  it('AMP cabinet bytes follow MakeBin; fw2 AMPs set the v2 byte', () => {
    const svt = byName('SVT')
    const out = encodePatch60B(raw, { name: d.name, effects: [{ on: true, id: svt, params: [0, 0, 0, 0, 0, 0, 0, 16] }] })
    expect(out[23]).toBe(0x50)
    expect(out[8]).toBe(0)
    const superB = byName('SuperB')
    const out2 = encodePatch60B(raw, { name: d.name, effects: [{ on: true, id: superB, params: [0, 0, 0, 0, 0, 0, 0, 1] }] })
    expect(out2[23]).toBe(0x51)
    expect(out2[8]).toBe(0x20)
  })

  it('clears the pedal-computed DSP-full bits only when the chain changes', () => {
    const withDf = raw.slice()
    withDf[88] |= 0x01
    expect(encodePatch60B(withDf, { name: 'Renamed', effects: d.effects.slice(0, 4) })[88] & 0x3f).toBe(1)
    const toggled = d.effects.map((e, i) => (i === 0 ? { ...e, on: !e.on } : e))
    expect(encodePatch60B(withDf, { name: d.name, effects: toggled })[88] & 0x3f).toBe(0)
  })
})

describe('encodePatch60B: validation', () => {
  const raw = patches[0]
  const t = asTarget(raw)
  it.each([
    ['no effects', { ...t, effects: [] }],
    ['5 effects', { ...t, effects: [...t.effects, ...t.effects, ...t.effects] }],
    ['name too long', { ...t, name: 'ABCDEFGHIJK' }],
    ['non-ASCII name', { ...t, name: 'Año' }],
    ['unknown effect', { ...t, effects: [{ on: true, id: 0x7fffffff, params: [] }] }],
    ['negative param', { ...t, effects: [{ ...t.effects[0], params: [-1] }] }],
    ['param too wide', { ...t, effects: [{ ...t.effects[0], params: [1 << 13] }] }],
  ])('rejects %s', (_, target) => {
    expect(() => encodePatch60B(raw, target as EncodablePatch)).toThrow(PatchEncodeError)
  })
})
