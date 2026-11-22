import { formatParam } from '../protocol/describe'
import type { ParamDef } from '../protocol/effectTypes'
import { bassCabTable } from '../protocol/firmwareTables'

/**
 * A parameter is edited by "position" 0..steps-1. For linear params the
 * position is the raw value; for cab params it indexes the firmware table.
 */
export interface ParamScale {
  steps: number
  toRaw: (pos: number) => number
  toPos: (raw: number) => number
  label: (raw: number) => string
}

/**
 * Tempo-synced values come from g200kg's table as musical note symbols
 * (U+1D15E-1D161), which most fonts cannot draw (the usability test saw a
 * blank box). Shown as text instead: 1/16, 1/8, 1/4, 1/2; "3" = triplet (T),
 * "." = dotted (D), "x2" = times two (×2). Same values, only the writing.
 */
const NOTES: Record<string, string> = { '\u{1D15E}': '1/2', '\u{1D15F}': '1/4', '\u{1D160}': '1/8', '\u{1D161}': '1/16' }
export function readableLabel(text: string): string {
  const m = /^([\u{1D15E}-\u{1D161}])\s*(3|\.|x\d+)?$/u.exec(text)
  if (!m) return text
  const note = NOTES[m[1]]
  const mod = m[2]
  if (!mod) return note
  if (mod === '3') return `${note}T`
  if (mod === '.') return `${note}D`
  return `${note} ×${mod.slice(1)}`
}

export function paramScale(def: ParamDef, firmware: number): ParamScale {
  const label = (raw: number) => readableLabel(formatParam(def, raw, firmware))
  if (def.range.kind === 'cab') {
    const values = bassCabTable(firmware).values
    return {
      steps: values.length,
      toRaw: (pos) => values[clamp(pos, 0, values.length - 1)],
      toPos: (raw) => Math.max(0, values.indexOf(raw)),
      label,
    }
  }
  const max = def.range.max
  return { steps: max + 1, toRaw: (pos) => clamp(pos, 0, max), toPos: (raw) => clamp(raw, 0, max), label }
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v)))

/** Coarse step for PageUp/PageDown and wheel: ~10% of the range, at least 1. */
export const coarseStep = (steps: number) => Math.max(1, Math.round((steps - 1) / 10))

/** How a parameter is shown: two-state switch, list (labels/cabinets) or number. */
export function paramKind(def: ParamDef, firmware: number): 'toggle' | 'list' | 'number' {
  const steps = paramScale(def, firmware).steps
  if (steps === 2) return 'toggle'
  if (def.range.kind === 'cab' || Array.isArray(def.disp)) return 'list'
  return 'number'
}

/**
 * Raw value for what the user typed: an exact label match (case-insensitive),
 * otherwise the position whose shown number is closest. null if nothing fits.
 */
export function parseTyped(scale: ParamScale, text: string): number | null {
  const t = text.trim().toLowerCase()
  if (!t) return null
  const raws = Array.from({ length: scale.steps }, (_, p) => scale.toRaw(p))
  const exact = raws.find((r) => scale.label(r).toLowerCase() === t)
  if (exact !== undefined) return exact
  const n = parseFloat(t.replace(',', '.'))
  if (Number.isNaN(n)) return null
  let best: number | null = null
  let dist = Infinity
  for (const r of raws) {
    const v = parseFloat(scale.label(r))
    if (Number.isNaN(v)) continue
    const d = Math.abs(v - n)
    if (d < dist) {
      dist = d
      best = r
    }
  }
  return best
}
