import { describe, expect, it } from 'vitest'
import cap from '../__fixtures__/ms60b-bank-2026-11-10-fw2.10.json'
import { checkAmpBytes } from '../ampCheck'

describe('checkAmpBytes', () => {
  it('real patches with firmware-1 AMPs: the encoder rules match the pedal bytes', () => {
    const withAmp = cap.patches.map((h) => checkAmpBytes(h.split(' ').map((x) => parseInt(x, 16)))).filter((c) => c.amps.length)
    expect(withAmp.length).toBeGreaterThan(0)
    withAmp.forEach((c) => {
      expect(c.diffs).toEqual([])
      c.amps.forEach((a) => {
        expect(a.cabByte.pedal).toBe(a.cabByte.encoder)
        expect(a.v2Byte.pedal).toBe(a.v2Byte.encoder)
      })
    })
  })
})
