import type { CatalogEffect } from './catalog'
import { effectInfo } from './effectInfo'

/** Lower case, letters and digits only: "Ba Chorus" → "bachorus", "DLY/REV" → "dlyrev". */
export const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * Effect search (spec §13): matches the pedal's name, `fullName`, `reference`
 * and `aliases` from `effectInfo()`, and the category (the manual's code, e.g.
 * "DLY/REV", and g200kg's group, e.g. "DELAY"). Never the description.
 * Every word of the query must match some field. Results are ranked: name
 * starts with the query, name contains it, other texts, category only.
 */
export function searchEffects(list: readonly CatalogEffect[], query: string): CatalogEffect[] {
  const words = query.split(/\s+/).map(norm).filter(Boolean)
  if (!words.length) return [...list]
  const whole = norm(query)
  const scored: { e: CatalogEffect; rank: number; i: number }[] = []
  list.forEach((e, i) => {
    const info = effectInfo(e.id)
    const name = norm(e.name)
    const texts = [info.fullName, info.reference, ...(info.aliases ?? [])].filter((t): t is string => !!t).map(norm)
    const cats = [e.category ?? '', e.group].map(norm)
    // Category codes also match word by word: "dly" or "rev" for DLY/REV.
    const catParts = (e.category ?? '').split('/').map(norm)
    const fields = [name, ...texts, ...cats, ...catParts]
    if (!words.every((w) => fields.some((f) => f.includes(w)))) return
    const rank = name.startsWith(whole)
      ? 0
      : name.includes(whole)
        ? 1
        : texts.some((t) => t.includes(whole))
          ? 2
          : words.some((w) => name.includes(w) || texts.some((t) => t.includes(w)))
            ? 3
            : 4
    scored.push({ e, rank, i })
  })
  return scored.sort((a, b) => a.rank - b.rank || a.i - b.i).map((s) => s.e)
}
