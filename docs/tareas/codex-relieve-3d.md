# Encargo para Codex · Relieve 3D, pasos 2, 3 y 5 · 24/09/2026

Aplicar el relieve al estilo de CoordinaOT a la web, siguiendo el [plan de diseño 3D](../ui/diseno-3d-plan.md). Las recetas ya existen en `src/client/relieve.css` y se ven juntas en `tmp/relieve-muestra.html`; ábrela antes de empezar:

- `.pieza-3d`: filas, con un borde izquierdo de color que se da con `--pieza-acento`.
- `.tecla-3d`: pestañas y chips. La activa va hundida y en amarillo (`aria-pressed="true"`, `aria-current="page"` o `.is-active`). Sobre la barra oscura se usa la variante `.sobre-oscuro`.
- `.boton-3d`: botones.
- `.panel-3d`: paneles.
- `.hoja-3d`: página del PDF.
- `.bloque-3d-hundido`: lo que está abierto.

**No inventes recetas ni sombras nuevas.** Si alguna pieza necesita un ajuste, cambia la receta en `relieve.css` (afecta a todas) y explícalo en el resumen.

## Reglas (obligatorias)

- **Copia aparte:** un worktree o un clon, nunca la carpeta de Claude. Trabaja en la rama `codex/relieve-3d`, creada desde `origin/main`. Haz commit y push a menudo.
- **Instancia aislada** en otro puerto: `PORT=4320 bash .claude/skills/running-toldos-testar/start-isolated.sh` y `TOLDOS_ISOLATED_URL=http://127.0.0.1:4320`. `openApp` ya deja el usuario elegido. Nunca uses el `.env` real ni el servidor 192.168.0.90. RPS, solo lectura.
- **Qué puedes tocar:**
  - solo **clases y atributos** en el TSX: añadir `className` y `aria-pressed` o `aria-current` donde falten;
  - **ni lógica, ni textos, ni estructura**;
  - en `styles.css`, quitar las sombras sueltas que dejen de usarse en lo que tocas, y nada más;
  - las reglas nuevas van en `relieve.css`.
- **Qué no puedes tocar:**
  - `AwningColumn.tsx`, `OrderView.tsx` y las tarjetas de toldo de Nuevo pedido, que son del plan 2;
  - nada del IRIS, que está en otra rama.
- **Pruebas en verde:** `pnpm vitest run`, `pnpm lint`, `pnpm build`, `pnpm test:e2e:rps`, `node scripts/test-pdf-viewer-e2e.mjs` y `node scripts/test-parameter-consultation.mjs`. El relieve es solo CSS: si una prueba se rompe, algo más ha cambiado.
- **axe:** `node tmp/ui-audit/axe-rapido.mjs`, con 0 avisos de contraste.
- **Capturas** antes y después, a 1280×720 y 1600×1000, en `tmp/ui-audit/shots/relieve-*`. Añade una con movimiento reducido (`reducedMotion: 'reduce'` en Playwright). `tmp` está fuera de Git.
- **Estilo:** respeta los finales de línea de cada archivo (los de `src/client` usan CRLF) y escribe los commits en español explicando el porqué.
- **Si algo es una decisión de diseño**, anótalo como pregunta en el resumen; no lo decidas tú.

## Paso 2 · Pedidos · GPT-6 Sol, esfuerzo medio

- Bandeja (`OrdersInbox.tsx`):
  - cada fila de pendientes e historial pasa a ser una `.pieza-3d` suelta, con 6 px de separación y sin las líneas de lista;
  - las mías llevan `--pieza-acento: var(--tgm-yellow)`;
  - los chips Míos y Todos pasan a `.tecla-3d`;
  - los botones Abrir y Ver pasan a `.boton-3d`;
  - el panel pasa a `.panel-3d`.
- Pedido abierto (`ReviewOrderDetail.tsx`, `ReviewChecklist.tsx`):
  - «← Pedidos», Vista previa, Corregir y Generar archivos pasan a `.boton-3d`;
  - las filas de «Qué revisar» pasan a `.pieza-3d`, con el acento del estado: `var(--ok)` completo, `var(--warn)` con avisos, `var(--danger)` si falta algo.
- Visor PDF (`PdfPreviewViewer.tsx`):
  - la página del PDF pasa a `.hoja-3d`;
  - «Página entera» y «Ajustar al ancho» pasan a `.tecla-3d`, sin `.sobre-oscuro`, porque el visor ya es oscuro.

## Paso 3 · Barra superior y botones de toda la web · GPT-6 Sol, esfuerzo medio

- Barra superior (`App.tsx`):
  - las pestañas pasan a `.tecla-3d.sobre-oscuro`, y la activa lleva `aria-current="page"`;
  - «Soy: …» pasa a `.tecla-3d.sobre-oscuro`;
  - la barra en sí queda plana.
- Botones en toda la web:
  - `.primary-button` y `.ghost-button` llevan `.boton-3d`;
  - hazlo con un selector en `relieve.css` (`.primary-button, .ghost-button { … }`) en vez de tocar cada TSX, si el resultado es el mismo. Compruébalo en todas las pantallas.
- Los diálogos de confirmación y «¿Quién eres?» usan las mismas teclas y botones.

## Paso 5 · Parámetros y Configuración · GPT-6 Sol, esfuerzo medio

- Lista de modelos: cada modelo pasa a `.tecla-3d`. El activo va hundido, con `aria-current="true"`.
- El índice de secciones (01, 02…) pasa a `.tecla-3d` pequeñas.
- La barra de guardar y los paneles pasan a `.panel-3d`.
- Configuración:
  - el panel pasa a `.panel-3d`;
  - el interruptor de generación se queda como está.

## Al terminar

Sube la rama y deja un resumen corto con:
- qué hiciste en cada paso;
- qué ajustaste en `relieve.css` y por qué;
- las capturas;
- el resultado de axe y de las pruebas;
- las preguntas que queden.

Claude lo revisa y lo pasa a `main`.
