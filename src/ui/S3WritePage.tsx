import { useEffect, useMemo, useRef, useState } from 'react'
import { decodePatch60B, encodePatch60B } from '../protocol/patch60b'
import {
  autoSaveApproval,
  autoSaveProbe,
  diffOffsets,
  selectProgram,
  writeApproval,
  writeSlot,
  type S3Context,
} from '../protocol/s3'
import { scanBank, type BankCapture, type LogEntry } from '../protocol/scanBank'
import type { MidiTransport } from '../transport/MidiTransport'
import type { WriteApproval } from '../transport/approvedWrites'
import { toHex } from '../transport/readOnlyGuard'
import { connectWebMidi } from '../transport/webMidi'
import './S1ReadPage.css'

type Op = 'test' | 'restore' | 'autosave'
interface Pending {
  op: Op
  approval: WriteApproval
  bytes: number[]
}
interface Result {
  op: Op
  ok: boolean
  text: string
}

const TEST_NAME = 'S3 TEST'

/**
 * S3 spike page: controlled write to ONE slot chosen by the user, with a
 * full read-only backup first. Every write shows its exact bytes and needs a
 * confirmation; the transport only lets those bytes through, once.
 */
export function S3WritePage() {
  const [ports, setPorts] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [backup, setBackup] = useState<BankCapture | null>(null)
  const [downloaded, setDownloaded] = useState(false)
  const [slot, setSlot] = useState(49)
  const [pending, setPending] = useState<Pending | null>(null)
  const [results, setResults] = useState<Result[]>([])
  /** Optional restore source: a capture/backup file (ms60b-capture/1), e.g. the S1 capture. */
  const [restoreFrom, setRestoreFrom] = useState<{ label: string; patches: number[][] } | null>(null)
  const transportRef = useRef<MidiTransport | null>(null)
  const logRef = useRef<LogEntry[]>([])
  const t0 = useRef(0)
  const [logView, setLogView] = useState<LogEntry[]>([])

  const ctx = (): S3Context => ({ transport: transportRef.current!, log: logRef.current, t0: t0.current })
  const original = backup?.originalProgram ?? null
  const base = backup?.patches[slot]
  const restoreBytes = restoreFrom?.patches[slot] ?? base
  const changedVsFile = backup && restoreFrom ? backup.patches.map((p, i) => (diffOffsets(p, restoreFrom.patches[i]).length ? i : -1)).filter((i) => i >= 0) : []

  const testBytes = useMemo(() => {
    if (!base) return null
    const d = decodePatch60B(base)
    const effects = d.effects.slice(0, Math.max(1, d.maxFx)).map((e, i) => (i === 0 ? { ...e, on: !e.on } : e))
    return Array.from(encodePatch60B(base, { name: TEST_NAME, effects }))
  }, [base])

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
      setLogView(logRef.current.slice())
    }
  }

  const connect = () =>
    run('Conectando…', async () => {
      transportRef.current?.close()
      t0.current = performance.now()
      const c = await connectWebMidi()
      transportRef.current = c.transport
      setPorts(`${c.inputName} / ${c.outputName}`)
    })

  const doBackup = () =>
    run('Respaldando 50 patches…', async () => {
      const cap = await scanBank(transportRef.current!)
      cap.log.forEach((l) => logRef.current.push(l))
      setBackup(cap)
      setDownloaded(false)
      // Prefer the slot named "Empty", else the first THRU-only patch.
      const named = cap.patches.findIndex((p) => /^(empty|s3 test)$/i.test(decodePatch60B(p).name))
      const empty = named >= 0 ? named : cap.patches.findIndex((p) => decodePatch60B(p).effects[0].id === 0)
      if (empty >= 0) setSlot(empty)
      if (cap.identity.version !== '2.10') setError(`Firmware ${cap.identity.version}: las pruebas se prepararon con 2.10.`)
    })

  function download(name: string, body: unknown) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' }))
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const stamp = () => new Date().toISOString().replace(/[:.]/g, '-')
  const logJson = () => logRef.current.map((l) => ({ t: Math.round(l.t), dir: l.dir, hex: toHex(l.bytes) }))

  async function loadRestoreFile(file: File) {
    try {
      const j = JSON.parse(await file.text()) as { format?: string; patches?: string[] }
      if (j.format !== 'ms60b-capture/1' || !Array.isArray(j.patches) || j.patches.length !== 50) throw new Error('no es una captura ms60b-capture/1 de 50 patches')
      const patches = j.patches.map((h) => h.split(' ').map((x) => parseInt(x, 16)))
      patches.forEach((p, i) => {
        try {
          decodePatch60B(p)
        } catch {
          throw new Error(`patch ${i + 1} inválido`)
        }
      })
      setRestoreFrom({ label: file.name, patches })
    } catch (e) {
      setError(`Archivo de respaldo: ${(e as Error).message}`)
    }
  }

  function downloadBackup() {
    if (!backup) return
    download(`ms60b-backup-${stamp()}.json`, {
      format: 'ms60b-capture/1',
      note: 'Read-only backup taken before an S3 write test.',
      capturedAt: new Date().toISOString(),
      identity: backup.identity,
      originalProgram: backup.originalProgram,
      patches: backup.patches.map((p) => toHex(p)),
      log: backup.log.map((l) => ({ t: Math.round(l.t), dir: l.dir, hex: toHex(l.bytes) })),
    })
    setDownloaded(true)
  }

  const ask = (op: Op) => {
    if (!backup || !testBytes || !base || !restoreBytes) return
    const n = slot + 1
    if (op === 'test') setPending({ op, bytes: testBytes, approval: writeApproval(slot, testBytes, `Escribir patch de prueba "${TEST_NAME}" en la ranura ${n}`) })
    if (op === 'restore')
      setPending({
        op,
        bytes: restoreBytes,
        approval: writeApproval(slot, restoreBytes, `Restaurar la ranura ${n} a “${decodePatch60B(restoreBytes).name}” desde ${restoreFrom ? restoreFrom.label : 'el respaldo de esta sesión'}`),
      })
    if (op === 'autosave') setPending({ op, bytes: testBytes, approval: autoSaveApproval(testBytes, slot) })
  }

  const confirm = () => {
    const p = pending
    setPending(null)
    if (!p || original === null) return
    void run(p.approval.label + '…', async () => {
      try {
        if (p.op === 'autosave') {
          const r = await autoSaveProbe(ctx(), slot, p.bytes, p.approval)
          const same = diffOffsets(r.stored, base!).length === 0
          setResults((rs) => [
            ...rs,
            {
              op: p.op,
              ok: true,
              text: r.persisted
                ? 'AUTO SAVE guardó el 0x28 sin Store: la ranura quedó con el patch de prueba. Restaura la ranura.'
                : same
                  ? 'No persistió: la ranura sigue igual al respaldo. El 0x28 solo cambia el buffer.'
                  : `La ranura no coincide ni con el respaldo ni con la prueba (bytes ${diffOffsets(r.stored, base!).join(', ')}). Restaura la ranura.`,
            },
          ])
        } else {
          const r = await writeSlot(ctx(), slot, p.bytes, p.approval)
          setResults((rs) => [
            ...rs,
            {
              op: p.op,
              ok: r.diff.length === 0,
              text:
                (r.diff.length === 0 ? 'Lectura idéntica a lo escrito.' : `La lectura difiere en los bytes ${r.diff.join(', ')}.`) +
                (r.ack ? ` Ack: ${toHex(r.ack)}` : ' Sin ack del pedal.'),
            },
          ])
        }
      } finally {
        await selectProgram(ctx(), original)
      }
    })
  }

  const canWrite = !!ports && !!backup && downloaded && !busy
  const diff = base && testBytes ? diffOffsets(base, testBytes) : []

  return (
    <main className="s1">
      <header>
        <h1>MS-60B · S3 escritura controlada</h1>
        <p className="muted">
          Escribe solo en la ranura que elijas. Antes respalda los 50 patches (solo lectura) y descarga el respaldo. Cada
          escritura muestra los bytes exactos y pide confirmación; el transporte solo deja pasar esos bytes, una vez. Al
          terminar vuelve al patch que estaba activo.
        </p>
      </header>

      <section className="bar">
        <button onClick={connect} disabled={!!busy}>1. Conectar</button>
        <button onClick={doBackup} disabled={!ports || !!busy}>2. Respaldar 50 patches</button>
        <button onClick={downloadBackup} disabled={!backup}>3. Descargar respaldo</button>
        <span className="status" role="status">
          {busy ?? (ports ? `Conectado: ${ports}` : 'Sin conectar')}
          {error && <span className="bad"> · {error}</span>}
        </span>
      </section>

      {backup && (
        <section className="s3-step">
          <p className="muted">
            Firmware {backup.identity.version} · patch activo: {backup.originalProgram + 1}
            {!downloaded && <strong className="bad"> · descarga el respaldo para habilitar las escrituras</strong>}
          </p>
          <label>
            Ranura de prueba:{' '}
            <select value={slot} onChange={(e) => setSlot(Number(e.target.value))} disabled={!!busy}>
              {backup.patches.map((p, i) => (
                <option key={i} value={i}>
                  {String(i + 1).padStart(2, '0')} · {decodePatch60B(p).name}
                </option>
              ))}
            </select>
          </label>
          <p>
            Prueba: renombrar “{base && decodePatch60B(base).name}” a “{TEST_NAME}” y alternar ON/OFF del efecto 1. Bytes
            que cambian: {diff.join(', ')}.
          </p>
          <p>
            <label className="file">
              Restaurar desde archivo (opcional)
              <input type="file" accept=".json" onChange={(e) => e.target.files?.[0] && loadRestoreFile(e.target.files[0])} />
            </label>{' '}
            Restaurar escribe “{restoreBytes && decodePatch60B(restoreBytes).name}” desde{' '}
            {restoreFrom ? restoreFrom.label : 'el respaldo de esta sesión'}.
            {restoreFrom && (
              <> Ranuras del pedal distintas al archivo: {changedVsFile.length ? changedVsFile.map((i) => i + 1).join(', ') : 'ninguna'}.</>
            )}
          </p>
          <div className="bar">
            <button onClick={() => ask('test')} disabled={!canWrite}>4. Escribir prueba (0x28 + 0x32)…</button>
            <button onClick={() => ask('restore')} disabled={!canWrite}>5. Restaurar ranura desde respaldo…</button>
            <button onClick={() => ask('autosave')} disabled={!canWrite}>Opcional: prueba AUTO SAVE (solo 0x28)…</button>
            <button onClick={() => download(`ms60b-s3-log-${stamp()}.json`, { format: 'ms60b-s3-log/1', slot, results, log: logJson() })}>
              Descargar log
            </button>
          </div>
          {results.length > 0 && (
            <ol className="s3-results">
              {results.map((r, i) => (
                <li key={i} className={r.ok ? 'ok' : 'bad'}>
                  <strong>{r.op}</strong>: {r.text}
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      {pending && <ConfirmWrite pending={pending} onYes={confirm} onNo={() => setPending(null)} />}

      <details>
        <summary>Log ({logView.length} mensajes)</summary>
        <pre>{logView.slice(-60).map((l) => `${Math.round(l.t)} ${l.dir} ${toHex(l.bytes)}`).join('\n')}</pre>
      </details>
    </main>
  )
}

function ConfirmWrite({ pending, onYes, onNo }: { pending: Pending; onYes: () => void; onNo: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (d && !d.open) d.showModal?.()
  }, [])
  return (
    <dialog ref={ref} className="s3-confirm" onCancel={onNo} aria-labelledby="s3-confirm-title">
      <h2 id="s3-confirm-title">{pending.approval.label}</h2>
      <p>Se enviarán exactamente estos mensajes de escritura (además de Program Change y lecturas):</p>
      <pre>{pending.approval.writes.map((w) => toHex(w)).join('\n\n')}</pre>
      <div className="bar">
        <button onClick={onYes}>Sí, escribir</button>
        <button onClick={onNo}>Cancelar</button>
      </div>
    </dialog>
  )
}
