/*
 * ⚠️ FAKE DATA — UI prototype (S2) only.
 *
 * Not read from a pedal. Never send this to the device and never use it as a
 * protocol test oracle. Effect ids, parameter names, ranges and defaults come
 * from the generated g200kg table (src/protocol/effects60b.generated.ts);
 * only the choice of effects and values here is made up.
 *
 * Firmware is set to 2.10 to match the user's pedal, so firmware-2 effects
 * are selectable.
 */
import { CATALOG, THRU_ID } from '../model/catalog'
import { newBlock, type Block, type Patch } from '../model/patch'

export const FAKE_FIRMWARE = 2.1

function fx(name: string, opts: { on?: boolean; params?: Record<string, number> } = {}): Block {
  const def = CATALOG.find((e) => e.name === name)
  if (!def) throw new Error(`fake bank: unknown effect ${name}`)
  const b = newBlock(def.id)
  if (opts.on === false) b.on = false
  for (const [pname, v] of Object.entries(opts.params ?? {})) {
    const i = def.params.findIndex((p) => p.name === pname)
    if (i < 0) throw new Error(`fake bank: ${name} has no param ${pname}`)
    b.params[i] = v
  }
  return b
}

const empty = (): Patch => ({ name: 'FAKE Empty', blocks: [newBlock(THRU_ID)] })

/** Reference patches for the prototype (spec §11, open question 2: still to be chosen by the user). */
const REFERENCE: Patch[] = [
  { name: 'FAKE Clean', blocks: [fx('M Comp'), fx('Ba GEQ'), fx('SVT')] },
  { name: 'FAKE Drive', blocks: [fx('OptComp'), fx('BassDrive', { params: { Gain: 60 } }), fx('Ba Chorus', { on: false }), fx('Delay')] },
  { name: 'FAKE Synth', blocks: [fx('Z-Syn'), fx('Ba Octave')] },
  // ~90% estimated DSP: adding almost any other effect exceeds it (demo of the Save block).
  { name: 'FAKE Verb', blocks: [fx('BassDrive'), fx('SVT'), fx('HD Hall')] },
]

export function fakeBank(): Patch[] {
  return Array.from({ length: 50 }, (_, i) => REFERENCE[i] ?? empty())
}
