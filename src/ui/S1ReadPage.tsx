import { useMemo, useRef, useState } from 'react'
import { compareWithG200kg, readG200kgBankZip, type SlotComparison } from '../protocol/compareG200kgBank'
import { describeEffect } from '../protocol/describe'
import { decodePatch60B } from '../protocol/patch60b'
import { scanBank, type BankCapture } from '../protocol/scanBank'
import type { MidiTransport } from '../transport/MidiTransport'
import { toHex } from '../transport/readOnlyGuard'
import { connectWebMidi } from '../transport/webMidi'
import './S1ReadPage.css'

type Status =
  | { kind: 'idle' }
  | { kind: 'connecting' }
  | { kind: 'connected'; ports: string }
  | { kind: 'scanning'; ports: string; slot: number }
  | { kind: 'error'; message: string; ports?: string }

/**
 * S1 spike page: read-only scan of the 50 patches, raw capture download, and
 * comparison against a bank exported by g200kg's utility. No write controls.
 */
export function S1ReadPage() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [capture, setCapture] = useState<BankCapture | null>(null)
  const [selected, setSelected] = useState(0)
  const [comparison, setComparison] = useState<SlotComparison[] | null>(null)
  const transportRef = useRef<MidiTransport | null>(null)
  const ports = 'ports' in status ? status.ports : undefined

  async function connect() {
    setStatus({ kind: 'connecting' })
    try {
      transportRef.current?.close()
      const c = await connectWebMidi()
      transportRef.current = c.transport
      setStatus({ kind: 'connected', ports: `${c.inputName} / ${c.outputName}` })
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message })
    }
  }

  async function scan() {
    const t = transportRef.current
    if (!t || !ports) return
    setComparison(null)
    try {
      const cap = await scanBank(t, { onProgress: (slot) => setStatus({ kind: 'scanning', ports, slot }) })
      setCapture(cap)
      // Dev-only hook so the capture can be pulled from devtools for fixtures.
      if (import.meta.env.DEV) (window as unknown as { __s1Capture?: BankCapture }).__s1Capture = cap
      setSelected(cap.originalProgram)
      setStatus({ kind: 'connected', ports })
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message, ports })
    }
  }

  function downloadCapture() {
    if (!capture) return
    const body = {
      format: 'ms60b-capture/1',
      note: 'Raw read-only capture from a real MS-60B (S1).',
      capturedAt: new Date().toISOString(),
      identity: capture.identity,
      originalProgram: capture.originalProgram,
      patches: capture.patches.map((p) => toHex(p)),
      log: capture.log.map((l) => ({ t: Math.round(l.t), dir: l.dir, hex: toHex(l.bytes) })),
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' }))
    a.download = `ms60b-capture-${body.capturedAt.replace(/[:.]/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function compare(file: File) {
    if (!capture) return
    try {
      const theirs = readG200kgBankZip(new Uint8Array(await file.arrayBuffer()))
      setComparison(compareWithG200kg(capture.patches, theirs))
    } catch (e) {
      setStatus({ kind: 'error', message: `No se pudo leer el zip: ${(e as Error).message}`, ports })
    }
  }

  const decoded = useMemo(() => capture?.patches.map((p) => decodePatch60B(p)) ?? [], [capture])
  const firmware = capture?.identity.firmware ?? 1
  const sel = decoded[selected]
  const matches = comparison?.filter((c) => c.status === 'match').length ?? 0

  return (
    <main className="s1">
      <header>
        <h1>MS-60B · S1 lectura</h1>
        <p className="muted">
          Solo lectura. Envía Identity Request, Parameter Edit Enable, Request Current Program, Program Change 0–49 y
          Request Patch, y al final vuelve al patch que estaba activo. Cualquier otro mensaje está bloqueado.
        </p>
      </header>

      <section className="bar">
        <button onClick={connect} disabled={status.kind === 'connecting' || status.kind === 'scanning'}>
          Conectar
        </button>
        <button onClick={scan} disabled={!ports || status.kind === 'scanning'}>
          Leer 50 patches
        </button>
        <button onClick={downloadCapture} disabled={!capture}>
          Descargar captura (JSON)
        </button>
        <label className={`file ${capture ? '' : 'disabled'}`}>
          Comparar con banco de g200kg (.zip)
          <input
            type="file"
            accept=".zip"
            disabled={!capture}
            onChange={(e) => e.target.files?.[0] && compare(e.target.files[0])}
          />
        </label>
        <span className="status" role="status">
          {status.kind === 'idle' && 'Sin conectar'}
          {status.kind === 'connecting' && 'Conectando…'}
          {status.kind === 'connected' && `Conectado: ${status.ports}`}
          {status.kind === 'scanning' && `Leyendo ${Math.min(status.slot + 1, 50)}/50…`}
          {status.kind === 'error' && <span className="bad">Error: {status.message}</span>}
        </span>
      </section>

      {capture && (
        <p className="muted">
          Firmware {capture.identity.version} · patch activo al conectar: {capture.originalProgram + 1} ·{' '}
          {capture.log.length} mensajes registrados
          {comparison && (
            <>
              {' '}
              · comparación con g200kg:{' '}
              <strong className={matches === 50 ? 'ok' : 'bad'}>{matches}/50 coinciden</strong>
            </>
          )}
        </p>
      )}

      {capture && (
        <div className="cols">
          <ol className="list">
            {decoded.map((p, i) => {
              const c = comparison?.[i]
              return (
                <li key={i}>
                  <button className={i === selected ? 'sel' : ''} onClick={() => setSelected(i)}>
                    <span className="num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="name">{p.name || '—'}</span>
                    {c && <span className={c.status === 'match' ? 'ok' : 'bad'}>{c.status === 'match' ? '✓' : '✗'}</span>}
                  </button>
                </li>
              )
            })}
          </ol>

          {sel && (
            <div className="detail">
              <h2>
                {String(selected + 1).padStart(2, '0')} · {sel.name || '—'}
              </h2>
              <p className="muted">
                maxFx {sel.maxFx} · foco {sel.focus + 1} · DSP full bits 0b{sel.dspFull.toString(2).padStart(4, '0')}
              </p>
              <div className="fx">
                {sel.effects.map((e, n) => {
                  const v = describeEffect(e, n, firmware)
                  return (
                    <div key={n} className={`block ${v.on ? 'on' : 'off'} ${n < sel.maxFx ? '' : 'unused'}`}>
                      <h3>
                        {n + 1}. {v.name} <small>{v.on ? 'ON' : 'OFF'}</small>
                      </h3>
                      <table>
                        <tbody>
                          {v.params.map((p) => (
                            <tr key={p.name} className={p.outOfRange ? 'bad' : ''}>
                              <td>{p.name}</td>
                              <td>{p.text}</td>
                              <td className="muted">{p.raw}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                })}
              </div>
              {comparison?.[selected] && comparison[selected].status !== 'match' && (
                <div className="diffs">
                  <h3>Diferencias con g200kg</h3>
                  <ul>
                    {comparison[selected].diffs.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {comparison?.[selected] && comparison[selected].rawDiffOffsets.length > 0 && (
                <p className="muted">
                  Bytes crudos distintos (informativo, g200kg reconstruye desde plantilla):{' '}
                  {comparison[selected].rawDiffOffsets.join(', ')}
                </p>
              )}
              <details>
                <summary>Bytes crudos</summary>
                <pre>{toHex(sel.raw)}</pre>
              </details>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
