import { decodePatch60B } from '../protocol/patch60b'
import type { Patch } from './patch'

/** Patch model from the 105 bytes read from the pedal: the first maxFx effect slots, in order. */
export function patchFromDevice(raw: ArrayLike<number>): Patch {
  const d = decodePatch60B(raw)
  return {
    name: d.name,
    blocks: d.effects.slice(0, Math.max(1, d.maxFx)).map((e) => ({ effectId: e.id, on: e.on, params: [...e.params] })),
  }
}
