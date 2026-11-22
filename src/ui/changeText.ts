import { getEffect } from '../model/catalog'
import { effectName, type Change } from '../model/changes'
import type { Patch } from '../model/patch'
import { paramScale } from './paramControl'

export const pad2 = (n: number) => String(n).padStart(2, '0')

export interface DiffLine {
  what: string
  from: string
  to: string
}

/** Human-readable lines for a list of changes. */
export function changeLine(c: Change, working: Patch, firmware: number): DiffLine {
  switch (c.kind) {
    case 'name':
      return { what: 'Name', from: c.from, to: c.to }
    case 'chain':
      return { what: 'Chain', from: c.from.join(' › '), to: c.to.join(' › ') }
    case 'bypass':
      return { what: `${c.block + 1} · ${c.effect}`, from: `${c.fromDefault ? 'new: ' : ''}${c.from ? 'On' : 'Bypass'}`, to: c.to ? 'On' : 'Bypass' }
    case 'param': {
      const def = getEffect(working.blocks[c.block].effectId)?.params[c.param]
      const label = def ? paramScale(def, firmware).label : String
      return { what: `${c.block + 1} · ${c.effect} · ${c.name}`, from: `${c.fromDefault ? 'default ' : ''}${label(c.from)}`, to: label(c.to) }
    }
  }
}


/** The chain as words, e.g. "M Comp, SVT (bypass)", for labels and tooltips. */
export const chainText = (patch: Patch) => patch.blocks.map((b) => `${effectName(b.effectId)}${b.on ? '' : ' (bypass)'}`).join(', ')
