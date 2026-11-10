/**
 * Browser-side note of a slot whose edit buffer has unsaved live changes, with
 * its original bytes. Written before the first live write, removed once the
 * slot is back to the original or saved. If the page dies in between, the
 * next connection offers to restore it (spec §3).
 */
const KEY = 'ms60b.pendingRestore.v1'

export interface PendingRestore {
  slot: number
  name: string
  raw: number[]
  at: string
}

export function readPending(): PendingRestore | null {
  try {
    const v = localStorage.getItem(KEY)
    return v ? (JSON.parse(v) as PendingRestore) : null
  } catch {
    return null
  }
}

export function writePending(p: PendingRestore) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // storage unavailable: the in-page restore still runs
  }
}

export function clearPending(slot?: number) {
  try {
    const p = readPending()
    if (slot === undefined || p?.slot === slot) localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}
