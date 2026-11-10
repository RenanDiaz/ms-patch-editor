import type { MidiMessage, MidiTransport } from './MidiTransport'

/** Port name prefix used by g200kg (index.html MidiIf.PortScan). */
export const ZOOM_PORT_PREFIX = 'ZOOM MS Series'

export class MidiUnavailableError extends Error {}

export interface WebMidiConnection {
  transport: MidiTransport
  inputName: string
  outputName: string
}

/**
 * Opens the Zoom MS ports through Web MIDI with sysex access.
 * Chromium only; the browser asks the user for MIDI/sysex permission.
 */
export async function connectWebMidi(): Promise<WebMidiConnection> {
  if (!('requestMIDIAccess' in navigator)) {
    throw new MidiUnavailableError('Web MIDI no está disponible en este navegador. Usa Chrome o Edge.')
  }
  const access = await navigator.requestMIDIAccess({ sysex: true })
  const input = [...access.inputs.values()].find((p) => p.name?.startsWith(ZOOM_PORT_PREFIX))
  const output = [...access.outputs.values()].find((p) => p.name?.startsWith(ZOOM_PORT_PREFIX))
  if (!input || !output) {
    const names = [...access.inputs.values(), ...access.outputs.values()].map((p) => p.name).join(', ') || 'ninguno'
    throw new MidiUnavailableError(`No se encontró el puerto "${ZOOM_PORT_PREFIX}". Puertos vistos: ${names}`)
  }

  const listeners = new Set<(m: MidiMessage) => void>()
  const onMidi = (ev: MIDIMessageEvent) => {
    if (!ev.data) return
    const data = new Uint8Array(ev.data)
    listeners.forEach((l) => l(data))
  }
  input.addEventListener('midimessage', onMidi as EventListener)
  await input.open()
  await output.open()

  return {
    inputName: input.name ?? '',
    outputName: output.name ?? '',
    transport: {
      send(message) {
        output.send(message)
      },
      onMessage(listener) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      close() {
        input.removeEventListener('midimessage', onMidi as EventListener)
        listeners.clear()
        void input.close()
        void output.close()
      },
    },
  }
}
