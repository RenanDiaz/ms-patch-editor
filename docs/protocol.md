# Protocolo USB/MIDI del Zoom MS-60B (S0)

- **Estado:** S0, solo lectura de código. Nada de este documento se ha probado contra el pedal.
- **Fuente:** [g200kg/zoom-ms-utility](https://github.com/g200kg/zoom-ms-utility), commit `5bf930c8e1622b0c70c0c3d761424f84955a227a` (2022-12-20), licencia MIT. Archivos: `midimessage.md`, `index.html`, `js/apatch.js`, `js/effectslist.js`.
- **Fuente secundaria:** `docs/MS-60B_operationManual_English.pdf` (Zoom). El manual no documenta MIDI; solo se usa para el comportamiento del pedal (auto guardado, DSP).
- **Advertencia del autor original** (`index.html`, comentario de cabecera, línea 18): los comandos "se infirieron por experimentación y no están garantizados". `midimessage.md` lo describe como "documento no oficial basado en experimentos personales y no estrictos". Gran parte de sus notas se hicieron con el MS-50G.

Todas las líneas citadas son del commit indicado. Los bytes de ejemplo usan `devid = 0x5F` (MS-60B); la fuente los escribe con `0x58` (MS-50G) y dice que el 4.º byte se cambia por `0x5F` para el 60B (`midimessage.md`, "Identity Request"). En el código, el `devid` se toma de la respuesta de Identity Request (`index.html:191-232`, `MidiIf.recv`).

## 1. Resumen

| # | Mensaje | Bytes (60B) | Sentido | Persiste | Clase |
|---|---|---|---|---|---|
| 1 | Identity Request | `F0 7E 00 06 01 F7` | app → pedal | no | Lectura |
| 2 | Identity Reply | `F0 7E 00 06 02 52 5F 00 00 00 v v v v F7` | pedal → app | – | – |
| 3 | Request Current Program | `F0 52 00 5F 33 F7` | app → pedal | no | Lectura |
| 4 | Current Program Reply | `B0 00 00` `B0 20 00` `C0 pp` | pedal → app | – | – |
| 5 | Program Change | `C0 pp` | ambos | no | Lectura con aviso |
| 6 | Parameter Edit Enable | `F0 52 00 5F 50 F7` | app → pedal | no | Lectura con aviso |
| 7 | Parameter Edit Disable | `F0 52 00 5F 51 F7` | app → pedal | no | Lectura con aviso |
| 8 | Request Patch | `F0 52 00 5F 29 F7` | app → pedal | no | Lectura |
| 9 | Patch Data / Send Patch | `F0 52 00 5F 28 …(105 bytes)… F7` | ambos | ver §4 | Escritura (app → pedal) |
| 10 | Parameter Edit | `F0 52 00 5F 31 nn pp vL vM F7` | ambos | ver §4 | Escritura (app → pedal) |
| 11 | Store Patch | `F0 52 00 5F 32 01 00 00 pp 00 00 00 00 00 F7` | app → pedal | **sí** | Escritura persistente |
| 12 | Store Ack | prefijo `F0 52 00 5F 00 …` | pedal → app | – | – |
| 13 | Tuner On/Off | `B0 4A mm` | app → pedal | no | Fuera de alcance v1 |
| 14 | Desconocido | `F0 52 00 5F 60 F7` | – | ? | **Prohibido** |

"Clase" es la acordada con el usuario y está en `CLAUDE.md`.

## 2. Mensajes

### 2.1 Leer el estado del pedal

**Identity Request** — `F0 7E 00 06 01 F7`
- Mensaje universal MIDI. Respuesta del 60B según `midimessage.md`: `F0 7E 00 06 02 52 5F 00 00 00 31 2E 30 30 F7` → product ID `0x5F`, versión ASCII en bytes 10-13 (`"1.00"`).
- Origen: `index.html:327` (`MidiIf.StartScan`, primer mensaje), parser en `index.html:191-232` (`MidiIf.recv`).
- Uso: la versión de firmware cambia la tabla del parámetro de gabinete de B-AMP: `bampcab[(v>=2)?1:0]` aplicado al parámetro 8 de cada AMP (`index.html:210-224`; tablas `bampcab` en `index.html:85-94`). La app **debe** leerla al conectar.

**Request Current Program** — `F0 52 00 5F 33 F7`
- Respuesta: tres mensajes cortos `B0 00 00`, `B0 20 00`, `C0 pp` (bank select MSB/LSB siempre 0, `pp` = 0..49). En Web MIDI llegan como mensajes separados; g200kg espera solo el que empieza por `c0`.
- Origen: `index.html:332` (`StartScan`, guarda el patch original en `this.norg`), `index.html:448` (`MidiIf.timer`, **sondeo cada 80 ms** cuando la cola está vacía; intervalo en `index.html:488`).
- Cuando llega un `C0 pp` distinto del actual fuera del escaneo, g200kg cambia de patch en la UI (`index.html:171-177`, `recv`). Así detecta que el usuario cambió de patch **en el pedal**.

**Program Change** — `C0 pp`
- Selecciona el patch `pp` (0-49) en el pedal. No persiste nada, pero cambia el patch que suena.
- Origen: `index.html:1501` (`SelectPatch`), `index.html:293`/`335` (escaneo), `index.html:255` (restaurar patch original al terminar el escaneo).

### 2.2 Leer patches y parámetros

No hay un mensaje "leer ranura N". `Request Patch` siempre devuelve el **patch actual**. Para leer el banco, g200kg hace por cada ranura `C0 pp` + `Request Patch` y espera la respuesta `0x28`.

**Secuencia de escaneo** (`index.html:321-339`, `MidiIf.StartScan`; continúa en `recv` `index.html:237-298`):

```
F0 7E 00 06 01 F7          Identity Request              (+200 ms)
F0 52 00 5F 50 F7          Parameter Edit Enable         (+100 ms)
F0 52 00 5F 33 F7          Request Current Program  → C0 pp_original
F0 52 00 5F 50 F7          Parameter Edit Enable (de nuevo)
C0 00                      Program Change → patch 0
F0 52 00 5F 29 F7          Request Patch  → F0 52 00 5F 28 … F7 (105 bytes)
C0 01 / F0 52 00 5F 29 F7  … hasta pp = 49
C0 pp_original             restaurar el patch activo
```

Los mensajes salen de una cola a 1 mensaje cada 80 ms (`MidiIf.timer`, `index.html:405-450`). No hay timeout ni reintento si un patch no responde.

**Parameter Edit Enable / Disable** — `F0 52 00 5F 50 F7` / `F0 52 00 5F 51 F7`
- "Necesario antes de editar parámetros" (`index.html:39-42`, comentario). g200kg lo envía al iniciar el escaneo (`index.html:329`, `334`) y **nunca envía Disable** (no aparece fuera del comentario). Efecto en el pedal no documentado.

**Request Patch** — `F0 52 00 5F 29 F7`
- Respuesta: patch de 105 bytes con comando `0x28` (formato en §3).
- Origen: `index.html:294`, `336` (escaneo), `index.html:361-364` (`MidiIf.RequestPatch`).

### 2.3 Escribir un patch

**Send Patch** — `F0 52 00 5F 28 <bytes 5..103> F7` (105 bytes)
- "Escribe el patch al programa actual" (`midimessage.md`, "Send Patch"). Es el mismo formato que la respuesta a Request Patch.
- Origen: `MidiIf.SendCurrentPatch` (`index.html:369-371`) → `apatch.MakeBin` (`js/apatch.js:238-295`).
- Ejemplo real de la fuente, plantilla vacía del 60B (`apatch.prototype.empty105`, `js/apatch.js:34-41`), nombre "Empty":
  ```
  F0 52 00 5F 28 00 01 00 00 00 00 00 00 00 00 00 00 00 00 00
  00 00 00 00 00 00 01 00 00 00 00 00 00 00 00 00 00 00 00 00
  00 00 00 00 00 00 00 01 00 00 00 00 00 00 00 00 00 00 00 00
  00 00 00 00 00 00 00 01 00 00 00 00 00 00 00 00 00 00 00 00
  00 00 00 00 00 10 00 00 40 04 0F 45 6D 00 70 74 79 20 20 20
  20 00 20 00 F7
  ```
- **g200kg envía `0x28` con mucha frecuencia**: al hacer clic en un parámetro (solo para mover el foco, `index.html:628-639`), al hacer bypass (`ToggleEffect`, `index.html:1345-1348`), al cambiar, insertar, borrar o mover efectos (`index.html:789`, `963`, `989`, `999`, `1010`), al renombrar (`index.html:1227`) y al editar parámetros de efectos 4+ (`index.html:656`).

**Store Patch** — `F0 52 00 5F 32 01 00 00 pp 00 00 00 00 00 F7`
- "Fuerza el guardado en memoria. pp = patch (0-49). El pedal muestra [Storing...]" (`midimessage.md`).
- Origen: `StorePatch` (`index.html:1520-1529`). Con callback espera una respuesta que empiece por `F0 52 00 5F 00` (`midiif.sysexhead+"00"`); su contenido completo no está documentado.
- Secuencia de guardado de banco completo (`StoreAll`, `index.html:1659-1680`), por ranura: `C0 pp` → Send Patch `0x28` → Store `0x32 … pp …` → esperar ack.
- **No está claro** si Store guarda el buffer de edición en la ranura `pp` aunque `pp` no sea el patch actual. g200kg siempre hace `C0 pp` antes, así que no lo prueba.

**Secuencia mínima para "Guardar" una ranura**, derivada de `StoreAll`:
```
C0 pp                                   (seleccionar ranura; cambia el patch activo)
F0 52 00 5F 28 … F7                     (enviar patch de trabajo al buffer)
F0 52 00 5F 32 01 00 00 pp 00 00 00 00 00 F7
← F0 52 00 5F 00 …                      (ack)
```

### 2.4 Cambiar un parámetro en vivo

**Parameter Edit** — `F0 52 00 5F 31 nn pp vL vM F7`
- `nn` = efecto 0..3 (60B), `pp` = 0 on/off, 1 = tipo (no usado), 2..10 = parámetros 1..9; valor de 14 bits `v = vL + (vM << 7)`.
- Ejemplo: perilla 1 del efecto 1 a 50 → `F0 52 00 5F 31 00 02 32 00 F7`. Bypass del efecto 2 → `F0 52 00 5F 31 01 00 00 00 F7` (forma `EffectEnable`, `index.html:31-32`).
- Origen: `MidiIf.SendParamChange` (`index.html:365-368`), llamado desde el `oninput` de la perilla (`index.html:640-661`).
- **Restricción observada por g200kg:** "parece efectivo solo para los efectos 1-3" (`index.html:32`, `midimessage.md`). El código solo usa `0x31` si el efecto es 1-3 **y** tiene el foco; si no, reenvía el patch entero con `0x28` (`index.html:654-659`). No se sabe si en el 60B aplica a los 4.
- La cola fusiona mensajes `0x31` consecutivos del mismo efecto/parámetro y `0x28` consecutivos (`MidiIf.Send`, `index.html:347-360`).

### 2.5 Mensajes que el pedal envía solo

- **`F0 52 00 5F 31 nn pp vL vM F7`** cuando se gira una perilla o se activa un efecto **en el pedal** (requiere Edit Enable, según el flujo de g200kg). Parser en `index.html:179-190` (`recv`). Nota: con `pp == 0` g200kg siempre pone el efecto en OFF, sin mirar el valor; parece un error y no se porta tal cual.
- **`C0 pp`** cuando se cambia de patch en el pedal (o como respuesta a `0x33`).

## 3. Formato del patch (105 bytes, MS-60B)

Fuente principal: tablas `bits`, `namidx`, `cabbyte`, `v2byte`, `maxfxidx` y funciones `GetBits`/`SetBits`/`ReadBin`/`MakeBin` de `js/apatch.js:42-295`. `midimessage.md` tiene una tabla de bits equivalente (columna "MS60B" para los bytes 85-104).

- Bytes 0-4: `F0 52 00 5F 28`. Byte 104: `F7`.
- 4 efectos (`flen = 4`), cada uno con 11 valores `fx[f][0..10]`: 0 = on/off, 1 = ID de efecto (32 bits repartidos), 2..10 = parámetros 1..9.
- Cada valor está **disperso** en varios bytes. Cada tramo es `[byte, máscara, desplazamiento]`: `valor |= (dat[byte] & máscara) << desplazamiento` (desplazamiento negativo = a la derecha). Ejemplo efecto 0, parámetro 1 (`fx[0][2]`): `[[9,0x60,-5],[5,0x8,-1],[10,0x7f,3],[5,0x4,8],[11,0x1,11]]` (`js/apatch.js:46`). Los tramos con byte ≥ 105 se ignoran en el 60B.
- Tramos `"NZ"` (`js/apatch.js:53`, `66`, `79`, `92`): bit que vale 1 si el parámetro 8 ≠ 0. En lectura se ignoran.
- Nombre: 10 caracteres ASCII en los bytes `91 92 94 95 96 97 98 99 100 102` (`namidx[0]`, `js/apatch.js:123`); los bytes 93, 101 y 103 son `0x00` o bits de otros campos. `ReadBin` lee 13 bytes desde el 91 saltando ceros y recorta espacios.
- Número de efectos usados: `(dat[89] & 0x1C) >> 2` (`maxfxidx`, `GetMaxFxBit`, `js/apatch.js:132-176`).
- Efecto con foco: `3 - (((dat[88]&0x40)>>6) + ((dat[85]&0x10)>>3))` (`GetCurFxBit`, `js/apatch.js:147-152`).
- **DSP lleno por efecto:** `dspstate = dat[88] & 0x3F`, bit `n` = efecto `n` ("df" en `midimessage.md`) (`ReadBin`, `js/apatch.js:236`; `GetDspState`, `js/apatch.js:144-146`). Lo calcula el pedal: solo es fiable en un patch que el pedal haya recibido y devuelto.
- Bytes especiales de AMP: `cabbyte = 23, 43, 64, 84` y `v2byte = 8, 28, 49, 70` (`js/apatch.js:126-131`). `MakeBin` los recalcula a partir del tipo de efecto y del parámetro 8 (`js/apatch.js:261-284`).

**`MakeBin` no conserva bytes desconocidos.** Construye el patch desde la plantilla `empty105` y solo escribe los campos que conoce. Todo bit no modelado (por ejemplo tempo, que `midimessage.md` ubica en bytes del formato de 146 bytes) vuelve al valor de la plantilla. Decisión propuesta: nuestro port parte de los **105 bytes leídos** y modifica solo los bits conocidos, con un test de ida y vuelta byte a byte.

**Parámetros (nombre, rango, defecto, DSP estimado):** `js/effectslist.js`. Cada efecto: `{name, group, ver, dsp, dspmax, dspmin, param:[{name, def, max, disp?}]}`. El rango es `0..max`; `disp` es un array de etiquetas o un desplazamiento (`-10` = mostrar −10..+10). El efecto existe en el 60B si `(ver >> 4) & 0xF` es distinto de 0 y menor o igual a la versión de firmware (`MidiIf.instSet`, `index.html:137-157`). Uso del DSP: `100 / dsp` % por efecto (`dumpeff`, `index.html:114`; barra en `DispPatch`, `index.html:1387`). Es una estimación de g200kg, no un dato de Zoom.

## 4. ¿Existe un mensaje para cambiar un parámetro en vivo sin persistirlo? (spec §3)

**Respuesta según el código: sí.**

- `0x31` (Parameter Edit) y `0x28` (Send Patch) modifican el **buffer de edición del patch actual**. La persistencia en la memoria del pedal solo la hace `0x32` (Store). g200kg tiene su propio auto guardado: espera unos 3 s de inactividad (`dirty > 40` ticks de 80 ms) y envía Store (`index.html:440-446`). Si ese auto guardado está apagado, g200kg solo persiste con el botón de guardar (`SavePatchToDevice`, `index.html:1597-1599`). Este diseño solo tiene sentido si `0x31`/`0x28` no persisten por sí solos.
- El pedal **emite** `0x31` cuando se toca una perilla en el pedal, y `C0 pp` al cambiar de patch (§2.5). Con eso la app puede detectar cambios hechos en el pedal antes de guardar, como pide la regla de conflictos de la §3 de la spec.

**AUTO SAVE del pedal.** El manual dice que el pedal tiene una función **AUTO SAVE** que viene **activada de fábrica**: "As soon as a parameter is adjusted this change is automatically saved" (manual, p. 10; ajuste en SETTINGS → AUTO SAVE, p. 20). Ningún mensaje conocido lee ese ajuste (el único sin descifrar, `0x60`, está prohibido), y no se sabe si AUTO SAVE también guarda los cambios que llegan por `0x31`/`0x28`. Decisión (spec §3): (1) la v1 no envía `0x31` ni `0x28` mientras se edita; Guardar envía `C0 pp`, `0x28` y `0x32`, así que funciona con AUTO SAVE encendido o apagado y apagarlo no es requisito; (2) la escucha en vivo es un modo opcional que pide al usuario confirmar que AUTO SAVE está apagado; (3) en S3, con aprobación, se verifica si AUTO SAVE persiste cambios llegados por MIDI y, si no, se quita ese aviso; (4) lo que se gire en el pedal con AUTO SAVE encendido lo guarda el pedal; la app solo lo detecta por `0x31` y lo muestra como conflicto.

## 5. Lo que no se porta

- Auto guardado por temporizador (`index.html:440-446` y cada `if(autosave) StorePatch(...)`).
- `InstallChecker` (`index.html:1530-1591`): escribe efectos de prueba en el buffer del patch 49 para detectar efectos instalados.
- Envío de `0x28` solo para mover el foco del efecto (`index.html:628-639`).
- Mensaje `0x60` (desconocido) y Tuner `B0 4A`.
- Ningún mensaje de actualización de firmware: g200kg no tiene ninguno; el manual indica que el firmware se actualiza por USB con el actualizador de Zoom, que queda fuera del proyecto.

## 6. Pendientes (no verificados)

1. Lectura verificada con el pedal real en S1 (§8). Escritura pendiente de S3.
2. Si AUTO SAVE del pedal persiste cambios hechos por MIDI (§4).
3. Si `0x31` funciona en el efecto 4 del 60B.
4. Qué hace Edit Enable `0x50` exactamente y si hay que enviar Disable `0x51` al desconectar.
5. Si Store `0x32` con `pp` distinto del patch actual guarda el buffer en esa ranura.
6. El contenido completo del ack de Store (`F0 52 00 5F 00 …`).
7. Tiempos mínimos entre mensajes; g200kg usa 80 ms por mensaje sin timeouts.
8. Qué tablas cambian según la versión de firmware además del gabinete. (El pedal tiene firmware 2.10; ver §8.)
9. Que los rangos de `effectslist.js` coinciden con el pedal (procedimiento manual: llevar la perilla al extremo en el pedal y leer).
10. ~~Nombres de efectos~~ **Verificado (2026-11-22):** los 142 nombres de `effectslist.js` para el 60B (58 de firmware 1 y 84 de firmware 2) aparecen como títulos de efecto en la lista oficial de Zoom "Effect Types and Parameters (Ver.2)" (`docs/E_MS-60B_FX-list_v2.pdf`, descargada de zoomcorp.com). Los rangos y nombres de parámetros no se cruzaron uno por uno con ese documento.

## 7. Atribución

El protocolo y las tablas provienen de zoom-ms-utility de g200kg, MIT License, "Copyright (c) 2017" (el archivo `LICENSE` no incluye un nombre de titular). El código que se porte llevará el aviso MIT en cada archivo y se listará en `THIRD_PARTY_NOTICES.md` (se crea en S1, cuando se porte el primer archivo).

## 8. Resultados de S1 con el pedal real (2026-11-10)

Captura de solo lectura: `src/protocol/__fixtures__/ms60b-bank-2026-11-10-fw2.10.json`.

- **Identity Reply:** `F0 7E 00 06 02 52 5F 00 00 00 32 2E 31 30 F7` → MS-60B, firmware **2.10**. `midimessage.md` documentaba la 1.00. Con firmware 2.x g200kg usa la segunda tabla de gabinetes (`bampcab[1]`).
- **Secuencia:** se enviaron exactamente Identity Request, `0x50`, `0x33`, 50 × (`C0 pp` + `0x29`) y `C0 1B` para volver al patch activo, que era el 28. Se recibieron 50 respuestas `0x28` de 105 bytes, sin reintentos. Duración: unos 8,7 s.
- **`0x33`:** el pedal respondió `B0 00 00`, `B0 20 00`, `C0 1B`, como dice §2.1.
- **Decodificación:** el port coincide con el `ReadBin` de g200kg en los 50 patches reales. Todos los efectos existen en la tabla del 60B para firmware ≤ 2, ningún parámetro sale del rango de g200kg y los parámetros sin uso valen 0. Ningún patch tiene bits de DSP lleno.
- **Bits que ningún campo decodificado lee:**
  - El byte 90 vale `0x0F` en los 50 patches. Coincide con la plantilla `empty105`.
  - El bit `0x10` de los bytes de gabinete 43 y 64 aparece en patches con AMP; forma parte del valor `0x50`/`0x51` que `MakeBin` recalcula.
- **`MakeBin` de g200kg altera bytes reales.** Si se pasan los 50 patches por `ReadBin` y luego por `MakeBin`, 42 quedan idénticos y 8 no (patches 2, 3, 4, 7, 8, 11, 14, 16). En los 8 casos se pone `0x40` en un byte de gabinete (23, 43, 64 u 84) donde el pedal tiene `0x00`. La causa es el tramo `"NZ"` (`js/apatch.js:53` y equivalentes): marca el bit cuando el parámetro 8 ≠ 0 aunque el efecto no sea un AMP. Esto confirma la decisión de §3: escribir modificando los bytes leídos, no desde plantilla. Qué hace el pedal con ese bit se verifica en S3.
- **Comparación en vivo con la utilidad (criterio de salida de S1): 50/50.** La utilidad de g200kg (servida localmente desde el clon, con AutoSave apagado) leyó el mismo pedal y su "Export Bank file" (`src/protocol/__fixtures__/g200kg-export-2026-11-10-fw2.10.60b.zip`) coincide con nuestra captura en todos los campos decodificados de los 50 patches. Los bytes crudos solo difieren en los 8 patches y bytes anticipados arriba (test `g200kgLiveComparison.test.ts`).
- **Advertencia sobre la utilidad:** en un origen sin cookie arranca con **AutoSave encendido** (`index.html:553` llama `AutoSave()`, que lo activa). Hay que apagarlo antes de tocar nada.

## 9. S3: escritura controlada (preparada, sin probar en el pedal)

- **Codificador** (`encodePatch60B`, `src/protocol/patch60b.ts`): parte de los 105 bytes leídos y reescribe solo las ranuras de efecto que cambiaron. Una ranura reescrita recibe todos sus campos con `SetBits`, el byte de gabinete completo (AMP: regla de `MakeBin`; otro efecto: `0x00`) y el byte `v2` (`0x20` solo en AMP de firmware 2). Las ranuras sin uso se escriben como las guarda el pedal: ON, THRU, todo 0. Cambia maxFx y el foco solo si hace falta, y borra los bits de DSP lleno si la cadena cambió.
- **Verificación sin pedal:**
  - Patch sin cambios → bytes idénticos en los 50 patches reales.
  - Reescribir las 4 ranuras desde los campos leídos → bytes idénticos en los 50. Confirma las reglas de ranura vacía y gabinete de AMP de firmware 1 contra datos reales.
  - 150 ediciones aleatorias de patches reales comparadas con `MakeBin` de g200kg (`g200kg-makebin-golden.json`): coinciden byte a byte salvo el bit `NZ` en ranuras que no son AMP (§8).
- **No verificado con datos reales:** ningún patch del banco tiene un AMP de firmware 2, así que la regla del byte `v2 = 0x20` viene solo del código de g200kg.
- **Camino de escritura:** `withApprovedWrites()` deja pasar los mensajes de lectura y exactamente los bytes 0x28/0x32 aprobados, en orden y una vez cada uno. Rechaza cualquier aprobación que contenga otra cosa (por ejemplo `0x31` o `0x60`).
- **Página `#/s3`:** conectar → respaldar los 50 patches (solo lectura) → descargar el respaldo → escribir en una ranura elegida un patch de prueba (nombre "S3 TEST" y efecto 1 alternado) → leer desde memoria (cambiando a otra ranura y volviendo) → restaurar desde el respaldo. Opcional: prueba de AUTO SAVE (solo 0x28, esperar 3 s, cambiar de ranura y volver, leer). Al final de cada operación vuelve al patch activo original.

### 9.1 Resultados con el pedal (2026-11-10, firmware 2.10, AUTO SAVE encendido)

Dos sesiones en la ranura 33 ("Empty"), corridas por el usuario desde `#/s3`. Logs: `ms60b-s3-log-2026-11-10T20-41-31-802Z.json` y `…T20-46-04-337Z.json` (fuera del repo).

- **Store `0x32` no devolvió ack.** Se envió 5 veces y no llegó ningún mensaje del pedal en los 1,5 s siguientes ni después. La página esperaba el ack de g200kg (`F0 52 00 5F 00 …`) y falló por timeout antes de releer. Cambio: el ack se registra si llega, pero la relectura decide.
- **AUTO SAVE encendido guarda el `0x28` solo.** En las dos sesiones, después de `C0 20` + `0x28` sin Store, esperar 3 s y cambiar a la ranura 34 y volver, la ranura 33 tenía los bytes enviados. Confirma lo que advertía la §4: con AUTO SAVE encendido, cualquier `0x28` persiste.
- **Ida y vuelta byte a byte:** los bytes generados por `encodePatch60B` (nombre "S3 TEST", efecto 1 alternado) volvieron idénticos desde la memoria del pedal.
- **No verificado:** si Store `0x32` persiste por sí solo. Con AUTO SAVE encendido no se distingue de AUTO SAVE. Se verifica con AUTO SAVE apagado: `0x28` solo no debe persistir y `0x28` + `0x32` sí.
- **Fuera de las pruebas:** el respaldo previo a la primera escritura ya mostraba cambios contra la captura de S1 en las ranuras 20 ("By Pauzz": de THRU a RackComp → BassDrive → SVT → Delay) y 24 ("Compressor" reemplazado por una copia de "By Pauzz"). No los hizo esta app: S1 es de solo lectura y esas ranuras ya estaban así antes de cualquier escritura de S3.
- La ranura 33 quedó como "S3 TEST" (mismos bytes que "Empty" salvo el nombre). Se restaura desde la captura de S1.

### 9.2 Segunda ronda (2026-11-10, ejecutada por Claude en el Chrome del usuario, con su aprobación)

Log: `ms60b-s3-log-2026-11-10T21-08-11-220Z.json` (fuera del repo). Siempre en la ranura 33.

| Paso | AUTO SAVE | Resultado |
|---|---|---|
| Restaurar "Empty" (`C0 20`, `0x28`, `0x32`) | OFF | Relectura idéntica |
| Solo `0x28` ("S3 TEST"), cambiar a 34 y volver, leer | OFF | La ranura tiene "S3 TEST" |
| Reiniciar el pedal, leer (solo lectura) | OFF | Sigue "S3 TEST" |
| Restaurar "Empty" | OFF | Relectura idéntica |
| Solo `0x28`, cambiar y volver, leer | ON | "S3 TEST" |
| Reiniciar el pedal, leer | ON | Sigue "S3 TEST" |
| Restaurar "Empty" | ON | Relectura idéntica; igual a la captura de S1 |

**Correcciones a §4 y §9.1:**

- **`0x28` persiste por sí solo**, con AUTO SAVE encendido o apagado, y sobrevive un reinicio. No está probado si se guarda al recibirlo o al salir del patch; en las pruebas siempre se cambió de patch antes de reiniciar. §9.1 lo atribuía a AUTO SAVE: era incorrecto, AUTO SAVE estaba apagado en esas pruebas. Esto también explica los cambios en las ranuras 20 y 24: la utilidad de g200kg envía `0x28` en cada clic aunque su AutoSave esté apagado.
- **Store sí tiene ack:** `F0 52 00 5F 00 00 F7`, unos 2,5 s después del `0x32` (2,52 s en las 3 escrituras). En §9.1 no apareció porque la página dejaba de escuchar a los 1,5 s. Ahora se espera hasta 4 s y la relectura decide.
- **No aislado:** qué agrega Store si el `0x28` ya persiste. Lo que sí se observó es que el pedal solo confirma con ack cuando recibe Store.
- **Consecuencias:**
  - `0x28` pasa a la clase "escritura persistente" en `CLAUDE.md`.
  - Un modo en vivo basado en `0x28` guardaría cada cambio en la ranura.
  - El único candidato para escuchar en vivo sin persistir es `0x31`, sin probar.

### 9.3 Escucha en vivo: pruebas de `0x31` y de cuándo se guarda `0x28` (2026-11-10)

Aprobadas por el usuario y ejecutadas por Claude en su Chrome, siempre en la ranura 33. Log: `ms60b-s3-log-2026-11-10T22-49-36-405Z.json` (fuera del repo). Al final, la ranura 33 quedó igual a la captura de S1.

- **Preparación:** se escribió en la ranura 33 una copia de "Octaver" (4 efectos; el 4 apagado) llamada "S3 TEST". Relectura idéntica y ack de Store.
- **`0x31` en la perilla 1 de los 4 efectos**, leyendo el buffer sin salir del patch y después de cambiar a otra ranura y volver:

| AUTO SAVE | Efectos 1-3 | Efecto 4 (apagado) |
|---|---|---|
| ON | se aplica en el buffer y queda guardado al salir | no se aplica |
| OFF | se aplica en el buffer y queda guardado al salir | no se aplica |

  Coincide con la nota de g200kg ("solo efectos 1-3"). No se probó con el efecto 4 encendido.
- **`0x28` sin salir del patch y reinicio del pedal** (AUTO SAVE OFF): después del reinicio, la ranura tenía lo de antes. **El `0x28` no se guarda al recibirlo**: se guarda al salir del patch.

**Modelo que resulta (firmware 2.10):** `0x28` y `0x31` cambian el buffer de edición del patch activo. El pedal guarda ese buffer en la ranura cuando se sale del patch, haya o no Store y esté como esté AUTO SAVE. Si el pedal se apaga sin salir del patch, el cambio se pierde. No se probó qué hace AUTO SAVE ON con un `0x28` al reiniciar sin salir del patch.

**Consecuencias para la escucha en vivo:**
- Antes de salir de un patch sin guardar (cambiar de patch desde la app, Revertir, desconectar), la app debe enviar el patch original con `0x28`. Así el pedal guarda el original al salir.
- Si el usuario cambia de patch en el propio pedal mientras edita en vivo, el pedal ya habrá guardado la versión editada en la ranura anterior. La app lo detecta por el `C0` y tiene que restaurar esa ranura, o al menos avisar.
- Si la app se cierra mientras el pedal está en el patch editado, el cambio solo queda guardado si después se cambia de patch en el pedal. Si se apaga el pedal, se pierde.
- `0x31` no sirve para el efecto 4. Para ese efecto, y para cambios de cadena (tipo, orden, agregar, quitar), se usa `0x28`.

### 9.4 Escucha en vivo en el editor, con el pedal (2026-11-10)

Prueba aprobada por el usuario en la ranura 33 (copia de "Octaver" con 4 efectos, nombre "S3 TEST"), ejecutada por Claude en su Chrome. Al final, la 33 se restauró a la captura de S1 (relectura idéntica, ack).

| Caso | Mensajes enviados | Resultado |
|---|---|---|
| Perilla del efecto 1 | `0x31 00 02 51` | OK |
| Perilla del efecto 4 | un `0x28` | OK |
| Bypass del efecto 2 | un `0x28` | OK |
| Revertir | `0x28` original, `0x29` | Limpio; relectura = original |
| Cambiar a la 34 y descartar | `0x31`, `0x28` original, `C0 21`, `C0 20`, `0x29`, `C0 21` | 33 verificada = original |
| Cambio de patch hecho en el pedal (AUTO SAVE ON) | detectado por sondeo `0x33`; `C0 20`, `0x28` original, `C0 1F`, `C0 20`, `0x29`, `C0 1F` | 33 verificada = original; la app siguió al pedal a la 32 y la edición quedó "sin guardar" |
| Guardar | `C0 20`, `0x28`, `0x32`, ack, `C0 21`, `C0 20`, `0x29` | Relectura idéntica |

**Hallazgos:**

- **El pedal no avisa cuando se cambia de patch en él.** Ni la perilla ni el footswitch generan mensajes; hay que sondear con `0x33`, como hace g200kg. La app sondea cada 250 ms mientras no hay otra operación.
- **Con AUTO SAVE OFF, un cambio de patch hecho en el pedal descartó la edición recibida por MIDI.** En cambio, un `C0` recibido por MIDI la guarda (§9.3). Con AUTO SAVE ON no se pudo distinguir si el pedal guardó la edición, porque la app restauró la ranura; el resultado final fue el original en ambos casos.
- **Chrome limita los temporizadores de una pestaña en segundo plano a uno por segundo.** Con la app en segundo plano, leer el banco tarda unos 100 s, y el sondeo y los envíos en vivo se vuelven lentos.
- **Incidente durante la prueba:** el servidor de desarrollo recargó el editor en caliente mientras estaba conectado. El editor creyó que el pedal seguía en la 33 cuando el usuario ya lo había pasado a la 32, y envió `0x31 00 02 51` a la 32. Resultado: la ranura 32 "Swells" quedó con SlwAtkDly 81 en lugar de 489. Correcciones:
  - cada envío en vivo confirma antes el patch activo con `0x33`, y si no coincide no envía nada (`WrongPatchError`);
  - las sesiones se cierran cuando se recarga en caliente el módulo;
  - la restauración de emergencia al cerrar la página solo actúa sobre el patch que la app sabe que está activo.

  Con la aprobación del usuario, la ranura 32 se restauró desde la captura de S1 (relectura idéntica, ack). Después, una lectura completa del banco coincidió con la captura de S1 en todas las ranuras salvo la 20, que el usuario cambió con la utilidad de g200kg antes de S3.

### 9.5 AMP de firmware 2: bytes de gabinete y "v2" (2026-11-22)

Verificación de solo lectura (`0x33` + `0x29`, botón "Leer patch activo" de `#/s1`), ejecutada por Claude en el Chrome del usuario. El usuario armó el patch en el propio pedal, en la ranura 33: efecto 1 = SuperB (firmware 2). Para cada lectura, `checkAmpBytes` (`src/protocol/ampCheck.ts`) decodifica los bytes del pedal, los vuelve a codificar reescribiendo todas las ranuras y compara.

| CAB (valor) | Byte de gabinete pedal / app | Byte v2 pedal / app | Resto del patch |
|---|---|---|---|
| SWR 4x10 (64) | `0x51` / `0x51` | `0x20` / `0x20` | idéntico |
| AG 8x10 (16) | `0x50` / `0x50` | `0x20` / `0x20` | idéntico |
| OFF (0) | `0x00` / `0x00` | `0x20` / `0x20` | idéntico |

Confirma las reglas de `MakeBin` que porta `encodePatch60B`: byte de gabinete `0x00` / `0x50` / `0x51` según el CAB, y byte v2 = `0x20` en los AMP de firmware 2. Los AMP de firmware 1 ya estaban confirmados con los 50 patches reales (§8, test `ampCheck.test.ts`). No se probaron los demás AMP de firmware 2 (G-Krueger, Heaven, SMR, Flip Top, Monotone); en `effectslist.js` comparten la misma regla.

### 9.6 Caracteres del nombre de patch (2026-11-22)

El usuario renombró el patch 33 en el propio pedal, en tres rondas, con todos los símbolos que ofrece su editor de nombres en el orden en que aparecen, y Claude leyó cada nombre con "Leer patch activo" (`#/s1`, solo lectura):

1. `!#$%&'()+,`
2. `-.;=@[]^_` y `` ` ``
3. `{}~`

Según el usuario, el editor del pedal recorre los caracteres en este orden y luego vuelve a empezar: espacio, esos 23 símbolos, A-Z, a-z, 0-9. Las letras son solo las del alfabeto inglés (sin ñ ni acentos). **No ofrece** `"` `*` `/` `:` `<` `>` `?` `\` `|`. La app solo acepta esos caracteres en los nombres (`isNameChar`, `src/model/patch.ts`).

### 9.7 Respaldo y restauración del banco desde el editor (2026-11-22)

Prueba aprobada por el usuario, ejecutada por Claude en su Chrome con el editor real (`/`), solo en la ranura 33:

1. **Respaldar banco** (archivo A): sin mensajes de escritura. A coincide con la captura de S1 salvo las ranuras 20 y 26 (cambiadas por el usuario).
2. **Restaurar banco** con B = A con la ranura 33 reemplazada por una copia de "Octaver". El diálogo listó solo "33 Empty → Octaver". Escrituras: `C0 20`, `0x28`, `0x32` (ranura 33); relectura `C0 21`, `C0 20`, `0x29`. Resultado: "1 de 1 ranuras restauradas y verificadas".
3. **Restaurar banco** con A: el diálogo listó solo "33 Octaver → Empty"; mismos mensajes; verificada.
4. **Respaldar banco** de nuevo: idéntico a A en las 50 ranuras.
