/**
 * Minimal MIDI transport boundary (spec §10).
 *
 * The protocol layer depends only on this interface, never on Web MIDI or
 * Electron directly. Implementations (Web MIDI now, Electron later) live in
 * this folder.
 *
 * No implementation exists yet: S1 will add a Web MIDI one with sysex access.
 */
export type MidiMessage = Uint8Array

export type Unsubscribe = () => void

export interface MidiTransport {
  /** Send one complete MIDI message (short message or full F0..F7 sysex). */
  send(message: MidiMessage): void
  /** Subscribe to every complete message received from the device. */
  onMessage(listener: (message: MidiMessage) => void): Unsubscribe
  /** Release ports and listeners. */
  close(): void
}
