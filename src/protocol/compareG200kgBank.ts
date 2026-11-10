import { unzipSync, strFromU8 } from 'fflate'
import { decodePatch60B, isPatchData60B, type DecodedPatch60B } from './patch60b'

/**
 * Reads a bank zip saved by g200kg's "Save Bank" (index.html SaveBank):
 * one file per patch named "NN@name.60b", content = hex of MakeBin output.
 * Returns raw patch bytes indexed by slot (0..49).
 */
export function readG200kgBankZip(zip: Uint8Array): (number[] | undefined)[] {
  const files = unzipSync(zip)
  const out: (number[] | undefined)[] = new Array(50).fill(undefined)
  for (const [name, data] of Object.entries(files)) {
    const base = name.split('/').pop() ?? name
    const m = /^(\d\d)@/.exec(base)
    if (!m) continue
    const slot = parseInt(m[1], 10) - 1
    const hex = strFromU8(data).replace(/[^0-9a-f]/gi, '')
    const bytes: number[] = []
    for (let i = 0; i + 1 < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16))
    if (slot >= 0 && slot < 50) out[slot] = bytes
  }
  return out
}

export interface SlotComparison {
  slot: number
  status: 'match' | 'mismatch' | 'missing'
  /** Decoded-field differences (name, effect on/id/params, maxFx). */
  diffs: string[]
  /** Raw byte offsets that differ (informational: g200kg rebuilds bytes from a template). */
  rawDiffOffsets: number[]
}

function decodedDiffs(ours: DecodedPatch60B, theirs: DecodedPatch60B): string[] {
  const d: string[] = []
  if (ours.name !== theirs.name) d.push(`nombre: "${ours.name}" vs "${theirs.name}"`)
  if (ours.maxFx !== theirs.maxFx) d.push(`maxFx: ${ours.maxFx} vs ${theirs.maxFx}`)
  ours.effects.forEach((e, n) => {
    const t = theirs.effects[n]
    if (e.id !== t.id) d.push(`efecto ${n + 1} id: 0x${e.id.toString(16)} vs 0x${t.id.toString(16)}`)
    if (e.on !== t.on) d.push(`efecto ${n + 1} on: ${e.on} vs ${t.on}`)
    e.params.forEach((v, i) => {
      if (v !== t.params[i]) d.push(`efecto ${n + 1} p${i + 1}: ${v} vs ${t.params[i]}`)
    })
  })
  return d
}

/**
 * S1 exit criterion: our capture vs. the g200kg utility, patch by patch.
 * Compared on decoded fields (both sides decoded with the same ported ReadBin),
 * because g200kg's export is MakeBin output, not the bytes the pedal sent.
 */
export function compareWithG200kg(ours: number[][], theirs: (number[] | undefined)[]): SlotComparison[] {
  return ours.map((bytes, slot) => {
    const other = theirs[slot]
    if (!other || !isPatchData60B(other)) {
      return { slot, status: 'missing', diffs: ['no está en el zip de g200kg o no es un patch del 60B'], rawDiffOffsets: [] }
    }
    const diffs = decodedDiffs(decodePatch60B(bytes), decodePatch60B(other))
    const rawDiffOffsets = bytes.flatMap((b, i) => (b === other[i] ? [] : [i]))
    return { slot, status: diffs.length ? 'mismatch' : 'match', diffs, rawDiffOffsets }
  })
}
