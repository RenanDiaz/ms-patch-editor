# Prueba de usabilidad con usuario sin contexto — 2026-11-22

Persona: bajista que acaba de comprar el MS-60B y abre la app por primera vez. No leí documentación ni código; solo usé la interfaz en Chrome con el pedal conectado por USB (unos 30 minutos).

## 1. Resumen en 5 líneas

1. Lo básico se entiende rápido: lista de patches a la izquierda, cadena de 4 bloques arriba y perillas abajo. Mover perillas, escribir valores y agregar efectos funciona a la primera.
2. Lo que más me asustó: nada más conectar apareció un aviso amarillo sobre un patch "que pudo quedar con cambios sin guardar". Era mi primera vez, así que no entendí de qué cambios me hablaba.
3. No hay deshacer paso a paso: Cmd+Z no hace nada. La única marcha atrás es "Revertir", que descarta todo lo del patch y no pide confirmación.
4. Hay botones que cambian de lugar justo cuando voy a pulsarlos (barras de aviso que aparecen o desaparecen, el diálogo de efectos que cambia de altura). Por eso abrí un patch que no quería.
5. Copiar y pegar un bloque entre patches y el bloqueo por DSP lleno están muy bien resueltos, pero el nombre del patch se corta en silencio a 10 caracteres y el buscador de efectos no encuentra "delay" en nombres como "AnalogDly".

## 2. Lo que funcionó bien

- **Conectar** es claro: el texto explica que la app lee los 50 patches, que cambia de patch y vuelve al original, y que "Al conectar no escribe nada". El botón muestra el progreso ("Leyendo 30/50…").
- **Ver qué suena**: arriba dice "pedal en 33 Empty" y el patch está marcado en la lista. Los bloques muestran categoría (DYN/FLTR, OD/DIST, AMP…), nombre y un punto verde si están encendidos.
- **Perillas**: se pueden arrastrar, usar con las flechas del teclado, o hacer doble clic en el número y escribir el valor (escribí 80 en Gain y funcionó). Debajo de cada perilla salen el rango y el valor por defecto ("0 … 100 · def 93"), y eso ayuda.
- **Saber qué falta guardar**: al tocar algo aparecen la etiqueta "sin guardar", un punto amarillo junto al patch y "PATCHES · 1 CON CAMBIOS". Es muy claro.
- **Cambiar de patch con cambios pendientes** abre un diálogo bien escrito: *"Saw" tiene cambios sin guardar — ¿Qué hago antes de abrir "Swells"? [Guardar] [Descartar] [Cancelar]*.
- **Agregar un efecto**: "+ Agregar" abre una lista con pestañas por categoría, un buscador y el % de DSP de cada efecto. Armé compresor → drive → ampli → delay en un par de minutos.
- **Reordenar**: arrastrar un bloque a otra posición funciona, y las flechas ◀ ▶ también.
- **Copiar un bloque a otro patch**: después de "Copiar bloque" aparece una barra que me sigue al cambiar de patch: *"Copiado: Bass Muff · bloque 2 de 33 GraveSucio [Reemplazar bloque 1] [Insertar antes de 1] [Insertar después de 1]"*. Además avisa qué se pierde: "(se quita PitchSHFT)". Excelente.
- **DSP lleno**: la barra se pone roja y sale un mensaje que explica el problema y la solución: *"Guardar bloqueado. El patch usa ~110% del DSP (estimado). El pedal no puede procesarlo y mostraría "DSP Full!". Cambia un efecto por uno más liviano o quítalo; los efectos en OFF también consumen DSP."*
- **Respaldar banco** descargó un archivo y lo confirmó ("Respaldo descargado. [OK]").

## 3. Problemas, de más grave a menos grave

### 3.1 Aviso de "cambios sin guardar" justo al conectar por primera vez (grave)
- **Qué intentaba:** solo conectar el pedal.
- **Qué esperaba:** ver mis patches.
- **Qué pasó:** apareció una barra amarilla: *"El patch 33 "Empty" pudo quedar con cambios sin guardar (la app se cerró mientras editabas en vivo). ¿Lo restauro a como estaba? [Restaurar] [Dejarlo así]"*. Yo nunca había editado nada, y no hay forma de saber qué cambiaría cada opción. Elegí "Restaurar" y el patch, que se llamaba "Empty" y tenía un solo bloque THRU, pasó a tener **dos Delay**. Quedé más confundido: ¿ese era el original o lo acababa de romper?
- **Sugerencia:** mostrar las dos versiones lado a lado ("ahora: THRU" / "como estaba: Delay + Delay") antes de elegir, y explicar por qué la app cree que se cerró mientras editaba.

### 3.2 No hay deshacer; "Revertir" lo borra todo sin preguntar (grave)
- **Qué intentaba:** deshacer solo el último ajuste (subí Blend de 40 a 43 y quería volver).
- **Qué esperaba:** que Cmd+Z deshiciera ese paso, como en cualquier editor.
- **Qué pasó:** Cmd+Z no hizo nada (Blend siguió en 43). La única salida es "Revertir", que descarta **todos** los cambios del patch de una vez y sin confirmación. En el patch 31 revertí un bloque pegado, un reordenamiento y un bypass con un solo clic, sin aviso.
- **Sugerencia:** deshacer/rehacer por pasos (Cmd+Z / Cmd+Shift+Z) y una confirmación en Revertir cuando hay varios cambios.

### 3.3 Los botones se mueven justo antes del clic (grave para la confianza)
- **Qué intentaba:** abrir el patch 10 "FAT Drv".
- **Qué esperaba:** que se abriera FAT Drv.
- **Qué pasó:** al desaparecer la barra amarilla, toda la lista subió y mi clic cayó en **12 Reggae**. Como el modo en vivo está activo, el pedal cambió de patch. Lo mismo pasa con "Guardando…", "Restaurando el patch 33…", "Leyendo el banco…" y "Guardar bloqueado…": cada una empuja la pantalla hacia abajo. En el diálogo "Agregar bloque", al cambiar de pestaña cambia la altura del diálogo y las pestañas quedan en otro lugar (con DYN/FLTR estaban a una altura y con AMP saltaron más abajo).
- **Sugerencia:** reservar un espacio fijo para los mensajes, o usar avisos flotantes que no muevan el contenido. Darle una altura fija al diálogo de efectos.

### 3.4 Un doble clic en la barra de pegar puede borrar un efecto (medio)
- **Qué intentaba:** pegar el Bass Muff después del bloque 1.
- **Qué pasó:** pulsé "Insertar después de 1" y funcionó. Pero la barra sigue abierta y bajo el mismo cursor ahora está *"Insertar después de 2 (se quita PitchSHFT)"*. Un segundo clic (o un doble clic) borra un efecto.
- **Sugerencia:** cerrar la barra después de pegar, o al menos no poner una acción destructiva justo donde estaba el clic anterior.

### 3.5 El nombre del patch se corta en silencio (medio)
- **Qué intentaba:** llamar al patch "Grave Sucio Ñandú".
- **Qué pasó:** el campo dejó de aceptar letras y quedó "Grave Suci", sin ningún aviso del límite. No sé qué pasa con la Ñ y la ú en el pedal.
- **Sugerencia:** mostrar un contador "10/10" y avisar qué caracteres acepta el pedal.

### 3.6 El buscador de efectos no encuentra abreviaturas (medio)
- **Qué intentaba:** buscar "delay".
- **Qué pasó:** solo salieron Delay, ModDelay, DynaDelay, TremDelay, ICE Delay y ModDelay2. No salieron TapeEcho, AnalogDly, ReverseDL, PitchDly ni StereoDly, aunque están en la pestaña DLY/REV. Además Enter no elige el único resultado (busqué "driveecho", pulsé Enter y no pasó nada).
- **Sugerencia:** que la búsqueda también mire la categoría y acepte sinónimos (delay ↔ Dly/DL/Echo), y que Enter elija el primer resultado.

### 3.7 La lista de efectos no avisa antes de pasarse de DSP (bajo)
- **Qué pasó:** con el patch al 80% elegí SuperB (30%) y recién después saltó "Guardar bloqueado… ~110%". La lista ya muestra el % de cada efecto, pero no marca cuáles ya no caben.
- **Sugerencia:** atenuar o marcar en la lista los efectos que harían pasar del 100%.

### 3.8 Guardar no confirma nada ni muestra un resultado claro (bajo)
- **Qué pasó:** "Guardar" escribe de inmediato. Sale "Guardando…" un momento y luego solo desaparece la etiqueta "sin guardar". Está bien que no pida confirmación, pero no hay un "Guardado en 33 ✓" que quede visible un rato. Además, mientras edito el nombre, el encabezado sigue diciendo "pedal en 33 Empty" hasta que guardo.

### 3.9 El patch "Empty" no estaba vacío (bajo, por la confusión de 3.1)
- En la lista decía "Empty", pero tras restaurarlo tenía dos Delay. Para alguien nuevo, el nombre no ayuda a saber qué patch está libre para usar.

### 3.10 Sin descripción de qué hace cada efecto (bajo)
- Entre RackComp, M Comp, OptComp, GrayComp, 160 Comp, DualComp y D Comp elegí al azar. Una línea por efecto ("compresor óptico suave") ayudaría mucho.

### 3.11 Textos raros debajo de algunas perillas (bajo)
- En Time del Delay se ve *"1 … ▒ x16 · def 560"*: aparece un recuadro gris o un carácter que no se lee.
- No sé qué significa que algunos números estén en azul y otros en blanco (¿distinto del valor por defecto?).

### No probado
- **"Restaurar banco…"**: no lo abrí, para no arriesgarme a sobrescribir todo.
- **Desconectar** y la casilla **"En vivo"**: no los desactivé.

## 4. Vocabulario y textos confusos

- **"DSP = estimado de g200kg por efecto."** No sé quién o qué es "g200kg". Para un usuario basta con "DSP = carga estimada del procesador del pedal".
- **"En vivo"** y la línea de abajo (*"Lo que muevas en el propio pedal cuenta como edición y también se revierte si no guardas"*): es mucha información de golpe en letra muy chica, y no queda claro qué pasa si desmarco la casilla.
- **"Revertir"** frente a **"Restaurar"** frente a **"Restaurar banco…"** frente a **"Descartar"**: cuatro palabras para ideas parecidas. No sé cuál toca solo la pantalla y cuál toca el pedal.
- **"bypass"** y **"activo"** en el subtítulo del bloque, junto al punto verde o gris: está bien, pero "bypass" es jerga y en el punto no hay texto ni tooltip.
- **Nombres de parámetros abreviados y con mayúsculas mezcladas**: "Trebl", "Prese", "HiDMP", "P-P", "Bal", "TIME / Time", "F.B". Ya sé que vienen del pedal, pero un tooltip con el nombre completo ("Presence", "Feedback", "High Damp", "Ping-Pong") ayudaría.
- **Botones del bloque solo con íconos** (◀ ▶ ✕ ⧉): no muestran tooltip al pasar el mouse; tuve que adivinar que ⧉ era "Copiar".
- **"Dejarlo así"**: ¿así cómo? ¿con los cambios o sin ellos?

## 5. Qué cambiaría primero

1. **Deshacer/rehacer por pasos** (Cmd+Z) y confirmación en Revertir. Es lo que más miedo da cuando todo suena en vivo.
2. **Que nada se mueva bajo el cursor**: un lugar fijo para los mensajes de estado y altura fija en el diálogo de efectos.
3. **Rehacer el aviso de "cambios sin guardar" al conectar**, mostrando qué cambiaría con cada opción (antes y después).
4. **Mejor búsqueda de efectos** (sinónimos, Enter elige) con una descripción corta y una marca de "no cabe en el DSP".
5. **Contador y aviso en el nombre del patch**, tooltips en los botones de ícono y en los parámetros abreviados, y quitar "g200kg" de la interfaz.

## Patches que modifiqué durante la prueba (para restaurar)

| Patch | Nombre antes | Nombre después | Qué pasó | ¿Guardado en el pedal? |
|---|---|---|---|---|
| 33 | Empty | **GraveSucio** | Pulsé "Restaurar" en el aviso inicial (pasó de THRU a Delay + Delay). Luego: OptComp → Bass Muff → SVT → Delay (Time 400, Mix 30, Tail ON) | **Sí** (Guardar) |
| 10 | FAT Drv | FAT Drv | BassDrive: Gain 67 → 80, Blend 40 → 43 | **Sí** (Guardar) |
| 31 | Saw | Saw | Pegué un Bass Muff, reordené y apagué Ba Synth; luego Revertir y Descartar | No (revertido) |
| 32 | Swells | Swells | Agregué DriveEcho y SuperB (DSP 110%); luego Revertir | No (revertido) |
| 12 | Reggae | Reggae | Solo lo abrí por accidente (sin cambios) | No |

Al cerrar la pestaña el pedal quedó en el **patch 32 Swells**. Al empezar estaba en el 33.
