import { getEffect, THRU_ID } from './catalog'
import { setParam, type Block, type Patch } from './patch'

/**
 * Differences between the pedal's copy of a patch and the working copy
 * ("Changes vs pedal"). Each change can be undone on its own: the value goes
 * back to what the pedal has.
 */
export type Change =
  | { kind: 'name'; from: string; to: string }
  /** Effects, their order or their count differ. */
  | { kind: 'chain'; from: string[]; to: string[] }
  | { kind: 'bypass'; block: number; effect: string; from: boolean; to: boolean }
  | { kind: 'param'; block: number; param: number; effect: string; name: string; from: number; to: number }

export const effectName = (id: number) => (id === THRU_ID ? 'THRU' : (getEffect(id)?.name ?? `0x${id.toString(16)}`))

const chainOf = (p: Patch) => p.blocks.map((b) => effectName(b.effectId))

/**
 * The pedal's block that working block `i` corresponds to: same effect at the
 * same position, otherwise the only block in the pedal's copy with that effect.
 * null when the block is new (or ambiguous).
 */
export function deviceBlockIndex(device: Patch, working: Patch, i: number): number | null {
  const w = working.blocks[i]
  if (!w) return null
  if (device.blocks[i]?.effectId === w.effectId) return i
  const same = device.blocks.flatMap((b, k) => (b.effectId === w.effectId ? [k] : []))
  const used = working.blocks.filter((b) => b.effectId === w.effectId).length
  return same.length === 1 && used === 1 ? same[0] : null
}

export function deviceBlockFor(device: Patch, working: Patch, i: number): Block | null {
  const k = deviceBlockIndex(device, working, i)
  return k === null ? null : device.blocks[k]
}

export function diffPatch(device: Patch, working: Patch): Change[] {
  const out: Change[] = []
  if (device.name !== working.name) out.push({ kind: 'name', from: device.name, to: working.name })
  const from = chainOf(device)
  const to = chainOf(working)
  if (from.join('\u0000') !== to.join('\u0000')) out.push({ kind: 'chain', from, to })
  working.blocks.forEach((w, i) => {
    const d = deviceBlockFor(device, working, i)
    if (!d) return
    const effect = effectName(w.effectId)
    if (d.on !== w.on) out.push({ kind: 'bypass', block: i, effect, from: d.on, to: w.on })
    const defs = getEffect(w.effectId)?.params ?? []
    defs.forEach((def, j) => {
      if (d.params[j] !== w.params[j]) out.push({ kind: 'param', block: i, param: j, effect, name: def.name, from: d.params[j], to: w.params[j] })
    })
  })
  return out
}

/** The working copy with one change put back to the pedal's value. */
export function undoChange(working: Patch, device: Patch, c: Change): Patch {
  switch (c.kind) {
    case 'name':
      return { ...working, name: device.name }
    case 'chain':
      return { ...working, blocks: device.blocks.map((b) => ({ ...b, params: [...b.params] })) }
    case 'bypass':
      return { ...working, blocks: working.blocks.map((b, k) => (k === c.block ? { ...b, on: c.from } : b)) }
    case 'param':
      return setParam(working, c.block, c.param, c.from)
  }
}
