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
- **Resuelto en S0 (ver `docs/protocol.md` §4):** sí existen mensajes para cambiar el buffer de edición sin persistir (`0x31`, `0x28`); solo `0x32` persiste. Ningún mensaje conocido lee los ajustes globales del pedal (AUTO SAVE incluido); el único sin descifrar, `0x60`, está prohibido.
- **v1 sin escucha en vivo.** Mientras se edita, la app no envía `0x31` ni `0x28`; los cambios viven solo en la copia de trabajo. Guardar envía `C0 pp`, `0x28` y `0x32`. Funciona con AUTO SAVE del pedal encendido o apagado; no es requisito apagarlo.
- **Escucha en vivo opcional.** Un modo que envía `0x31`/`0x28` en cada cambio. Al activarlo, la app pide al usuario confirmar que AUTO SAVE está apagado, porque no lo puede comprobar.
- **Verificación en S3** (con aprobación): si AUTO SAVE persiste los cambios que llegan por MIDI. Si no los persiste, se quita el aviso del modo en vivo.
- **Cambios hechos en el pedal** con AUTO SAVE encendido los guarda el pedal por su cuenta. La app solo los detecta (el pedal emite `0x31`) y los muestra como conflicto, según la regla anterior.

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
- **Método:** respaldar el banco, escribir un patch de prueba en una ranura libre, leerlo de vuelta, restaurar.
- **Criterio de salida:** lectura idéntica al patch escrito y banco restaurado.

## 8. Criterios de aceptación v1 (borrador)

- Dado el pedal conectado, cuando se abre la app, entonces muestra los 50 patches y el patch activo.
- Dado un patch, cuando el usuario reordena la cadena o mueve un parámetro, entonces la UI cambia y aparece el indicador de cambios sin guardar.
- Dado un patch con cambios, cuando el usuario presiona Guardar, entonces el pedal refleja el patch y el indicador se limpia.
- Dado un patch con cambios, cuando el usuario presiona Revertir, entonces la app vuelve al patch del pedal.
- Dado un patch con cambios, cuando el usuario cambia de patch, entonces la app pide confirmación.
- Dado un patch que excede el DSP, cuando el usuario intenta guardar, entonces la app bloquea la escritura y explica el motivo.
- Dado un respaldo, cuando se restaura, entonces el banco queda igual al respaldo.

## 9. Riesgos

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
