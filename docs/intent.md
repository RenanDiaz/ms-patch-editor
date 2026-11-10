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
- Lista de los 50 patches con arrastrar y soltar.
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
- **v1 sin escucha en vivo.** Mientras se edita, la app no envía `0x28` ni `0x31`; los cambios viven solo en la copia de trabajo. `0x28` solo sale con Guardar.
- **Guardar** envía `C0 pp`, `0x28` y `0x32`, espera el ack (hasta 4 s), relee la ranura y solo limpia el indicador si la relectura coincide con lo escrito. Guardar cambia el patch activo del pedal; al terminar, la app vuelve al patch que estaba activo.
- **Escucha en vivo:** queda fuera de v1. Con `0x28` no es posible, porque cada cambio quedaría guardado. El único candidato es Parameter Edit `0x31`; antes de diseñarlo hay que probar en el pedal, con aprobación, si `0x31` persiste y si funciona en los 4 efectos.
- **Cambios hechos en el pedal:** con AUTO SAVE encendido los guarda el pedal por su cuenta. La app solo los detecta (el pedal emite `0x31` y `C0 pp`) y los muestra como conflicto, según la regla anterior.
- **Otras herramientas:** la utilidad de g200kg envía `0x28` en cada clic, así que escribe en el pedal aunque su AutoSave esté apagado. Ningún mensaje conocido lee los ajustes globales del pedal; el único sin descifrar, `0x60`, está prohibido.

## 4. Alcance v1

- Leer y mostrar los 50 patches y el patch activo al conectar.
- Cadena de hasta 4 bloques: activar o bypass, reordenar, agregar, quitar, cambiar tipo.
- Parámetros del bloque seleccionado, con nombre, rango y valor por defecto.
- Editar valores con arrastre, teclado y rueda, con control fino.
- Indicador de DSP por bloque. Si el patch excede la capacidad, Guardar se bloquea y explica por qué.
- Modelo de guardado de la sección 3.
- Respaldo y restauración del banco completo como archivo local.

## 5. No objetivos v1

- Firmware: no tocar nunca.
- Tempo, tuner y configuración global del pedal, salvo que S0 lo confirme.
- Auto guardado.
- Móvil, otros pedales de Zoom, navegadores que no sean Chromium (en la versión web).

## 6. Fuentes de datos

- **Protocolo y tablas de parámetros:** código MIT de g200kg. Cada parámetro se verifica contra el pedal real en S1.
- **Nombres de efectos y categorías:** manual de Zoom, sección "Effect Types".
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

1. ¿Empaquetas con Electron desde el inicio, o empiezas en web y decides después de S2?
2. ¿Qué patches de referencia debe replicar el prototipo primero?
