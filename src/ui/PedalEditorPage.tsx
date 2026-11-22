import { useEffect, useState } from 'react'
import { focusOf, initBank, type BankState } from '../model/bank'
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
  /** Live listening on at start (default true). */
  liveDefault?: boolean
}

type Phase =
  | { kind: 'idle' }
  | { kind: 'busy'; text: string }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; session: PedalSession; initial: BankState; ports: string }

/**
 * The editor on the real pedal: connect, read the 50 patches, edit with live
 * listening (or without), Save, Revert; changes made on the pedal are
 * followed. Writes only from the user's actions (spec §3, CLAUDE.md rules 1 and 3).
 */
export function PedalEditorPage({ connect = connectWebMidi, sessionOptions, liveDefault = true }: Props) {
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })

  useEffect(() => {
    if (phase.kind !== 'ready') return
    return () => phase.session.close()
  }, [phase])

  async function start() {
    setPhase({ kind: 'busy', text: 'Connecting…' })
    try {
      const c = await connect()
      const session = new PedalSession(c.transport, sessionOptions)
      const cap = await session.scan((slot) => setPhase({ kind: 'busy', text: `Reading ${Math.min(slot + 1, 50)}/50…` }))
      session.startPolling(sessionOptions?.gapMs === 0 ? 20 : 250)
      const patches = cap.patches.map(patchFromDevice)
      const bank = initBank(cap.identity.firmware, patches, cap.patches)
      const initial = { ...bank, current: cap.originalProgram, selectedBlock: focusOf(bank.slots[cap.originalProgram]) }
      setPhase({ kind: 'ready', session, initial, ports: `${c.inputName}` })
    } catch (e) {
      setPhase({ kind: 'error', message: (e as Error).message })
    }
  }

  if (phase.kind === 'ready') {
    return (
      <EditorPage
        initial={() => phase.initial}
        pedal={phase.session}
        liveDefault={liveDefault}
      />
    )
  }

  return (
    <div className="editor connect-screen">
      <main>
        <h1>MS-60B Edit</h1>
        <p>
          Connect the pedal by USB and press <strong>Connect</strong>. The editor reads all 50 patches (about 9 s): to do that it
          steps through the patches on the pedal and then goes back to the one you had. Connecting writes nothing.
        </p>
        <p className="muted">Needs Chrome or Edge, and permission for MIDI with sysex.</p>
        <button className="primary" onClick={start} disabled={phase.kind === 'busy'}>
          {phase.kind === 'busy' ? phase.text : 'Connect'}
        </button>
        {phase.kind === 'error' && (
          <p className="bad" role="alert">
            {phase.message}
          </p>
        )}
        <p className="muted">
          <a href="#/demo">Open the demo with fake data</a>
        </p>
      </main>
    </div>
  )
}
