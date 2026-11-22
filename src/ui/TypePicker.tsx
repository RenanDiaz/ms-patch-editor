import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES, effectsForFirmware, type Category } from '../model/catalog'

interface Props {
  title: string
  firmware: number
  current?: number
  onPick: (effectId: number) => void
  onClose: () => void
}

export function TypePicker({ title, firmware, current, onPick, onClose }: Props) {
  const all = useMemo(() => effectsForFirmware(firmware), [firmware])
  const [cat, setCat] = useState<Category>(() => all.find((e) => e.id === current)?.category ?? CATEGORIES[0])
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal?.()
  }, [])

  const q = query.trim().toLowerCase()
  const list = all.filter((e) => (q ? e.name.toLowerCase().includes(q) : e.category === cat))

  return (
    <dialog ref={ref} className="picker" onCancel={onClose} onClose={onClose} aria-label={title}>
      <header>
        <h2>{title}</h2>
        <input autoFocus placeholder="Buscar…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar efecto" />
        <button className="ghost" onClick={onClose} aria-label="Cerrar">✕</button>
      </header>
      {!q && (
        <nav className="tabs" role="tablist">
          {CATEGORIES.map((c) => (
            <button key={c} role="tab" aria-selected={c === cat} className={c === cat ? 'on' : ''} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </nav>
      )}
      <ul className="picker-list">
        {list.map((e) => (
          <li key={e.id}>
            <button className={e.id === current ? 'current' : ''} onClick={() => onPick(e.id)}>
              <span className="pname">{e.name}</span>
              <span className="pdsp">{(100 / e.dsp).toFixed(0)}%</span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="muted">Sin resultados</li>}
      </ul>
      <footer className="muted">DSP = estimado de g200kg por efecto.</footer>
    </dialog>
  )
}
