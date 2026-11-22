# Textos de ayuda por parámetro: fuentes y método

Datos en `src/model/paramInfo.ts` (`PARAM_INFO`): 834 de los 835 parámetros de los 142 efectos del MS-60B (todos menos THRU, id 0). Fecha: 2026-11-22.

## Fuente

**Zoom, "Effect Types and Parameters (Ver.2)"**, `docs/E_MS-60B_FX-list_v2.pdf`. Cada efecto trae una tabla con Knob1/Knob2/Knob3 por página (Page01, Page02, Page03) y, debajo de cada parámetro (nombre + rango), una frase que explica qué hace. Esa frase es la única fuente de `help`. Nada sale de memoria.

## Cómo se extrajo y emparejó

1. **Texto por posición, con PDFKit en Swift.** `page(at:).string` sale desordenado (las columnas se mezclan), así que no se usó tal cual. En su lugar, para cada página y para cada columna de la tabla (nombre del efecto, Page, Knob1, Knob2, Knob3; límites en x medidos sobre la página A5 de 419.5 pt) se pidió `page.selection(for: rect).selectionsByLine()`, que da cada línea con su posición. Las líneas a la misma altura dentro de una columna se unieron (así "THRSH" y "0–50" quedan en la misma línea).
2. **Bloques de efecto.** Un bloque empieza en la línea de la columna izquierda cuyo texto es exactamente el nombre de un efecto de `effects60b.generated.ts` y termina donde empieza el siguiente. Se ignoró el SeqFLTR de ejemplo de la página 2 (la leyenda del documento); el real está en la página 5. Se encontraron los 142, sin duplicados.
3. **Parámetros.** En la tabla, el parámetro de índice `i` está en la columna Knob `i % 3 + 1` y en la página `floor(i / 3) + 1`. Dentro de cada columna del bloque, después de la línea "KnobN", se buscó en orden la línea que empieza con el nombre del parámetro `i`, `i + 3`, `i + 6`; las líneas que siguen hasta el próximo nombre son su explicación. Los 835 parámetros quedaron emparejados.
4. **Comprobación visual.** Se renderizaron las páginas a PNG (PDFKit) y se compararon con el emparejamiento las páginas 3, 14 y 21 (incluye efectos de tres páginas de parámetros y celdas de varias líneas). Todo coincidió.
5. **Redacción.** Las explicaciones del PDF se repiten mucho (236 frases distintas para 835 parámetros). Se escribió una frase propia en inglés por cada explicación distinta y se aplicó a todos los parámetros que la usan. Un chequeo rechaza cualquier texto idéntico al del PDF y cualquiera de más de 140 caracteres. No se agregaron unidades que el documento no da.

Los scripts fueron de un solo uso (scratchpad de la sesión, no en el repo).

## Dirección de los parámetros (lo que el usuario pidió y el documento casi nunca dice)

El PDF dice **qué** controla cada parámetro, pero casi nunca **hacia dónde** va. En particular **no** dice:

- si subir THRSH comprime más o menos (solo "nivel que activa el compresor" / "umbral");
- en qué extremo de Bal, Mix, Blend o DRBal está el sonido seco y en cuál el efecto (solo "balance entre original y efecto");
- si subir Sense, Tone, Color, HiDMP, Decay, etc. da más o menos de algo.

Por la regla 4 esos textos dicen qué controla el parámetro y nada más. Donde el documento **sí** da la dirección o el significado de cada valor, el texto lo incluye:

- AutoPan `Clip`: más alto, paneo más marcado. Defret `Color`: más alto, carácter más fuerte.
- `Tail` (todos los delays y reverbs que lo tienen): ON sigue sonando la cola al apagar el efecto; OFF se corta.
- `DRY`/`Dry` OFF/ON (CoronaCho, CoronaTri, SlapBackD, LOFI Rev, Church, Ambience, GateRev, ReverseRv): ON mezcla seco y efecto; OFF solo efecto.
- DriveEcho `DRY` (DRIV/THRU), TapeEcho3 `P-Amp`, SlwAtkDly `Mode`, DI5 `HiCut`, acoustic `Bright`, A-Filter `Mode`, Delay/AnalogDly `P-P`, SuperCho/CE-Cho5/ANA234Cho/StompDly `Mode` (en estéreo el efecto sale por L y la entrada sin cambiar por R).
- PitchSHFT y Ba Pitch `Shift`: 0 da un efecto de desafinado. DualDigiD/FLTR PPD `Depth` y TremoloRv `Depth`: los valores M/MN son mono y S/ST estéreo. LO-FI Dly `VINYL`: con D el ruido sigue a las repeticiones.

**Pendiente:** si la interfaz necesita la dirección de THRSH, Bal/Mix y similares, habrá que sacarla de otra fuente verificada (por ejemplo una prueba en el pedal, con aprobación del usuario) y registrarla; no está en este documento.

## Nombres que no coinciden entre el PDF y el catálogo

El emparejamiento usó la posición (Knob/página), que coincide; solo difiere la escritura del nombre. El texto se aplicó igual:

| Efecto | Catálogo (`effects60b.generated.ts`) | PDF |
|---|---|---|
| Bass Pre #1 | `Treble` | `Trebl` |
| Bomber #1 | `Deay` | `Decay` |
| CarbonDly #3 | `MID` | `MOD` (OFF/ON, activa la modulación) |
| DriveEcho #5 | `DRV` | `DRY` (DRIV/THRU) |
| Spring63 #3 | `LEVEL` | `Level` |

El comentario de cabecera de `effects60b.generated.ts` dice que los nombres coinciden con el PDF; vale para los nombres de efecto, no para estos cinco parámetros.

## Lo que quedó fuera

- **StonePha #0 `COLOR`** (valores 1, 2): el PDF le pone "Sets the depth of the modulation", la misma frase que a `DEPTH` de CloneCho en la tabla de al lado. Para un selector llamado COLOR parece un error de copia del documento, así que se dejó sin texto.

## Explicaciones del PDF que se usaron tal como las da, aunque sorprendan

Se mantuvieron porque el emparejamiento es seguro y el texto es el de la fuente; conviene saberlo si alguien los encuentra raros:

- AC Bs Pre `Depth`: el PDF lo explica igual que `Bass` ("nivel de graves").
- BF FLG 2 `MNL`: "tiempo de delay". Echo `TIME`: explicado como pre-delay de la reverb.
- Rt Closet `Bal`: balance entre la bocina (agudos) y el tambor (graves), sin decir cuál extremo es cuál.
- Los parámetros `CAB` remiten a la Tabla 1 del PDF (página 27) y 4VoiceSyn `Mode`/`Scale` a la Tabla 2; el texto lo indica.
