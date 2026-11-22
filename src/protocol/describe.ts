/*
 * Human-readable view of decoded patches, following DispPatch in index.html of
 * g200kg/zoom-ms-utility (commit 5bf930c8e1622b0c70c0c3d761424f84955a227a,
 * lines ~1431-1470): table lookup for cab values, then disp as offset (with
 * dispr ratio), label array, or time display.
 *
 * MIT License
 * Copyright (c) 2017 — zoom-ms-utility by g200kg (original LICENSE names no holder)
 * See THIRD_PARTY_NOTICES.md for the full license text.
 */
import { EFFECTS_60B } from './effects60b.generated'
import type { EffectDef, ParamDef } from './effectTypes'
import { bassCabTable } from './firmwareTables'
import type { DecodedEffect } from './patch60b'

const BY_ID = new Map(EFFECTS_60B.map((e) => [e.id, e]))

export function findEffect(id: number): EffectDef | undefined {
  return BY_ID.get(id)
}

export function formatParam(def: ParamDef, raw: number, firmware: number): string {
  let v = raw
  if (def.range.kind === 'cab') {
    const table = bassCabTable(firmware)
    const idx = table.values.indexOf(raw)
    return idx >= 0 ? table.labels[idx] : `? (${raw})`
  }
  const d = def.disp
  if (typeof d === 'number') {
    const r = def.dispr
    if (r !== undefined && r > 0) return r < 1 ? (v * r + d).toFixed(1) : String(v * r + d)
    return String(v + d)
  }
  // Some g200kg labels write "200hz"; show the unit as "Hz" like the others (display only, data unchanged).
  if (Array.isArray(d)) return d[v] !== undefined ? d[v].replace(/(\d)\s*hz$/i, '$1Hz').replace(/(\d)\s*khz$/i, '$1kHz') : `? (${raw})`
  if (d && 'kind' in d && d.kind === 'time') {
    v = raw + d.min
    return v >= d.max ? (d.list[v - d.max] ?? `? (${raw})`) : String(v)
  }
  return String(v)
}

export interface EffectView {
  slot: number
  on: boolean
  id: number
  name: string
  known: boolean
  params: { name: string; raw: number; text: string; outOfRange: boolean }[]
}

export function describeEffect(e: DecodedEffect, slot: number, firmware: number): EffectView {
  const def = findEffect(e.id)
  if (!def) {
    return { slot, on: e.on, id: e.id, name: `desconocido 0x${e.id.toString(16)}`, known: false, params: [] }
  }
  return {
    slot,
    on: e.on,
    id: e.id,
    name: def.name,
    known: true,
    params: def.params.map((p, i) => {
      const raw = e.params[i]
      const outOfRange =
        p.range.kind === 'linear' ? raw > p.range.max : !bassCabTable(firmware).values.includes(raw)
      return { name: p.name, raw, text: formatParam(p, raw, firmware), outOfRange }
    }),
  }
}
