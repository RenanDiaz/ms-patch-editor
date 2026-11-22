import { decodePatch60B } from '../protocol/patch60b'
import { canSave, MAX_BLOCKS, patchesEqual, type Patch } from './patch'

/** Spec §3: each patch has the pedal's copy and the app's working copy. */
export interface Slot {
  device: Patch
  working: Patch
  /** The 105 bytes last read from the pedal for this slot (null for fake data). Save encodes over them (S3). */
  raw: number[] | null
}

export interface BankState {
  firmware: number
  slots: Slot[]
  current: number
  selectedBlock: number
  /** Patch the user asked to switch to while the current one had unsaved changes. */
  pendingSwitch: number | null
  /** Last Save refusal, shown to the user. */
  saveError: string | null
  /** Undo/redo steps of each slot's working copy (key = slot index). */
  history: Record<number, History>
}

/** Undo/redo of a working copy. `key`/`at` coalesce a burst of edits of one control (a knob drag) into one step. */
export interface History {
  past: Patch[]
  future: Patch[]
  key?: string
  at?: number
}

/** Edits of the same control closer than this become one undo step. */
export const MERGE_MS = 800
/** Undo steps kept per slot. */
export const HISTORY_LIMIT = 200
const NO_HISTORY: History = { past: [], future: [] }

export type BankAction =
  /**
   * An edit of the working copy (one undo step). Edits with the same `merge`
   * key less than MERGE_MS apart (by `at`, ms) are one step.
   */
  | { type: 'edit'; fn: (p: Patch) => Patch; selectBlock?: number; merge?: string; at?: number }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'selectBlock'; index: number }
  | { type: 'selectPatch'; index: number }
  | { type: 'resolveSwitch'; choice: 'save' | 'discard' | 'cancel' }
  | { type: 'save' }
  | { type: 'revert' }
  | { type: 'dismissError' }
  /**
   * A slot was (re)read from the pedal. 'replace' = device and working copy
   * become the pedal's; 'deviceOnly' = only the device copy, the working copy
   * keeps the user's changes (conflict resolved as "keep mine").
   */
  | { type: 'loadSlot'; index: number; patch: Patch; raw: number[]; mode: 'replace' | 'deviceOnly'; undoable?: boolean }
  /** Live listening: the pedal's edit buffer changed (knob on the pedal); it becomes the working copy. */
  | { type: 'setWorking'; index: number; patch: Patch }
  /** The user changed patch on the pedal: follow it, keeping any unsaved working copy. */
  | { type: 'followPedal'; index: number }

export function initBank(firmware: number, patches: Patch[], raws?: number[][]): BankState {
  return {
    firmware,
    slots: patches.map((p, i) => ({ device: p, working: p, raw: raws?.[i] ?? null })),
    current: 0,
    selectedBlock: 0,
    pendingSwitch: null,
    saveError: null,
    history: {},
  }
}

export const isDirty = (s: Slot): boolean => !patchesEqual(s.device, s.working)

const clampBlock = (i: number, p: Patch) => Math.max(0, Math.min(i, p.blocks.length - 1, MAX_BLOCKS - 1))

function replaceSlot(state: BankState, index: number, slot: Slot): BankState {
  return { ...state, slots: state.slots.map((s, i) => (i === index ? slot : s)) }
}

export const historyOf = (state: BankState, index = state.current): History => state.history?.[index] ?? NO_HISTORY
export const canUndo = (state: BankState) => historyOf(state).past.length > 0
export const canRedo = (state: BankState) => historyOf(state).future.length > 0

function setHistory(state: BankState, index: number, h: History): BankState {
  return { ...state, history: { ...state.history, [index]: h } }
}

/** Records `before` as an undo step of slot `index` (no step when nothing changed). */
function pushStep(state: BankState, index: number, before: Patch, after: Patch, merge?: string, at?: number): BankState {
  if (patchesEqual(before, after)) return state
  const h = historyOf(state, index)
  const coalesce = merge !== undefined && at !== undefined && h.key === merge && h.at !== undefined && at - h.at < MERGE_MS
  const past = coalesce ? h.past : [...h.past, before].slice(-HISTORY_LIMIT)
  return setHistory(state, index, { past, future: [], key: merge, at })
}

/** Moves one step between past and future of the current slot. */
function step(state: BankState, dir: 'undo' | 'redo'): BankState {
  const index = state.current
  const slot = state.slots[index]
  const h = historyOf(state, index)
  const from = dir === 'undo' ? h.past : h.future
  if (!from.length) return state
  const target = from[from.length - 1]
  const rest = from.slice(0, -1)
  const other = [...(dir === 'undo' ? h.future : h.past), slot.working]
  const next = setHistory(
    replaceSlot(state, index, { ...slot, working: target }),
    index,
    dir === 'undo' ? { past: rest, future: other } : { past: other, future: rest },
  )
  return { ...next, selectedBlock: clampBlock(state.selectedBlock, target), saveError: null }
}

/**
 * "Save": in the prototype this only copies working → device. In the real app
 * the device write happens first (S3, explicit approval), then this action.
 */
function save(state: BankState): BankState {
  const slot = state.slots[state.current]
  const check = canSave(slot.working)
  if (!check.ok) return { ...state, saveError: check.reason ?? 'This patch cannot be saved.' }
  return { ...replaceSlot(state, state.current, { ...slot, device: slot.working }), saveError: null }
}

/** The effect the pedal has selected in this patch (focus bits of the bytes read), or 0. */
export function focusOf(slot: Slot): number {
  if (!slot.raw) return 0
  const f = decodePatch60B(slot.raw).focus
  return Math.max(0, Math.min(f, slot.working.blocks.length - 1))
}

function switchTo(state: BankState, index: number): BankState {
  return { ...state, current: index, selectedBlock: focusOf(state.slots[index]), pendingSwitch: null }
}

export function bankReducer(state: BankState, action: BankAction): BankState {
  const slot = state.slots[state.current]
  switch (action.type) {
    case 'edit': {
      const working = action.fn(slot.working)
      const next = pushStep(replaceSlot(state, state.current, { ...slot, working }), state.current, slot.working, working, action.merge, action.at)
      return { ...next, selectedBlock: clampBlock(action.selectBlock ?? state.selectedBlock, working), saveError: null }
    }
    case 'undo':
    case 'redo':
      return step(state, action.type)
    case 'selectBlock':
      return { ...state, selectedBlock: clampBlock(action.index, slot.working) }
    case 'selectPatch':
      if (action.index === state.current) return state
      if (isDirty(slot)) return { ...state, pendingSwitch: action.index }
      return switchTo(state, action.index)
    case 'resolveSwitch': {
      const target = state.pendingSwitch
      if (target === null) return state
      if (action.choice === 'cancel') return { ...state, pendingSwitch: null }
      if (action.choice === 'discard') {
        const reverted = pushStep(replaceSlot(state, state.current, { ...slot, working: slot.device }), state.current, slot.working, slot.device)
        return switchTo(reverted, target)
      }
      const saved = save(state)
      // Save refused (DSP): stay on the current patch and show why.
      if (saved.saveError) return { ...saved, pendingSwitch: null }
      return switchTo(saved, target)
    }
    case 'save':
      return save(state)
    case 'revert':
      return {
        ...pushStep(replaceSlot(state, state.current, { ...slot, working: slot.device }), state.current, slot.working, slot.device),
        selectedBlock: clampBlock(state.selectedBlock, slot.device),
        saveError: null,
      }
    case 'dismissError':
      return { ...state, saveError: null }
    case 'setWorking': {
      const before = state.slots[action.index].working
      return pushStep(replaceSlot(state, action.index, { ...state.slots[action.index], working: action.patch }), action.index, before, action.patch)
    }
    case 'followPedal':
      return action.index === state.current ? state : switchTo(state, action.index)
    case 'loadSlot': {
      const old = state.slots[action.index]
      const working = action.mode === 'replace' ? action.patch : old.working
      let next = replaceSlot(state, action.index, { device: action.patch, working, raw: action.raw })
      if (action.undoable) next = pushStep(next, action.index, old.working, working)
      return action.index === state.current ? { ...next, selectedBlock: clampBlock(state.selectedBlock, working) } : next
    }
  }
}
