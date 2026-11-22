import { useEffect, useReducer, useRef, useState, type DragEvent } from 'react'
import { bankReducer, isDirty, type BankState } from '../model/bank'
import { dspShare, getEffect, THRU_ID } from '../model/catalog'
import {
  addBlock,
  canSave,
  changeType,
  dspTotal,
  MAX_BLOCKS,
  moveBlock,
  NAME_MAX,
  removeBlock,
  rename,
  setParam,
  toggleBlock,
  type Patch,
} from '../model/patch'
import type { PedalSession } from '../protocol/pedalSession'
import { ParamKnob } from './ParamKnob'
import { usePedalSync } from './usePedalSync'
import { TypePicker } from './TypePicker'
import './EditorPage.css'

type Picker = { mode: 'add' } | { mode: 'change'; index: number } | null

interface Props {
  initial: () => BankState
  /** Shown in the header, e.g. "DATOS FALSOS". */
  sourceLabel: string
  /** Real pedal. Absent = fake data. */
  pedal?: PedalSession
  /** Live listening starts on (real pedal only). */
  liveDefault?: boolean
}

export function EditorPage({ initial, sourceLabel, pedal, liveDefault = true }: Props) {
  const [state, dispatch] = useReducer(bankReducer, undefined, initial)
  const [live, setLive] = useState(!!pedal && liveDefault)
  const sync = usePedalSync(pedal, state, dispatch, live)
  const [picker, setPicker] = useState<Picker>(null)
  const dragFrom = useRef<number | null>(null)
  const [dropAt, setDropAt] = useState<number | null>(null)

  const slot = state.slots[state.current]
  const patch = slot.working
  const dirty = isDirty(slot)
  const dspCheck = canSave(patch)
  const check = dspCheck
  const total = dspTotal(patch)
  const sel = Math.min(state.selectedBlock, patch.blocks.length - 1)
  const block = patch.blocks[sel]
  const def = getEffect(block.effectId)
  const dirtyCount = state.slots.filter(isDirty).length

  // Warn before closing the tab with unsaved changes (no auto-save, spec §3).
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirtyCount > 0) e.preventDefault()
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirtyCount])

  const edit = (fn: (p: Patch) => Patch, selectBlock?: number) => dispatch({ type: 'edit', fn, selectBlock })

  const onDragStart = (i: number) => (e: DragEvent) => {
    dragFrom.current = i
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(i))
  }
  const onDragOver = (i: number) => (e: DragEvent) => {
    if (dragFrom.current === null) return
    e.preventDefault()
    setDropAt(i)
  }
  const onDrop = (i: number) => (e: DragEvent) => {
    e.preventDefault()
    const from = dragFrom.current
    dragFrom.current = null
    setDropAt(null)
    if (from !== null && from !== i) edit((p) => moveBlock(p, from, i), i)
  }

  return (
    <div className="editor">
      <header className="topbar">
        <div className="brand">
          MS-60B Edit{' '}
          <span className={pedal ? 'source-badge' : 'fake-badge'} title={pedal ? 'Pedal conectado' : 'Prototipo S2: no hay pedal conectado'}>
            {sourceLabel}
          </span>
          {pedal && sync.pedalProgram !== null && (
            <span className="muted pedal-at" title="Patch activo en el pedal">
              {' '}· pedal en {String(sync.pedalProgram + 1).padStart(2, '0')} {state.slots[sync.pedalProgram]?.device.name}
            </span>
          )}
          {pedal && (
            <label
              className="live-toggle"
              title="En vivo: lo que editas suena en el pedal al momento. Si sales del patch sin guardar, la app restaura el original."
            >
              <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} disabled={!!sync.busy} /> En vivo
            </label>
          )}
        </div>
        <div className="patch-title">
          <span className="slotnum">{String(state.current + 1).padStart(2, '0')}</span>
          <PatchName key={state.current} name={patch.name} onRename={(n) => edit((p) => rename(p, n))} />
          {dirty && <span className="dirty-pill">sin guardar</span>}
        </div>
        <div className="dsp-total" title="Uso de DSP estimado (g200kg). Los efectos en OFF también consumen.">
          <span>DSP</span>
          <div className="meter" role="meter" aria-label="DSP estimado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(total * 100)}>
            <div className={`fill ${total > 1 ? 'over' : total > 0.85 ? 'high' : ''}`} style={{ width: `${Math.min(total, 1) * 100}%` }} />
          </div>
          <span className={total > 1 ? 'bad' : ''}>{Math.round(total * 100)}%</span>
        </div>
        <div className="actions">
          <button
            onClick={() => void sync.revert()}
            disabled={(!dirty && !pedal) || !!sync.busy}
            title={pedal ? 'Descarta los cambios y vuelve a leer el patch del pedal' : 'Descarta los cambios'}
          >
            Revertir
          </button>
          <button
            className="primary"
            onClick={() => void sync.save()}
            disabled={!dirty || !check.ok || !!sync.busy}
            title={!check.ok ? check.reason : undefined}
            aria-describedby={!dspCheck.ok ? 'save-block-reason' : undefined}
          >
            Guardar
          </button>
        </div>
      </header>

      {(!dspCheck.ok || state.saveError) && (
        <div className="banner bad" id="save-block-reason" role="alert">
          <strong>Guardar bloqueado.</strong> {state.saveError ?? dspCheck.reason}
        </div>
      )}
      {sync.busy && (
        <div className="banner" role="status">
          {sync.busy}
        </div>
      )}
      {sync.pending && (
        <div className="banner warn" role="alert">
          <strong>
            El patch {String(sync.pending.slot + 1).padStart(2, '0')} “{sync.pending.name}” pudo quedar con cambios sin guardar
          </strong>{' '}
          (la app se cerró mientras editabas en vivo). ¿Lo restauro a como estaba?{' '}
          <button onClick={() => void sync.restorePending()}>Restaurar</button>{' '}
          <button onClick={sync.dismissPending}>Dejarlo así</button>
        </div>
      )}
      {pedal && live && (
        <div className="banner hint">
          En vivo: lo que editas suena en el pedal. Si cambias de patch, revierte o desconectas sin guardar, la app restaura el original. Lo
          que muevas en el propio pedal cuenta como edición y también se revierte si no guardas.
        </div>
      )}
      {sync.error && (
        <div className="banner bad" role="alert">
          {sync.error}
        </div>
      )}
      {sync.conflict && (
        <div className="banner warn" role="alert">
          <strong>Conflicto en {String(sync.conflict.index + 1).padStart(2, '0')} “{state.slots[sync.conflict.index].working.name}”.</strong>{' '}
          Cambiaste este patch en el pedal y aquí tienes cambios sin guardar. ¿Cuál conservas?{' '}
          <button onClick={() => sync.resolveConflict('pedal')}>Usar la del pedal</button>{' '}
          <button onClick={() => sync.resolveConflict('mine')}>Conservar la mía</button>
        </div>
      )}

      <div className="body">
        <nav className="patches" aria-label="Patches">
          <div className="patches-head">
            Patches {dirtyCount > 0 && <span className="muted">· {dirtyCount} con cambios</span>}
          </div>
          <ol>
            {state.slots.map((s, i) => (
              <li key={i}>
                <button
                  className={i === state.current ? 'current' : ''}
                  aria-current={i === state.current ? 'true' : undefined}
                  onClick={() => dispatch({ type: 'selectPatch', index: i })}
                >
                  <span className="num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="name">{s.working.name}</span>
                  {isDirty(s) && <span className="dot" aria-label="cambios sin guardar" title="Cambios sin guardar" />}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <main className="main">
          <section className="chain" aria-label="Cadena de efectos">
            <div className="io">IN</div>
            {Array.from({ length: MAX_BLOCKS }, (_, i) => {
              const b = patch.blocks[i]
              if (!b) {
                const isNextFree = i === patch.blocks.length
                return (
                  <div key={i} className="slot empty">
                    {isNextFree ? (
                      <button className="add" onClick={() => setPicker({ mode: 'add' })} aria-label="Agregar bloque">
                        + Agregar
                      </button>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </div>
                )
              }
              const e = getEffect(b.effectId)
              const thru = b.effectId === THRU_ID
              return (
                <div
                  key={i}
                  className={`slot block ${i === sel ? 'selected' : ''} ${b.on ? 'on' : 'off'} ${thru ? 'thru' : ''} ${dropAt === i ? 'drop' : ''}`}
                  draggable
                  onDragStart={onDragStart(i)}
                  onDragOver={onDragOver(i)}
                  onDragLeave={() => setDropAt(null)}
                  onDrop={onDrop(i)}
                  onDragEnd={() => setDropAt(null)}
                  onClick={() => dispatch({ type: 'selectBlock', index: i })}
                >
                  <div className="block-top">
                    <span className="cat">{e?.category ?? (thru ? 'THRU' : '?')}</span>
                    <button
                      className={`led ${b.on ? 'lit' : ''}`}
                      aria-pressed={b.on}
                      aria-label={`${e?.name ?? 'Bloque'} ${b.on ? 'activo' : 'en bypass'}`}
                      title={b.on ? 'Activo (clic para bypass)' : 'Bypass (clic para activar)'}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        edit((p) => toggleBlock(p, i), i)
                      }}
                    />
                  </div>
                  <button className="block-name" onClick={() => dispatch({ type: 'selectBlock', index: i })}>
                    {e?.name ?? `0x${b.effectId.toString(16)}`}
                  </button>
                  <div className="block-dsp" title={`DSP estimado ${(dspShare(b.effectId) * 100).toFixed(0)}%`}>
                    <div style={{ width: `${Math.min(dspShare(b.effectId), 1) * 100}%` }} />
                  </div>
                  <div className="block-tools">
                    <button aria-label="Mover a la izquierda" disabled={i === 0} onClick={(ev) => { ev.stopPropagation(); edit((p) => moveBlock(p, i, i - 1), i - 1) }}>◀</button>
                    <button aria-label="Mover a la derecha" disabled={i === patch.blocks.length - 1} onClick={(ev) => { ev.stopPropagation(); edit((p) => moveBlock(p, i, i + 1), i + 1) }}>▶</button>
                    <button aria-label="Quitar bloque" onClick={(ev) => { ev.stopPropagation(); edit((p) => removeBlock(p, i), Math.max(0, i - 1)) }}>✕</button>
                  </div>
                </div>
              )
            })}
            <div className="io">OUT</div>
          </section>

          <section className="panel" aria-label="Parámetros del bloque">
            <header className="panel-head">
              <div>
                <h2>
                  {sel + 1}. {def?.name ?? 'Desconocido'}
                </h2>
                <div className="muted">
                  {def?.category ?? '—'} · DSP ~{(dspShare(block.effectId) * 100).toFixed(0)}% · {block.on ? 'activo' : 'bypass'}
                </div>
              </div>
              <button onClick={() => setPicker({ mode: 'change', index: sel })}>Cambiar tipo…</button>
            </header>
            {def && def.params.length > 0 ? (
              <div className="params">
                {def.params.map((p, j) => (
                  <ParamKnob
                    key={`${block.effectId}-${j}`}
                    def={p}
                    raw={block.params[j]}
                    firmware={state.firmware}
                    onChange={(v) => edit((pt) => setParam(pt, sel, j, v))}
                  />
                ))}
              </div>
            ) : (
              <p className="muted">THRU no tiene parámetros. Usa “Cambiar tipo…” para elegir un efecto.</p>
            )}
          </section>
        </main>
      </div>

      {picker && (
        <TypePicker
          title={picker.mode === 'add' ? 'Agregar bloque' : `Cambiar tipo del bloque ${picker.index + 1}`}
          firmware={state.firmware}
          current={picker.mode === 'change' ? patch.blocks[picker.index].effectId : undefined}
          onClose={() => setPicker(null)}
          onPick={(id) => {
            if (picker.mode === 'add') edit((p) => addBlock(p, id), patch.blocks.length)
            else edit((p) => changeType(p, picker.index, id), picker.index)
            setPicker(null)
          }}
        />
      )}

      {state.pendingSwitch !== null && (
        <SwitchDialog
          from={patch.name}
          to={state.slots[state.pendingSwitch].working.name}
          canSave={check.ok}
          reason={check.reason}
          onChoice={(choice) => {
            if (choice === 'save' && pedal) {
              // Write first; once saved the patch is clean and switching discards nothing.
              void sync.save().then((ok) => dispatch({ type: 'resolveSwitch', choice: ok ? 'discard' : 'cancel' }))
            } else dispatch({ type: 'resolveSwitch', choice })
          }}
        />
      )}
    </div>
  )
}

function PatchName({ name, onRename }: { name: string; onRename: (n: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  if (!editing) {
    return (
      <button
        className="pname pname-btn"
        title="Clic para cambiar el nombre (hasta 10 caracteres)"
        onClick={() => {
          setDraft(name)
          setEditing(true)
        }}
      >
        {name || '—'}
      </button>
    )
  }
  const commit = () => {
    onRename(draft)
    setEditing(false)
  }
  return (
    <input
      className="pname pname-input"
      aria-label="Nombre del patch"
      autoFocus
      onFocus={(e) => e.target.select()}
      value={draft}
      maxLength={NAME_MAX}
      onChange={(e) => setDraft(e.target.value.replace(/[^\x20-\x7e]/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        else if (e.key === 'Escape') setEditing(false)
      }}
    />
  )
}

function SwitchDialog(props: {
  from: string
  to: string
  canSave: boolean
  reason?: string
  onChoice: (c: 'save' | 'discard' | 'cancel') => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal?.()
  }, [])
  return (
    <dialog ref={ref} className="confirm" onCancel={() => props.onChoice('cancel')} aria-labelledby="switch-title">
      <h2 id="switch-title">“{props.from}” tiene cambios sin guardar</h2>
      <p>¿Qué hago antes de abrir “{props.to}”?</p>
      {!props.canSave && <p className="bad">No se puede guardar: {props.reason}</p>}
      <div className="row">
        <button className="primary" onClick={() => props.onChoice('save')} disabled={!props.canSave}>
          Guardar
        </button>
        <button onClick={() => props.onChoice('discard')}>Descartar</button>
        <button className="ghost" onClick={() => props.onChoice('cancel')}>
          Cancelar
        </button>
      </div>
    </dialog>
  )
}
