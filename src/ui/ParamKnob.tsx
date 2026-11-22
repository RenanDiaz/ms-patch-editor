import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { ParamDef } from '../protocol/effectTypes'
import { clamp, coarseStep, paramKind, paramScale, parseTyped } from './paramControl'

interface Props {
  def: ParamDef
  raw: number
  firmware: number
  /** The pedal's value for this parameter; undefined when the block is new (no pedal value to compare). */
  device?: number
  /** What the parameter does (`paramInfo()`, from Zoom's Ver.2 list); shown as a tooltip and read by screen readers. */
  help?: string
  onChange: (raw: number) => void
}

const pt = (a: number, r: number) => [50 + r * Math.sin((a * Math.PI) / 180), 50 - r * Math.cos((a * Math.PI) / 180)]
const arc = (a0: number, a1: number, r: number) => {
  const [x0, y0] = pt(a0, r)
  const [x1, y1] = pt(a1, r)
  return `M${x0} ${y0} A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`
}
const angleOf = (frac: number) => -135 + 270 * frac

/**
 * Value control, following common plugin conventions:
 * - knob: vertical drag (Shift = fine), wheel (Shift = fine), arrows ±1,
 *   PageUp/PageDown coarse, Home/End; double-click, Alt/Option+click or
 *   Delete/Backspace = default value;
 * - value: double-click to type a number (Enter applies, Esc cancels, clamped);
 * - two-state parameters: a switch only; labelled parameters (cabinets,
 *   lists): a drop-down only (one control per value).
 * Changed = different from what the pedal has (`device`), shown as
 * "on pedal: X" and a tick on the arc.
 */
export function ParamKnob({ def, raw, firmware, device, help, onChange }: Props) {
  const scale = paramScale(def, firmware)
  const pos = scale.toPos(raw)
  const last = scale.steps - 1
  const drag = useRef<{ y: number; pos: number } | null>(null)
  const kind = paramKind(def, firmware)
  const [typing, setTyping] = useState<string | null>(null)
  const toDefault = () => setPos(scale.toPos(def.def))
  const changed = device !== undefined && device !== raw

  const setPos = (p: number) => {
    const next = scale.toRaw(clamp(p, 0, last))
    if (next !== raw) onChange(next)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.altKey) {
      toDefault()
      return
    }
    e.currentTarget.setPointerCapture?.(e.pointerId)
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
  }, [kind])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = {
      ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1,
      PageUp: coarseStep(scale.steps), PageDown: -coarseStep(scale.steps),
    }
    if (e.key in step) setPos(pos + step[e.key])
    else if (e.key === 'Home') setPos(0)
    else if (e.key === 'End') setPos(last)
    else if (e.key === 'Delete' || e.key === 'Backspace') toDefault()
    else return
    e.preventDefault()
  }

  const label = scale.label(raw)
  const pedalText = changed ? scale.label(device) : null
  const was = (
    <div className="param-was">
      {pedalText !== null && (
        <>
          on pedal: <b>{pedalText}</b>
        </>
      )}
    </div>
  )

  if (kind === 'toggle') {
    const on = pos === 1
    return (
      <div className={`param ${changed ? 'changed' : ''}`}>
        <ParamName name={def.name} help={help} />
        <div className="param-control">
          <button
            className={`param-switch ${on ? 'on' : ''}`}
            role="switch"
            aria-checked={on}
            aria-label={`${def.name}: ${label} (click to change)`}
            onClick={() => setPos(on ? 0 : 1)}
          >
            <span className="track" aria-hidden="true">
              <span className="thumb" />
            </span>
            <span className="param-switch-label">{label}</span>
          </button>
        </div>
        {was}
      </div>
    )
  }

  if (kind === 'list') {
    return (
      <div className={`param ${changed ? 'changed' : ''}`}>
        <ParamName name={def.name} help={help} />
        <div className="param-control">
          <select className="param-select" aria-label={`${def.name} (list)`} value={pos} onChange={(e) => setPos(Number(e.target.value))}>
            {Array.from({ length: scale.steps }, (_, p) => (
              <option key={p} value={p}>
                {scale.label(scale.toRaw(p))}
              </option>
            ))}
          </select>
        </div>
        {was}
      </div>
    )
  }

  const frac = last > 0 ? pos / last : 0
  const a = angleOf(frac)
  const [px, py] = pt(a, 24)
  const devFrac = changed && last > 0 ? scale.toPos(device) / last : null
  const ghost = devFrac === null ? null : [pt(angleOf(devFrac), 34), pt(angleOf(devFrac), 48)]
  return (
    <div className={`param ${changed ? 'changed' : ''}`}>
      <ParamName name={def.name} help={help} />
      <div
        ref={knobRef}
        className="knob param-control"
        role="slider"
        tabIndex={0}
        aria-label={def.name}
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={pos}
        aria-valuetext={changed ? `${label} (on pedal: ${pedalText})` : label}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        onDoubleClick={toDefault}
        title={`Drag or use the wheel (Shift = fine), arrow keys, Page Up/Down. Double-click, Alt+click or Delete = default (${scale.label(def.def)}).`}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d={arc(-135, 135, 41)} className="knob-track" />
          {frac > 0 && <path d={arc(-135, a, 41)} className="knob-arc" />}
          {ghost && <line x1={ghost[0][0]} y1={ghost[0][1]} x2={ghost[1][0]} y2={ghost[1][1]} className="knob-ghost" />}
          <circle cx="50" cy="50" r="30" className="knob-body" />
          <line x1="50" y1="50" x2={px} y2={py} className="knob-pointer" />
        </svg>
      </div>
      {typing !== null ? (
        <input
          className="param-value param-input"
          aria-label={`${def.name} (type a value)`}
          autoFocus
          onFocus={(e) => e.target.select()}
          value={typing}
          onChange={(e) => setTyping(e.target.value)}
          onBlur={() => setTyping(null)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const r = parseTyped(scale, typing)
              if (r !== null && r !== raw) onChange(r)
              setTyping(null)
            } else if (e.key === 'Escape') setTyping(null)
          }}
        />
      ) : (
        <button
          type="button"
          className="param-value param-value-edit"
          title="Click to type a value"
          aria-label={`${def.name}: ${label}. Click to type a value`}
          onClick={() => setTyping(label)}
        >
          {label}
        </button>
      )}
      {was}
      <div className="param-range">
        {scale.label(scale.toRaw(0))} – {scale.label(scale.toRaw(last))}
      </div>
    </div>
  )
}

/** Parameter name; with help text it gets a dotted underline and a tooltip (what it does, and its direction). */
function ParamName({ name, help }: { name: string; help?: string }) {
  if (!help) return <div className="param-name" title={name}>{name}</div>
  return (
    <div className="param-name has-help" title={`${name}: ${help}`} tabIndex={0} aria-label={`${name}. ${help}`}>
      {name}
    </div>
  )
}
