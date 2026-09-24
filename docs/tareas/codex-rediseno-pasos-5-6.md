# Encargo para Codex · Rediseño, pasos 5 y 6 · 24/09/2026

Dos tareas del [rediseño de la interfaz](../superpowers/specs/2026-09-24-rediseno-interfaz-design.md), independientes entre sí y de lo que hace Claude a la vez (pasos 1 a 4: barra superior, bandeja de Pedidos, pedido abierto, toldos por bloques y panel por toldo).

## Reglas (obligatorias)

- **Copia aparte:** worktree o clon, nunca la carpeta de Claude. Una rama por tarea: `codex/rediseno-pdf-observaciones` y `codex/rediseno-parametros-lista`, creadas desde `origin/main`.
- **Guarda en commit a menudo y sube la rama al terminar cada tarea** (`git push -u origin <rama>`). La vez anterior el trabajo quedó sin commit al acabarse la cuota.
- **Instancia aislada:** en otro puerto (`PORT=4320 bash .claude/skills/running-toldos-testar/start-isolated.sh` y `TOLDOS_ISOLATED_URL=http://127.0.0.1:4320`). Nunca el `.env` real ni el servidor 192.168.0.90. RPS solo de lectura.
- **Archivos que no se tocan:**
  - `App.tsx`, `AwningColumn.tsx`, `OrderView.tsx`, `OrderHeader.tsx`, `LiveResults.tsx`, `ReviewsView.tsx`, `ReviewOrderDetail.tsx`: los está cambiando Claude.
  - En `styles.css`, solo añadir reglas nuevas de tu componente, al final.
- **Pruebas en verde:** `pnpm vitest run`, `pnpm lint`, `pnpm build` y `pnpm test:e2e:rps`.
- **Capturas:** antes y después, a 1280×720 y 1600×1000, en `tmp/ui-audit/shots/rediseno-*` (tmp está fuera de Git: no las subas).
- **Estilo:**
  - CRLF o LF según el archivo;
  - commits en español explicando el porqué;
  - comentarios al estilo de los que ya hay.
- **Si algo es una decisión de producto,** anótalo en el resumen final como pregunta; no lo decidas tú.

## Tarea 1 · Recuadro de observaciones del PDF · GPT-6 Sol, esfuerzo alto

En `src/domain/planteamientoPdf.js`, el recuadro "Observaciones" de la hoja de estructura (A5 apaisado) tiene hoy un alto fijo.

1. **Alto adaptable:** el recuadro ocupa el espacio libre que quede en la página bajo el despiece, los accesorios y el anclaje. Con pocas piezas crece y con muchas se ajusta, con un mínimo razonable (tres líneas de texto).
2. **Sin cortes:** si el texto no cabe, continúa en una página siguiente con el mismo encabezado de pedido y OF y la indicación "Observaciones (continuación)". Hoy se corta.
3. **Destaca cuando tiene texto:** borde y fondo amarillo suave (usa los colores de marca que ya hay en el archivo) y "OBSERVACIONES" en negrita. Vacío, igual que ahora, discreto.
4. **La hoja de telas** (A4), si tiene su propio recuadro de observaciones, sigue el mismo criterio.
5. **No toques la cabecera del PDF** (TÉCNICO / REVISOR): la cambia Claude.
6. **Pruebas** en `planteamientoPdf.test.js`, midiendo con `pdfjs-dist` como las que ya hay:
   - el alto crece con pocas filas;
   - un texto largo pasa a otra página sin perderse;
   - con texto sale el fondo destacado y vacío no.

Entrega: rama `codex/rediseno-pdf-observaciones`, con capturas de una hoja con 5 piezas, otra con 20 y otra con observaciones largas.

## Tarea 2 · Lista de modelos en Parámetros · GPT-6 Sol, esfuerzo medio

En `src/client/views/ParametersView.tsx`, el modelo se elige con un desplegable pequeño dentro de una banda oscura (`ParameterModelSelector`).

1. **Lista fija a la izquierda** del contenido de Parámetros, con los 22 modelos agrupados por familia (Brazos invisibles, Cofre, Vertical, Clásicos, Trabajos de tela). Usa las mismas familias y el mismo orden que el selector de "Añadir toldo" (`ModelPickerDialog.tsx` y sus datos); no inventes otros.
2. **Cada fila** lleva el nombre actual, y debajo el nombre de RPS solo cuando es distinto (ya lo hace `parameterModelName`). El modelo activo va marcado.
3. **La lista queda fija al bajar** (`position: sticky`) y, si no cabe en alto, se desplaza dentro de sí misma.
4. **El contenido de cada modelo** ocupa el resto del ancho. El índice de secciones (`ParameterSectionIndex.tsx`) sigue arriba del contenido; comprueba que no se monta encima de la lista.
5. **Se quita el desplegable antiguo y su banda,** incluido el texto "22 modelos · …". La cabecera de cada modelo, con su título y "Restaurar…", se queda.
6. **A 1280:** la lista mide unos 190 px y las tablas del contenido caben sin desplazamiento horizontal. Compruébalo con capturas de Arzúa Pro, Monoblock 350 y Cortina.
7. **Pruebas:** si existe `scripts/test-parameter-consultation.mjs`, adáptalo a la lista (elegir modelo por su botón), y pásalo.

Entrega: rama `codex/rediseno-parametros-lista`, con capturas antes y después de los tres modelos a las dos resoluciones.

## Al terminar

Sube las dos ramas y deja un resumen corto por tarea: qué hiciste, qué comprobaste y qué preguntas quedan. Claude las revisa y las pasa a `main`.
