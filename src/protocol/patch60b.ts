/*
 * MS-60B patch (105-byte sysex) decoder.
 *
 * Ported from js/apatch.js of g200kg/zoom-ms-utility
 * (commit 5bf930c8e1622b0c70c0c3d761424f84955a227a):
 * `bits`, `namidx`, `maxfxidx`, `GetBits`, `GetCurFxBit`, `GetMaxFxBit`, `ReadBin`.
 *
 * MIT License
 * Copyright (c) 2017 — zoom-ms-utility by g200kg (original LICENSE names no holder)
 * See THIRD_PARTY_NOTICES.md for the full license text.
 *
 * Decode only. Encoding (MakeBin) is intentionally not ported yet: writing is
 * S3 and will modify the bytes read from the pedal instead of rebuilding them
 * from a template (see docs/protocol.md §3).
 */

export const PATCH_LENGTH_60B = 105
export const DEVICE_ID_60B = 0x5f
export const EFFECT_SLOTS_60B = 4
/** fx[n] has 11 values: 0 = on/off, 1 = effect id, 2..10 = params 1..9. */
export const VALUES_PER_EFFECT = 11

/** [byte offset, mask, shift] ; shift >= 0 → left, < 0 → right. 'NZ' = set-if-nonzero flag (ignored on read). */
type BitSpan = readonly [number, number, number | 'NZ']

/** apatch.prototype.bits, effects 0..3 only (effects 4..5 are MS-50G/70CDR). js/apatch.js:42-107 */
export const BITS: readonly (readonly (readonly BitSpan[])[])[] = [
  [ // eff0
    [[6, 1, 0]], // State
    [[5, 0x40, 24], [6, 0x7e, 16], [7, 0x07, 8], [9, 0x1f, 0]], // ID
    [[9, 0x60, -5], [5, 0x8, -1], [10, 0x7f, 3], [5, 0x4, 8], [11, 0x1, 11]],
    [[11, 0x7c, -2], [5, 0x2, 4], [12, 0x1f, 6]],
    [[5, 0x1, 0], [14, 0x7f, 1], [13, 0x40, 2], [15, 0x3, 9]],
    [[15, 0x70, -4], [13, 0x20, -2], [16, 0x0f, 4]],
    [[16, 0x70, -4], [13, 0x10, -1], [17, 0x0f, 4]],
    [[17, 0x70, -4], [13, 0x08, 0], [18, 0x0f, 4]],
    [[18, 0x70, -4], [13, 0x04, 1], [19, 0x0f, 4]],
    [[19, 0x70, -4], [13, 0x02, 2], [20, 0x1f, 4], [23, 0x40, 'NZ']],
    [[24, 0x7f, 0], [21, 0x10, 3]],
  ],
  [ // eff1
    [[26, 1, 0]],
    [[21, 0x4, 28], [26, 0x7e, 16], [27, 0x07, 8], [30, 0x1f, 0]],
    [[30, 0x60, -5], [29, 0x40, -4], [31, 0x7f, 3], [29, 0x20, 5], [32, 0x1, 11]],
    [[32, 0x7c, -2], [29, 0x10, 1], [33, 0x1f, 6]],
    [[29, 0x8, -3], [34, 0x7f, 1], [29, 0x4, 6], [35, 0x3, 9]],
    [[35, 0x70, -4], [29, 0x2, 2], [36, 0x0f, 4]],
    [[36, 0x70, -4], [29, 0x1, 3], [38, 0x0f, 4]],
    [[38, 0x70, -4], [37, 0x40, -3], [39, 0x0f, 4]],
    [[39, 0x70, -4], [37, 0x20, -2], [40, 0x0f, 4]],
    [[40, 0x70, -4], [37, 0x10, -1], [41, 0x1f, 4], [43, 0x40, 'NZ']],
    [[44, 0x7f, 0], [37, 0x1, 7]],
  ],
  [ // eff2
    [[47, 1, 0]],
    [[45, 0x20, 25], [47, 0x7e, 16], [48, 0x07, 8], [50, 0x1f, 0]],
    [[50, 0x60, -5], [45, 0x4, 0], [51, 0x7f, 3], [45, 0x2, 9], [52, 0x1, 11]],
    [[52, 0x7c, -2], [45, 0x1, 5], [54, 0x1f, 6]],
    [[53, 0x40, -6], [55, 0x7f, 1], [53, 0x20, 3], [56, 0x3, 9]],
    [[56, 0x70, -4], [53, 0x10, -1], [57, 0x0f, 4]],
    [[57, 0x70, -4], [53, 0x8, 0], [58, 0x0f, 4]],
    [[58, 0x70, -4], [53, 0x4, 1], [59, 0x0f, 4]],
    [[59, 0x70, -4], [53, 0x2, 2], [60, 0x0f, 4]],
    [[60, 0x70, -4], [53, 0x1, 3], [62, 0x1f, 4], [64, 0x40, 'NZ']],
    [[65, 0x7f, 0], [61, 0x8, 4]],
  ],
  [ // eff3
    [[67, 1, 0]],
    [[61, 0x2, 29], [67, 0x7e, 16], [68, 0x07, 8], [71, 0x1f, 0]],
    [[71, 0x60, -5], [69, 0x20, -3], [72, 0x7f, 3], [69, 0x10, 6], [73, 0x1, 11]],
    [[73, 0x7c, -2], [69, 0x8, 2], [74, 0x1f, 6]],
    [[69, 0x4, -2], [75, 0x7f, 1], [69, 0x2, 7], [76, 0x3, 9]],
    [[76, 0x70, -4], [69, 0x1, 3], [78, 0x0f, 4]],
    [[78, 0x70, -4], [77, 0x40, -3], [79, 0x0f, 4]],
    [[79, 0x70, -4], [77, 0x20, -2], [80, 0x0f, 4]],
    [[80, 0x70, -4], [77, 0x10, -1], [81, 0x0f, 4]],
    [[81, 0x70, -4], [77, 0x8, 0], [82, 0x1f, 4], [84, 0x40, 'NZ']],
    [[86, 0x7f, 0], [85, 0x40, 1]],
  ],
]

/** apatch.prototype.namidx[0] — documented name bytes for the 105-byte format. js/apatch.js:123 */
export const NAME_OFFSETS_60B = [91, 92, 94, 95, 96, 97, 98, 99, 100, 102] as const
const NAME_START = 91
const NAME_SCAN_LENGTH = 13
const MAX_FX_OFFSET = 89 // maxfxidx[0]
const DSP_OFFSET = 88

export interface DecodedEffect {
  on: boolean
  /** Effect id (key into EFFECTS_60B). */
  id: number
  /** Raw values of params 1..9 (fx[n][2..10]). Unused params decode as whatever bits are there (normally 0). */
  params: number[]
}

export interface DecodedPatch60B {
  name: string
  effects: DecodedEffect[]
  /** Number of effect slots in use (1..4), bits 2-4 of byte 89. */
  maxFx: number
  /** Effect slot with UI focus on the pedal (0..3). */
  focus: number
  /** Bit n = pedal reports DSP full for effect n (byte 88 & 0x3F). Only meaningful for bytes returned by the pedal. */
  dspFull: number
  /** The exact 105 bytes received. Kept so unknown bits survive a future write. */
  raw: Uint8Array
}

export class PatchFormatError extends Error {}

function getBits(dat: ArrayLike<number>, spans: readonly BitSpan[]): number {
  let val = 0
  for (const [offset, mask, shift] of spans) {
    if (shift === 'NZ' || offset >= dat.length) continue
    let v = dat[offset] & mask
    v = shift >= 0 ? v << shift : v >> -shift
    val |= v
  }
  return val
}

/** Is this a complete MS-60B patch-data message (F0 52 00 5F 28 … F7, 105 bytes)? */
export function isPatchData60B(msg: ArrayLike<number>): boolean {
  return (
    msg.length === PATCH_LENGTH_60B &&
    msg[0] === 0xf0 &&
    msg[1] === 0x52 &&
    msg[2] === 0x00 &&
    msg[3] === DEVICE_ID_60B &&
    msg[4] === 0x28 &&
    msg[PATCH_LENGTH_60B - 1] === 0xf7
  )
}

/** Port of apatch.ReadBin for the 105-byte format. */
export function decodePatch60B(msg: ArrayLike<number>): DecodedPatch60B {
  if (!isPatchData60B(msg)) {
    throw new PatchFormatError(`not an MS-60B patch message (length ${msg.length})`)
  }
  // ReadBin: 13 bytes from offset 91, zero bytes skipped, trailing spaces trimmed.
  let name = ''
  for (let j = 0; j < NAME_SCAN_LENGTH; j++) {
    const c = msg[NAME_START + j]
    if (c) name += String.fromCharCode(c)
  }
  name = name.replace(/ +$/, '')

  const effects: DecodedEffect[] = BITS.map((fx) => {
    const values = fx.map((spans) => getBits(msg, spans))
    return { on: values[0] === 1, id: values[1], params: values.slice(2) }
  })

  const focusBits = ((msg[88] & 0x40) >> 6) + ((msg[85] & 0x10) >> 3)
  return {
    name,
    effects,
    maxFx: (msg[MAX_FX_OFFSET] & 0x1c) >> 2,
    focus: 3 - focusBits,
    dspFull: msg[DSP_OFFSET] & 0x3f,
    raw: Uint8Array.from(msg as ArrayLike<number>),
  }
}
