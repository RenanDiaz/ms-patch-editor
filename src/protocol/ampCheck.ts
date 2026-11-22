import { EFFECTS_60B } from './effects60b.generated'
import { decodePatch60B, encodePatch60B } from './patch60b'

const CAB_BYTE = [23, 43, 64, 84]
const V2_BYTE = [8, 28, 49, 70]

export interface AmpSlotCheck {
  slot: number
  name: string
  minFirmware: number
  cab: number
  cabByte: { pedal: number; encoder: number }
  v2Byte: { pedal: number; encoder: number }
}

export interface AmpCheck {
  name: string
  amps: AmpSlotCheck[]
  /** Byte offsets where re-encoding every slot from the decoded fields differs from the pedal's bytes. */
  diffs: number[]
}

/**
 * Checks the encoder's AMP rules (cabinet byte, v2 byte) against bytes made by
 * the pedal itself: decode, rewrite every slot, compare.
 */
export function checkAmpBytes(bytes: ArrayLike<number>): AmpCheck {
  const d = decodePatch60B(bytes)
  const effects = d.effects.slice(0, Math.max(1, d.maxFx))
  const enc = encodePatch60B(bytes, { name: d.name, effects }, { rewriteAllSlots: true })
  const amps = effects.flatMap((e, slot) => {
    const def = EFFECTS_60B.find((x) => x.id === e.id)
    if (def?.group !== 'AMP') return []
    return [
      {
        slot,
        name: def.name,
        minFirmware: def.minFirmware,
        cab: e.params[7],
        cabByte: { pedal: bytes[CAB_BYTE[slot]], encoder: enc[CAB_BYTE[slot]] },
        v2Byte: { pedal: bytes[V2_BYTE[slot]], encoder: enc[V2_BYTE[slot]] },
      },
    ]
  })
  const diffs = Array.from(enc.keys()).filter((i) => enc[i] !== bytes[i])
  return { name: d.name, amps, diffs }
}
