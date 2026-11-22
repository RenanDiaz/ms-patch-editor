# Direcciones visuales (2026-11-22)

Tres propuestas para la pantalla principal del editor, a 1440×900, con el mismo caso: patch 07 "DUB DRIVE", pedal en 07, En vivo activo, 3 cambios sin guardar en BassDrive (Gain 60 → 72, Blend 100 → 85, Mid +4 → +7) y Ba Chorus en bypass. Cada HTML es autocontenido (solo carga Google Fonts) y tiene su captura PNG al lado. Los problemas que resuelven están en `../auditoria-2026-11-22.md`.

Los nombres y rangos de parámetros salen de `src/protocol/effects60b.generated.ts`; los valores son de ejemplo. Los nombres de categoría en español ("Saturación", "Modulación"…) y los nombres de patch son propuestas de copia, no datos del pedal. Los atajos de teclado mostrados no existen todavía.

Las tres comparten: el cambio se marca contra **lo que tiene el pedal** (no contra el valor por defecto), una marca en el arco de la perilla indica el valor guardado, el bypass se ve sin depender del color, cada categoría tiene su color, y el banco (respaldar, restaurar) sale del área de Guardar a un menú propio.

## A · Escenario — `a-escenario.html`

- **Idea:** leer la pantalla a un metro, con el bajo colgado. El patch que suena es lo más grande de la pantalla, como el display del pedal.
- **Tipografía:** Big Shoulders Display (condensada, para números, nombres y valores de 40 px) y Atkinson Hyperlegible (diseñada para legibilidad) para el resto.
- **Paleta:** pizarra azulada `#18202a` / `#212b37`, texto `#eef3f7`, rojo de grabación `#ff5a4e` solo para En vivo y "el pedal está aquí", ámbar `#ffc94a` solo para cambios sin guardar; un color por categoría en la franja de cada bloque.
- **Cómo prioriza la tarea:** banda de estado de 118 px con número y nombre gigantes, "En vivo" y "3 cambios sin guardar" como píldoras, DSP segmentado por bloque. Cada bloque muestra 3 valores clave; las perillas miden 104 px y debajo dicen "en el pedal: 60".
- **Qué sacrifica:** densidad. Caben 20 patches en la lista sin desplazarse, la cadena solo muestra 3 valores por bloque y queda espacio vacío bajo el panel. Es la más cercana a la estructura actual, la más fácil de implementar.

## B · Banco de trabajo — `b-banco-de-trabajo.html`

- **Idea:** el editor como mesa de comparación: siempre a la vista qué difiere del pedal y qué hay en todo el banco. Modo claro, para trabajar con calma frente a la computadora.
- **Tipografía:** Hanken Grotesk para la interfaz y Red Hat Mono para nombres de patch y valores (cifras alineadas, eco del display de 10 caracteres).
- **Paleta:** gris frío `#e4e8ec` con paneles blancos, tinta `#17202b`, cobalto `#1f4fd1` para selección y Guardar, rojo `#c62a22` para En vivo, ámbar oscuro `#8a5a00` sobre `#fff0c7` para cambios.
- **Cómo prioriza la tarea:** columna derecha "Cambios frente al pedal" con cada diferencia y su "Deshacer"; el botón dice "Guardar 3 cambios". La lista de patches es una tabla con la cadena de cada patch en cuadritos de color (bypass hueco), así se escanea el banco sin abrir patches. Línea oscura superior con dispositivo, "pedal en 07" y En vivo como interruptor.
- **Qué sacrifica:** lectura a distancia (valores de 26 px) y el ambiente de escenario; tres columnas dejan el panel central más estrecho. Modo claro en un cuarto oscuro puede deslumbrar.

## C · Cadena al frente — `c-cadena-al-frente.html`

- **Idea:** la cadena es el patch. Cada bloque lista **todos** sus valores, así se ve el sonido completo sin hacer clic; el bloque elegido se abre como un cajón hacia el panel de perillas. Se navega como en el pedal: ◀ ▶ de a un patch.
- **Tipografía:** Azeret Mono para nombres y valores (tabular, técnica), Onest para etiquetas y botones.
- **Paleta:** petróleo `#13282b` / `#1b3539` / `#244449`, cable `#6f9b97`, texto `#eaf4f2`, coral `#ff6b5b` para En vivo, ámbar `#f4c152` para cambios y para Guardar (Guardar se pinta del color de "hay algo que guardar").
- **Cómo prioriza la tarea:** encabezado con anterior / actual / siguiente y botones grandes de paso; banco de 50 como rejilla de 5×10 (números, punto si tiene cambios, borde punteado si está vacío); los valores cambiados llevan punto ámbar también en la cadena; barra de atajos fija abajo.
- **Qué sacrifica:** los nombres de patch en la rejilla (solo números; el nombre aparece al pasar el cursor) y la explicación textual de los estados. Es la que más cambia la estructura actual y la que más depende del teclado para lucir.

## Capturas

`a-escenario.png`, `b-banco-de-trabajo.png`, `c-cadena-al-frente.png` (Chrome sin interfaz, 1440×900).
