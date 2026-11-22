import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { diffPatch, effectName } from '../model/changes'
import { getEffect, THRU_ID } from '../model/catalog'
import { isNameChar, MAX_BLOCKS, NAME_MAX, NAME_SYMBOLS, type Block, type Patch } from '../model/patch'
import { categoryVar } from './categoryColor'
import { chainText, changeLine, pad2, type DiffLine } from './changeText'


/** Opens a native modal <dialog> on mount (Escape = onCancel). */
export function Modal(props: { className?: string; labelledBy: string; onCancel: () => void; children: ReactNode; lockEscape?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal?.()
    d?.querySelector<HTMLElement>('[data-autofocus]')?.focus() // showModal focuses the first button otherwise
  }, [])
  return (
    <dialog
      ref={ref}
      className={`confirm ${props.className ?? ''}`}
      aria-labelledby={props.labelledBy}
      onCancel={(e) => {
        e.preventDefault()
        if (!props.lockEscape) props.onCancel()
      }}
    >
      {props.children}
    </dialog>
  )
}

/** A patch's chain as small colored squares; bypassed blocks are hollow. */
export function ChainSquares({ patch, label }: { patch: Patch; label?: boolean }) {
  const text = chainText(patch)
  return (
    <span className="squares" aria-label={label ? `Chain: ${text}` : undefined} title={text}>
      {patch.blocks.map((b, i) => (
        <i
          key={i}
          className={`${b.on ? '' : 'off'} ${b.effectId === THRU_ID ? 'thru' : ''}`}
          style={{ '--c': categoryVar(getEffect(b.effectId)?.category) } as CSSProperties}
        />
      ))}
    </span>
  )
}

/** A chain written out, for dialogs that compare two versions. */
export function ChainText({ patch }: { patch: Patch }) {
  return (
    <ol className="chain-text">
      {patch.blocks.map((b, i) => (
        <li key={i} className={b.on ? '' : 'off'} style={{ '--c': categoryVar(getEffect(b.effectId)?.category) } as CSSProperties}>
          <i aria-hidden="true" />
          {effectName(b.effectId)}
          {!b.on && <span className="muted"> · bypass</span>}
        </li>
      ))}
    </ol>
  )
}

/** Patch name: click to rename. Shows "n/10" and which characters the pedal accepts. */
export function PatchName({ name, onRename }: { name: string; onRename: (n: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [rejected, setRejected] = useState<string | null>(null)
  if (!editing) {
    return (
      <button
        className="pname pname-btn"
        title="Rename (up to 10 characters)"
        onClick={() => {
          setDraft(name)
          setRejected(null)
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
  const len = [...draft].length
  return (
    <span className="pname-edit">
      <input
        className="pname pname-input"
        aria-label="Patch name"
        aria-describedby="pname-hint"
        autoFocus
        onFocus={(e) => e.target.select()}
        value={draft}
        maxLength={NAME_MAX}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          else if (e.key === 'Escape') setEditing(false)
          else {
            // Full field: say so instead of dropping the key silently (found in a real test).
            const t = e.currentTarget
            const selected = (t.selectionEnd ?? 0) - (t.selectionStart ?? 0)
            if (e.key.length === 1 && !e.metaKey && !e.ctrlKey && selected === 0 && [...t.value].length >= NAME_MAX) {
              setRejected(`The pedal allows ${NAME_MAX} characters: “${e.key}” was not added`)
            }
          }
        }}
        onPaste={(e) => {
          const t = e.currentTarget
          const pasted = [...e.clipboardData.getData('text')]
          const keep = [...t.value].length - ((t.selectionEnd ?? 0) - (t.selectionStart ?? 0))
          if (keep + pasted.length > NAME_MAX) setRejected(`The pedal allows ${NAME_MAX} characters: the rest of the pasted text was cut`)
        }}
        onChange={(e) => {
          const chars = [...e.target.value]
          const bad = chars.filter((c) => !isNameChar(c))
          const ok = chars.filter(isNameChar)
          setRejected((prev) =>
            bad.length ? `“${bad.join('')}” is not available on the pedal` : ok.length > NAME_MAX ? `The pedal allows ${NAME_MAX} characters` : ok.length >= NAME_MAX ? prev : null,
          )
          setDraft(ok.slice(0, NAME_MAX).join(''))
        }}
        onBlur={commit}
      />
      <span className="pname-hint" id="pname-hint" role="status">
        <b className={len >= NAME_MAX ? 'full' : ''}>
          {len}/{NAME_MAX}
        </b>{' '}
        {rejected ? <span className="warn-text">{rejected}</span> : <>Letters, digits, space and {NAME_SYMBOLS.trim().split('').join(' ')}</>}
      </span>
    </span>
  )
}

/** Paste target bar. Floats over the bottom of the editor, so nothing moves when it appears. */
export function ClipboardBar(props: {
  clip: { block: Block; from: string }
  target: number
  blocks: string[]
  onReplace: () => void
  onInsert: (at: number) => void
  onHide: () => void
}) {
  const { clip, target, blocks } = props
  const name = effectName(clip.block.effectId)
  const n = target + 1
  const loneThru = blocks.length === 1 && blocks[0] === 'THRU'
  const full = blocks.length >= MAX_BLOCKS
  const drops = full && !loneThru ? ` (removes ${blocks[MAX_BLOCKS - 1]})` : ''
  return (
    <div className="clipboard" role="region" aria-label="Clipboard">
      <span>
        Copied <strong>{name}</strong>
        {clip.block.on ? '' : ' (bypass)'} <span className="muted">from {clip.from}</span>
      </span>
      <span className="clip-actions">
        <button onClick={props.onReplace} title="⌘V / Ctrl+V">
          Replace block {n}
        </button>
        {!loneThru && (
          <>
            <button onClick={() => props.onInsert(target)}>
              Insert before {n}
              {drops}
            </button>
            {!(full && target === MAX_BLOCKS - 1) && (
              <button onClick={() => props.onInsert(target + 1)} title="⇧⌘V / Shift+Ctrl+V">
                Insert after {n}
                {drops}
              </button>
            )}
          </>
        )}
        <button className="icon-btn" onClick={props.onHide} aria-label="Close the clipboard bar" title="Close (the copied block stays: ⌘V still pastes it)">
          ✕
        </button>
      </span>
    </div>
  )
}

export function SwitchDialog(props: {
  fromNum: number
  from: string
  toNum: number
  to: string
  count: number
  canSave: boolean
  reason?: string
  onChoice: (c: 'save' | 'discard' | 'cancel') => void
}) {
  return (
    <Modal labelledBy="switch-title" onCancel={() => props.onChoice('cancel')}>
      <h2 id="switch-title">
        {pad2(props.fromNum)} “{props.from}” has {props.count} unsaved change{props.count === 1 ? '' : 's'}
      </h2>
      <p>
        Save them before opening {pad2(props.toNum)} “{props.to}”, or revert them?
      </p>
      {!props.canSave && <p className="bad">Can't save: {props.reason}</p>}
      <div className="row">
        <button className="primary" onClick={() => props.onChoice('save')} disabled={!props.canSave}>
          Save and open {pad2(props.toNum)}
        </button>
        <button onClick={() => props.onChoice('discard')}>Revert and open {pad2(props.toNum)}</button>
        <button className="ghost" data-autofocus onClick={() => props.onChoice('cancel')}>
          Keep editing
        </button>
      </div>
    </Modal>
  )
}

export function ConfirmDialog(props: { title: string; children: ReactNode; confirm: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Modal labelledBy="confirm-title" onCancel={props.onCancel}>
      <h2 id="confirm-title">{props.title}</h2>
      {props.children}
      <div className="row">
        <button className="danger" onClick={props.onConfirm}>
          {props.confirm}
        </button>
        <button className="ghost" data-autofocus onClick={props.onCancel}>
          Cancel
        </button>
      </div>
    </Modal>
  )
}

/** On connect: a patch may still hold live edits from a session that ended abruptly. Shows both versions before choosing. */
export function PendingRestoreDialog(props: { slot: number; now: Patch; original: Patch; at: string; onRestore: () => void; onKeep: () => void }) {
  const when = new Date(props.at)
  return (
    <Modal className="versions-dialog" labelledBy="pending-title" onCancel={props.onKeep}>
      <h2 id="pending-title">Patch {pad2(props.slot + 1)} may still hold unsaved live edits</h2>
      <p>
        {Number.isNaN(when.getTime()) ? 'Last time' : `On ${when.toLocaleString()}`}, the editor closed while Live was sending edits to this
        patch, before they were saved or put back. The pedal may still have them. Compare and choose which version stays on the pedal.
      </p>
      <div className="versions">
        <section>
          <h3>On the pedal now</h3>
          <div className="v-name">{props.now.name}</div>
          <ChainText patch={props.now} />
        </section>
        <section>
          <h3>Original (before those edits)</h3>
          <div className="v-name">{props.original.name}</div>
          <ChainText patch={props.original} />
        </section>
      </div>
      <div className="row">
        <button className="primary" onClick={props.onRestore}>
          Restore the original
        </button>
        <button onClick={props.onKeep}>Keep what the pedal has</button>
      </div>
      <p className="muted small">Restore writes the original back to patch {pad2(props.slot + 1)}. Keep writes nothing.</p>
    </Modal>
  )
}

/** Live off: the patch was changed on the pedal while the editor has unsaved changes to it. */
export function ConflictDialog(props: {
  index: number
  pedal: Patch
  mine: Patch
  firmware: number
  onPedal: () => void
  onMine: () => void
}) {
  const diffs = diffLines(props.pedal, props.mine, props.firmware)
  return (
    <Modal className="versions-dialog" labelledBy="conflict-title" onCancel={() => {}} lockEscape>
      <h2 id="conflict-title">Patch {pad2(props.index + 1)} was changed on the pedal</h2>
      <p>You also have unsaved changes to it here. Which version do you keep?</p>
      <ul className="conflict-list">
        {diffs.map((d, i) => (
          <li key={i}>
            <span className="c-what">{d.what}</span>
            <span>
              pedal <b>{d.from}</b>
            </span>
            <span>
              yours <b>{d.to}</b>
            </span>
          </li>
        ))}
      </ul>
      <div className="row">
        <button onClick={props.onPedal}>Use the pedal's version</button>
        <button className="primary" onClick={props.onMine}>
          Keep mine
        </button>
      </div>
      <p className="muted small">Keep mine writes nothing now; your version goes to the pedal when you Save.</p>
    </Modal>
  )
}

function diffLines(pedal: Patch, mine: Patch, firmware: number): DiffLine[] {
  return diffPatch(pedal, mine).map((c) => changeLine(c, mine, firmware))
}
