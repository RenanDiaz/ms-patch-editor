import { describe, expect, it } from 'vitest'
import { EFFECTS_60B } from '../effects60b.generated'
import { bassCabTable } from '../firmwareTables'

describe('EFFECTS_60B (generated from g200kg effectslist.js)', () => {
  it('has 58 firmware-1 effects, matching the manual spec sheet ("Effect types 58 types", p. 31)', () => {
    expect(EFFECTS_60B.filter((e) => e.minFirmware === 1)).toHaveLength(58)
  })

  it('includes THRU with id 0', () => {
    expect(EFFECTS_60B.find((e) => e.id === 0)?.name).toBe('THRU')
  })

  it('has unique ids', () => {
    expect(new Set(EFFECTS_60B.map((e) => e.id)).size).toBe(EFFECTS_60B.length)
  })

  it('has at most 9 params per effect (fx[n][2..10])', () => {
    for (const e of EFFECTS_60B) expect(e.params.length).toBeLessThanOrEqual(9)
  })

  it('has defaults inside their range (cab: table of the effect\'s own minimum firmware)', () => {
    const bad: string[] = []
    for (const e of EFFECTS_60B) {
      for (const p of e.params) {
        const ok =
          p.range.kind === 'linear'
            ? p.def >= 0 && p.def <= p.range.max
            : bassCabTable(e.minFirmware).values.includes(p.def)
        if (!ok) bad.push(`${e.name}/${p.name}=${p.def}`)
      }
    }
    expect(bad).toEqual([])
  })
})
