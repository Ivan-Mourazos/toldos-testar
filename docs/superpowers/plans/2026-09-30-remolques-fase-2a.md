# Remolques · fase 2a: pantallas — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Plantear un pedido de remolques completo en Planteamientos TGM (Nuevo pedido → Remolques): traer el pedido de RPS, rellenar cada lona o baquetón y ver al momento sus resultados y su dibujo, con el estilo de CoordinaOT, sin guardar todavía.

**Architecture:** La lógica de la pantalla de remolques (estado, líneas, lo que falta, borradores, lectura de RPS y materiales) se copia a `src/remolques/` como en la fase 1, sin tocarla. El servidor de toldos gana tres rutas de solo lectura (`/api/remolques/…`). La pantalla se rehace en `src/client/remolques/` con las piezas de CoordinaOT; el dibujo actual (`Escena3D`, SVG) se copia tal cual.

**Tech Stack:** toldos-testar (Vite + React 19 + TS, Express 5 ESM, vitest, Playwright; Node 24 ejecuta el TS de `src/remolques/` sin compilar). Origen de solo lectura: `C:\Users\ivan.sanchez\Documents\Proyectos DEV\Remolques-TGM` (commit a7ffef0).

Spec: `docs/superpowers/specs/2026-09-30-remolques-fase-2a-pantallas-design.md`.

## Global Constraints

- Lo que hace hoy la pantalla de remolques es el mínimo: mismos campos, avisos de lo que falta, resultados, reparto y edición de ollaos, importación de RPS y borradores. No se cambia la lógica copiada: solo imports (relativos con `.ts`) y el punto de conexión a RPS.
- Remolques-TGM es de solo lectura: ni cambios ni commits allí. RPS es de solo lectura.
- Estilo: se copia CoordinaOT (regla permanente de Iván). Estilos nuevos en `src/client/coordina/remolques.css`, sin capa (la capa `legacy` es solo para lo antiguo), usando las piezas de `src/client/coordina/piezas.css` y los tokens de `tokens.css`; leer antes `src/client/coordina/README.md`.
- «Remolques» visible para todos con la etiqueta «en pruebas». Sin «Guardar para revisión» ni «Vista previa» en remolques en esta fase. «Realizado por» no se muestra: lo pone «Soy».
- Toldos no cambia de comportamiento (salvo el aviso de detección de la Task 6).
- No tocar nada del servidor 192.168.0.90 ni usar el `.env` real para pruebas; instancia aislada 4310 (`bash .claude/skills/running-toldos-testar/start-isolated.sh`; parar antes lo que escuche en 4310/4320 con PowerShell `Get-NetTCPConnection -LocalPort <p> -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }`). Un hook puede bloquear HTTP desde Bash: usar scripts de Playwright/node en `tmp/`.
- Solo escritorio (1280×720 a 1920). Contraste 0 en claro y oscuro (`node tmp/ui-audit/colores.mjs <etiqueta>`).
- Añadir al commit por ruta explícita; nada de `git add -A`, `stash`, `reset` ni `checkout` de ficheros ajenos. Conservar finales de línea. Comentarios en castellano con el porqué. Commits en castellano terminados en `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. Sin push.
- Verificación al cerrar cada tarea: `pnpm vitest run && pnpm lint && pnpm exec tsc --noEmit -p . && pnpm build`; en las tareas de pantalla, además las e2e `node scripts/test-rps-e2e.mjs && node scripts/test-awning-panel-e2e.mjs` (toldos no se rompe) y capturas en claro y oscuro revisadas.

---

### Task 1: La lógica de la pantalla de remolques

Modelo: **Sonnet, esfuerzo medio**.

**Files:** Create bajo `src/remolques/`: `rps/{interpretar-linea,aplicar-linea,material-rps,numero-pedido,types,pedido-rps,pool}.ts`, `pedidos/{numero-pedido,validar-planteamiento,agrupar-pedido}.ts`, `workspace/{estado,lineas,completar-pedido,selectores,borradores-locales}.ts`, `store/types.ts` (solo tipos), `materiales.ts` (de `store/rps-materiales.ts`: `rowsToMateriales`, `esLonaPvcProduccion`, sin `getMateriales` si depende del pool propio — ver Step 3), y los tests de cada uno que existan en el origen (`__tests__/`). Modify: `src/rpsCatalog.js` (exportar el pool).

- [ ] **Step 1:** Copiar tal cual los ficheros de `Remolques-TGM/src/lib/{rps,pedidos,workspace}` listados y `lib/store/types.ts`, con sus tests; `lib/store/rps-materiales.ts` → `src/remolques/materiales.ts`. Listar los imports `@/…` que queden fuera de `calc/`, `geometry/`, `entradas-vacias` y de lo copiado ahora; si aparece algo más (p. ej. `lib/pdf`, `lib/store/index`, componentes), PARAR (NEEDS_CONTEXT).
- [ ] **Step 2:** Reescribir imports a relativos con `.ts` (reutilizar el script de la fase 1 si sigue en `tmp/`, o uno igual).
- [ ] **Step 3:** Conexión a RPS: en `src/rpsCatalog.js` exportar `export function getRpsPoolForRemolques()` que devuelve el mismo `getPool()` que ya usa (misma configuración, misma conexión de solo lectura) o `null` si no hay credenciales, con un comentario del porqué. Sustituir `src/remolques/rps/pool.ts` por un adaptador de pocas líneas que exporte `getRpsPool()` con la misma firma que el original (`Promise<ConnectionPool> | null`) llamando a esa función. Si `rps-materiales.ts` tenía `getMateriales` con el pool, mantenerlo usando el adaptador.
- [ ] **Step 4:** Comprobar con el script de comparación de la fase 1 (ficheros idénticos al origen salvo imports, y salvo `rps/pool.ts`, que se documenta). `pnpm vitest run src/remolques` (mismo número de pruebas que en el origen para estos módulos). `node -e "import('./src/remolques/rps/pedido-rps.ts').then(m=>console.log(typeof m.pedidoRpsPorNumero))"` → `function`.
- [ ] **Step 5:** Verificación general y commit `feat(remolques): la lógica de su pantalla entra en la web de planteamientos`.

---

### Task 2: Rutas de remolques en el servidor

Modelo: **Sonnet, esfuerzo medio**.

**Files:** Modify `src/server.js`, `src/config.js`. Create `src/remolquesParametersStore.js` (+ test).

- [ ] **Step 1:** `GET /api/remolques/materiales` → `{ materiales, origen: 'rps' | 'semilla' }`: los de RPS con la función copiada; si no hay conexión o falla, la semilla (`src/remolques/calc/materiales-seed.ts`). Mismo resultado que `Remolques-TGM/src/app/api/materiales/route.ts`.
- [ ] **Step 2:** `GET /api/remolques/rps-pedido?numero=…` → lo mismo que `Remolques-TGM/src/app/api/rps/pedido/route.ts` (leer y copiar su comportamiento: 400 si el número no es válido, 404 si no existe, 503 si RPS no está configurado, cuerpo idéntico).
- [ ] **Step 3:** `GET /api/remolques/parametros` → parámetros de cálculo desde `remolques-parameters.json` en la carpeta de `config.ruleParametersFile` (añadir `config.remolquesParametersFile` con `REMOLQUES_PARAMETERS_FILE` o esa ruta por defecto); si no existe, `DEFAULT_PARAMS` de `src/remolques/calc/params.ts`, normalizados con `normalizarParams` de `validar-params.ts`. Solo lectura en esta fase. Test del store (fichero ausente → defecto; fichero válido → sus valores; fichero roto → defecto y aviso en log).
- [ ] **Step 4:** Probar las tres rutas en la aislada con un script en `tmp/` (sin mostrar cuerpos enteros) y anotar códigos y tamaños; RPS puede responder o no: documentar lo que pase.
- [ ] **Step 5:** Verificación general y commit `feat(remolques): rutas de materiales, pedido de RPS y parámetros`.

---

### Task 3: Selector Toldos | Remolques y el pedido de remolques

Modelo: **Sonnet, esfuerzo medio**.

**Files:** Create `src/client/remolques/{RemolquesView,CabeceraPedido,PestanasElementos,useRemolques}.tsx|ts`, `src/client/coordina/remolques.css` (importado como las demás capas de `coordina/` desde `src/client/estilos.css`). Modify `src/client/views/OrderView.tsx` o `App.tsx` (el selector, lo mínimo).

- [ ] **Step 1:** Leer `Remolques-TGM/src/components/workspace/{Workspace,PedidoActivo,ImportadorRps,useWorkspace,useConsultaRps,useCatalogos}.tsx|ts` y `src/lib/workspace/estado.ts`. `useRemolques` = el equivalente de `useWorkspace` sin guardar, revisión ni PDF: el reductor copiado, catálogos de `/api/remolques/materiales` y `/api/remolques/parametros`, consulta de `/api/remolques/rps-pedido`, borradores locales copiados.
- [ ] **Step 2:** Selector **Toldos | Remolques** arriba de Nuevo pedido (pestañas de CoordinaOT: `tira-3d` + `pestana-activa`), Remolques con etiqueta «en pruebas»; se recuerda en el navegador (`localStorage 'planteamientos-producto'`).
- [ ] **Step 3:** Cabecera del pedido de remolques con el aspecto de la de toldos: Pedido, Cliente, Fecha, «Obtener datos del pedido» y lo que enseñaba `ImportadorRps` (líneas encontradas y aplicar), sin «Realizado por».
- [ ] **Step 4:** Pestañas de elementos «A · Remolque 250×143 ✓ / falta …», «+ Remolque», «+ Baquetón», borrar con confirmación (diálogo de la web). El elemento activo, de momento, enseña un marcador «Formulario en la Task 4».
- [ ] **Step 5:** Capturas claro/oscuro 1600×1000 y 1280×720, contraste 0, verificación general, commit `feat(remolques): Nuevo pedido con Toldos y Remolques`.

---

### Task 4: Formularios y resultados

Modelo: **Sonnet, esfuerzo medio**.

**Files:** Create `src/client/remolques/{FormularioLona,FormularioBaqueton,Campos,Resultados}.tsx`; Modify `remolques.css`, `RemolquesView.tsx`.

- [ ] **Step 1:** Rehacer `FormularioLona`, `FormularioBaqueton` y los campos de `Remolques-TGM/src/components/workspace/campos.tsx` con los mismos campos, opciones, textos, orden y avisos (errores visibles solo tras tocar el campo, como hoy), usando los controles de la web (mismos campos que las tarjetas de toldo: selects, segmentados, números) y las piezas de CoordinaOT.
- [ ] **Step 2:** Rehacer `Resultados` (lona y baquetón) con las mismas tarjetas de datos, la tabla de ollaos (reparto o editable «según se indica», con sus errores) y las notas.
- [ ] **Step 3:** Editor del elemento activo: formulario a la izquierda y resultados a la derecha (el dibujo entra en la Task 5; dejar su hueco), con «Listo» / «Falta: …» debajo del formulario como hoy.
- [ ] **Step 4:** Capturas y contraste; verificación general; commit `feat(remolques): formularios de lona y baquetón con sus resultados`.

---

### Task 5: El dibujo actual

Modelo: **Sonnet, esfuerzo medio**.

**Files:** Create `src/client/remolques/Escena3D.tsx` (copia) y `src/client/remolques/escena3d.css` si hace falta; Modify `RemolquesView.tsx`.

- [ ] **Step 1:** Copiar `Remolques-TGM/src/components/workspace/Escena3D.tsx` sin cambiar su lógica ni su geometría (imports a `src/remolques/geometry/*.ts`), pasando sus clases Tailwind a CSS equivalente (en claro y oscuro con los tokens de CoordinaOT; el lienzo del dibujo conserva sus colores de lona). Incluye el campo de observaciones que lleva dentro, conectado igual que en `Workspace.tsx`.
- [ ] **Step 2:** Colocarlo en el editor sobre los resultados, con las mismas props que en `Workspace.tsx` (lona y baquetón). Sin `onSnapshotReady` (no hay PDF todavía).
- [ ] **Step 3:** Capturas de una lona TIPO 03, una TIPO 05 con ventana y un baquetón, comparadas con las de la web vieja (`tmp/ui-audit/shots/rem-actual-*.png`): el dibujo tiene que salir igual. Contraste 0; verificación general; commit `feat(remolques): el dibujo de siempre en la pantalla nueva`.

---

### Task 6: Detección en Toldos y prueba de punta a punta

Modelo: **Sonnet, esfuerzo medio**.

**Files:** Modify la parte de toldos que atiende «Obtener datos del pedido» (buscar en `src/client` la llamada a `/api/orders/:code/autofill`) y, si hace falta, `src/server.js`; Create `scripts/test-remolques-2a-e2e.mjs`.

- [ ] **Step 1:** Si en Toldos el pedido traído de RPS tiene líneas de lona de remolque (mismo criterio que `interpretarLineaRps`: artículo `LONAREMOLQUE`/`LONAREMGANA` o texto «LONA REMOLQUE» / «CANVAS FOR TRAILER»), avisar «Este pedido es de remolques» con el botón «Abrir en Remolques», que cambia el selector y carga el número. Resolverlo sin cambiar el comportamiento de toldos para pedidos de toldos.
- [ ] **Step 2:** `scripts/test-remolques-2a-e2e.mjs` contra la aislada: elegir Remolques; crear una lona con las entradas del caso de paridad `lona-…` TIPO 05 con ventana y ollaos «según se indica» y un baquetón `baqueton-…` de `src/remolques/__fixtures__/produccion-2026-09.json` (elegir dos concretos y citarlos); comprobar en pantalla lona hecha, contorno de corte, paños y reparto/posiciones de ollaos iguales a su `result`; recargar y comprobar que el borrador sigue; borrar un elemento con su confirmación. Si RPS responde en la aislada, traer un pedido real de remolques de solo lectura y comprobar que crea sus elementos; si no responde, anotarlo y seguir.
- [ ] **Step 3:** Barrido `node tmp/ui-audit/colores.mjs 2a` (claro y oscuro, 0), capturas finales de Nuevo pedido → Remolques; verificación general con todas las e2e (`test-rps-e2e`, `test-awning-panel-e2e`, `test-awning-blocks-e2e`, `test-coordina-approval-e2e`, `test-remolques-2a-e2e`); commit `feat(remolques): aviso de pedido de remolques y prueba de punta a punta`.
