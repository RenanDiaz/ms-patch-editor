import { useEffect, useRef, useState, type Dispatch } from 'react'
import { isDirty, type BankAction, type BankState } from '../model/bank'
import { patchFromDevice } from '../model/fromDevice'
import type { Patch } from '../model/patch'
import type { PedalSession } from '../protocol/pedalSession'

export interface Conflict {
  index: number
  patch: Patch
  raw: number[]
}

/** How long to wait after the last knob event before re-reading the pedal's patch. */
const SETTLE_MS = 500

/**
 * Keeps the editor in sync with the pedal (spec §3), read-only:
 * - the pedal's active patch (it sends C0 pp when you change patch on it);
 * - knob/switch changes on the pedal (0x31): the active slot is re-read; if
 *   the app has unsaved changes for that slot it becomes a conflict.
 * - Revert re-reads the slot from the pedal.
 */
export function usePedalSync(pedal: PedalSession | undefined, state: BankState, dispatch: Dispatch<BankAction>) {
  const [pedalProgram, setPedalProgram] = useState<number | null>(pedal?.activeProgram ?? null)
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  useEffect(() => {
    if (!pedal) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const reread = async () => {
      const index = pedal.activeProgram
      if (index === null) return
      try {
        const raw = await pedal.readSlot(index)
        const patch = patchFromDevice(raw)
        const slot = stateRef.current.slots[index]
        if (isDirty(slot)) setConflict({ index, patch, raw })
        else dispatch({ type: 'loadSlot', index, patch, raw, mode: 'replace' })
      } catch (e) {
        setError(`No se pudo releer el patch ${index + 1}: ${(e as Error).message}`)
      }
    }
    const off = pedal.onEvent((e) => {
      if (e.type === 'program') setPedalProgram(e.slot)
      else {
        clearTimeout(timer)
        timer = setTimeout(reread, SETTLE_MS)
      }
    })
    return () => {
      clearTimeout(timer)
      off()
    }
  }, [pedal, dispatch])

  const revert = async () => {
    if (!pedal) return dispatch({ type: 'revert' })
    const index = stateRef.current.current
    setBusy(true)
    setError(null)
    try {
      const raw = await pedal.readSlot(index)
      dispatch({ type: 'loadSlot', index, patch: patchFromDevice(raw), raw, mode: 'replace' })
      if (conflict?.index === index) setConflict(null)
    } catch (e) {
      setError(`No se pudo releer el patch ${index + 1}: ${(e as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const resolveConflict = (keep: 'pedal' | 'mine') => {
    if (!conflict) return
    dispatch({ type: 'loadSlot', index: conflict.index, patch: conflict.patch, raw: conflict.raw, mode: keep === 'pedal' ? 'replace' : 'deviceOnly' })
    setConflict(null)
  }

  return { pedalProgram, conflict, resolveConflict, revert, busy, error }
}
