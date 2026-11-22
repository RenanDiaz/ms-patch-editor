import { describe, expect, it } from 'vitest'
import { EFFECTS_60B } from '../../protocol/effects60b.generated'
import { PARAM_INFO, paramInfo } from '../paramInfo'

const MAX_TEXT = 140
const byId = new Map(EFFECTS_60B.map((e) => [e.id, e]))

describe('PARAM_INFO', () => {
  it('only uses effect ids that exist in the MS-60B catalog, and not THRU', () => {
    for (const id of Object.keys(PARAM_INFO).map(Number)) {
      expect(byId.has(id), `unknown id ${id}`).toBe(true)
      expect(id).not.toBe(0)
    }
  })

  it('only uses parameter indexes inside the effect params list', () => {
    for (const [id, params] of Object.entries(PARAM_INFO)) {
      const def = byId.get(Number(id))!
      for (const index of Object.keys(params).map(Number)) {
        expect(Number.isInteger(index) && index >= 0 && index < def.params.length, `${def.name} #${index}`).toBe(true)
      }
    }
  })

  it('keeps every help text short and non-empty', () => {
    for (const [id, params] of Object.entries(PARAM_INFO)) {
      for (const [index, { help }] of Object.entries(params)) {
        expect(help.trim().length, `${id} #${index}`).toBeGreaterThan(0)
        expect(help.length, `${id} #${index}: ${help}`).toBeLessThanOrEqual(MAX_TEXT)
      }
    }
  })

  it('covers every parameter except the ones recorded as left out', () => {
    const leftOut = new Set(['StonePha#0'])
    for (const e of EFFECTS_60B) {
      e.params.forEach((p, i) => {
        const key = `${e.name}#${i}`
        if (leftOut.has(key)) expect(paramInfo(e.id, i), key).toBeUndefined()
        else expect(paramInfo(e.id, i)?.help, `${key} ${p.name}`).toBeTruthy()
      })
    }
  })

  it('returns undefined for unknown effects or indexes', () => {
    expect(paramInfo(0, 0)).toBeUndefined()
    expect(paramInfo(2097154, 8)).toBeUndefined()
  })
})
