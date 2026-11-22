# Auditoría de la interfaz del editor (2026-11-22)

- **Qué se revisó:** la demo con datos falsos (`#/demo`) en el navegador integrado a 1440×900 y a 375 px, más el código de `src/ui/EditorPage.tsx`, `EditorPage.css`, `ParamKnob.tsx`, `TypePicker.tsx`, `BankRestoreDialog.tsx` y `PedalEditorPage.tsx`.
- **Lo que no se vio renderizado:** los estados que solo existen con el pedal (badge "PEDAL", "pedal en NN", "En vivo", conflicto, restauración pendiente, banco). Se revisaron leyendo el código; donde un hallazgo sale solo del código, lo dice.
- **Marco usado:** skills `frontend-design`, `design:design-critique`, `design:accessibility-review`, `design:ux-copy`, `ui-design-review:ui-review` y `ui-design-review:ui-compare`. UXKIN no está conectado: la comparación con otros editores sale del conocimiento general de esos productos, no de capturas abiertas en esta auditoría.
- **Criterio:** editar sonidos rápido, con el pedal enfrente y a veces con el bajo en las manos. Pesa más ver de un vistazo qué patch suena, la cadena y los valores, y ajustar sin errores, que la estética.

## 1. Qué hace cada parte de la pantalla

| Parte | Para qué sirve | Tarea que apoya |
|---|---|---|
| Barra superior: "MS-60B Edit" + badge de origen (`DATOS FALSOS` o `PEDAL · fw 2.10`) | Dice si se trabaja con el pedal real o con datos falsos | Confiar en que lo que se toca suena (o no) |
| "· pedal en NN NOMBRE" (solo pedal) | Patch activo en el pedal, que puede no ser el que se edita | Saber qué suena ahora |
| Casilla "En vivo" (solo pedal) | Enviar cada edición al pedal para escucharla | Ajustar de oído |
| Número + nombre del patch, con clic para renombrar | Identifica el patch en edición | Saber qué se edita; renombrar |
| Píldora "sin guardar" | El patch de trabajo difiere del pedal | No perder ni dejar cambios por error |
| Medidor de DSP total | Capacidad estimada usada | Saber si el patch cabe antes de guardar |
| Respaldar banco / Restaurar banco… (solo pedal) | Copia del banco a archivo y restauración selectiva | Proteger el banco |
| Revertir / Guardar | Descartar o hacer permanente | Cerrar la edición |
| Banners (bloqueo de guardado, ocupado, restauración pendiente, aviso de En vivo, mensajes de banco, error, conflicto) | Estados y decisiones del modelo de guardado | Resolver conflictos y errores |
| Lista de patches (izquierda) | Los 50 patches con un punto si tienen cambios | Cambiar de patch |
| Cadena IN → 4 ranuras → OUT | Bloques con categoría, LED on/bypass, nombre, barra de DSP, mover, quitar, copiar; arrastrar para reordenar | Ver y armar la cadena |
| Barra del portapapeles | Lo copiado y dónde pegarlo | Copiar efectos entre patches |
| Panel de parámetros | Nombre del bloque, categoría, DSP, estado, "Cambiar tipo…", y una perilla por parámetro con valor, rango y valor por defecto | Ajustar el sonido |
| Diálogos: elegir tipo, cambiar de patch con cambios, restaurar banco | Decisiones con consecuencias | Cambiar efectos, no perder trabajo, restaurar con control |

## 2. Primera impresión (2 segundos)

Lo primero que atrae el ojo son los tres LED verdes de la cadena y el botón azul "Guardar". Los LED están bien (dicen qué suena); "Guardar" llama la atención incluso deshabilitado, con el patch limpio. El nombre del patch es grande pero queda a la misma altura visual que todo lo demás de la barra. La pantalla se lee como un formulario oscuro ordenado: correcto y sin errores visibles, pero sin una jerarquía que diga "esto suena, esto es lo que editas, esto está pendiente". Por eso se siente genérica: todo tiene el mismo peso, el mismo gris y el mismo radio.

## 3. Problemas ordenados por impacto en la tarea

### Deben corregirse (afectan la tarea principal o la seguridad del banco)

1. **"Qué suena" no se ve de un vistazo.** "pedal en NN" es texto de 12 px gris pegado a la marca, y "En vivo" es una casilla de 12 px al lado. Son las dos respuestas más importantes con el pedal enfrente (¿lo que oigo es lo que veo?, ¿lo que toco suena?) y tienen el menor peso visual de la barra. Si el pedal está en otro patch que el editado, nada lo destaca. **Arreglo:** un bloque de estado propio, a la izquierda, con número grande del patch del pedal, nombre, y un indicador de En vivo que no se confunda con nada más; si el pedal y el editor están en patches distintos, decirlo en ese bloque ("Editas 07 · el pedal está en 12").
2. **"Sin guardar" se pierde y no dice qué cambió.** Píldora de 12 px con borde ámbar junto al nombre, y un punto de 8 px en la lista. No hay forma de ver qué parámetros cambiaron respecto al pedal: el color azul de `.changed` en el valor compara con el **valor por defecto del efecto**, no con lo guardado, así que un patch recién leído ya aparece lleno de valores "cambiados" y uno editado no muestra la diferencia que importa. **Arreglo:** marcar el cambio contra la copia del pedal (valor guardado al lado o en fantasma en la perilla) y un resumen "3 cambios" que se pueda abrir. Dejar la comparación con el valor por defecto como dato secundario (el rango ya lo muestra).
3. **Las acciones del banco están junto a Guardar.** "Restaurar banco…" (reescribe ranuras) va en la misma fila y con el mismo estilo que "Revertir" y a dos botones de "Guardar". Un clic equivocado abre un flujo de escritura masiva. El diálogo protege bien (lista, casillas, verificación), pero la ubicación invita al error. **Arreglo:** mover Respaldar/Restaurar a un menú "Banco" separado del área de guardado; dejar junto a Guardar solo Revertir.
4. **La cadena no deja escanear el sonido.** Cada bloque muestra categoría, nombre y una barra de DSP, pero ningún valor. Para saber cómo está el patch hay que hacer clic bloque por bloque. Un bloque en bypass solo atenúa el nombre (el LED gris `#333` sobre `#1b1d22` tiene contraste 1,3:1), así que on/off se distingue sobre todo por el verde. **Arreglo:** en cada bloque, 2-3 valores clave y un estado bypass inequívoco (palabra "bypass", bloque atenuado completo, patrón), no solo color.
5. **Los conflictos y errores son franjas que empujan la pantalla.** Siete banners posibles se apilan entre la barra y el cuerpo; cada uno mueve la cadena hacia abajo, y el de En vivo es permanente (dos líneas de texto que se leen una vez). El conflicto ("Cambiaste este patch en el pedal…") es una decisión que bloquea pero se presenta igual que un aviso. *(Visto en código.)* **Arreglo:** una sola zona de estado de altura fija; el conflicto como decisión con las dos versiones lado a lado (qué difiere); la explicación de En vivo en un tooltip o en la primera activación, no fija.
6. **Valores demasiado pequeños para leer a distancia.** El valor está en 14 px, el nombre del parámetro en 12 px gris y el rango en 11 px; la perilla mide 56 px con un puntero de 3 px. Con el bajo colgado y la pantalla a un metro, el número no se lee. **Arreglo:** valor ≥ 22 px con cifras tabulares, nombre ≥ 13 px, perilla ≥ 72 px con arco de valor relleno (no solo puntero).

### Deberían corregirse (consistencia, comprensión, accesibilidad)

7. **Bordes y pistas casi invisibles.** `--e-line #30343c` sobre `#1b1d22` = 1,35:1; la pista de la perilla y el fondo del medidor DSP (1,1:1) no alcanzan el 3:1 de WCAG 1.4.11. La perilla se lee solo por el puntero azul. **Arreglo:** pista y contornos ≥ 3:1; arco de valor relleno.
8. **Controles redundantes en parámetros de dos estados y de lista.** PreD (OFF/ON) y LoCut (lista) muestran una perilla **y** un botón o desplegable que hacen lo mismo. Dos controles para un valor confunden y ocupan espacio. **Arreglo:** dos estados = interruptor solo; lista = selector solo (o perilla con pasos y etiqueta, no ambos).
9. **Botones pequeños y de símbolos.** Mover/quitar/copiar son botones de ~23 px con ◀ ▶ ✕ ⧉. El ✕ ("Quitar bloque") está al lado del ▶ y no pide confirmación; con el patch en vivo se oye de inmediato. **Arreglo:** objetivos ≥ 32 px en escritorio (44 en táctil), quitar separado y con deshacer, iconos con texto o tooltip consistente.
10. **Teclado incompleto.** Las perillas son `role="slider"` con flechas, RePág/AvPág, Inicio/Fin y Supr: muy bien. Pero no hay atajos para cambiar de patch (↑/↓ en la lista), seleccionar bloque (1-4), alternar bypass, Guardar (Cmd/Ctrl+S) ni Revertir; el bloque en sí no es enfocable (solo sus botones internos). Con una mano en el bajo, el teclado es el control más rápido. **Arreglo:** atajos de una tecla documentados en un panel "?".
11. **Etiquetas en mayúsculas de 10-12 px** ("PATCHES", categoría del bloque) y **abreviaturas del pedal sin ayuda** (Prese, HiDMP, F.B, THRSH). Las abreviaturas vienen de la fuente verificada y deben quedarse, pero el nombre completo puede ir en un tooltip si está en el manual. *(Pendiente: solo usar nombres del manual de Zoom, regla 4.)*
12. **Disabled con opacidad .4** deja texto a ~2,9:1. "Guardar" deshabilitado sigue azul y es lo más llamativo de la pantalla. **Arreglo:** estado deshabilitado neutro; Guardar toma color solo cuando hay algo que guardar.
13. **DSP repetido en tres lugares** (barra total, barra por bloque, texto "DSP ~13%" en el panel) y la barra por bloque no tiene escala visible. **Arreglo:** un solo medidor segmentado por bloque (cada bloque su tramo y su color), con el total y el límite.
14. **Móvil:** la lista de 50 patches empuja la cadena y los parámetros fuera de la primera pantalla (a 375 px la cadena empieza bajo dos pantallas de lista). **Arreglo:** en móvil, la lista como selector desplegable o hoja.

### Textos (ux-copy)

15. **Vocabulario mezclado:** "bloque", "efecto" y "tipo" para lo mismo ("Cambiar tipo…", "Agregar bloque", "Copiar efecto con sus parámetros"). Elegir uno para la ranura (**bloque**) y otro para lo que contiene (**efecto**): "Cambiar efecto…", "Agregar efecto".
16. **El badge "DATOS FALSOS" en mayúsculas y ámbar** parece una alerta. Es un modo: "Demo (sin pedal)".
17. **Confirmación al cambiar de patch:** botones "Guardar / Descartar / Cancelar" correctos; el título usa el nombre del patch. Mejor nombrar el resultado: "Guardar y abrir 12", "Descartar cambios", "Seguir editando".
18. **Conflicto:** "Usar la del pedal" / "Conservar la mía" son claros; falta decir qué difiere y que "Conservar la mía" no escribe nada hasta Guardar.
19. **Banner de restauración pendiente** mezcla primera persona ("¿Lo restauro?") con la voz de la interfaz. Uniformar: "El patch 33 pudo quedar cambiado porque la app se cerró mientras editabas en vivo. Restaurar original / Dejar así".
20. **"Guardar bloqueado."** + razón: bien estructurado (qué pasa + por qué). Falta el cómo: "Quita o cambia un efecto para bajar del 100 %".
21. **Microtextos técnicos en la interfaz:** "def 40", "DSP estimado (g200kg)", "Prototipo S2". El usuario no necesita la fuente en la pantalla principal; puede ir en la ayuda.

### Pulido

22. Radio, borde y gris idénticos en bloques, panel, botones y diálogos: nada distingue la zona de edición de la de navegación.
23. Las ranuras vacías se ven como hueco punteado con "—"; solo la primera libre tiene "+ Agregar". Bien, pero ocupa un 25 % del ancho para nada; puede encogerse.
24. IN/OUT en 11 px gris: la idea de flujo de señal está, pero no se ve un cable que una los bloques.

## 4. Accesibilidad (WCAG 2.1 AA)

| Elemento | Primer plano | Fondo | Relación | Requerido | ¿Pasa? |
|---|---|---|---|---|---|
| Texto secundario (`--e-muted`) | #8b909a | #1b1d22 | 5,3:1 | 4,5:1 | Sí |
| Texto secundario sobre botón | #8b909a | #23262d | 4,7:1 | 4,5:1 | Justo |
| Acento (valores cambiados) | #3fa7ff | #1b1d22 | 6,6:1 | 4,5:1 | Sí |
| "sin guardar" | #f0b03c | #121316 | 9,7:1 | 4,5:1 | Sí |
| Bordes, pista de perilla | #30343c | #1b1d22 | 1,35:1 | 3:1 | No |
| LED apagado | #333333 | #1b1d22 | 1,33:1 | 3:1 | No |
| Fondo del medidor DSP | #23262d | #1b1d22 | 1,1:1 | 3:1 | No |
| Texto deshabilitado (opacidad .4) | ≈#6a6c70 | #23262d | ≈2,9:1 | (exento) | Mejorable |

- **Bien resuelto:** foco visible (`:focus-visible` con contorno de 2 px), perillas con `role="slider"`, `aria-valuetext` con la unidad, LED con `aria-pressed` y etiqueta, medidor con `role="meter"`, banners con `role="alert"`/`status`, diálogos nativos `<dialog>` con Escape.
- **Falta:** atajos para lo frecuente (§3.10); objetivos de 23 px (2.5.5 en táctil); estado on/off solo por color en el bloque (1.4.1); el bloque arrastrable no tiene alternativa de teclado más allá de ◀ ▶ (existe, bien, pero sin atajo); la lista de patches no anuncia "pedal en este patch".
- **Lector de pantalla:** la perilla anuncia "Gain, 60" con su valor; el valor por defecto y "cambiado" no se anuncian.

## 5. Qué conservar

- **El modelo de edición:** cadena arriba, parámetros del bloque seleccionado abajo, lista de patches a la izquierda. Es el de AX8-Edit y funciona.
- **Las perillas como control:** arrastre vertical con Shift fino, rueda, flechas, RePág/AvPág, doble clic al valor por defecto y escribir el número. Es el estándar de los plugins y está completo.
- **El rigor del guardado:** Guardar solo se habilita con cambios, se bloquea con DSP excedido y explica por qué; el diálogo al cambiar de patch; el aviso al cerrar la pestaña.
- **El diálogo de Restaurar banco:** lista lo que difiere, deja elegir, verifica cada ranura, permite detener y ofrece un respaldo previo. Es el mejor flujo de la app.
- **La barra del portapapeles:** dice qué se copió, de dónde, y qué se quita al insertar con la cadena llena.
- **Nombres en fuente monoespaciada de 10 caracteres**, como en la pantalla del pedal: ayuda a reconocer el patch.
- **El tono de los textos:** directos, sin disculpas, en segunda persona.

## 6. Comparación con otros editores

Sin UXKIN conectado; se compara con el funcionamiento conocido de cada producto, no con capturas abiertas en esta auditoría.

| Punto | AX8-Edit (Fractal) | HX Edit (Line 6) | Boss Tone Studio | Guitar Lab (Zoom) | Este editor |
|---|---|---|---|---|---|
| Cadena | Rejilla grande con cables; bloques con color por tipo | Fila con bloques de color por categoría, arrastrables | Diagrama de cadena con iconos de pedal | Fila de pedales dibujados | Fila de 4 tarjetas grises iguales |
| Qué suena | Preset activo grande en la barra; edición siempre del preset activo | Preset activo destacado; la app sigue al equipo | Patch activo destacado | No verificado | Texto pequeño "pedal en NN"; puede editarse otro patch |
| Cambios sin guardar | Indicador "modified" junto al preset; botón Save con color | Asterisco/indicador y Save en la barra | Indicador de edición | No verificado | Píldora pequeña + punto en lista |
| Parámetros | Pestañas por página; perillas grandes con valor debajo; tipo como desplegable en el bloque | Fila de perillas/deslizadores bajo la cadena, valores grandes | Perillas con aspecto de pedal | Perillas dibujadas | Rejilla de perillas pequeñas |
| Diferencias con lo guardado | No (solo "modified") | No | No | No | No (compara con el valor por defecto) |
| Banco y archivos | Gestor de presets aparte | Lista de setlists con importar/exportar | Librerías | Importar/exportar | Botones en la barra, junto a Guardar |
| Teclado | Atajos para guardar y navegar presets | Atajos básicos | Poco | Poco | Muy bueno en perillas; nada para navegar |

- **Lo que comparten casi todos:** color por categoría en los bloques (se reconoce la cadena sin leer), el patch activo como lo más visible, los valores grandes bajo cada perilla y la gestión del banco fuera del área de edición.
- **Donde este editor difiere y ayuda:** su modelo de guardado explícito con verificación, el bloqueo por DSP con explicación y la restauración selectiva son comparables a AX8-Edit.
- **Donde difiere y perjudica:** la cadena gris no se escanea, el patch que suena no domina, y el banco está junto a Guardar.
- **Oportunidad que nadie resuelve bien:** mostrar *qué* cambió respecto al pedal. Este editor ya tiene las dos copias (pedal y trabajo); es la ventaja más fácil de convertir en diseño.

## 7. Prioridades para el rediseño

1. **Estado del pedal como lo primero que se ve:** patch que suena, En vivo, y si coincide con el que se edita.
2. **Diferencias contra el pedal** en cada valor y en un resumen de cambios, en lugar de comparar con el valor por defecto.
3. **Cadena escaneable:** color por categoría, 2-3 valores clave por bloque, bypass inequívoco.
4. **Valores legibles a un metro** y perillas con arco de valor.
5. **Banco separado de Guardar**, en un menú propio.
6. **Atajos de teclado** para patch, bloque, bypass, Guardar y Revertir.
7. **Una zona de estado de altura fija** para avisos, conflictos y errores.

Las direcciones visuales en `docs/design/direcciones/` resuelven estas prioridades de tres maneras distintas.
