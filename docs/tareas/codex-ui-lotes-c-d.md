# Encargo para Codex · Interfaz, lotes D y C · 23/09/2026

Dos tareas de la [revisión de interfaz](../ui/revision-2026-09.md). Mientras tanto Claude trabaja en Revisión y en las tarjetas (`ReviewsView.tsx`, `ReviewOrderDetail.tsx`, `AwningColumn.tsx`): **no toques esos archivos.**

## Reglas (obligatorias)

- **Copia aparte.** Trabaja en un worktree o en otro clon, **no en la carpeta de Claude.** Por ejemplo: `git worktree add ../toldos-testar-codex -b codex/ui-lote-d origin/main`.
  - La instancia aislada usa el puerto 4310. Si Claude la está usando, arranca la tuya en otro puerto: `PORT=4320 bash .claude/skills/running-toldos-testar/start-isolated.sh` y `TOLDOS_ISOLATED_URL=http://127.0.0.1:4320` para los scripts de Playwright.
  - Nunca con el `.env` real, nunca en el servidor 192.168.0.90, y RPS solo de lectura.
- **Una rama por tarea:** `codex/ui-lote-d` y `codex/ui-lote-c`. Sin merge ni despliegue: Claude revisa y pasa a `main`.
- **Pruebas:** `pnpm vitest run`, `pnpm lint`, `pnpm build` y `pnpm test:e2e:rps` en verde.
- **Capturas:** antes y después, a 1280×720 y 1600×1000, en `tmp/ui-audit/shots/ui-lote-{c,d}-…`. Hay que mirar cada captura.
- **Estilo del código:**
  - CRLF o LF según el archivo;
  - commits en español explicando el porqué;
  - comentarios al estilo de los que ya hay.
- **En `styles.css`,** añade o cambia solo las reglas de tus componentes: no reordenes el archivo.
- **Si algo es una decisión de producto,** anótalo como pregunta en el resumen final.

## Tarea 1 · Lote D · Un solo visor de PDF · GPT-6 Sol, esfuerzo alto

Hoy hay dos visores:
- **Pedido** (`PdfPreviewPages.tsx`, en `App.tsx`): páginas una debajo de otra, sin zoom ni contador.
- **Revisión** (`PdfPreviewCarousel.tsx`, en `ReviewPlanteamientoPreview.tsx`): flechas y "Página 1 de 3", sin zoom.

Objetivo: **un solo componente** para los dos sitios, que haga todo esto:

1. **Páginas:** una cada vez, con flechas, "Página N de M" y miniaturas o lista de páginas para saltar. Las páginas A5 (estructura) y A4 (telas) se ven cada una a su escala.
2. **Zoom:** "Ajustar al ancho" (por defecto), 100 % y 150 %, más + y −. Con zoom, el desplazamiento es dentro del visor.
3. **Teclado:** ← y → cambian de página, + y − hacen zoom, Esc cierra el diálogo de Pedido y devuelve el foco al botón "Vista previa".
4. **Rendimiento:** renderiza la página visible y la siguiente, no todas. Si el PDF cambia, cancela el render anterior. Ya existe con `AbortController` en el carrusel: mantenlo.
5. **Pantalla completa** en Revisión, como ahora.

Criterios de cierre:
- Los dos sitios usan el mismo componente y se borra el que sobra.
- Hay un test de componente o e2e que cambia de página, hace zoom y cierra con Esc.
- Las capturas muestran un pedido de 3 páginas a 1280 y a 1600 con zoom de ajustar al ancho y de 150 %.

## Tarea 2 · Lote C y retoques · GPT-6 Sol, esfuerzo medio

1. **C1.** En la tabla del despiece (`DespieceView.tsx`) la cabecera "LONGITUD DE CORTE" se corta a 1280. Cámbiala por "CORTE (CM)" y da ancho mínimo a las columnas numéricas. Revisa las demás tablas del mismo componente.
2. **C2 · editor de despiece** (`StructureEditor.tsx`). Hoy cada pieza ocupa unos 65 px y la tabla de solo lectura sigue debajo mientras se edita. Cambios:
   - una línea por pieza: nombre, código de RPS debajo en pequeño, unidades, corte, reserva y acciones;
   - "Buscar / sustituir en RPS" y "Eliminar" como botones de icono, con `aria-label` y texto al pasar el ratón;
   - mientras el editor está abierto, oculta la tabla de solo lectura de debajo.

   Criterio: 11 piezas caben en una pantalla de 720 px de alto sin contar la cabecera de la página.
3. **R6.** En la lista de Revisión dice "1pedidos en 2026": pon el plural bien y el espacio. **Es el único cambio que se permite en `ReviewsView.tsx`.**
4. **A3.** En el selector de modelo (`ModelPickerDialog.tsx`), quita el subtítulo "Estructura y tela" de todas las tarjetas. Deja "Antes …" donde exista.
5. **A4.** El aviso de guardado muestra la ruta completa (`C:\Users\…\review\AR2603332.pdf`). Que diga "Guardado en Pedidos para revisión: AR2603332.pdf".
6. **A5.** Borra `HistoryView.tsx` (y sus estilos y tipos si nadie más los usa). Es el historial antiguo por navegador. El historial compartido es la pestaña Generados de Revisión (decisión de Iván, 23/09).
7. **F3.** En el selector de modelo de Parámetros, muestra el nombre de RPS solo cuando es distinto del nombre del modelo (no "Galicia · RPS Galicia").

Criterio: capturas antes y después de cada punto, y el barrido de la fase 1 (`tmp/ui-audit/barrido.mjs`) sin texto cortado en el despiece.

## Al terminar

Sube cada rama (`git push -u origin <rama>`) y deja un resumen corto por tarea: qué hiciste, qué comprobaste y qué preguntas quedan.
