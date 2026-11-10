/*
 * MS-60B WRITE messages (S3). Bytes from g200kg/zoom-ms-utility
 * (commit 5bf930c8e1622b0c70c0c3d761424f84955a227a): midimessage.md
 * ("Send Patch", "Store Patch") and index.html (MidiIf.SendCurrentPatch,
 * StorePatch, StoreAll). See docs/protocol.md §2.3.
 *
 * MIT License
 * Copyright (c) 2017 — zoom-ms-utility by g200kg (original LICENSE names no holder)
 * See THIRD_PARTY_NOTICES.md for the full license text.
 *
 * Building a message sends nothing. Sending a write only works through
 * withApprovedWrites() (src/transport/approvedWrites.ts), with an approval
 * that lists the exact bytes. Parameter Edit 0x31 is not here: v1 does not
 * edit live (spec §3).
 */
import { PATCH_SLOTS } from './messages'
import { DEVICE_ID_60B, isPatchData60B } from './patch60b'

/** Send Patch: F0 52 00 5F 28 … F7 (105 bytes) → edit buffer of the current program. Not persisted by itself. */
export function sendPatch(patch: ArrayLike<number>): Uint8Array {
  if (!isPatchData60B(patch)) throw new RangeError('not a 105-byte MS-60B patch message')
  return Uint8Array.from(patch)
}

/** Store Patch: F0 52 00 5F 32 01 00 00 pp 00 00 00 00 00 F7 → persists the edit buffer in slot pp. */
export function storePatch(slot: number): Uint8Array {
  if (!Number.isInteger(slot) || slot < 0 || slot >= PATCH_SLOTS) throw new RangeError(`patch slot out of range: ${slot}`)
  return Uint8Array.of(0xf0, 0x52, 0x00, DEVICE_ID_60B, 0x32, 0x01, 0x00, 0x00, slot, 0x00, 0x00, 0x00, 0x00, 0x00, 0xf7)
}

/** Store acknowledgement: g200kg only checks the prefix F0 52 00 5F 00 (index.html StorePatch). */
export function isStoreAck(msg: ArrayLike<number>): boolean {
  return msg.length >= 6 && msg[0] === 0xf0 && msg[1] === 0x52 && msg[2] === 0x00 && msg[3] === DEVICE_ID_60B && msg[4] === 0x00
}

/** The only write messages an approval may contain. */
export function isKnownWriteMessage(msg: ArrayLike<number>): boolean {
  if (isPatchData60B(msg)) return true
  if (msg.length !== 15 || msg[8] >= PATCH_SLOTS) return false
  const store = storePatch(msg[8])
  return Array.prototype.every.call(store, (v: number, i: number) => v === msg[i])
}
