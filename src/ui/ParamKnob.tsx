import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import type { ParamDef } from '../protocol/effectTypes'
import { clamp, coarseStep, paramScale } from './paramControl'

interface Props {
  def: ParamDef
  raw: number
  firmware: number
  onChange: (raw: number) => void
}

/**
 * Value control: vertical drag (Shift = fine), mouse wheel (Shift = fine),
 * keyboard (arrows ±1, PageUp/PageDown coarse, Home/End), double-click = default.
 */
export function ParamKnob({ def, raw, firmware, onChange }: Props) {
  const scale = paramScale(def, firmware)
  const pos = scale.toPos(raw)
  const last = scale.steps - 1
  const drag = useRef<{ y: number; pos: number } | null>(null)

  const setPos = (p: number) => {
    const next = scale.toRaw(clamp(p, 0, last))
    if (next !== raw) onChange(next)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { y: e.clientY, pos }
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return
    // Full range in ~200 px; Shift = 1 step per 8 px.
    const dy = drag.current.y - e.clientY
    const delta = e.shiftKey ? dy / 8 : (dy / 200) * Math.max(last, 1)
    setPos(drag.current.pos + delta)
  }
  const onPointerUp = () => (drag.current = null)

  // Native non-passive listener so the wheel edits the value without scrolling the page.
  const knobRef = useRef<HTMLDivElement>(null)
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {})
  useEffect(() => {
    wheelRef.current = (e: WheelEvent) => {
      e.preventDefault()
      const dir = e.deltaY < 0 ? 1 : -1
      setPos(pos + dir * (e.shiftKey ? 1 : coarseStep(scale.steps)))
    }
  })
  useEffect(() => {
    const el = knobRef.current
    if (!el) return
    const h = (e: WheelEvent) => wheelRef.current(e)
    el.addEventListener('wheel', h, { passive: false })
    return () => el.removeEventListener('wheel', h)
  }, [])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = {
      ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1,
      PageUp: coarseStep(scale.steps), PageDown: -coarseStep(scale.steps),
    }
    if (e.key in step) setPos(pos + step[e.key])
    else if (e.key === 'Home') setPos(0)
    else if (e.key === 'End') setPos(last)
    else return
    e.preventDefault()
  }

  const angle = -135 + (last > 0 ? pos / last : 0) * 270
  const isDefault = raw === def.def
  return (
    <div className="param">
      <div className="param-name" title={def.name}>{def.name}</div>
      <div
        ref={knobRef}
        className="knob"
        role="slider"
        tabIndex={0}
        aria-label={def.name}
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={pos}
        aria-valuetext={scale.label(raw)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onDoubleClick={() => setPos(scale.toPos(def.def))}
        title="Arrastra o usa la rueda (Shift = fino), flechas, RePág/AvPág. Doble clic = valor por defecto."
      >
        <svg viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="16" className="knob-track" />
          <circle cx="20" cy="20" r="12" className="knob-body" />
          <line x1="20" y1="20" x2="20" y2="9" className="knob-pointer" transform={`rotate(${angle} 20 20)`} />
        </svg>
      </div>
      <div className={`param-value ${isDefault ? '' : 'changed'}`}>{scale.label(raw)}</div>
      <div className="param-range">
        {scale.label(scale.toRaw(0))} … {scale.label(scale.toRaw(last))}
        <span className="param-def"> · def {scale.label(def.def)}</span>
      </div>
    </div>
  )
}
