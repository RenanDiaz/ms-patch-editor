import { useState } from 'react'
import type { Patch } from '../model/patch'
import { ChainSquares, Modal } from './editorParts'
import { chainText, pad2 } from './changeText'

export interface TransferResult {
  slot: number
  ok: boolean
  message?: string
}

interface Props {
  mode: 'copy' | 'swap'
  from: number
  patches: readonly Patch[]
  /** Why it cannot run now (unsaved changes…). */
  blocked?: string
  /** Writes to the pedal (true) or only to this page (demo). */
  writesPedal: boolean
  onRun: (to: number) => Promise<TransferResult[]>
  onClose: () => void
}

/**
 * Copy the open patch to another slot, or swap the two (found missing in a real
 * test: building patch B from A meant rebuilding blocks by hand). Shows what
 * gets replaced before writing; each written slot is read back.
 */
export function PatchTransferDialog({ mode, from, patches, blocked, writesPedal, onRun, onClose }: Props) {
  const [to, setTo] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<TransferResult[] | null>(null)
  const src = patches[from]
  const verb = mode === 'copy' ? 'Copy' : 'Swap'
  const title = mode === 'copy' ? `Copy ${pad2(from + 1)} “${src.name}” to…` : `Swap ${pad2(from + 1)} “${src.name}” with…`

  const run = async () => {
    if (to === null) return
    setRunning(true)
    setResults(await onRun(to))
    setRunning(false)
  }

  const failed = results?.filter((r) => !r.ok) ?? []
  return (
    <Modal className="bank-dialog transfer-dialog" labelledBy="transfer-title" onCancel={() => !running && onClose()} lockEscape={running}>
      <h2 id="transfer-title">{title}</h2>
      {results ? (
        <>
          <p role="status">
            {failed.length === 0
              ? mode === 'copy'
                ? `Copied to ${pad2(to! + 1)}${writesPedal ? ' and checked on the pedal' : ''}.`
                : `Swapped ${pad2(from + 1)} and ${pad2(to! + 1)}${writesPedal ? ', both checked on the pedal' : ''}.`
              : 'Something went wrong:'}
          </p>
          {failed.length > 0 && (
            <ul className="bad">
              {failed.map((f) => (
                <li key={f.slot}>
                  {pad2(f.slot + 1)}: {f.message}
                </li>
              ))}
            </ul>
          )}
          <div className="row">
            <button className="primary" onClick={onClose} data-autofocus>
              Close
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="muted">
            {mode === 'copy'
              ? 'The chosen patch is replaced by this one (same effects, settings and name). This patch stays as it is.'
              : 'The two patches trade places. Nothing else changes.'}{' '}
            {writesPedal ? 'Each written patch is saved on the pedal and read back to check it.' : 'Demo: only this page changes.'}
          </p>
          <ul className="restore-list transfer-list" role="radiogroup" aria-label="Destination patch">
            {patches.map((p, i) =>
              i === from ? null : (
                <li key={i}>
                  <label>
                    <input type="radio" name="transfer-to" checked={to === i} onChange={() => setTo(i)} disabled={running} />{' '}
                    <span className="num">{pad2(i + 1)}</span> {p.name} <ChainSquares patch={p} />
                  </label>
                </li>
              ),
            )}
          </ul>
          {to !== null && (
            <p className="transfer-preview">
              {mode === 'copy' ? (
                <>
                  <strong>{pad2(to + 1)} “{patches[to].name}”</strong> ({chainText(patches[to])}) will be replaced by{' '}
                  <strong>“{src.name}”</strong> ({chainText(src)}).
                </>
              ) : (
                <>
                  {pad2(from + 1)} gets “{patches[to].name}” and {pad2(to + 1)} gets “{src.name}”.
                </>
              )}
            </p>
          )}
          {blocked && <p className="bad">{blocked}</p>}
          {running && <p role="status">Writing…</p>}
          <div className="row">
            <button className="primary" onClick={run} disabled={to === null || running || !!blocked} data-autofocus>
              {to === null ? `${verb}…` : mode === 'copy' ? `Copy to ${pad2(to + 1)}` : `Swap with ${pad2(to + 1)}`}
            </button>
            <button className="ghost" onClick={onClose} disabled={running}>
              Cancel
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
