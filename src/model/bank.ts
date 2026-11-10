import { canSave, MAX_BLOCKS, patchesEqual, type Patch } from './patch'

/** Spec §3: each patch has the pedal's copy and the app's working copy. */
export interface Slot {
  device: Patch
  working: Patch
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
}

export type BankAction =
  | { type: 'edit'; fn: (p: Patch) => Patch; selectBlock?: number }
  | { type: 'selectBlock'; index: number }
  | { type: 'selectPatch'; index: number }
  | { type: 'resolveSwitch'; choice: 'save' | 'discard' | 'cancel' }
  | { type: 'save' }
  | { type: 'revert' }
  | { type: 'dismissError' }

export function initBank(firmware: number, patches: Patch[]): BankState {
  return {
    firmware,
    slots: patches.map((p) => ({ device: p, working: p })),
    current: 0,
    selectedBlock: 0,
    pendingSwitch: null,
    saveError: null,
  }
}

export const isDirty = (s: Slot): boolean => !patchesEqual(s.device, s.working)

const clampBlock = (i: number, p: Patch) => Math.max(0, Math.min(i, p.blocks.length - 1, MAX_BLOCKS - 1))

function replaceSlot(state: BankState, index: number, slot: Slot): BankState {
  return { ...state, slots: state.slots.map((s, i) => (i === index ? slot : s)) }
}

/**
 * "Save": in the prototype this only copies working → device. In the real app
 * the device write happens first (S3, explicit approval), then this action.
 */
function save(state: BankState): BankState {
  const slot = state.slots[state.current]
  const check = canSave(slot.working)
  if (!check.ok) return { ...state, saveError: check.reason ?? 'No se puede guardar.' }
  return { ...replaceSlot(state, state.current, { device: slot.working, working: slot.working }), saveError: null }
}

function switchTo(state: BankState, index: number): BankState {
  return { ...state, current: index, selectedBlock: 0, pendingSwitch: null }
}

export function bankReducer(state: BankState, action: BankAction): BankState {
  const slot = state.slots[state.current]
  switch (action.type) {
    case 'edit': {
      const working = action.fn(slot.working)
      const next = replaceSlot(state, state.current, { ...slot, working })
      return { ...next, selectedBlock: clampBlock(action.selectBlock ?? state.selectedBlock, working), saveError: null }
    }
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
        return switchTo(replaceSlot(state, state.current, { ...slot, working: slot.device }), target)
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
        ...replaceSlot(state, state.current, { ...slot, working: slot.device }),
        selectedBlock: clampBlock(state.selectedBlock, slot.device),
        saveError: null,
      }
    case 'dismissError':
      return { ...state, saveError: null }
  }
}
