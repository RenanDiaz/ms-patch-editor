import { useEffect, useMemo, useReducer, useRef, useState, type CSSProperties, type DragEvent } from 'react'
import { bankReducer, canRedo, canUndo, isDirty, type BankState } from '../model/bank'
import { dspShare, getEffect, THRU_ID } from '../model/catalog'
import { deviceBlockFor, diffPatch, effectName, undoChange, type Change } from '../model/changes'
import { effectInfo } from '../model/effectInfo'
import { patchFromDevice } from '../model/fromDevice'
import {
  addBlock,
  canSave,
  changeType,
  copyBlock,
  dspTotal,
  MAX_BLOCKS,
  moveBlock,
  pasteInsert,
  pasteReplace,
  removeBlock,
  rename,
  setParam,
  toggleBlock,
  type Block,
  type Patch,
} from '../model/patch'
import { BackupFileError, parseBackupJson, restorePlan, toBackupJson, type BankBackup, type RestoreItem } from '../protocol/backupFile'
import type { PedalSession } from '../protocol/pedalSession'
import { BankRestoreDialog } from './BankRestoreDialog'
import { categoryVar } from './categoryColor'
import { changeLine, pad2 } from './changeText'
import {
  ChainSquares,
  chainText,
  ClipboardBar,
  ConfirmDialog,
  ConflictDialog,
  PatchName,
  PendingRestoreDialog,
  SwitchDialog,
} from './editorParts'
import { ParamKnob } from './ParamKnob'
import { paramScale } from './paramControl'
import { TypePicker } from './TypePicker'
import { usePedalSync } from './usePedalSync'
import '@fontsource/big-shoulders-display/600'
import '@fontsource/big-shoulders-display/700'
import '@fontsource/big-shoulders-display/800'
import '@fontsource/atkinson-hyperlegible/400'
import '@fontsource/atkinson-hyperlegible/700'
import './EditorPage.css'

type Picker = { mode: 'add' } | { mode: 'change'; index: number } | null

interface Props {
  initial: () => BankState
  /** Real pedal. Absent = demo with fake data. */
  pedal?: PedalSession
  /** Live listening starts on (real pedal only). */
  liveDefault?: boolean
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
const MOD = isMac ? '⌘' : 'Ctrl+'
/** Key values shown on each block of the chain. */
const KEY_VALUES = 3
const NOTICE_MS = 4000

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function EditorPage({ initial, pedal, liveDefault = true }: Props) {
  const [state, dispatch] = useReducer(bankReducer, undefined, initial)
  const [live, setLive] = useState(!!pedal && liveDefault)
  const sync = usePedalSync(pedal, state, dispatch, live)
  const [picker, setPicker] = useState<Picker>(null)
  const [clip, setClip] = useState<{ block: Block; from: string } | null>(null)
  const [clipBar, setClipBar] = useState(false)
  const [restore, setRestore] = useState<{ fileName: string; backup: BankBackup; items: RestoreItem[] } | null>(null)
  const [bankMsg, setBankMsg] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [confirmRevert, setConfirmRevert] = useState(false)
  const [bankOpen, setBankOpen] = useState(false)
  // Escape closes the Bank menu wherever the focus is (found in a real test: it only worked inside the menu).
  useEffect(() => {
    if (!bankOpen) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBankOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [bankOpen])
  const restoreInput = useRef<HTMLInputElement>(null)
  const changesRef = useRef<HTMLElement>(null)
  const dragFrom = useRef<number | null>(null)
  const [dropAt, setDropAt] = useState<number | null>(null)

  const slot = state.slots[state.current]
  const patch = slot.working
  const dirty = isDirty(slot)
  const changes = useMemo(() => diffPatch(slot.device, slot.working), [slot.device, slot.working])
  const changeCount = dirty ? Math.max(changes.length, 1) : 0
  const check = canSave(patch)
  const total = dspTotal(patch)
  const sel = Math.min(state.selectedBlock, patch.blocks.length - 1)
  const block = patch.blocks[sel]
  const def = getEffect(block.effectId)
  const info = effectInfo(block.effectId)
  const devBlock = deviceBlockFor(slot.device, patch, sel)
  const dirtyCount = state.slots.filter(isDirty).length
  const num = pad2(state.current + 1)
  const busy = !!sync.busy

  // ---- notices ----
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const flash = (text: string) => {
    clearTimeout(noticeTimer.current)
    setBankMsg(null) // the newest message wins: an older bank message must not hide "Saved to NN ✓"
    setNotice(text)
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS)
  }
  useEffect(() => () => clearTimeout(noticeTimer.current), [])

  // Warn before closing the tab with unsaved changes (no auto-save, spec §3).
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (dirtyCount > 0) e.preventDefault()
    }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [dirtyCount])

  // The paste bar shows again on another patch (it hides after each paste).
  useEffect(() => {
    if (clip) setClipBar(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.current])

  // Keep the open patch visible in the list (keyboard ↑/↓, following the pedal).
  const listRef = useRef<HTMLOListElement>(null)
  useEffect(() => {
    listRef.current?.querySelector('[aria-current="true"]')?.scrollIntoView?.({ block: 'nearest' })
  }, [state.current])

  // ---- edits ----
  const edit = (fn: (p: Patch) => Patch, selectBlock?: number, merge?: string) =>
    dispatch({ type: 'edit', fn, selectBlock, merge, at: merge ? Date.now() : undefined })

  const copyAt = (i: number) => {
    const b = patch.blocks[i]
    if (!b || b.effectId === THRU_ID) return
    setClip({ block: copyBlock(b), from: `block ${i + 1} of ${num} ${patch.name}` })
    setClipBar(true)
    flash(`Copied ${effectName(b.effectId)}. Open any patch and paste with ${MOD}V.`)
  }
  const pasteOver = (i: number) => {
    if (!clip) return
    edit((p) => pasteReplace(p, i, clip.block), i)
    setClipBar(false)
  }
  const pasteAt = (at: number) => {
    if (!clip) return
    edit((p) => pasteInsert(p, at, clip.block), Math.min(at, MAX_BLOCKS - 1))
    setClipBar(false)
  }

  const doSave = async () => {
    if (!dirty || !check.ok || busy) return
    const at = state.current
    const ok = await sync.save()
    if (ok) flash(`Saved to ${pad2(at + 1)} ✓`)
  }
  const doRevert = async () => {
    setConfirmRevert(false)
    const at = state.current
    await sync.revert()
    flash(`Reverted ${pad2(at + 1)} to the pedal's version. ${MOD}Z brings your changes back.`)
  }
  const askRevert = () => {
    if (!dirty || busy) return
    if (changeCount > 1) setConfirmRevert(true)
    else void doRevert()
  }
  const undo = () => !busy && dispatch({ type: 'undo' })
  const redo = () => !busy && dispatch({ type: 'redo' })
  const undoOne = (c: Change) => edit((p) => undoChange(p, slot.device, c))

  // ---- bank (backup / restore) ----
  const download = (name: string, text: string) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const stamp = () => new Date().toISOString().replace(/[:.]/g, '-')
  const backupNow = async () => {
    setBankOpen(false)
    setBankMsg(null)
    try {
      const cap = await sync.backupBank()
      if (!cap) return
      download(`ms60b-backup-${stamp()}.json`, toBackupJson(cap, 'MS-60B bank backup (MS-60B Edit).'))
      setBankMsg('Backup downloaded: all 50 patches.')
    } catch (e) {
      setBankMsg((e as Error).message)
    }
  }
  const openRestore = async (file: File) => {
    setBankMsg(null)
    try {
      const backup = parseBackupJson(await file.text())
      const cap = await sync.backupBank()
      if (!cap) return
      setRestore({ fileName: file.name, backup, items: restorePlan(cap.patches, backup.patches) })
    } catch (e) {
      setBankMsg(e instanceof BackupFileError ? `Backup file: ${e.message}.` : (e as Error).message)
    }
  }

  // ---- keyboard shortcuts ----
  const keys = useRef({
    save: doSave, undo, redo, askRevert, copyAt, pasteOver, pasteAt,
    sel, len: patch.blocks.length, current: state.current, slots: state.slots.length,
    toggle: (_i: number) => {},
    selectPatch: (_i: number) => {},
    selectBlock: (_i: number) => {},
  })
  useEffect(() => {
    keys.current = {
      save: doSave, undo, redo, askRevert, copyAt, pasteOver, pasteAt,
      sel, len: patch.blocks.length, current: state.current, slots: state.slots.length,
      toggle: (i) => edit((p) => toggleBlock(p, i), i),
      selectPatch: (i) => dispatch({ type: 'selectPatch', index: i }),
      selectBlock: (i) => dispatch({ type: 'selectBlock', index: i }),
    }
  })
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (document.querySelector('dialog[open]')) return
      const t = e.target instanceof Element ? e.target : null
      const inField = !!t?.closest('input, textarea, select, [contenteditable="true"]')
      const k = e.key.toLowerCase()
      const s = keys.current
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        if (k === 's') s.save()
        else if (inField) return
        else if (k === 'z' && e.shiftKey) s.redo()
        else if (k === 'z' || (k === 'y' && !isMac)) (k === 'y' ? s.redo : s.undo)()
        else if (k === 'c') {
          if (window.getSelection()?.toString()) return // copying text on the page
          s.copyAt(s.sel)
        } else if (k === 'v' && e.shiftKey) {
          if (s.sel + 1 < MAX_BLOCKS || s.len < MAX_BLOCKS) s.pasteAt(s.sel + 1)
        } else if (k === 'v') s.pasteOver(s.sel)
        else return
        e.preventDefault()
        return
      }
      if (inField || e.altKey || e.metaKey || e.ctrlKey) return
      if ((k === 'arrowup' || k === 'arrowdown') && !t?.closest('[role="slider"]')) {
        const next = s.current + (k === 'arrowup' ? -1 : 1)
        if (next >= 0 && next < s.slots) s.selectPatch(next)
      } else if (k >= '1' && k <= '4' && !e.shiftKey) {
        if (Number(k) <= s.len) s.selectBlock(Number(k) - 1)
      } else if (k === 'b') s.toggle(s.sel)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // ---- drag to reorder ----
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

  // ---- status line (fixed height: messages never push the layout) ----
  const pedalAt = sync.pedalProgram
  const status: { kind: 'bad' | 'busy' | 'info' | 'ok' | 'quiet'; text: string; dismiss?: () => void } = sync.error
    ? { kind: 'bad', text: sync.error }
    : state.saveError
      ? { kind: 'bad', text: `Can't save. ${state.saveError}`, dismiss: () => dispatch({ type: 'dismissError' }) }
      : !check.ok
        ? { kind: 'bad', text: `Save blocked. ${check.reason}` }
        : sync.busy
          ? { kind: 'busy', text: sync.busy }
          : bankMsg
            ? { kind: 'info', text: bankMsg, dismiss: () => setBankMsg(null) }
            : notice
              ? { kind: 'ok', text: notice }
              : pedal && live
                ? { kind: 'quiet', text: 'Live: edits play on the pedal right away. Leaving a patch without saving puts its original back.' }
                : pedal
                  ? { kind: 'quiet', text: 'Live is off: the pedal plays its saved patch. Your edits reach it when you save.' }
                  : { kind: 'quiet', text: 'Nothing here reaches a pedal: Save only updates this page. Connect the pedal from the start page.' }

  const sameAsPedal = pedalAt === state.current
  const blockChanges = changes.filter((c) => (c.kind === 'param' || c.kind === 'bypass') && c.block === sel).length
  const usedByOthers = (except?: number) => patch.blocks.reduce((s, b, i) => (i === except ? s : s + dspShare(b.effectId)), 0)

  return (
    <div className="editor">
      <header className="band">
        <div className="now">
          <div className="now-num" aria-label={`Patch ${num}`}>
            {num}
          </div>
          <div className="now-text">
            <PatchName key={state.current} name={patch.name} onRename={(n) => edit((p) => rename(p, n))} />
            <div className={`now-sub ${pedal && !sameAsPedal && pedalAt !== null ? 'elsewhere' : ''}`}>
              {!pedal ? (
                'Demo · no pedal connected'
              ) : pedalAt === null ? (
                'Pedal patch unknown'
              ) : sameAsPedal ? (
                <>
                  The pedal is on <b>{num}</b>
                  {live ? ': you hear this patch' : ''}
                </>
              ) : (
                <>
                  The pedal is on{' '}
                  <b>
                    {pad2(pedalAt + 1)} {state.slots[pedalAt]?.device.name}
                  </b>
                  , not this patch
                </>
              )}
            </div>
          </div>
        </div>

        <div className="pills">
          {pedal ? (
            <button
              className={`pill live ${live ? 'on' : ''}`}
              aria-pressed={live}
              onClick={() => setLive(!live)}
              disabled={busy}
              title={
                live
                  ? 'Live is on: edits play on the pedal right away. Leaving a patch without saving puts its original back. Click to turn off.'
                  : 'Live is off: edits stay in the editor until you save. Click to hear them on the pedal.'
              }
            >
              <span className="dot" aria-hidden="true" />
              Live
            </button>
          ) : (
            <span className="pill demo" title="No pedal: fake data. Connect the pedal from the start page.">
              Demo
            </span>
          )}
          <button
            className={`pill dirty ${changeCount ? '' : 'clean'}`}
            onClick={() => changesRef.current?.focus()}
            title="Show what differs from the pedal"
          >
            {changeCount ? `${plural(changeCount, 'unsaved change')}` : 'No unsaved changes'}
          </button>
        </div>

        <div className={`dsp ${total > 1 ? 'over' : ''}`} title="Estimated DSP use. Bypassed effects still use DSP.">
          <div className="dsp-lbl">
            <span>DSP</span>
            <b>{Math.round(total * 100)}%</b>
          </div>
          <div className="dsp-bar" role="meter" aria-label="Estimated DSP" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(total * 100)}>
            {patch.blocks.map((b, i) => (
              <span
                key={i}
                className={b.on ? '' : 'off'}
                title={`${i + 1} · ${effectName(b.effectId)}: ${(dspShare(b.effectId) * 100).toFixed(0)}%`}
                style={{ width: `${(dspShare(b.effectId) / Math.max(total, 1)) * 100}%`, '--c': categoryVar(getEffect(b.effectId)?.category) } as CSSProperties}
              />
            ))}
          </div>
        </div>

        <div className="actions">
          <button className="icon-btn" onClick={undo} disabled={!canUndo(state) || busy} aria-label="Undo" title={`Undo (${MOD}Z)`}>
            ↶
          </button>
          <button className="icon-btn" onClick={redo} disabled={!canRedo(state) || busy} aria-label="Redo" title={`Redo (⇧${MOD}Z)`}>
            ↷
          </button>
          <button
            onClick={askRevert}
            disabled={!dirty || busy}
            title={pedal ? "Drop all unsaved changes to this patch and go back to the pedal's version" : 'Drop all unsaved changes to this patch'}
          >
            Revert
          </button>
          <button
            className="primary save"
            onClick={() => void doSave()}
            disabled={!dirty || !check.ok || busy}
            title={!check.ok ? check.reason : `Write this patch to the pedal, in ${num} (${MOD}S)`}
          >
            Save to {num}
            <kbd aria-hidden="true">{isMac ? '⌘S' : 'Ctrl+S'}</kbd>
          </button>
          <div className="menu-wrap">
            <button
              className="quiet"
              aria-haspopup="menu"
              aria-expanded={bankOpen}
              onClick={() => setBankOpen(!bankOpen)}
              title="Back up or restore all 50 patches"
            >
              Bank ▾
            </button>
            {bankOpen && (
              <>
                <div className="menu-scrim" onClick={() => setBankOpen(false)} />
                <div className="menu" role="menu" aria-label="Bank">
                  <button role="menuitem" onClick={() => void backupNow()} disabled={!pedal || busy}>
                    Back up bank to file…
                    <small>Reads all 50 patches and downloads them</small>
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setBankOpen(false)
                      restoreInput.current?.click()
                    }}
                    disabled={!pedal || busy}
                  >
                    Restore bank from file…
                    <small>Choose which patches to write back</small>
                  </button>
                  {!pedal && <p className="menu-note">Needs the pedal connected.</p>}
                </div>
              </>
            )}
            <input
              ref={restoreInput}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void openRestore(f)
              }}
            />
          </div>
        </div>
      </header>

      <div className={`statusline ${status.kind}`} role={status.kind === 'bad' ? 'alert' : 'status'} title={status.text}>
        <span className="status-text">{status.text}</span>
        {status.dismiss && (
          <button className="ghost small" onClick={status.dismiss}>
            OK
          </button>
        )}
      </div>

      <div className="body">
        <nav className="patches" aria-label="Patches">
          <div className="patches-head">
            Patches{dirtyCount > 0 && <span> · {dirtyCount} with changes</span>}
          </div>
          <ol ref={listRef}>
            {state.slots.map((s, i) => (
              <li key={i}>
                <button
                  className={i === state.current ? 'current' : ''}
                  aria-current={i === state.current ? 'true' : undefined}
                  aria-label={[
                    `${pad2(i + 1)} ${s.working.name || 'unnamed'}`,
                    pedal && pedalAt === i ? 'the pedal is on this patch' : '',
                    isDirty(s) ? 'unsaved changes' : '',
                    `chain: ${chainText(s.working)}`,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                  onClick={() => dispatch({ type: 'selectPatch', index: i })}
                >
                  <span className="num">{pad2(i + 1)}</span>
                  <span className="name">{s.working.name}</span>
                  <ChainSquares patch={s.working} />
                  <span className="marks">
                    {pedal && pedalAt === i && <span className="here" aria-label="the pedal is on this patch" title="The pedal is on this patch" />}
                    {isDirty(s) && <span className="dot" aria-label="unsaved changes" title="Unsaved changes" />}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <main className="main">
          <div className="work">
            <section className="chain" aria-label="Effect chain">
              <div className="cable" aria-hidden="true" />
              <div className="io">IN</div>
              {Array.from({ length: MAX_BLOCKS }, (_, i) => {
                const b = patch.blocks[i]
                if (!b) {
                  return (
                    <div key={i} className="blk empty">
                      {i === patch.blocks.length && (
                        <button className="add" onClick={() => setPicker({ mode: 'add' })} disabled={busy}>
                          + Add effect
                        </button>
                      )}
                    </div>
                  )
                }
                const e = getEffect(b.effectId)
                const thru = b.effectId === THRU_ID
                const name = effectName(b.effectId)
                const dev = deviceBlockFor(slot.device, patch, i)
                return (
                  <div
                    key={i}
                    className={`blk ${i === sel ? 'sel' : ''} ${b.on ? 'on' : 'off'} ${thru ? 'thru' : ''} ${dropAt === i ? 'drop' : ''} ${dev ? '' : 'new'}`}
                    style={{ '--c': categoryVar(e?.category) } as CSSProperties}
                    draggable
                    onDragStart={onDragStart(i)}
                    onDragOver={onDragOver(i)}
                    onDragLeave={() => setDropAt(null)}
                    onDrop={onDrop(i)}
                    onDragEnd={() => setDropAt(null)}
                    onClick={() => dispatch({ type: 'selectBlock', index: i })}
                  >
                    <div className="band-c" />
                    <div className="blk-in">
                      <div className="blk-top">
                        <span className="blk-cat">
                          {i + 1} · {e?.category ?? (thru ? 'empty' : '?')}
                        </span>
                        {!thru && (
                          <button
                            className="sw"
                            aria-pressed={b.on}
                            aria-label={`${name}: ${b.on ? 'on' : 'bypassed'}`}
                            title={b.on ? 'On. Click to bypass (B)' : 'Bypassed. Click to turn on (B)'}
                            onClick={(ev) => {
                              ev.stopPropagation()
                              edit((p) => toggleBlock(p, i), i)
                            }}
                          >
                            <i aria-hidden="true" />
                            {b.on ? 'On' : 'Bypass'}
                          </button>
                        )}
                      </div>
                      <button className="block-name" onClick={() => dispatch({ type: 'selectBlock', index: i })} title={effectInfo(b.effectId).fullName}>
                        {name}
                      </button>
                      <div className="kv">
                        {thru ? (
                          <span>No effect</span>
                        ) : (
                          e?.params.slice(0, KEY_VALUES).map((pd, j) => {
                            const changed = dev && dev.params[j] !== b.params[j]
                            return (
                              <span key={j} className={changed ? 'chg' : ''}>
                                {pd.name}
                                <b>{paramScale(pd, state.firmware).label(b.params[j])}</b>
                              </span>
                            )
                          })
                        )}
                      </div>
                      <div className="blk-tools">
                        {!thru && (
                          <button aria-label="Copy block" title={`Copy this effect with its settings (${MOD}C)`} onClick={(ev) => { ev.stopPropagation(); copyAt(i) }}>
                            Copy
                          </button>
                        )}
                        <button aria-label="Move left" title="Move left" disabled={i === 0} onClick={(ev) => { ev.stopPropagation(); edit((p) => moveBlock(p, i, i - 1), i - 1) }}>
                          ◀
                        </button>
                        <button aria-label="Move right" title="Move right" disabled={i === patch.blocks.length - 1} onClick={(ev) => { ev.stopPropagation(); edit((p) => moveBlock(p, i, i + 1), i + 1) }}>
                          ▶
                        </button>
                        <span className="sp" />
                        <button className="remove" aria-label="Remove block" title={`Remove this effect (${MOD}Z to undo)`} onClick={(ev) => { ev.stopPropagation(); edit((p) => removeBlock(p, i), Math.max(0, i - 1)) }}>
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div className="io">OUT</div>
            </section>

            <section className="panel" aria-label={`Parameters of ${def?.name ?? 'block'}`} style={{ '--c': categoryVar(def?.category) } as CSSProperties}>
              <header className="panel-head">
                <div className="slot-badge" aria-label={`Block ${sel + 1}`}>
                  {sel + 1}
                </div>
                <div className="ph-title">
                  <h2>
                    {def?.name ?? 'Unknown effect'}
                    {info.fullName && <span className="full"> {info.fullName}</span>}
                  </h2>
                  <div className="meta">
                    {def?.category ?? 'Empty block'} · DSP ~{(dspShare(block.effectId) * 100).toFixed(0)}% · {block.on ? 'On' : 'Bypassed'}
                    {info.reference && <> · based on {info.reference}</>}
                  </div>
                  {info.description && <p className="desc">{info.description}</p>}
                </div>
                <div className="ph-actions">
                  <span className="block-changes">{blockChanges > 0 && <><b>{plural(blockChanges, 'change')}</b> in this block</>}</span>
                  {block.effectId !== THRU_ID && (
                    <button onClick={() => edit((p) => toggleBlock(p, sel), sel)} title="Bypass or turn on this block (B)">
                      {block.on ? 'Bypass' : 'Turn on'}
                    </button>
                  )}
                  <button onClick={() => setPicker({ mode: 'change', index: sel })} disabled={busy}>
                    Change effect…
                  </button>
                </div>
              </header>
              {def && def.params.length > 0 ? (
                <div className="params">
                  {def.params.map((p, j) => (
                    <ParamKnob
                      key={`${state.current}-${sel}-${block.effectId}-${j}`}
                      def={p}
                      raw={block.params[j]}
                      device={devBlock?.params[j]}
                      firmware={state.firmware}
                      onChange={(v) => edit((pt) => setParam(pt, sel, j, v), undefined, `p${state.current}.${sel}.${j}`)}
                    />
                  ))}
                </div>
              ) : (
                <p className="empty-note">This block is empty (THRU). Use “Change effect…” to put an effect in it.</p>
              )}
            </section>

            {clip && clipBar && (
              <ClipboardBar
                clip={clip}
                target={sel}
                blocks={patch.blocks.map((b) => effectName(b.effectId))}
                onReplace={() => pasteOver(sel)}
                onInsert={(at) => pasteAt(at)}
                onHide={() => setClipBar(false)}
              />
            )}
          </div>

          <aside className="changes" aria-labelledby="changes-title" ref={changesRef} tabIndex={-1}>
            <h3 id="changes-title">
              Changes vs pedal <span className="count">{changes.length}</span>
            </h3>
            {changes.length === 0 ? (
              <p className="muted">{dirty ? 'Only hidden values differ. Save or revert.' : `None. ${num} matches what the pedal has saved.`}</p>
            ) : (
              <ul>
                {changes.map((c, i) => {
                  const l = changeLine(c, patch, state.firmware)
                  return (
                    <li key={`${c.kind}-${i}`}>
                      <div className="c-what">{l.what}</div>
                      <div className="c-vals">
                        <span className="from">{l.from}</span> → <b>{l.to}</b>
                      </div>
                      <button className="small" onClick={() => undoOne(c)} aria-label={`Undo ${l.what}`} title="Put back the pedal's value">
                        Undo
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            {changes.length > 0 && <p className="muted small">Undo puts one value back to what the pedal has. Revert drops them all.</p>}
          </aside>
        </main>
      </div>

      <footer className="foot">
        <span><kbd>↑</kbd><kbd>↓</kbd> patch</span>
        <span><kbd>1</kbd>–<kbd>4</kbd> block</span>
        <span><kbd>B</kbd> bypass</span>
        <span><kbd>{MOD}Z</kbd> undo · <kbd>⇧{MOD}Z</kbd> redo</span>
        <span><kbd>{MOD}S</kbd> save</span>
        <span><kbd>{MOD}C</kbd> / <kbd>{MOD}V</kbd> copy / paste block</span>
        <span className="hint">Knobs: drag or wheel, Shift = fine, double-click = default</span>
        <span className="sp" />
        <span>{pedal ? `MS-60B · firmware ${state.firmware.toFixed(2)} · USB` : `Demo · fake data · firmware ${state.firmware.toFixed(2)}`}</span>
      </footer>

      {picker && (
        <TypePicker
          title={picker.mode === 'add' ? `Add effect to block ${patch.blocks.length + 1}` : `Change effect in block ${picker.index + 1}`}
          firmware={state.firmware}
          current={picker.mode === 'change' ? patch.blocks[picker.index].effectId : undefined}
          dspUsedByOthers={usedByOthers(picker.mode === 'change' ? picker.index : undefined)}
          onClose={() => setPicker(null)}
          onPick={(id) => {
            if (picker.mode === 'add') edit((p) => addBlock(p, id), patch.blocks.length)
            else edit((p) => changeType(p, picker.index, id), picker.index)
            setPicker(null)
          }}
        />
      )}

      {confirmRevert && (
        <ConfirmDialog
          title={`Revert ${plural(changeCount, 'change')} to ${num}?`}
          confirm={`Revert ${plural(changeCount, 'change')}`}
          onConfirm={() => void doRevert()}
          onCancel={() => setConfirmRevert(false)}
        >
          <p>
            {num} goes back to the version saved on the pedal. {MOD}Z brings your changes back.
          </p>
        </ConfirmDialog>
      )}

      {restore && (
        <BankRestoreDialog
          fileName={restore.fileName}
          items={restore.items}
          warning={
            restore.backup.identity && restore.backup.identity.version !== state.firmware.toFixed(2)
              ? `The backup is from firmware ${restore.backup.identity.version}; the pedal has ${state.firmware.toFixed(2)}.`
              : undefined
          }
          blocked={dirtyCount > 0 ? 'Some patches have unsaved changes: save or revert them before restoring.' : undefined}
          onRun={(slots, onProgress, cancelled) => sync.restoreBank(restore.backup.patches, slots, onProgress, cancelled)}
          onDownloadCurrent={() =>
            download(
              `ms60b-backup-${stamp()}.json`,
              toBackupJson(
                { identity: { manufacturer: 0x52, deviceId: 0x5f, version: state.firmware.toFixed(2), firmware: state.firmware }, patches: state.slots.map((s) => s.raw ?? []) },
                'MS-60B bank backup before a restore (MS-60B Edit).',
              ),
            )
          }
          onClose={() => setRestore(null)}
        />
      )}

      {sync.pending && (
        <PendingRestoreDialog
          slot={sync.pending.slot}
          at={sync.pending.at}
          now={state.slots[sync.pending.slot].device}
          original={patchFromDevice(sync.pending.raw)}
          onRestore={() => void sync.restorePending()}
          onKeep={sync.dismissPending}
        />
      )}

      {sync.conflict && (
        <ConflictDialog
          index={sync.conflict.index}
          pedal={sync.conflict.patch}
          mine={state.slots[sync.conflict.index].working}
          firmware={state.firmware}
          onPedal={() => sync.resolveConflict('pedal')}
          onMine={() => sync.resolveConflict('mine')}
        />
      )}

      {state.pendingSwitch !== null && (
        <SwitchDialog
          fromNum={state.current + 1}
          from={patch.name}
          toNum={state.pendingSwitch + 1}
          to={state.slots[state.pendingSwitch].working.name}
          count={changeCount}
          canSave={check.ok}
          reason={check.reason}
          onChoice={(choice) => {
            if (choice === 'save' && pedal) {
              // Write first; once saved the patch is clean and switching discards nothing.
              const at = state.current
              void sync.save().then((ok) => {
                if (ok) flash(`Saved to ${pad2(at + 1)} ✓`)
                dispatch({ type: 'resolveSwitch', choice: ok ? 'discard' : 'cancel' })
              })
            } else {
              if (choice === 'save' && check.ok) flash(`Saved to ${num} ✓`)
              dispatch({ type: 'resolveSwitch', choice })
            }
          }}
        />
      )}
    </div>
  )
}
