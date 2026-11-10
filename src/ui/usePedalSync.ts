import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react'
import { isDirty, type BankAction, type BankState } from '../model/bank'
import { patchFromDevice } from '../model/fromDevice'
import { liveMessages, toEncodable } from '../model/liveDiff'
import { patchesEqual, type Patch } from '../model/patch'
import { encodePatch60B } from '../protocol/patch60b'
import { WrongPatchError, type PedalSession } from '../protocol/pedalSession'
import { diffOffsets } from '../protocol/s3'
import { clearPending, readPending, writePending, type PendingRestore } from './pendingRestore'

export interface Conflict {
  index: number
  patch: Patch
  raw: number[]
}

/** Delay after the last knob event on the pedal before re-reading its buffer. */
const SETTLE_MS = 500
/** Live sends are coalesced to at most one batch per this interval (g200kg uses 80 ms). */
const LIVE_THROTTLE_MS = 80

/**
 * Keeps the editor and the pedal in step (spec §3).
 *
 * Live listening ON: what is edited is sent to the pedal's edit buffer (0x31
 * for parameters of effects 1-3, 0x28 otherwise). The pedal keeps its buffer
 * in the slot when it leaves the patch, so before leaving a patch with
 * unsaved changes the original bytes are sent back, and the slot is re-read
 * to check. Changing patch on the pedal is followed and the slot left behind
 * is restored. Knob turns on the pedal become part of the working copy.
 *
 * Live listening OFF: nothing is sent while editing; knob turns on the pedal
 * with unsaved changes here are a conflict.
 *
 * Save (both): C0, 0x28, 0x32, ack, read back.
 */
export function usePedalSync(pedal: PedalSession | undefined, state: BankState, dispatch: Dispatch<BankAction>, live: boolean) {
  const [pedalProgram, setPedalProgram] = useState<number | null>(pedal?.activeProgram ?? null)
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPendingState] = useState<PendingRestore | null>(null)

  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })
  const liveRef = useRef(live)
  useEffect(() => {
    liveRef.current = live
  })

  /** What the pedal's edit buffer holds, as far as the app knows. */
  const bufferRef = useRef<{ slot: number; patch: Patch } | null>(
    pedal && pedal.activeProgram !== null ? { slot: pedal.activeProgram, patch: state.slots[pedal.activeProgram].device } : null,
  )
  const movedByPedalRef = useRef<number | null>(null)
  const prevCurrentRef = useRef(state.current)

  // One pedal operation at a time, in order.
  const chainRef = useRef<Promise<unknown>>(Promise.resolve())
  const enqueue = useCallback((what: string | null, fn: () => Promise<void>) => {
    const run = async () => {
      if (what) setBusy(what)
      try {
        await fn()
      } catch (e) {
        if (!(e instanceof WrongPatchError)) setError((e as Error).message)
      } finally {
        if (what) setBusy(null)
      }
    }
    const p = chainRef.current.then(run)
    chainRef.current = p
    return p
  }, [])

  const bufferDirty = (slot: number) => {
    const b = bufferRef.current
    return !!b && b.slot === slot && !patchesEqual(b.patch, stateRef.current.slots[slot].device)
  }
  const notePending = (slot: number) => {
    const s = stateRef.current.slots[slot]
    if (!s.raw || readPending()?.slot === slot) return
    writePending({ slot, name: s.device.name, raw: s.raw, at: new Date().toISOString() })
  }

  /** Sends the working copy of `slot` to the buffer (pedal must be on `slot`). */
  const pushWorking = async (p: PedalSession, slot: number) => {
    const s = stateRef.current.slots[slot]
    const b = bufferRef.current
    if (!s.raw || !b || b.slot !== slot) return
    const msgs = liveMessages(b.patch, s.working, s.raw)
    if (!msgs.length) return
    notePending(slot)
    await p.sendLive(slot, msgs)
    bufferRef.current = { slot, patch: s.working }
    if (patchesEqual(s.working, s.device)) clearPending(slot)
  }

  /** Puts the original bytes back in the buffer of `slot` (pedal must be on `slot`). */
  const restoreBuffer = async (p: PedalSession, slot: number) => {
    const s = stateRef.current.slots[slot]
    if (!s.raw || !bufferDirty(slot)) return
    await p.sendLive(slot, [Uint8Array.from(s.raw)], `Restaurar el patch ${slot + 1}`)
    bufferRef.current = { slot, patch: s.device }
  }

  /** Checks that `slot` holds its original bytes. */
  const verifySlot = async (p: PedalSession, slot: number) => {
    const s = stateRef.current.slots[slot]
    if (!s.raw) return
    const back = await p.readSlot(slot)
    if (diffOffsets(back, s.raw).length) {
      throw new Error(`La ranura ${slot + 1} no volvió a su versión original. Revisa el patch en el pedal.`)
    }
    clearPending(slot)
  }

  // Offer to restore a slot left edited by a previous session that ended abruptly.
  useEffect(() => {
    if (!pedal) return
    const p = readPending()
    if (!p) return
    const now = stateRef.current.slots[p.slot]?.raw
    if (now && diffOffsets(now, p.raw).length === 0) clearPending(p.slot)
    else setPendingState(p)
  }, [pedal])

  // Live: send edits of the current patch, coalesced.
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const working = state.slots[state.current].working
  useEffect(() => {
    if (!pedal || !live || bufferRef.current?.slot !== stateRef.current.current) return
    if (timerRef.current) return
    timerRef.current = setTimeout(() => {
      timerRef.current = undefined
      void enqueue(null, async () => {
        const slot = stateRef.current.current
        if (liveRef.current && pedal.activeProgram === slot) await pushWorking(pedal, slot)
      })
    }, LIVE_THROTTLE_MS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [working, live, pedal, enqueue])

  // Live: changing patch (from the app, or following the pedal).
  useEffect(() => {
    const prev = prevCurrentRef.current
    const next = state.current
    if (prev === next) return
    prevCurrentRef.current = next
    if (!pedal || !liveRef.current) return
    const byPedal = movedByPedalRef.current === next
    movedByPedalRef.current = null
    void enqueue(`Cambiando al patch ${next + 1}…`, async () => {
      if (bufferDirty(prev)) {
        // The pedal keeps the buffer when it leaves a patch: put the original back first.
        if (byPedal) await pedal.select(prev)
        await restoreBuffer(pedal, prev)
        await pedal.select(next)
        await verifySlot(pedal, prev)
      } else if (!byPedal) {
        await pedal.select(next)
      }
      bufferRef.current = { slot: next, patch: stateRef.current.slots[next].device }
      setPedalProgram(pedal.activeProgram)
      await pushWorking(pedal, next)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.current, pedal, enqueue])

  // Live switched on/off.
  const firstLive = useRef(true)
  useEffect(() => {
    if (firstLive.current) {
      firstLive.current = false
      return
    }
    if (!pedal) return
    const slot = stateRef.current.current
    void enqueue(live ? 'Activando escucha en vivo…' : 'Restaurando el patch en el pedal…', async () => {
      if (live) {
        await pedal.select(slot)
        setPedalProgram(pedal.activeProgram)
        bufferRef.current = { slot, patch: stateRef.current.slots[slot].device }
        await pushWorking(pedal, slot)
      } else if (pedal.activeProgram === slot) {
        await restoreBuffer(pedal, slot)
        clearPending(slot)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, pedal, enqueue])

  // Events from the pedal.
  useEffect(() => {
    if (!pedal) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const reread = () =>
      enqueue(null, async () => {
        const index = pedal.activeProgram
        if (index === null) return
        const raw = await pedal.readSlot(index)
        const patch = patchFromDevice(raw)
        const slot = stateRef.current.slots[index]
        if (liveRef.current) {
          if (index !== stateRef.current.current) return
          bufferRef.current = { slot: index, patch }
          if (!patchesEqual(patch, slot.device)) notePending(index)
          dispatch({ type: 'setWorking', index, patch })
        } else if (isDirty(slot)) setConflict({ index, patch, raw })
        else dispatch({ type: 'loadSlot', index, patch, raw, mode: 'replace' })
      })
    const off = pedal.onEvent((e) => {
      if (e.type === 'program') {
        setPedalProgram(e.slot)
        if (liveRef.current && e.slot !== stateRef.current.current) {
          movedByPedalRef.current = e.slot
          dispatch({ type: 'followPedal', index: e.slot })
        }
      } else {
        clearTimeout(timer)
        timer = setTimeout(reread, SETTLE_MS)
      }
    })
    return () => {
      clearTimeout(timer)
      off()
    }
  }, [pedal, dispatch, enqueue])

  // Closing the page with live changes: best-effort restore of the buffer.
  useEffect(() => {
    if (!pedal) return
    const h = () => {
      const b = bufferRef.current
      if (!b || !bufferDirty(b.slot)) return
      const raw = stateRef.current.slots[b.slot].raw
      if (raw) pedal.emergencyRestore(b.slot, raw)
    }
    window.addEventListener('pagehide', h)
    return () => window.removeEventListener('pagehide', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedal])

  const revert = () => {
    if (!pedal) {
      dispatch({ type: 'revert' })
      return Promise.resolve()
    }
    const index = stateRef.current.current
    return enqueue('Leyendo…', async () => {
      setError(null)
      if (liveRef.current && pedal.activeProgram === index) await restoreBuffer(pedal, index)
      const raw = await pedal.readSlot(index)
      const patch = patchFromDevice(raw)
      dispatch({ type: 'loadSlot', index, patch, raw, mode: 'replace' })
      if (pedal.activeProgram === index) bufferRef.current = { slot: index, patch }
      if (conflict?.index === index) setConflict(null)
      const original = stateRef.current.slots[index].raw
      if (original && diffOffsets(raw, original).length === 0) clearPending(index)
    })
  }

  /** Writes the working copy of the current patch. Resolves true when the read-back matches. */
  const save = async (): Promise<boolean> => {
    if (!pedal) {
      dispatch({ type: 'save' })
      return true
    }
    const index = stateRef.current.current
    let ok = false
    await enqueue('Guardando…', async () => {
      setError(null)
      const s = stateRef.current.slots[index]
      if (!s.raw) throw new Error('No hay bytes leídos del pedal para esta ranura.')
      const back = pedal.activeProgram
      const bytes = encodePatch60B(s.raw, toEncodable(s.working))
      const r = await pedal.save(index, bytes)
      if (r.diff.length) throw new Error(`Guardado, pero la relectura difiere en los bytes ${r.diff.join(', ')}.`)
      const patch = patchFromDevice(r.readBack)
      dispatch({ type: 'loadSlot', index, patch, raw: r.readBack, mode: 'replace' })
      bufferRef.current = { slot: index, patch }
      clearPending(index)
      ok = true
      // Live off: the app does not move the pedal, so go back to where it was.
      if (!liveRef.current && back !== null && back !== index) await pedal.select(back)
      setPedalProgram(pedal.activeProgram)
    })
    return ok
  }

  const resolveConflict = (keep: 'pedal' | 'mine') => {
    if (!conflict) return
    dispatch({ type: 'loadSlot', index: conflict.index, patch: conflict.patch, raw: conflict.raw, mode: keep === 'pedal' ? 'replace' : 'deviceOnly' })
    setConflict(null)
  }

  const restorePending = () => {
    const p = pending
    if (!pedal || !p) return Promise.resolve()
    return enqueue(`Restaurando el patch ${p.slot + 1}…`, async () => {
      const back = pedal.activeProgram
      const r = await pedal.save(p.slot, p.raw)
      if (r.diff.length) throw new Error(`La relectura del patch ${p.slot + 1} difiere en los bytes ${r.diff.join(', ')}.`)
      dispatch({ type: 'loadSlot', index: p.slot, patch: patchFromDevice(r.readBack), raw: r.readBack, mode: 'replace' })
      clearPending(p.slot)
      setPendingState(null)
      if (back !== null && back !== p.slot) await pedal.select(back)
      bufferRef.current = pedal.activeProgram === null ? null : { slot: pedal.activeProgram, patch: stateRef.current.slots[pedal.activeProgram].device }
    })
  }
  const dismissPending = () => {
    clearPending()
    setPendingState(null)
  }

  return { pedalProgram, conflict, resolveConflict, revert, save, busy, error, pending, restorePending, dismissPending }
}
