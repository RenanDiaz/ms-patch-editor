import { isAllowedReadMessage } from '../protocol/messages'
import type { MidiMessage, MidiTransport, Unsubscribe } from './MidiTransport'

export class BlockedWriteError extends Error {
  readonly bytes: Uint8Array
  constructor(bytes: Uint8Array) {
    super(`blocked non-read MIDI message: ${toHex(bytes)}`)
    this.bytes = bytes
  }
}

export const toHex = (b: ArrayLike<number>): string =>
  Array.from(b, (v) => v.toString(16).padStart(2, '0')).join(' ')

/**
 * Wraps a transport so that only read messages (CLAUDE.md, "Read" and
 * "Read with notice") can be sent. Anything else throws before it reaches
 * the device. Writes need a separate, explicitly approved path (S3).
 */
export function readOnly(inner: MidiTransport): MidiTransport {
  return {
    send(message: MidiMessage) {
      if (!isAllowedReadMessage(message)) throw new BlockedWriteError(message)
      inner.send(message)
    },
    onMessage(listener): Unsubscribe {
      return inner.onMessage(listener)
    },
    close() {
      inner.close()
    },
  }
}
