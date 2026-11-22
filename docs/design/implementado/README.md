# Rediseño implementado (2026-11-22)

Rama `claude/redesign-f53276`. Base: dirección A "Escenario" con dos ideas de B (`../direcciones/`), decisiones en `docs/intent.md` §13. Capturas a 1440×900 de la demo (`#/demo`, datos falsos) tomadas con Chrome sin interfaz; el caso de `01` es el de las direcciones: patch 02, BassDrive con Gain 60 → 72, Blend 100 → 85, Mid 7 → 10, Ba Chorus en bypass.

| Captura | Qué muestra |
|---|---|
| `01-editor-1440.png` | Pantalla principal: banda de estado, cadena, perillas con "on pedal: X", lista "Changes vs pedal" |
| `02-effect-search-1440.png` | Selector de efectos buscando "delay" (encuentra AnalogDly, TapeEcho… por categoría) |
| `03-revert-confirm-1440.png` | Revert con varios cambios pide confirmación y dice que ⌘Z los devuelve |
| `04-paste-bar-and-rename-1440.png` | Barra de pegar flotante en otro patch; renombrar con contador 7/10 y aviso "Ñ is not available on the pedal" |
| `05-switch-dialog-1440.png` | Cambiar de patch con cambios: "Save and open 03" / "Revert and open 03" / "Keep editing" |
| `06-phone-375.png`, `07-phone-375-panel.png` | A 375 px: usable, en una columna |

## Qué quedó

- **Banda de estado (118 px):** número y nombre del patch en grande (clic para renombrar), píldora **Live** (botón con punto relleno/hueco y texto, no solo color), píldora **"N unsaved changes"** (lleva a la lista de cambios), DSP segmentado por bloque con el color de su categoría (bypass rayado), deshacer/rehacer, Revert, **"Save to NN"** (con color solo cuando hay algo que guardar) y menú **Bank ▾** (Back up / Restore) separado de Save. Debajo del nombre: "The pedal is on 07: you hear this patch" o, en rojo, "The pedal is on 12 NAME, not this patch".
- **Línea de estado de altura fija (40 px)** en lugar de las franjas apiladas: un mensaje a la vez (error > guardado bloqueado > ocupado > banco > confirmación "Saved to 07 ✓" > explicación de Live). Nada se mueve bajo el cursor.
- **Decisiones en diálogos:** restauración pendiente al conectar con las dos versiones lado a lado (cadena en el pedal ahora / cadena original) y "Restore the original" / "Keep what the pedal has"; conflicto con la lista de valores que difieren (pedal / tuyo); cambiar de patch con cambios; confirmación de Revert con más de un cambio.
- **Cadena:** franja y color por categoría del manual (DYN/FLTR, OD/DIST, AMP, MOD/SFX, DLY/REV), número de bloque, 3 valores (los 3 primeros parámetros; en ámbar si difieren del pedal), bypass inequívoco: interruptor con la palabra "On"/"Bypass", círculo relleno/hueco, franja punteada y fondo rayado. Botones Copy, ◀, ▶ y ✕ (separado a la derecha) con tooltip, 32 px.
- **Perillas** de 92 px con arco de valor, valores de 38 px, marca en el arco del valor del pedal y "on pedal: X" bajo los valores cambiados. Parámetros de dos estados: solo interruptor; listas: solo desplegable. El rango ya no dice "def"; el valor por defecto está en el tooltip.
- **Cambios contra el pedal, no contra el defecto** (`src/model/changes.ts`): `diffPatch(device, working)` da nombre, cadena, bypass y valores; un bloque movido se compara con su bloque del pedal; uno nuevo no tiene "on pedal".
- **De B:** columna "Changes vs pedal" con **Undo** por cambio (vuelve ese valor al del pedal; la cadena entera cuando cambió el orden o los efectos); en la lista de patches, la cadena de cada uno como cuadritos de color (bypass hueco).
- **Deshacer/rehacer** por patch (`history` en `BankState`): ⌘Z / Ctrl+Z, ⇧⌘Z / Ctrl+Shift+Z (y Ctrl+Y); un arrastre de perilla es un solo paso (ediciones del mismo control a menos de 800 ms); Revert también se deshace (en el pedal, con `loadSlot … undoable`).
- **Selector de efectos** de altura fija: búsqueda por nombre, `fullName`, `reference`, `aliases` y categoría (código del manual y grupo de g200kg: "delay", "reverb", "comp", "drive"), nunca por la descripción (`src/model/effectSearch.ts`); Enter elige el primero; los efectos que pasarían del 100 % de DSP se marcan "won't fit". Muestra `fullName`, `reference` y `description` de `effectInfo()` cuando existan; con el mapa vacío funciona igual.
- **Encabezado del panel:** nombre, `fullName`, "based on {reference}" y la descripción cuando existan.
- **Nombre del patch:** contador n/10 y aviso del carácter rechazado, en un globo que no mueve nada.
- **Barra de pegar** flotante; se oculta después de pegar (el bloque copiado sigue en memoria, ⌘V pega otra vez) y vuelve al abrir otro patch.
- **Atajos:** ↑/↓ patch (no cuando el foco está en una perilla), 1-4 bloque, B bypass, ⌘/Ctrl+S guardar, ⌘/Ctrl+C/V copiar/pegar bloque; barra de ayuda fija abajo.
- **Time del Delay:** los símbolos de nota de g200kg (U+1D15E-1D161, que las fuentes no dibujan) se escriben "1/4", "1/8T", "1/16D", "1/4 ×16". Mismos valores.
- **Todo en inglés**, incluidas `#/s1`, `#/s3`, los errores de `backupFile`, `webMidi`, `pedalSession` y las etiquetas de aprobación de `s3`. Sin "g200kg" ni "Prototype S2" en pantalla. Vocabulario: *block* = ranura, *effect* = lo que contiene; *Save* escribe en el pedal, *Revert* descarta lo no guardado, *Restore* escribe de vuelta una copia guardada, *Undo* deshace un paso o un valor.
- **Fuentes** Big Shoulders Display y Atkinson Hyperlegible empaquetadas con `@fontsource` (OFL, en `THIRD_PARTY_NOTICES.md`), sin CDN.
- **Contraste:** texto tenue a 4,98:1, pista de perilla y bordes de control ≥ 3:1.

## Qué no quedó o falta probar

- **Estados que solo existen con el pedal** (píldora Live, "The pedal is on 12…", diálogos de restauración pendiente y de conflicto, menú Bank habilitado): cubiertos por tests con el pedal simulado (`src/ui/PedalEditorPage.test.tsx`), **no vistos renderizados**; no hay captura. Falta mirarlos con el pedal real.
- **Lógica de escritura sin cambios:** `usePedalSync.ts` solo cambió textos y `undoable: true` en el Revert. Deshacer en vivo envía la diferencia como cualquier edición (mismo camino de `withApprovedWrites()`); no probado con el pedal.
- **Textos de efectos:** `effectInfo.ts` sigue vacío en esta rama; la búsqueda por alias y la referencia en el panel se verán cuando se una la rama `effect-info`.
- **Nombres completos de parámetros** (tooltip "Presence" para "Prese"): no hay fuente verificada en el repo; pendiente (regla 4).
- **Los 3 valores por bloque** son los 3 primeros parámetros del efecto, no una selección curada.
- **Móvil:** usable, no optimizado (la lista de patches es una lista con scroll de 180 px, no un selector).
