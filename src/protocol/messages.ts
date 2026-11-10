/*
 * MS-60B MIDI messages used for READING. Bytes from g200kg/zoom-ms-utility
 * (commit 5bf930c8e1622b0c70c0c3d761424f84955a227a): midimessage.md and
 * index.html (MidiIf.StartScan, MidiIf.recv). See docs/protocol.md §2.
 *
 * MIT License
 * Copyright (c) 2017 — zoom-ms-utility by g200kg (original LICENSE names no holder)
 * See THIRD_PARTY_NOTICES.md for the full license text.
 *
 * Write messages (0x28 Send Patch, 0x31 Parameter Edit, 0x32 Store) are
 * deliberately absent. They arrive in S3, after explicit approval.
 */
import { DEVICE_ID_60B } from './patch60b'

export const PATCH_SLOTS = 50

export const identityRequest = (): Uint8Array => Uint8Array.of(0xf0, 0x7e, 0x00, 0x06, 0x01, 0xf7)

const zoom = (cmd: number): Uint8Array => Uint8Array.of(0xf0, 0x52, 0x00, DEVICE_ID_60B, cmd, 0xf7)
export const requestCurrentProgram = (): Uint8Array => zoom(0x33)
export const parameterEditEnable = (): Uint8Array => zoom(0x50)
export const requestPatch = (): Uint8Array => zoom(0x29)

export function programChange(slot: number): Uint8Array {
  if (!Number.isInteger(slot) || slot < 0 || slot >= PATCH_SLOTS) {
    throw new RangeError(`patch slot out of range: ${slot}`)
  }
  return Uint8Array.of(0xc0, slot)
}

export interface IdentityReply {
  manufacturer: number
  deviceId: number
  /** ASCII version from bytes 10-13, e.g. "1.00". */
  version: string
  /** Major version number (parseFloat of version), as g200kg uses it. */
  firmware: number
}

/** Parses F0 7E xx 06 02 52 <dev> 00 00 00 v v v v F7 (index.html MidiIf.recv, "f07e00060252"). */
export function parseIdentityReply(msg: ArrayLike<number>): IdentityReply | null {
  if (msg.length !== 15 || msg[0] !== 0xf0 || msg[1] !== 0x7e || msg[3] !== 0x06 || msg[4] !== 0x02 || msg[14] !== 0xf7) {
    return null
  }
  const version = String.fromCharCode(msg[10], msg[11], msg[12], msg[13])
  return { manufacturer: msg[5], deviceId: msg[6], version, firmware: parseFloat(version) }
}

/** Program Change C0 pp on channel 1 (as sent/received by g200kg). */
export function parseProgramChange(msg: ArrayLike<number>): number | null {
  return msg.length === 2 && msg[0] === 0xc0 ? msg[1] : null
}

export interface ParamEditEvent {
  /** Effect slot 0..3. */
  effect: number
  /** 0 = on/off, 1 = type, 2..10 = params 1..9. */
  param: number
  value: number
}

/**
 * Parses F0 52 00 5F 31 nn pp vL vM F7, which the pedal sends when a knob or
 * effect switch is used on the pedal (index.html MidiIf.recv, docs/protocol.md §2.5).
 * Parsing only: the app never sends 0x31 in v1.
 */
export function parseParamEdit(msg: ArrayLike<number>): ParamEditEvent | null {
  if (msg.length !== 10 || msg[0] !== 0xf0 || msg[1] !== 0x52 || msg[2] !== 0x00 || msg[3] !== DEVICE_ID_60B || msg[4] !== 0x31 || msg[9] !== 0xf7) {
    return null
  }
  return { effect: msg[5], param: msg[6], value: msg[7] + (msg[8] << 7) }
}

const eq = (a: ArrayLike<number>, b: ArrayLike<number>) =>
  a.length === b.length && Array.prototype.every.call(a, (v: number, i: number) => v === b[i])

/**
 * The only messages the app may send while writes are not approved.
 * Classes agreed with the user (CLAUDE.md): read, and read-with-notice.
 */
export function isAllowedReadMessage(msg: ArrayLike<number>): boolean {
  if (eq(msg, identityRequest())) return true
  if (eq(msg, requestCurrentProgram())) return true
  if (eq(msg, parameterEditEnable())) return true
  if (eq(msg, requestPatch())) return true
  return msg.length === 2 && msg[0] === 0xc0 && msg[1] < PATCH_SLOTS
}
