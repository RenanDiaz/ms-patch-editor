import { EFFECTS_60B } from '../protocol/effects60b.generated'
import type { EffectDef } from '../protocol/effectTypes'

/**
 * Effect categories as printed in the Zoom MS-60B manual, "Effect Types"
 * (pp. 24-28). g200kg groups map onto them; for firmware-1 effects the counts
 * match the manual (DYN/FLTR 19, OD/DIST 11, AMP 6, MOD/SFX 14, DLY/REV 8).
 */
export const CATEGORIES = ['DYN/FLTR', 'OD/DIST', 'AMP', 'MOD/SFX', 'DLY/REV'] as const
export type Category = (typeof CATEGORIES)[number]

const GROUP_TO_CATEGORY: Record<string, Category | undefined> = {
  COMP: 'DYN/FLTR',
  FILTER: 'DYN/FLTR',
  DRIVE: 'OD/DIST',
  AMP: 'AMP',
  MOD: 'MOD/SFX',
  SFX: 'MOD/SFX',
  DELAY: 'DLY/REV',
  REVERB: 'DLY/REV',
}

export const THRU_ID = 0

export interface CatalogEffect extends EffectDef {
  category: Category | null
  /** True when the name was checked against the manual we have (firmware-1 effects). */
  nameVerified: boolean
}

export const CATALOG: readonly CatalogEffect[] = EFFECTS_60B.map((e) => ({
  ...e,
  category: GROUP_TO_CATEGORY[e.group] ?? null,
  nameVerified: e.minFirmware <= 1,
}))

const BY_ID = new Map(CATALOG.map((e) => [e.id, e]))

export function getEffect(id: number): CatalogEffect | undefined {
  return BY_ID.get(id)
}

/** Effects selectable on a pedal with this firmware, in g200kg's order. */
export function effectsForFirmware(firmware: number): CatalogEffect[] {
  return CATALOG.filter((e) => e.id !== THRU_ID && e.minFirmware <= Math.floor(firmware))
}

/**
 * Estimated DSP share of one effect, 0..1 (g200kg: 1 / dsp; index.html DispPatch).
 * This is g200kg's estimate, not a Zoom figure; the pedal's own "DSP full" bits
 * are the authority once a patch has been sent to it (S3).
 */
export function dspShare(id: number): number {
  const e = getEffect(id)
  return e ? 1 / e.dsp : 0
}
