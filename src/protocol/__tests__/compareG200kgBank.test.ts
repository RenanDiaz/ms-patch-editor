import { zipSync, strToU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { compareWithG200kg, readG200kgBankZip } from '../compareG200kgBank'
import { describeEffect, formatParam } from '../describe'
import { decodePatch60B } from '../patch60b'
import golden from './g200kg-readbin-golden.json'

const hex = (b: number[]) => b.map((v) => v.toString(16).padStart(2, '0')).join('')
const bank = golden.cases.slice(0, 50).map((c) => c.bytes)

function zipOf(patches: number[][]) {
  const files: Record<string, Uint8Array> = {}
  patches.forEach((p, i) => {
    files[`${String(i + 1).padStart(2, '0')}@P${i}.60b`] = strToU8(hex(p) + '\r\n')
  })
  return zipSync(files)
}

describe('g200kg bank zip comparison', () => {
  it('reads the SaveBank zip layout', () => {
    expect(readG200kgBankZip(zipOf(bank))).toEqual(bank)
  })

  it('reports 50 matches for identical banks', () => {
    const r = compareWithG200kg(bank, readG200kgBankZip(zipOf(bank)))
    expect(r.every((c) => c.status === 'match')).toBe(true)
  })

  it('reports a decoded mismatch for a changed parameter byte', () => {
    const other = bank.map((p) => [...p])
    other[4][10] ^= 0x01 // byte 10 holds effect 1 param 1 bits (0p0b3)
    const r = compareWithG200kg(bank, readG200kgBankZip(zipOf(other)))
    expect(r[4].status).toBe('mismatch')
    expect(r[4].diffs.join()).toMatch(/efecto 1 p1/)
    expect(r[4].rawDiffOffsets).toEqual([10])
  })

  it('reports missing slots', () => {
    const r = compareWithG200kg(bank, readG200kgBankZip(zipOf(bank.slice(0, 49))))
    expect(r[49].status).toBe('missing')
  })
})

describe('describe', () => {
  it('names THRU and shows no params', () => {
    const v = describeEffect(decodePatch60B(golden.cases[0].bytes).effects[0], 0, 1)
    expect(v.name).toBe('THRU')
    expect(v.params).toEqual([])
  })
  it('formats offset, labels and cab', () => {
    expect(formatParam({ name: 'Bass', def: 10, range: { kind: 'linear', max: 20 }, disp: -10 }, 3, 1)).toBe('-7')
    expect(formatParam({ name: 'ATTCK', def: 1, range: { kind: 'linear', max: 1 }, disp: ['Slow', 'Fast'] }, 1, 1)).toBe('Fast')
    expect(formatParam({ name: 'CAB', def: 16, range: { kind: 'cab', table: 'bass' } }, 64, 2)).toBe('SWR 4x10')
    expect(formatParam({ name: 'CAB', def: 16, range: { kind: 'cab', table: 'bass' } }, 64, 1)).toBe('? (64)')
  })
})
