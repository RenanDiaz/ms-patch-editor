import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import cap from '../__fixtures__/ms60b-bank-2026-11-10-fw2.10.json'
import { compareWithG200kg, readG200kgBankZip } from '../compareG200kgBank'

/**
 * S1 exit criterion: our scan vs. g200kg's utility scanning the same pedal,
 * patch by patch. The zip is the utility's "Export Bank file" (MakeBin output)
 * after its own read-only scan of the user's MS-60B on 2026-11-10.
 */
const zip = new Uint8Array(readFileSync(resolve(__dirname, '../__fixtures__/g200kg-export-2026-11-10-fw2.10.60b.zip')))
const ours = cap.patches.map((h) => h.split(' ').map((x) => parseInt(x, 16)))
const result = compareWithG200kg(ours, readG200kgBankZip(zip))

describe('S1: our capture vs. g200kg utility (live, same pedal)', () => {
  it('all 50 patches match on decoded fields', () => {
    const bad = result.filter((r) => r.status !== 'match').map((r) => `${r.slot + 1}: ${r.status} ${r.diffs.join('; ')}`)
    expect(bad).toEqual([])
  })

  it('raw bytes differ only where g200kg MakeBin sets the cab NZ bit (docs/protocol.md §8)', () => {
    const rawDiffs = result.filter((r) => r.rawDiffOffsets.length).map((r) => [r.slot + 1, r.rawDiffOffsets])
    expect(rawDiffs).toEqual([
      [2, [23]], [3, [23]], [4, [64]], [7, [64]], [8, [43]], [11, [84]], [14, [64]], [16, [43]],
    ])
  })
})
