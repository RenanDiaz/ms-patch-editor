# Intent: MS-60B Patch Editor

- **Estado:** borrador v4. Decisiones: web app primero, guardado explícito con botón.
- **Dispositivo:** Zoom MS-60B (MultiStomp para bajo), 50 patches, 4 efectos por patch
- **Referencia de protocolo:** [zoom-ms-utility](https://github.com/g200kg/zoom-ms-utility) de g200kg, licencia MIT. Se reutiliza con atribución.
- **Referencia de UX:** AX8-Edit (Fractal). Se toma el modelo de edición, no el código ni los assets.
- **Uso:** personal

## 1. Hallazgos que definen el proyecto

- El pedal controla por USB con MIDI. El manual no lo documenta, pero la utilidad de g200kg lo usa: lee los 50 patches, edita parámetros, refleja cambios hechos en el pedal y exporta a archivo.
- El protocolo es código abierto con licencia MIT. No hay ingeniería inversa que hacer.
- Web MIDI no existe en Safari. La versión web requiere Chromium.

## 2. Objetivo

Una interfaz de edición de patches para el MS-60B, inspirada en AX8-Edit:

- Cadena de los 4 bloques visible de punta a punta.
- Panel de parámetros del bloque seleccionado.
- Lista de los 50 patches. (Arrastrar y soltar patches quedó fuera de v1.)
- Indicador de DSP por bloque.
- Edición en un buffer local, con guardado explícito al pedal mediante un botón.

## 3. Modelo de guardado

Esto sigue a AX8-Edit y reemplaza el auto guardado de la utilidad de g200kg.

- Cada patch tiene dos copias: la del pedal y la de trabajo en la app. La de trabajo puede tener cambios sin guardar.
- Un indicador muestra cuando el patch tiene cambios sin guardar.
- **Guardar** escribe el patch de trabajo en su ranura del pedal. **Revertir** descarta los cambios y vuelve a leer del pedal.
- Cambiar de patch con cambios sin guardar pide confirmación: guardar, descartar o cancelar.
- Si el usuario cambia algo en el pedal mientras hay cambios sin guardar en la app, la app muestra el conflicto y deja elegir cuál copia conservar.
- **Verificado en S3 (ver `docs/protocol.md` §9.2), firmware 2.10:** el pedal guarda en la ranura todo patch que recibe por `0x28` (Send Patch), con AUTO SAVE encendido o apagado, y el cambio sobrevive un reinicio. Store (`0x32`) responde con un ack `F0 52 00 5F 00 00 F7` unos 2,5 s después. Lo que corrige de S0: `0x28` no es solo buffer de edición, y AUTO SAVE no influye en lo que llega por MIDI.
- **Escucha en vivo (decisión del usuario, 2026-11-10):** lo que se edita en la app se envía al pedal para escucharlo al momento. Solo Guardar deja el cambio como permanente. Al salir de un patch sin guardar (cambiar de patch, Revertir, desconectar), la app vuelve a enviar el patch original y relee la ranura para comprobarlo.
- **Guardar** envía `C0 pp`, `0x28` y `0x32`, espera el ack (hasta 4 s), relee la ranura y solo limpia el indicador si la relectura coincide con lo escrito. Guardar cambia el patch activo del pedal; al terminar, la app vuelve al patch que estaba activo.
- **Mecanismo de la escucha en vivo (probado, `docs/protocol.md` §9.3):** `0x28` y `0x31` cambian el buffer del patch activo, y el pedal lo guarda en la ranura al salir del patch, con AUTO SAVE ON u OFF. `0x31` funciona en los efectos 1-3, no en el 4.
  - Parámetros de los efectos 1-3: `0x31`. Efecto 4 y cambios de cadena: `0x28`.
  - Al salir sin guardar, la app envía el patch original por `0x28` antes del cambio de patch, y relee la ranura.
  - Si el usuario cambia de patch en el pedal mientras edita en vivo, la app lo detecta sondeando el patch activo (`0x33` cada 250 ms; el pedal no lo anuncia) y restaura la ranura anterior. Cambios que el pedal tampoco anuncia (por ejemplo encender el efecto 4) se detectan releyendo su buffer (`0x29`) cada segundo.
  - Si la app se cierra de golpe: el cambio solo queda si luego se cambia de patch en el pedal. La app guarda en el navegador la ranura y sus bytes originales antes del primer cambio, y al reconectar ofrece restaurarla.
- **Advertencia al usuario:** lo que se mueve en el propio pedal con AUTO SAVE encendido lo guarda el pedal.
- **Cambios hechos en el pedal:** con AUTO SAVE encendido los guarda el pedal por su cuenta. La app los detecta (`0x31` que emite el pedal al girar perillas, sondeo de `0x33` y relectura del buffer) y, sin escucha en vivo, los muestra como conflicto.
- **Otras herramientas:** la utilidad de g200kg envía `0x28` en cada clic, así que escribe en el pedal aunque su AutoSave esté apagado. Ningún mensaje conocido lee los ajustes globales del pedal; el único sin descifrar, `0x60`, está prohibido.

## 4. Alcance v1

- Leer y mostrar los 50 patches y el patch activo al conectar.
- Cadena de hasta 4 bloques: activar o bypass, reordenar, agregar, quitar, cambiar tipo.
- Parámetros del bloque seleccionado, con nombre, rango y valor por defecto.
- Editar valores con arrastre, teclado y rueda, con control fino.
- Indicador de DSP por bloque. Si el patch excede la capacidad, Guardar se bloquea y explica por qué.
- Modelo de guardado de la sección 3.
- Respaldo y restauración del banco completo como archivo local. El respaldo vuelve a leer los 50 patches; la restauración muestra las ranuras que difieren, escribe solo las elegidas y verifica cada una. Ambos se rechazan si hay cambios sin guardar.

## 5. No objetivos v1

- Firmware: no tocar nunca.
- Tempo, tuner y configuración global del pedal, salvo que S0 lo confirme.
- Auto guardado.
- Móvil, otros pedales de Zoom, navegadores que no sean Chromium (en la versión web).

## 6. Fuentes de datos

- **Protocolo y tablas de parámetros:** código MIT de g200kg. Cada parámetro se verifica contra el pedal real en S1.
- **Nombres de efectos y categorías:** manual de Zoom, sección "Effect Types", y la lista oficial "Effect Types and Parameters (Ver.2)" (`docs/E_MS-60B_FX-list_v2.pdf`) para los efectos de firmware 2. Los 142 nombres coinciden con g200kg (verificado el 2026-11-22).
- **Nunca desde memoria.** Si un valor no está en una de estas fuentes, no entra en la UI.

## 7. Spikes

Todos sin escrituras, salvo S3, que usa un patch de prueba respaldado antes.

### S0: Lectura del código de g200kg
- **Preguntas:**
  - ¿Qué mensajes usa para leer patches, leer parámetros y escribir un patch?
  - ¿Hay un mensaje para cambiar un parámetro en vivo sin persistirlo? Esto define si la sección 3 puede escuchar cambios antes de guardar.
- **Salida:** documento de protocolo con bytes, fuente y atribución.

### S1: Lectura desde TypeScript
- **Pregunta:** ¿un módulo TypeScript que implementa la lectura reproduce los datos de la utilidad?
- **Método:** leer los 50 patches con el módulo y comparar con la utilidad en Chrome, patch por patch.
- **Criterio de salida:** coincidencia completa.

### S2: Prototipo de UI con datos falsos
- **Pregunta:** ¿la cadena, el panel y el modelo de guardado se entienden con 4 efectos?
- **Método:** prototipo web con Vite y React, sin pedal, probado con 2 o 3 patches de referencia.
- **Criterio de salida:** tiempo para armar un patch y guardar, comparado con la utilidad de g200kg.

### S3: Escritura controlada
- **Pregunta:** ¿guardar desde la app deja el pedal en el estado esperado?
- **Método:** respaldar el banco, escribir un patch de prueba en una ranura elegida (no hay ranuras libres; se usó la 33, "Empty"), leerlo de vuelta, restaurar.
- **Criterio de salida:** lectura idéntica al patch escrito y banco restaurado.
- **Resultado (2026-11-10):** cumplido. Lectura idéntica y ranura restaurada a los bytes de la captura de S1. Detalle en `docs/protocol.md` §9.

## 8. Criterios de aceptación v1 (borrador)

- Dado el pedal conectado, cuando se abre la app, entonces muestra los 50 patches y el patch activo.
- Dado un patch, cuando el usuario reordena la cadena o mueve un parámetro, entonces la UI cambia y aparece el indicador de cambios sin guardar.
- Dado un patch con cambios, cuando el usuario presiona Guardar, entonces el pedal refleja el patch y el indicador se limpia.
- Dado un patch con cambios, cuando el usuario presiona Revertir, entonces la app vuelve al patch del pedal.
- Dado un patch con cambios, cuando el usuario cambia de patch, entonces la app pide confirmación.
- Dado un patch que excede el DSP, cuando el usuario intenta guardar, entonces la app bloquea la escritura y explica el motivo.
- Dado un respaldo, cuando se restaura, entonces el banco queda igual al respaldo.

## 9. Riesgos

- **Escrituras no intencionales.** Cualquier `0x28` queda guardado. Mitigado con `withApprovedWrites()` como único camino de escritura y sin envíos fuera de Guardar.
- **Conflictos con el pedal.** Cambios hechos en el pedal mientras la app tiene cambios sin guardar. Mitigado con la regla de conflicto de la sección 3.
- **Parámetros incorrectos.** Mitigado con la verificación en S1 y S2.
- **Límites de Chromium.** La versión web no corre en Safari.

## 10. Plataforma: web primero, Electron después

- **Desarrollo y prototipo como web app** con Vite, React y TypeScript. Es lo más rápido para iterar en S1 y S2, y no hay empaquetado de por medio.
- **Empaquetado con Electron** cuando el prototipo sea estable. Solo cambia el contenedor. Hay que configurar el manejador de permisos para MIDI en Electron, o el navegador incrustado pedirá permiso en cada inicio.
- **Diseño del código:** el acceso a MIDI va detrás de una interfaz pequeña (`MidiTransport`). Así la web app y la versión Electron usan la misma lógica, y el código de protocolo no depende del contenedor.
- **Swift + CoreMIDI** se descarta para v1.

## 11. Preguntas abiertas

1. ~~¿Empaquetas con Electron desde el inicio?~~ Respondida: web primero; Electron cuando v1 esté cerrada.
2. ¿Qué patches de referencia debe replicar el prototipo primero?

## 12. Pendientes (ideas por implementar)

### P1: Copiar y pegar un efecto entre patches — implementado (2026-11-22)
- **Idea (usuario, 2026-11-20):** copiar un efecto con sus parámetros de un patch y pegarlo en el patch que se edita.
- **Copiar:** botón ⧉ en cada bloque (o Cmd/Ctrl+C sobre el bloque seleccionado). Guarda en el portapapeles de la app el efecto, ON/OFF y los 9 parámetros. Solo lee. El portapapeles se mantiene al cambiar de patch.
- **Pegar:** una barra muestra lo copiado y de dónde viene. "Reemplazar bloque N" (Cmd/Ctrl+V) cambia el bloque seleccionado; "Insertar antes/después de N" (Shift+Cmd/Ctrl+V = después) lo agrega. Un THRU solo se reemplaza. Con 4 bloques, insertar desplaza la cadena y quita el último; el botón dice cuál se quita.
- **Escrituras:** pegar es una edición más del patch de trabajo. Con escucha en vivo se envía al pedal (`0x28`) y se revierte si no se guarda; solo Guardar la deja permanente. No hace falta una aprobación aparte.
- **DSP:** si el pegado excede la capacidad estimada, Guardar se bloquea con la explicación, como con cualquier otro cambio.
- **Efectos repetidos: verificado (2026-11-22).** Con aprobación del usuario, en la ranura 33 se armó Delay + Delay copiando y pegando, se guardó y la relectura coincidió byte por byte. El pedal mostró los dos Delay encendidos y el usuario confirmó que suenan ambos. La app permite el mismo efecto en varias ranuras. La 33 se restauró a "Empty" (verificada).

### P2: Sincronizar cambios por MIDI a través de la app
- **Idea (usuario, 2026-11-22):** sincronizar cambios de efectos o patches por MIDI a través de la app con el pedal conectado.
- **Por aclarar con el usuario antes de diseñar:** qué se sincroniza y con qué (otro dispositivo o software MIDI, otro pedal, la app en otra computadora), en qué dirección, y si los cambios deben guardarse o solo escucharse.
- **Reglas que aplican:** cualquier envío al pedal pasa por `withApprovedWrites()`; solo Guardar deja un cambio permanente (CLAUDE.md, reglas 1 y 3).

### P3: Dirección de THRSH y Bal (prueba de oído pendiente)
- **Por qué:** el reporte de Nancho Bass (2026-11-22) pidió saber hacia dónde va cada parámetro, y la lista oficial de Zoom solo dice qué controla (`docs/param-info-sources.md`).
- **Prueba 1, THRSH (M Comp):** M Comp solo, Ratio 10, ATTCK 1, Level 100. Comparar THRSH 0 y 50 tocando notas fuertes y suaves: ¿en cuál comprime más?
- **Prueba 2, Bal (Ba Squeak):** Ba Squeak solo, Gain 100, Level 100. Comparar Bal 0 y 100: ¿en cuál suena limpio?
- **Cómo:** en la ranura 33 con escucha en vivo y sin guardar (Revert al final), o el usuario mueve las perillas y la app solo lee. Escribir en el pedal requiere la aprobación del usuario.
- **Registro:** actualizar `help` de esos parámetros en `src/model/paramInfo.ts` con la fuente "prueba de oído del usuario" y la fecha, solo para los efectos probados.

## 13. Rediseño (decisiones del usuario, 2026-11-22)

- **Dirección visual:** A "Escenario" (`docs/design/direcciones/a-escenario.html`) como base, con dos ideas de B "Banco de trabajo": la lista de cambios frente al pedal con deshacer por cambio, y la cadena de cada patch como cuadritos de color en la lista de patches. Insumos: `docs/design/auditoria-2026-11-22.md` y `docs/ux/usuario-real-2026-11-22.md`.
- **Idioma de la interfaz: inglés**, toda. La documentación del proyecto sigue en español.
- **Textos auxiliares por efecto** (`src/model/effectInfo.ts`): nombre completo sin abreviar, referencia real (el equipo que modela, sobre todo amps y gabinetes) y una descripción corta. Fuente: la lista oficial de Zoom Ver.2 y g200kg; nada de memoria (regla 4). Las descripciones se redactan con palabras propias.
- **Búsqueda de efectos:** coincide con el nombre del pedal, el nombre completo, la referencia, alias (p. ej. "delay" encuentra AnalogDly) y la categoría. **No** busca en la descripción. Enter elige el primer resultado.
- **Categorías:** las del manual (DYN/FLTR, OD/DIST, AMP, MOD/SFX, DLY/REV), no nombres inventados.
