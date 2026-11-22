/**
 * Helper texts for each effect, shown next to the pedal's own (abbreviated)
 * effect name. Keyed by effect id (see `src/protocol/effects60b.generated.ts`).
 *
 * Source: Zoom's "Effect Types and Parameters (Ver.2)",
 * `docs/E_MS-60B_FX-list_v2.pdf`, cross-checked with g200kg's `effectslist.js`
 * (`title` field). Rule 4 of CLAUDE.md applies: nothing from memory; leave a
 * field out if the documents do not support it. Descriptions are written in
 * our own words (the PDF may not be reproduced). How the data was extracted
 * and what was left out: `docs/effect-info-sources.md`.
 *
 * Manufacturer and product names in `reference` and `description` are
 * trademarks or registered trademarks of their respective owners. As in
 * Zoom's own document, they are used only to describe the sound of an effect
 * and imply no affiliation with or endorsement by those owners.
 *
 * Search (effect picker) matches the pedal name, `fullName`, `reference` and
 * `aliases`, plus the category; never `description`.
 */
export interface EffectInfo {
  /** Unabbreviated name, e.g. "Bass Drive" for "BassDrive". Only when the abbreviation is not self-evident or the document gives it. */
  fullName?: string
  /** The real device it models or is in the style of, as named in the documents, e.g. "Ampeg SVT". */
  reference?: string
  /** Extra search terms that are not in the name, e.g. "delay" for "AnalogDly". */
  aliases?: string[]
  /** One short sentence: what it does / how it sounds. Not used for search. */
  description?: string
}

/** All 142 MS-60B effects (THRU has no entry). Filled 2026-11-22. */
export const EFFECT_INFO: Readonly<Record<number, EffectInfo>> = {
  // RackComp (COMP)
  2097154: {
    aliases: ['compressor'],
    description: 'A compressor with more detailed controls than the basic compressors.',
  },
  // M Comp (COMP)
  4194306: {
    aliases: ['compressor'],
    description: 'A compressor voiced for a more natural, transparent result.',
  },
  // OptComp (COMP)
  6291458: {
    reference: 'APHEX Punch FACTORY',
    aliases: ['compressor'],
    description: 'Compressor in the manner of the APHEX Punch FACTORY.',
  },
  // SlowATTCK (COMP)
  1073741826: {
    fullName: 'Slow Attack',
    aliases: ['volume swell', 'violin'],
    description: 'Softens the start of every note so it fades in, for a bowed, violin-like feel.',
  },
  // ZNR (COMP)
  1075838978: {
    fullName: 'ZOOM Noise Reduction',
    aliases: ['noise reduction', 'noise gate'],
    description: "Zoom's own noise reduction: removes noise when you stop playing, without changing your tone.",
  },
  // NoiseGate (COMP)
  1077936130: {
    fullName: 'Noise Gate',
    aliases: ['noise reduction'],
    description: 'Mutes the signal while you are not playing.',
  },
  // DirtyGate (COMP)
  1080033282: {
    aliases: ['noise gate', 'vintage'],
    description: 'Vintage-flavored gate with its own distinctive way of shutting off.',
  },
  // OrangeLim (COMP)
  258: {
    reference: 'ORANGE SQUEEZER',
    aliases: ['compressor', 'limiter'],
    description: 'Compressor modeled on the ORANGE SQUEEZER.',
  },
  // GrayComp (COMP)
  2097410: {
    reference: 'ROSS Compressor',
    aliases: ['compressor'],
    description: 'Compressor modeled on the ROSS Compressor.',
  },
  // LineSel (FILTER)
  1048580: {
    aliases: ['bypass', 'split'],
    description: 'When off, sends the signal straight to the outputs; when on, passes it on to the next effect.',
  },
  // Exciter (FILTER)
  6291460: {
    reference: 'BBE Sonic Maximizer',
    aliases: ['enhancer'],
    description: 'Adds clarity and definition through two-band phase correction.',
  },
  // M-Filter (FILTER)
  2097412: {
    reference: 'Moog MF-101',
    aliases: ['envelope filter', 'auto wah', 'low pass'],
    description: 'Envelope filter with the low-pass flavor of a Moog MF-101, adjustable over a wide range.',
  },
  // SeqFLTR (FILTER)
  6291716: {
    fullName: 'Sequence Filter',
    reference: 'Z.Vex Seek-Wah',
    aliases: ['step filter', 'wah'],
    description: 'Moves the filter through a stepped, rhythmic sequence.',
  },
  // RndmFLTR (FILTER)
  1073742084: {
    fullName: 'Random Filter',
    description: 'Filter whose character changes at random.',
  },
  // fCycle (FILTER)
  1075839236: {
    aliases: ['cyclic'],
    description: 'Filter that sweeps the tone back and forth in a repeating cycle.',
  },
  // Tremolo (MOD)
  1048588: {
    aliases: ['volume', 'modulation'],
    description: 'Pulses the volume up and down at a steady rate.',
  },
  // DuoTrem (MOD)
  2097164: {
    fullName: 'Duo Tremolo',
    description: 'Two tremolos combined into one effect.',
  },
  // Phaser (MOD)
  6291468: {
    aliases: ['phase'],
    description: 'Adds a sweeping, phase-shifted swirl to the sound.',
  },
  // DuoPhase (MOD)
  6946828: {
    fullName: 'Duo Phaser',
    description: 'Two phasers combined, with a choice of how they are connected.',
  },
  // WarpPhase (MOD)
  7602188: {
    aliases: ['phaser'],
    description: 'Phaser that sweeps in one direction only instead of back and forth.',
  },
  // TheVibe (MOD)
  1073741836: {
    description: 'Vibe effect with its own distinctive, undulating movement.',
  },
  // VintageCE (MOD)
  2097420: {
    reference: 'BOSS CE-1',
    aliases: ['chorus'],
    description: 'Chorus modeled on the BOSS CE-1.',
  },
  // StereoCho (MOD)
  4194572: {
    fullName: 'Stereo Chorus',
    description: 'Stereo chorus with a clear tone.',
  },
  // SuperCho (MOD)
  1075839244: {
    fullName: 'Super Chorus',
    reference: 'BOSS CH-1 SUPER CHORUS',
    description: 'Chorus modeled on the BOSS CH-1 SUPER CHORUS.',
  },
  // VinFLNGR (MOD)
  1076887820: {
    reference: 'MXR M-117R',
    aliases: ['flanger', 'analog'],
    description: 'Analog flanger in the manner of the MXR M-117R.',
  },
  // DynaFLNGR (MOD)
  1080033548: {
    fullName: 'Dynamic Flanger',
    description: 'Flanger whose effect level follows how hard you play.',
  },
  // Vibrato (MOD)
  524: {
    aliases: ['pitch'],
    description: 'Adds automatic pitch vibrato.',
  },
  // PitchSHFT (MOD)
  4194828: {
    fullName: 'Pitch Shifter',
    aliases: ['octave', 'detune'],
    description: 'Shifts the pitch up or down in semitones, with fine tuning in cents.',
  },
  // RingMod (MOD)
  1080033804: {
    fullName: 'Ring Modulator',
    aliases: ['metallic'],
    description: 'Metallic, ringing tones; the frequency control changes the character drastically.',
  },
  // CE-Cho5 (MOD)
  780: {
    reference: 'BOSS CE-5',
    aliases: ['chorus'],
    description: 'Chorus modeled on the BOSS CE-5.',
  },
  // CloneCho (MOD)
  2097932: {
    reference: 'Electro-Harmonix SmallClone',
    aliases: ['chorus', 'analog'],
    description: 'Analog chorus modeled on the Electro-Harmonix SmallClone.',
  },
  // StonePha (MOD)
  4195084: {
    reference: 'Electro-Harmonix SmallStone',
    aliases: ['phaser'],
    description: 'Phaser modeled on the Electro-Harmonix SmallStone.',
  },
  // BF FLG 2 (MOD)
  6292236: {
    reference: 'BOSS BF-2 Flanger',
    aliases: ['flanger'],
    description: 'Flanger modeled on the BOSS BF-2.',
  },
  // CoronaCho (MOD)
  1077936908: {
    reference: 'tc electronic CORONA CHORUS',
    aliases: ['chorus'],
    description: "Chorus modeled on tc electronic's CORONA CHORUS.",
  },
  // ANA234Cho (MOD)
  1080034060: {
    reference: 'MXR M234',
    aliases: ['chorus', 'analog'],
    description: 'Analog chorus modeled on the MXR M234.',
  },
  // CoronaTri (MOD)
  1036: {
    reference: 'tc electronic CORONA Tri-Chorus',
    aliases: ['chorus', 'tri-chorus'],
    description: "Tri-chorus modeled on tc electronic's CORONA Tri-Chorus.",
  },
  // BitCrush (SFX)
  2097166: {
    fullName: 'Bit Crusher',
    aliases: ['lo-fi', 'lofi'],
    description: 'Degrades the signal for a gritty lo-fi sound.',
  },
  // Bomber (SFX)
  4194318: {
    aliases: ['explosion', 'sound effect'],
    description: 'Fires an explosion-like sound effect when you pick a note.',
  },
  // Z-Organ (SFX)
  1073741838: {
    description: 'Turns what you play into an organ-like sound.',
  },
  // AutoPan (SFX)
  1075838990: {
    fullName: 'Auto Pan',
    aliases: ['panning', 'stereo'],
    description: 'Moves the sound back and forth across the stereo field.',
  },
  // Rt Closet (SFX)
  1077936142: {
    aliases: ['rotary speaker'],
    description: 'Rotary speaker simulation, with separate horn and drum.',
  },
  // Delay (DELAY)
  1048592: {
    aliases: ['echo', 'digital delay'],
    description: 'Long delay of up to 4000 ms.',
  },
  // TapeEcho (DELAY)
  2097168: {
    fullName: 'Tape Echo',
    aliases: ['delay'],
    description: 'Tape echo emulation; changing the time also bends the pitch of the repeats.',
  },
  // ModDelay (DELAY)
  4194320: {
    fullName: 'Modulation Delay',
    aliases: ['echo'],
    description: 'Delay with modulation applied to the repeats.',
  },
  // AnalogDly (DELAY)
  6291472: {
    fullName: 'Analog Delay',
    aliases: ['echo'],
    description: 'Analog-style delay with repeats up to 4000 ms.',
  },
  // ReverseDL (DELAY)
  1073741840: {
    fullName: 'Reverse Delay',
    aliases: ['echo', 'backwards'],
    description: 'Plays the delayed sound backwards, with delay times up to 2000 ms.',
  },
  // MultiTapD (DELAY)
  1075838992: {
    fullName: 'Multi-Tap Delay',
    aliases: ['echo'],
    description: 'Several delays with different times, from rhythmic to random patterns.',
  },
  // DynaDelay (DELAY)
  1077936144: {
    fullName: 'Dynamic Delay',
    aliases: ['echo'],
    description: 'Delay whose repeat level follows the input level.',
  },
  // FilterDly (DELAY)
  1080033296: {
    fullName: 'Filter Delay',
    aliases: ['echo'],
    description: 'Delay with a filter applied to the repeats.',
  },
  // PitchDly (DELAY)
  272: {
    fullName: 'Pitch Delay',
    aliases: ['echo', 'pitch shift'],
    description: 'Delay whose repeats are pitch-shifted.',
  },
  // StereoDly (DELAY)
  2097424: {
    fullName: 'Stereo Delay',
    aliases: ['echo'],
    description: 'Stereo delay with independent left and right delay times.',
  },
  // PhaseDly (DELAY)
  4194576: {
    fullName: 'Phase Delay',
    aliases: ['echo', 'phaser'],
    description: 'Delay with a phaser applied to the repeats.',
  },
  // StompDly (DELAY)
  1073742096: {
    fullName: 'Stomp Delay',
    aliases: ['echo', 'self-oscillation'],
    description: 'Stompbox-style delay that self-oscillates when the feedback is turned up.',
  },
  // TapeEcho3 (DELAY)
  1075839248: {
    reference: 'MAESTRO ECHOPLEX EP-3',
    aliases: ['delay', 'tape'],
    description: 'Tape echo modeled on the MAESTRO ECHOPLEX EP-3.',
  },
  // DualDigiD (DELAY)
  1077936400: {
    fullName: 'Dual Digital Delay',
    reference: 'Eventide TimeFactor DigitalDelay',
    aliases: ['echo'],
    description: 'Two delays combined, based on the Eventide TimeFactor DigitalDelay.',
  },
  // CarbonDly (DELAY)
  1080033552: {
    reference: 'MXR Carbon Copy',
    aliases: ['echo', 'analog'],
    description: 'Analog delay modeled on the MXR Carbon Copy.',
  },
  // DriveEcho (DELAY)
  528: {
    reference: 'LINE6 M9 TubeEcho',
    aliases: ['delay', 'tube'],
    description: 'Echo that can be driven, modeled on the LINE6 M9 TubeEcho.',
  },
  // SlapBackD (DELAY)
  2097680: {
    fullName: 'Slapback Delay',
    reference: 'tc electronic FLASHBACK (SLAP)',
    aliases: ['echo', 'rockabilly'],
    description: 'Short slapback delay suited to muted rhythm parts and rockabilly.',
  },
  // SmoothDly (DELAY)
  4194832: {
    fullName: 'Smooth Delay',
    reference: 'BOSS DD-20 (SMOOTH mode)',
    aliases: ['echo'],
    description: 'Wide delay modeled on the SMOOTH mode of the BOSS DD-20.',
  },
  // LO-FI Dly (DELAY)
  6291984: {
    fullName: 'Lo-Fi Delay',
    reference: 'strymon TIMELINE (LO-FI mode)',
    aliases: ['echo', 'lofi'],
    description: 'Delay whose quality you can degrade by lowering the bit depth and sample rate.',
  },
  // SlwAtkDly (DELAY)
  1073742352: {
    fullName: 'Slow Attack Delay',
    reference: 'LINE6 M9 Auto-Volume Echo',
    aliases: ['echo', 'swell'],
    description: 'Delay that fades in gently, modeled on the LINE6 M9 Auto-Volume Echo.',
  },
  // TremDelay (DELAY)
  1075839504: {
    fullName: 'Tremolo Delay',
    reference: 'strymon TIMELINE (TREM mode)',
    aliases: ['echo'],
    description: 'Delay with a tremolo on the repeats.',
  },
  // FLTR PPD (DELAY)
  1077936656: {
    reference: 'Eventide TimeFactor FilterPong',
    aliases: ['echo', 'ping-pong'],
    description: 'Filter and delay combined, based on the Eventide TimeFactor FilterPong.',
  },
  // A-Pan DLY (DELAY)
  1080033808: {
    fullName: 'Auto-Pan Delay',
    aliases: ['echo', 'panning'],
    description: 'Auto-pan and delay together, so the stereo image moves in cycles.',
  },
  // ICE Delay (DELAY)
  784: {
    reference: 'strymon TIMELINE (ICE mode)',
    aliases: ['echo', 'pitch shift'],
    description: 'Pitch shifting and delay combined, based on the ICE mode of the strymon TIMELINE.',
  },
  // HD Hall (REVERB)
  1048594: {
    aliases: ['reverb'],
    description: 'Dense hall reverb.',
  },
  // HD Reverb (REVERB)
  1572882: {
    fullName: 'High-Definition Reverb',
    description: 'Detailed, high-definition reverb.',
  },
  // Hall (REVERB)
  2097170: {
    aliases: ['reverb', 'concert hall'],
    description: 'Recreates the acoustics of a concert hall.',
  },
  // Room (REVERB)
  4194322: {
    aliases: ['reverb'],
    description: 'Recreates the acoustics of a room.',
  },
  // TiledRoom (REVERB)
  6291474: {
    fullName: 'Tiled Room',
    aliases: ['reverb'],
    description: 'Recreates the acoustics of a tiled room.',
  },
  // Spring (REVERB)
  1073741842: {
    aliases: ['reverb'],
    description: 'Emulates a spring reverb.',
  },
  // Arena (REVERB)
  1075838994: {
    aliases: ['reverb', 'stadium'],
    description: 'Recreates a very large space such as a sports arena.',
  },
  // EarlyRef (REVERB)
  1077936146: {
    fullName: 'Early Reflections',
    aliases: ['reverb'],
    description: 'Only the early reflections of a reverb, without the tail.',
  },
  // Air (REVERB)
  1080033298: {
    aliases: ['reverb', 'ambience'],
    description: 'Room ambience that adds a sense of spatial depth.',
  },
  // Plate (REVERB)
  2097426: {
    aliases: ['reverb'],
    description: 'Emulates a plate reverb.',
  },
  // ModReverb (REVERB)
  4194578: {
    aliases: ['modulation'],
    description: 'Reverb with fluctuating, wavering echoes.',
  },
  // SlapBack (REVERB)
  6291730: {
    aliases: ['reverb', 'echo'],
    description: 'Reverb that adds a repeating echo.',
  },
  // Spring63 (REVERB)
  1073742098: {
    reference: "'63 Fender Reverb",
    aliases: ['reverb'],
    description: "Spring reverb modeled on a '63 Fender Reverb.",
  },
  // Chamber (REVERB)
  1075839250: {
    aliases: ['reverb'],
    description: 'Recreates the reverberation of a chamber-sized room.',
  },
  // LOFI Rev (REVERB)
  1077936402: {
    fullName: 'Lo-Fi Reverb',
    reference: 'tc electronic HALL OF FAME (LOFI setting)',
    aliases: ['lofi'],
    description: 'Rough, upfront reverb modeled on the LOFI setting of the tc electronic HALL OF FAME.',
  },
  // Church (REVERB)
  1080033554: {
    aliases: ['reverb'],
    description: 'Recreates the reverberation of a church.',
  },
  // Cave (REVERB)
  530: {
    aliases: ['reverb'],
    description: 'Recreates the reverberation of a cave.',
  },
  // Ambience (REVERB)
  2097682: {
    aliases: ['reverb', 'air'],
    description: 'Adds a natural sense of air around the sound.',
  },
  // GateRev (REVERB)
  4194834: {
    fullName: 'Gated Reverb',
    reference: 'DigiTech RV-7 (Lexicon), Gated setting',
    aliases: ['gate'],
    description: 'Gated reverb suited to percussive playing.',
  },
  // ReverseRv (REVERB)
  6291986: {
    fullName: 'Reverse Reverb',
    reference: 'DigiTech RV-7 (Lexicon), Reverse setting',
    aliases: ['backwards'],
    description: 'Reverb that sounds as if it were played backwards.',
  },
  // Echo (REVERB)
  1073742354: {
    aliases: ['delay', 'reverb'],
    description: 'Lush, rich echoes.',
  },
  // TremoloRv (REVERB)
  1075839506: {
    fullName: 'Tremolo Reverb',
    reference: 'Eventide SPACE (TREMOLO VERB setting)',
    description: 'Reverb with tremolo applied to it.',
  },
  // HolyFLERB (REVERB)
  1077936658: {
    reference: 'Electro-Harmonix Holy Grail (FLERB setting)',
    aliases: ['reverb', 'flanger'],
    description: 'Reverb and flanger combined, modeled on the FLERB setting of the Electro-Harmonix Holy Grail.',
  },
  // DynaRev (REVERB)
  1080033810: {
    fullName: 'Dynamic Reverb',
    reference: 'tc electronic NOVA REVERB',
    description: 'Reverb whose level follows the dynamics of your playing.',
  },
  // Ba Chorus (MOD)
  1081081868: {
    fullName: 'Bass Chorus',
    description: 'Bass chorus with a low cut, so the bottom end stays solid.',
  },
  // Ba Detune (MOD)
  1048844: {
    fullName: 'Bass Detune',
    aliases: ['chorus', 'pitch shift'],
    description: 'Blends in a slightly pitch-shifted copy for a natural, chorus-like thickening.',
  },
  // Ba Ensmbl (MOD)
  7340300: {
    fullName: 'Bass Ensemble',
    aliases: ['chorus'],
    description: 'Chorus ensemble for bass with a wide, three-dimensional sense of motion.',
  },
  // BaFlanger (MOD)
  1078984972: {
    fullName: 'Bass Flanger',
    reference: 'ADA Flanger',
    description: 'Flanger modeled on the ADA Flanger, with a dry/effect balance control.',
  },
  // Ba Octave (MOD)
  3146252: {
    fullName: 'Bass Octave',
    aliases: ['octaver', 'sub octave', 'pitch'],
    description: 'Adds a note one octave below the one you play.',
  },
  // Ba Pitch (MOD)
  7340556: {
    fullName: 'Bass Pitch Shifter',
    aliases: ['pitch shift', 'octave'],
    description: 'Pitch shifter designed for single notes in the bass register.',
  },
  // ModDelay2 (DELAY)
  5242896: {
    fullName: 'Modulation Delay 2',
    aliases: ['echo'],
    description: 'Modulation delay with an adjustable modulation depth.',
  },
  // St Bs GEQ (FILTER)
  516: {
    fullName: 'Stereo Bass Graphic EQ',
    aliases: ['equalizer', 'graphic equalizer'],
    description: 'Stereo 7-band graphic EQ with bands chosen for bass.',
  },
  // 160 Comp (COMP)
  6946818: {
    reference: 'dbx 160A',
    aliases: ['compressor'],
    description: 'Compressor in the manner of the dbx 160A.',
  },
  // Limiter (COMP)
  7602178: {
    aliases: ['compressor', 'peak'],
    description: 'Holds back peaks that rise above a set threshold.',
  },
  // DualComp (COMP)
  4194562: {
    fullName: 'Dual-Band Compressor',
    aliases: ['compressor', 'multiband'],
    description: 'Compresses lows and highs separately, with an adjustable crossover point between them.',
  },
  // Ba GEQ (FILTER)
  3145732: {
    fullName: 'Bass Graphic EQ',
    aliases: ['equalizer', 'graphic equalizer'],
    description: '7-band graphic EQ with bands chosen for bass.',
  },
  // Ba PEQ (FILTER)
  4718596: {
    fullName: 'Bass Parametric EQ',
    aliases: ['equalizer', 'parametric equalizer'],
    description: 'Two-band parametric EQ suited to the bass range.',
  },
  // Splitter (FILTER)
  5242884: {
    aliases: ['crossover', 'band split'],
    description: 'Splits the signal into a low and a high band and lets you set how much of each goes out.',
  },
  // Bottom B (FILTER)
  5767172: {
    aliases: ['eq', 'boost'],
    description: 'Boosts or cuts the low and high ends to bring out both extremes of the spectrum.',
  },
  // BaAutoWah (FILTER)
  1076887556: {
    fullName: 'Bass Auto Wah',
    aliases: ['envelope filter'],
    description: 'Auto-wah for bass, with a control to blend in the clean signal.',
  },
  // Z Tron (FILTER)
  1048836: {
    reference: 'Q-Tron (LP mode)',
    aliases: ['envelope filter', 'auto wah'],
    description: 'Envelope filter in the manner of a Q-Tron set to low-pass mode.',
  },
  // A-Filter (FILTER)
  2752772: {
    aliases: ['envelope filter', 'auto wah', 'resonance'],
    description: 'Resonant filter that reacts with a sharp, snappy envelope.',
  },
  // Ba Cry (FILTER)
  3408132: {
    fullName: 'Bass Cry',
    aliases: ['talking modulator', 'vowel'],
    description: 'Talking-modulator effect voiced for the bass range.',
  },
  // D Comp (COMP)
  3145730: {
    reference: 'MXR Dyna Comp',
    aliases: ['compressor'],
    description: 'Compressor in the manner of the MXR Dyna Comp.',
  },
  // Ba Boost (DRIVE)
  2097176: {
    reference: 'Xotic EP Booster',
    aliases: ['booster'],
    description: 'Warm, firm boost modeled on the Xotic EP Booster.',
  },
  // Bass OD (DRIVE)
  4194328: {
    fullName: 'Bass Overdrive',
    reference: 'BOSS ODB-3',
    aliases: ['overdrive'],
    description: 'Bass overdrive modeled on the BOSS ODB-3.',
  },
  // Bass Muff (DRIVE)
  6291480: {
    reference: 'Electro-Harmonix Bass Big Muff',
    description: 'Modeled on the Electro-Harmonix Bass Big Muff.',
  },
  // Ba Dist 1 (DRIVE)
  1075839000: {
    reference: 'BOSS DS-1',
    aliases: ['distortion'],
    description: 'BOSS DS-1-style distortion with an added control to balance dry and distorted sound.',
  },
  // Ba Metal (DRIVE)
  2097432: {
    reference: 'BOSS Metal Zone',
    aliases: ['distortion'],
    description: 'BOSS Metal Zone-style distortion with an added control to balance dry and distorted sound.',
  },
  // TS+DRY (DRIVE)
  4194584: {
    reference: 'Ibanez TS808',
    aliases: ['distortion'],
    description: 'Ibanez TS808-style drive with an added control to balance dry and distorted sound.',
  },
  // Ba Squeak (DRIVE)
  6291736: {
    reference: 'ProCo RAT',
    aliases: ['distortion'],
    description: 'ProCo RAT-style distortion with an added control to balance dry and distorted sound.',
  },
  // BaFzSmile (DRIVE)
  1073742104: {
    reference: 'FUZZ FACE',
    aliases: ['fuzz'],
    description: 'FUZZ FACE-style fuzz with an added control to balance dry and distorted sound.',
  },
  // BassDrive (DRIVE)
  2097178: {
    reference: 'SansAmp BASS DRIVER DI',
    aliases: ['DI'],
    description: 'Modeled on the SansAmp BASS DRIVER DI, a long-time favorite among bassists.',
  },
  // D.I Plus (DRIVE)
  4194330: {
    fullName: 'D.I. Plus',
    reference: 'MXR Bass D.I.+',
    aliases: ['DI', 'distortion'],
    description: 'Modeled on the MXR Bass D.I.+, with switchable clean and distortion channels.',
  },
  // Bass BB (DRIVE)
  6291482: {
    reference: 'Xotic Bass BB Preamp',
    aliases: ['preamp'],
    description: 'Thick, tube-like preamp modeled on the Xotic Bass BB Preamp.',
  },
  // DI5 (DRIVE)
  1073741850: {
    reference: 'AVALON DESIGN U5',
    aliases: ['DI', 'preamp'],
    description: 'Preamp modeled on the AVALON DESIGN U5.',
  },
  // Bass Pre (DRIVE)
  1075839002: {
    fullName: 'Bass Preamp',
    aliases: ['eq'],
    description: 'Bass preamp with a semi-parametric EQ for the mids.',
  },
  // AC Bs Pre (DRIVE)
  1077936154: {
    aliases: ['preamp', 'eq'],
    description: 'Preamp with a graphic EQ.',
  },
  // SVT (AMP)
  2097162: {
    reference: 'Ampeg SVT',
    aliases: ['amplifier'],
    description: 'Models the Ampeg SVT, the definitive rock bass amp.',
  },
  // B-Man (AMP)
  4194314: {
    reference: 'Fender BASSMAN 100',
    aliases: ['amplifier'],
    description: 'Models the Fender BASSMAN 100.',
  },
  // HRT3500 (AMP)
  6291466: {
    reference: 'Hartke HA3500',
    aliases: ['amplifier'],
    description: 'Models the Hartke HA3500, known for its aluminum speaker cones.',
  },
  // acoustic (AMP)
  1077936138: {
    reference: 'acoustic 360',
    aliases: ['amplifier'],
    description: 'Models the acoustic 360, known for its gutsy midrange.',
  },
  // Ag Amp (AMP)
  1080033290: {
    reference: 'Aguilar DB750',
    aliases: ['amplifier'],
    description: 'Models the Aguilar DB750 and its powerful sound.',
  },
  // Mark B (AMP)
  1073742090: {
    reference: 'Markbass Little Mark III',
    aliases: ['amplifier'],
    description: 'Models the Italian Markbass Little Mark III.',
  },
  // SMR (AMP)
  1073741834: {
    reference: 'SWR SM-900',
    aliases: ['amplifier'],
    description: 'Models the SWR SM-900, known for its hi-fi sound.',
  },
  // Flip Top (AMP)
  1075838986: {
    reference: 'Ampeg B-15',
    aliases: ['amplifier', 'motown'],
    description: 'Models the Ampeg B-15, the amp behind the 1960s Motown sound.',
  },
  // Monotone (AMP)
  266: {
    reference: 'POLYTONE MINI-BRUTE III',
    aliases: ['amplifier', 'jazz'],
    description: 'Models the POLYTONE MINI-BRUTE III, with a distinct midrange that jazz players like.',
  },
  // SuperB (AMP)
  2097418: {
    reference: 'Marshall Super Bass',
    aliases: ['amplifier'],
    description: 'Models the Marshall Super Bass, an amp with a big place in rock history.',
  },
  // G-Krueger (AMP)
  4194570: {
    reference: 'Gallien-Krueger 800RB',
    aliases: ['amplifier', 'metal'],
    description: 'Models the Gallien-Krueger 800RB, a metal favorite of the eighties.',
  },
  // Heaven (AMP)
  6291722: {
    reference: 'Eden WT-800',
    aliases: ['amplifier'],
    description: 'Models the Eden WT-800, which suits a wide range of playing styles.',
  },
  // Ba Synth (SFX)
  7340046: {
    fullName: 'Bass Synth',
    aliases: ['synthesizer'],
    description: 'Monophonic bass synthesizer that follows the pitch you play.',
  },
  // StdSyn (SFX)
  1080033294: {
    aliases: ['synthesizer'],
    description: "Zoom's own bass synthesizer sound.",
  },
  // SynTlk (SFX)
  270: {
    aliases: ['synthesizer', 'talking modulator', 'vowel'],
    description: 'Synth sound that shapes vowels, like a talking modulator.',
  },
  // Z-Syn (SFX)
  2097422: {
    aliases: ['synthesizer', 'analog synth'],
    description: 'Bass synth with the fatness of an analog synthesizer.',
  },
  // Defret (SFX)
  4194574: {
    aliases: ['fretless'],
    description: 'Makes a fretted bass sound like a fretless one.',
  },
  // V-Syn (SFX)
  1073742094: {
    aliases: ['synthesizer', 'vintage'],
    description: 'Vintage-style bass synthesizer sound.',
  },
  // 4VoiceSyn (SFX)
  1075839246: {
    fullName: '4-Voice Synth',
    aliases: ['synthesizer', 'harmony', 'harmonizer'],
    description: 'Adds synth harmony voices to single notes; Mode and Scale choose the harmony.',
  },
}

export const effectInfo = (id: number): EffectInfo => EFFECT_INFO[id] ?? {}
