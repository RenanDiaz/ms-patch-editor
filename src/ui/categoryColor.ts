import type { Category } from '../model/catalog'

/** One color per manual category (CSS custom properties in EditorPage.css). */
const VARS: Record<Category, string> = {
  'DYN/FLTR': 'var(--c-dyn)',
  'OD/DIST': 'var(--c-drive)',
  AMP: 'var(--c-amp)',
  'MOD/SFX': 'var(--c-mod)',
  'DLY/REV': 'var(--c-delay)',
}

export const categoryVar = (c: Category | null | undefined): string => (c ? VARS[c] : 'var(--c-thru)')
