import { useEffect, useMemo, useRef, useState } from 'react'
import { getEffect } from '../model/catalog'
import { decodePatch60B, encodePatch60B } from '../protocol/patch60b'
import {
  autoSaveApproval,
  autoSaveProbe,
  diffOffsets,
  paramEditApproval,
  paramEditProbe,
  selectProgram,
  sendAndStay,
  type ParamEdit,
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

type Op = 'test' | 'restore' | 'autosave' | 'prepare' | 'param' | 'stay'
interface Pending {
  op: Op
  approval: WriteApproval
  bytes: number[]
  edits?: ParamEdit[]
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

  // Experiment 0: a 4-effect patch to test 0x31 on every effect (copy of the first 4-effect patch, renamed).
  const fourFx = useMemo(() => {
    if (!backup) return null
    const i = backup.patches.findIndex((p) => decodePatch60B(p).maxFx === 4)
    if (i < 0) return null
    const d = decodePatch60B(backup.patches[i])
    const bytes = Array.from(encodePatch60B(backup.patches[i], { name: TEST_NAME, effects: d.effects }))
    return { from: i, name: d.name, bytes }
  }, [backup])

  // Experiment 1: knob 1 (param index 2) of each effect, one step away from its current value.
  const edits = useMemo((): ParamEdit[] => {
    if (!base) return []
    const d = decodePatch60B(base)
    return d.effects.slice(0, d.maxFx).flatMap((e, effect) => {
      const def = getEffect(e.id)?.params[0]
      if (!def || def.range.kind !== 'linear') return []
      const v = e.params[0]
      return [{ effect, param: 2, value: v < def.range.max ? v + 1 : v - 1 }]
    })
  }, [base])
  const [stay, setStay] = useState<{ bytes: number[]; backupBefore: BankCapture } | null>(null)

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
    run('Connecting…', async () => {
      transportRef.current?.close()
      t0.current = performance.now()
      const c = await connectWebMidi()
      transportRef.current = c.transport
      setPorts(`${c.inputName} / ${c.outputName}`)
    })

  const doBackup = () =>
    run('Backing up 50 patches…', async () => {
      const cap = await scanBank(transportRef.current!)
      cap.log.forEach((l) => logRef.current.push(l))
      setBackup(cap)
      setDownloaded(false)
      // Prefer the slot named "Empty", else the first THRU-only patch.
      const named = cap.patches.findIndex((p) => /^(empty|s3 test)$/i.test(decodePatch60B(p).name))
      const empty = named >= 0 ? named : cap.patches.findIndex((p) => decodePatch60B(p).effects[0].id === 0)
      if (empty >= 0) setSlot(empty)
      if (cap.identity.version !== '2.10') setError(`Firmware ${cap.identity.version}: these tests were prepared for 2.10. Check the results carefully.`)
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
      if (j.format !== 'ms60b-capture/1' || !Array.isArray(j.patches) || j.patches.length !== 50) throw new Error('not an ms60b-capture/1 capture with 50 patches')
      const patches = j.patches.map((h) => h.split(' ').map((x) => parseInt(x, 16)))
      patches.forEach((p, i) => {
        try {
          decodePatch60B(p)
        } catch {
          throw new Error(`patch ${i + 1} is invalid`)
        }
      })
      setRestoreFrom({ label: file.name, patches })
    } catch (e) {
      setError(`Backup file: ${(e as Error).message}. Choose another file.`)
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
    if (op === 'test') setPending({ op, bytes: testBytes, approval: writeApproval(slot, testBytes, `Write test patch "${TEST_NAME}" to patch ${n}`) })
    if (op === 'restore')
      setPending({
        op,
        bytes: restoreBytes,
        approval: writeApproval(slot, restoreBytes, `Restore patch ${n} to “${decodePatch60B(restoreBytes).name}” from ${restoreFrom ? restoreFrom.label : 'this session’s backup'}`),
      })
    if (op === 'autosave') setPending({ op, bytes: testBytes, approval: autoSaveApproval(testBytes, slot) })
    if (op === 'prepare' && fourFx)
      setPending({ op, bytes: fourFx.bytes, approval: writeApproval(slot, fourFx.bytes, `Prepare patch ${n}: copy of “${fourFx.name}” (4 effects) named “${TEST_NAME}”`) })
    if (op === 'param' && edits.length) setPending({ op, bytes: base, edits, approval: paramEditApproval(slot, edits) })
    if (op === 'stay')
      setPending({ op, bytes: testBytes, approval: { ...autoSaveApproval(testBytes, slot), label: `Send 0x28 to patch ${n} and stay on it (no Store, no patch switch)` } })
  }

  const describeFx = (bytes: number[]) => {
    const d = decodePatch60B(bytes)
    return d.effects.slice(0, d.maxFx).map((e, i) => `${i + 1}:${e.on ? '' : '(off)'}${e.params[0]}`).join(' ')
  }

  const confirm = () => {
    const p = pending
    setPending(null)
    if (!p || original === null) return
    void run(p.approval.label + '…', async () => {
      let leave = true
      try {
        if (p.op === 'param') {
          const r = await paramEditProbe(ctx(), slot, p.edits!, p.approval)
          const before = decodePatch60B(base!)
          const buf = decodePatch60B(r.buffer)
          const sto = decodePatch60B(r.stored)
          const per = p.edits!.map((e) => {
            const was = before.effects[e.effect].params[0]
            const inBuf = buf.effects[e.effect].params[0] === e.value
            const kept = sto.effects[e.effect].params[0] === e.value
            return `effect ${e.effect + 1}: ${was}→${e.value} ${inBuf ? 'applied' : 'NOT applied'} in the buffer, ${kept ? 'SAVED' : 'not saved'} after leaving and coming back`
          })
          setResults((rs) => [...rs, { op: p.op, ok: true, text: per.join('; ') + `. Buffer: ${describeFx(r.buffer)} · stored patch: ${describeFx(r.stored)}` }])
        } else if (p.op === 'stay') {
          await sendAndStay(ctx(), slot, p.bytes, p.approval)
          setStay({ bytes: p.bytes, backupBefore: backup! })
          leave = false
          setResults((rs) => [
            ...rs,
            { op: p.op, ok: true, text: 'Sent; the pedal is still on this patch. Restart the pedal without touching anything, then Connect and Back up: the patch is compared below.' },
          ])
        } else if (p.op === 'autosave') {
          const r = await autoSaveProbe(ctx(), slot, p.bytes, p.approval)
          const same = diffOffsets(r.stored, base!).length === 0
          setResults((rs) => [
            ...rs,
            {
              op: p.op,
              ok: true,
              text: r.persisted
                ? 'The pedal saved the 0x28 without Store: the patch now holds the test patch. Restore the patch.'
                : same
                  ? 'Not saved: the patch still matches the backup. 0x28 only changes the buffer.'
                  : `The patch matches neither the backup nor the test (bytes ${diffOffsets(r.stored, base!).join(', ')}). Restore the patch.`,
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
                (r.diff.length === 0 ? 'Read-back matches what was written.' : `Read-back differs at bytes ${r.diff.join(', ')}.`) +
                (r.ack ? ` Ack: ${toHex(r.ack)}` : ' No ack from the pedal.'),
            },
          ])
        }
      } finally {
        if (leave) await selectProgram(ctx(), original)
      }
    })
  }

  const canWrite = !!ports && !!backup && downloaded && !busy
  const diff = base && testBytes ? diffOffsets(base, testBytes) : []

  return (
    <main className="s1">
      <header>
        <h1>MS-60B · S3 controlled write</h1>
        <p className="muted">
          Writes only to the patch you choose. First back up all 50 patches (read only) and download the backup. Each
          write shows the exact bytes and asks you to confirm; the transport lets only those bytes through, once. When it
          finishes, it switches back to the patch that was active.
        </p>
      </header>

      <section className="bar">
        <button onClick={connect} disabled={!!busy}>1. Connect</button>
        <button onClick={doBackup} disabled={!ports || !!busy}>2. Back up 50 patches</button>
        <button onClick={downloadBackup} disabled={!backup}>3. Download backup</button>
        <span className="status" role="status">
          {busy ?? (ports ? `Connected: ${ports}` : 'Not connected')}
          {error && <span className="bad"> · {error}</span>}
        </span>
      </section>

      {backup && (
        <section className="s3-step">
          <p className="muted">
            Firmware {backup.identity.version} · active patch: {backup.originalProgram + 1}
            {!downloaded && <strong className="bad"> · download the backup to enable writes</strong>}
          </p>
          <label>
            Test patch:{' '}
            <select value={slot} onChange={(e) => setSlot(Number(e.target.value))} disabled={!!busy}>
              {backup.patches.map((p, i) => (
                <option key={i} value={i}>
                  {String(i + 1).padStart(2, '0')} · {decodePatch60B(p).name}
                </option>
              ))}
            </select>
          </label>
          <p>
            Test: rename “{base && decodePatch60B(base).name}” to “{TEST_NAME}” and toggle effect 1 ON/OFF. Bytes
            that change: {diff.join(', ')}.
          </p>
          <p>
            <label className="file">
              Restore from file (optional)
              <input type="file" accept=".json" onChange={(e) => e.target.files?.[0] && loadRestoreFile(e.target.files[0])} />
            </label>{' '}
            Restore writes “{restoreBytes && decodePatch60B(restoreBytes).name}” from{' '}
            {restoreFrom ? restoreFrom.label : 'this session’s backup'}.
            {restoreFrom && (
              <> Pedal patches that differ from the file: {changedVsFile.length ? changedVsFile.map((i) => i + 1).join(', ') : 'none'}.</>
            )}
          </p>
          <div className="bar">
            <button onClick={() => ask('test')} disabled={!canWrite}>4. Write test (0x28 + 0x32)…</button>
            <button onClick={() => ask('restore')} disabled={!canWrite}>5. Restore patch from backup…</button>
            <button onClick={() => ask('autosave')} disabled={!canWrite}>Optional: test 0x28 only, no Store…</button>
            <button onClick={() => download(`ms60b-s3-log-${stamp()}.json`, { format: 'ms60b-s3-log/1', slot, results, log: logJson() })}>
              Download log
            </button>
          </div>
          <h3>Live listening (tests approved on 2026-11-10)</h3>
          <div className="bar">
            <button onClick={() => ask('prepare')} disabled={!canWrite || !fourFx}>
              A. Prepare patch with 4 effects{fourFx ? ` (copy of ${fourFx.name})` : ''}…
            </button>
            <button onClick={() => ask('param')} disabled={!canWrite || edits.length === 0}>
              B. Test 0x31 on {edits.length} effect(s)…
            </button>
            <button onClick={() => ask('stay')} disabled={!canWrite}>C. Send 0x28 and stay…</button>
          </div>
          {base && <p className="muted">Patch now (effect:knob 1): {describeFx(base)}</p>}
          {stay && stay.backupBefore !== backup && base && (
            <p>
              Test C, after the new backup: the patch{' '}
              <strong>
                {diffOffsets(base, stay.bytes).length === 0
                  ? 'HAS what was sent (the 0x28 was saved without leaving the patch)'
                  : diffOffsets(base, stay.backupBefore.patches[slot]).length === 0
                    ? 'has what it had before (the 0x28 was not saved)'
                    : 'matches neither what was sent nor what it had before'}
              </strong>
              .
            </p>
          )}
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
        <summary>Log ({logView.length} messages)</summary>
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
      <p>These exact write messages will be sent (plus Program Change and reads):</p>
      <pre>{pending.approval.writes.map((w) => toHex(w)).join('\n\n')}</pre>
      <div className="bar">
        <button onClick={onYes}>Yes, write</button>
        <button onClick={onNo}>Cancel</button>
      </div>
    </dialog>
  )
}
