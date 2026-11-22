import { useEffect, useRef, useState } from 'react'
import type { RestoreItem } from '../protocol/backupFile'

export interface RestoreResult {
  slot: number
  ok: boolean
  message?: string
}

interface Props {
  fileName: string
  items: RestoreItem[]
  /** Shown when the backup comes from another firmware version. */
  warning?: string
  /** Why writing is not possible now (e.g. unsaved changes). */
  blocked?: string
  onRun: (slots: number[], onProgress: (done: number, slot: number) => void, cancelled: () => boolean) => Promise<RestoreResult[]>
  onDownloadCurrent: () => void
  onClose: () => void
}

const num = (slot: number) => String(slot + 1).padStart(2, '0')

/**
 * Restore a bank backup: lists the slots that differ, lets the user choose
 * which to write, writes them one by one (each read back) and reports.
 */
export function BankRestoreDialog({ fileName, items, warning, blocked, onRun, onDownloadCurrent, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [chosen, setChosen] = useState<Set<number>>(() => new Set(items.map((i) => i.slot)))
  const [progress, setProgress] = useState<{ done: number; slot: number } | null>(null)
  const [results, setResults] = useState<RestoreResult[] | null>(null)
  const cancel = useRef(false)

  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal?.()
  }, [])

  const running = progress !== null && results === null
  const toggle = (slot: number) =>
    setChosen((c) => {
      const n = new Set(c)
      if (n.has(slot)) n.delete(slot)
      else n.add(slot)
      return n
    })

  const run = async () => {
    cancel.current = false
    const slots = items.map((i) => i.slot).filter((s) => chosen.has(s))
    setProgress({ done: 0, slot: slots[0] })
    const r = await onRun(slots, (done, slot) => setProgress({ done, slot }), () => cancel.current)
    setResults(r)
  }

  const failed = results?.filter((r) => !r.ok) ?? []
  return (
    <dialog ref={ref} className="confirm bank-dialog" onCancel={(e) => (running ? e.preventDefault() : onClose())} aria-labelledby="restore-title">
      <h2 id="restore-title">Restaurar banco desde “{fileName}”</h2>
      {warning && <p className="bad">{warning}</p>}

      {results ? (
        <>
          <p>
            {results.length - failed.length} de {results.length} ranuras restauradas y verificadas
            {results.length < chosen.size && ` (cancelado: faltaron ${chosen.size - results.length})`}.
          </p>
          {failed.length > 0 && (
            <ul className="bad">
              {failed.map((f) => (
                <li key={f.slot}>
                  {num(f.slot)}: {f.message}
                </li>
              ))}
            </ul>
          )}
          <div className="row">
            <button className="primary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </>
      ) : items.length === 0 ? (
        <>
          <p>El pedal ya tiene exactamente lo que guarda el respaldo. No hay nada que escribir.</p>
          <div className="row">
            <button className="primary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </>
      ) : (
        <>
          <p>
            Estas ranuras son distintas en el pedal y en el respaldo. Las marcadas se reemplazan con la versión del respaldo; cada
            una se guarda y se vuelve a leer para comprobarla.
          </p>
          <p className="muted">
            Antes, si quieres, <button className="linklike" onClick={onDownloadCurrent}>descarga un respaldo del estado actual</button>.
          </p>
          <ul className="restore-list">
            {items.map((i) => (
              <li key={i.slot}>
                <label>
                  <input type="checkbox" checked={chosen.has(i.slot)} onChange={() => toggle(i.slot)} disabled={running} />{' '}
                  <span className="num">{num(i.slot)}</span> {i.now} → <strong>{i.backup}</strong>
                </label>
              </li>
            ))}
          </ul>
          {blocked && <p className="bad">{blocked}</p>}
          {running && (
            <p role="status">
              Escribiendo {num(progress.slot)} ({progress.done + 1} de {chosen.size})…
            </p>
          )}
          <div className="row">
            <button className="primary" onClick={run} disabled={running || chosen.size === 0 || !!blocked}>
              Escribir {chosen.size} ranura{chosen.size === 1 ? '' : 's'}
            </button>
            {running ? (
              <button onClick={() => (cancel.current = true)}>Detener después de esta</button>
            ) : (
              <button className="ghost" onClick={onClose}>
                Cancelar
              </button>
            )}
          </div>
        </>
      )}
    </dialog>
  )
}
