import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { CATEGORIES, dspShare, effectsForFirmware, type Category } from '../model/catalog'
import { effectInfo } from '../model/effectInfo'
import { searchEffects } from '../model/effectSearch'
import { categoryVar } from './categoryColor'

interface Props {
  title: string
  firmware: number
  current?: number
  /** DSP share (0..1) the rest of the chain uses; effects that would take the total over 100% are marked. */
  dspUsedByOthers: number
  onPick: (effectId: number) => void
  onClose: () => void
}

/**
 * Effect picker. Fixed height, so tabs and list never move while browsing.
 * Search covers name, full name, reference, aliases and category (never the
 * description); Enter picks the first result.
 */
export function TypePicker({ title, firmware, current, dspUsedByOthers, onPick, onClose }: Props) {
  const all = useMemo(() => effectsForFirmware(firmware), [firmware])
  const [cat, setCat] = useState<Category>(() => all.find((e) => e.id === current)?.category ?? CATEGORIES[0])
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDialogElement>(null)
  const search = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal?.()
    search.current?.focus() // showModal focuses the first button otherwise
  }, [])

  const q = query.trim()
  const list = q ? searchEffects(all, q) : all.filter((e) => e.category === cat)
  const fits = (id: number) => dspUsedByOthers + dspShare(id) <= 1 + 1e-9

  return (
    <dialog ref={ref} className="picker" onCancel={onClose} onClose={onClose} aria-label={title}>
      <header className="picker-head">
        <h2>{title}</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Close" title="Close (Esc)">
          ✕
        </button>
      </header>
      <input
        ref={search}
        className="picker-search"
        type="text"
        role="searchbox"
        placeholder="Search by name, model or category (e.g. delay, SVT, comp)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && list.length) {
            e.preventDefault()
            onPick(list[0].id)
          }
        }}
        aria-label="Search effects"
      />
      <nav className={`tabs ${q ? 'inactive' : ''}`} role="tablist" aria-label="Categories">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={!q && c === cat}
            className={!q && c === cat ? 'on' : ''}
            style={{ '--c': categoryVar(c) } as CSSProperties}
            onClick={() => {
              setQuery('')
              setCat(c)
            }}
          >
            {c}
          </button>
        ))}
      </nav>
      <div className="picker-count muted" aria-live="polite">
        {q ? `${list.length} result${list.length === 1 ? '' : 's'} for “${q}”${list.length ? ' · Enter picks the first' : ''}` : `${list.length} effects`}
      </div>
      <ul className="picker-list">
        {list.map((e) => {
          const info = effectInfo(e.id)
          const ok = fits(e.id)
          const sub = [info.fullName, info.reference].filter(Boolean).join(' · ')
          return (
            <li key={e.id}>
              <button
                className={`${e.id === current ? 'current' : ''} ${ok ? '' : 'over'}`}
                style={{ '--c': categoryVar(e.category) } as CSSProperties}
                onClick={() => onPick(e.id)}
                title={ok ? undefined : 'Does not fit: with this effect the patch goes over 100% DSP and cannot be saved.'}
              >
                <span className="swatch" aria-hidden="true" />
                <span className="pick-text">
                  <span className="pick-name">
                    {e.name}
                    {sub && <span className="pick-sub"> {sub}</span>}
                  </span>
                  {info.description && <span className="pick-desc">{info.description}</span>}
                </span>
                {q && <span className="pick-cat">{e.category}</span>}
                <span className="pick-dsp">
                  {(dspShare(e.id) * 100).toFixed(0)}%{!ok && <span className="pick-over"> won't fit</span>}
                </span>
              </button>
            </li>
          )
        })}
        {list.length === 0 && <li className="muted picker-empty">No effect matches “{q}”. Try a category such as delay, reverb, comp or drive.</li>}
      </ul>
      <footer className="muted">DSP = estimated share of the pedal's processor. Bypassed effects still use it.</footer>
    </dialog>
  )
}
