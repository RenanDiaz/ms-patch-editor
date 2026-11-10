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

export function paramScale(def: ParamDef, firmware: number): ParamScale {
  const label = (raw: number) => formatParam(def, raw, firmware)
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
