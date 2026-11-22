/**
 * Helper text for each effect parameter: what it controls and, when the
 * source says so, which way it goes ("higher = more compression").
 * Keyed by effect id, then by parameter index (0..8, as in `EffectDef.params`).
 *
 * Source: Zoom's "Effect Types and Parameters (Ver.2)",
 * `docs/E_MS-60B_FX-list_v2.pdf` (the explanation next to each parameter).
 * Rule 4 of CLAUDE.md applies: nothing from memory; leave a parameter out if
 * the document does not explain it. Texts are written in our own words (the
 * PDF may not be reproduced), in English, one short sentence each.
 */
export interface ParamInfo {
  /** One short sentence: what the parameter does, and its direction when the document says it. */
  help: string
}

/** Filled by the parameter-help work (2026-11-22). Empty means "no helper text yet". */
export const PARAM_INFO: Readonly<Record<number, Readonly<Record<number, ParamInfo>>>> = {}

export const paramInfo = (effectId: number, index: number): ParamInfo | undefined => PARAM_INFO[effectId]?.[index]
