import { dspShare, getEffect, THRU_ID } from './catalog'

export const MAX_BLOCKS = 4
export const PARAMS_PER_BLOCK = 9
export const NAME_MAX = 10

export interface Block {
  effectId: number
  on: boolean
  /** Raw values of params 1..9 (fx[n][2..10]). */
  params: number[]
}

export interface Patch {
  name: string
  /** 1..4 blocks, in signal order (pedal slots 1..n; maxFx = blocks.length). */
  blocks: Block[]
}

/** New block of a type with g200kg defaults (index.html GetEffectFromId: on, params = def, rest 0). */
export function newBlock(effectId: number): Block {
  const def = getEffect(effectId)
  const params = new Array(PARAMS_PER_BLOCK).fill(0)
  def?.params.forEach((p, i) => (params[i] = p.def))
  return { effectId, on: true, params }
}

export function patchesEqual(a: Patch, b: Patch): boolean {
  return (
    a.name === b.name &&
    a.blocks.length === b.blocks.length &&
    a.blocks.every((x, i) => {
      const y = b.blocks[i]
      return x.effectId === y.effectId && x.on === y.on && x.params.every((v, k) => v === y.params[k])
    })
  )
}

/** Sum of estimated DSP shares. > 1 means the patch does not fit (estimate). OFF blocks still count (manual p. 9). */
export function dspTotal(p: Patch): number {
  return p.blocks.reduce((s, b) => s + dspShare(b.effectId), 0)
}

export interface SaveCheck {
  ok: boolean
  reason?: string
}

export function canSave(p: Patch): SaveCheck {
  const total = dspTotal(p)
  if (total > 1 + 1e-9) {
    const pct = Math.round(total * 100)
    return {
      ok: false,
      reason: `El patch usa ~${pct}% del DSP (estimado). El pedal no puede procesarlo y mostraría "DSP Full!". Cambia un efecto por uno más liviano o quítalo; los efectos en OFF también consumen DSP.`,
    }
  }
  if (p.blocks.length === 0 || p.blocks.length > MAX_BLOCKS) return { ok: false, reason: 'La cadena debe tener entre 1 y 4 bloques.' }
  return { ok: true }
}

// ---- pure edit operations (all return a new Patch) ----

const withBlocks = (p: Patch, blocks: Block[]): Patch => ({ ...p, blocks })

export function toggleBlock(p: Patch, i: number): Patch {
  return withBlocks(p, p.blocks.map((b, k) => (k === i ? { ...b, on: !b.on } : b)))
}

export function moveBlock(p: Patch, from: number, to: number): Patch {
  if (from === to || to < 0 || to >= p.blocks.length) return p
  const blocks = [...p.blocks]
  const [b] = blocks.splice(from, 1)
  blocks.splice(to, 0, b)
  return withBlocks(p, blocks)
}

/** Inserts a block at index `at` (default: end). No-op when the chain is full. */
export function addBlock(p: Patch, effectId: number, at = p.blocks.length): Patch {
  if (p.blocks.length >= MAX_BLOCKS) return p
  const blocks = [...p.blocks]
  blocks.splice(at, 0, newBlock(effectId))
  return withBlocks(p, blocks)
}

/** Removes a block. Removing the last remaining block leaves a single THRU, like the pedal. */
export function removeBlock(p: Patch, i: number): Patch {
  const blocks = p.blocks.filter((_, k) => k !== i)
  return withBlocks(p, blocks.length ? blocks : [newBlock(THRU_ID)])
}

/** Changes a block's type; parameters reset to the new type's defaults, ON/OFF is kept. */
export function changeType(p: Patch, i: number, effectId: number): Patch {
  return withBlocks(p, p.blocks.map((b, k) => (k === i ? { ...newBlock(effectId), on: b.on } : b)))
}

export function setParam(p: Patch, i: number, param: number, value: number): Patch {
  return withBlocks(
    p,
    p.blocks.map((b, k) => (k === i ? { ...b, params: b.params.map((v, j) => (j === param ? value : v)) } : b)),
  )
}

/**
 * Characters the pedal offers when renaming a patch (fw 2.10), read from the
 * pedal on 2026-11-22: space, A-Z, a-z, 0-9 and ! # $ % & ' ( ) + , - . ; = @ [ ] ^ _ ` { } ~
 * (not offered: " * / : < > ? \ |). See docs/protocol.md §9.6.
 */
export const NAME_SYMBOLS = " !#$%&'()+,-.;=@[]^_`{}~"
const NAME_CHAR = /[A-Za-z0-9 !#$%&'()+,\-.;=@[\]^_`{}~]/

export const isNameChar = (c: string) => c.length === 1 && NAME_CHAR.test(c)

/** Cleans a typed name: drops characters the pedal does not offer, cuts to 10, trims trailing spaces (the pedal pads with spaces). */
export function cleanName(name: string): string {
  return [...name].filter(isNameChar).join('').slice(0, NAME_MAX).replace(/ +$/, '')
}

export function rename(p: Patch, name: string): Patch {
  const n = cleanName(name)
  return n && n !== p.name ? { ...p, name: n } : p
}

// ---- copy / paste of a block (spec §12, P1) ----

/** A copied block: effect, ON/OFF and the 9 parameter values. */
export const copyBlock = (b: Block): Block => ({ effectId: b.effectId, on: b.on, params: [...b.params] })

/** Replaces block `i` with the copied block. */
export function pasteReplace(p: Patch, i: number, b: Block): Patch {
  return withBlocks(p, p.blocks.map((x, k) => (k === i ? copyBlock(b) : x)))
}

/**
 * Inserts the copied block at position `at` (0..length). A lone THRU is
 * replaced instead. With 4 blocks the chain shifts and the last block is
 * dropped (spec §12, P1).
 */
export function pasteInsert(p: Patch, at: number, b: Block): Patch {
  if (p.blocks.length === 1 && p.blocks[0].effectId === THRU_ID) return pasteReplace(p, 0, b)
  const blocks = [...p.blocks]
  blocks.splice(Math.max(0, Math.min(at, blocks.length)), 0, copyBlock(b))
  return withBlocks(p, blocks.slice(0, MAX_BLOCKS))
}
