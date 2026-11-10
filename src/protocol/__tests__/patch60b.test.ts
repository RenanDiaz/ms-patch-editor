import { describe, expect, it } from 'vitest'
import golden from './g200kg-readbin-golden.json'
import { decodePatch60B, isPatchData60B, PatchFormatError } from '../patch60b'

describe('decodePatch60B vs g200kg ReadBin (differential, synthetic bytes)', () => {
  it('has the expected number of cases', () => {
    expect(golden.cases.length).toBe(201)
  })

  golden.cases.forEach((c, i) => {
    it(`case ${i} matches g200kg`, () => {
      const p = decodePatch60B(c.bytes)
      expect(p.name).toBe(c.name)
      expect(p.maxFx).toBe(c.maxfx)
      expect(p.focus).toBe(c.curfx)
      expect(p.dspFull).toBe(c.dspstate)
      p.effects.forEach((e, n) => {
        expect(e.on ? 1 : 0).toBe(c.fx[n][0])
        expect(e.id).toBe(c.fx[n][1])
        expect(e.params).toEqual(c.fx[n].slice(2))
      })
      expect(Array.from(p.raw)).toEqual(c.bytes)
    })
  })
})

describe('decodePatch60B on g200kg empty105 template', () => {
  const empty = golden.cases[0].bytes
  it('decodes name "Empty", one active slot, all THRU', () => {
    const p = decodePatch60B(empty)
    expect(p.name).toBe('Empty')
    expect(p.maxFx).toBe(1)
    expect(p.effects.map((e) => e.id)).toEqual([0, 0, 0, 0])
  })
})

describe('isPatchData60B / validation', () => {
  const ok = golden.cases[0].bytes
  it('accepts a 105-byte 0x28 message for device 0x5F', () => {
    expect(isPatchData60B(ok)).toBe(true)
  })
  it('rejects other devices, commands and lengths', () => {
    expect(isPatchData60B([...ok.slice(0, 3), 0x58, ...ok.slice(4)])).toBe(false)
    expect(isPatchData60B([...ok.slice(0, 4), 0x29, ...ok.slice(5)])).toBe(false)
    expect(isPatchData60B(ok.slice(0, 104))).toBe(false)
    expect(() => decodePatch60B(ok.slice(0, 104))).toThrow(PatchFormatError)
  })
  it('does not alias the input buffer', () => {
    const input = [...ok]
    const p = decodePatch60B(input)
    input[10] = 0x7f
    expect(p.raw[10]).toBe(ok[10])
  })
})
