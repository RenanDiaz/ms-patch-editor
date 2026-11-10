/** Time display (g200kg `disp:{type:"Time",min,max,list}`): shown = raw + min; if shown >= max, label = list[shown - max]. */
export interface TimeDisp {
  kind: 'time'
  min: number
  max: number
  list: readonly string[]
}

export type ParamRange =
  /** Raw value 0..max. */
  | { kind: 'linear'; max: number }
  /** Cabinet parameter: allowed raw values depend on firmware; see firmwareTables.ts. */
  | { kind: 'cab'; table: 'bass' | 'guitar' }

export interface ParamDef {
  name: string
  /** Default raw value (g200kg `def`). */
  def: number
  range: ParamRange
  /** Labels per raw value, numeric display offset, or time display. */
  disp?: readonly string[] | number | TimeDisp
  /** Display ratio for numeric offset: shown = raw * dispr + disp (g200kg `dispr`). */
  dispr?: number
}

export interface EffectDef {
  /** 32-bit effect id as stored in the patch (fx[n][1]). */
  id: number
  name: string
  group: string
  order: number
  /** Lowest MS-60B firmware major version with this effect. 0 only for THRU. */
  minFirmware: number
  dsp: number
  dspmax: number
  dspmin: number
  params: readonly ParamDef[]
}
