import { isAllowedReadMessage } from '../protocol/messages'
import { isKnownWriteMessage } from '../protocol/writeMessages'
import type { MidiMessage, MidiTransport, Unsubscribe } from './MidiTransport'
import { BlockedWriteError, toHex } from './readOnlyGuard'

/**
 * One write operation the user approved: the exact write messages, in order.
 * Each one can be sent once. Read messages stay allowed (CLAUDE.md classes).
 */
export interface WriteApproval {
  /** What the user approved, in words (shown in the confirmation and the log). */
  label: string
  writes: readonly Uint8Array[]
}

export class InvalidApprovalError extends Error {}

const same = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  a.length === b.length && Array.prototype.every.call(a, (v: number, i: number) => v === b[i])

/**
 * Wraps a transport so that, besides read messages, it sends exactly the
 * approved writes in the approved order, once each. Anything else throws
 * before reaching the device. This is the only write path (CLAUDE.md rule 1).
 */
export function withApprovedWrites(inner: MidiTransport, approval: WriteApproval): MidiTransport & { pending(): number } {
  approval.writes.forEach((w) => {
    if (!isKnownWriteMessage(w)) throw new InvalidApprovalError(`not an allowed write message: ${toHex(w)}`)
  })
  const writes = approval.writes.map((w) => Uint8Array.from(w))
  let next = 0
  return {
    send(message: MidiMessage) {
      if (!isAllowedReadMessage(message)) {
        if (next >= writes.length || !same(message, writes[next])) throw new BlockedWriteError(message)
        next++
      }
      inner.send(message)
    },
    onMessage(listener): Unsubscribe {
      return inner.onMessage(listener)
    },
    close() {
      inner.close()
    },
    pending: () => writes.length - next,
  }
}
