# Estilo CoordinaOT en Planteamientos TGM — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que toda la web de planteamientos se vea igual que CoordinaOT (colores, cabecera, pestañas, paneles, filas, botones, campos, chips, avisos, letra y espaciado), en claro y en oscuro, sin cambiar su comportamiento.

**Architecture:** Capa nueva `src/client/coordina/` con los tokens de CoordinaOT (`tokens.css`) y sus piezas pasadas de Tailwind a CSS normal (`piezas.css`). Cada zona de la web pasa a usar esas piezas y variables, zona a zona, comparando capturas con CoordinaOT. Al final se retira el estilo anterior (`relieve.css`, `dark.css`, `dark.generated.css`) en lo que ya no se use.

**Tech Stack:** toldos-testar (Vite + React 19 + TS, CSS plano en `src/client/*.css`, Express 5, vitest, Playwright). Referencia: CoordinaOT (Next.js 16 + Tailwind 4).

Spec: `docs/superpowers/specs/2026-09-29-estilo-coordina-design.md`.

## Global Constraints

- **CoordinaOT manda**: se copian sus valores (colores, radios, sombras, espaciados, tamaños de letra) de `C:\Users\ivan.sanchez\Documents\Proyectos DEV\coordina-ot\src\app\globals.css` y de las clases Tailwind de sus componentes; no se inventan estilos propios. Si algo no existe en CoordinaOT, se usa la pieza de CoordinaOT más parecida.
- CoordinaOT es de **solo lectura**: no se modifica ni se hace commit en él.
- El tema oscuro de la web va en `:root[data-theme="dark"]` (no en la clase `.dark`); el modo recordado (`localStorage toldos-tema`) y su botón siguen funcionando igual.
- No cambia el comportamiento: textos, campos, botones, flujos, nombres accesibles (`aria-label`, roles) y los selectores que usan las pruebas e2e (`.orders-row-toggle`, `.awning-column`, etc.) se mantienen.
- Letra Geist servida desde el propio proyecto (paquete npm), sin depender de internet al arrancar ni al compilar.
- Contraste: la auditoría `tmp/ui-audit/contraste.mjs` (barrido `tmp/ui-audit/colores.mjs`) debe dar 0 textos o iconos por debajo del mínimo en claro y en oscuro.
- Solo escritorio (1280×720 a 1920). Capturas de comparación a 1600×1000; comprobar también 1280×720.
- Para ver CoordinaOT en local: `DATASOURCE=mock COORDINA_DB_PATH="<toldos>/tmp/coordina-mock/coordina.db" FICHAJE_OLANET=sombra OLANET_DB_HOST= RPS_DB_HOST= pnpm exec next dev -p 3200` en la carpeta de CoordinaOT; entrar por `http://localhost:3200` (no 127.0.0.1) y pulsar «Iván Sánchez»; tema con `localStorage coordina-theme`. Script de capturas de ejemplo: `tmp/ui-audit/coordina-capturas.mjs`.
- Nunca usar el `.env` real ni tocar el servidor 192.168.0.90. La web se prueba en la instancia aislada (4310, `bash .claude/skills/running-toldos-testar/start-isolated.sh`).
- Añadir al commit solo los ficheros propios por ruta explícita; nada de `git add -A`, `stash`, `reset` ni `checkout` de ficheros ajenos. Conservar finales de línea. Comentarios en castellano con el porqué. Commits en castellano terminados en `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Verificación común (al final de cada tarea)

1. `pnpm vitest run && pnpm lint && pnpm exec tsc --noEmit -p . && pnpm build`.
2. Reiniciar la aislada (parar lo que escuche en 4310/4320 con PowerShell `Get-NetTCPConnection -LocalPort <p> -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`; `bash .claude/skills/running-toldos-testar/start-isolated.sh` en segundo plano; esperar a `/api/health`).
3. `node scripts/test-rps-e2e.mjs && node scripts/test-awning-panel-e2e.mjs && node scripts/test-awning-blocks-e2e.mjs && node scripts/test-coordina-approval-e2e.mjs`.
4. `node tmp/ui-audit/colores.mjs <etiqueta>` (claro y oscuro): 0 casos de contraste bajo. Mirar las capturas de la zona de la tarea.
5. Capturas lado a lado CoordinaOT / web de la zona (1600×1000, claro y oscuro) en `tmp/ui-audit/shots/estilo-<zona>-*.png`; describir en el informe qué coincide y qué no, y corregir lo que no.

---

### Task 1: Base y cabecera

Modelo recomendado: **Opus, esfuerzo medio** (fija la base de todo lo demás).

**Files:**
- Create: `src/client/coordina/tokens.css`, `src/client/coordina/piezas.css`, `src/client/coordina/README.md`.
- Modify: `src/client/main.tsx` o `App.tsx` (importar la capa **después** de los estilos actuales), `src/client/App.tsx` (marcado de la cabecera), `src/client/components/TabButton.tsx`, `src/client/remolques-nav.css` (si hace falta), `package.json` + `pnpm-lock.yaml` (letra Geist), `index.html` (`theme-color`).

**Interfaces:**
- Produces: variables CSS de CoordinaOT (`--bg`, `--bg-glow`, `--surface`, `--surface-2`, `--zone`, `--border`, `--border-strong`, `--text`, `--text-muted`, `--glass-*`, `--color-brand-50…900`, y el resto de `:root` de CoordinaOT) disponibles en toda la web, con su versión oscura bajo `:root[data-theme="dark"]`; clases de piezas con los nombres de CoordinaOT (`glass-header`, `glass-panel`, `glass-panel-strong`, `panel-solido`, `glass-chip`, `glass-chip-activo`, `pestana-activa`, `boton-3d`, `chip-3d`, `bloque-3d`, `bloque-3d-hundido`, `tira-3d`, `hoja-3d`, `glass-pop`, `desplegable`, `telon-ficha`, `ventana-3d`, `scroll-thin`, `pildora-aviso`…) que las tareas siguientes usan.

- [ ] **Step 1: Estudiar la referencia.** Leer entero `coordina-ot/src/app/globals.css` y el componente de la cabecera de CoordinaOT (buscar dónde se usa `glass-header` y `pestana-activa`; el chip de usuario «IV OT»; `ThemeToggle.tsx`). Arrancar CoordinaOT en local (ver Global Constraints) y capturar su cabecera y pantalla principal en claro y oscuro.
- [ ] **Step 2: `tokens.css`.** Copiar los tokens de `:root` y de `.dark` de CoordinaOT (el oscuro bajo `:root[data-theme="dark"]`), y `--color-brand-*` de su `@theme`. Después, en el mismo fichero, hacer que las variables propias de la web que usan los estilos actuales apunten a las de CoordinaOT cuando signifiquen lo mismo (p. ej. `--bg`, `--surface`, `--border`, `--text`, `--text-muted`; `--tgm-yellow` al dorado de marca que CoordinaOT usa en lo activo). Documentar en un comentario la tabla de equivalencias.
- [ ] **Step 3: `piezas.css`.** Pasar a CSS normal las piezas de `globals.css` de CoordinaOT listadas en Interfaces, con sus variantes de hover, activo y oscuro. Donde CoordinaOT usa utilidades Tailwind en el JSX (p. ej. `rounded-lg px-2.5 py-1 text-xs font-semibold`), traducirlas a valores CSS exactos (Tailwind 4: `rounded-lg` = 0.5rem, `px-2.5` = 0.625rem, `text-xs` = 0.75rem/1rem, etc.).
- [ ] **Step 4: Letra.** Añadir Geist como paquete npm (probar `@fontsource-variable/geist`; si no existe, `geist` y sus ficheros woff2 servidos desde `public/`), cargarla en la web y ponerla como `font-family` base. Quitar la importación de Plus Jakarta Sans si ya no se usa.
- [ ] **Step 5: Cabecera.** Rehacer la cabecera de `App.tsx` con las piezas de CoordinaOT: fondo como `glass-header` (sin la barra verde), logo a la izquierda (caballo TGM + «Planteamientos» con la misma letra, tamaño y peso que el «Coordina» de CoordinaOT), pestañas como sus botones de navegación (la activa con `pestana-activa`, contador «Pedidos · N» como el badge de «Revisiones»), enlace «Remolques» con el mismo aspecto, y a la derecha el botón de modo y «Soy» como el chip de usuario de CoordinaOT. Mantener textos, `aria-label` y roles.
- [ ] **Step 6: Fondo y marco.** Fondo de la página, ancho y márgenes laterales del contenido como CoordinaOT.
- [ ] **Step 7: README** de `src/client/coordina/`: de dónde sale cada cosa (ruta y fecha de la referencia), la tabla de equivalencias y la regla de copiar CoordinaOT.
- [ ] **Step 8: Verificación común** (arriba) y capturas lado a lado de la cabecera y la pantalla de inicio.
- [ ] **Step 9: Commit** `feat(estilo): base y cabecera como CoordinaOT` con el porqué.

---

### Task 2: Nuevo pedido

Modelo recomendado: **Sonnet, esfuerzo medio**.

**Files:** CSS de las zonas de Nuevo pedido en `src/client/styles.css` y `src/client/relieve.css` (sustituir colores escritos a mano por variables y aplicar las piezas), y los `.tsx` de esas zonas solo para cambiar clases (`OrderView.tsx`, `AwningColumn.tsx`, `AwningPanel.tsx`, `ModelPickerDialog.tsx`, campos compartidos, vista previa del PDF). No cambiar lógica.

- [ ] **Step 1:** Capturar CoordinaOT: su ficha de pedido abierta (panel lateral / `telon-ficha`), campos, botones primarios y secundarios, chips, desplegables y avisos, en claro y oscuro; y la web: Nuevo pedido vacío, con Arzúa + Cortina (con candado), panel «Despiece y dibujo» (tres pestañas) y vista previa (script de referencia `tmp/ui-audit/colores.mjs`).
- [ ] **Step 2:** Cabecera del pedido y tarjetas de toldo como paneles de CoordinaOT; campos, selectores y segmentados como los suyos; botones principal/secundario/icono como los suyos; chips de estado (FALTA, VÁLIDO, errores) como sus `pildora-*`/`glass-chip`; avisos (excepción técnica, «Falta…») como sus avisos.
- [ ] **Step 3:** Panel «Despiece y dibujo» como su panel lateral; la vista previa del PDF con su telón y ventana (`telon-ficha`, `ventana-3d`); el selector de modelo como su diálogo.
- [ ] **Step 4:** Verificación común y capturas lado a lado; commit `feat(estilo): Nuevo pedido como CoordinaOT`.

---

### Task 3: Pedidos y pedido abierto

Modelo recomendado: **Sonnet, esfuerzo medio**.

**Files:** CSS de la bandeja y del pedido abierto (`OrdersInbox.tsx`, `ReviewOrderDetail.tsx`, `ReviewsView.tsx` solo clases; sus estilos en `styles.css`/`relieve.css`).

- [ ] **Step 1:** Capturar la pantalla «Revisiones» de CoordinaOT (grupos, filas plegadas y desplegadas, filtros «Solo míos / Todo el equipo», buscador, contadores) y la «Historial»; y la bandeja y el pedido abierto de la web.
- [ ] **Step 2:** Grupos, filas, chips de toldo (con sus marcas de CoordinaOT ✓ ↩ •), detalle desplegado, filtros, buscador, año del historial y cabecera del pedido abierto con sus botones, con las piezas y medidas de CoordinaOT.
- [ ] **Step 3:** Verificación común y capturas lado a lado; commit `feat(estilo): Pedidos como CoordinaOT`.

---

### Task 4: Parámetros

Modelo recomendado: **Sonnet, esfuerzo medio**.

**Files:** CSS y clases de `ParametersView` y sus componentes (lista de modelos, índice «Ir a», bandas de parámetros, tablas, biblioteca «Dibujos del taller», barra de guardar).

- [ ] **Step 1:** Referencia: las listas laterales, tablas y paneles de CoordinaOT (Métricas, Historial, Equipo) en claro y oscuro.
- [ ] **Step 2:** Lista de modelos (plana, el activo como su elemento activo), bandas y tablas como sus paneles y tablas, campos numéricos como los suyos, barra «Guardar para todos» como su barra de acción.
- [ ] **Step 3:** Verificación común y capturas lado a lado; commit `feat(estilo): Parámetros como CoordinaOT`.

---

### Task 5: Configuración, diálogos y avisos

Modelo recomendado: **Sonnet, esfuerzo medio**.

**Files:** `SettingsView.tsx` (clases), `NotificationCenter` (avisos emergentes y diálogo de confirmación), diálogo «¿Quién eres?», y sus estilos.

- [ ] **Step 1:** Referencia: la pantalla de elección de persona de CoordinaOT («¿Quién eres?» con avatares de iniciales), sus diálogos de confirmación (`useConfirmacion`), sus avisos y el panel de ajustes/herramientas.
- [ ] **Step 2:** Configuración de carpetas, diálogos, avisos y «¿Quién eres?» con sus piezas (el de la web puede usar los mismos avatares de iniciales con color por persona si CoordinaOT los define; si no, mantener el aspecto de sus botones).
- [ ] **Step 3:** Verificación común y capturas lado a lado; commit `feat(estilo): Configuración, diálogos y avisos como CoordinaOT`.

---

### Task 6: Limpieza del estilo anterior

Modelo recomendado: **Sonnet, esfuerzo medio**.

- [ ] **Step 1:** Buscar reglas de `relieve.css`, `dark.css` y `dark.generated.css` que ya no afecten a nada (clases sin uso o anuladas por la capa de CoordinaOT) y quitarlas; si un fichero queda vacío, borrarlo junto con su import y, en el caso de `dark.generated.css`, también `scripts/generate-dark-theme.mjs` y sus menciones.
- [ ] **Step 2:** Buscar colores escritos a mano que queden en `styles.css` y sustituirlos por variables de la capa.
- [ ] **Step 3:** Verificación común completa (todas las pantallas del barrido `colores.mjs` en claro y oscuro, 0 contraste bajo) y capturas finales lado a lado de cabecera, Nuevo pedido, Pedidos, Parámetros y Configuración.
- [ ] **Step 4:** Commit `refactor(estilo): se retira el estilo anterior` con el porqué.
