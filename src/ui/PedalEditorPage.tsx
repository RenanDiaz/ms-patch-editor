import { useEffect, useState } from 'react'
import { initBank, type BankState } from '../model/bank'
import { patchFromDevice } from '../model/fromDevice'
import { PedalSession } from '../protocol/pedalSession'
import type { WebMidiConnection } from '../transport/webMidi'
import { connectWebMidi } from '../transport/webMidi'
import { EditorPage } from './EditorPage'
import './EditorPage.css'

interface Props {
  /** Injected in tests. Defaults to Web MIDI. */
  connect?: () => Promise<WebMidiConnection>
  /** Injected in tests (timings). */
  sessionOptions?: ConstructorParameters<typeof PedalSession>[1]
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'busy'; text: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; session: PedalSession; initial: BankState; ports: string }

export const WRITE_BLOCKED = 'Guardar en el pedal todavía no está disponible en esta versión (solo lectura).'

/**
 * The editor on the real pedal, read-only: connect, read the 50 patches,
 * edit locally, Revert re-reads from the pedal, changes made on the pedal are
 * detected. Save is disabled until writing is enabled (spec §3, CLAUDE.md rule 1).
 */
export function PedalEditorPage({ connect = connectWebMidi, sessionOptions }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })

  useEffect(() => {
    if (phase.kind !== 'ready') return
    return () => phase.session.close()
  }, [phase])

  async function start() {
    setPhase({ kind: 'busy', text: 'Conectando…' })
    try {
      const c = await connect()
      const session = new PedalSession(c.transport, sessionOptions)
      const cap = await session.scan((slot) => setPhase({ kind: 'busy', text: `Leyendo ${Math.min(slot + 1, 50)}/50…` }))
      const patches = cap.patches.map(patchFromDevice)
      const initial = { ...initBank(cap.identity.firmware, patches, cap.patches), current: cap.originalProgram }
      setPhase({ kind: 'ready', session, initial, ports: `${c.inputName}` })
    } catch (e) {
      setPhase({ kind: 'error', message: (e as Error).message })
    }
  }

  if (phase.kind === 'ready') {
    return (
      <EditorPage
        initial={() => phase.initial}
        sourceLabel={`PEDAL · fw ${phase.initial.firmware.toFixed(2)}`}
        pedal={phase.session}
        writeBlockedReason={WRITE_BLOCKED}
      />
    )
  }

  return (
    <div className="editor connect-screen">
      <main>
        <h1>MS-60B Edit</h1>
        <p>
          Conecta el pedal por USB y pulsa <strong>Conectar</strong>. La app lee los 50 patches (unos 9 s): para eso
          cambia de patch en el pedal y al final vuelve al que tenías activo. No escribe nada.
        </p>
        <p className="muted">Necesita Chrome o Edge, y permiso de MIDI con sysex.</p>
        <button className="primary" onClick={start} disabled={phase.kind === 'busy'}>
          {phase.kind === 'busy' ? phase.text : 'Conectar'}
        </button>
        {phase.kind === 'error' && (
          <p className="bad" role="alert">
            {phase.message}
          </p>
        )}
        <p className="muted">
          <a href="#/demo">Abrir la demo con datos falsos</a>
        </p>
      </main>
    </div>
  )
}
