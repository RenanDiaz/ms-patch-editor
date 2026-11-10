import { encodePatch60B } from '../protocol/patch60b'
import { parameterEdit } from '../protocol/writeMessages'
import { patchesEqual, type Patch } from './patch'

/** Effects whose parameters can be sent with 0x31 (measured on fw 2.10, docs/protocol.md §9.3). */
export const PARAM_EDIT_EFFECTS = 3

/** The patch as the pedal will encode it (for 0x28). */
export const toEncodable = (p: Patch) => ({
  name: p.name,
  effects: p.blocks.map((b) => ({ on: b.on, id: b.effectId, params: b.params })),
})

/**
 * Messages that take the pedal's edit buffer from `from` to `to` (live listening):
 * - only parameter values of effects 1-3 changed → one 0x31 per changed value;
 * - anything else (effect 4, on/off, type, order, count, name) → one 0x28 with
 *   the whole patch, encoded over `raw` (the bytes read from the slot).
 */
export function liveMessages(from: Patch, to: Patch, raw: ArrayLike<number>): Uint8Array[] {
  if (patchesEqual(from, to)) return []
  const sameShape =
    from.name === to.name &&
    from.blocks.length === to.blocks.length &&
    from.blocks.every((b, i) => b.effectId === to.blocks[i].effectId && b.on === to.blocks[i].on)
  if (sameShape) {
    const edits: Uint8Array[] = []
    let onlyFirstThree = true
    to.blocks.forEach((b, i) =>
      b.params.forEach((v, j) => {
        if (v === from.blocks[i].params[j]) return
        if (i >= PARAM_EDIT_EFFECTS) onlyFirstThree = false
        else edits.push(parameterEdit(i, j + 2, v))
      }),
    )
    if (onlyFirstThree) return edits
  }
  return [encodePatch60B(raw, toEncodable(to))]
}
