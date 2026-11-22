import { describe, expect, it } from 'vitest'
import { EFFECTS_60B } from '../../protocol/effects60b.generated'
import { EFFECT_INFO, effectInfo } from '../effectInfo'

const MAX_TEXT = 140
const ids = Object.keys(EFFECT_INFO).map(Number)
const catalogIds = new Set(EFFECTS_60B.map((e) => e.id))

describe('EFFECT_INFO', () => {
  it('only uses ids that exist in the MS-60B catalog, and not THRU', () => {
    for (const id of ids) {
      expect(catalogIds.has(id), `unknown id ${id}`).toBe(true)
      expect(id).not.toBe(0)
    }
  })

  it('has a description for every effect except THRU', () => {
    for (const e of EFFECTS_60B) {
      if (e.id === 0) continue
      expect(effectInfo(e.id).description, e.name).toBeTruthy()
    }
  })

  it('keeps every text short', () => {
    for (const id of ids) {
      const { fullName, reference, aliases, description } = EFFECT_INFO[id]
      for (const text of [fullName, reference, description, ...(aliases ?? [])]) {
        if (text === undefined) continue
        expect(text.trim().length, `${id}: ${text}`).toBeGreaterThan(0)
        expect(text.length, `${id}: ${text}`).toBeLessThanOrEqual(MAX_TEXT)
      }
    }
  })

  it('has no duplicate aliases within an effect', () => {
    for (const id of ids) {
      const aliases = (EFFECT_INFO[id].aliases ?? []).map((a) => a.toLowerCase())
      expect(new Set(aliases).size, `${id}: ${aliases.join(', ')}`).toBe(aliases.length)
    }
  })

  it('returns an empty object for THRU and unknown ids', () => {
    expect(effectInfo(0)).toEqual({})
    expect(effectInfo(-1)).toEqual({})
  })
})
