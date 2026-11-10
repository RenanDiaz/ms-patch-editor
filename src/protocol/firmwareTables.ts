/*
 * Firmware-dependent tables for the MS-60B.
 *
 * Ported from index.html of g200kg/zoom-ms-utility
 * (commit 5bf930c8e1622b0c70c0c3d761424f84955a227a), `bampcab` (lines 85-94),
 * and its use in MidiIf.recv (lines 218-223): table index = (firmware >= 2) ? 1 : 0.
 *
 * MIT License
 * Copyright (c) 2017 — zoom-ms-utility by g200kg (original LICENSE names no holder)
 * See THIRD_PARTY_NOTICES.md for the full license text.
 */

export interface CabTable {
  /** Allowed raw values, in display order. */
  values: readonly number[]
  labels: readonly string[]
}

/** Bass-amp CAB parameter. index.html `bampcab`. */
export const BASS_CAB: readonly [CabTable, CabTable] = [
  { // ver 1.00
    values: [16, 32, 48, 96, 112, 192, 0],
    labels: ['AG 8x10', 'BM 4x12', 'HA 4x10', 'AC 1x18', 'AL 4x10', 'MB 1x12', 'OFF'],
  },
  { // ver 2.00
    values: [16, 32, 48, 96, 112, 192, 64, 80, 128, 144, 160, 176, 0],
    labels: ['AG 8x10', 'BM 4x12', 'HA 4x10', 'AC 1x18', 'AL 4x10', 'MB 1x12', 'SWR 4x10', 'AG 1x15', 'PT 1x15', 'SB 4x12', 'GK 4x10', 'E 4x10', 'OFF'],
  },
]

export function bassCabTable(firmware: number): CabTable {
  return BASS_CAB[firmware >= 2 ? 1 : 0]
}
