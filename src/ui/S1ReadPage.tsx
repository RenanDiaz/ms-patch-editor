import { useMemo, useRef, useState } from 'react'
import { checkAmpBytes, type AmpCheck } from '../protocol/ampCheck'
import { readActive } from '../protocol/s3'
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
  const [activeReads, setActiveReads] = useState<{ at: string; slot: number; hex: string; check: AmpCheck }[]>([])
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

  /** Reads the active patch without changing patch (0x33 + 0x29) and checks the AMP bytes. */
  async function readActiveNow() {
    const t = transportRef.current
    if (!t || !ports) return
    try {
      const r = await readActive({ transport: t, log: [], t0: performance.now() })
      setActiveReads((rs) => [{ at: new Date().toISOString(), slot: r.slot, hex: toHex(r.bytes), check: checkAmpBytes(r.bytes) }, ...rs])
    } catch (e) {
      setStatus({ kind: 'error', message: (e as Error).message, ports })
    }
  }

  function downloadActiveReads() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ format: 'ms60b-active-reads/1', reads: activeReads }, null, 2)], { type: 'application/json' }))
    a.download = `ms60b-active-reads-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
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
      setStatus({ kind: 'error', message: `Couldn't read the zip file: ${(e as Error).message}. Choose a bank .zip exported from the reference utility.`, ports })
    }
  }

  const decoded = useMemo(() => capture?.patches.map((p) => decodePatch60B(p)) ?? [], [capture])
  const firmware = capture?.identity.firmware ?? 1
  const sel = decoded[selected]
  const matches = comparison?.filter((c) => c.status === 'match').length ?? 0

  return (
    <main className="s1">
      <header>
        <h1>MS-60B · S1 read</h1>
        <p className="muted">
          Read only. Sends Identity Request, Parameter Edit Enable, Request Current Program, Program Change 0–49 and
          Request Patch, then switches back to the patch that was active. Every other message is blocked.
        </p>
      </header>

      <section className="bar">
        <button onClick={connect} disabled={status.kind === 'connecting' || status.kind === 'scanning'}>
          Connect
        </button>
        <button onClick={scan} disabled={!ports || status.kind === 'scanning'}>
          Read 50 patches
        </button>
        <button onClick={readActiveNow} disabled={!ports || status.kind === 'scanning'}>
          Read active patch (without switching patch)
        </button>
        <button onClick={downloadCapture} disabled={!capture}>
          Download capture (JSON)
        </button>
        <label className={`file ${capture ? '' : 'disabled'}`}>
          Compare with a reference bank (.zip)
          <input
            type="file"
            accept=".zip"
            disabled={!capture}
            onChange={(e) => e.target.files?.[0] && compare(e.target.files[0])}
          />
        </label>
        <span className="status" role="status">
          {status.kind === 'idle' && 'Not connected'}
          {status.kind === 'connecting' && 'Connecting…'}
          {status.kind === 'connected' && `Connected: ${status.ports}`}
          {status.kind === 'scanning' && `Reading ${Math.min(status.slot + 1, 50)}/50…`}
          {status.kind === 'error' && <span className="bad">Error: {status.message}</span>}
        </span>
      </section>

      {activeReads.length > 0 && (
        <section className="active-reads">
          <h2>
            Active patch reads{' '}
            <button onClick={downloadActiveReads}>Download reads</button>
          </h2>
          <table>
            <thead>
              <tr>
                <td>Time</td>
                <td>Patch</td>
                <td>AMP (fw)</td>
                <td>CAB</td>
                <td>Cab byte pedal / app</td>
                <td>v2 byte pedal / app</td>
                <td>Other bytes</td>
              </tr>
            </thead>
            <tbody>
              {activeReads.flatMap((r) =>
                (r.check.amps.length ? r.check.amps : [null]).map((a, k) => (
                  <tr key={r.at + k}>
                    <td>{r.at.slice(11, 19)}</td>
                    <td>
                      {String(r.slot + 1).padStart(2, '0')} {r.check.name}
                    </td>
                    <td>{a ? `${a.slot + 1}. ${a.name} (fw${a.minFirmware})` : 'no AMP'}</td>
                    <td>{a?.cab ?? '—'}</td>
                    <td className={a && a.cabByte.pedal !== a.cabByte.encoder ? 'bad' : 'ok'}>
                      {a ? `0x${a.cabByte.pedal.toString(16)} / 0x${a.cabByte.encoder.toString(16)}` : '—'}
                    </td>
                    <td className={a && a.v2Byte.pedal !== a.v2Byte.encoder ? 'bad' : 'ok'}>
                      {a ? `0x${a.v2Byte.pedal.toString(16)} / 0x${a.v2Byte.encoder.toString(16)}` : '—'}
                    </td>
                    <td className={r.check.diffs.length ? 'bad' : 'ok'}>{r.check.diffs.length ? `differs at ${r.check.diffs.join(', ')}` : 'identical'}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </section>
      )}

      {capture && (
        <p className="muted">
          Firmware {capture.identity.version} · active patch when connected: {capture.originalProgram + 1} ·{' '}
          {capture.log.length} messages logged
          {comparison && (
            <>
              {' '}
              · comparison with reference bank:{' '}
              <strong className={matches === 50 ? 'ok' : 'bad'}>{matches}/50 match</strong>
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
                maxFx {sel.maxFx} · focus {sel.focus + 1} · DSP full bits 0b{sel.dspFull.toString(2).padStart(4, '0')}
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
                  <h3>Differences from reference bank</h3>
                  <ul>
                    {comparison[selected].diffs.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {comparison?.[selected] && comparison[selected].rawDiffOffsets.length > 0 && (
                <p className="muted">
                  Raw bytes that differ (for information only; the reference bank is rebuilt from a template):{' '}
                  {comparison[selected].rawDiffOffsets.join(', ')}
                </p>
              )}
              <details>
                <summary>Raw bytes</summary>
                <pre>{toHex(sel.raw)}</pre>
              </details>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
