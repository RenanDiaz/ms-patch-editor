/**
 * Helper text for each effect parameter: what it controls and, when the
 * source says so, which way it goes ("higher = more compression").
 * Keyed by effect id, then by parameter index (0..8, as in `EffectDef.params`).
 *
 * Source: Zoom's "Effect Types and Parameters (Ver.2)",
 * `docs/E_MS-60B_FX-list_v2.pdf` (the explanation next to each parameter).
 * Rule 4 of CLAUDE.md applies: nothing from memory; leave a parameter out if
 * the document does not explain it. Texts are written in our own words (the
 * PDF may not be reproduced), in English, one short sentence each.
 */
export interface ParamInfo {
  /** One short sentence: what the parameter does, and its direction when the document says it. */
  help: string
}

/** 834 parameters of the 142 MS-60B effects (THRU has none). Filled 2026-11-22; omissions in `docs/param-info-sources.md`. */
export const PARAM_INFO: Readonly<Record<number, Readonly<Record<number, ParamInfo>>>> = {
  // RackComp (COMP)
  2097154: {
    0: { help: 'Threshold: the level at which the compressor starts to act.' }, // THRSH
    1: { help: 'Compression ratio.' }, // Ratio
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'How fast the compressor reacts (attack).' }, // ATTCK
  },
  // M Comp (COMP)
  4194306: {
    0: { help: 'Threshold: the level at which the compressor starts to act.' }, // THRSH
    1: { help: 'Compression ratio.' }, // Ratio
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'How fast the compressor reacts (attack).' }, // ATTCK
  },
  // OptComp (COMP)
  6291458: {
    0: { help: 'Amount of compression.' }, // Drive
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'Output volume of the effect.' }, // Level
  },
  // SlowATTCK (COMP)
  1073741826: {
    0: { help: 'Attack time of the fade-in.' }, // Time
    1: { help: 'Shape of the volume rise during the fade-in.' }, // Curve
    2: { help: 'Output volume of the effect.' }, // Level
  },
  // ZNR (COMP)
  1075838978: {
    0: { help: 'Threshold: the level at which the effect starts to act.' }, // THRSH
    1: { help: 'Which signal is detected to drive the noise reduction (GtrIn or EfxIn).' }, // DETCT
    2: { help: 'Output volume of the effect.' }, // Level
  },
  // NoiseGate (COMP)
  1077936130: {
    0: { help: 'Sensitivity: how readily the effect responds to your playing.' }, // THRSH
    1: { help: 'Output volume of the effect.' }, // Level
  },
  // DirtyGate (COMP)
  1080033282: {
    0: { help: 'Sensitivity: how readily the effect responds to your playing.' }, // THRSH
    1: { help: 'Output volume of the effect.' }, // Level
  },
  // GrayComp (COMP)
  2097410: {
    0: { help: 'Amount of sustain.' }, // SUSTN
    1: { help: 'Output volume of the effect.' }, // OUT
  },
  // LineSel (FILTER)
  1048580: {
    0: { help: 'Level passed on to the next effect in the chain.' }, // EFX_L
    1: { help: 'Level sent straight to the outputs, skipping the following effects.' }, // OUT_L
  },
  // Exciter (FILTER)
  6291460: {
    0: { help: 'Amount of phase correction on the lows.' }, // Bass
    1: { help: 'Amount of phase correction on the highs.' }, // Trebl
    2: { help: 'Output volume of the effect.' }, // Level
  },
  // M-Filter (FILTER)
  2097412: {
    0: { help: 'Lowest frequency the envelope filter reaches.' }, // Freq
    1: { help: 'Sensitivity: how readily the filter responds to your playing.' }, // Sense
    2: { help: 'Strength of the resonance.' }, // Reso
    3: { help: 'Filter type: high-pass, band-pass or low-pass.' }, // Type
    4: { help: 'How much filtering is applied (2-pole or 4-pole).' }, // Chara
    5: { help: 'How fast the filter moves.' }, // VLCTY
    6: { help: 'Balance between your dry signal and the effect.' }, // Bal
    7: { help: 'Output volume of the effect.' }, // Level
  },
  // SeqFLTR (FILTER)
  6291716: {
    0: { help: 'Number of steps in the filter sequence.' }, // Step
    1: { help: 'Sequence pattern.' }, // PTTRN
    2: { help: 'Speed of the modulation.' }, // Speed
    3: { help: 'Envelope (shape) of each step.' }, // Shape
    4: { help: 'Strength of the resonance.' }, // Reso
    5: { help: 'Output volume of the effect.' }, // Level
  },
  // RndmFLTR (FILTER)
  1073742084: {
    0: { help: 'Speed of the modulation.' }, // Speed
    1: { help: 'Frequency range the filter sweeps over.' }, // Range
    2: { help: 'Strength of the filter resonance.' }, // Reso
    3: { help: 'Filter type: high-pass, band-pass or low-pass.' }, // Type
    4: { help: 'How much filtering is applied (2-pole or 4-pole).' }, // Chara
    5: { help: 'Balance between your dry signal and the effect.' }, // Bal
    6: { help: 'Output volume of the effect.' }, // Level
  },
  // fCycle (FILTER)
  1075839236: {
    0: { help: 'Speed of the modulation.' }, // Rate
    1: { help: 'Shape of the modulation waveform.' }, // Wave
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'How deep the modulation is.' }, // Depth
    4: { help: 'Strength of the filter resonance.' }, // Reso
  },
  // Tremolo (MOD)
  1048588: {
    0: { help: 'How deep the modulation is.' }, // Depth
    1: { help: 'Speed of the modulation.' }, // Rate
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'Shape of the modulation waveform.' }, // Wave
  },
  // DuoTrem (MOD)
  2097164: {
    0: { help: 'Modulation speed of LFO A.' }, // RateA
    1: { help: 'Modulation speed of LFO B.' }, // RateB
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'Modulation depth of LFO A.' }, // DPT_A
    4: { help: 'Modulation depth of LFO B.' }, // DPT_B
    5: { help: 'How the two tremolos are connected: series, parallel or stereo.' }, // Link
    6: { help: 'Waveform of LFO A.' }, // WaveA
    7: { help: 'Waveform of LFO B.' }, // WaveB
  },
  // Phaser (MOD)
  6291468: {
    0: { help: 'Speed of the modulation.' }, // Rate
    1: { help: 'Tonal voicing of the phaser.' }, // Color
    2: { help: 'Output volume of the effect.' }, // Level
  },
  // DuoPhase (MOD)
  6946828: {
    0: { help: 'Modulation speed of LFO A.' }, // RateA
    1: { help: 'Modulation speed of LFO B.' }, // RateB
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'Resonance for LFO A.' }, // ResoA
    4: { help: 'Resonance for LFO B.' }, // ResoB
    5: { help: 'How the two phasers are connected: series, parallel or stereo.' }, // Link
    6: { help: 'Modulation depth of LFO A.' }, // DPT_A
    7: { help: 'Modulation depth of LFO B.' }, // DPT_B
  },
  // WarpPhase (MOD)
  7602188: {
    0: { help: 'Speed of the modulation.' }, // Speed
    1: { help: 'Strength of the resonance.' }, // Reso
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'Direction of the warp (Go or Back).' }, // DRCTN
  },
  // TheVibe (MOD)
  1073741836: {
    0: { help: 'Speed of the modulation.' }, // Speed
    1: { help: 'How deep the modulation is.' }, // Depth
    2: { help: 'Offsets (biases) the modulation waveform.' }, // Bias
    3: { help: 'Shape of the modulation waveform.' }, // Wave
    4: { help: 'Vibrato or chorus mode.' }, // Mode
    5: { help: 'Output volume of the effect.' }, // Level
  },
  // VintageCE (MOD)
  2097420: {
    0: { help: 'Sensitivity of the built-in compressor.' }, // Comp
    1: { help: 'Speed of the modulation.' }, // Rate
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Output volume of the effect.' }, // Level
  },
  // StereoCho (MOD)
  4194572: {
    0: { help: 'How deep the modulation is.' }, // Depth
    1: { help: 'Speed of the modulation.' }, // Rate
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Tone control.' }, // Tone
    4: { help: 'Output volume of the effect.' }, // Level
  },
  // SuperCho (MOD)
  1075839244: {
    0: { help: 'How much effect is blended in with your dry signal.' }, // E.LVL
    1: { help: 'Speed of the modulation.' }, // Rate
    2: { help: 'How deep the modulation is.' }, // Depth
    3: { help: 'Tone of the effect sound.' }, // EQ
    4: { help: 'Mono or stereo (STR); in stereo the effect goes left and the unprocessed input right.' }, // Mode
  },
  // VinFLNGR (MOD)
  1076887820: {
    0: { help: 'How deep the modulation is.' }, // Depth
    1: { help: 'Speed of the modulation.' }, // Rate
    2: { help: 'Strength of the modulation resonance.' }, // Reso
    3: { help: 'Pre-delay of the effect sound.' }, // PreD
    4: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    5: { help: 'Output volume of the effect.' }, // Level
  },
  // DynaFLNGR (MOD)
  1080033548: {
    0: { help: 'How deep the modulation is.' }, // Depth
    1: { help: 'Speed of the modulation.' }, // Rate
    2: { help: 'Sensitivity: how readily the effect responds to your playing.' }, // Sense
    3: { help: 'Strength of the modulation resonance.' }, // Reso
    4: { help: 'Output volume of the effect.' }, // Level
  },
  // Vibrato (MOD)
  524: {
    0: { help: 'How deep the modulation is.' }, // Depth
    1: { help: 'Speed of the modulation.' }, // Rate
    2: { help: 'Balance between your dry signal and the effect.' }, // Bal
    3: { help: 'Tone control.' }, // Tone
    4: { help: 'Output volume of the effect.' }, // Level
  },
  // PitchSHFT (MOD)
  4194828: {
    0: { help: 'Pitch shift in semitones; 0 gives a detune effect instead.' }, // Shift
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'Balance between your dry signal and the effect.' }, // Bal
    3: { help: 'Fine pitch adjustment in cents (hundredths of a semitone).' }, // Fine
    4: { help: 'Output volume of the effect.' }, // Level
  },
  // RingMod (MOD)
  1080033804: {
    0: { help: 'Modulation frequency; changes the character a lot.' }, // Freq
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'Balance between your dry signal and the effect.' }, // Bal
    3: { help: 'Output volume of the effect.' }, // Level
  },
  // CE-Cho5 (MOD)
  780: {
    0: { help: 'How much effect is blended in with your dry signal.' }, // E.LVL
    1: { help: 'Speed of the modulation.' }, // RATE
    2: { help: 'How deep the modulation is.' }, // DEPTH
    3: { help: 'Level of the lows.' }, // LOW
    4: { help: 'Level of the highs.' }, // HIGH
    5: { help: 'Mono or stereo (STR); in stereo the effect goes left and the unprocessed input right.' }, // MODE
  },
  // CloneCho (MOD)
  2097932: {
    0: { help: 'How deep the modulation is.' }, // DEPTH
    1: { help: 'Speed of the modulation.' }, // RATE
  },
  // StonePha (MOD)
  4195084: {
    1: { help: 'Speed of the modulation.' }, // RATE
  },
  // BF FLG 2 (MOD)
  6292236: {
    0: { help: 'Delay time.' }, // MNL
    1: { help: 'How deep the modulation is.' }, // DEPTH
    2: { help: 'Speed of the modulation.' }, // RATE
    3: { help: 'Feedback amount (how much of the output is fed back).' }, // RES
  },
  // CoronaCho (MOD)
  1077936908: {
    0: { help: 'Speed of the modulation.' }, // SPEED
    1: { help: 'How deep the modulation is.' }, // DEPTH
    2: { help: 'Volume of the effect sound.' }, // FxLVL
    3: { help: 'Tone control.' }, // TONE
    4: { help: 'ON: dry signal and effect are mixed; OFF: only the effect is heard.' }, // DRY
  },
  // ANA234Cho (MOD)
  1080034060: {
    0: { help: 'How much effect is blended in with your dry signal.' }, // LEVEL
    1: { help: 'Speed of the modulation.' }, // RATE
    2: { help: 'How deep the modulation is.' }, // DEPTH
    3: { help: 'Level of the lows.' }, // LOW
    4: { help: 'Level of the highs.' }, // HIGH
    5: { help: 'Mono or stereo (STR); in stereo the effect goes left and the unprocessed input right.' }, // Mode
  },
  // CoronaTri (MOD)
  1036: {
    0: { help: 'Speed of the modulation.' }, // SPEED
    1: { help: 'How deep the modulation is.' }, // DEPTH
    2: { help: 'Volume of the effect sound.' }, // FxLVL
    3: { help: 'Tone control.' }, // TONE
    4: { help: 'ON: dry signal and effect are mixed; OFF: only the effect is heard.' }, // DRY
  },
  // BitCrush (SFX)
  2097166: {
    0: { help: 'Bit depth.' }, // Bit
    1: { help: 'Sampling rate.' }, // SMPL
    2: { help: 'Balance between your dry signal and the effect.' }, // Bal
    3: { help: 'Tone control.' }, // Tone
    4: { help: 'Output volume of the effect.' }, // Level
  },
  // Bomber (SFX)
  4194318: {
    0: { help: 'Type of explosion sound.' }, // PTTRN
    1: { help: 'Length of the explosion\'s reverberation.' }, // Deay
    2: { help: 'Balance between your dry signal and the effect.' }, // Bal
    3: { help: 'Threshold for triggering the effect.' }, // THRSH
    4: { help: 'How strong the explosion sound is.' }, // Power
    5: { help: 'Tone control.' }, // Tone
    6: { help: 'Output volume of the effect.' }, // Level
  },
  // Z-Organ (SFX)
  1073741838: {
    0: { help: 'Level of the highs.' }, // Upper
    1: { help: 'Level of the lows.' }, // Lower
    2: { help: 'Volume of your dry (unprocessed) signal.' }, // Dry
    3: { help: 'Cutoff frequency of the high-pass filter.' }, // HPF
    4: { help: 'Cutoff frequency of the low-pass filter.' }, // LPF
    5: { help: 'Output volume of the effect.' }, // Level
  },
  // AutoPan (SFX)
  1075838990: {
    0: { help: 'Speed of the modulation.' }, // Rate
    1: { help: 'Width of the panning.' }, // Width
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'How deep the modulation is.' }, // Depth
    4: { help: 'Clipping of the pan waveform; higher values make the panning more pronounced.' }, // Clip
  },
  // Rt Closet (SFX)
  1077936142: {
    0: { help: 'Balance between the rotating horn (highs) and drum (lows).' }, // Bal
    1: { help: 'Rotor speed: Slow or Fast.' }, // Mode
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'How hard the preamp drives the signal.' }, // Drive
  },
  // Delay (DELAY)
  1048592: {
    0: { help: 'Delay time.' }, // Time
    1: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'How much treble is rolled off in the repeats.' }, // HiDMP
    4: { help: 'Mono delay or ping-pong (repeats alternate left and right).' }, // P-P
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // TapeEcho (DELAY)
  2097168: {
    0: { help: 'Delay time.' }, // Time
    1: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'How much treble is rolled off in the repeats.' }, // HiDMP
    4: { help: 'Output volume of the effect.' }, // Level
    5: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // ModDelay (DELAY)
  4194320: {
    0: { help: 'Delay time.' }, // Time
    1: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Speed of the modulation.' }, // Rate
    4: { help: 'Output volume of the effect.' }, // Level
    5: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // AnalogDly (DELAY)
  6291472: {
    0: { help: 'Delay time.' }, // Time
    1: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'How much treble is rolled off in the repeats.' }, // HiDMP
    4: { help: 'Mono delay or ping-pong (repeats alternate left and right).' }, // P-P
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // ReverseDL (DELAY)
  1073741840: {
    0: { help: 'Delay time.' }, // Time
    1: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    2: { help: 'Balance between your dry signal and the effect.' }, // Bal
    3: { help: 'How much treble is rolled off in the repeats.' }, // HiDMP
    4: { help: 'Output volume of the effect.' }, // Level
    5: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // MultiTapD (DELAY)
  1075838992: {
    0: { help: 'Delay time.' }, // Time
    1: { help: 'Tap pattern; the patterns range from rhythmic to random.' }, // PTTRN
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Tone control.' }, // Tone
    4: { help: 'Output volume of the effect.' }, // Level
    5: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // DynaDelay (DELAY)
  1077936144: {
    0: { help: 'Delay time.' }, // Time
    1: { help: 'Sensitivity: how readily the effect responds to your playing.' }, // Sense
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    4: { help: 'Output volume of the effect.' }, // Level
    5: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // FilterDly (DELAY)
  1080033296: {
    0: { help: 'Delay time.' }, // Time
    1: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Speed of the modulation.' }, // Rate
    4: { help: 'How deep the modulation is.' }, // Depth
    5: { help: 'Strength of the modulation resonance.' }, // Reso
    6: { help: 'Output volume of the effect.' }, // Level
    7: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // PitchDly (DELAY)
  272: {
    0: { help: 'Delay time.' }, // Time
    1: { help: 'Pitch shift applied to the repeats.' }, // Pitch
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    4: { help: 'Tone control.' }, // Tone
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // StereoDly (DELAY)
  2097424: {
    0: { help: 'Delay time of the left channel.' }, // TimeL
    1: { help: 'Delay time of the right channel.' }, // TimeR
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Feedback (repeats) of the left-channel delay.' }, // LchFB
    4: { help: 'Feedback (repeats) of the right-channel delay.' }, // RchFB
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'Volume of the left-channel delay.' }, // LchLv
    7: { help: 'Volume of the right-channel delay.' }, // RchLv
    8: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // PhaseDly (DELAY)
  4194576: {
    0: { help: 'Delay time.' }, // Time
    1: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Speed of the modulation.' }, // Rate
    4: { help: 'Tonal voicing of the phaser.' }, // Color
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // StompDly (DELAY)
  1073742096: {
    0: { help: 'How much effect is blended in with your dry signal.' }, // E.LVL
    1: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    2: { help: 'Delay time.' }, // Time
    3: { help: 'Turns tempo sync on.' }, // Sync
    4: { help: 'Mono or stereo (STR); in stereo the effect goes left and the unprocessed input right.' }, // Mode
    5: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
    6: { help: 'How much treble is rolled off in the repeats.' }, // HiDMP
  },
  // TapeEcho3 (DELAY)
  1075839248: {
    0: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    1: { help: 'How much effect is blended in with your dry signal.' }, // MIX
    2: { help: 'Delay time.' }, // TIME
    3: { help: 'Record level onto the simulated tape.' }, // RecLv
    4: { help: 'Turns tempo sync on.' }, // SYNC
    5: { help: 'ON: the preamp keeps coloring the tone with the effect off; OFF: the input passes unchanged.' }, // P-Amp
  },
  // DualDigiD (DELAY)
  1077936400: {
    0: { help: 'Delay time of Delay A.' }, // TimeA
    1: { help: 'Delay time of Delay B.' }, // TimeB
    2: { help: 'Feedback (repeats) of Delay A.' }, // FdbkA
    3: { help: 'Feedback (repeats) of Delay B.' }, // FdbkB
    4: { help: 'Modulation depth; the M values give mono output, the S values stereo.' }, // Depth
    5: { help: 'Speed of the modulation.' }, // Speed
    6: { help: 'Tone control.' }, // FLTR
    7: { help: 'Mix between the Delay A and Delay B repeats.' }, // DlyMx
    8: { help: 'How much effect is blended in with your dry signal.' }, // Mix
  },
  // CarbonDly (DELAY)
  1080033552: {
    0: { help: 'Delay time.' }, // DELAY
    1: { help: 'Feedback amount (how much of the output is fed back).' }, // REGEN
    2: { help: 'How much effect is blended in with your dry signal.' }, // MIX
    3: { help: 'Modulation on or off.' }, // MID
    4: { help: 'Width of the modulation.' }, // WIDTH
    5: { help: 'Speed of the modulation.' }, // SPEED
    6: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
    7: { help: 'Turns tempo sync on.' }, // Sync
  },
  // DriveEcho (DELAY)
  528: {
    0: { help: 'Amount of distortion (drive).' }, // DRIVE
    1: { help: 'How much effect is blended in with your dry signal.' }, // MIX
    2: { help: 'Delay time.' }, // TIME
    3: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    4: { help: 'Amount of tape wow and flutter.' }, // WOW
    5: { help: 'DRIV: DRIVE also colors the dry signal; THRU: the dry signal passes unchanged.' }, // DRV
    6: { help: 'ON: the tail rings on after the effect is switched off, with the dry tone unchanged; OFF: it stops at once.' }, // Tail
    7: { help: 'Mono or stereo (STR) output.' }, // Mode
  },
  // SlapBackD (DELAY)
  2097680: {
    0: { help: 'Delay time.' }, // TIME
    1: { help: 'Note value of the delay time.' }, // SubDv
    2: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    3: { help: 'Volume of the effect sound.' }, // FxLVL
    4: { help: 'ON: dry signal and effect are mixed; OFF: only the effect is heard.' }, // DRY
    5: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
    6: { help: 'Mono or stereo (STR) output.' }, // Mode
  },
  // SmoothDly (DELAY)
  4194832: {
    0: { help: 'Delay time.' }, // TIME
    1: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    2: { help: 'How much effect is blended in with your dry signal.' }, // E.LVL
    3: { help: 'Tone control.' }, // TONE
    4: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // LO-FI Dly (DELAY)
  6291984: {
    0: { help: 'Delay time.' }, // TIME
    1: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    2: { help: 'How much effect is blended in with your dry signal.' }, // MIX
    3: { help: 'Sampling rate.' }, // SMPL
    4: { help: 'Bit depth.' }, // BITS
    5: { help: 'Balance between your dry signal and the lo-fi sound.' }, // BLEND
    6: { help: 'How the repeats die away (damping of the feedback).' }, // DAMP
    7: { help: 'Character of the filter on the delayed sound.' }, // FLT
    8: { help: 'Adds random noise; with the D settings the noise follows the delay repeats.' }, // VINYL
  },
  // SlwAtkDly (DELAY)
  1073742352: {
    0: { help: 'Delay time.' }, // TIME
    1: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    2: { help: 'How much effect is blended in with your dry signal.' }, // MIX
    3: { help: 'How deep the modulation is.' }, // DEPTH
    4: { help: 'Attack time of the fade-in.' }, // SWELL
    5: { help: 'MONO gives a mono chorus; STR gives a stereo vibrato.' }, // Mode
    6: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // TremDelay (DELAY)
  1075839504: {
    0: { help: 'Delay time.' }, // TIME
    1: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    2: { help: 'How much effect is blended in with your dry signal.' }, // MIX
    3: { help: 'Waveform of the tremolo.' }, // LFO
    4: { help: 'How deep the modulation is.' }, // DEPTH
    5: { help: 'Speed of the modulation.' }, // SPEED
    6: { help: 'How the repeats die away (damping of the feedback).' }, // DAMP
    7: { help: 'Limits the frequency range of the effect sound.' }, // HPF
    8: { help: 'Distortion (grit) on the delayed sound.' }, // GRIT
  },
  // FLTR PPD (DELAY)
  1077936656: {
    0: { help: 'Delay time of Delay A.' }, // TimeA
    1: { help: 'Delay time of Delay B.' }, // TimeB
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Mix between the Delay A and Delay B repeats.' }, // DlyMx
    4: { help: 'Feedback amount (how much of the output is fed back).' }, // Fdbk
    5: { help: 'Smooths the attack of the repeats.' }, // Slur
    6: { help: 'How strongly the filter is applied.' }, // FLTR
    7: { help: 'Modulation depth; the M values give mono output, the S values stereo.' }, // Depth
    8: { help: 'Modulation waveform and speed together.' }, // Wave
  },
  // A-Pan DLY (DELAY)
  1080033808: {
    0: { help: 'Delay time.' }, // Time
    1: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Speed of the movement.' }, // Rate
    4: { help: 'Width of the movement.' }, // Width
    5: { help: 'How deep the movement is.' }, // Depth
    6: { help: 'Amount of clipping applied to the movement waveform.' }, // Clip
    7: { help: 'Order of auto-pan and delay in the chain.' }, // Link
    8: { help: 'Output volume of the effect.' }, // Level
  },
  // ICE Delay (DELAY)
  784: {
    0: { help: 'Delay time.' }, // TIME
    1: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    2: { help: 'How much effect is blended in with your dry signal.' }, // MIX
    3: { help: 'Pitch interval applied to the audio slices.' }, // INTVL
    4: { help: 'Length of the audio slices.' }, // SLICE
    5: { help: 'Balance between your dry signal and the ICE (pitch-sliced) sound.' }, // BLEND
    6: { help: 'How much the attack of the repeats is smoothed out.' }, // SMEAR
    7: { help: 'How the repeats die away (damping of the feedback).' }, // DAMP
    8: { help: 'Limits the frequency range of the effect sound.' }, // HPF
  },
  // HD Hall (REVERB)
  1048594: {
    0: { help: 'Pre-delay: the gap between the note and the start of the reverb.' }, // PreD
    1: { help: 'Length of the reverb tail.' }, // Decay
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Damping of the lows in the reverb.' }, // LoDMP
    4: { help: 'Damping of the highs in the reverb.' }, // HiDMP
    5: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // HD Reverb (REVERB)
  1572882: {
    0: { help: 'Length of the reverb tail.' }, // Decay
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Pre-delay: the gap between the note and the start of the reverb.' }, // PreD
    4: { help: 'Cutoff frequency of the high-pass filter.' }, // HPF
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // Hall (REVERB)
  2097170: {
    0: { help: 'Length of the reverb tail.' }, // Decay
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Pre-delay: the gap between the note and the start of the reverb.' }, // PreD
    4: { help: 'Output volume of the effect.' }, // Level
    5: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // Room (REVERB)
  4194322: {
    0: { help: 'Length of the reverb tail.' }, // Decay
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Pre-delay: the gap between the note and the start of the reverb.' }, // PreD
    4: { help: 'Output volume of the effect.' }, // Level
    5: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // TiledRoom (REVERB)
  6291474: {
    0: { help: 'Length of the reverb tail.' }, // Decay
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Pre-delay: the gap between the note and the start of the reverb.' }, // PreD
    4: { help: 'Output volume of the effect.' }, // Level
    5: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // Spring (REVERB)
  1073741842: {
    0: { help: 'Length of the reverb tail.' }, // Decay
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Pre-delay: the gap between the note and the start of the reverb.' }, // PreD
    4: { help: 'Output volume of the effect.' }, // Level
    5: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // Arena (REVERB)
  1075838994: {
    0: { help: 'Length of the reverb tail.' }, // Decay
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Pre-delay: the gap between the note and the start of the reverb.' }, // PreD
    4: { help: 'Output volume of the effect.' }, // Level
    5: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // EarlyRef (REVERB)
  1077936146: {
    0: { help: 'Length of the reverb tail.' }, // Decay
    1: { help: 'Envelope (shape over time) of the reflections.' }, // Shape
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Tone control.' }, // Tone
    4: { help: 'Output volume of the effect.' }, // Level
    5: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // Air (REVERB)
  1080033298: {
    0: { help: 'Size of the space.' }, // Size
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'How much sound reflects off the walls.' }, // Ref
    4: { help: 'Output volume of the effect.' }, // Level
    5: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // Plate (REVERB)
  2097426: {
    0: { help: 'Pre-delay: the gap between the note and the start of the reverb.' }, // PreD
    1: { help: 'Length of the reverb tail.' }, // Decay
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Reverb time of the lows.' }, // Color
    4: { help: 'Damping of the lows in the reverb.' }, // LoDMP
    5: { help: 'Damping of the highs in the reverb.' }, // HiDMP
    6: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
    7: { help: 'Output volume of the effect.' }, // Level
  },
  // ModReverb (REVERB)
  4194578: {
    0: { help: 'How deep the modulation is.' }, // Depth
    1: { help: 'Length of the reverb tail.' }, // Decay
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Speed of the modulation.' }, // Rate
    4: { help: 'Tone control.' }, // Tone
    5: { help: 'Pre-delay: the gap between the note and the start of the reverb.' }, // PreD
    6: { help: 'Output volume of the effect.' }, // Level
    7: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // SlapBack (REVERB)
  6291730: {
    0: { help: 'Delay time.' }, // Time
    1: { help: 'Length of the reverb tail.' }, // Decay
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    4: { help: 'Tone control.' }, // Tone
    5: { help: 'Balance between the delay and the reverb.' }, // DRBal
    6: { help: 'Output volume of the effect.' }, // Level
    7: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // Spring63 (REVERB)
  1073742098: {
    0: { help: 'How much signal is fed into the reverb.' }, // DWELL
    1: { help: 'How much reverb is mixed into the output.' }, // MIXER
    2: { help: 'Tone control.' }, // TONE
    3: { help: 'Output volume of the effect.' }, // LEVEL
  },
  // Chamber (REVERB)
  1075839250: {
    0: { help: 'Length of the reverb tail.' }, // Decay
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Pre-delay: the gap between the note and the start of the reverb.' }, // PreD
    4: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // LOFI Rev (REVERB)
  1077936402: {
    0: { help: 'Length of the reverb tail.' }, // DECAY
    1: { help: 'Tone control.' }, // TONE
    2: { help: 'Volume of the effect sound.' }, // FxLVL
    3: { help: 'Pre-delay: the gap between the note and the start of the reverb.' }, // PreD
    4: { help: 'ON: the tail rings on after the effect is switched off, with the dry tone unchanged; OFF: it stops at once.' }, // Tail
    5: { help: 'ON: dry signal and effect are mixed; OFF: only the effect is heard.' }, // Dry
  },
  // Church (REVERB)
  1080033554: {
    0: { help: 'Length of the reverb tail.' }, // DECAY
    1: { help: 'Pre-delay: the gap between the note and the start of the reverb.' }, // PreD
    2: { help: 'How much effect is blended in with your dry signal.' }, // MIX
    3: { help: 'Tone control.' }, // TONE
    4: { help: 'Damping of the highs in the reverb.' }, // HiDMP
    5: { help: 'ON: the tail rings on after the effect is switched off, with the dry tone unchanged; OFF: it stops at once.' }, // Tail
    6: { help: 'ON: dry signal and effect are mixed; OFF: only the effect is heard.' }, // Dry
  },
  // Cave (REVERB)
  530: {
    0: { help: 'Length of the reverb tail.' }, // Decay
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Pre-delay: the gap between the note and the start of the reverb.' }, // PreD
    4: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // Ambience (REVERB)
  2097682: {
    0: { help: 'Length of the reverb tail.' }, // DECAY
    1: { help: 'Tone control.' }, // TONE
    2: { help: 'How much effect is blended in with your dry signal.' }, // MIX
    3: { help: 'Pre-delay: the gap between the note and the start of the reverb.' }, // PreD
    4: { help: 'ON: the tail rings on after the effect is switched off, with the dry tone unchanged; OFF: it stops at once.' }, // Tail
    5: { help: 'ON: dry signal and effect are mixed; OFF: only the effect is heard.' }, // Dry
  },
  // GateRev (REVERB)
  4194834: {
    0: { help: 'How much effect is blended in with your dry signal.' }, // Level
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'Length of the reverb tail.' }, // Decay
    3: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
    4: { help: 'ON: dry signal and effect are mixed; OFF: only the effect is heard.' }, // Dry
  },
  // ReverseRv (REVERB)
  6291986: {
    0: { help: 'How much effect is blended in with your dry signal.' }, // Level
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'Length of the reverb tail.' }, // Decay
    3: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
    4: { help: 'ON: dry signal and effect are mixed; OFF: only the effect is heard.' }, // Dry
  },
  // Echo (REVERB)
  1073742354: {
    0: { help: 'Length of the reverb tail.' }, // DECAY
    1: { help: 'Pre-delay: the gap between the note and the start of the reverb.' }, // TIME
    2: { help: 'Tone control.' }, // TONE
    3: { help: 'How much effect is blended in with your dry signal.' }, // MIX
    4: { help: 'ON: the tail rings on after the effect is switched off, with the dry tone unchanged; OFF: it stops at once.' }, // Tail
    5: { help: 'Mono or stereo (STR) output.' }, // Mode
  },
  // TremoloRv (REVERB)
  1075839506: {
    0: { help: 'Length of the reverb tail.' }, // Decay
    1: { help: 'Pre-delay: the gap between the note and the start of the reverb.' }, // PDLY
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Speed of the modulation.' }, // Speed
    4: { help: 'Shape of the modulation waveform.' }, // Shape
    5: { help: 'Modulation depth; the MN values modulate in mono, the ST values in stereo.' }, // Depth
    6: { help: 'Size of the reverb space.' }, // Size
    7: { help: 'Level of the lows.' }, // Low
    8: { help: 'Level of the highs.' }, // High
  },
  // HolyFLERB (REVERB)
  1077936658: {
    0: { help: 'How much effect is blended in with your dry signal.' }, // RVRB
    1: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // DynaRev (REVERB)
  1080033810: {
    0: { help: 'Length of the reverb tail.' }, // Decay
    1: { help: 'Pre-delay: the gap between the note and the start of the reverb.' }, // PreD
    2: { help: 'Tone control.' }, // Color
    3: { help: 'Sensitivity: how readily the effect responds to your playing.' }, // Sense
    4: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    5: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // Ba Chorus (MOD)
  1081081868: {
    0: { help: 'How deep the modulation is.' }, // Depth
    1: { help: 'Speed of the modulation.' }, // Rate
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Low cut on the effect sound: frequency below which it is removed.' }, // LoCut
    4: { help: 'Output volume of the effect.' }, // Level
    5: { help: 'Pre-delay on or off.' }, // PreD
  },
  // Ba Detune (MOD)
  1048844: {
    0: { help: 'Detune amount in cents (hundredths of a semitone).' }, // Cent
    1: { help: 'Pre-delay of the effect sound.' }, // PreD
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Tone control.' }, // Tone
    4: { help: 'Output volume of the effect.' }, // Level
    5: { help: 'Low cut on the effect sound: frequency below which it is removed.' }, // LoCut
  },
  // Ba Ensmbl (MOD)
  7340300: {
    0: { help: 'How deep the modulation is.' }, // Depth
    1: { help: 'Speed of the modulation.' }, // Rate
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Tone control.' }, // Tone
    4: { help: 'Output volume of the effect.' }, // Level
  },
  // BaFlanger (MOD)
  1078984972: {
    0: { help: 'How deep the modulation is.' }, // Depth
    1: { help: 'Speed of the modulation.' }, // Rate
    2: { help: 'Strength of the modulation resonance.' }, // Reso
    3: { help: 'Pre-delay of the effect sound.' }, // PreD
    4: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'Low cut on the effect sound: frequency below which it is removed.' }, // LoCut
  },
  // Ba Octave (MOD)
  3146252: {
    0: { help: 'Volume of the added note one octave down.' }, // Oct
    1: { help: 'Volume of your dry (unprocessed) signal.' }, // Dry
    2: { help: 'Tone of the added octave-down note.' }, // Tone
    3: { help: 'Bass (low frequency) level.' }, // Low
    4: { help: 'Midrange level.' }, // Mid
    5: { help: 'Output volume of the effect.' }, // Level
  },
  // Ba Pitch (MOD)
  7340556: {
    0: { help: 'Pitch shift in semitones; 0 gives a detune effect instead.' }, // Shift
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'Balance between your dry signal and the effect.' }, // Bal
    3: { help: 'Fine pitch adjustment in cents (hundredths of a semitone).' }, // Fine
    4: { help: 'Output volume of the effect.' }, // Level
  },
  // ModDelay2 (DELAY)
  5242896: {
    0: { help: 'Delay time.' }, // Time
    1: { help: 'Feedback amount (how much of the output is fed back).' }, // F.B
    2: { help: 'How much effect is blended in with your dry signal.' }, // Mix
    3: { help: 'Speed of the modulation.' }, // Rate
    4: { help: 'Output volume of the effect.' }, // Level
    5: { help: 'How deep the modulation is.' }, // Depth
    6: { help: 'ON: the effect tail rings on after the effect is switched off; OFF: it stops at once.' }, // Tail
  },
  // St Bs GEQ (FILTER)
  516: {
    0: { help: 'Boost or cut at 50 Hz.' }, // 50Hz
    1: { help: 'Boost or cut at 120 Hz.' }, // 120Hz
    2: { help: 'Boost or cut at 400 Hz.' }, // 400Hz
    3: { help: 'Boost or cut at 500 Hz.' }, // 500Hz
    4: { help: 'Boost or cut at 800 Hz.' }, // 800Hz
    5: { help: 'Boost or cut at 4.5 kHz.' }, // 4.5kHz
    6: { help: 'Boost or cut at 10 kHz.' }, // 10kHz
    7: { help: 'Output volume of the effect.' }, // Level
  },
  // 160 Comp (COMP)
  6946818: {
    0: { help: 'Threshold: the level at which the effect starts to act.' }, // THRSH
    1: { help: 'Compression ratio.' }, // Ratio
    2: { help: 'Makeup gain applied after compression.' }, // Gain
    3: { help: 'Knee: hard or soft onset of compression.' }, // Knee
    4: { help: 'Output volume of the effect.' }, // Level
  },
  // Limiter (COMP)
  7602178: {
    0: { help: 'Threshold: the level above which the limiter acts.' }, // THRSH
    1: { help: 'Limiting ratio.' }, // Ratio
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'Release: how long the limiter holds after the signal drops below the threshold.' }, // REL
  },
  // DualComp (COMP)
  4194562: {
    0: { help: 'Compression amount for the high band.' }, // Hi
    1: { help: 'Compression amount for the low band.' }, // Lo
    2: { help: 'Frequency where the signal is split into the high and low bands.' }, // Freq
    3: { help: 'Output volume of the effect.' }, // Level
    4: { help: 'Tone of the sound.' }, // Tone
  },
  // Ba GEQ (FILTER)
  3145732: {
    0: { help: 'Boost or cut at 50 Hz.' }, // 50Hz
    1: { help: 'Boost or cut at 120 Hz.' }, // 120Hz
    2: { help: 'Boost or cut at 400 Hz.' }, // 400Hz
    3: { help: 'Boost or cut at 500 Hz.' }, // 500Hz
    4: { help: 'Boost or cut at 800 Hz.' }, // 800Hz
    5: { help: 'Boost or cut at 4.5 kHz.' }, // 4.5kHz
    6: { help: 'Boost or cut at 10 kHz.' }, // 10kHz
    7: { help: 'Output volume of the effect.' }, // Level
  },
  // Ba PEQ (FILTER)
  4718596: {
    0: { help: 'Center frequency of EQ band 1.' }, // Freq1
    1: { help: 'Width (Q) of EQ band 1.' }, // Q1
    2: { help: 'Boost or cut of EQ band 1.' }, // Gain1
    3: { help: 'Center frequency of EQ band 2.' }, // Freq2
    4: { help: 'Width (Q) of EQ band 2.' }, // Q2
    5: { help: 'Boost or cut of EQ band 2.' }, // Gain2
    6: { help: 'Output volume of the effect.' }, // Level
  },
  // Splitter (FILTER)
  5242884: {
    0: { help: 'Level of the high band in the mix.' }, // Hi
    1: { help: 'Level of the low band in the mix.' }, // Lo
    2: { help: 'Frequency where the signal is split into the high and low bands.' }, // Freq
    3: { help: 'Output volume of the effect.' }, // Level
  },
  // Bottom B (FILTER)
  5767172: {
    0: { help: 'How much the lows are boosted.' }, // Bass
    1: { help: 'How much the highs are boosted.' }, // Trebl
    2: { help: 'Output volume of the effect.' }, // Level
  },
  // BaAutoWah (FILTER)
  1076887556: {
    0: { help: 'Sensitivity: how readily the effect responds to your playing.' }, // Sense
    1: { help: 'Strength of the filter resonance.' }, // Reso
    2: { help: 'Volume of your dry (unprocessed) signal.' }, // Dry
    3: { help: 'Output volume of the effect.' }, // Level
  },
  // Z Tron (FILTER)
  1048836: {
    0: { help: 'Sensitivity: how readily the effect responds to your playing.' }, // Sense
    1: { help: 'Strength of the filter resonance.' }, // Reso
    2: { help: 'Volume of your dry (unprocessed) signal.' }, // Dry
    3: { help: 'Output volume of the effect.' }, // Level
  },
  // A-Filter (FILTER)
  2752772: {
    0: { help: 'Sensitivity: how readily the effect responds to your playing.' }, // Sense
    1: { help: 'Filter Q (how sharp the peak is).' }, // Peak
    2: { help: 'Whether the filter sweeps up or down.' }, // Mode
    3: { help: 'Volume of your dry (unprocessed) signal.' }, // Dry
    4: { help: 'Output volume of the effect.' }, // Level
  },
  // Ba Cry (FILTER)
  3408132: {
    0: { help: 'Frequency range the effect works on.' }, // Range
    1: { help: 'Strength of the resonance.' }, // Reso
    2: { help: 'Sensitivity: how readily the effect responds to your playing.' }, // Sense
    3: { help: 'Balance between your dry signal and the effect.' }, // Bal
    4: { help: 'Output volume of the effect.' }, // Level
  },
  // D Comp (COMP)
  3145730: {
    0: { help: 'Sensitivity: how readily the effect responds to your playing.' }, // Sense
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'Compressor attack: Fast or Slow.' }, // ATTCK
  },
  // Ba Boost (DRIVE)
  2097176: {
    0: { help: 'Gain (drive) amount.' }, // Gain
    1: { help: 'Bass (low frequency) level.' }, // Bass
    2: { help: 'Treble (high frequency) level.' }, // Trebl
    3: { help: 'Output volume of the effect.' }, // Level
  },
  // Bass OD (DRIVE)
  4194328: {
    0: { help: 'Gain (drive) amount.' }, // Gain
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'Balance between your dry signal and the processed signal.' }, // Bal
  },
  // Bass Muff (DRIVE)
  6291480: {
    0: { help: 'Gain (drive) amount.' }, // Gain
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'Distortion mode.' }, // Mode
    4: { help: 'Balance between your dry signal and the processed signal.' }, // Bal
  },
  // Ba Dist 1 (DRIVE)
  1075839000: {
    0: { help: 'Gain (drive) amount.' }, // Gain
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'Balance between your dry signal and the processed signal.' }, // Bal
  },
  // Ba Metal (DRIVE)
  2097432: {
    0: { help: 'Gain (drive) amount.' }, // Gain
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'Balance between your dry signal and the processed signal.' }, // Bal
  },
  // TS+DRY (DRIVE)
  4194584: {
    0: { help: 'Gain (drive) amount.' }, // Gain
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'Balance between your dry signal and the processed signal.' }, // Bal
  },
  // Ba Squeak (DRIVE)
  6291736: {
    0: { help: 'Gain (drive) amount.' }, // Gain
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'Balance between your dry signal and the processed signal.' }, // Bal
  },
  // BaFzSmile (DRIVE)
  1073742104: {
    0: { help: 'Gain (drive) amount.' }, // Gain
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'Balance between your dry signal and the processed signal.' }, // Bal
  },
  // BassDrive (DRIVE)
  2097178: {
    0: { help: 'Bass (low frequency) level.' }, // Bass
    1: { help: 'Treble (high frequency) level.' }, // Trebl
    2: { help: 'Presence (very high frequency) level.' }, // Prese
    3: { help: 'Gain (drive) amount.' }, // Gain
    4: { help: 'Balance between your dry signal and the processed signal.' }, // Blend
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'Midrange level.' }, // Mid
  },
  // D.I Plus (DRIVE)
  4194330: {
    0: { help: 'Bass (low frequency) level.' }, // Bass
    1: { help: 'Midrange level.' }, // Mid
    2: { help: 'Treble (high frequency) level.' }, // Trebl
    3: { help: 'Gain (drive) amount.' }, // Gain
    4: { help: 'Balance between your dry signal and the processed signal.' }, // Blend
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'Preset EQ on or off.' }, // Color
    7: { help: 'Clean or distortion channel.' }, // CHAN
  },
  // Bass BB (DRIVE)
  6291482: {
    0: { help: 'Gain (drive) amount.' }, // Gain
    1: { help: 'Bass (low frequency) level.' }, // Bass
    2: { help: 'Treble (high frequency) level.' }, // Trebl
    3: { help: 'Balance between your dry signal and the processed signal.' }, // Blend
    4: { help: 'Output volume of the effect.' }, // Level
  },
  // DI5 (DRIVE)
  1073741850: {
    0: { help: 'Gain (drive) amount.' }, // Gain
    1: { help: 'Tone control.' }, // Tone
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'When on, cuts the high frequencies.' }, // HiCut
  },
  // Bass Pre (DRIVE)
  1075839002: {
    0: { help: 'Bass (low frequency) level.' }, // Bass
    1: { help: 'Treble (high frequency) level.' }, // Treble
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'Midrange level.' }, // Mid
    4: { help: 'Center frequency of the Mid control.' }, // Freq
  },
  // AC Bs Pre (DRIVE)
  1077936154: {
    0: { help: 'Gain (drive) amount.' }, // Gain
    1: { help: 'Bass (low frequency) level.' }, // Depth
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'Bass (low frequency) level.' }, // Bass
    4: { help: 'Low-mid level.' }, // L-Mid
    5: { help: 'Center frequency of the low-mid band.' }, // LM_F
    6: { help: 'Midrange level.' }, // Mid
    7: { help: 'High-mid level.' }, // H-Mid
    8: { help: 'Treble (high frequency) level.' }, // Trebl
  },
  // SVT (AMP)
  2097162: {
    0: { help: 'Bass (low frequency) level.' }, // Bass
    1: { help: 'Midrange level.' }, // Mid
    2: { help: 'Treble (high frequency) level.' }, // Trebl
    3: { help: 'Center frequency of the Mid control.' }, // Mid_F
    4: { help: 'Gain (drive) amount.' }, // Gain
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'Emphasizes the lows, the highs or both.' }, // Ultra
    7: { help: 'Speaker cabinet model (see Table 1 in Zoom\'s effect list).' }, // CAB
    8: { help: 'Blend between the preamp-only signal and the signal through the cabinet.' }, // Mix
  },
  // B-Man (AMP)
  4194314: {
    0: { help: 'Bass (low frequency) level.' }, // Bass
    1: { help: 'Midrange level.' }, // Mid
    2: { help: 'Treble (high frequency) level.' }, // Trebl
    3: { help: 'Center frequency of the Mid control.' }, // Mid_F
    4: { help: 'Gain (drive) amount.' }, // Gain
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'Changes the low-end character when on.' }, // Deep
    7: { help: 'Speaker cabinet model (see Table 1 in Zoom\'s effect list).' }, // CAB
    8: { help: 'Blend between the preamp-only signal and the signal through the cabinet.' }, // Mix
  },
  // HRT3500 (AMP)
  6291466: {
    0: { help: 'Bass (low frequency) level.' }, // Bass
    1: { help: 'Midrange level.' }, // Mid
    2: { help: 'Treble (high frequency) level.' }, // Trebl
    3: { help: 'Center frequency of the Mid control.' }, // Mid_F
    4: { help: 'Blend between tube-type and transistor-type sound.' }, // Tube
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'Amount of compression applied.' }, // Comp
    7: { help: 'Speaker cabinet model (see Table 1 in Zoom\'s effect list).' }, // CAB
    8: { help: 'Blend between the preamp-only signal and the signal through the cabinet.' }, // Mix
  },
  // acoustic (AMP)
  1077936138: {
    0: { help: 'Bass (low frequency) level.' }, // Bass
    1: { help: 'Midrange level.' }, // Mid
    2: { help: 'Treble (high frequency) level.' }, // Trebl
    3: { help: 'Center frequency of the Mid control.' }, // Mid_F
    4: { help: 'Gain (drive) amount.' }, // Gain
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'When on, boosts the high frequencies.' }, // Bright
    7: { help: 'Speaker cabinet model (see Table 1 in Zoom\'s effect list).' }, // CAB
    8: { help: 'Blend between the preamp-only signal and the signal through the cabinet.' }, // Mix
  },
  // Ag Amp (AMP)
  1080033290: {
    0: { help: 'Bass (low frequency) level.' }, // Bass
    1: { help: 'Midrange level.' }, // Mid
    2: { help: 'Treble (high frequency) level.' }, // Trebl
    3: { help: 'Center frequency of the Mid control.' }, // Mid_F
    4: { help: 'Gain (drive) amount.' }, // Gain
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'Chooses one of four preset tone voicings.' }, // Char
    7: { help: 'Speaker cabinet model (see Table 1 in Zoom\'s effect list).' }, // CAB
    8: { help: 'Blend between the preamp-only signal and the signal through the cabinet.' }, // Mix
  },
  // Mark B (AMP)
  1073742090: {
    0: { help: 'Bass (low frequency) level.' }, // Bass
    1: { help: 'Midrange level.' }, // Mid
    2: { help: 'Treble (high frequency) level.' }, // Trebl
    3: { help: 'Center frequency of the Mid control.' }, // Mid_F
    4: { help: 'Gain (drive) amount.' }, // Gain
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'Shapes the lows and highs together.' }, // Color
    7: { help: 'Speaker cabinet model (see Table 1 in Zoom\'s effect list).' }, // CAB
    8: { help: 'Blend between the preamp-only signal and the signal through the cabinet.' }, // Mix
  },
  // SMR (AMP)
  1073741834: {
    0: { help: 'Bass (low frequency) level.' }, // Bass
    1: { help: 'Midrange level.' }, // Mid
    2: { help: 'Treble (high frequency) level.' }, // Trebl
    3: { help: 'Center frequency of the Mid control.' }, // Mid_F
    4: { help: 'Gain (drive) amount.' }, // Gain
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'Tone control whose frequency and amount both change with the knob position.' }, // ENHNC
    7: { help: 'Speaker cabinet model (see Table 1 in Zoom\'s effect list).' }, // CAB
    8: { help: 'Blend between the preamp-only signal and the signal through the cabinet.' }, // Mix
  },
  // Flip Top (AMP)
  1075838986: {
    0: { help: 'Bass (low frequency) level.' }, // Bass
    1: { help: 'Midrange level.' }, // Mid
    2: { help: 'Treble (high frequency) level.' }, // Trebl
    3: { help: 'Center frequency of the Mid control.' }, // Mid_F
    4: { help: 'Gain (drive) amount.' }, // Gain
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'Emphasizes the lows, the highs or both.' }, // Ultra
    7: { help: 'Speaker cabinet model (see Table 1 in Zoom\'s effect list).' }, // CAB
    8: { help: 'Blend between the preamp-only signal and the signal through the cabinet.' }, // Mix
  },
  // Monotone (AMP)
  266: {
    0: { help: 'Bass (low frequency) level.' }, // Bass
    1: { help: 'Midrange level.' }, // Mid
    2: { help: 'Treble (high frequency) level.' }, // Trebl
    3: { help: 'Center frequency of the Mid control.' }, // Mid_F
    4: { help: 'Gain (drive) amount.' }, // Gain
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'Chooses one of three preset tone voicings.' }, // Char
    7: { help: 'Speaker cabinet model (see Table 1 in Zoom\'s effect list).' }, // CAB
    8: { help: 'Blend between the preamp-only signal and the signal through the cabinet.' }, // Mix
  },
  // SuperB (AMP)
  2097418: {
    0: { help: 'Bass (low frequency) level.' }, // Bass
    1: { help: 'Midrange level.' }, // Mid
    2: { help: 'Treble (high frequency) level.' }, // Trebl
    3: { help: 'Center frequency of the Mid control.' }, // Mid_F
    4: { help: 'Gain (drive) amount.' }, // Gain
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'Presence (very high frequency) level.' }, // Prese
    7: { help: 'Speaker cabinet model (see Table 1 in Zoom\'s effect list).' }, // CAB
    8: { help: 'Blend between the preamp-only signal and the signal through the cabinet.' }, // Mix
  },
  // G-Krueger (AMP)
  4194570: {
    0: { help: 'Bass (low frequency) level.' }, // Bass
    1: { help: 'Midrange level.' }, // Mid
    2: { help: 'Treble (high frequency) level.' }, // Trebl
    3: { help: 'Center frequency of the Mid control.' }, // Mid_F
    4: { help: 'Gain (drive) amount.' }, // Gain
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'Chooses a preset tone voicing.' }, // Color
    7: { help: 'Speaker cabinet model (see Table 1 in Zoom\'s effect list).' }, // CAB
    8: { help: 'Blend between the preamp-only signal and the signal through the cabinet.' }, // Mix
  },
  // Heaven (AMP)
  6291722: {
    0: { help: 'Bass (low frequency) level.' }, // Bass
    1: { help: 'Midrange level.' }, // Mid
    2: { help: 'Treble (high frequency) level.' }, // Trebl
    3: { help: 'Center frequency of the Mid control.' }, // Mid_F
    4: { help: 'Gain (drive) amount.' }, // Gain
    5: { help: 'Output volume of the effect.' }, // Level
    6: { help: 'Tone control whose frequency and amount both change with the knob position.' }, // ENHNC
    7: { help: 'Speaker cabinet model (see Table 1 in Zoom\'s effect list).' }, // CAB
    8: { help: 'Blend between the preamp-only signal and the signal through the cabinet.' }, // Mix
  },
  // Ba Synth (SFX)
  7340046: {
    0: { help: 'How fast the synth sound changes (decay).' }, // Decay
    1: { help: 'Synth waveform: Saw, Pulse (square) or PWM (fatter).' }, // Wave
    2: { help: 'Strength of the synth character (resonance).' }, // Reso
    3: { help: 'Volume of the synth sound.' }, // Synth
    4: { help: 'Volume of your dry (unprocessed) signal.' }, // Dry
    5: { help: 'Output volume of the effect.' }, // Level
  },
  // StdSyn (SFX)
  1080033294: {
    0: { help: 'How sensitive the synth is to your notes (trigger).' }, // Sense
    1: { help: 'Chooses a synth sound variation.' }, // Sound
    2: { help: 'Tone of the sound.' }, // Tone
    3: { help: 'Volume of the synth sound.' }, // Synth
    4: { help: 'Volume of your dry (unprocessed) signal.' }, // Dry
    5: { help: 'Output volume of the effect.' }, // Level
  },
  // SynTlk (SFX)
  270: {
    0: { help: 'How fast the synth sound changes (decay).' }, // Decay
    1: { help: 'Chooses the vowel sound.' }, // Type
    2: { help: 'Tone of the sound.' }, // Tone
    3: { help: 'Volume of the synth sound.' }, // Synth
    4: { help: 'Volume of your dry (unprocessed) signal.' }, // Dry
    5: { help: 'Output volume of the effect.' }, // Level
  },
  // Z-Syn (SFX)
  2097422: {
    0: { help: 'Synth waveform.' }, // Wave
    1: { help: 'Speed of the tone modulation.' }, // Decay
    2: { help: 'Tone control.' }, // Tone
    3: { help: 'Cutoff frequency of the low-pass filter.' }, // Freq
    4: { help: 'How far the filter cutoff is swept.' }, // Range
    5: { help: 'Strength of the filter resonance.' }, // Reso
    6: { help: 'Volume of the synth sound.' }, // Synth
    7: { help: 'Volume of your dry (unprocessed) signal.' }, // Dry
    8: { help: 'Output volume of the effect.' }, // Level
  },
  // Defret (SFX)
  4194574: {
    0: { help: 'Sensitivity: how readily the effect responds to your playing.' }, // Sense
    1: { help: 'Harmonic content; higher values give a stronger fretless character.' }, // Color
    2: { help: 'Output volume of the effect.' }, // Level
    3: { help: 'Tone of the sound.' }, // Tone
  },
  // V-Syn (SFX)
  1073742094: {
    0: { help: 'How fast the synth sound changes (decay).' }, // Decay
    1: { help: 'How sensitive the synth is to your notes (trigger).' }, // Sense
    2: { help: 'How far the filter shifts.' }, // Range
    3: { help: 'Volume of the synth sound.' }, // Synth
    4: { help: 'Volume of your dry (unprocessed) signal.' }, // Dry
    5: { help: 'Output volume of the effect.' }, // Level
  },
  // 4VoiceSyn (SFX)
  1075839246: {
    0: { help: 'Attack of the synth sound.' }, // ATTCK
    1: { help: 'Harmony type, 1 to 9 (see Table 2 in Zoom\'s effect list).' }, // Mode
    2: { help: 'One of two variations of the chosen harmony mode (see Table 2 in Zoom\'s effect list).' }, // Scale
    3: { help: 'Volume of the synth sound.' }, // Synth
    4: { help: 'Volume of your dry (unprocessed) signal.' }, // Dry
    5: { help: 'Output volume of the effect.' }, // Level
  },
}

export const paramInfo = (effectId: number, index: number): ParamInfo | undefined => PARAM_INFO[effectId]?.[index]
