/**
 * Helper texts for each effect, shown next to the pedal's own (abbreviated)
 * effect name. Keyed by effect id (see `src/protocol/effects60b.generated.ts`).
 *
 * Source: Zoom's "Effect Types and Parameters (Ver.2)",
 * `docs/E_MS-60B_FX-list_v2.pdf`, cross-checked with g200kg's `effectslist.js`
 * (`title` field). Rule 4 of CLAUDE.md applies: nothing from memory; leave a
 * field out if the documents do not support it. Descriptions are written in
 * our own words (the PDF may not be reproduced).
 *
 * Search (effect picker) matches the pedal name, `fullName`, `reference` and
 * `aliases`, plus the category; never `description`.
 */
export interface EffectInfo {
  /** Unabbreviated name, e.g. "Bass Drive" for "BassDrive". Only when the abbreviation is not self-evident or the document gives it. */
  fullName?: string
  /** The real device it models or is in the style of, as named in the documents, e.g. "Ampeg SVT". */
  reference?: string
  /** Extra search terms that are not in the name, e.g. "delay" for "AnalogDly". */
  aliases?: string[]
  /** One short sentence: what it does / how it sounds. Not used for search. */
  description?: string
}

/** Filled by the effect-texts work (2026-11-22). Empty means "no helper text yet". */
export const EFFECT_INFO: Readonly<Record<number, EffectInfo>> = {}

export const effectInfo = (id: number): EffectInfo => EFFECT_INFO[id] ?? {}
