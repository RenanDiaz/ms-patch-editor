# Textos de ayuda de efectos: fuentes y método

Datos en `src/model/effectInfo.ts` (`EFFECT_INFO`), 142 efectos del MS-60B (todos menos THRU, id 0). Fecha: 2026-11-22.

## Fuentes

1. **Zoom, "Effect Types and Parameters (Ver.2)"**, `docs/E_MS-60B_FX-list_v2.pdf`. Fuente principal: de su frase de explicación de cada efecto salen el equipo de referencia y el sentido de la descripción.
2. **g200kg/zoom-ms-utility**, `js/effectslist.js`, campo `title`, commit `5bf930c8e1622b0c70c0c3d761424f84955a227a` (clonado fuera del repo, en el scratchpad de la sesión). Sirve para confirmar el equipo modelado y para los casos en que el PDF no da una frase (ver abajo).

Nada sale de memoria. Si un dato no está en ninguna de las dos fuentes, el campo queda vacío.

## Cómo se extrajo

1. Texto del PDF con PDFKit en Swift: `PDFDocument(url:)`, y `page(at: i).string` por cada página. El texto sale desordenado (las tablas de parámetros se mezclan con las explicaciones), así que se filtraron las líneas de parámetros y se buscó, para cada uno de los 142 nombres, su frase "Nombre This effect…"; cuando el nombre y la frase quedaron separados en la extracción (p. ej. VintageCE, SuperCho, Ba Ensmbl, DirtyGate, OrangeLim, GrayComp, DualComp, Z Tron, A-Filter, Ba Cry, HolyFLERB, Monotone), se emparejaron por el equipo que nombra la frase, coincidiendo con el `title` de g200kg.
2. Catálogo (id, nombre, grupo) leído de `src/protocol/effects60b.generated.ts`; títulos de g200kg leídos de `effectslist.js` por id. Los datos se escribieron por nombre y un script de un solo uso los volcó por id, comprobando que estuvieran los 142 y ninguno de más.
3. Criterio por campo:
   - **description**: una frase en inglés, redactada con palabras propias (el PDF prohíbe reproducirlo). No agrega nada que no diga la frase del PDF o el `title` de g200kg.
   - **reference**: el equipo tal como lo escribe el PDF (mayúsculas incluidas: "ORANGE SQUEEZER", "MAESTRO ECHOPLEX EP-3"). Cuando el PDF nombra un modo o ajuste, va entre paréntesis: "strymon TIMELINE (ICE mode)", "BOSS DD-20 (SMOOTH mode)". En SuperB se usa "Marshall Super Bass" (PDF); g200kg dice "Super Bass I".
   - **fullName**: solo cuando la abreviatura no es obvia y la expansión está respaldada por el texto del PDF o de g200kg (p. ej. "RndmFLTR" → "Random Filter", "ZNR" → "ZOOM Noise Reduction", "DualComp" → "Dual-Band Compressor" porque el PDF dice que comprime por separado graves y agudos). Donde la expansión sería una suposición (V-Syn, VinFLNGR, FLTR PPD, AC Bs Pre, ModReverb, Rt Closet, Ba Boost, Ba Dist 1, HD Hall, StdSyn, fCycle, LineSel, Bottom B, A-Filter) queda vacío.
   - **aliases**: términos de búsqueda que no están en el nombre. Se limitan a palabras del tipo de efecto que usan los propios documentos ("compressor", "echo", "phaser", "talking modulator", "distortion" cuando el PDF habla de "distorted sounds", "overdrive" para Bass OD porque el PDF lo llama "overdrive", "fuzz" para BaFzSmile por "FUZZ FACE") o a sinónimos genéricos de la categoría ("delay"/"echo", "reverb", "equalizer", "amplifier", "synthesizer").
4. Nota de marcas en la cabecera de `effectInfo.ts`, igual que la del PDF: los nombres de terceros se usan solo para describir el sonido.

## Campos vacíos por falta de fuente

- **Sin reference** (ninguna fuente nombra un equipo; son efectos propios o genéricos): RackComp, M Comp, SlowATTCK, ZNR, NoiseGate, DirtyGate, Limiter, DualComp, LineSel, RndmFLTR, fCycle, St Bs GEQ, Ba GEQ, Ba PEQ, Splitter, Bottom B, BaAutoWah, A-Filter, Ba Cry, todos los MOD genéricos (Tremolo, DuoTrem, Phaser, DuoPhase, WarpPhase, TheVibe, StereoCho, DynaFLNGR, Vibrato, PitchSHFT, RingMod, Ba Chorus, Ba Detune, Ba Ensmbl, Ba Octave, Ba Pitch), todos los SFX, los DELAY genéricos (Delay, TapeEcho, ModDelay, ModDelay2, AnalogDly, ReverseDL, MultiTapD, DynaDelay, FilterDly, PitchDly, StereoDly, PhaseDly, StompDly, A-Pan DLY), los REVERB genéricos (HD Hall, HD Reverb, Hall, Room, TiledRoom, Spring, Arena, EarlyRef, Air, Plate, ModReverb, SlapBack, Chamber, Church, Cave, Ambience, Echo), Bass Pre y AC Bs Pre.
- **Sin aliases**: RndmFLTR, DuoTrem, DuoPhase, TheVibe, StereoCho, SuperCho, DynaFLNGR, Ba Chorus, BaFlanger, Z-Organ, HD Reverb, TremoloRv, DynaRev, Bass Muff (el PDF solo nombra el Bass Big Muff; "fuzz" o "distortion" serían suposición). En la mayoría el nombre completo o la categoría ya cubren la búsqueda.
- **Gabinetes**: la Tabla 1 del PDF (página 27) nombra el gabinete modelado por cada valor de `CAB` (AG 8x10 = Ampeg 810E, etc.). No está en `EFFECT_INFO` porque son valores de parámetro, no efectos; si la interfaz los quiere mostrar, la fuente es esa tabla.
- **Pendiente de confirmar**: los parámetros que mencionan algunas descripciones (rango de 4000 ms en Delay/AnalogDly, 2000 ms en ReverseDL, semitonos y cents en PitchSHFT) salen del texto del PDF; no se cruzaron con los rangos de `effects60b.generated.ts`.
