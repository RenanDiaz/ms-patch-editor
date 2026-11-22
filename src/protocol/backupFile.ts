/*
 * Bank backup file: the same "ms60b-capture/1" JSON written by the S1 and S3
 * pages, so any of those files can be restored. Raw 105-byte messages as hex.
 */
import type { IdentityReply } from './messages'
import { PATCH_SLOTS } from './messages'
import { findEffect } from './describe'
import { decodePatch60B } from './patch60b'

export const BACKUP_FORMAT = 'ms60b-capture/1'

export interface BankBackup {
  identity?: IdentityReply
  capturedAt?: string
  /** Raw 105-byte patch messages, index = slot. */
  patches: number[][]
}

export class BackupFileError extends Error {}

const toHex = (b: ArrayLike<number>) => Array.from(b, (v) => v.toString(16).padStart(2, '0')).join(' ')

export function toBackupJson(b: { identity: IdentityReply; originalProgram?: number; patches: ArrayLike<number>[] }, note: string): string {
  return JSON.stringify(
    {
      format: BACKUP_FORMAT,
      note,
      capturedAt: new Date().toISOString(),
      identity: b.identity,
      originalProgram: b.originalProgram,
      patches: b.patches.map(toHex),
    },
    null,
    2,
  )
}

/** Parses and validates a backup file. Throws BackupFileError with a message for the user. */
export function parseBackupJson(text: string): BankBackup {
  let j: { format?: unknown; patches?: unknown; identity?: IdentityReply; capturedAt?: string }
  try {
    j = JSON.parse(text)
  } catch {
    throw new BackupFileError('the file is not JSON')
  }
  if (j.format !== BACKUP_FORMAT) throw new BackupFileError(`unknown format (expected ${BACKUP_FORMAT})`)
  if (!Array.isArray(j.patches) || j.patches.length !== PATCH_SLOTS) throw new BackupFileError(`it must have ${PATCH_SLOTS} patches`)
  const patches = j.patches.map((h, i) => {
    const bytes = typeof h === 'string' ? h.trim().split(/\s+/).map((x) => parseInt(x, 16)) : []
    try {
      decodePatch60B(bytes)
    } catch {
      throw new BackupFileError(`patch ${i + 1} is not valid`)
    }
    return bytes
  })
  return { identity: j.identity, capturedAt: j.capturedAt, patches }
}

export interface RestoreItem {
  slot: number
  /** Name now in the pedal (as the app knows it). */
  now: string
  /** Name in the backup. */
  backup: string
  /** Effect chains, e.g. "RackComp · OptComp · SuperB", to tell apart slots with the same name. */
  nowChain: string
  backupChain: string
}

const chain = (b: ArrayLike<number>) => {
  const d = decodePatch60B(b)
  return d.effects
    .slice(0, Math.max(1, d.maxFx))
    .map((e) => findEffect(e.id)?.name ?? '?')
    .join(' · ')
}

/** Slots whose bytes differ between what the pedal holds and the backup. */
export function restorePlan(current: readonly (ArrayLike<number> | null)[], backup: readonly ArrayLike<number>[]): RestoreItem[] {
  return backup.flatMap((b, slot) => {
    const c = current[slot]
    const same = !!c && c.length === b.length && Array.from(b).every((v, i) => v === c[i])
    if (same) return []
    return [{ slot, now: c ? decodePatch60B(c).name : '?', backup: decodePatch60B(b).name, nowChain: c ? chain(c) : '?', backupChain: chain(b) }]
  })
}
