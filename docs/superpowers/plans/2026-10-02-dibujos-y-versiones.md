# Dibujos de los modelos y versiones por modelo — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada dibujo del taller de Parámetros diga cómo se usa («Solo a mano» o «Automático cuando…» con condiciones de valores reales del modelo), que se pueda elegir en la tarjeta del toldo («Dibujo de confección», con «Automático (sale: …)») y salga en el PDF; que cada modelo enseñe «Lo que sale hoy» con miniaturas hechas por el mismo código que el PDF; y que los parámetros de toldos tengan versión e historial por modelo, motivo opcional y un resumen automático de lo que cambió, leyendo tal cual el fichero y el historial que ya hay en el .90.

**Architecture:** Cinco capas. (1) Dominio de los dibujos: `src/domain/drawingParameters.js` gana `usage`, el dibujo elegido a mano (`workshopDrawingId` en el toldo) y la precedencia nueva; un módulo nuevo `src/domain/drawingCatalog.js` da las condiciones de cada modelo con sus valores reales, las variantes del dibujo de la web con su toldo de ejemplo y qué dibujo del taller sustituye a cada una. (2) Dominio de las versiones: `src/domain/parameterScopes.js` (qué es de cada modelo, «ámbito»), `parameterChanges.js` (resumen en castellano) y `parameterHistory.js` (historial por modelo, también el de antes). (3) Servidor: `src/ruleParametersStore.js` guarda por modelo con su versión, lee el formato de antes y escribe el nuevo de una vez; `src/server.js` gana `PUT /api/rule-parameters/models/:scope`, `GET /api/rule-parameters/history?scope=` y `GET /api/rule-parameters/drawing-preview` (miniatura en PDF hecha con la misma función que la hoja de tela, `planteamientoPdf.js`). (4) Web, estado: `src/client/parametrosToldos.ts` saca el estado de los parámetros de toldos fuera de React (`useSyncExternalStore`) para que la ficha de cada modelo tenga su barra de guardar y el historial de arriba enseñe el del modelo elegido **sin tocar `App.tsx`**. (5) Web, pantallas: Parámetros › Dibujos (`DrawingParametersPanel`, `LoQueSaleHoy`, `MiniaturaDibujo`) y la tarjeta (`AwningColumn`, `SelectField`, `AwningPanel`, `FabricImageEditor`).

**Tech Stack:** JS de dominio (ESM, Node ≥ 22.18), TypeScript del cliente (React 19, `useSyncExternalStore`), Express 5 (`src/server.js`, JS), pdfkit (servidor) y pdf.js (`pdfjs-dist`, cliente) para las miniaturas, vitest (entorno node; componentes con `renderToStaticMarkup`), Playwright para la e2e en una instancia aislada.

**Spec:** `docs/superpowers/specs/2026-10-02-dibujos-y-versiones-por-modelo-design.md`. Patrones que se copian: las fichas de cliente de remolques (commits 5a4fadc, 4397139, 49de163): `src/remolquesClientesStore.js` (formato 2 que la web de antes sigue leyendo, `writeFileAtomic`, cola, «un fichero roto no se sobrescribe»), `src/remolques/clientes/historial.ts` (reparto del historial de antes al leer), `src/remolques/clientes/diferencias.ts` (`resumenCambios`), `src/client/remolques/ClientesRemolquesView.tsx` (`BarraFicha`: versión, motivo opcional, Descartar, Guardar con el «Soy») y `src/client/remolques/HistorialFicha.tsx`; `scripts/test-remolques-clientes-e2e.mjs` (e2e en su aislada, capturas).

## Decisiones del plan (lo que el spec no fija)

- **Ámbitos.** Un «ámbito» es cada uno de los 22 modelos de Parámetros (`modelNames` de `modelBehavior.js`) más **«Trabajos de tela (comunes)»** (`TRABAJOS DE TELA`): lo que comparten Cambio de tela, Enrollable, Bambalina y Cambio Antica (`fabricJobs` salvo `dropAllowanceByModel`, p. ej. el remate de bambalina). Cada modelo es dueño de su apartado (`arzuaPro`, `galicia`…), de su margen de caída si es trabajo de tela (`fabricJobs.dropAllowanceByModel[modelo]`) y de sus dibujos (`drawings.byModel[modelo]`). Hera, Iris y Antica solo tienen dibujos. La ficha de un trabajo de tela enseña también los comunes: su barra guarda los dos ámbitos que tengan cambios, cada uno con su versión y su renglón de historial.
- **Formato del fichero.** Se conserva `overrides` igual que hoy (solo lo que difiere del código) y la `version` de todo el fichero, que **sigue subiendo en cada guardado** (como las fichas: si hubiera que volver a la web anterior, lo lee). Se añaden `formato: 2` y `modelos: { [ámbito]: { version, updatedAt, updatedBy, motivo } }`. El historial sigue en el mismo `rule-parameters-history.jsonl`; los renglones nuevos llevan `ambito`, `versionAmbito`, `motivo` y `resumen`, y además los campos que leía la web de antes (`version`, `reason`, `changedSections`, `overrides` completos tras el cambio).
- **Lo de antes se lee tal cual y no se reescribe al leer.** Sin `modelos` (fichero de hoy, o uno reescrito por la web anterior tras volver atrás), la versión de cada modelo es el número de renglones del historial que lo cambiaron (comparando cada renglón con el anterior), y su historial sale de ahí con el resumen calculado («Margen de caída: 45 → 50», «Dibujo «General» añadido»). El primer guardado escribe el formato nuevo con `writeFileAtomic` y añade su renglón; los renglones viejos no se tocan.
- **Un fichero que no se puede leer no se sobrescribe** (como las fichas): se calcula con los valores del código, pero guardar responde 503 «Los parámetros guardados no se pueden leer: revisa el fichero antes de guardar.» y no escribe nada. Hoy lo pisaría el primer guardado.
- **409 por modelo.** `PUT /api/rule-parameters/models/:scope` con `{ baseVersion, parameters, updatedBy, motivo? }`: el servidor toma de `parameters` (el borrador entero) solo lo del ámbito; 409 solo si la versión de ese ámbito cambió. Quién es obligatorio (técnico de la lista, el «Soy»); el motivo, opcional. `PUT /api/rule-parameters` (la ruta de antes) **se queda** para una pestaña abierta con la web anterior: comprueba la versión de todo el fichero, motivo ya opcional, y guarda cada modelo cambiado con su propio renglón.
- **Sin tocar `App.tsx` (trabajo de Codex).** El estado de los parámetros de toldos pasa a un módulo (`parametrosToldos.ts`) leído con `useSyncExternalStore`: `App` sigue llamando a `useParameters()` igual, y `ParametersView` lee el mismo estado. Así: (a) la barra de guardar va dentro de `ParametersView`, una por modelo; (b) el historial de la cabecera (el `ParametersHistory` que `App` ya pinta sin `endpoint`) enseña el del modelo elegido en Parámetros, que pasa a vivir en el estado compartido; (c) `useParameters().dirty` vale siempre `false`, para que la barra común «Cambios sin guardar · Guardar para todos» de `App` no salga con toldos (con Remolques › Generales sigue igual). La tarea 9, opcional y tardía, limpia eso en `App.tsx` cuando Codex haya subido.
- **«Restaurar valores por defecto»** en la ficha de un modelo restaura lo de su página (el modelo y, en los trabajos de tela, los comunes) sin tocar sus dibujos; «Vaciar dibujos» sigue aparte.
- **«Descartar cambios»** en la barra del modelo pide confirmación en la misma barra («¿Descartar los cambios de Enrollable?» · «Descartar» · «Seguir editando»), porque `askForConfirmation` vive en `App`.
- **Dibujos guardados hoy:** todos pasan a «Automático» con sus condiciones (sin condiciones = siempre). **Un dibujo nuevo empieza «Solo a mano»**: no cambia ningún PDF hasta que se elige en una tarjeta o se pasa a automático.
- **«Solo a mano» frente a «Automático»:** el automático sale solo cuando el toldo cumple todas sus condiciones (el más concreto gana; a igual número de condiciones, el primero de la lista); los dos se pueden elegir a mano. Un dibujo «Solo a mano» guarda sus condiciones si las tenía, pero no se usan.
- **Condiciones con valores reales.** Campos y valores por modelo, de lo mismo que usa el formulario: Accionamiento (`getFieldVisibility(...).deviceOptions`), Colocación (`formOptions.colocaciones`), Variante (`submodelOptions`), Lado de la máquina (`formOptions.localizacionesMaquina`), Soporte (`supportOptions`), Tubo de carga (`tubeOptions`), Lleva bamba y Curva de la bamba (si el modelo tiene bamba; Bambalina solo la curva), Con ventana (Cortina, Cambio de cortina, Electra, Selena), Confección (Cortina, Cambio de cortina, Electra), Soporte de la cortina (Cortina, Selena), Tipo de soporte (Electra, `electraSupports`), Tipo y Fijación de la guía y Secur Wind Block (Iris), Variante de Antica (`anticaVariants`), Medición (Cambio Antica) y Trabajo especial (`getFabricDiagramOptions`). Sí/No se guarda como `SÍ`/`NO`. La comparación sigue siendo sin acentos ni mayúsculas, así que «si» guardado antes casa con «SÍ». Lo que no case (campo que el modelo no tiene o valor que no está en la lista) sale con «(revisar)» y un aviso, y se sigue usando igual que hoy.
- **Tarjeta.** El toldo guarda el dibujo elegido en `workshopDrawingId` (texto; vacío = no hay). El desplegable «Dibujo de confección» sale si el modelo tiene dibujos del taller activos con imagen o trabajos especiales; sus opciones: «Automático (sale: el de la web)» o «Automático (sale: «X» del taller)», cada dibujo del taller como «Nombre (taller)» y los trabajos especiales de hoy. **Elegir un dibujo del taller quita el trabajo especial y al revés**: es la misma elección, qué dibujo sale. Al leer (ficha de revisión), «Automático» se sigue ocultando como valor por defecto. Si el elegido se quitó o se desactivó, el PDF usa el automático y la tarjeta avisa con «Entendido», que lo borra del toldo. Cambiar de modelo lo borra.
- **Precedencia** (spec): imagen propia del toldo > elegido a mano > automático del taller > dibujo de la web. `resolveConfiguredDrawing` devuelve `source: 'manual' | 'chosen' | 'parameters'`; el panel «Despiece y dibujo» dice «el dibujo del taller «X» (elegido en la tarjeta)» o «(automático, de Parámetros)».
- **Miniaturas «Lo que sale hoy».** El servidor hace un PDF de una hoja pequeña (258 × 343 pt) con el título y el dibujo de la hoja de tela, con la **misma función** que la hoja del planteamiento (`drawFabricDiagram`, sacada de `drawExcelFabricBody`), y la web lo pinta con pdf.js (como el visor de PDF). Toldo de ejemplo: 400 × 250 cm (`exampleAwning`), pasado por `normalizeOrder`; cálculo de ejemplo `{ fabricWidth: 400, fabricDrop: 275 }` para los dibujos con cotas (no se calcula el toldo). Hera no tiene miniatura: su hoja es una tabla y la web no dibuja la confección; se dice así.
- **Variantes de cada modelo** (`webDrawingVariants`): Cortina, Cambio de cortina y Electra: con / sin ventana × normal / velcro / tubo (6); Selena: con y sin ventana; Antica y Cambio Antica: una por variante (6); Iris: una por submodelo (5); Hera: una, sin dibujo de la web; el resto: «General». A todas se suma una por trabajo especial del modelo (Toldo con velcro, Cambio enrollable, Suplemento). Bajo cada miniatura se dice qué dibujo automático del taller la sustituye, con los dibujos de la pantalla (también sin guardar); si depende de algo que la variante no fija, se dice cuándo: «Velcro con motor» lo sustituye cuando Accionamiento = MOTOR.
- **Resumen del historial.** Cada valor de las fichas con el nombre que tiene en pantalla («Margen de caída», «Frente máximo», «Remate de bambalina»…; una prueba exige nombre para todos). Valores sueltos «antes → después» con coma decimal; tablas (descuentos, líneas mínimas…) «… cambiados». Dibujos: «Dibujo «X» añadido / quitado», «Dibujo «X»: nombre «A» → «B»; imagen cambiada; desactivado; Automático (siempre) → Solo a mano», «Orden de los dibujos cambiado».
- **Remolques (Generales y fichas) no cambian.** `ParametersSaveBar` sigue igual (lo usa Remolques › Generales).
- **La e2e va en su propia aislada** (`tmp/dibujos`, puertos 4315/4325), porque guarda parámetros. Usa nombres nuevos en cada vuelta para poder repetirse. La e2e de Bambalina (`scripts/test-bambalina-workflow.mjs`) guardaba con «Guardar para todos»: pasa a la barra del modelo.

## Global Constraints

- Solo escritorio (1280×720 a 1920); no adaptar a móvil.
- Textos de la interfaz y comentarios en castellano llano; decimales con coma (`formatNumber` de `src/domain/math.js` en el dominio, `toLocaleString('es-ES')` en la web). No citar el Excel en la interfaz.
- Diseño igual que CoordinaOT: tokens y piezas de `src/client/coordina/` (`ghost-button`, `primary-button`, `tecla-3d`, `bloque-3d`, `bloque-3d-hundido`, `panel-3d`, `panel-vidrio`, `glass-panel-strong`, `glass-pop`), en claro y oscuro. Colores solo con variables de `tokens.css` (`--text`, `--text-muted`, `--border`, `--danger`, `--color-brand-400`…); la única excepción es el blanco del papel de la miniatura (el PDF es blanco también en oscuro).
- Nunca arrancar la web con el `.env` real. La e2e usa su propia aislada: `ISOLATED_DIR="$PWD/tmp/dibujos" PORT=4315 FAKE_COORDINA_PORT=4325 bash .claude/skills/running-toldos-testar/start-isolated.sh` (Codex usa 4312; fase 5, 4311; fichas, 4313; buscador, 4314). Comprobar `/api/health`: `simulationMode` true y `fileWritesEnabled` false.
- En las pruebas no se escribe nada fuera de `tmp/` del repositorio (`path.join(process.cwd(), 'tmp')` con `mkdtemp`, nunca `os.tmpdir()`; la prueba del almacén deja de usar `os.tmpdir()`).
- RPS es solo lectura; este plan no añade consultas a RPS. No se toca el servidor 192.168.0.90 (despliega Iván). `coordina-ot` y `Remolques-TGM` son de solo lectura.
- No tocar la paridad de remolques (`src/remolques/paridad-produccion.test.ts`, `src/client/remolques/resultados-paridad.test.tsx`, `src/remolques/hoja/__tests__/paridad-hoja.test.ts`) ni sus fixtures.
- **No tocar los ficheros de Codex:** `src/client/App.tsx` (salvo la tarea 9, marcada), `OrderView.tsx`, `OrderHeader.tsx`, `OrderActions.tsx`, `OrderIdentity.tsx`, `OrderProgress.tsx`, `OrderSearch.tsx`, `OrderEmptyState.tsx`, `src/client/remolques/*`, `pedido-comun.css`, `estilos.css` y las e2e que Codex cambia (`test-borradores-e2e.mjs`, `test-order-search-e2e.mjs`, `test-remolques-2a-e2e.mjs`, `test-remolques-4-e2e.mjs`). Los estilos nuevos van en `src/client/coordina/parametros.css`, que ya se importa.
- Finales de línea (comprobar con `file <ruta>` antes de tocar): **CRLF** `src/client/hooks/useParameters.ts`, `src/client/components/{DrawingParametersPanel,ParametersHistory,AwningColumn,AwningPanel,SelectField}.tsx`, `src/client/types.ts`, `src/domain/planteamientoPdf.js`, `src/client/coordina/parametros.css`, `scripts/test-bambalina-workflow.mjs`, `.claude/skills/running-toldos-testar/SKILL.md`; **LF** `src/server.js`, `src/ruleParametersStore.js` (+ test), `src/domain/{ruleParameters,drawingParameters}.js` (+ test de dibujos), `src/client/views/ParametersView.tsx`, `src/client/hooks/useDraft.ts`, `src/client/constants.ts`, `src/client/components/FabricImageEditor.tsx`, `README.md` y todos los ficheros nuevos; **mezclado** `src/domain/validation.js` (editar con Edit, que lo respeta). Si un fichero CRLF se reescribe entero con Write, después: `node -e "const f=process.argv[1],fs=require('fs');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace(/\r?\n/g,'\r\n'))" <ruta>`.
- Commits en castellano explicando el porqué, terminando en `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. `git add` con rutas explícitas; nada de `git add -A`, stash, reset ni checkout de ficheros ajenos. Sin worktree: `git pull --rebase` y `git push origin main`; desde el worktree de Codex, `git pull --rebase origin main` y `git push origin HEAD:main`.
- Antes de subir: `pnpm test && pnpm typecheck && pnpm lint`, y `pnpm exec vite build` si se toca el cliente.
- Pantallas cambiadas: capturas con Playwright en la aislada, claro y oscuro, 1280×720 y 1600×1000, en `tmp/ui-audit/dibujos-y-versiones/`, y mirarlas (las hace la e2e de la tarea 8).

## Orden y reparto

| Tarea | Depende de | UI independiente | Toca `App.tsx` | Modelo recomendado |
| --- | --- | --- | --- | --- |
| 1. Dominio de los dibujos: cómo se usa, elegido a mano, condiciones reales, variantes | — | no | no | el más barato |
| 2. Dominio de las versiones: ámbitos, resumen e historial por modelo | 1 | no | no | el más barato |
| 3. Servidor: almacén por modelo con migración y rutas | 2 | no | no | intermedio (Sonnet) |
| 4. Servidor: miniaturas con el código del PDF | 1 | no | no | intermedio (Sonnet) |
| 5. Web: estado compartido, barra e historial por modelo | 2, 3 | **sí** | no | el más capaz (Opus) |
| 6. Web: Parámetros › Dibujos («Lo que sale hoy», cómo se usa, condiciones) | 1, 4, 5 | **sí** | no | el más capaz (Opus) |
| 7. Web: la tarjeta «Dibujo de confección» y el panel | 1, 6 | **sí** | no | intermedio (Sonnet) |
| 8. e2e, capturas y documentación | 1–7 | no | no | intermedio (Sonnet) |
| 9. *(tardía, opcional)* Limpiar la barra común de toldos en `App.tsx` — **requiere que Codex haya subido su trabajo a main** | 5, Codex | no | **sí** | el más barato |

Las tareas 3 y 4 no se pisan (`server.js` en sitios distintos: si van en paralelo, la segunda en subir hace `git pull --rebase`). La 7 va después de la 6 porque las dos añaden estilos a `parametros.css`.

## Mapa de ficheros

Crear:
- `src/domain/drawingCatalog.js` + `drawingCatalog.test.js` — condiciones con valores reales, variantes de la web, sustituciones.
- `src/domain/parameterScopes.js` + `parameterScopes.test.js` — ámbitos.
- `src/domain/parameterChanges.js` + `parameterChanges.test.js` — resumen.
- `src/domain/parameterHistory.js` + `parameterHistory.test.js` — historial por modelo.
- `src/domain/drawingPreview.test.js` — miniaturas de todos los modelos.
- `src/client/parametrosToldos.ts` + `parametrosToldos.test.ts` — estado compartido y guardado por modelo.
- `src/client/components/ModelSaveBar.tsx` + `ModelSaveBar.test.tsx` — barra del modelo.
- `src/client/components/LoQueSaleHoy.tsx`, `src/client/components/MiniaturaDibujo.tsx` — «Lo que sale hoy».
- `src/client/components/AwningColumn.dibujo.test.ts` — la tarjeta.
- `scripts/test-dibujos-e2e.mjs` — prueba de punta a punta.

Modificar:
- `src/domain/drawingParameters.js` + `drawingParameters.test.js`, `src/domain/ruleParameters.js`, `src/domain/planteamientoPdf.js`, `src/domain/validation.js`.
- `src/ruleParametersStore.js` + `src/ruleParametersStore.test.js`, `src/server.js`.
- `src/client/hooks/useParameters.ts`, `src/client/components/ParametersHistory.tsx`, `src/client/views/ParametersView.tsx`, `src/client/components/DrawingParametersPanel.tsx`, `src/client/coordina/parametros.css`.
- `src/client/types.ts`, `src/client/constants.ts`, `src/client/hooks/useDraft.ts` + `useDraft.test.ts`, `src/client/components/SelectField.tsx`, `src/client/components/AwningColumn.tsx`, `src/client/components/AwningPanel.tsx`, `src/client/components/FabricImageEditor.tsx`.
- `scripts/test-bambalina-workflow.mjs`, `README.md`, `.claude/skills/running-toldos-testar/SKILL.md`.
- Solo la tarea 9: `src/client/App.tsx`.

---

### Task 1: Dominio de los dibujos: cómo se usa, elegido a mano, condiciones reales y variantes

Modelo recomendado: el más barato (el código está completo). Esfuerzo: bajo.

**Files:**
- Modify: `src/domain/drawingParameters.js` (LF)
- Create: `src/domain/drawingCatalog.js`
- Test: `src/domain/drawingParameters.test.js` (LF), `src/domain/drawingCatalog.test.js`

**Interfaces:**
- Consumes: `normalizeFabricImage` (`fabricImage.js`), `normalizeModelName` (`modelNames.js`), `formOptions`, `getFabricDiagramOptions`, `getFieldVisibility`, `getModelBehavior`, `modelNames` (`modelBehavior.js`), `anticaVariants` (`anticaRules.js`), `electraSupports` (`electraParameters.js`), `irisGuideTypes`, `irisGuideFixings` (`irisParameters.js`), `buildPlanteamientoPlan` (`planteamientoPdf.js`, solo en la prueba).
- Produces (`drawingParameters.js`): `drawingUsages = ['manual', 'auto']`; cada dibujo normalizado lleva `usage: 'manual' | 'auto'` (sin dato = `'auto'`); `comparableDrawingValue(value): string`; `drawingConditionMatches(awning, condition): boolean`; `selectableDrawings(model, drawings): { id, name, usage }[]`; `resolveAutomaticDrawing(awning, drawings): { id, image, name, source: 'parameters' } | null`; `resolveChosenDrawing(awning, drawings): { id, image, name, source: 'chosen' } | null`; `chosenDrawingMissing(awning, drawings): boolean`; `resolveConfiguredDrawing(awning, drawings)` con la precedencia nueva (`source: 'manual' | 'chosen' | 'parameters'`). Se conservan `drawingConditionFields`, `defaultDrawingParameters`, `normalizeDrawingParameters`.
- Produces (`drawingCatalog.js`): `drawingConditionLabels: Record<campo, string>`; `drawingConditionValueLabel(value): string`; `drawingConditionOptions(model): { field, label, values: string[] }[]`; `drawingConditionNeedsReview(model, condition): boolean`; `drawingConditionShownValue(model, condition): string`; `drawingConditionsText(conditions): string`; `webDrawingVariants(model): { id, label, webDrawing: boolean, awning: { model, ... } }[]`; `exampleAwning(variant): object`; `automaticDrawingsForVariant(variant, drawings): { id, name, pending: Condition[] }[]`; `replacementLines(replacements): string[]`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Añadir al final de `src/domain/drawingParameters.test.js` (y cambiar su primera línea de imports por la de abajo):

```js
import { chosenDrawingMissing, normalizeDrawingParameters, resolveAutomaticDrawing, resolveConfiguredDrawing, selectableDrawings } from './drawingParameters.js';
```

```js
describe('cómo se usa cada dibujo y el elegido en la tarjeta (02/10/2026)', () => {
  const library = { byModel: { ENROLLABLE: [
    { id: 'plano', name: 'Plano', usage: 'manual', enabled: true, image: imageA, conditions: [] },
    { id: 'general', name: 'General', enabled: true, image: imageB, conditions: [] }
  ] } };

  it('los dibujos guardados antes son automáticos; «Solo a mano» se conserva', () => {
    expect(normalizeDrawingParameters(library).byModel.ENROLLABLE.map((d) => d.usage)).toEqual(['manual', 'auto']);
  });

  it('«Solo a mano» nunca sale solo; el automático sí', () => {
    expect(resolveAutomaticDrawing({ model: 'ENROLLABLE' }, library)).toMatchObject({ id: 'general', name: 'General', source: 'parameters' });
    expect(resolveConfiguredDrawing({ model: 'ENROLLABLE' }, library)).toMatchObject({ id: 'general' });
  });

  it('precedencia: imagen del toldo > elegido a mano > automático > dibujo de la web', () => {
    const chosen = { model: 'ENROLLABLE', workshopDrawingId: 'plano' };
    expect(resolveConfiguredDrawing(chosen, library)).toMatchObject({ id: 'plano', image: imageA, source: 'chosen' });
    expect(resolveConfiguredDrawing({ ...chosen, fabricImage: imageB }, library)).toMatchObject({ source: 'manual' });
    expect(resolveConfiguredDrawing({ model: 'ENROLLABLE', workshopDrawingId: 'general' }, library)).toMatchObject({ id: 'general', source: 'chosen' });
    expect(resolveConfiguredDrawing({ model: 'BAMBALINA' }, library)).toBeNull();
  });

  it('un elegido que se quitó, se desactivó o no tiene imagen avisa y deja salir el automático', () => {
    const off = { byModel: { ENROLLABLE: [{ ...library.byModel.ENROLLABLE[0], enabled: false }, library.byModel.ENROLLABLE[1]] } };
    const awning = { model: 'ENROLLABLE', workshopDrawingId: 'plano' };
    expect(chosenDrawingMissing(awning, off)).toBe(true);
    expect(resolveConfiguredDrawing(awning, off)).toMatchObject({ id: 'general', source: 'parameters' });
    expect(chosenDrawingMissing({ model: 'ENROLLABLE', workshopDrawingId: 'otro' }, library)).toBe(true);
    expect(chosenDrawingMissing({ model: 'ENROLLABLE', workshopDrawingId: '' }, library)).toBe(false);
    expect(chosenDrawingMissing(awning, library)).toBe(false);
  });

  it('en la tarjeta se eligen los activos con imagen, a mano y automáticos', () => {
    const withBroken = { byModel: { ENROLLABLE: [...library.byModel.ENROLLABLE, { id: 'sin', name: 'Sin imagen', enabled: true, image: null, conditions: [] }] } };
    expect(selectableDrawings('enrollable', withBroken)).toEqual([
      { id: 'plano', name: 'Plano', usage: 'manual' },
      { id: 'general', name: 'General', usage: 'auto' }
    ]);
  });

  it('el elegido a mano llega al PDF', () => {
    const awning = { id: 'awning-1', model: 'ENROLLABLE', workshopDrawingId: 'plano', fabricImage: null };
    const plan = buildPlanteamientoPlan({ awnings: [awning], parameters: { drawings: library } }, { ofs: [{ awningId: 'awning-1', calculation: {} }] });
    expect(plan.fabricPages[0].diagramAwning.fabricImage).toBe(imageA);
  });
});
```

Crear `src/domain/drawingCatalog.test.js`:

```js
import { describe, expect, it } from 'vitest';
import {
  automaticDrawingsForVariant, drawingConditionNeedsReview, drawingConditionOptions, drawingConditionShownValue,
  exampleAwning, replacementLines, webDrawingVariants
} from './drawingCatalog.js';
import { modelNames } from './modelBehavior.js';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const fields = (model) => drawingConditionOptions(model).map((option) => option.field);

describe('condiciones con valores reales de cada modelo', () => {
  it('cada modelo ofrece solo sus campos, con los valores del formulario', () => {
    const cortina = drawingConditionOptions('CORTINA');
    expect(cortina.find((o) => o.field === 'device').values).toEqual(['MAQ. INTERIOR', 'MAQ. EXTERIOR', 'MOTOR']);
    expect(cortina.find((o) => o.field === 'curtainHasWindow')).toMatchObject({ label: 'Con ventana', values: ['SÍ', 'NO'] });
    expect(cortina.find((o) => o.field === 'curtainFinish').values).toEqual(['NORMAL', 'VELCRO', 'TUBO']);
    expect(fields('CORTINA')).not.toContain('irisGuideType');
    expect(fields('ENROLLABLE')).toEqual(['fabricDiagramOverride']);
    expect(drawingConditionOptions('IRIS').find((o) => o.field === 'device').values).toEqual(['MAQUINA', 'MOTOR']);
    expect(fields('ANTICA')).toContain('anticaVariant');
    expect(fields('BAMBALINA')).toEqual(['valanceCurve', 'fabricDiagramOverride']);
    expect(fields('ARZUA PRO')).toEqual(expect.arrayContaining(['device', 'placement', 'machineSide', 'tubeLoad', 'hasValance', 'valanceCurve', 'fabricDiagramOverride']));
  });

  it('marca para revisar lo que no casa con un valor real; lo de antes en minúsculas sí casa', () => {
    expect(drawingConditionNeedsReview('CORTINA', { field: 'device', value: 'motor' })).toBe(false);
    expect(drawingConditionNeedsReview('CORTINA', { field: 'curtainHasWindow', value: 'si' })).toBe(false);
    expect(drawingConditionNeedsReview('CORTINA', { field: 'device', value: 'MOTORR' })).toBe(true);
    expect(drawingConditionNeedsReview('CORTINA', { field: 'irisGuideType', value: 'PARED' })).toBe(true);
    expect(drawingConditionShownValue('CORTINA', { field: 'curtainHasWindow', value: 'si' })).toBe('SÍ');
    expect(drawingConditionShownValue('CORTINA', { field: 'device', value: 'MOTORR' })).toBe('MOTORR');
  });
});

describe('variantes del dibujo de la web', () => {
  it('Cortina por ventana y confección; Enrollable general y cambio; Hera sin dibujo de la web', () => {
    expect(webDrawingVariants('CORTINA').map((v) => v.id)).toEqual([
      'con-ventana', 'con-ventana-velcro', 'con-ventana-tubo', 'sin-ventana', 'sin-ventana-velcro', 'sin-ventana-tubo'
    ]);
    expect(webDrawingVariants('ENROLLABLE').map((v) => v.id)).toEqual(['general', 'cambio-enrollable']);
    expect(webDrawingVariants('ARZUA PRO').map((v) => v.label)).toEqual(['General', 'Toldo con velcro']);
    expect(webDrawingVariants('HERA')).toEqual([expect.objectContaining({ id: 'hera', webDrawing: false })]);
    expect(webDrawingVariants('ANTICA')).toHaveLength(6);
    expect(webDrawingVariants('SELENA').map((v) => v.id)).toEqual(['sin-ventana', 'con-ventana']);
  });

  it('todos los modelos tienen al menos una variante y su toldo de ejemplo es de ese modelo', () => {
    for (const model of modelNames) {
      const variants = webDrawingVariants(model);
      expect(variants.length, model).toBeGreaterThan(0);
      for (const variant of variants) expect(exampleAwning(variant)).toMatchObject({ model, width: 400, projection: 250 });
    }
  });
});

describe('qué dibujo del taller sustituye a cada variante', () => {
  const drawings = { byModel: { CORTINA: [
    { id: 'velcro-motor', name: 'Velcro con motor', enabled: true, image, conditions: [{ field: 'curtainFinish', value: 'VELCRO' }, { field: 'device', value: 'MOTOR' }] },
    { id: 'velcro', name: 'Velcro', enabled: true, image, conditions: [{ field: 'curtainFinish', value: 'VELCRO' }] },
    { id: 'mano', name: 'A mano', usage: 'manual', enabled: true, image, conditions: [] }
  ] } };
  const variant = (id) => webDrawingVariants('CORTINA').find((v) => v.id === id);

  it('dice cuál y, si depende de algo que la variante no fija, cuándo', () => {
    expect(automaticDrawingsForVariant(variant('sin-ventana-velcro'), drawings)).toEqual([
      { id: 'velcro-motor', name: 'Velcro con motor', pending: [{ field: 'device', value: 'MOTOR' }] },
      { id: 'velcro', name: 'Velcro', pending: [] }
    ]);
    expect(automaticDrawingsForVariant(variant('sin-ventana'), drawings)).toEqual([]);
  });

  it('en palabras', () => {
    expect(replacementLines(automaticDrawingsForVariant(variant('con-ventana-velcro'), drawings))).toEqual([
      '«Velcro con motor» lo sustituye cuando Accionamiento = MOTOR.',
      '«Velcro» lo sustituye siempre.'
    ]);
    expect(replacementLines([])).toEqual(['Sale el de la web.']);
    expect(replacementLines([{ id: 'x', name: 'X', pending: [{ field: 'device', value: 'MOTOR' }] }])).toEqual([
      '«X» lo sustituye cuando Accionamiento = MOTOR.', 'Si no, sale el de la web.'
    ]);
  });
});
```

- [ ] **Step 2: Comprobar que fallan**

Run: `pnpm exec vitest run src/domain/drawingParameters.test.js src/domain/drawingCatalog.test.js`
Expected: FAIL (`resolveAutomaticDrawing` no existe; `drawingCatalog.js` no existe).

- [ ] **Step 3: Cambiar `src/domain/drawingParameters.js`**

Debajo de `const conditionFieldSet = new Set(drawingConditionFields);` añadir:

```js
// Cómo se usa cada dibujo del taller (Iván, 02/10/2026): «Solo a mano» sale solo si se elige en la
// tarjeta del toldo; «Automático» sale solo cuando el toldo cumple sus condiciones (sin condiciones,
// siempre en su modelo) y también se puede elegir a mano. Los guardados antes eran todos automáticos.
export const drawingUsages = ['manual', 'auto'];
```

En `normalizeDrawingVariant`, en el objeto que devuelve, después de `enabled: input.enabled !== false,` añadir:

```js
    usage: input.usage === 'manual' ? 'manual' : 'auto',
```

Sustituir desde `export function resolveConfiguredDrawing(` hasta el final de `function comparable(input) { … }` (dejando `function clean`) por:

```js
const usable = (variant) => variant.enabled && Boolean(variant.image);
const variantsOf = (model, input) => normalizeDrawingParameters(input).byModel[normalizeModelName(model)] || [];

/** Los dibujos del taller de un modelo que se pueden elegir en la tarjeta: activos y con imagen. */
export function selectableDrawings(model, input = defaultDrawingParameters) {
  return variantsOf(model, input).filter(usable).map(({ id, name, usage }) => ({ id, name, usage }));
}

/** El dibujo automático del taller que le toca a este toldo, sin mirar su imagen propia ni el elegido a mano. */
export function resolveAutomaticDrawing(awning = {}, input = defaultDrawingParameters) {
  const matches = variantsOf(awning.model, input)
    .map((variant, index) => ({ variant, index }))
    .filter(({ variant }) => variant.usage === 'auto' && usable(variant) && variant.conditions.every((condition) => drawingConditionMatches(awning, condition)))
    .sort((left, right) => right.variant.conditions.length - left.variant.conditions.length || left.index - right.index);
  const selected = matches[0]?.variant;
  return selected ? { id: selected.id, image: selected.image, name: selected.name, source: 'parameters' } : null;
}

/** El dibujo del taller elegido a mano en la tarjeta, si sigue activo y con imagen en Parámetros. */
export function resolveChosenDrawing(awning = {}, input = defaultDrawingParameters) {
  const id = clean(awning.workshopDrawingId);
  if (!id) return null;
  const variant = variantsOf(awning.model, input).find((item) => item.id === id && usable(item));
  return variant ? { id: variant.id, image: variant.image, name: variant.name, source: 'chosen' } : null;
}

/** El toldo tiene un dibujo elegido a mano que ya no está (se quitó, se desactivó o no tiene imagen). */
export function chosenDrawingMissing(awning = {}, input = defaultDrawingParameters) {
  return Boolean(clean(awning.workshopDrawingId)) && !resolveChosenDrawing(awning, input);
}

// Qué sale en el PDF: la imagen puesta en el toldo; si no, el dibujo del taller elegido a mano;
// si no, el automático del taller que encaje; si tampoco (null), el dibujo de la web.
export function resolveConfiguredDrawing(awning = {}, input = defaultDrawingParameters) {
  if (awning.fabricImage) {
    return { image: normalizeFabricImage(awning.fabricImage), name: 'Imagen manual del pedido', source: 'manual' };
  }
  return resolveChosenDrawing(awning, input) ?? resolveAutomaticDrawing(awning, input);
}

export function drawingConditionMatches(awning, condition) {
  return Boolean(condition.value) && comparableDrawingValue(awning?.[condition.field]) === comparableDrawingValue(condition.value);
}

/** Para comparar valores de condiciones: sin acentos, espacios de más ni mayúsculas; Sí/No de los booleanos. */
export function comparableDrawingValue(input) {
  if (typeof input === 'boolean') return input ? 'SI' : 'NO';
  return clean(input)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}
```

- [ ] **Step 4: Crear `src/domain/drawingCatalog.js`**

```js
/**
 * Lo que necesita Parámetros › Dibujos para hablar con valores reales (Iván, 02/10/2026): las
 * condiciones de cada modelo con sus valores (los mismos que ofrece el formulario), las variantes
 * del dibujo de la web de cada modelo con su toldo de ejemplo, y qué dibujo automático del taller
 * sustituye a cada variante.
 */
import { anticaVariants } from './anticaRules.js';
import { comparableDrawingValue, drawingConditionMatches, normalizeDrawingParameters } from './drawingParameters.js';
import { electraSupports } from './electraParameters.js';
import { irisGuideFixings, irisGuideTypes } from './irisParameters.js';
import { formOptions, getFabricDiagramOptions, getFieldVisibility, getModelBehavior } from './modelBehavior.js';
import { normalizeModelName } from './modelNames.js';

const YES_NO = ['SÍ', 'NO'];
const CURTAIN_FINISHES = ['NORMAL', 'VELCRO', 'TUBO'];

export const drawingConditionLabels = {
  device: 'Accionamiento',
  placement: 'Colocación',
  submodel: 'Variante',
  machineSide: 'Lado de la máquina',
  supportSystem: 'Soporte',
  tubeLoad: 'Tubo de carga',
  hasValance: 'Lleva bamba',
  valanceCurve: 'Curva de la bamba',
  curtainHasWindow: 'Con ventana',
  curtainFinish: 'Confección',
  curtainSupport: 'Soporte de la cortina',
  electraSupport: 'Tipo de soporte',
  irisGuideType: 'Tipo de guía',
  irisGuideFixing: 'Fijación de la guía',
  irisWindBlock: 'Secur Wind Block',
  anticaVariant: 'Variante',
  anticaMeasurementMode: 'Medición',
  fabricDiagramOverride: 'Trabajo especial'
};

const valueLabels = {
  BASE: 'Medida base',
  FINISHED: 'Tela terminada',
  'TOLDO-VELCRO': 'Toldo con velcro',
  'CAMBIO ENROLLABLE': 'Cambio enrollable',
  SUPLEMENTO: 'Suplemento'
};

/** El nombre de un valor que no se entiende por sí solo («FINISHED» → «Tela terminada»); los demás, tal cual. */
export function drawingConditionValueLabel(value) {
  return valueLabels[value] ?? String(value ?? '');
}

/** Los campos que tiene cada modelo para «Automático cuando…», con sus valores reales. */
export function drawingConditionOptions(model) {
  const code = normalizeModelName(model);
  const behavior = getModelBehavior(code);
  const visible = getFieldVisibility({ model: code, device: '' });
  const supportsValance = (behavior.dimensions || []).includes('valanceHeight');
  const curtain = code.includes('CORTINA') || code === 'ELECTRA';
  const options = [];
  const add = (field, values) => {
    if (values.length) options.push({ field, label: drawingConditionLabels[field], values: [...values] });
  };
  if (visible.device) add('device', visible.deviceOptions || []);
  if (visible.placement) add('placement', formOptions.colocaciones);
  add('submodel', behavior.submodelOptions || []);
  if (visible.device) add('machineSide', formOptions.localizacionesMaquina);
  add('supportSystem', behavior.supportOptions || []);
  add('tubeLoad', behavior.tubeOptions || []);
  if (supportsValance && code !== 'BAMBALINA') add('hasValance', YES_NO);
  if (supportsValance) add('valanceCurve', formOptions.curvasBamba);
  if (curtain || code === 'SELENA') add('curtainHasWindow', YES_NO);
  if (curtain) add('curtainFinish', CURTAIN_FINISHES);
  if (code === 'CORTINA' || code === 'SELENA') add('curtainSupport', ['UNIVERSAL 3 AGUJEROS', 'MAXISCREEM']);
  if (code === 'ELECTRA') add('electraSupport', electraSupports);
  if (code === 'IRIS') {
    add('irisGuideType', irisGuideTypes);
    add('irisGuideFixing', irisGuideFixings);
    add('irisWindBlock', YES_NO);
  }
  if (code === 'ANTICA' || code === 'CAMBIO ANTICA') add('anticaVariant', anticaVariants);
  if (code === 'CAMBIO ANTICA') add('anticaMeasurementMode', ['BASE', 'FINISHED']);
  add('fabricDiagramOverride', getFabricDiagramOptions(code).filter((option) => option.value).map((option) => option.value));
  return options;
}

const sameValue = (left, right) => comparableDrawingValue(left) === comparableDrawingValue(right);

/** Una condición guardada que no casa con un campo o un valor real del modelo: se marca para revisar. */
export function drawingConditionNeedsReview(model, condition) {
  const option = drawingConditionOptions(model).find((item) => item.field === condition?.field);
  return !option || !option.values.some((value) => sameValue(value, condition.value));
}

/** El valor de la lista que corresponde al guardado («si» → «SÍ»), o el guardado tal cual si no casa. */
export function drawingConditionShownValue(model, condition) {
  const option = drawingConditionOptions(model).find((item) => item.field === condition?.field);
  return option?.values.find((value) => sameValue(value, condition.value)) ?? String(condition?.value ?? '');
}

/** «Accionamiento = MOTOR y Confección = VELCRO». */
export function drawingConditionsText(conditions) {
  return conditions
    .map((condition) => `${drawingConditionLabels[condition.field] ?? condition.field} = ${drawingConditionValueLabel(condition.value)}`)
    .join(' y ');
}

const slug = (text) => String(text)
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const CURTAIN_VARIANTS = [
  { id: 'con-ventana', label: 'Con ventana', awning: { curtainHasWindow: true, curtainFinish: 'NORMAL' } },
  { id: 'con-ventana-velcro', label: 'Con ventana · velcro', awning: { curtainHasWindow: true, curtainFinish: 'VELCRO' } },
  { id: 'con-ventana-tubo', label: 'Con ventana · tubo', awning: { curtainHasWindow: true, curtainFinish: 'TUBO' } },
  { id: 'sin-ventana', label: 'Sin ventana', awning: { curtainHasWindow: false, curtainFinish: 'NORMAL' } },
  { id: 'sin-ventana-velcro', label: 'Sin ventana · velcro', awning: { curtainHasWindow: false, curtainFinish: 'VELCRO' } },
  { id: 'sin-ventana-tubo', label: 'Sin ventana · tubo', awning: { curtainHasWindow: false, curtainFinish: 'TUBO' } }
];

/**
 * Las variantes del dibujo de la web de un modelo («Lo que sale hoy»), cada una con lo que fija de
 * su toldo de ejemplo. Hera no tiene dibujo de la web: su hoja es una tabla por toldo.
 */
export function webDrawingVariants(model) {
  const code = normalizeModelName(model);
  if (code === 'HERA') return [{ id: 'hera', label: 'Hera', webDrawing: false, awning: { model: code } }];
  let base;
  if (code === 'SELENA') {
    base = [
      { id: 'sin-ventana', label: 'Sin ventana', awning: { curtainHasWindow: false } },
      { id: 'con-ventana', label: 'Con ventana', awning: { curtainHasWindow: true } }
    ];
  } else if (code.includes('CORTINA') || code === 'ELECTRA') {
    base = CURTAIN_VARIANTS;
  } else if (code === 'ANTICA' || code === 'CAMBIO ANTICA') {
    base = anticaVariants.map((variant) => ({ id: slug(variant), label: variant, awning: { anticaVariant: variant } }));
  } else if (code === 'IRIS') {
    base = (getModelBehavior(code).submodelOptions || []).map((submodel) => ({ id: slug(submodel), label: submodel, awning: { submodel } }));
  } else {
    base = [{ id: 'general', label: 'General', awning: {} }];
  }
  const specials = getFabricDiagramOptions(code)
    .filter((option) => option.value)
    .map((option) => ({ id: slug(option.value), label: drawingConditionValueLabel(option.value), awning: { fabricDiagramOverride: option.value } }));
  return [
    ...base.map((variant) => ({ ...variant, awning: { fabricDiagramOverride: '', ...variant.awning } })),
    ...specials
  ].map((variant) => ({ webDrawing: true, ...variant, awning: { model: code, ...variant.awning } }));
}

/** El toldo de ejemplo de una variante (400 × 250 cm), para pasarlo por normalizeOrder y dibujarlo. */
export function exampleAwning(variant) {
  return { id: 'ejemplo', of: '0200001', units: 1, width: 400, projection: 250, ...variant.awning };
}

/**
 * Los dibujos automáticos del taller que pueden sustituir a una variante, del más concreto al más
 * general. `pending` son las condiciones sobre campos que la variante no fija (dependen del toldo).
 */
export function automaticDrawingsForVariant(variant, input) {
  const fixed = new Set(Object.keys(variant.awning).filter((key) => key !== 'model'));
  const drawings = normalizeDrawingParameters(input).byModel[variant.awning.model] || [];
  return drawings
    .map((drawing, index) => ({ drawing, index }))
    .filter(({ drawing }) => drawing.usage === 'auto' && drawing.enabled && drawing.image
      && drawing.conditions.every((condition) => condition.value && (!fixed.has(condition.field) || drawingConditionMatches(variant.awning, condition))))
    .sort((left, right) => right.drawing.conditions.length - left.drawing.conditions.length || left.index - right.index)
    .map(({ drawing }) => ({ id: drawing.id, name: drawing.name, pending: drawing.conditions.filter((condition) => !fixed.has(condition.field)) }));
}

/** Lo de arriba en frases, hasta el primero que sustituye siempre. */
export function replacementLines(replacements) {
  if (!replacements.length) return ['Sale el de la web.'];
  const lines = [];
  for (const replacement of replacements) {
    if (!replacement.pending.length) {
      lines.push(`«${replacement.name}» lo sustituye siempre.`);
      return lines;
    }
    lines.push(`«${replacement.name}» lo sustituye cuando ${drawingConditionsText(replacement.pending)}.`);
  }
  lines.push('Si no, sale el de la web.');
  return lines;
}
```

- [ ] **Step 5: Comprobar que pasan**

Run: `pnpm exec vitest run src/domain/drawingParameters.test.js src/domain/drawingCatalog.test.js src/domain/planteamientoPdf`
Expected: PASS (las pruebas de antes de `drawingParameters.test.js` también).

- [ ] **Step 6: Batería y commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS.

```bash
git add src/domain/drawingParameters.js src/domain/drawingParameters.test.js src/domain/drawingCatalog.js src/domain/drawingCatalog.test.js
git commit -m "feat(dibujos): cada dibujo del taller dice cómo se usa y se puede elegir a mano

Iván (02/10/2026): un dibujo guardado en Parámetros no se podía elegir en
la tarjeta y las condiciones eran un campo interno con un valor escrito a
mano. Cada dibujo lleva ahora «Solo a mano» o «Automático» (los guardados
antes son automáticos) y el toldo puede llevar el elegido a mano, con la
precedencia del diseño: imagen del toldo, elegido a mano, automático del
taller y dibujo de la web. drawingCatalog.js da las condiciones de cada
modelo con sus valores reales, las variantes del dibujo de la web con su
toldo de ejemplo y qué dibujo del taller sustituye a cada una.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Dominio de las versiones: ámbitos, resumen e historial por modelo

Modelo recomendado: el más barato (el código está completo). Esfuerzo: bajo.

**Files:**
- Modify: `src/domain/ruleParameters.js` (LF)
- Create: `src/domain/parameterScopes.js`, `src/domain/parameterChanges.js`, `src/domain/parameterHistory.js`
- Test: `src/domain/parameterScopes.test.js`, `src/domain/parameterChanges.test.js`, `src/domain/parameterHistory.test.js`

**Interfaces:**
- Consumes: `normalizeRuleParameters`, `ruleParameterOverrides` (`ruleParameters.js`); `modelNames` (`modelBehavior.js`); `normalizeModelName`; `formatNumber` (`math.js`); `drawingConditionsText`, `drawingConditionValueLabel` (tarea 1).
- Produces (`ruleParameters.js`): `sameParameterValue(left, right): boolean` (la comparación estable que ya había).
- Produces (`parameterScopes.js`): `COMMON_FABRIC_SCOPE = 'TRABAJOS DE TELA'`; `fabricJobScopes = ['CAMBIO TELA', 'ENROLLABLE', 'BAMBALINA', 'CAMBIO ANTICA']`; `parameterScopes = [...modelNames, COMMON_FABRIC_SCOPE]`; `isParameterScope(scope): boolean`; `pageScopes(model): string[]`; `scopeParts(parameters, scope): { values, drawings }`; `applyScope(target, source, scope, { includeDrawings = true } = {}): RuleParameters`; `changedScopes(before, after): string[]` (en el orden de `parameterScopes`); `scopeSections(scope): string[]`; `rebaseDraft(previousShared, nextShared, draft): RuleParameters | null`.
- Produces (`parameterChanges.js`): `PARAMETER_LABELS: Record<clave, string>`; `scopeChangeSummary(before, after, scope): string[]`.
- Produces (`parameterHistory.js`): `scopeHistory(lines, scope, limit = Infinity): Entrada[]` con `Entrada = { ambito, versionAmbito, version, updatedAt, updatedBy, motivo, resumen: string[], overrides, anterior?: true }` (de la más nueva a la más vieja); `scopeVersions(lines): Record<ámbito, { version, updatedAt, updatedBy, motivo }>`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/domain/parameterScopes.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { applyScope, changedScopes, COMMON_FABRIC_SCOPE, pageScopes, parameterScopes, rebaseDraft, scopeParts } from './parameterScopes.js';
import { modelNames } from './modelBehavior.js';
import { normalizeRuleParameters } from './ruleParameters.js';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const base = () => normalizeRuleParameters();
const conDibujo = (p, model) => ({ ...p, drawings: { byModel: { ...p.drawings.byModel, [model]: [{ id: 'general', name: 'General', usage: 'auto', enabled: true, image, conditions: [] }] } } });

describe('ámbitos de los parámetros de toldos', () => {
  it('un ámbito por modelo y otro para lo común de los trabajos de tela', () => {
    expect(parameterScopes).toEqual([...modelNames, COMMON_FABRIC_SCOPE]);
    expect(pageScopes('enrollable')).toEqual(['ENROLLABLE', COMMON_FABRIC_SCOPE]);
    expect(pageScopes('GALICIA')).toEqual(['GALICIA']);
  });

  it('cada cambio cae en su modelo: apartado, margen de trabajo de tela, comunes y dibujos', () => {
    const p = base();
    expect(changedScopes(p, { ...p, cortina: { ...p.cortina, fabricDropAllowanceCm: 50 } })).toEqual(['CORTINA']);
    expect(changedScopes(p, { ...p, fabricJobs: { ...p.fabricJobs, dropAllowanceByModel: { ...p.fabricJobs.dropAllowanceByModel, ENROLLABLE: 30 } } })).toEqual(['ENROLLABLE']);
    expect(changedScopes(p, { ...p, fabricJobs: { ...p.fabricJobs, valanceExtraCm: 8 } })).toEqual([COMMON_FABRIC_SCOPE]);
    expect(changedScopes(p, conDibujo(p, 'HERA'))).toEqual(['HERA']);
    expect(changedScopes(p, base())).toEqual([]);
  });

  it('aplicar un ámbito copia solo lo suyo', () => {
    const p = base();
    const otro = conDibujo({ ...p, cortina: { ...p.cortina, fabricDropAllowanceCm: 50 }, galicia: { ...p.galicia, fabricDropAllowanceCm: 60 } }, 'CORTINA');
    const next = applyScope(p, otro, 'CORTINA');
    expect(next.cortina.fabricDropAllowanceCm).toBe(50);
    expect(next.galicia).toEqual(p.galicia);
    expect(next.drawings.byModel.CORTINA).toHaveLength(1);
    expect(applyScope(p, otro, 'CORTINA', { includeDrawings: false }).drawings.byModel.CORTINA).toBeUndefined();
    expect(applyScope(otro, p, 'CORTINA').drawings.byModel.CORTINA).toBeUndefined();
  });

  it('los comunes de tela no tocan el margen de cada trabajo, y al revés', () => {
    const p = base();
    const otro = { ...p, fabricJobs: { ...p.fabricJobs, valanceExtraCm: 8, dropAllowanceByModel: { ...p.fabricJobs.dropAllowanceByModel, ENROLLABLE: 30 } } };
    const comunes = applyScope(p, otro, COMMON_FABRIC_SCOPE);
    expect(comunes.fabricJobs.valanceExtraCm).toBe(8);
    expect(scopeParts(comunes, 'ENROLLABLE').values).toBe(25);
    const enrollable = applyScope(p, otro, 'ENROLLABLE');
    expect(enrollable.fabricJobs.dropAllowanceByModel.ENROLLABLE).toBe(30);
    expect(enrollable.fabricJobs.valanceExtraCm).toBe(5);
  });

  it('rebasar el borrador conserva lo pendiente de otros modelos sobre lo guardado nuevo', () => {
    const antes = base();
    const borrador = { ...antes, cortina: { ...antes.cortina, fabricDropAllowanceCm: 50 }, galicia: { ...antes.galicia, fabricDropAllowanceCm: 60 } };
    const guardado = { ...antes, cortina: { ...antes.cortina, fabricDropAllowanceCm: 50 } };
    expect(changedScopes(guardado, rebaseDraft(antes, guardado, borrador))).toEqual(['GALICIA']);
    expect(rebaseDraft(antes, borrador, borrador)).toBeNull();
    expect(rebaseDraft(antes, guardado, null)).toBeNull();
  });
});
```

Crear `src/domain/parameterChanges.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { PARAMETER_LABELS, scopeChangeSummary } from './parameterChanges.js';
import { COMMON_FABRIC_SCOPE } from './parameterScopes.js';
import { normalizeRuleParameters } from './ruleParameters.js';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const image2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nVQAAAAASUVORK5CYII=';
const p = normalizeRuleParameters();

describe('resumen de lo que cambió en un modelo', () => {
  it('valores sueltos: antes → después, con coma decimal', () => {
    expect(scopeChangeSummary(p, { ...p, cortina: { ...p.cortina, fabricDropAllowanceCm: 50.5 } }, 'CORTINA')).toEqual(['Margen de caída: 45 → 50,5']);
    expect(scopeChangeSummary(p, { ...p, fabricJobs: { ...p.fabricJobs, dropAllowanceByModel: { ...p.fabricJobs.dropAllowanceByModel, ENROLLABLE: 30 } } }, 'ENROLLABLE')).toEqual(['Margen de caída: 25 → 30']);
    expect(scopeChangeSummary(p, { ...p, fabricJobs: { ...p.fabricJobs, valanceExtraCm: 8 } }, COMMON_FABRIC_SCOPE)).toEqual(['Remate de bambalina: 5 → 8']);
    expect(scopeChangeSummary(p, { ...p, cortina: { ...p.cortina, stockLengths: [500] } }, 'CORTINA')[0]).toMatch(/^Largos de barra: .+ → 500$/);
  });

  it('tablas: solo que cambiaron', () => {
    const widthDiscounts = Object.fromEntries(Object.entries(p.galicia.widthDiscounts).map(([key, value]) => [key, typeof value === 'number' ? value + 1 : value]));
    expect(scopeChangeSummary(p, { ...p, galicia: { ...p.galicia, widthDiscounts } }, 'GALICIA')).toEqual(['Descuentos del tubo de carga: cambiados']);
  });

  it('dibujos: añadidos, quitados, cambiados y de orden', () => {
    const d = { id: 'g', name: 'General', usage: 'auto', enabled: true, image, conditions: [] };
    const con = (list) => ({ ...p, drawings: { byModel: { ENROLLABLE: list } } });
    expect(scopeChangeSummary(p, con([d]), 'ENROLLABLE')).toEqual(['Dibujo «General» añadido']);
    expect(scopeChangeSummary(con([d]), p, 'ENROLLABLE')).toEqual(['Dibujo «General» quitado']);
    expect(scopeChangeSummary(con([d]), con([{ ...d, name: 'Plano', usage: 'manual', image: image2, enabled: false }]), 'ENROLLABLE')).toEqual([
      'Dibujo «Plano»: nombre «General» → «Plano»; imagen cambiada; desactivado; Automático (siempre) → Solo a mano'
    ]);
    expect(scopeChangeSummary(con([d]), con([{ ...d, conditions: [{ field: 'fabricDiagramOverride', value: 'CAMBIO ENROLLABLE' }] }]), 'ENROLLABLE')).toEqual([
      'Dibujo «General»: Automático (siempre) → Automático cuando Trabajo especial = Cambio enrollable'
    ]);
    const e = { ...d, id: 'e', name: 'Otro' };
    expect(scopeChangeSummary(con([d, e]), con([e, d]), 'ENROLLABLE')).toEqual(['Orden de los dibujos cambiado']);
  });

  it('cada valor de las fichas tiene su nombre en castellano', () => {
    const missing = [];
    for (const [section, values] of Object.entries(p)) {
      if (section === 'drawings') continue;
      for (const key of Object.keys(values)) if (!PARAMETER_LABELS[key]) missing.push(`${section}.${key}`);
    }
    expect(missing).toEqual([]);
  });
});
```

Crear `src/domain/parameterHistory.test.js`:

```js
import { describe, expect, it } from 'vitest';
import { scopeHistory, scopeVersions } from './parameterHistory.js';
import { normalizeRuleParameters, ruleParameterOverrides } from './ruleParameters.js';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const ov = (saved) => ruleParameterOverrides(normalizeRuleParameters(saved));
const dibujo = { id: 'general', name: 'General', enabled: true, image, conditions: [] };
// El historial de antes: un renglón por guardado, con todos los valores tras el cambio.
const antiguo = [
  { version: 1, updatedAt: '2026-09-25T08:00:00.000Z', updatedBy: 'IVÁN', reason: 'Cortina a 50', changedSections: ['cortina'], overrides: ov({ cortina: { fabricDropAllowanceCm: 50 } }) },
  { version: 2, updatedAt: '2026-09-26T08:00:00.000Z', updatedBy: 'ALBERTO', reason: 'Dibujo del enrollable y cortina a 55', changedSections: ['cortina', 'drawings'], overrides: ov({ cortina: { fabricDropAllowanceCm: 55 }, drawings: { byModel: { ENROLLABLE: [dibujo] } } }) }
];

describe('historial por modelo', () => {
  it('reparte el historial de antes por modelo según lo que cambió', () => {
    expect(scopeHistory(antiguo, 'CORTINA').map((e) => [e.versionAmbito, e.motivo, e.resumen])).toEqual([
      [2, 'Dibujo del enrollable y cortina a 55', ['Margen de caída: 50 → 55']],
      [1, 'Cortina a 50', ['Margen de caída: 45 → 50']]
    ]);
    expect(scopeHistory(antiguo, 'ENROLLABLE')).toEqual([expect.objectContaining({
      ambito: 'ENROLLABLE', versionAmbito: 1, version: 2, updatedBy: 'ALBERTO', resumen: ['Dibujo «General» añadido'], anterior: true
    })]);
    expect(scopeHistory(antiguo, 'ARZUA PRO')).toEqual([]);
  });

  it('la versión de cada modelo sale del historial de antes', () => {
    expect(scopeVersions(antiguo)).toEqual({
      CORTINA: { version: 2, updatedAt: '2026-09-26T08:00:00.000Z', updatedBy: 'ALBERTO', motivo: 'Dibujo del enrollable y cortina a 55' },
      ENROLLABLE: { version: 1, updatedAt: '2026-09-26T08:00:00.000Z', updatedBy: 'ALBERTO', motivo: 'Dibujo del enrollable y cortina a 55' }
    });
  });

  it('los renglones de ahora traen su modelo, versión y resumen, y se mezclan con los de antes', () => {
    const nuevo = {
      ambito: 'ENROLLABLE', versionAmbito: 2, version: 3, updatedAt: '2026-10-02T08:00:00.000Z', updatedBy: 'IVÁN', motivo: '',
      resumen: ['Dibujo «General» quitado'], reason: '', changedSections: ['drawings'], overrides: ov({ cortina: { fabricDropAllowanceCm: 55 } })
    };
    const lineas = [...antiguo, nuevo, null, 'roto'];
    expect(scopeHistory(lineas, 'ENROLLABLE').map((e) => e.versionAmbito)).toEqual([2, 1]);
    expect(scopeHistory(lineas, 'ENROLLABLE', 1)).toEqual([expect.objectContaining({ motivo: '', resumen: ['Dibujo «General» quitado'] })]);
    expect(scopeVersions(lineas).ENROLLABLE.version).toBe(2);
    expect(scopeHistory(lineas, 'CORTINA')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Comprobar que fallan**

Run: `pnpm exec vitest run src/domain/parameterScopes.test.js src/domain/parameterChanges.test.js src/domain/parameterHistory.test.js`
Expected: FAIL (los módulos no existen).

- [ ] **Step 3: Exportar la comparación de `ruleParameters.js`**

Al final de `src/domain/ruleParameters.js` añadir:

```js
// La misma comparación, para saber qué cambió de cada modelo (parameterScopes.js).
export { sameValue as sameParameterValue };
```

- [ ] **Step 4: Crear `src/domain/parameterScopes.js`**

```js
/**
 * Versiones por modelo de los parámetros de toldos (Iván, 02/10/2026). Un «ámbito» es un modelo de
 * Parámetros (su apartado, su margen de caída si es un trabajo de tela y sus dibujos) o lo común de
 * los trabajos de tela (lo que comparten Cambio de tela, Enrollable, Bambalina y Cambio Antica).
 * Cada ámbito se guarda con su versión e historial; los valores siguen en un solo RuleParameters.
 */
import { modelNames } from './modelBehavior.js';
import { normalizeModelName } from './modelNames.js';
import { normalizeRuleParameters, sameParameterValue } from './ruleParameters.js';

export const COMMON_FABRIC_SCOPE = 'TRABAJOS DE TELA';
export const fabricJobScopes = ['CAMBIO TELA', 'ENROLLABLE', 'BAMBALINA', 'CAMBIO ANTICA'];
export const parameterScopes = [...modelNames, COMMON_FABRIC_SCOPE];

const sectionByScope = {
  'ARZUA PRO': 'arzuaPro', GALICIA: 'galicia', 'PERLA BOX': 'perlaBox', 'CORAL BOX': 'coralBox', 'CUARZO BOX': 'cuarzoBox',
  CORTINA: 'cortina', SELENA: 'selena', 'CAMBIO CORTINA': 'cambioCortina', XACOBEO: 'xacobeo', 'PUNTO RECTO': 'puntoRecto',
  'MONOBLOCK 350': 'monoblock350', MAXISCREEM: 'maxiscreem', ELECTRA: 'electra', 'AMBAR BOX': 'ambarBox', 'AGATA BOX': 'agataBox'
};

export const isParameterScope = (scope) => parameterScopes.includes(scope);

/** Lo que enseña la ficha de un modelo: el modelo y, en los trabajos de tela, lo común. */
export function pageScopes(model) {
  const code = normalizeModelName(model);
  return fabricJobScopes.includes(code) ? [code, COMMON_FABRIC_SCOPE] : [code];
}

/** Lo que es de un ámbito: sus valores y sus dibujos. */
export function scopeParts(parameters, scope) {
  const p = parameters || normalizeRuleParameters();
  if (scope === COMMON_FABRIC_SCOPE) {
    const common = { ...p.fabricJobs };
    delete common.dropAllowanceByModel;
    return { values: common, drawings: [] };
  }
  const section = sectionByScope[scope];
  const values = section ? p[section] : fabricJobScopes.includes(scope) ? p.fabricJobs.dropAllowanceByModel[scope] : null;
  return { values: values ?? null, drawings: p.drawings.byModel[scope] ?? [] };
}

/** `target` con lo del ámbito `scope` tomado de `source` (sin sus dibujos si `includeDrawings` es false). */
export function applyScope(target, source, scope, { includeDrawings = true } = {}) {
  const next = { ...target };
  if (scope === COMMON_FABRIC_SCOPE) {
    next.fabricJobs = { ...source.fabricJobs, dropAllowanceByModel: target.fabricJobs.dropAllowanceByModel };
    return next;
  }
  const section = sectionByScope[scope];
  if (section) next[section] = source[section];
  else if (fabricJobScopes.includes(scope)) {
    next.fabricJobs = {
      ...target.fabricJobs,
      dropAllowanceByModel: { ...target.fabricJobs.dropAllowanceByModel, [scope]: source.fabricJobs.dropAllowanceByModel[scope] }
    };
  }
  if (includeDrawings) {
    const byModel = { ...target.drawings.byModel };
    const drawings = source.drawings.byModel[scope];
    if (drawings?.length) byModel[scope] = drawings;
    else delete byModel[scope];
    next.drawings = { byModel };
  }
  return next;
}

/** Los ámbitos que cambian entre dos juegos de parámetros (también dibujos de un modelo que ya no está). */
export function changedScopes(before, after) {
  const a = before || normalizeRuleParameters();
  const b = after || normalizeRuleParameters();
  const extra = [...Object.keys(a.drawings.byModel), ...Object.keys(b.drawings.byModel)].filter((scope) => !isParameterScope(scope));
  return [...parameterScopes, ...new Set(extra)].filter((scope) => !sameParameterValue(scopeParts(a, scope), scopeParts(b, scope)));
}

/** Las secciones del fichero donde vive un ámbito (para `changedSections`, que leía la web de antes). */
export function scopeSections(scope) {
  if (scope === COMMON_FABRIC_SCOPE || fabricJobScopes.includes(scope)) return ['fabricJobs', 'drawings'];
  return sectionByScope[scope] ? [sectionByScope[scope], 'drawings'] : ['drawings'];
}

/**
 * El borrador sobre unos valores guardados nuevos: lo que estaba pendiente de cada ámbito (frente a
 * lo guardado antes) se conserva; lo demás es lo guardado nuevo. Null si no queda nada pendiente.
 */
export function rebaseDraft(previousShared, nextShared, draft) {
  if (!draft) return null;
  const next = changedScopes(previousShared, draft).reduce((acc, scope) => applyScope(acc, draft, scope), nextShared);
  return changedScopes(nextShared, next).length ? next : null;
}
```

- [ ] **Step 5: Crear `src/domain/parameterChanges.js`**

```js
/**
 * Qué cambió de un modelo, en frases cortas (Iván, 02/10/2026: el motivo es opcional y el
 * historial cuenta solo lo que cambió). Los nombres son los que tienen los valores en su ficha.
 */
import { drawingConditionsText } from './drawingCatalog.js';
import { formatNumber } from './math.js';
import { fabricJobScopes, scopeParts } from './parameterScopes.js';
import { sameParameterValue } from './ruleParameters.js';

export const PARAMETER_LABELS = {
  standardMaxWidth: 'Frente máximo',
  motor70WidthFrom: 'Motor 70/17 desde',
  fabricDropAllowanceCm: 'Margen de caída',
  seamAllowanceCm: 'Costura entre paños',
  seamBaseCm: 'Margen base de paño',
  stockLengths: 'Largos de barra',
  privateTube: 'Tubo · particular',
  businessTube: 'Tubo · empresa u hostelería',
  widthDiscounts: 'Descuentos del tubo de carga',
  rollTubeDiscounts: 'Descuentos del tubo de enrollamiento',
  fabricWidthDiscounts: 'Descuentos de la tela',
  minimumLineByArm: 'Línea mínima por brazos',
  armSwitchWidth: '3 brazos desde',
  minimumLineByProjection: 'Línea mínima por salida',
  motorPowerByProjection: 'Motor por salida',
  profileDiscountCm: 'Descuentos del perfil',
  rollDiscountCm: 'Descuentos del enrollamiento',
  fabricWidthDiscountCm: 'Descuentos de la tela',
  protectorDiscountCm: 'Descuentos del protector',
  standardMaxDrop: 'Caída máxima estándar',
  bottomDeductionCm: 'Descuento inferior',
  loadProfileDiscounts: 'Descuentos del perfil de carga',
  maxWidthByProjection: 'Frente máximo por salida',
  loadBarDiscounts: 'Descuentos de la barra de carga',
  fabricDropMultiplier: 'Multiplicador de la salida',
  verticalFabricDropAllowanceCm: 'Margen bajada vertical',
  motorPowerByArm: 'Motor por brazos',
  valanceExtraCm: 'Remate de bambalina',
  squareBarStockLength: 'Stock barra 40×40',
  supportGapThresholdCm: 'Luz máxima entre apoyos',
  supportEdgeOffsetCm: 'Margen lateral soportes',
  curronStartWidthCm: 'Primer currón desde',
  curronSecondWidthCm: 'Segundo currón desde',
  discounts: 'Descuentos',
  dimensionalRules: 'Reglas de medidas',
  rollStockLengths: 'Largos del tubo de enrollamiento',
  profileStockLengths: 'Largos del perfil',
  guideDiscountCm: 'Ajuste guía',
  guideStockLengths: 'Largos de la guía',
  supportDiscounts: 'Descuentos por soporte',
  cofreDiscounts: 'Descuentos del cofre',
  profileDiscounts: 'Descuentos del perfil',
  motorPower: 'Motor',
  maxWidthByArms: 'Frente máximo por brazos',
  profileStockLength: 'Largo del perfil',
  supportBaseStartWidth: 'Inicio de soportes',
  supportBaseStepWidth: 'Paso entre soportes',
  anticaSeparateValanceAllowanceCm: 'Margen de la bamba separada de Antica',
  dropAllowanceByModel: 'Margen de caída'
};

function plain(value) {
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'string') return value || '—';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (Array.isArray(value) && value.every((item) => typeof item === 'number')) return value.map(formatNumber).join(', ');
  return null;
}

function valueLines(before, after) {
  if (sameParameterValue(before, after)) return [];
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') {
    return [`Margen de caída: ${plain(before) ?? '—'} → ${plain(after) ?? '—'}`];
  }
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys.filter((key) => !sameParameterValue(before[key], after[key])).map((key) => {
    const label = PARAMETER_LABELS[key] ?? key;
    const left = plain(before[key]);
    const right = plain(after[key]);
    return left !== null && right !== null ? `${label}: ${left} → ${right}` : `${label}: cambiados`;
  });
}

const usageText = (drawing) => (drawing.usage === 'manual'
  ? 'Solo a mano'
  : drawing.conditions.length ? `Automático cuando ${drawingConditionsText(drawing.conditions)}` : 'Automático (siempre)');

function drawingLines(before, after) {
  const lines = [];
  const previous = new Map(before.map((drawing) => [drawing.id, drawing]));
  for (const drawing of after) {
    const old = previous.get(drawing.id);
    previous.delete(drawing.id);
    if (!old) {
      lines.push(`Dibujo «${drawing.name}» añadido`);
      continue;
    }
    const parts = [];
    if (old.name !== drawing.name) parts.push(`nombre «${old.name}» → «${drawing.name}»`);
    if (old.image !== drawing.image) parts.push(!old.image ? 'imagen puesta' : drawing.image ? 'imagen cambiada' : 'imagen quitada');
    if (old.enabled !== drawing.enabled) parts.push(drawing.enabled ? 'activado' : 'desactivado');
    if (usageText(old) !== usageText(drawing)) parts.push(`${usageText(old)} → ${usageText(drawing)}`);
    if (parts.length) lines.push(`Dibujo «${drawing.name}»: ${parts.join('; ')}`);
  }
  for (const removed of previous.values()) lines.push(`Dibujo «${removed.name}» quitado`);
  if (!lines.length && !sameParameterValue(before.map((d) => d.id), after.map((d) => d.id))) lines.push('Orden de los dibujos cambiado');
  return lines;
}

/** Lo que cambió del ámbito `scope` entre `before` y `after` (RuleParameters normalizados). Vacío si nada. */
export function scopeChangeSummary(before, after, scope) {
  const a = scopeParts(before, scope);
  const b = scopeParts(after, scope);
  if (sameParameterValue(a, b)) return [];
  const lines = fabricJobScopes.includes(scope) && !sameParameterValue(a.values, b.values)
    ? [`Margen de caída: ${plain(a.values) ?? '—'} → ${plain(b.values) ?? '—'}`]
    : valueLines(a.values, b.values);
  lines.push(...drawingLines(a.drawings, b.drawings));
  return lines.length ? lines : ['Valores cambiados'];
}
```

- [ ] **Step 6: Crear `src/domain/parameterHistory.js`**

```js
/**
 * Historial de cada modelo (Iván, 02/10/2026: «versiones por modelo»). El fichero guarda un renglón
 * por guardado, siempre con todos los valores tras el cambio (`overrides`). Los de ahora traen su
 * modelo (`ambito`), su versión y su resumen; los de antes (una versión para todos) se reparten al
 * leerlos, comparando cada uno con el anterior: así no se pierde nada de lo ya guardado.
 */
import { scopeChangeSummary } from './parameterChanges.js';
import { changedScopes } from './parameterScopes.js';
import { normalizeRuleParameters } from './ruleParameters.js';

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value) => (typeof value === 'string' ? value : '');

function walk(lines) {
  const counters = {};
  const entries = [];
  let previous = normalizeRuleParameters();
  for (const line of lines) {
    if (!isObject(line) || !isObject(line.overrides)) continue;
    const current = normalizeRuleParameters(line.overrides);
    const common = { version: Number(line.version) || 0, updatedAt: text(line.updatedAt), updatedBy: text(line.updatedBy), overrides: line.overrides };
    if (typeof line.ambito === 'string' && line.ambito) {
      const scope = line.ambito;
      counters[scope] = Number.isInteger(line.versionAmbito) ? line.versionAmbito : (counters[scope] ?? 0) + 1;
      const resumen = Array.isArray(line.resumen) ? line.resumen.filter((item) => typeof item === 'string') : scopeChangeSummary(previous, current, scope);
      entries.push({ ambito: scope, versionAmbito: counters[scope], ...common, motivo: text(line.motivo), resumen });
    } else {
      for (const scope of changedScopes(previous, current)) {
        counters[scope] = (counters[scope] ?? 0) + 1;
        entries.push({ ambito: scope, versionAmbito: counters[scope], ...common, motivo: text(line.reason), resumen: scopeChangeSummary(previous, current, scope), anterior: true });
      }
    }
    previous = current;
  }
  return entries;
}

/** Las entradas del ámbito `scope`, de la más nueva a la más vieja (como mucho `limit`). */
export function scopeHistory(lines, scope, limit = Infinity) {
  return walk(lines).filter((entry) => entry.ambito === scope).reverse().slice(0, limit);
}

/** La versión de cada ámbito según el historial, con quién, cuándo y el motivo de la última. */
export function scopeVersions(lines) {
  const versions = {};
  for (const entry of walk(lines)) {
    versions[entry.ambito] = { version: entry.versionAmbito, updatedAt: entry.updatedAt, updatedBy: entry.updatedBy, motivo: entry.motivo };
  }
  return versions;
}
```

- [ ] **Step 7: Comprobar que pasan**

Run: `pnpm exec vitest run src/domain/parameterScopes.test.js src/domain/parameterChanges.test.js src/domain/parameterHistory.test.js src/ruleParametersStore.test.js`
Expected: PASS. Si la prueba de nombres lista una clave sin nombre, añadirla a `PARAMETER_LABELS` con la etiqueta que tiene en `ParametersView.tsx`.

- [ ] **Step 8: Batería y commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS.

```bash
git add src/domain/ruleParameters.js src/domain/parameterScopes.js src/domain/parameterScopes.test.js src/domain/parameterChanges.js src/domain/parameterChanges.test.js src/domain/parameterHistory.js src/domain/parameterHistory.test.js
git commit -m "feat(parametros): qué es de cada modelo, qué cambió y su historial

Iván (02/10/2026): cambiar el Enrollable creaba una versión que salía en
todos los modelos y pedía motivo. Para guardar por modelo hace falta saber
qué es de cada uno (su apartado, su margen de trabajo de tela, sus dibujos;
y aparte lo común de los trabajos de tela), describir lo que cambió en
castellano para no pedir motivo, y repartir por modelo el historial que ya
hay en el servidor sin perder nada.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Servidor: almacén por modelo con migración y rutas

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio (el código está completo; lo delicado es no perder nada del fichero de producción: las pruebas de lectura del formato de antes son las que mandan).

**Files:**
- Modify: `src/ruleParametersStore.js` (LF, se reescribe entero), `src/server.js` (LF)
- Test: `src/ruleParametersStore.test.js` (LF, se reescribe entero)

**Interfaces:**
- Consumes: tarea 2 (`applyScope`, `changedScopes`, `isParameterScope`, `scopeSections`, `scopeChangeSummary`, `scopeHistory`, `scopeVersions`); `changedRuleSections`, `normalizeRuleParameters`, `ruleParameterOverrides`; `writeFileAtomic` (`src/workflow.js`).
- Produces: `createRuleParametersStore({ file, historyFile, technicians })` → `{ get(), save(input), saveScope(input), history(limit = 20, { scope } = {}) }`.
  - `get()` → `{ version, updatedAt, updatedBy, reason, parameters, modelos: Record<ámbito, { version, updatedAt, updatedBy, motivo }> }` (+ `ilegible: true` si el fichero no se puede leer).
  - `saveScope({ scope, baseVersion, parameters, updatedBy, motivo? })` → lo de `get()`; errores `INVALID_INPUT`, `VERSION_CONFLICT` (con `current`), `UNREADABLE`.
  - `save({ baseVersion, parameters, updatedBy, reason? })` → igual; versión de todo el fichero (la ruta de antes).
  - `history(limit, { scope })` → con `scope`, `scopeHistory`; sin él, los renglones tal cual, del más nuevo al más viejo.
- Produces (rutas): `GET /api/rule-parameters` (añade `modelos`), `PUT /api/rule-parameters` (igual que antes, motivo opcional), `PUT /api/rule-parameters/models/:scope`, `GET /api/rule-parameters/history?limit=&scope=`. Errores: 409 `{ error, current }`, 400 `{ error }`, 503 `{ error }`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Sustituir `src/ruleParametersStore.test.js` entero por:

```js
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRuleParametersStore } from './ruleParametersStore.js';
import { normalizeRuleParameters, ruleParameterOverrides } from './domain/ruleParameters.js';

const technicians = ['IVÁN', 'ADRIÁN', 'ALBERTO'];
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
let dir;
let store;
const file = () => path.join(dir, 'rule-parameters.json');
const historyFile = () => path.join(dir, 'rule-parameters-history.jsonl');
const nuevo = () => createRuleParametersStore({ file: file(), historyFile: historyFile(), technicians });
const cortina = (cm) => normalizeRuleParameters({ cortina: { fabricDropAllowanceCm: cm } });
const galicia = (cm) => normalizeRuleParameters({ galicia: { fabricDropAllowanceCm: cm } });
const conDibujo = (p, model) => ({ ...p, drawings: { byModel: { ...p.drawings.byModel, [model]: [{ id: 'general', name: 'General', usage: 'manual', enabled: true, image, conditions: [] }] } } });
const lineas = async () => (await readFile(historyFile(), 'utf8')).split('\n').filter(Boolean).map((line) => JSON.parse(line));

beforeEach(async () => {
  await mkdir(path.join(process.cwd(), 'tmp'), { recursive: true });
  dir = await mkdtemp(path.join(process.cwd(), 'tmp', 'rule-parameters-'));
  store = nuevo();
});

// Lo que hay hoy en el servidor: fichero con una versión para todos y su historial.
async function sembrarFormatoDeAntes() {
  const ov1 = ruleParameterOverrides(cortina(50));
  const ov2 = ruleParameterOverrides(conDibujo(cortina(55), 'ENROLLABLE'));
  const fichero = `${JSON.stringify({ version: 2, updatedAt: '2026-09-26T08:00:00.000Z', updatedBy: 'ALBERTO', reason: 'Dibujo y cortina', overrides: ov2 }, null, 2)}\n`;
  const historial = [
    { version: 1, updatedAt: '2026-09-25T08:00:00.000Z', updatedBy: 'IVÁN', reason: 'Cortina a 50', changedSections: ['cortina'], overrides: ov1 },
    { version: 2, updatedAt: '2026-09-26T08:00:00.000Z', updatedBy: 'ALBERTO', reason: 'Dibujo y cortina', changedSections: ['cortina', 'drawings'], overrides: ov2 }
  ].map((line) => `${JSON.stringify(line)}\n`).join('');
  await writeFile(file(), fichero);
  await writeFile(historyFile(), historial);
  store = nuevo();
  return { fichero, historial };
}

describe('parámetros de toldos: una versión por modelo', () => {
  it('sin fichero son los del código, versión 0 y ningún modelo guardado', async () => {
    expect(await store.get()).toEqual({ version: 0, updatedAt: '', updatedBy: '', reason: '', parameters: normalizeRuleParameters(), modelos: {} });
  });

  it('guardar un modelo sube su versión y la de todo el fichero; la web de antes lo sigue leyendo', async () => {
    const saved = await store.saveScope({ scope: 'CORTINA', baseVersion: 0, parameters: cortina(50), updatedBy: 'iván' });
    expect(saved.version).toBe(1);
    expect(saved.modelos).toEqual({ CORTINA: { version: 1, updatedAt: expect.any(String), updatedBy: 'IVÁN', motivo: '' } });
    const onDisk = JSON.parse(await readFile(file(), 'utf8'));
    expect(onDisk).toMatchObject({ formato: 2, version: 1, updatedBy: 'IVÁN', reason: '' });
    expect(Object.keys(onDisk.overrides)).toEqual(['cortina']);
    const [linea] = await lineas();
    expect(linea).toMatchObject({ ambito: 'CORTINA', versionAmbito: 1, version: 1, updatedBy: 'IVÁN', motivo: '', resumen: ['Margen de caída: 45 → 50'], reason: '', changedSections: ['cortina'] });
    expect(linea.overrides.cortina.fabricDropAllowanceCm).toBe(50);
  });

  it('del borrador entra solo lo del modelo que se guarda', async () => {
    const borrador = conDibujo({ ...cortina(50), galicia: galicia(60).galicia }, 'ENROLLABLE');
    const saved = await store.saveScope({ scope: 'GALICIA', baseVersion: 0, parameters: borrador, updatedBy: 'IVÁN' });
    expect(saved.parameters.galicia.fabricDropAllowanceCm).toBe(60);
    expect(saved.parameters.cortina.fabricDropAllowanceCm).toBe(45);
    expect(saved.parameters.drawings.byModel).toEqual({});
  });

  it('409 solo si otro guardó ese mismo modelo; otro modelo entra sin chocar', async () => {
    await store.saveScope({ scope: 'CORTINA', baseVersion: 0, parameters: cortina(50), updatedBy: 'IVÁN' });
    const before = await readFile(file(), 'utf8');
    await expect(store.saveScope({ scope: 'CORTINA', baseVersion: 0, parameters: cortina(55), updatedBy: 'ADRIÁN' }))
      .rejects.toMatchObject({ code: 'VERSION_CONFLICT', current: { modelos: { CORTINA: { version: 1 } } } });
    expect(await readFile(file(), 'utf8')).toBe(before);
    const otro = await store.saveScope({ scope: 'GALICIA', baseVersion: 0, parameters: galicia(60), updatedBy: 'ADRIÁN' });
    expect(otro.parameters.cortina.fabricDropAllowanceCm).toBe(50);
    expect(otro.modelos.GALICIA.version).toBe(1);
  });

  it('dos puestos guardan a la vez: modelos distintos entran los dos; el mismo, solo uno', async () => {
    const distintos = await Promise.allSettled([
      store.saveScope({ scope: 'CORTINA', baseVersion: 0, parameters: cortina(50), updatedBy: 'IVÁN' }),
      store.saveScope({ scope: 'GALICIA', baseVersion: 0, parameters: galicia(60), updatedBy: 'ADRIÁN' })
    ]);
    expect(distintos.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled']);
    const now = await nuevo().get();
    expect(now.version).toBe(2);
    expect(now.parameters.cortina.fabricDropAllowanceCm).toBe(50);
    expect(now.parameters.galicia.fabricDropAllowanceCm).toBe(60);
    const mismo = await Promise.allSettled([
      store.saveScope({ scope: 'CORTINA', baseVersion: 1, parameters: cortina(51), updatedBy: 'IVÁN' }),
      store.saveScope({ scope: 'CORTINA', baseVersion: 1, parameters: cortina(52), updatedBy: 'ADRIÁN' })
    ]);
    expect(mismo.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
  });

  it('quién es obligatorio; el motivo, opcional; el modelo y su versión tienen que valer', async () => {
    await expect(store.saveScope({ scope: 'CORTINA', baseVersion: 0, parameters: cortina(50), updatedBy: 'NADIE' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(store.saveScope({ scope: 'TOLDO RARO', baseVersion: 0, parameters: cortina(50), updatedBy: 'IVÁN' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(store.saveScope({ scope: 'CORTINA', baseVersion: -1, parameters: cortina(50), updatedBy: 'IVÁN' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    const saved = await store.saveScope({ scope: 'CORTINA', baseVersion: 0, parameters: cortina(50), updatedBy: 'IVÁN', motivo: '  confirmado por OT ' });
    expect(saved.modelos.CORTINA.motivo).toBe('confirmado por OT');
  });

  it('guardar lo mismo no crea versión', async () => {
    await store.saveScope({ scope: 'CORTINA', baseVersion: 0, parameters: cortina(50), updatedBy: 'IVÁN' });
    const again = await store.saveScope({ scope: 'CORTINA', baseVersion: 1, parameters: cortina(50), updatedBy: 'IVÁN' });
    expect(again.version).toBe(1);
    expect(await lineas()).toHaveLength(1);
  });
});

describe('lo que ya está guardado en el servidor', () => {
  it('se lee tal cual, con la versión de cada modelo sacada de su historial, sin escribir nada', async () => {
    const { fichero, historial } = await sembrarFormatoDeAntes();
    const current = await store.get();
    expect(current.version).toBe(2);
    expect(current.parameters.cortina.fabricDropAllowanceCm).toBe(55);
    expect(current.modelos).toMatchObject({ CORTINA: { version: 2, updatedBy: 'ALBERTO' }, ENROLLABLE: { version: 1 } });
    expect((await store.history(20, { scope: 'CORTINA' })).map((e) => [e.versionAmbito, e.resumen])).toEqual([
      [2, ['Margen de caída: 50 → 55']], [1, ['Margen de caída: 45 → 50']]
    ]);
    expect(await store.history(20, { scope: 'ARZUA PRO' })).toEqual([]);
    expect(await readFile(file(), 'utf8')).toBe(fichero);
    expect(await readFile(historyFile(), 'utf8')).toBe(historial);
  });

  it('el primer guardado escribe el formato nuevo de una vez y no pierde nada de antes', async () => {
    const { historial } = await sembrarFormatoDeAntes();
    const current = await store.get();
    const saved = await store.saveScope({ scope: 'ENROLLABLE', baseVersion: 1, parameters: { ...current.parameters, drawings: { byModel: {} } }, updatedBy: 'IVÁN' });
    expect(saved.version).toBe(3);
    expect(saved.modelos).toMatchObject({ CORTINA: { version: 2, updatedBy: 'ALBERTO' }, ENROLLABLE: { version: 2, updatedBy: 'IVÁN' } });
    expect(saved.parameters.cortina.fabricDropAllowanceCm).toBe(55);
    const onDisk = JSON.parse(await readFile(file(), 'utf8'));
    expect(onDisk).toMatchObject({ formato: 2, version: 3, modelos: { CORTINA: { version: 2 }, ENROLLABLE: { version: 2 } } });
    expect((await readFile(historyFile(), 'utf8')).startsWith(historial)).toBe(true);
    expect((await store.history(20, { scope: 'ENROLLABLE' })).map((e) => [e.versionAmbito, e.resumen])).toEqual([
      [2, ['Dibujo «General» quitado']], [1, ['Dibujo «General» añadido']]
    ]);
    expect((await nuevo().get()).modelos.ENROLLABLE.version).toBe(2);
  });

  it('un fichero que no se puede leer no se sobrescribe', async () => {
    await writeFile(file(), '{roto');
    store = nuevo();
    expect(await store.get()).toMatchObject({ version: 0, ilegible: true });
    await expect(store.saveScope({ scope: 'CORTINA', baseVersion: 0, parameters: cortina(50), updatedBy: 'IVÁN' })).rejects.toMatchObject({ code: 'UNREADABLE' });
    expect(await readFile(file(), 'utf8')).toBe('{roto');
  });

  it('la ruta de antes (pestaña abierta con la web anterior): versión de todo y un renglón por modelo', async () => {
    const saved = await store.save({ baseVersion: 0, parameters: { ...cortina(50), galicia: galicia(60).galicia }, updatedBy: 'IVÁN', reason: 'Desde otra pestaña' });
    expect(saved.version).toBe(2);
    expect((await lineas()).map((l) => [l.ambito, l.motivo])).toEqual([['GALICIA', 'Desde otra pestaña'], ['CORTINA', 'Desde otra pestaña']]);
    await expect(store.save({ baseVersion: 0, parameters: cortina(55), updatedBy: 'IVÁN' })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  });

  it('el historial sin modelo es el de siempre, del más nuevo al más viejo', async () => {
    await sembrarFormatoDeAntes();
    const entries = await store.history(20);
    expect(entries.map((e) => e.version)).toEqual([2, 1]);
    expect(entries[0]).toMatchObject({ updatedBy: 'ALBERTO', reason: 'Dibujo y cortina', changedSections: ['cortina', 'drawings'] });
  });
});
```

- [ ] **Step 2: Comprobar que fallan**

Run: `pnpm exec vitest run src/ruleParametersStore.test.js`
Expected: FAIL (`saveScope` no existe; `modelos` no está en `get()`).

- [ ] **Step 3: Reescribir `src/ruleParametersStore.js`**

```js
/**
 * Parámetros de cálculo de toldos, comunes a todos los puestos (docs/superpowers/specs/2026-09-21-
 * parametros-comunes-design.md). Desde el 02/10/2026 cada modelo tiene su versión e historial
 * (docs/superpowers/specs/2026-10-02-dibujos-y-versiones-por-modelo-design.md): guardar un modelo no
 * choca con quien guarda otro; quién es obligatorio y el motivo, opcional; el historial dice solo qué
 * cambió.
 *
 * El fichero guarda solo lo que difiere del código (`overrides`, como siempre), la versión de todo el
 * fichero (sigue subiendo, para que la web de antes lo lea si hubiera que volver a ella) y la de cada
 * modelo (`modelos`). El de antes (sin `modelos`) se lee tal cual: la versión de cada modelo sale de su
 * historial, que se reparte por modelo al leerlo. Nada se reescribe al leer: el primer guardado escribe
 * ya el formato nuevo, de una vez (writeFileAtomic). Un fichero que no se puede leer no se sobrescribe.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { scopeChangeSummary } from './domain/parameterChanges.js';
import { scopeHistory, scopeVersions } from './domain/parameterHistory.js';
import { applyScope, changedScopes, isParameterScope, scopeSections } from './domain/parameterScopes.js';
import { changedRuleSections, normalizeRuleParameters, ruleParameterOverrides } from './domain/ruleParameters.js';
import { writeFileAtomic } from './workflow.js';

const FORMAT = 2;
const UNREADABLE_MESSAGE = 'Los parámetros guardados no se pueden leer: revisa el fichero antes de guardar.';
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value) => (typeof value === 'string' ? value : '');

function storeError(code, message, extra = {}) {
  return Object.assign(new Error(message), { code, ...extra });
}

function cleanVersions(input) {
  const versions = {};
  for (const [scope, value] of Object.entries(input)) {
    if (!isObject(value) || !Number.isInteger(value.version) || value.version < 0) continue;
    versions[scope] = { version: value.version, updatedAt: text(value.updatedAt), updatedBy: text(value.updatedBy), motivo: text(value.motivo) };
  }
  return versions;
}

const publicState = ({ version, updatedAt, updatedBy, reason, parameters, modelos }) => ({ version, updatedAt, updatedBy, reason, parameters, modelos });

export function createRuleParametersStore({ file, historyFile, technicians }) {
  let cached = null;
  let warned = false;
  // Una sola escritura a la vez: dos guardados del mismo modelo no se pisan; el segundo encuentra la
  // versión nueva y recibe el 409. Dos de modelos distintos entran uno tras otro.
  let queue = Promise.resolve();
  const inQueue = (task) => {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  };

  async function readLines() {
    let content = '';
    try {
      content = await fs.readFile(historyFile, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return content.split('\n').filter(Boolean).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null; // un renglón a medias no tapa el resto
      }
    });
  }

  async function readCurrent() {
    if (cached) return cached;
    let stored = null;
    try {
      stored = JSON.parse(await fs.readFile(file, 'utf8'));
      if (!isObject(stored)) throw new Error('no tiene la forma esperada');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        if (!warned) console.error(`No se pudieron leer los parámetros comunes (${file}):`, error.message);
        warned = true;
        // Se calcula con los del código, pero no se guarda en memoria: en cuanto se arregle el fichero, se lee.
        return { version: 0, updatedAt: '', updatedBy: '', reason: '', parameters: normalizeRuleParameters(), modelos: {}, unreadable: true };
      }
      stored = null;
    }
    const modelos = stored?.formato === FORMAT && isObject(stored.modelos)
      ? cleanVersions(stored.modelos)
      : scopeVersions(await readLines());
    cached = {
      version: Number(stored?.version) || 0,
      updatedAt: text(stored?.updatedAt),
      updatedBy: text(stored?.updatedBy),
      reason: text(stored?.reason),
      parameters: normalizeRuleParameters(stored?.overrides),
      modelos
    };
    return cached;
  }

  async function get() {
    const current = await readCurrent();
    return current.unreadable ? { ...publicState(current), ilegible: true } : publicState(current);
  }

  function author(updatedBy) {
    const by = String(updatedBy || '').trim().toUpperCase();
    if (!technicians.includes(by)) throw storeError('INVALID_INPUT', 'Elige quién hace el cambio («Soy»).');
    return by;
  }
  const reasonOf = (value) => (typeof value === 'string' ? value.trim() : '');

  /** Guarda lo del ámbito `scope` de `parameters` sobre lo vigente, con su versión siguiente y su renglón. */
  async function writeScope(current, { scope, parameters, by, why }) {
    const next = applyScope(current.parameters, normalizeRuleParameters(parameters), scope);
    if (!changedScopes(current.parameters, next).length) return current;
    const when = new Date().toISOString();
    const versionAmbito = (current.modelos[scope]?.version ?? 0) + 1;
    const version = current.version + 1;
    const modelos = { ...current.modelos, [scope]: { version: versionAmbito, updatedAt: when, updatedBy: by, motivo: why } };
    const overrides = ruleParameterOverrides(next);
    const changedSections = changedRuleSections(current.parameters, next).filter((section) => scopeSections(scope).includes(section));
    const resumen = scopeChangeSummary(current.parameters, next, scope);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await writeFileAtomic(file, `${JSON.stringify({ formato: FORMAT, version, updatedAt: when, updatedBy: by, reason: why, modelos, overrides }, null, 2)}\n`);
    await fs.mkdir(path.dirname(historyFile), { recursive: true });
    // `reason` y `changedSections` son los que leía el historial de la web de antes.
    await fs.appendFile(historyFile, `${JSON.stringify({ ambito: scope, versionAmbito, version, updatedAt: when, updatedBy: by, motivo: why, resumen, reason: why, changedSections, overrides })}\n`);
    cached = { version, updatedAt: when, updatedBy: by, reason: why, parameters: next, modelos };
    return cached;
  }

  async function saveScope({ scope, baseVersion, parameters, updatedBy, motivo } = {}) {
    const by = author(updatedBy);
    if (!isParameterScope(scope)) throw storeError('INVALID_INPUT', 'Ese modelo no tiene parámetros.');
    if (!Number.isInteger(baseVersion) || baseVersion < 0) throw storeError('INVALID_INPUT', 'Indica la versión del modelo que estás editando.');
    const current = await readCurrent();
    if (current.unreadable) throw storeError('UNREADABLE', UNREADABLE_MESSAGE);
    if ((current.modelos[scope]?.version ?? 0) !== baseVersion) {
      throw storeError('VERSION_CONFLICT', 'Otro puesto guardó este modelo antes.', { current: publicState(current) });
    }
    return publicState(await writeScope(current, { scope, parameters, by, why: reasonOf(motivo) }));
  }

  // La ruta de antes (una pestaña abierta con la web anterior): versión de todo el fichero y, si vale,
  // cada modelo cambiado se guarda con su renglón.
  async function saveAll({ baseVersion, parameters, updatedBy, reason } = {}) {
    const by = author(updatedBy);
    let current = await readCurrent();
    if (current.unreadable) throw storeError('UNREADABLE', UNREADABLE_MESSAGE);
    if (Number(baseVersion) !== current.version) {
      throw storeError('VERSION_CONFLICT', 'Otro puesto guardó cambios antes.', { current: publicState(current) });
    }
    const next = normalizeRuleParameters(parameters);
    for (const scope of changedScopes(current.parameters, next)) {
      current = await writeScope(current, { scope, parameters: next, by, why: reasonOf(reason) });
    }
    return publicState(current);
  }

  async function history(limit = 20, { scope = '' } = {}) {
    const lines = await readLines();
    if (scope) return scopeHistory(lines, scope, limit);
    return lines.filter(isObject).reverse().slice(0, limit);
  }

  return {
    get,
    save: (input) => inQueue(() => saveAll(input)),
    saveScope: (input) => inQueue(() => saveScope(input)),
    history
  };
}
```

- [ ] **Step 4: Comprobar que pasan**

Run: `pnpm exec vitest run src/ruleParametersStore.test.js`
Expected: PASS (13 pruebas).

- [ ] **Step 5: Las rutas en `src/server.js`**

Sustituir desde `app.put('/api/rule-parameters', async (req, res, next) => {` hasta el cierre `});` de `app.get('/api/rule-parameters/history', …)` por:

```js
// Errores del almacén de parámetros de toldos con su código HTTP.
function sendRuleParametersError(res, error, next) {
  if (error.code === 'VERSION_CONFLICT') {
    res.status(409).json({ error: error.message, current: error.current });
    return;
  }
  if (error.code === 'INVALID_INPUT') {
    res.status(400).json({ error: error.message });
    return;
  }
  if (error.code === 'UNREADABLE') {
    res.status(503).json({ error: error.message });
    return;
  }
  next(error);
}

// La de antes: guarda todos los modelos cambiados con la versión de todo el fichero (pestañas que
// sigan abiertas con la web anterior). La web de ahora guarda cada modelo con la de abajo.
app.put('/api/rule-parameters', async (req, res, next) => {
  try {
    res.json(await ruleParametersStore.save(req.body || {}));
  } catch (error) {
    sendRuleParametersError(res, error, next);
  }
});

// Un modelo (o lo común de los trabajos de tela) con su versión: 409 solo si otro guardó ese mismo.
app.put('/api/rule-parameters/models/:scope', async (req, res, next) => {
  try {
    res.json(await ruleParametersStore.saveScope({ ...(req.body || {}), scope: req.params.scope }));
  } catch (error) {
    sendRuleParametersError(res, error, next);
  }
});

// Con `scope`, el historial de ese modelo (también lo de antes, repartido); sin él, todo como antes.
app.get('/api/rule-parameters/history', async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const scope = typeof req.query.scope === 'string' ? req.query.scope : '';
    res.json({ entries: await ruleParametersStore.history(limit, { scope }) });
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 6: Comprobar en la aislada**

Run: `ISOLATED_DIR="$PWD/tmp/dibujos" PORT=4315 FAKE_COORDINA_PORT=4325 bash .claude/skills/running-toldos-testar/start-isolated.sh` (en segundo plano) y, cuando `/api/health` responda con `simulationMode: true` y `fileWritesEnabled: false`:

```bash
curl -s http://127.0.0.1:4315/api/rule-parameters | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.version, JSON.stringify(j.modelos))})"
curl -s -X PUT http://127.0.0.1:4315/api/rule-parameters/models/CORTINA -H 'Content-Type: application/json' -d '{"baseVersion":0,"updatedBy":"IVÁN","parameters":{"cortina":{"fabricDropAllowanceCm":46}}}' | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.version, JSON.stringify(j.modelos.CORTINA))})"
curl -s "http://127.0.0.1:4315/api/rule-parameters/history?scope=CORTINA" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.stringify(JSON.parse(s).entries[0].resumen)))"
```

Expected: `0 {}` (la primera vez), luego `1 {"version":1,…,"updatedBy":"IVÁN","motivo":""}` y `["Margen de caída: 45 → 46"]`. (Si la aislada ya tenía datos, los números son otros: lo que importa es que la versión de CORTINA sube en 1 y el resumen sale.) Parar la aislada.

- [ ] **Step 7: Batería y commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS.

```bash
git add src/ruleParametersStore.js src/ruleParametersStore.test.js src/server.js
git commit -m "feat(parametros): cada modelo de toldos se guarda con su versión e historial

Iván (02/10/2026): si Alberto cambia el Enrollable, esa versión no puede
salir en Arzúa Pro ni hacer chocar a quien guarda otro modelo, y el motivo
pasa a ser opcional. El fichero de producción se lee tal cual: la versión
de cada modelo y su historial salen del historial de antes, repartido al
leerlo, y nada se reescribe hasta el primer guardado, que escribe el
formato nuevo de una vez y sigue llevando la versión de todo y los campos
de antes por si hubiera que volver a la web anterior. Un fichero ilegible
ya no se pisa al guardar. La ruta de antes se queda para pestañas abiertas.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Servidor: miniaturas con el código del PDF

Modelo recomendado: intermedio (Sonnet). Esfuerzo: bajo (el código está completo; si algún modelo no dibuja con el toldo de ejemplo, se arregla el ejemplo, no el dibujo).

**Files:**
- Modify: `src/domain/planteamientoPdf.js` (CRLF), `src/server.js` (LF)
- Test: `src/domain/drawingPreview.test.js`

**Interfaces:**
- Consumes: `exampleAwning`, `webDrawingVariants` (tarea 1); `normalizeOrder` (`validation.js`); dentro de `planteamientoPdf.js`: `getFabricPatternDiagram`, `drawGeneralDiagram`, `drawAwningDiagram`, `drawCell`, `fabricDiagramHeading`, `registerFonts`, `colors`.
- Produces: `PREVIEW_CALCULATION = { fabricWidth: 400, fabricDrop: 275 }`; `buildFabricDiagramPreviewPdf({ awning, calculation = PREVIEW_CALCULATION }): Promise<Buffer>` (una hoja de 258 × 343 pt, sin la imagen del toldo); función interna `drawFabricDiagram(doc, x, y, w, h, diagram, awning, calculation)` que usan la hoja de tela y la miniatura. Ruta `GET /api/rule-parameters/drawing-preview?model=&variant=` → `application/pdf` (404 si la variante no existe o no tiene dibujo de la web).

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/domain/drawingPreview.test.js`:

```js
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exampleAwning, webDrawingVariants } from './drawingCatalog.js';
import { modelNames } from './modelBehavior.js';
import { buildFabricDiagramPreviewPdf } from './planteamientoPdf.js';
import { normalizeOrder } from './validation.js';

const ejemplo = (variant) => normalizeOrder({ orderCode: 'EJEMPLO', awnings: [exampleAwning(variant)] }).awnings[0];
const paginas = (pdf) => (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;

describe('miniaturas de «Lo que sale hoy»', () => {
  it('cada variante con dibujo de la web de cada modelo sale en una hoja', async () => {
    for (const model of modelNames) {
      for (const variant of webDrawingVariants(model).filter((v) => v.webDrawing)) {
        const pdf = await buildFabricDiagramPreviewPdf({ awning: ejemplo(variant) });
        expect(pdf.subarray(0, 5).toString(), `${model} · ${variant.id}`).toBe('%PDF-');
        expect(paginas(pdf), `${model} · ${variant.id}`).toBe(1);
      }
    }
  }, 60000);

  it('es el dibujo de la web: no usa la imagen puesta en el toldo', async () => {
    const image = 'data:image/png;base64,' + readFileSync(new URL('./assets/tgm-logo.png', import.meta.url)).toString('base64');
    const awning = ejemplo(webDrawingVariants('ENROLLABLE')[0]);
    const pdf = await buildFabricDiagramPreviewPdf({ awning: { ...awning, fabricImage: image } });
    expect(pdf.toString('latin1')).not.toContain('/Subtype /Image');
  });
});
```

- [ ] **Step 2: Comprobar que falla**

Run: `pnpm exec vitest run src/domain/drawingPreview.test.js`
Expected: FAIL (`buildFabricDiagramPreviewPdf` no existe).

- [ ] **Step 3: Sacar el dibujo de la hoja de tela a una función y añadir la miniatura**

En `src/domain/planteamientoPdf.js`, dentro de `drawExcelFabricBody`, sustituir:

```js
  if (diagram === 'GENERAL' && !diagramAwning?.fabricImage) {
    drawGeneralDiagram(doc, diagramX, 149, diagramW, 300, { title: '', legacy: true }, diagramAwning);
  } else {
    drawAwningDiagram(doc, diagramX, 149, diagramW, 300, diagram, diagramAwning, diagramCalculation);
  }
```

por:

```js
  drawFabricDiagram(doc, diagramX, 149, diagramW, 300, diagram, diagramAwning, diagramCalculation);
```

Y justo encima de `function drawAwningDiagram(` añadir:

```js
// El dibujo de la hoja de tela: el general de siempre (sin imagen) o el de su tipo. Lo usan la hoja
// del planteamiento y las miniaturas de Parámetros («Lo que sale hoy»): se ve lo mismo en los dos.
function drawFabricDiagram(doc, x, y, w, h, diagram, awning, calculation) {
  if (diagram === 'GENERAL' && !awning?.fabricImage) return drawGeneralDiagram(doc, x, y, w, h, { title: '', legacy: true }, awning);
  return drawAwningDiagram(doc, x, y, w, h, diagram, awning, calculation);
}

/** Medidas del toldo de ejemplo de las miniaturas (frente de tela y caída, en cm). */
export const PREVIEW_CALCULATION = Object.freeze({ fabricWidth: 400, fabricDrop: 275 });

/**
 * Una hoja pequeña con el título y el dibujo de la web de un toldo de ejemplo, como en la hoja de
 * tela. Sin la imagen del toldo ni dibujos del taller: es lo que sale «de la web».
 */
export async function buildFabricDiagramPreviewPdf({ awning, calculation = PREVIEW_CALCULATION }) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ autoFirstPage: false, margin: 0, info: { Title: 'Dibujo de la web', Creator: 'toldos-testar' } });
    registerFonts(doc);
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const web = { ...awning, fabricImage: null };
    const diagram = getFabricPatternDiagram(web);
    const width = 242;
    doc.addPage({ size: [width + 16, 343], margin: 0 });
    doc.rect(0, 0, doc.page.width, doc.page.height).fill(colors.paper);
    drawCell(doc, 8, 8, width, 21, fabricDiagramHeading(diagram, [web]), {
      bold: true, size: 12, minSize: 9, fit: true, align: 'center', fill: colors.paper
    });
    drawFabricDiagram(doc, 8, 35, width, 300, diagram, web, calculation);
    doc.end();
  });
}
```

- [ ] **Step 4: La ruta en `src/server.js`**

Cambiar el import de `planteamientoPdf.js` por:

```js
import { buildFabricDiagramPreviewPdf, buildOrderPlanteamientoPdf } from './domain/planteamientoPdf.js';
```

Añadir junto a los otros imports de `./domain/`:

```js
import { exampleAwning, webDrawingVariants } from './domain/drawingCatalog.js';
```

Y después de la ruta `app.get('/api/rule-parameters/history', …)`:

```js
// Miniatura de «Lo que sale hoy» (Parámetros › Dibujos): el dibujo de la web de una variante con su
// toldo de ejemplo, hecho por el mismo código que la hoja de tela del PDF.
app.get('/api/rule-parameters/drawing-preview', async (req, res, next) => {
  try {
    const model = typeof req.query.model === 'string' ? req.query.model : '';
    const id = typeof req.query.variant === 'string' ? req.query.variant : '';
    const variant = webDrawingVariants(model).find((item) => item.id === id && item.webDrawing);
    if (!variant) {
      res.status(404).json({ error: 'Ese dibujo no existe.' });
      return;
    }
    const [awning] = normalizeOrder({ orderCode: 'EJEMPLO', awnings: [exampleAwning(variant)] }).awnings;
    const pdf = await buildFabricDiagramPreviewPdf({ awning });
    res.status(200).setHeader('Cache-Control', 'no-cache').setHeader('Content-Type', 'application/pdf').send(pdf);
  } catch (error) {
    next(error);
  }
});
```

- [ ] **Step 5: Comprobar que pasan**

Run: `pnpm exec vitest run src/domain/drawingPreview.test.js src/domain`
Expected: PASS (también las pruebas de PDF que ya había: la hoja de tela dibuja igual). Si una variante falla al dibujar, completar su toldo de ejemplo en `webDrawingVariants`/`exampleAwning` con el campo que pida el dibujo (p. ej. un submodelo), sin tocar las funciones de dibujo.

- [ ] **Step 6: Comprobar la ruta en la aislada**

Con la aislada de 4315 arrancada (paso 6 de la tarea 3):

```bash
curl -s -o tmp/dibujos/cortina-velcro.pdf -w "%{http_code} %{content_type}\n" "http://127.0.0.1:4315/api/rule-parameters/drawing-preview?model=CORTINA&variant=con-ventana-velcro"
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:4315/api/rule-parameters/drawing-preview?model=HERA&variant=hera"
```

Expected: `200 application/pdf` y `404`. Abrir `tmp/dibujos/cortina-velcro.pdf` y comprobar que es el dibujo de cortina con ventana y velcro de la hoja de tela.

- [ ] **Step 7: Batería y commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: PASS.

```bash
git add src/domain/planteamientoPdf.js src/domain/drawingPreview.test.js src/server.js
git commit -m "feat(dibujos): miniatura del dibujo de la web hecha por el código del PDF

Para «Lo que sale hoy» de Parámetros, cada variante de cada modelo tiene
que verse tal como sale en la hoja de tela. El dibujo de esa hoja pasa a
una función que usan el planteamiento y una hoja pequeña nueva con un toldo
de ejemplo, servida por GET /api/rule-parameters/drawing-preview. Una
prueba la pide para todas las variantes de todos los modelos.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Web: estado compartido, barra e historial por modelo

Modelo recomendado: el más capaz (Opus). Esfuerzo: alto (el código está completo, pero cambia por dentro el hook que usan todos los pedidos; hay que comprobar en la aislada que calcular, corregir una revisión y guardar parámetros siguen igual).

**Files:**
- Create: `src/client/parametrosToldos.ts`, `src/client/components/ModelSaveBar.tsx`
- Modify: `src/client/hooks/useParameters.ts` (CRLF), `src/client/components/ParametersHistory.tsx` (CRLF, se reescribe entero), `src/client/views/ParametersView.tsx` (LF), `src/client/coordina/parametros.css` (CRLF)
- Test: `src/client/parametrosToldos.test.ts`, `src/client/components/ModelSaveBar.test.tsx`

**Interfaces:**
- Consumes: tarea 2 (`applyScope`, `changedScopes`, `rebaseDraft`, `pageScopes`, `COMMON_FABRIC_SCOPE`), tarea 3 (rutas); `readCurrentUser` (`src/client/currentUser.ts`); `parameterModelName` (`ParameterSheet.tsx`); `TextField`.
- Produces (`parametrosToldos.ts`): `RUTA_PARAMETROS = '/api/rule-parameters'`; tipos `SaveDraftResult`, `VersionModelo`, `ParametrosGuardados`, `EstadoParametros = { shared: ParametrosGuardados; draft: RuleParameters | null; order: { parameters; version: number | null } | null; saving: boolean; modeloVisible: string }`; `leerParametros()`, `suscribirParametros(oyente)`, `reiniciarParametros()`, `guardadosDesde(datos)`, `ponerGuardados(siguientes)`, `refrescarParametros()`, `editarParametros(cambio)`, `descartarBorrador()`, `ponerPedido(order)`, `elegirModeloVisible(modelo)`, `ambitosPendientes(estado?)`, `descartarAmbitos(ambitos)`, `restaurarAmbitos(ambitos)`, `cargarVersionModelo(ambito, overrides)`, `guardarAmbito(ambito, updatedBy, motivo): Promise<SaveDraftResult>`, `guardarAmbitos(ambitos, updatedBy, motivo)`.
- Produces (`useParameters.ts`): `useEstadoParametros(): EstadoParametros`; `useParameters()` devuelve lo mismo que antes (mismos nombres), con `dirty: false`; `export type { SaveDraftResult }`.
- Produces (`ModelSaveBar.tsx`): `nombreAmbito(ambito): string`; `ModelSaveBar({ ambitos, estado })`.
- Produces (`ParametersHistory.tsx`): `ParametersHistory({ version?, onLoadVersion?, endpoint?, labels? })`; sin `endpoint`, el historial del modelo elegido.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/client/parametrosToldos.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { normalizeRuleParameters } from '../domain/ruleParameters.js';
import { COMMON_FABRIC_SCOPE } from '../domain/parameterScopes.js';
import {
  ambitosPendientes, cargarVersionModelo, descartarAmbitos, editarParametros, guardarAmbito, guardarAmbitos,
  leerParametros, ponerGuardados, reiniciarParametros, restaurarAmbitos
} from './parametrosToldos';
import type { RuleParameters } from './types';

const base = () => normalizeRuleParameters() as RuleParameters;
const respuesta = (datos: unknown, status = 200) => ({ ok: status < 400, status, json: async () => datos });
const conCortina = (p: RuleParameters, cm: number) => ({ ...p, cortina: { ...p.cortina, fabricDropAllowanceCm: cm } });
const conGalicia = (p: RuleParameters, cm: number) => ({ ...p, galicia: { ...p.galicia, fabricDropAllowanceCm: cm } });

beforeEach(() => {
  reiniciarParametros();
  ponerGuardados({ version: 4, parameters: base(), modelos: { CORTINA: { version: 2, updatedAt: '', updatedBy: 'IVÁN', motivo: '' } } });
});
afterEach(() => vi.unstubAllGlobals());

describe('parámetros de toldos en la web, por modelo', () => {
  it('cada cambio queda pendiente en su modelo; volver a lo guardado lo quita', () => {
    editarParametros((p) => conCortina(p, 50));
    editarParametros((p) => conGalicia(p, 60));
    expect(ambitosPendientes()).toEqual(['GALICIA', 'CORTINA']);
    editarParametros((p) => conCortina(p, 45));
    expect(ambitosPendientes()).toEqual(['GALICIA']);
  });

  it('guardar un modelo manda su versión y deja pendiente lo de los demás', async () => {
    editarParametros((p) => conGalicia(conCortina(p, 50), 60));
    const enviado = leerParametros().draft;
    const fetchMock = vi.fn().mockResolvedValue(respuesta({ version: 5, parameters: conCortina(base(), 50), modelos: { CORTINA: { version: 3, updatedAt: 'x', updatedBy: 'IVÁN', motivo: '' } } }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await guardarAmbito('CORTINA', 'IVÁN', '')).toEqual({ status: 'saved' });
    const [ruta, init] = fetchMock.mock.calls[0];
    expect(ruta).toBe('/api/rule-parameters/models/CORTINA');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body)).toEqual({ baseVersion: 2, parameters: JSON.parse(JSON.stringify(enviado)), updatedBy: 'IVÁN', motivo: '' });
    expect(leerParametros().shared.modelos.CORTINA.version).toBe(3);
    expect(ambitosPendientes()).toEqual(['GALICIA']);
    expect(leerParametros().draft?.galicia.fabricDropAllowanceCm).toBe(60);
    expect(leerParametros().saving).toBe(false);
  });

  it('si otro puesto guardó ese modelo: se cargan sus valores y el borrador se queda', async () => {
    editarParametros((p) => conCortina(p, 50));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta({
      error: 'Otro puesto guardó este modelo antes.', current: { version: 5, parameters: conCortina(base(), 55), modelos: { CORTINA: { version: 3 } } }
    }, 409)));
    expect(await guardarAmbito('CORTINA', 'IVÁN', '')).toEqual({ status: 'conflict', message: 'Otro puesto guardó este modelo antes.' });
    expect(leerParametros().shared.parameters.cortina.fabricDropAllowanceCm).toBe(55);
    expect(leerParametros().shared.modelos.CORTINA.version).toBe(3);
    expect(leerParametros().draft?.cortina.fabricDropAllowanceCm).toBe(50);
  });

  it('sin conexión: error y el borrador intacto', async () => {
    editarParametros((p) => conCortina(p, 50));
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    expect(await guardarAmbito('CORTINA', 'IVÁN', '')).toEqual({ status: 'error', message: 'No se pudo contactar con el servidor.' });
    expect(ambitosPendientes()).toEqual(['CORTINA']);
  });

  it('guardar varios: uno tras otro, cada uno con su versión', async () => {
    editarParametros((p) => conGalicia(conCortina(p, 50), 60));
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(respuesta({ version: 5, parameters: conGalicia(base(), 60), modelos: { CORTINA: { version: 2 }, GALICIA: { version: 1 } } }))
      .mockResolvedValueOnce(respuesta({ version: 6, parameters: conGalicia(conCortina(base(), 50), 60), modelos: { CORTINA: { version: 3 }, GALICIA: { version: 1 } } }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await guardarAmbitos(['GALICIA', 'CORTINA'], 'IVÁN', 'Prueba')).toEqual({ status: 'saved' });
    expect(fetchMock.mock.calls.map(([ruta]) => ruta)).toEqual(['/api/rule-parameters/models/GALICIA', '/api/rule-parameters/models/CORTINA']);
    expect(leerParametros().draft).toBeNull();
  });

  it('restaurar, descartar y cargar una versión tocan solo los modelos indicados', () => {
    editarParametros((p) => ({
      ...p,
      fabricJobs: { ...p.fabricJobs, valanceExtraCm: 8, dropAllowanceByModel: { ...p.fabricJobs.dropAllowanceByModel, ENROLLABLE: 30, BAMBALINA: 3 } },
      drawings: { byModel: { ENROLLABLE: [{ id: 'g', name: 'G', usage: 'manual', enabled: true, image: null, conditions: [] }] } }
    }));
    restaurarAmbitos(['ENROLLABLE', COMMON_FABRIC_SCOPE]);
    const draft = leerParametros().draft!;
    expect(draft.fabricJobs.valanceExtraCm).toBe(5);
    expect(draft.fabricJobs.dropAllowanceByModel.ENROLLABLE).toBe(25);
    expect(draft.fabricJobs.dropAllowanceByModel.BAMBALINA).toBe(3);
    expect(draft.drawings.byModel.ENROLLABLE).toHaveLength(1);
    descartarAmbitos(['ENROLLABLE', 'BAMBALINA']);
    expect(leerParametros().draft).toBeNull();
    cargarVersionModelo('GALICIA', { galicia: { fabricDropAllowanceCm: 70 }, cortina: { fabricDropAllowanceCm: 99 } });
    expect(ambitosPendientes()).toEqual(['GALICIA']);
  });
});
```

Crear `src/client/components/ModelSaveBar.test.tsx`:

```tsx
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { normalizeRuleParameters } from '../../domain/ruleParameters.js';
import { COMMON_FABRIC_SCOPE } from '../../domain/parameterScopes.js';
import type { EstadoParametros } from '../parametrosToldos';
import type { RuleParameters } from '../types';
import { ModelSaveBar, nombreAmbito } from './ModelSaveBar';

const guardados = normalizeRuleParameters() as RuleParameters;
const estado = (draft: RuleParameters | null): EstadoParametros => ({
  shared: { version: 3, parameters: guardados, modelos: { ENROLLABLE: { version: 2, updatedAt: '', updatedBy: 'IVÁN', motivo: '' } } },
  draft, order: null, saving: false, modeloVisible: 'ENROLLABLE'
});
const ambitos = ['ENROLLABLE', COMMON_FABRIC_SCOPE];

describe('barra de cada modelo', () => {
  it('nombres de los modelos y de lo común', () => {
    expect(nombreAmbito('ENROLLABLE')).toBe('Enrollable');
    expect(nombreAmbito(COMMON_FABRIC_SCOPE)).toBe('Trabajos de tela (comunes)');
  });

  it('sin cambios: guardado, con su versión', () => {
    const html = renderToStaticMarkup(<ModelSaveBar ambitos={ambitos} estado={estado(null)} />);
    expect(html).toContain('Modelo guardado');
    expect(html).toContain('Versión 2');
  });

  it('con cambios aquí y en otro modelo: dice cuáles, y sin «Soy» no deja guardar', () => {
    const draft = { ...guardados, fabricJobs: { ...guardados.fabricJobs, valanceExtraCm: 8 }, galicia: { ...guardados.galicia, fabricDropAllowanceCm: 60 } } as RuleParameters;
    const html = renderToStaticMarkup(<ModelSaveBar ambitos={ambitos} estado={estado(draft)} />);
    expect(html).toContain('Cambios sin guardar en Trabajos de tela (comunes)');
    expect(html).toContain('También sin guardar: Galicia');
    expect(html).toContain('Elige «Soy» arriba para guardar.');
  });
});
```

- [ ] **Step 2: Comprobar que fallan**

Run: `pnpm exec vitest run src/client/parametrosToldos.test.ts src/client/components/ModelSaveBar.test.tsx`
Expected: FAIL (los módulos no existen).

- [ ] **Step 3: Crear `src/client/parametrosToldos.ts`**

```ts
import type { RuleParameters } from './types';
import { changedRuleSections, normalizeRuleParameters } from '../domain/ruleParameters.js';
import { applyScope, changedScopes, rebaseDraft } from '../domain/parameterScopes.js';

/**
 * Parámetros de toldos en la web (Iván, 02/10/2026: «versiones por modelo»). Un solo estado para toda
 * la página, fuera de React, para que App (que calcula los pedidos con ellos), la ficha de cada modelo
 * con su barra de guardar y el historial de arriba vean lo mismo sin pasarse nada:
 *  - shared: lo guardado en el servidor, con la versión de todo y la de cada modelo;
 *  - draft: lo que se edita en Parámetros, solo en este puesto hasta guardar cada modelo;
 *  - order: los de una revisión abierta para corregirla (los pedidos nunca usan un borrador).
 * Guardar un modelo manda solo lo suyo con su versión; lo pendiente de los demás se queda.
 */
export const RUTA_PARAMETROS = '/api/rule-parameters';
export type SaveDraftResult = { status: 'saved' | 'conflict' | 'error'; message?: string };
export type VersionModelo = { version: number; updatedAt: string; updatedBy: string; motivo: string };
export type ParametrosGuardados = { version: number; parameters: RuleParameters; modelos: Record<string, VersionModelo> };
export type EstadoParametros = {
  shared: ParametrosGuardados;
  draft: RuleParameters | null;
  order: { parameters: RuleParameters; version: number | null } | null;
  saving: boolean;
  /** El modelo que se ve en Parámetros: el historial de arriba enseña el suyo. */
  modeloVisible: string;
};

const normalize = (saved?: unknown) => normalizeRuleParameters(saved) as RuleParameters;
const texto = (value: unknown) => (typeof value === 'string' ? value : '');
const inicial = (): EstadoParametros => ({
  shared: { version: 0, parameters: normalize(), modelos: {} }, draft: null, order: null, saving: false, modeloVisible: 'ARZUA PRO'
});

let estado = inicial();
const oyentes = new Set<() => void>();
function poner(cambio: (actual: EstadoParametros) => EstadoParametros) {
  estado = cambio(estado);
  for (const oyente of oyentes) oyente();
}

export const leerParametros = () => estado;
export function suscribirParametros(oyente: () => void) {
  oyentes.add(oyente);
  return () => { oyentes.delete(oyente); };
}
/** Solo para las pruebas: vuelve al estado de partida. */
export function reiniciarParametros() { poner(inicial); }

/** Lo que responde el servidor (GET, PUT o el `current` de un 409), normalizado. */
export function guardadosDesde(datos: unknown): ParametrosGuardados {
  const d = (datos ?? {}) as { version?: unknown; parameters?: unknown; modelos?: unknown };
  const modelos: Record<string, VersionModelo> = {};
  if (d.modelos && typeof d.modelos === 'object') {
    for (const [ambito, valor] of Object.entries(d.modelos as Record<string, Record<string, unknown> | null>)) {
      const version = Number(valor?.version);
      if (Number.isInteger(version) && version >= 0) {
        modelos[ambito] = { version, updatedAt: texto(valor?.updatedAt), updatedBy: texto(valor?.updatedBy), motivo: texto(valor?.motivo) };
      }
    }
  }
  return { version: Number(d.version) || 0, parameters: normalize(d.parameters), modelos };
}

/** Pone lo guardado en el servidor. Lo pendiente del borrador se conserva sobre ello. */
export function ponerGuardados(siguientes: ParametrosGuardados) {
  poner((e) => ({ ...e, shared: siguientes, draft: rebaseDraft(e.shared.parameters, siguientes.parameters, e.draft) as RuleParameters | null }));
}

export async function refrescarParametros() {
  try {
    const response = await fetch(RUTA_PARAMETROS, { cache: 'no-store' });
    if (!response.ok) return;
    ponerGuardados(guardadosDesde(await response.json()));
  } catch {
    // Sin conexión con el servidor: se siguen usando los últimos conocidos.
  }
}

/** Cada edición de Parámetros va al borrador; si deja todo como lo guardado, el borrador desaparece. */
export function editarParametros(cambio: (actual: RuleParameters) => RuleParameters) {
  poner((e) => {
    const next = cambio(e.draft ?? e.shared.parameters);
    return { ...e, draft: changedRuleSections(e.shared.parameters, next).length ? next : null };
  });
}
export function descartarBorrador() { poner((e) => ({ ...e, draft: null })); }
export function ponerPedido(order: EstadoParametros['order']) { poner((e) => ({ ...e, order })); }
export function elegirModeloVisible(modelo: string) {
  poner((e) => (e.modeloVisible === modelo ? e : { ...e, modeloVisible: modelo }));
}

/** Los modelos (ámbitos) con cambios sin guardar, en el orden de la lista de modelos. */
export function ambitosPendientes(e: EstadoParametros = estado): string[] {
  return e.draft ? changedScopes(e.shared.parameters, e.draft) as string[] : [];
}
export function descartarAmbitos(ambitos: readonly string[]) {
  editarParametros((actual) => ambitos.reduce((acc, ambito) => applyScope(acc, estado.shared.parameters, ambito) as RuleParameters, actual));
}
/** «Restaurar valores por defecto»: los valores del código en esos ámbitos, sin tocar sus dibujos. */
export function restaurarAmbitos(ambitos: readonly string[]) {
  const codigo = normalize();
  editarParametros((actual) => ambitos.reduce((acc, ambito) => applyScope(acc, codigo, ambito, { includeDrawings: false }) as RuleParameters, actual));
}
/** «Cargar esta versión» del historial de un modelo: lo suyo pasa al borrador; volver atrás es guardar. */
export function cargarVersionModelo(ambito: string, overrides: unknown) {
  editarParametros((actual) => applyScope(actual, normalize(overrides), ambito) as RuleParameters);
}

export async function guardarAmbito(ambito: string, updatedBy: string, motivo: string): Promise<SaveDraftResult> {
  const antes = estado;
  if (!antes.draft || !ambitosPendientes(antes).includes(ambito)) return { status: 'saved' };
  poner((e) => ({ ...e, saving: true }));
  try {
    const response = await fetch(`${RUTA_PARAMETROS}/models/${encodeURIComponent(ambito)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseVersion: antes.shared.modelos[ambito]?.version ?? 0, parameters: antes.draft, updatedBy, motivo })
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 409) {
      // Otro puesto guardó este modelo antes: se cargan sus valores y el borrador se conserva.
      if (data.current) ponerGuardados(guardadosDesde(data.current));
      return { status: 'conflict', message: data.error };
    }
    if (!response.ok) return { status: 'error', message: data.error || 'No se pudieron guardar los parámetros.' };
    ponerGuardados(guardadosDesde(data));
    return { status: 'saved' };
  } catch {
    return { status: 'error', message: 'No se pudo contactar con el servidor.' };
  } finally {
    poner((e) => ({ ...e, saving: false }));
  }
}

/** Varios ámbitos, uno tras otro; para en el primero que no se guarda. */
export async function guardarAmbitos(ambitos: readonly string[], updatedBy: string, motivo: string): Promise<SaveDraftResult> {
  for (const ambito of ambitos) {
    const resultado = await guardarAmbito(ambito, updatedBy, motivo);
    if (resultado.status !== 'saved') return resultado;
  }
  return { status: 'saved' };
}
```

- [ ] **Step 4: `useParameters.ts` por dentro (sin cambiar lo que devuelve)**

En `src/client/hooks/useParameters.ts` (CRLF; editar con Edit):

1. Cambiar `import { useCallback, useEffect, useRef, useState } from 'react';` por `import { useEffect, useSyncExternalStore } from 'react';`.
2. Cambiar `import { changedRuleSections, normalizeRuleParameters } from '../../domain/ruleParameters.js';` por:

```ts
import { normalizeRuleParameters } from '../../domain/ruleParameters.js';
import {
  ambitosPendientes, descartarBorrador, editarParametros, guardarAmbitos, leerParametros, ponerPedido,
  refrescarParametros, suscribirParametros, type SaveDraftResult
} from '../parametrosToldos';
```

3. Sustituir desde `type SharedParameters = { version: number; parameters: RuleParameters };` hasta el final de la función `const edit = (change: …) => { … };` (incluida) por:

```ts
export type { SaveDraftResult } from '../parametrosToldos';

const REFRESH_EVERY_MS = 5 * 60 * 1000;
// Claves de cuando cada navegador guardaba sus parámetros (hasta el 21/09/2026).
const LEGACY_STORAGE_KEYS = ['toldos-testar-parameters-v2', 'toldos-testar-parameters-v3'];
const normalize = (saved?: unknown) => normalizeRuleParameters(saved) as RuleParameters;

/** El estado de los parámetros de toldos, el mismo en toda la página (App, Parámetros, el historial). */
export function useEstadoParametros() {
  return useSyncExternalStore(suscribirParametros, leerParametros, leerParametros);
}

/**
 * Parámetros de cálculo en tres capas (docs/superpowers/specs/2026-09-21-
 * parametros-comunes-design.md):
 *  - vigentes: los comunes del servidor;
 *  - borrador: lo que se edita en Parámetros, solo en este puesto hasta guardar;
 *  - del pedido: los de una revisión abierta para corregirla.
 * Los pedidos se calculan con los del pedido o, si no hay, con los vigentes;
 * nunca con un borrador sin guardar. Desde el 02/10/2026 el estado vive en
 * parametrosToldos.ts y cada modelo se guarda con su versión desde su ficha.
 * Solo App llama a este hook (refresca al volver a la ventana y cada 5 minutos).
 */
export function useParameters() {
  const estado = useEstadoParametros();
  const hayBorrador = estado.draft !== null;

  useEffect(() => {
    try {
      for (const key of LEGACY_STORAGE_KEYS) localStorage.removeItem(key);
    } catch {
      // Sin almacenamiento disponible: no hay nada que limpiar.
    }
    const onFocus = () => { void refrescarParametros(); };
    onFocus();
    window.addEventListener('focus', onFocus);
    const timer = window.setInterval(onFocus, REFRESH_EVERY_MS);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!hayBorrador) return undefined;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hayBorrador]);

  // Cada edición de Parámetros va al borrador. Si deja todo como los vigentes,
  // el borrador desaparece.
  const edit = editarParametros;
```

4. Sustituir desde `function discardDraft() {` hasta el final del fichero por:

```ts
  function discardDraft() {
    descartarBorrador();
  }

  // Pone una versión entera del historial como borrador: volver atrás es guardar.
  function loadVersion(overrides: unknown) {
    edit(() => normalize(overrides));
  }

  // La barra común de App: guarda cada modelo con cambios, uno tras otro, cada uno con su versión.
  function saveDraft(updatedBy: string, reason: string): Promise<SaveDraftResult> {
    return guardarAmbitos(ambitosPendientes(), updatedBy, reason);
  }

  // Corregir una revisión recalcula con los parámetros con que se guardó, sin
  // tocar los comunes.
  function loadParameters(saved: RuleParameters, version: number | null = null) {
    ponerPedido({ parameters: normalize(saved), version });
  }

  // Al guardar o limpiar el pedido se vuelve a los comunes.
  function restoreParameters() {
    ponerPedido(null);
  }

  return {
    parameters: estado.order?.parameters ?? estado.shared.parameters,
    generalParameters: estado.draft ?? estado.shared.parameters,
    parametersVersion: estado.order ? estado.order.version : estado.shared.version,
    version: estado.shared.version,
    // Los toldos se guardan por modelo con la barra de su ficha (ParametersView), así que la barra
    // común de arriba (App) no sale con ellos. La tarea 9 del plan de 02/10/2026 lo quita de App.
    dirty: false,
    saving: estado.saving,
    refresh: refrescarParametros,
    discardDraft,
    loadVersion,
    saveDraft,
    loadParameters,
    restoreParameters,
    updateArzua, resetArzua,
    updateGalicia, resetGalicia,
    updatePerlaBox, resetPerlaBox,
    updateCoralBox, resetCoralBox,
    updateCuarzoBox, resetCuarzoBox,
    updateCortina, resetCortina,
    updateSelena, resetSelena,
    updateCambioCortina, resetCambioCortina,
    updateXacobeo, resetXacobeo,
    updatePuntoRecto, resetPuntoRecto,
    updateMonoblock350, resetMonoblock350,
    updateMaxiscreem, resetMaxiscreem,
    updateElectra, resetElectra,
    updateAmbarBox, resetAmbarBox,
    updateAgataBox, resetAgataBox,
    updateFabricJobs, resetFabricJobs,
    updateDrawings
  };
}
```

(`function updateDrawings` y todas las `update…`/`reset…` de en medio se quedan igual.)

- [ ] **Step 5: Crear `src/client/components/ModelSaveBar.tsx`**

```tsx
import React, { useState } from 'react';
import { Save, Undo2 } from 'lucide-react';
import { COMMON_FABRIC_SCOPE } from '../../domain/parameterScopes.js';
import { readCurrentUser } from '../currentUser';
import { ambitosPendientes, descartarAmbitos, guardarAmbitos, type EstadoParametros } from '../parametrosToldos';
import { parameterModelName } from './ParameterSheet';
import { TextField } from './TextField';

/** El nombre de un modelo (o de lo común de los trabajos de tela) en pantalla. */
export const nombreAmbito = (ambito: string) => (ambito === COMMON_FABRIC_SCOPE ? 'Trabajos de tela (comunes)' : parameterModelName(ambito).current);

/**
 * La barra de cada modelo de Parámetros (Iván, 02/10/2026: «versiones por modelo»), como la de las
 * fichas de cliente: si hay cambios sin guardar, el motivo (opcional), «Descartar cambios» y «Guardar».
 * Guarda solo lo de esta ficha (el modelo y, en los trabajos de tela, lo común); quién guarda es el
 * «Soy». El historial del modelo está arriba, junto al título.
 */
export function ModelSaveBar({ ambitos, estado }: { ambitos: string[]; estado: EstadoParametros }) {
  const [motivo, setMotivo] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [aviso, setAviso] = useState<{ error: boolean; texto: string } | null>(null);
  const usuario = readCurrentUser();
  const todos = ambitosPendientes(estado);
  const pendientes = todos.filter((ambito) => ambitos.includes(ambito));
  const otros = todos.filter((ambito) => !ambitos.includes(ambito));
  const pendiente = pendientes.length > 0;
  const version = estado.shared.modelos[ambitos[0]]?.version ?? 0;

  async function guardar() {
    const nombres = pendientes.map(nombreAmbito).join(' y ');
    const resultado = await guardarAmbitos(pendientes, usuario, motivo.trim());
    if (resultado.status === 'saved') {
      setMotivo('');
      setAviso({ error: false, texto: `Guardado: ${nombres} ya se usa en todos los puestos.` });
    } else if (resultado.status === 'conflict') {
      setAviso({ error: true, texto: 'Otro puesto guardó este modelo antes. Tus cambios siguen aquí: revísalos y vuelve a guardar.' });
    } else {
      setAviso({ error: true, texto: resultado.message || 'No se pudieron guardar los parámetros.' });
    }
  }

  return <div className={`clientes-remolques-barra parametros-modelo-barra panel-3d glass-panel-strong${pendiente ? ' is-pendiente' : ''}`} role="region" aria-label="Guardar el modelo">
    <div className="clientes-remolques-barra-estado">
      <strong>{pendiente ? `Cambios sin guardar en ${pendientes.map(nombreAmbito).join(' y ')}` : 'Modelo guardado'}</strong>
      <span className="parametros-modelo-version">Versión {version}</span>
      {otros.length > 0 && <small>También sin guardar: {otros.map(nombreAmbito).join(', ')}</small>}
      {aviso && <small role="status" className={aviso.error ? 'parametros-modelo-error' : undefined}>{aviso.texto}</small>}
    </div>
    <div className="clientes-remolques-acciones">
      {confirmando ? <>
        <span className="parametros-modelo-confirmar">¿Descartar los cambios de {pendientes.map(nombreAmbito).join(' y ')}?</span>
        <button type="button" className="ghost-button" onClick={() => setConfirmando(false)}>Seguir editando</button>
        <button type="button" className="primary-button" onClick={() => { descartarAmbitos(pendientes); setConfirmando(false); setAviso(null); }}><Undo2 aria-hidden="true" />Descartar</button>
      </> : <>
        <TextField label="Motivo (opcional)" value={motivo} placeholder="Por qué cambia, si hace falta" onChange={setMotivo} />
        <button type="button" className="ghost-button" disabled={!pendiente || estado.saving} onClick={() => setConfirmando(true)}><Undo2 aria-hidden="true" />Descartar cambios</button>
        <button type="button" className="primary-button" disabled={!pendiente || estado.saving || !usuario} title={usuario ? `Se guarda como ${usuario}` : 'Elige «Soy» arriba para guardar.'}
          onClick={() => void guardar()}>
          <Save aria-hidden="true" />{estado.saving ? 'Guardando…' : 'Guardar'}
        </button>
      </>}
    </div>
  </div>;
}
```

- [ ] **Step 6: Reescribir `src/client/components/ParametersHistory.tsx`**

Contenido entero (después, convertirlo a CRLF con la orden de Global Constraints):

```tsx
import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { pageScopes } from '../../domain/parameterScopes.js';
import { useEstadoParametros } from '../hooks/useParameters';
import { cargarVersionModelo, RUTA_PARAMETROS } from '../parametrosToldos';
import { nombreAmbito } from './ModelSaveBar';

type Entry = {
  version: number;
  updatedAt: string;
  updatedBy: string;
  reason: string;
  changedSections: string[];
  overrides?: unknown;
  parameters?: unknown;
};

type EntradaModelo = {
  ambito: string;
  versionAmbito: number;
  updatedAt: string;
  updatedBy: string;
  motivo: string;
  resumen: string[];
  overrides: unknown;
  anterior?: boolean;
};

const sectionLabels: Record<string, string> = {
  arzuaPro: 'Arzúa Pro', galicia: 'Galicia', perlaBox: 'Perla Box', coralBox: 'Coral Box', cuarzoBox: 'Cuarzo Box',
  cortina: 'Cortina', selena: 'Selena', cambioCortina: 'Cambio de cortina', xacobeo: 'Xacobeo', puntoRecto: 'Punto Recto',
  monoblock350: 'Monoblock 350', maxiscreem: 'Diana vertical', electra: 'Electra', ambarBox: 'Ámbar Box', agataBox: 'Ágata Box',
  fabricJobs: 'Trabajos de tela', drawings: 'Dibujos'
};

const formatDate = (value: string) => (value ? new Date(value).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '');

// Historial de los parámetros. Va en una línea pequeña junto al título «Parámetros de modelos»; la
// lista se abre encima de la página, sin empujarla (Iván, 25/09/2026). Sin `endpoint` es el de toldos:
// desde el 02/10/2026, el del modelo que se ve en Parámetros, con su versión. Con `endpoint`, el de
// Remolques › Generales, como antes.
export function ParametersHistory({ version = 0, onLoadVersion, endpoint, labels = sectionLabels }: {
  version?: number; onLoadVersion?: (overrides: unknown) => void; endpoint?: string; labels?: Record<string, string>;
}) {
  if (!endpoint) return <ModelHistory />;
  return <SharedHistory version={version} endpoint={endpoint} labels={labels} onLoadVersion={onLoadVersion ?? (() => undefined)} />;
}

function SharedHistory({ version, onLoadVersion, endpoint, labels }: { version: number; onLoadVersion: (overrides: unknown) => void; endpoint: string; labels: Record<string, string> }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`${endpoint}?limit=20`)
      .then((response) => (response.ok ? response.json() : { entries: [] }))
      .then((data) => { if (active) setEntries(data.entries || []); })
      .catch(() => { if (active) setEntries([]); });
    return () => { active = false; };
  }, [version, endpoint]);

  const latest = entries?.[0];
  const summary = version === 0
    ? 'Parámetros del código: nadie los ha cambiado todavía'
    : `Versión ${version}${latest ? ` · ${latest.updatedBy} · ${formatDate(latest.updatedAt)} · ${latest.reason}` : ''}`;
  return (
    <details className="parameters-history">
      <summary title={summary}>
        <History aria-hidden="true" />
        <span>{summary}</span>
      </summary>
      <div className="parameters-history-panel panel-3d glass-pop">
        {entries && entries.length > 0 ? (
          <ol>
            {entries.map((entry) => (
              <li key={entry.version}>
                <div>
                  <strong>Versión {entry.version}</strong>
                  <span>{formatDate(entry.updatedAt)} · {entry.updatedBy}</span>
                  <span>{entry.reason}</span>
                  <small>{entry.changedSections.map((key) => labels[key] || key).join(', ')}</small>
                </div>
                {entry.version !== version && (
                  <button className="ghost-button" type="button" onClick={() => onLoadVersion(entry.parameters ?? entry.overrides)}>Cargar esta versión</button>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p>Sin cambios registrados.</p>
        )}
      </div>
    </details>
  );
}

// El historial del modelo elegido (y de lo común si es un trabajo de tela): quién, cuándo, el motivo
// si lo puso y qué cambió, escrito solo. «Cargar esta versión» pone lo de ese modelo como cambios sin
// guardar; volver atrás es guardar.
function ModelHistory() {
  const estado = useEstadoParametros();
  const modelo = estado.modeloVisible;
  const versiones = pageScopes(modelo).map((ambito) => estado.shared.modelos[ambito]?.version ?? 0).join(',');
  const clave = `${modelo}|${versiones}`;
  const [leido, setLeido] = useState<{ clave: string; entries: EntradaModelo[] } | null>(null);

  useEffect(() => {
    let active = true;
    const pedir = (ambito: string) => fetch(`${RUTA_PARAMETROS}/history?scope=${encodeURIComponent(ambito)}&limit=20`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : { entries: [] }))
      .then((data) => (Array.isArray(data?.entries) ? data.entries as EntradaModelo[] : []))
      .catch(() => [] as EntradaModelo[]);
    void Promise.all(pageScopes(modelo).map(pedir)).then((listas) => {
      if (active) setLeido({ clave: `${modelo}|${versiones}`, entries: listas.flat().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) });
    });
    return () => { active = false; };
  }, [modelo, versiones]);

  const entries = leido?.clave === clave ? leido.entries : null;
  const version = estado.shared.modelos[modelo]?.version ?? 0;
  const latest = entries?.[0];
  const summary = version === 0 && !latest
    ? `${nombreAmbito(modelo)}: valores del código, nadie los ha cambiado todavía`
    : [`${nombreAmbito(modelo)} · versión ${version}`, latest?.updatedBy, latest ? formatDate(latest.updatedAt) : ''].filter(Boolean).join(' · ');
  return (
    <details className="parameters-history">
      <summary title={summary}>
        <History aria-hidden="true" />
        <span>{summary}</span>
      </summary>
      <div className="parameters-history-panel panel-3d glass-pop" aria-label="Historial del modelo">
        {entries && entries.length > 0 ? (
          <ol>
            {entries.map((entry, index) => (
              <li key={`${entry.ambito}-${entry.versionAmbito}-${index}`}>
                <div>
                  <strong>{nombreAmbito(entry.ambito)} · versión {entry.versionAmbito}</strong>
                  <span>{[formatDate(entry.updatedAt), entry.updatedBy].filter(Boolean).join(' · ')}</span>
                  {entry.motivo && <span>{entry.motivo}</span>}
                  {entry.resumen.map((linea) => <small key={linea}>{linea}</small>)}
                </div>
                {entry.versionAmbito !== (estado.shared.modelos[entry.ambito]?.version ?? 0) && (
                  <button className="ghost-button" type="button" onClick={() => cargarVersionModelo(entry.ambito, entry.overrides)}>Cargar esta versión</button>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p>{entries ? 'Sin cambios registrados.' : 'Cargando historial…'}</p>
        )}
      </div>
    </details>
  );
}
```

- [ ] **Step 7: `ParametersView.tsx`: modelo elegido compartido, barra y «Restaurar» por modelo**

En `src/client/views/ParametersView.tsx` (LF):

1. El modelo elegido deja de ser estado local: `import React, { useEffect, useRef, useState } from 'react';` pasa a `import React, { useEffect, useRef } from 'react';` (`useState` solo se usaba para él). Añadir a los imports:

```ts
import { ModelSaveBar } from '../components/ModelSaveBar';
import { useEstadoParametros } from '../hooks/useParameters';
import { elegirModeloVisible, restaurarAmbitos } from '../parametrosToldos';
import { pageScopes } from '../../domain/parameterScopes.js';
```

2. En `type Props`, encima de `onResetArzua: () => void;` añadir el comentario `// App los sigue pasando; «Restaurar valores por defecto» va ahora por modelo (restaurarAmbitos).` (los `onReset…` se quedan en el tipo).

3. Sustituir la firma y el principio del componente, desde `export function ParametersView({` hasta `{renderSheet()}` + la línea de `<DrawingParametersPanel … />`, por:

```tsx
export function ParametersView({ parameters, remolques, remolquesClientes, remolquesVista = null, onSelectRemolques, onUpdateArzua, onUpdateGalicia, onUpdatePerlaBox, onUpdateCoralBox, onUpdateCuarzoBox, onUpdateCortina, onUpdateSelena, onUpdateCambioCortina, onUpdateXacobeo, onUpdatePuntoRecto, onUpdateMonoblock350, onUpdateMaxiscreem, onUpdateElectra, onUpdateAmbarBox, onUpdateAgataBox, onUpdateFabricJobs, onUpdateDrawings }: Props) {
  // El modelo elegido vive en el estado compartido: el historial de arriba (App) enseña el suyo.
  const estado = useEstadoParametros();
  const selectedModel = estado.modeloVisible as SelectedModel;
  const setSelectedModel = elegirModeloVisible;
  // «Restaurar valores por defecto»: lo de esta ficha (el modelo y, en los trabajos de tela, lo
  // común), sin tocar sus dibujos («Vaciar dibujos» va aparte).
  const restaurar = () => restaurarAmbitos(pageScopes(selectedModel));
  const clearSelectedDrawings = () => {
    const byModel = { ...parameters.drawings.byModel };
    delete byModel[selectedModel];
    onUpdateDrawings({ byModel });
  };

  // Columna de la ficha: el índice «Ir a», la barra del modelo (versión, guardar), la ficha y, justo
  // debajo y con el mismo ancho, sus dibujos. Igual para los 22 modelos (Iván, 25/09/2026).
  return <div className="parameter-layout">
    <ParameterModelSelector selectedModel={remolquesVista === 'clientes' ? 'REMOLQUES-CLIENTES' : remolquesVista ? 'REMOLQUES' : selectedModel} includeRemolques={Boolean(remolques)} onSelectModel={(model) => {
      onSelectRemolques?.(model === 'REMOLQUES' ? 'generales' : model === 'REMOLQUES-CLIENTES' ? 'clientes' : null);
      if (model !== 'REMOLQUES' && model !== 'REMOLQUES-CLIENTES') setSelectedModel(model);
    }} />
    <div className="parameter-layout-main">
      <ParameterSectionIndex />
      {remolquesVista === 'clientes' ? remolquesClientes : remolquesVista ? remolques : <>
        <ModelSaveBar key={selectedModel} ambitos={pageScopes(selectedModel)} estado={estado} />
        {renderSheet()}
        <DrawingParametersPanel model={selectedModel} parameters={parameters.drawings} onChange={onUpdateDrawings} onReset={clearSelectedDrawings} />
```

(el resto de ese JSX, `</>}` y los cierres, se queda igual.)

4. En `renderSheet()`, cambiar cada `onReset={onReset…}` por `onReset={restaurar}`: Arzúa, Galicia, Xacobeo, Punto Recto, Monoblock 350, Maxiscreem, Electra, Ámbar Box, Ágata Box, Cortina, Selena, Cambio de cortina, trabajos de tela, y en `BoxParametersView` la línea `onReset={isPerla ? onResetPerlaBox : isCuarzo ? onResetCuarzoBox : onResetCoralBox}` pasa a `onReset={restaurar}`. Comprobar con `rg -n "onReset=\{onReset" src/client/views/ParametersView.tsx` que no queda ninguno.

- [ ] **Step 8: Estilos de la barra en `parametros.css`**

Al final de `src/client/coordina/parametros.css` (CRLF; editar con Edit) añadir:

```css
/* ── Barra de cada modelo (Iván, 02/10/2026: «versiones por modelo») ──
   La misma barra que la de las fichas de cliente (clientes-remolques.css): estado y versión a la
   izquierda; motivo opcional, «Descartar cambios» y «Guardar» a la derecha. */
.parametros-modelo-version { color: var(--text-muted); font-size: 0.75rem; }
.parametros-modelo-barra small { color: var(--text-muted); font-size: 0.75rem; }
.parametros-modelo-barra small.parametros-modelo-error { color: var(--danger); font-weight: 600; }
.parametros-modelo-confirmar { align-self: center; color: var(--text); font-size: 0.8125rem; font-weight: 600; }
```

- [ ] **Step 9: Comprobar que pasan**

Run: `pnpm exec vitest run src/client/parametrosToldos.test.ts src/client/components/ModelSaveBar.test.tsx && pnpm typecheck && pnpm lint`
Expected: PASS y sin errores. (`App.tsx` compila sin cambios: `useParameters()` devuelve los mismos nombres y `ParametersHistory` sigue aceptando `version` y `onLoadVersion`.)

- [ ] **Step 10: Comprobar en la aislada**

`pnpm exec vite build`, arrancar la aislada de 4315 y, con `drive.mjs` (`openApp`) o a mano: en Parámetros › Cortina cambiar «Margen de caída tela (cm)»; sale la barra «Cambios sin guardar en Cortina» y **no** la barra común de arriba; «Guardar» sin motivo; el historial de arriba dice «Cortina · versión N · IVÁN · …» y su lista «Margen de caída: … → …»; pasar a Arzúa Pro: el historial dice «Arzúa Pro: valores del código…» o su propia versión, sin el cambio de Cortina. En Nuevo pedido un toldo de Cortina se calcula con el valor nuevo. Parámetros › Remolques › Generales: su barra «Guardar para todos» sigue igual.

- [ ] **Step 11: Batería y commit**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: PASS y build terminado.

```bash
git add src/client/parametrosToldos.ts src/client/parametrosToldos.test.ts src/client/hooks/useParameters.ts src/client/components/ModelSaveBar.tsx src/client/components/ModelSaveBar.test.tsx src/client/components/ParametersHistory.tsx src/client/views/ParametersView.tsx src/client/coordina/parametros.css
git commit -m "feat(parametros): cada ficha de modelo se guarda con su barra e historial

Iván (02/10/2026): guardar el Enrollable no tiene que pedir motivo ni
enseñarse en los demás modelos. Cada ficha de Parámetros lleva su barra,
como las fichas de cliente: quién guarda es el «Soy», el motivo es
opcional, y guarda solo lo de ese modelo (y lo común si es un trabajo de
tela). El historial de arriba es el del modelo que se ve. El estado de los
parámetros sale de React a parametrosToldos.ts para que la ficha y el
historial lo lean sin tocar App.tsx, que Codex está cambiando; por eso la
barra común de arriba deja de salir con toldos.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Web: Parámetros › Dibujos («Lo que sale hoy», cómo se usa y condiciones reales)

Modelo recomendado: el más capaz (Opus). Esfuerzo: medio (el código está completo; lo delicado es que se vea como CoordinaOT en claro y oscuro: las capturas de la tarea 8 mandan y sus arreglos vuelven a estos ficheros).

**Files:**
- Create: `src/client/components/LoQueSaleHoy.tsx`, `src/client/components/MiniaturaDibujo.tsx`
- Modify: `src/client/components/DrawingParametersPanel.tsx` (CRLF, se reescribe entero), `src/client/types.ts` (CRLF), `src/client/coordina/parametros.css` (CRLF)

**Interfaces:**
- Consumes: tarea 1 (`drawingConditionLabels`, `drawingConditionNeedsReview`, `drawingConditionOptions`, `drawingConditionShownValue`, `drawingConditionValueLabel`, `webDrawingVariants`, `automaticDrawingsForVariant`, `replacementLines`); tarea 4 (ruta de la miniatura); `pdfjs-dist` (como `PdfPreviewViewer.tsx`); `SegmentedField`, `controlLabel`.
- Produces: `DrawingVariant.usage: 'manual' | 'auto'` en `types.ts`; `LoQueSaleHoy({ model, drawings })`; `MiniaturaDibujo({ model, variant, label })`, `rutaMiniatura(model, variant): string`, `miniaturaDibujo(url): Promise<string>` (data URL PNG, en caché por URL); `DrawingParametersPanel` con la misma firma que antes.

- [ ] **Step 1: `usage` en el tipo**

En `src/client/types.ts`, en `export type DrawingVariant = {`, después de `enabled: boolean;` añadir:

```ts
  /** Cómo se usa (02/10/2026): «Solo a mano» o «Automático cuando…». */
  usage: 'manual' | 'auto';
```

Run: `pnpm typecheck`. Si señala otro sitio que crea un `DrawingVariant` sin `usage`, añadirle `usage: 'auto'` (los de antes eran automáticos).

- [ ] **Step 2: Crear `src/client/components/MiniaturaDibujo.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { RUTA_PARAMETROS } from '../parametrosToldos';

export const rutaMiniatura = (model: string, variant: string) =>
  `${RUTA_PARAMETROS}/drawing-preview?model=${encodeURIComponent(model)}&variant=${encodeURIComponent(variant)}`;

// Cada miniatura se pide y se pinta una vez por sesión: al volver al modelo sale al momento.
const cache = new Map<string, Promise<string>>();

async function pintar(url: string): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
  GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo pedir el dibujo (${response.status}).`);
  const task = getDocument({ data: new Uint8Array(await response.arrayBuffer()) });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No se pudo preparar la miniatura.');
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/png');
  } finally {
    void task.destroy();
  }
}

export function miniaturaDibujo(url: string): Promise<string> {
  let promesa = cache.get(url);
  if (!promesa) {
    promesa = pintar(url);
    cache.set(url, promesa);
    promesa.catch(() => cache.delete(url));
  }
  return promesa;
}

/** La miniatura del dibujo de la web de una variante: la hace el servidor con el código del PDF. */
export function MiniaturaDibujo({ model, variant, label }: { model: string; variant: string; label: string }) {
  const url = rutaMiniatura(model, variant);
  const [leida, setLeida] = useState<{ url: string; src: string; error: boolean } | null>(null);
  useEffect(() => {
    let activo = true;
    miniaturaDibujo(url).then(
      (src) => { if (activo) setLeida({ url, src, error: false }); },
      () => { if (activo) setLeida({ url, src: '', error: true }); }
    );
    return () => { activo = false; };
  }, [url]);
  const actual = leida?.url === url ? leida : null;
  if (!actual) return <div className="drawing-today-thumb is-loading" role="status">Preparando dibujo…</div>;
  if (actual.error) return <div className="drawing-today-thumb is-error" role="alert">No se pudo preparar el dibujo.</div>;
  return <img className="drawing-today-thumb" src={actual.src} alt={`Dibujo de la web · ${label}`} />;
}
```

- [ ] **Step 3: Crear `src/client/components/LoQueSaleHoy.tsx`**

```tsx
import React from 'react';
import type { DrawingParameters } from '../types';
import { automaticDrawingsForVariant, replacementLines, webDrawingVariants } from '../../domain/drawingCatalog.js';
import { controlLabel } from './controlLabels';
import { MiniaturaDibujo } from './MiniaturaDibujo';

// «Lo que sale hoy» (Iván, 02/10/2026): cada variante del modelo con la miniatura del dibujo de la
// web (la hace el servidor con el mismo código que el PDF) y el dibujo del taller que la sustituye
// solo, con los dibujos de esta pantalla (también los cambios sin guardar).
export function LoQueSaleHoy({ model, drawings }: { model: string; drawings: DrawingParameters }) {
  const variants = webDrawingVariants(model);
  return <section className="drawing-today" aria-labelledby="drawing-today-title">
    <div className="drawing-today-heading">
      <h3 id="drawing-today-title">Lo que sale hoy</h3>
      <p>El dibujo de la web en cada variante, con un toldo de ejemplo de 400 × 250 cm, y el dibujo del taller que lo sustituye solo.</p>
    </div>
    <ul className="drawing-today-grid">
      {variants.map((variant) => {
        const label = controlLabel(variant.label);
        return <li key={variant.id} className="drawing-today-item bloque-3d">
          {variant.webDrawing
            ? <MiniaturaDibujo model={model} variant={variant.id} label={label} />
            : <div className="drawing-today-none">La hoja de Hera es una tabla por toldo: la web no dibuja la confección.</div>}
          <strong>{label}</strong>
          {replacementLines(automaticDrawingsForVariant(variant, drawings)).map((line) => <small key={line}>{line}</small>)}
        </li>;
      })}
    </ul>
  </section>;
}
```

- [ ] **Step 4: Reescribir `src/client/components/DrawingParametersPanel.tsx`**

Contenido entero (después, convertirlo a CRLF con la orden de Global Constraints):

```tsx
import { AlertTriangle, ArrowDown, ArrowUp, ClipboardPaste, ImagePlus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import type { DrawingCondition, DrawingConditionField, DrawingParameters, DrawingVariant } from '../types';
import {
  drawingConditionLabels, drawingConditionNeedsReview, drawingConditionOptions, drawingConditionShownValue, drawingConditionValueLabel
} from '../../domain/drawingCatalog.js';
import { controlLabel } from './controlLabels';
import { LoQueSaleHoy } from './LoQueSaleHoy';
import { SegmentedField } from './SegmentedField';

type ConditionOption = { field: DrawingConditionField; label: string; values: string[] };
const USES = { manual: 'Solo a mano', auto: 'Automático cuando…' } as const;

// Parámetros › un modelo › Dibujos (Iván, 02/10/2026): arriba «Lo que sale hoy»; debajo, los dibujos
// del taller, cada uno con su imagen y «Cómo se usa»: «Solo a mano» (se elige en la tarjeta) o
// «Automático cuando…» con condiciones de valores reales del modelo (también se elige a mano).
export function DrawingParametersPanel({ model, parameters, onChange, onReset }: {
  model: string;
  parameters: DrawingParameters;
  onChange: (parameters: DrawingParameters) => void;
  onReset: () => void;
}) {
  const variants = parameters.byModel[model] || [];
  const conditionOptions = drawingConditionOptions(model) as ConditionOption[];

  function commit(next: DrawingVariant[]) {
    const byModel = { ...parameters.byModel };
    if (next.length) byModel[model] = next;
    else delete byModel[model];
    onChange({ byModel });
  }

  function update(id: string, patch: Partial<DrawingVariant>) {
    commit(variants.map((variant) => variant.id === id ? { ...variant, ...patch } : variant));
  }

  // Un dibujo nuevo empieza «Solo a mano»: no cambia ningún PDF hasta que se elige o se pasa a automático.
  function add() {
    commit([...variants, {
      id: `${model.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      name: variants.length ? `Dibujo ${variants.length + 1}` : 'Dibujo general',
      enabled: true,
      usage: 'manual',
      image: null,
      conditions: []
    }]);
  }

  return <section className="drawing-parameters panel-3d panel-vidrio" aria-labelledby="drawing-parameters-title">
    <header className="drawing-parameters-heading">
      <div>
        <span className="section-kicker">Dibujos · {controlLabel(model)}</span>
        <h2 id="drawing-parameters-title">Dibujos</h2>
        <p>El dibujo de la web de cada variante y los dibujos del taller que lo sustituyen. Una imagen puesta en un toldo del pedido manda sobre todos.</p>
      </div>
      <div className="drawing-parameters-actions">
        {variants.length > 0 && <button className="ghost-button" type="button" onClick={onReset}><RotateCcw aria-hidden="true" />Vaciar dibujos</button>}
        <button className="primary-button" type="button" onClick={add}><Plus aria-hidden="true" />Añadir dibujo</button>
      </div>
    </header>

    <LoQueSaleHoy model={model} drawings={parameters} />

    <h3 className="drawing-workshop-title">Dibujos del taller</h3>
    <ol className="drawing-steps" aria-label="Cómo se usa">
      <li><strong>Añade un dibujo</strong> y ponle su imagen (archivo o pegar).</li>
      <li><strong>Elige cómo se usa</strong>: «Solo a mano» sale si se elige en la tarjeta del toldo; «Automático cuando…» sale solo cuando el toldo cumple sus condiciones (sin condiciones, siempre) y también se puede elegir a mano.</li>
      <li><strong>Pulsa «Guardar»</strong> en la barra del modelo: hasta entonces solo lo ves tú.</li>
    </ol>

    {variants.length === 0 ? <button className="drawing-empty" type="button" onClick={add}>
      <ImagePlus aria-hidden="true" />
      <strong>Añadir el primer dibujo de {controlLabel(model)}</strong>
      <span>Un dibujo propio del taller para elegirlo en la tarjeta o para que salga solo en algunos toldos.</span>
    </button> : <div className="drawing-rule-list">
      {variants.map((variant, index) => <DrawingRuleCard
        key={variant.id}
        model={model}
        conditionOptions={conditionOptions}
        variant={variant}
        index={index}
        canMoveDown={index < variants.length - 1}
        onChange={(patch) => update(variant.id, patch)}
        onDelete={() => commit(variants.filter((item) => item.id !== variant.id))}
        onMove={(direction) => {
          const target = index + direction;
          if (target < 0 || target >= variants.length) return;
          const next = [...variants];
          [next[index], next[target]] = [next[target], next[index]];
          commit(next);
        }}
      />)}
    </div>}
  </section>;
}

function usageHint(variant: DrawingVariant) {
  if (variant.usage === 'manual') return 'Sale solo si se elige en la tarjeta del toldo («Dibujo de confección»).';
  return variant.conditions.length
    ? 'Sale solo cuando el toldo cumple todo lo de abajo. También se puede elegir a mano en la tarjeta.'
    : 'Sin condiciones: sale siempre en este modelo. También se puede elegir a mano en la tarjeta.';
}

function DrawingRuleCard({ model, conditionOptions, variant, index, canMoveDown, onChange, onDelete, onMove }: {
  model: string;
  conditionOptions: ConditionOption[];
  variant: DrawingVariant;
  index: number;
  canMoveDown: boolean;
  onChange: (patch: Partial<DrawingVariant>) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const pasteArea = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function importImage(blob: Blob) {
    if (busy) return;
    setError(''); setBusy(true);
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type)) throw new Error('Selecciona una imagen PNG, JPG o WebP.');
      if (blob.size > 20 * 1024 * 1024) throw new Error('La imagen supera los 20 MB.');
      const bitmap = await createImageBitmap(blob);
      try {
        const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(bitmap.width * scale));
        canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('No se pudo preparar la imagen.');
        context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        let data = canvas.toDataURL('image/jpeg', 0.9);
        for (const quality of [0.8, 0.65, 0.5, 0.35]) {
          if (data.length <= 600000) break;
          data = canvas.toDataURL('image/jpeg', quality);
        }
        if (data.length > 600000) throw new Error('La imagen sigue siendo demasiado grande. Recórtala o elige otra.');
        onChange({ image: data });
      } finally { bitmap.close(); }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo leer la imagen.');
    } finally { setBusy(false); }
  }

  async function paste() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((value) => ['image/png', 'image/jpeg', 'image/webp'].includes(value));
        if (type) { await importImage(await item.getType(type)); return; }
      }
      setError('El portapapeles no contiene una imagen.');
    } catch {
      setError('Haz clic en la ficha y pulsa Ctrl+V para pegar la imagen.');
      pasteArea.current?.focus();
    }
  }

  const setConditions = (conditions: DrawingCondition[]) => onChange({ conditions });

  return <article className={`drawing-rule ${variant.enabled ? '' : 'is-disabled'}`} ref={pasteArea} tabIndex={0} onPaste={(event) => {
    const file = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'))?.getAsFile();
    if (file) { event.preventDefault(); void importImage(file); }
  }}>
    <div className="drawing-rule-rank">
      <button type="button" aria-label="Subir en el orden" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp aria-hidden="true" /></button>
      <span>{String(index + 1).padStart(2, '0')}</span><small title="Si dos dibujos automáticos encajan igual, sale el primero">orden</small>
      <button type="button" aria-label="Bajar en el orden" disabled={!canMoveDown} onClick={() => onMove(1)}><ArrowDown aria-hidden="true" /></button>
    </div>
    <div className="drawing-rule-image">
      {variant.image ? <img src={variant.image} alt={`Dibujo ${variant.name}`} /> : <div><ImagePlus aria-hidden="true" /><span>Sin imagen</span></div>}
      <div className="drawing-image-actions">
        <button className="ghost-button" type="button" disabled={busy} onClick={() => input.current?.click()}><ImagePlus aria-hidden="true" />Importar</button>
        <button className="ghost-button" type="button" disabled={busy} onClick={() => void paste()}><ClipboardPaste aria-hidden="true" />Pegar</button>
      </div>
      <input ref={input} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void importImage(file); }} />
    </div>
    <div className="drawing-rule-content">
      <div className="drawing-rule-title">
        <label>Nombre del dibujo<input value={variant.name} onChange={(event) => onChange({ name: event.target.value })} /></label>
        <label className="drawing-enabled" title="Si lo desactivas, se guarda pero no sale en ningún PDF ni en la tarjeta"><input type="checkbox" checked={variant.enabled} onChange={(event) => onChange({ enabled: event.target.checked })} />Se usa</label>
        <button className="icon-button danger" type="button" aria-label={`Eliminar ${variant.name}`} onClick={onDelete}><Trash2 aria-hidden="true" /></button>
      </div>
      <div className="drawing-usage">
        <SegmentedField label="Cómo se usa" value={USES[variant.usage]} options={[USES.manual, USES.auto]} onChange={(value) => onChange({ usage: value === USES.manual ? 'manual' : 'auto' })} />
        <p className="drawing-usage-hint">{usageHint(variant)}</p>
      </div>
      {variant.usage === 'auto' && <>
        <div className="drawing-condition-heading">
          <div><strong>Condiciones</strong><span>{variant.conditions.length ? 'Tiene que cumplirlas todas.' : 'Ninguna: sale siempre.'}</span></div>
          <button className="ghost-button" type="button" disabled={!conditionOptions.length}
            onClick={() => setConditions([...variant.conditions, { field: conditionOptions[0].field, value: conditionOptions[0].values[0] }])}>
            <Plus aria-hidden="true" />Añadir condición
          </button>
        </div>
        {variant.conditions.length > 0 && <div className="drawing-conditions">{variant.conditions.map((condition, conditionIndex) => <ConditionRow
          key={`${conditionIndex}-${condition.field}`}
          model={model}
          options={conditionOptions}
          condition={condition}
          onChange={(next) => setConditions(variant.conditions.map((item, i) => i === conditionIndex ? next : item))}
          onRemove={() => setConditions(variant.conditions.filter((_, i) => i !== conditionIndex))}
        />)}</div>}
      </>}
      {busy && <small role="status">Preparando imagen…</small>}
      {error && <small className="drawing-error" role="alert">{error}</small>}
    </div>
  </article>;
}

// Una condición: campo y valor en desplegables con lo que tiene de verdad este modelo. Lo guardado
// antes que no case sale con «(revisar)» y un aviso; se sigue usando igual hasta que se cambie.
function ConditionRow({ model, options, condition, onChange, onRemove }: {
  model: string;
  options: ConditionOption[];
  condition: DrawingCondition;
  onChange: (condition: DrawingCondition) => void;
  onRemove: () => void;
}) {
  const option = options.find((item) => item.field === condition.field);
  const review = drawingConditionNeedsReview(model, condition);
  const shown = drawingConditionShownValue(model, condition);
  const label = drawingConditionLabels[condition.field as keyof typeof drawingConditionLabels] ?? condition.field;
  return <div className={`drawing-condition${review ? ' needs-review' : ''}`}>
    <select aria-label="Campo de la condición" value={condition.field} onChange={(event) => {
      const field = event.target.value as DrawingConditionField;
      onChange({ field, value: options.find((item) => item.field === field)?.values[0] ?? '' });
    }}>
      {options.map((item) => <option key={item.field} value={item.field}>{item.label}</option>)}
      {!option && <option value={condition.field}>{label} (revisar)</option>}
    </select>
    <span>=</span>
    <select aria-label={`Valor de ${label}`} value={shown} onChange={(event) => onChange({ field: condition.field, value: event.target.value })}>
      {(option?.values ?? []).map((value) => <option key={value} value={value}>{controlLabel(drawingConditionValueLabel(value))}</option>)}
      {review && <option value={shown}>{shown || 'Sin valor'} (revisar)</option>}
    </select>
    <button className="icon-button" type="button" aria-label="Quitar condición" onClick={onRemove}><Trash2 aria-hidden="true" /></button>
    {review && <small className="drawing-condition-review" role="note"><AlertTriangle aria-hidden="true" />Revisar: «{shown || 'sin valor'}» no es un valor de {label} en este modelo. Elige uno de la lista.</small>}
  </div>;
}
```

- [ ] **Step 5: Estilos en `parametros.css`**

Al final de `src/client/coordina/parametros.css` (CRLF; editar con Edit) añadir:

```css
/* ── Dibujos (Iván, 02/10/2026) ──
   «Lo que sale hoy»: una ficha por variante con la miniatura del dibujo de la web y quién lo
   sustituye. Debajo, los dibujos del taller con «Cómo se usa» y condiciones de valores reales. */
.drawing-today { border-bottom: 1px solid var(--border); display: grid; gap: 0.75rem; padding: 1.25rem 1.5rem; }
.drawing-today-heading h3,
.drawing-workshop-title { color: var(--text); font-size: 1rem; font-weight: 600; margin: 0; }
.drawing-workshop-title { padding: 1.25rem 1.5rem 0; }
.drawing-today-heading p { color: var(--text-muted); font-size: 0.8125rem; margin: 0.25rem 0 0; }
.drawing-today-grid { display: grid; gap: 0.75rem; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); list-style: none; margin: 0; padding: 0; }
.drawing-today-item { border-radius: 0.75rem; display: flex; flex-direction: column; gap: 0.25rem; min-width: 0; padding: 0.625rem; }
.drawing-today-item > strong { color: var(--text); font-size: 0.875rem; font-weight: 600; margin-top: 0.25rem; }
.drawing-today-item > small { color: var(--text-muted); font-size: 0.75rem; }
/* El papel del PDF es blanco también en oscuro. */
.drawing-today-thumb,
.drawing-today-none { aspect-ratio: 258 / 343; background: #fff; border: 1px solid var(--border); border-radius: 0.5rem; width: 100%; }
.drawing-today-thumb.is-loading,
.drawing-today-thumb.is-error,
.drawing-today-none { align-items: center; color: var(--text-muted); display: flex; font-size: 0.75rem; justify-content: center; padding: 0.75rem; text-align: center; }
.drawing-today-none { background: var(--surface-muted); }
.drawing-usage { display: grid; gap: 0.25rem; margin-top: 1rem; }
.drawing-usage-hint { color: var(--text-muted); font-size: 0.8125rem; margin: 0; }
.drawing-condition.needs-review select { border-color: var(--danger); }
.drawing-condition-review { align-items: center; color: var(--danger); display: flex; font-size: 0.75rem; font-weight: 600; gap: 0.375rem; grid-column: 1 / -1; }
.drawing-condition-review svg { flex: none; height: 14px; width: 14px; }
```

- [ ] **Step 6: Comprobar**

Run: `pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: sin errores.

En la aislada de 4315 (`pnpm exec vite build` hecho): Parámetros › Cortina › Dibujos enseña 6 miniaturas que se parecen a la hoja de tela de cada variante; Hera dice que su hoja es una tabla; añadir un dibujo: empieza «Solo a mano»; pasarlo a «Automático cuando…», «Añadir condición» ofrece solo los campos de Cortina con sus valores; con Confección = Velcro, «Sin ventana · velcro» dice «… lo sustituye siempre.» (sin guardar todavía); la barra del modelo dice «Cambios sin guardar en Cortina». Mirar en claro y oscuro.

- [ ] **Step 7: Batería y commit**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: PASS y build terminado.

```bash
git add src/client/types.ts src/client/components/MiniaturaDibujo.tsx src/client/components/LoQueSaleHoy.tsx src/client/components/DrawingParametersPanel.tsx src/client/coordina/parametros.css
git commit -m "feat(dibujos): «Lo que sale hoy» y cómo se usa cada dibujo en Parámetros

Iván (02/10/2026): en Parámetros no se veía qué dibujo de la web sale en
cada variante ni cuándo lo sustituye uno del taller, y las condiciones se
escribían a mano. Cada modelo enseña ahora sus variantes con la miniatura
que hace el servidor con el código del PDF y qué dibujo del taller la
sustituye; cada dibujo dice «Solo a mano» o «Automático cuando…» con
desplegables de valores reales, y lo guardado que no casa se marca para
revisar.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Web: la tarjeta «Dibujo de confección» y el panel

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio (el código está completo; hay que pasar la prueba de lectura de la tarjeta, que vigila los vacíos con nombre).

**Files:**
- Modify: `src/client/types.ts` (CRLF), `src/client/constants.ts` (LF), `src/domain/validation.js` (mezclado), `src/client/hooks/useDraft.ts` (LF) + `useDraft.test.ts`, `src/client/components/SelectField.tsx` (CRLF), `src/client/components/AwningColumn.tsx` (CRLF), `src/client/components/AwningPanel.tsx` (CRLF), `src/client/components/FabricImageEditor.tsx` (LF), `src/client/coordina/parametros.css` (CRLF), `src/domain/drawingParameters.test.js`
- Create: `src/client/components/AwningColumn.dibujo.test.ts`

**Interfaces:**
- Consumes: tarea 1 (`selectableDrawings`, `chosenDrawingMissing`, `resolveAutomaticDrawing`, `resolveConfiguredDrawing` con `source: 'chosen'`).
- Produces: `Awning.workshopDrawingId?: string`; `normalizeOrder` y `sanitizeAwning` lo conservan; `switchAwningModel` lo vacía; `SelectField` acepta `optionLabel?: (value: string) => string`; `DrawingSource = { kind: 'web' } | { kind: 'library'; name: string; chosen?: boolean } | { kind: 'manual' }`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Añadir dentro de `describe('la biblioteca de dibujos llega al PDF', …)` de `src/domain/drawingParameters.test.js`:

```js
  it('normalizeOrder conserva el dibujo del taller elegido en la tarjeta', async () => {
    const { normalizeOrder } = await import('./validation.js');
    const order = normalizeOrder({ orderCode: 'T', awnings: [{ id: 'a', of: '0200001', model: 'ENROLLABLE', units: 1, width: 300, projection: 250, workshopDrawingId: ' plano ' }] });
    expect(order.awnings[0].workshopDrawingId).toBe('plano');
  });
```

Añadir al final de `src/client/hooks/useDraft.test.ts`:

```ts
describe('dibujo del taller elegido en la tarjeta (02/10/2026)', () => {
  test('se conserva al leer el borrador y se quita al cambiar de modelo', () => {
    const awning = { ...createAwning('FABRIC_ONLY'), model: 'ENROLLABLE', workshopDrawingId: 'plano' };
    expect(sanitizeAwning(awning).workshopDrawingId).toBe('plano');
    expect(sanitizeAwning({ ...awning, workshopDrawingId: 5 }).workshopDrawingId).toBe('');
    expect(switchAwningModel(awning, 'BAMBALINA').workshopDrawingId).toBe('');
  });
});
```

Crear `src/client/components/AwningColumn.dibujo.test.ts`:

```ts
import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AwningColumn } from './AwningColumn';
import { SAMPLE_FABRIC, sampleAwnings } from '../../../scripts/lib/model-samples.mjs';
import { normalizeRuleParameters } from '../../domain/ruleParameters.js';
import type { Awning, RuleParameters } from '../types';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const noop = () => undefined;
const arzua = (patch: Partial<Awning> = {}): Awning => ({
  ...(sampleAwnings('ARZUA PRO')[0].awning as Awning), device: 'MOTOR', fabricDiagramOverride: '', workshopDrawingId: '', fabricImage: null, ...patch
});
const conDibujos = (list: unknown[]) => normalizeRuleParameters({ drawings: { byModel: { 'ARZUA PRO': list } } }) as RuleParameters;
const render = (awning: Awning, parameters: RuleParameters) => renderToStaticMarkup(React.createElement(AwningColumn, {
  awning, index: 0, parameters, sameFabric: true, orderFabric: SAMPLE_FABRIC, onUpdate: noop, onDuplicate: noop, onRemove: noop
}));

describe('«Dibujo de confección» en la tarjeta (02/10/2026)', () => {
  it('sin dibujos del taller dice que sale el de la web', () => {
    expect(render(arzua(), normalizeRuleParameters() as RuleParameters)).toContain('Automático (sale: el de la web)');
  });

  it('con un automático del taller que encaja, dice cuál', () => {
    const html = render(arzua(), conDibujos([{ id: 'motor', name: 'Motor', enabled: true, image, conditions: [{ field: 'device', value: 'MOTOR' }] }]));
    expect(html).toContain('Automático (sale: «Motor» del taller)');
  });

  it('el elegido a mano se ve con su nombre', () => {
    const html = render(arzua({ workshopDrawingId: 'plano' }), conDibujos([{ id: 'plano', name: 'Plano', usage: 'manual', enabled: true, image, conditions: [] }]));
    expect(html).toContain('Plano (taller)');
    expect(html).not.toContain('ya no está en Parámetros');
  });

  it('si el elegido ya no está, avisa y vuelve a Automático', () => {
    const html = render(arzua({ workshopDrawingId: 'quitado' }), conDibujos([]));
    expect(html).toContain('ya no está en Parámetros o está desactivado');
    expect(html).toContain('Automático (sale: el de la web)');
  });
});
```

- [ ] **Step 2: Comprobar que fallan**

Run: `pnpm exec vitest run src/domain/drawingParameters.test.js src/client/hooks/useDraft.test.ts src/client/components/AwningColumn.dibujo.test.ts`
Expected: FAIL.

- [ ] **Step 3: El campo en el toldo**

- `src/client/types.ts`: en `Awning`, después de `fabricDiagramOverride: …;` añadir `workshopDrawingId?: string;` con el comentario `// Dibujo del taller elegido a mano en la tarjeta (id de Parámetros › Dibujos); vacío = automático.`
- `src/client/constants.ts`: en `createAwning`, después de `fabricDiagramOverride: '',` añadir `workshopDrawingId: '',`.
- `src/domain/validation.js`: en `normalizeAwning`, después de `fabricDiagramOverride: normalizeFabricDiagramOverride(model, awning?.fabricDiagramOverride),` añadir `workshopDrawingId: cleanText(awning?.workshopDrawingId),`.
- `src/client/hooks/useDraft.ts`: en `sanitizeAwning`, después de la línea `base.fabricDiagramOverride = normalizeFabricDiagramOverride(…)` añadir `base.workshopDrawingId = typeof old.workshopDrawingId === 'string' ? old.workshopDrawingId : '';`; en `switchAwningModel`, después de `fabricDiagramOverride: normalizeFabricDiagramOverride(model, awning.fabricDiagramOverride) as Awning['fabricDiagramOverride'],` añadir `// Un dibujo del taller es de su modelo.` y `workshopDrawingId: '',`.

- [ ] **Step 4: `SelectField` con nombres de opción propios**

En `src/client/components/SelectField.tsx`:

1. En `type Props`, después de `missing?: boolean;` añadir:

```ts
  /** Texto de cada opción (por defecto, controlLabel); con '' da el de la opción vacía de la lista. */
  optionLabel?: (value: string) => string;
```

2. Cambiar la firma a `export function SelectField({ label, value, options, onChange, placeholder, allowEmpty = false, emptyLabel, missing = false, optionLabel }: Props) {` y, justo debajo, añadir:

```ts
  const labelOf = (option: string) => (optionLabel ? optionLabel(option) : controlLabel(option));
  const emptyOptionLabel = optionLabel?.('') || emptyLabel || 'No indicado';
```

3. Sustituir los `controlLabel(value)` y `controlLabel(option)` del cuerpo por `labelOf(value)` y `labelOf(option)` (lectura, `title` y texto del botón, `title` y texto de cada opción), y en las opciones `emptyLabel ?? 'No indicado'` por `emptyOptionLabel`. Al leer, el vacío sigue diciendo `emptyLabel` (así «Dibujo de confección · Automático» se sigue ocultando como valor por defecto).

- [ ] **Step 5: La tarjeta**

En `src/client/components/AwningColumn.tsx`:

1. Imports: añadir `import { chosenDrawingMissing, resolveAutomaticDrawing, selectableDrawings } from '../../domain/drawingParameters.js';` y, debajo de los imports, `const WORKSHOP_DRAWING = 'taller:';`.

2. Justo después de `const update = (patch: Partial<Awning>) => onUpdate(awning.id, patch);` añadir:

```tsx
  // Dibujo de confección (Iván, 02/10/2026): «Automático (sale: …)», los dibujos del taller de este
  // modelo (a mano y automáticos) y el trabajo especial. Elegir uno quita el otro: es la misma
  // elección, qué dibujo sale en el PDF.
  const workshopDrawings = selectableDrawings(awning.model, parameters.drawings);
  const chosenMissing = chosenDrawingMissing(awning, parameters.drawings);
  const automaticDrawing = resolveAutomaticDrawing({ ...awning, fabricImage: null }, parameters.drawings);
  const automaticDrawingLabel = automaticDrawing ? `Automático (sale: «${automaticDrawing.name}» del taller)` : 'Automático (sale: el de la web)';
  const drawingChoices = [
    ...workshopDrawings.map(({ id }) => `${WORKSHOP_DRAWING}${id}`),
    ...fabricDiagramOptions.filter(({ value }) => value).map(({ value }) => value)
  ];
  const drawingValue = awning.workshopDrawingId && !chosenMissing ? `${WORKSHOP_DRAWING}${awning.workshopDrawingId}` : awning.fabricDiagramOverride;
  const drawingChoiceLabel = (value: string) => {
    if (!value) return automaticDrawingLabel;
    if (!value.startsWith(WORKSHOP_DRAWING)) return controlLabel(value);
    const drawing = workshopDrawings.find(({ id }) => `${WORKSHOP_DRAWING}${id}` === value);
    return `${drawing?.name ?? 'Dibujo del taller'} (taller)`;
  };
  const chooseDrawing = (value: string) => (value.startsWith(WORKSHOP_DRAWING)
    ? update({ workshopDrawingId: value.slice(WORKSHOP_DRAWING.length), fabricDiagramOverride: '' })
    : update({ workshopDrawingId: '', fabricDiagramOverride: value as Awning['fabricDiagramOverride'] }));
```

3. Sustituir el bloque:

```tsx
          {fabricDiagramOptions.length > 1 && (
            <div className="awning-wide-field">
              <SelectField
                label="Dibujo de confección"
                value={awning.fabricDiagramOverride}
                options={fabricDiagramOptions.filter(({ value }) => value).map(({ value }) => value)}
                placeholder="Automático"
                allowEmpty
                emptyLabel="Automático"
                onChange={(fabricDiagramOverride) => update({ fabricDiagramOverride: fabricDiagramOverride as Awning['fabricDiagramOverride'] })}
              />
            </div>
          )}
```

por:

```tsx
          {drawingChoices.length > 0 && (
            <div className="awning-wide-field">
              <SelectField
                label="Dibujo de confección"
                value={drawingValue}
                options={drawingChoices}
                placeholder={automaticDrawingLabel}
                allowEmpty
                emptyLabel="Automático"
                optionLabel={drawingChoiceLabel}
                onChange={chooseDrawing}
              />
            </div>
          )}
          {chosenMissing && !readOnly && (
            <div className="awning-wide-field drawing-choice-missing" role="alert">
              <AlertTriangle aria-hidden="true" />
              <span>El dibujo del taller que se eligió ya no está en Parámetros o está desactivado. Sale el automático.</span>
              <button className="ghost-button" type="button" onClick={() => update({ workshopDrawingId: '' })}>Entendido</button>
            </div>
          )}
```

- [ ] **Step 6: El panel dice de dónde sale**

- `src/client/components/FabricImageEditor.tsx`: el tipo pasa a `export type DrawingSource = { kind: 'web' } | { kind: 'library'; name: string; chosen?: boolean } | { kind: 'manual' };` y la línea de `source.kind === 'library'` en `current` a:

```tsx
      ? <><PencilRuler aria-hidden="true" /><span>En el PDF sale <strong>el dibujo del taller «{source.name}»</strong> ({source.chosen ? 'elegido en la tarjeta' : 'automático, de Parámetros'}).</span></>
```

- `src/client/components/AwningPanel.tsx`, en `drawingSource`: el comentario de encima pasa a `// Qué sale en el PDF: la imagen puesta en el toldo manda; si no, el dibujo del taller elegido en la tarjeta; si no, el automático que encaje (Parámetros); si tampoco, el de la web.` y el `return` final a:

```tsx
  return configured ? { kind: 'library', name: configured.name, chosen: configured.source === 'chosen' } : { kind: 'web' };
```

- [ ] **Step 7: El estilo del aviso**

Al final de `src/client/coordina/parametros.css` (CRLF; editar con Edit):

```css
/* El aviso de la tarjeta cuando el dibujo del taller elegido ya no está (02/10/2026). */
.drawing-choice-missing { align-items: center; color: var(--danger); display: flex; flex-wrap: wrap; font-size: 0.8125rem; gap: 0.5rem; }
.drawing-choice-missing > svg { flex: none; height: 16px; width: 16px; }
```

- [ ] **Step 8: Comprobar que pasan**

Run: `pnpm exec vitest run src/domain/drawingParameters.test.js src/client/hooks/useDraft.test.ts src/client/components/AwningColumn.dibujo.test.ts src/client/components/AwningColumn.reading.test.ts`
Expected: PASS. Si `AwningColumn.reading.test.ts` falla en «Dibujo de confección», es por el texto del vacío al editar: el marcador de posición es ahora «Automático (sale: el de la web)» y al leer sigue siendo «Automático» (oculto por `readHiddenDefaults`). Arreglarlo en la tarjeta (que al leer no cambie nada), no en la prueba.

- [ ] **Step 9: Batería y commit**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: PASS y build terminado.

```bash
git add src/client/types.ts src/client/constants.ts src/domain/validation.js src/client/hooks/useDraft.ts src/client/hooks/useDraft.test.ts src/client/components/SelectField.tsx src/client/components/AwningColumn.tsx src/client/components/AwningColumn.dibujo.test.ts src/client/components/AwningPanel.tsx src/client/components/FabricImageEditor.tsx src/client/coordina/parametros.css src/domain/drawingParameters.test.js
git commit -m "feat(dibujos): elegir en la tarjeta el dibujo del taller que sale en el PDF

Iván (02/10/2026): el selector «Dibujo de confección» tenía una lista fija
y decía «Automático» sin decir qué salía. Ahora ofrece los dibujos del
taller del modelo y los trabajos especiales, y «Automático (sale: …)» dice
si sale uno del taller o el de la web. Lo elegido se guarda en el toldo y
sale en el PDF; si se quita o desactiva en Parámetros, la tarjeta avisa y
vuelve a automático. El panel «Despiece y dibujo» dice si el dibujo del
taller es el elegido o el automático.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: e2e, capturas y documentación

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio (≈ 2–3 min por vuelta de la e2e; si falla o las capturas no se ven como CoordinaOT, el arreglo va en los ficheros de las tareas 5–7).

**Files:**
- Create: `scripts/test-dibujos-e2e.mjs`
- Modify: `scripts/test-bambalina-workflow.mjs` (CRLF), `README.md` (LF), `.claude/skills/running-toldos-testar/SKILL.md` (CRLF)

**Interfaces:**
- Consumes: `BASE_URL`, `openApp`, `addAwning`, `pick`, `chooseFabric` (`.claude/skills/running-toldos-testar/drive.mjs`); rutas de las tareas 3 y 4; `/api/planteamiento`.
- Produces: `scripts/test-dibujos-e2e.mjs` (salida `OK: …` por paso) y capturas en `tmp/ui-audit/dibujos-y-versiones/`.

- [ ] **Step 1: Crear `scripts/test-dibujos-e2e.mjs`**

```js
// Prueba e2e de los dibujos de los modelos y las versiones por modelo (diseño 02/10/2026): en
// Parámetros › Enrollable se sube un dibujo «Solo a mano» y se guarda sin motivo; su historial lo
// cuenta solo y no sale en Arzúa Pro; «Lo que sale hoy» enseña las miniaturas; en Nuevo pedido se
// elige en la tarjeta de un enrollable y el panel «Despiece y dibujo» dice que sale ese; el PDF lo
// lleva. Un dibujo automático de Cortina con condición sustituye solo a sus variantes en «Lo que
// sale hoy» y sale en el PDF solo cuando el toldo la cumple. Se puede repetir: cada vuelta usa
// nombres nuevos.
// Va en su propia aislada, porque guarda parámetros:
//   ISOLATED_DIR="$PWD/tmp/dibujos" PORT=4315 FAKE_COORDINA_PORT=4325 bash .claude/skills/running-toldos-testar/start-isolated.sh
//   TOLDOS_ISOLATED_URL=http://127.0.0.1:4315 node scripts/test-dibujos-e2e.mjs
// Capturas en tmp/ui-audit/dibujos-y-versiones/ (claro y oscuro, 1280×720 y 1600×1000).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { BASE_URL, addAwning, chooseFabric, openApp, pick } from '../.claude/skills/running-toldos-testar/drive.mjs';

const SALIDA = 'tmp/ui-audit/dibujos-y-versiones';
const LOGO = 'src/domain/assets/tgm-logo.png';
const IMAGEN = `data:image/png;base64,${fs.readFileSync(LOGO).toString('base64')}`;
const vuelta = Date.now().toString(36).slice(-5).toUpperCase();
const PLANO = `Enrollable plano ${vuelta}`;
const VELCRO = `Cortina velcro ${vuelta}`;
fs.mkdirSync(SALIDA, { recursive: true });
assert.equal(new URL(BASE_URL).port, '4315', 'esta prueba va en su aislada de 4315: guarda parámetros');

const json = (method, datos) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
async function api(ruta, init) {
  const r = await fetch(`${BASE_URL}${ruta}`, init);
  return { status: r.status, datos: await r.json().catch(() => null) };
}
const historial = async (modelo) => (await api(`/api/rule-parameters/history?scope=${encodeURIComponent(modelo)}&limit=50`)).datos.entries;
/** Imágenes del PDF del planteamiento (el logo siempre es una; cada dibujo del taller, otra). */
async function imagenesDelPdf(order) {
  const r = await fetch(`${BASE_URL}/api/planteamiento`, json('POST', { order }));
  assert.equal(r.status, 200, `planteamiento: ${r.status}`);
  return (Buffer.from(await r.arrayBuffer()).toString('latin1').match(/\/Subtype \/Image/g) ?? []).length;
}
const pedido = (parameters, awning) => ({
  orderCode: 'PRUEBA', customer: 'PRUEBA DIBUJOS', technician: 'IVÁN', reviewer: 'JAIME', parameters,
  fabric: 'ACRILI2170P120|||120|||ACR NEGRO', sameFabric: true, awnings: [{ id: 'a', of: '0200001', units: 1, width: 300, projection: 250, ...awning }]
});
async function capturas(page, nombre) {
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    await page.setViewportSize({ width, height });
    for (const tema of ['light', 'dark']) {
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, tema);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${SALIDA}/${nombre}-${width}-${tema === 'light' ? 'claro' : 'oscuro'}.png` });
    }
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await page.setViewportSize({ width: 1600, height: 1000 });
}
const irAParametros = (page) => page.getByRole('button', { name: 'Parámetros', exact: true }).click();
const irAModelo = (page, nombre) => page.getByRole('navigation', { name: 'Modelos de parámetros' }).locator('button')
  .filter({ has: page.getByText(nombre, { exact: true }) }).click();

const { browser, page, errors } = await openApp();
try {
  // ── 1. Parámetros › Enrollable: «Lo que sale hoy» y un dibujo «Solo a mano» guardado sin motivo ──
  await irAParametros(page);
  await irAModelo(page, 'Enrollable');
  const dibujos = page.locator('.drawing-parameters');
  await dibujos.locator('.drawing-today img').nth(1).waitFor({ timeout: 30000 });
  assert.equal(await dibujos.locator('.drawing-today-item').count(), 2, 'Enrollable: general y cambio enrollable');
  console.log('OK: «Lo que sale hoy» de Enrollable enseña sus dos miniaturas');
  await dibujos.getByRole('button', { name: 'Añadir dibujo', exact: true }).click();
  const tarjeta = dibujos.locator('.drawing-rule').last();
  await tarjeta.getByLabel('Nombre del dibujo').fill(PLANO);
  await tarjeta.locator('input[type=file]').setInputFiles(LOGO);
  await tarjeta.locator('.drawing-rule-image img').waitFor();
  assert.equal(await tarjeta.getByRole('group', { name: 'Cómo se usa' }).getByRole('button', { name: 'Solo a mano', exact: true }).getAttribute('aria-pressed'), 'true', 'un dibujo nuevo empieza «Solo a mano»');
  const barra = page.getByRole('region', { name: 'Guardar el modelo' });
  await barra.getByText('Cambios sin guardar en Enrollable').waitFor();
  assert.equal(await page.getByRole('button', { name: 'Guardar para todos' }).count(), 0, 'la barra común no sale con toldos');
  await capturas(page, 'parametros-enrollable-sin-guardar');
  await barra.getByRole('button', { name: 'Guardar', exact: true }).click();
  await barra.getByText('Modelo guardado').waitFor();
  const deEnrollable = await historial('ENROLLABLE');
  assert.equal(deEnrollable[0].motivo, '', 'guardado sin motivo');
  assert.equal(deEnrollable[0].updatedBy, 'IVÁN');
  assert.ok(deEnrollable[0].resumen.includes(`Dibujo «${PLANO}» añadido`), JSON.stringify(deEnrollable[0].resumen));
  assert.ok(!JSON.stringify(await historial('ARZUA PRO')).includes(PLANO), 'Arzúa Pro no ve el cambio del Enrollable');
  await page.locator('.parameters-history summary').click();
  await page.getByText(`Dibujo «${PLANO}» añadido`).first().waitFor();
  await capturas(page, 'parametros-enrollable-historial');
  await page.locator('.parameters-history summary').click();
  await irAModelo(page, 'Arzúa Pro');
  assert.ok((await page.locator('.parameters-history summary').innerText()).startsWith('Arzúa Pro'), 'el historial de arriba es el de Arzúa Pro');
  await page.locator('.parameters-history summary').click();
  assert.equal(await page.getByText(`Dibujo «${PLANO}» añadido`).count(), 0, 'el historial de Arzúa Pro no enseña el del Enrollable');
  await page.locator('.parameters-history summary').click();
  console.log('OK: guardado sin motivo, con su resumen, y su historial no sale en Arzúa Pro');

  // ── 2. Cortina: un automático con condición (por la API, como otro puesto) ──
  const actual = (await api('/api/rule-parameters')).datos;
  const dibujo = { id: `velcro-${vuelta.toLowerCase()}`, name: VELCRO, usage: 'auto', enabled: true, image: IMAGEN, conditions: [{ field: 'curtainFinish', value: 'VELCRO' }] };
  const guardar = await api('/api/rule-parameters/models/CORTINA', json('PUT', {
    baseVersion: actual.modelos.CORTINA?.version ?? 0, updatedBy: 'IVÁN',
    parameters: { ...actual.parameters, drawings: { byModel: { ...actual.parameters.drawings.byModel, CORTINA: [dibujo, ...(actual.parameters.drawings.byModel.CORTINA ?? [])] } } }
  }));
  assert.equal(guardar.status, 200, JSON.stringify(guardar.datos));
  await page.reload();
  await irAParametros(page);
  await irAModelo(page, 'Cortina');
  await page.locator('.drawing-today-item').filter({ hasText: 'Sin ventana · velcro' }).getByText(`«${VELCRO}» lo sustituye siempre.`).waitFor();
  await page.locator('.drawing-today-item').filter({ has: page.getByText('Sin ventana', { exact: true }) }).getByText('Sale el de la web.').waitFor();
  await capturas(page, 'parametros-cortina-lo-que-sale-hoy');
  const parametros = (await api('/api/rule-parameters')).datos.parameters;
  const cortina = (curtainFinish) => pedido(parametros, { model: 'CORTINA', device: 'MAQ. INTERIOR', curtainHasWindow: false, curtainFinish });
  assert.equal(await imagenesDelPdf(cortina('VELCRO')), (await imagenesDelPdf(cortina('NORMAL'))) + 1, 'el automático de Cortina solo sale con velcro');
  console.log('OK: el automático con condición sustituye solo a sus variantes y sale en el PDF cuando se cumple');

  // ── 3. Nuevo pedido: elegir en la tarjeta el dibujo «Solo a mano» y verlo en el panel ──
  const enrollable = (patch = {}) => pedido(parametros, { model: 'ENROLLABLE', ...patch });
  const id = (await historial('ENROLLABLE'))[0].overrides.drawings.byModel.ENROLLABLE.find((d) => d.name === PLANO).id;
  assert.equal(await imagenesDelPdf(enrollable({ workshopDrawingId: id })), (await imagenesDelPdf(enrollable())) + 1, 'el elegido a mano sale en el PDF');
  await page.getByRole('button', { name: 'Nuevo pedido', exact: true }).click();
  await addAwning(page, 'Enrollable');
  await pick(page, 'Dibujo de confección', new RegExp(`^${PLANO} \\(taller\\)$`));
  const tarjetaToldo = page.locator('.awning-grid');
  assert.ok((await tarjetaToldo.getByRole('combobox', { name: 'Dibujo de confección', exact: true }).innerText()).includes(`${PLANO} (taller)`));
  // Datos mínimos para que el toldo se calcule y el panel pinte su PDF. Si tras el trabajo de Codex la
  // tela del pedido cambia de sitio, ajustar solo este paso.
  await page.getByLabel('OF', { exact: true }).fill('0200001');
  await page.getByLabel('Frente', { exact: true }).fill('300');
  await page.getByLabel('Salida', { exact: true }).fill('250');
  await chooseFabric(page, 'ACRILI2170');
  await tarjetaToldo.getByRole('button', { name: 'Despiece y dibujo', exact: true }).click();
  const panel = page.getByRole('dialog', { name: /Despiece y dibujo del toldo/ });
  await panel.getByRole('tab', { name: 'Dibujo', exact: true }).click();
  await panel.getByText('elegido en la tarjeta').waitFor();
  await panel.locator('.pdf-carousel-canvas img').first().waitFor({ timeout: 30000 });
  await capturas(page, 'tarjeta-panel-dibujo-elegido');
  console.log('OK: el dibujo «Solo a mano» se elige en la tarjeta y el panel dice que sale ese');

  // ── 4. «Automático cuando…» en pantalla: condiciones con valores reales ──
  await page.keyboard.press('Escape');
  await irAParametros(page);
  await irAModelo(page, 'Cortina');
  const nuevo = page.locator('.drawing-parameters');
  await nuevo.getByRole('button', { name: 'Añadir dibujo', exact: true }).click();
  const tarjetaNueva = nuevo.locator('.drawing-rule').last();
  await tarjetaNueva.getByRole('group', { name: 'Cómo se usa' }).getByRole('button', { name: 'Automático cuando…', exact: true }).click();
  await tarjetaNueva.getByRole('button', { name: 'Añadir condición', exact: true }).click();
  const campos = await tarjetaNueva.getByLabel('Campo de la condición').locator('option').allInnerTexts();
  assert.ok(campos.includes('Confección') && !campos.includes('Tipo de guía'), JSON.stringify(campos));
  await capturas(page, 'parametros-cortina-condiciones');
  await page.getByRole('region', { name: 'Guardar el modelo' }).getByRole('button', { name: 'Descartar cambios', exact: true }).click();
  await page.getByRole('region', { name: 'Guardar el modelo' }).getByRole('button', { name: 'Descartar', exact: true }).click();
  await page.getByRole('region', { name: 'Guardar el modelo' }).getByText('Modelo guardado').waitFor();
  console.log('OK: las condiciones ofrecen solo los campos del modelo; descartar vuelve a lo guardado');

  assert.deepEqual(errors, [], `errores en la consola: ${errors.join(' | ')}`);
  console.log(`OK: prueba de dibujos y versiones terminada. Capturas en ${SALIDA}/`);
} finally {
  await browser.close();
}
```

- [ ] **Step 2: La e2e de Bambalina guarda con la barra del modelo**

En `scripts/test-bambalina-workflow.mjs` (CRLF; editar con Edit), sustituir:

```js
  // Desde la fase 3 los parámetros son comunes: se guardan para todos con técnico y motivo.
  await page.getByRole('button', { name: 'Guardar para todos' }).first().click();
  const saveDialog = page.getByRole('dialog', { name: 'Guardar para todos los puestos' });
  await saveDialog.getByRole('combobox', { name: 'Quién hace el cambio', exact: true }).click();
  await page.getByRole('option', { name: 'Iván' }).click();
  await saveDialog.getByLabel('Motivo', { exact: true }).fill('Prueba de extremo a extremo');
  await saveDialog.getByRole('button', { name: 'Guardar para todos' }).click();
  await page.getByText('Parámetros guardados').waitFor();
```

por:

```js
  // Desde el 02/10/2026 cada modelo se guarda con la barra de su ficha: quién es el «Soy» y el
  // motivo, opcional. El remate de bambalina es de lo común de los trabajos de tela.
  const modelBar = page.getByRole('region', { name: 'Guardar el modelo' });
  await modelBar.getByText('Cambios sin guardar en').waitFor();
  await modelBar.getByLabel('Motivo (opcional)', { exact: true }).fill('Prueba de extremo a extremo');
  await modelBar.getByRole('button', { name: 'Guardar', exact: true }).click();
  await modelBar.getByText('Modelo guardado').waitFor();
```

- [ ] **Step 3: Pasar las e2e**

Run (con la aislada de 4315 arrancada y `pnpm exec vite build` hecho): `TOLDOS_ISOLATED_URL=http://127.0.0.1:4315 node scripts/test-dibujos-e2e.mjs`
Expected: cinco líneas `OK: …` y la final; capturas en `tmp/ui-audit/dibujos-y-versiones/`. Mirar todas (claro y oscuro, 1280×720 y 1600×1000): la barra del modelo, «Lo que sale hoy», las condiciones y el panel tienen que verse como CoordinaOT (vidrio, teclas 3D, colores de los tokens) y nada se sale ni se tapa a 1280×720. Arreglar en los ficheros de las tareas 5–7 lo que no.

Run: `pnpm test:e2e:bambalina`
Expected: termina sin errores (arranca su propio servidor).

- [ ] **Step 4: Documentación**

En `README.md`, antes de `### Fichas de cliente de remolques`:

```md
### Parámetros de toldos: versiones por modelo y dibujos

Cada modelo de Parámetros (y lo común de los trabajos de tela) tiene su versión e historial. Se guarda
con la barra de su ficha: quién guarda es el «Soy» y el motivo es opcional; el historial de arriba, el
del modelo que se ve, dice solo qué cambió («Margen de caída: 45 → 50», «Dibujo «Plano» añadido»).
Solo hay conflicto si otro puesto guardó ese mismo modelo. Por debajo:
`PUT /api/rule-parameters/models/:modelo` y `GET /api/rule-parameters/history?scope=:modelo`
(`PUT /api/rule-parameters` sigue para pestañas abiertas con la web anterior). El fichero
(`rule-parameters.json`) sigue guardando solo lo que difiere del código y la versión de todo el
fichero; el de antes se lee tal cual y su historial se reparte por modelo al leerlo; el primer
guardado escribe el formato nuevo de una vez. Un fichero que no se puede leer no se sobrescribe.

En cada modelo, «Dibujos» enseña «Lo que sale hoy» (el dibujo de la web de cada variante, hecho por el
mismo código que el PDF con un toldo de ejemplo, y el dibujo del taller que lo sustituye) y los
dibujos del taller, cada uno «Solo a mano» o «Automático cuando…» con condiciones de valores reales
del modelo. En la tarjeta del toldo, «Dibujo de confección» deja elegir un dibujo del taller o un
trabajo especial, y «Automático (sale: …)» dice cuál sale. Precedencia en el PDF: imagen del toldo,
elegido a mano, automático del taller, dibujo de la web.
```

En `.claude/skills/running-toldos-testar/SKILL.md` (CRLF), después de la línea del buscador (`TOLDOS_ISOLATED_URL=http://127.0.0.1:4314 node scripts/test-remolques-buscador-e2e.mjs`):

```md
- La e2e de los dibujos y las versiones por modelo usa su propia aislada, porque guarda parámetros:
  `ISOLATED_DIR="$PWD/tmp/dibujos" PORT=4315 FAKE_COORDINA_PORT=4325`, y
  `TOLDOS_ISOLATED_URL=http://127.0.0.1:4315 node scripts/test-dibujos-e2e.mjs` (se puede repetir).
```

- [ ] **Step 5: Batería completa**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: todo PASS (también la paridad de remolques), sin errores y build terminado.

- [ ] **Step 6: Commit y subida**

```bash
git add scripts/test-dibujos-e2e.mjs scripts/test-bambalina-workflow.mjs README.md .claude/skills/running-toldos-testar/SKILL.md
git commit -m "test(dibujos): e2e de los dibujos y las versiones por modelo, y su documentación

Sube un dibujo «Solo a mano» en Enrollable y lo guarda sin motivo, mira
que su historial lo cuenta y no sale en Arzúa Pro, lo elige en la tarjeta
y lo ve en el panel y en el PDF; un automático de Cortina con condición
sustituye solo a sus variantes. La e2e de Bambalina guarda ya con la barra
del modelo. El README y la guía de la aislada lo cuentan.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git pull --rebase
git push origin main
```

(Desde el worktree de Codex: `git pull --rebase origin main` y `git push origin HEAD:main`.)

---

### Task 9 *(tardía, opcional)*: Limpiar la barra común de toldos en `App.tsx`

> **Requiere que Codex haya subido su trabajo a main** (`App.tsx` está en su rediseño de Nuevo pedido). Antes de empezar: `git pull --rebase` y comprobar con `git log origin/main --oneline -- src/client/App.tsx` que su commit está. Si no, no se hace: todo funciona sin esta tarea.

Modelo recomendado: el más barato (el código está completo). Esfuerzo: bajo.

**Files:**
- Modify: `src/client/App.tsx`, `src/client/hooks/useParameters.ts` (CRLF)

**Interfaces:**
- Consumes: `ParametersHistory` sin props (modo modelo, tarea 5); `useParameters()`.
- Produces: `useParameters().dirty` vuelve a ser `estado.draft !== null`; `App` pinta `ParametersSaveBar` solo para Remolques › Generales.

- [ ] **Step 1: `App.tsx`**

1. La línea del historial de toldos (`: <ParametersHistory key="toldos" version={ruleSettings.version} onLoadVersion={ruleSettings.loadVersion} />)}`) pasa a `: <ParametersHistory key="toldos" />)}`.
2. El `<ParametersSaveBar … />` de `activeTab === 'parameters'` pasa a:

```tsx
            {/* Toldos se guarda por modelo con la barra de su ficha (ParametersView); esta es la de Remolques › Generales. */}
            {showRemolquesParameters && !enFichasClientes && <ParametersSaveBar
              dirty={remolquesSettings.dirty}
              saving={remolquesSettings.saving}
              technicians={formOptions.tecnicos}
              onDiscard={() => void discardParameterDraft()}
              onSave={remolquesSettings.saveDraft}
              onResult={notifyParameterSave}
            />}
```

3. En `discardParameterDraft`, el `if (choice === 'confirm') { … }` pasa a `if (choice === 'confirm') remolquesSettings.discardDraft();`.

(Si Codex movió estas líneas, aplicar el mismo cambio donde estén ahora; mantener los finales de línea del fichero, que mezcla CRLF y LF.)

- [ ] **Step 2: `useParameters.ts`**

Sustituir las tres líneas del comentario y `dirty: false,` por:

```ts
    dirty: estado.draft !== null,
```

- [ ] **Step 3: Batería, e2e y commit**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`, y con la aislada de 4315: `TOLDOS_ISOLATED_URL=http://127.0.0.1:4315 node scripts/test-dibujos-e2e.mjs`
Expected: todo PASS.

```bash
git add src/client/App.tsx src/client/hooks/useParameters.ts
git commit -m "refactor(parametros): la barra común de arriba queda solo para remolques

Desde el guardado por modelo, los toldos se guardan con la barra de cada
ficha y useParameters decía «sin cambios» para que la barra común no
saliera, porque App.tsx estaba en obras de Codex. Con su trabajo ya en
main, App deja de pasarle los toldos y el historial de arriba se pide sin
props: el del modelo que se ve.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git pull --rebase
git push origin main
```

---

## Después del plan

- Revisión final de toda la rama con el modelo más capaz (Opus, esfuerzo alto): que ningún fichero de Codex ni de la paridad se ha tocado (salvo `App.tsx` en la tarea 9), que el almacén nunca escribe al leer y que con el fichero y el historial reales de producción (copiados a `tmp/`, sin subirlos) `get()` da las mismas `parameters` que la web de antes y cada modelo su historial; que calcular un pedido, corregir una revisión (`loadParameters`) y generar archivos siguen igual; y que Remolques › Generales y las fichas no han cambiado.
- **Para Iván, al desplegar** (en una línea; la copia es por si hubiera que volver atrás, no hace falta migrar nada a mano): `cp /var/lib/toldos-testar/rule-parameters.json /var/lib/toldos-testar/rule-parameters.json.antes-2026-10-02 && cp /var/lib/toldos-testar/rule-parameters-history.jsonl /var/lib/toldos-testar/rule-parameters-history.jsonl.antes-2026-10-02 && pnpm install && pnpm build && pnpm deploy:check && pnpm pm2:reload` (si el fichero está en otra ruta, la de `RULE_PARAMETERS_FILE` del `.env`).
- **Para Iván, dos preguntas:** (1) la hoja de revisión (`reviewSheetEntries.js`) sigue diciendo solo el trabajo especial en «Dibujo de confección»; ¿quiere que diga también el dibujo del taller elegido? (2) ¿Los nombres del resumen del historial («Frente máximo», «Margen base de paño»…) le valen así o prefiere otros en algún modelo?
- Los dibujos de Parámetros que hoy tienen condiciones que no casan con un valor real saldrán marcados «(revisar)»: conviene que alguien de OT los mire modelo a modelo después del despliegue.

## Cobertura del spec

| Spec | Tarea |
| --- | --- |
| Problema: un dibujo de Parámetros no se puede elegir en la tarjeta | 1 (`selectableDrawings`, `resolveChosenDrawing`), 7 |
| Problema: la tarjeta dice «Automático» sin decir cuál sale | 1 (`resolveAutomaticDrawing`), 7 («Automático (sale: …)») |
| Problema: condiciones como campo interno + valor escrito a mano | 1 (`drawingConditionOptions`), 6 (desplegables) |
| Problema: no se ve qué dibujo de la web sale en cada modelo y variante | 1 (`webDrawingVariants`), 4 (miniatura), 6 («Lo que sale hoy») |
| Problema: una sola versión para todos los modelos y motivo obligatorio | 2, 3, 5 |
| Decisión 1: cada dibujo decide cómo se usa; los automáticos también se eligen a mano | 1, 6, 7 |
| Decisión 2: versiones por modelo; una versión del Enrollable no aparece en otro modelo | 2, 3, 5, 8 |
| Decisión 3: motivo opcional; basta el «Soy»; el historial dice qué cambió | 2 (`scopeChangeSummary`), 3, 5 (`ModelSaveBar`), 8 |
| Decisión 4: no pisar a Codex; lo que toque `App.tsx` espera | Decisiones del plan (estado compartido, `dirty: false`), 9 (marcada) |
| 1. «Lo que sale hoy»: variantes con la miniatura y, si un dibujo del taller la sustituye, cuál; mismo código que el PDF con un toldo de ejemplo | 1, 4 (`drawFabricDiagram`, `buildFabricDiagramPreviewPdf`), 6 |
| 1. «Dibujos del taller»: nombre, imagen, «Cómo se usa» (Solo a mano / Automático cuando… con desplegables de valores reales; sin condiciones = siempre); activar, cambiar imagen, quitar | 6 |
| 1. Los dibujos guardados se conservan: sin condiciones → Automático (siempre); con condiciones → Automático cuando…; los que no casan, marcados para revisar | 1 (`usage` por defecto `auto`, `drawingConditionNeedsReview`), 6 |
| 2. Tarjeta: «Automático (sale: …)», dibujos del taller del modelo por su nombre y el trabajo especial | 7 |
| 2. Lo elegido se guarda en el toldo y sale en el PDF; precedencia imagen > a mano > automático > web | 1, 7 (`workshopDrawingId` en `validation.js`, `useDraft.ts`), 8 (PDF) |
| 2. Si un dibujo elegido se quita o desactiva, la tarjeta avisa y vuelve a «Automático» | 1 (`chosenDrawingMissing`), 7 |
| 3. Cada modelo (y los apartados comunes) con su versión e historial; 409 solo si otro guardó ese mismo modelo | 2 (`parameterScopes`, `COMMON_FABRIC_SCOPE`), 3 |
| 3. Guardar pide «Soy»; motivo opcional | 3 (`author`), 5 (`readCurrentUser`) |
| 3. Historial automático por modelo con quién, cuándo, motivo y resumen; «Cargar esta versión» por modelo | 2 (`parameterHistory`), 3, 5 (`ParametersHistory` modo modelo, `cargarVersionModelo`) |
| 3. Lo ya guardado se respeta: fichero e historial global se leen tal cual; el historial se reparte por modelo; el primer guardado escribe el formato nuevo de forma atómica | 2 (`scopeHistory`, `scopeVersions`), 3 (pruebas «lo que ya está guardado en el servidor») |
| 3. «Restaurar valores por defecto» por modelo | 5 (`restaurarAmbitos(pageScopes(modelo))`) |
| 3. Los parámetros de remolques (Generales) siguen como están | Global Constraints; 5 (`ParametersHistory` con `endpoint`), 9 |
| Pruebas unitarias: resolución del dibujo (precedencias, a mano, automático, condiciones con valores reales) | 1 |
| Pruebas unitarias: migración de los dibujos y del historial | 1 (`usage` por defecto), 2, 3 |
| Pruebas unitarias: versiones por modelo (409 por modelo, guardados concurrentes de modelos distintos), resumen de cambios | 2, 3, 5 |
| e2e: dibujo «Solo a mano» en Enrollable, elegirlo en la tarjeta, verlo en la vista previa del PDF; automático con condición; historial del Enrollable no aparece en Arzúa Pro; guardar sin motivo | 8 |
