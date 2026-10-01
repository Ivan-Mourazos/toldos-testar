# Remolques · fase 5: flujo (revisión, CoordinaOT, generar, historial y migración) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un pedido de remolques siga en Planteamientos TGM el mismo camino que uno de toldos —guardar para revisión, aprobar en CoordinaOT, generar los dos PDF con el revisor puesto y sus datos dentro, quedar en «Generados» y poder corregirse o reutilizarse— y que lo guardado en la web vieja pase a la nueva con un comando.

**Architecture:** Cuatro capas. (1) Reglas puras del pedido de remolques en `src/remolques/flujo/` (`tipos`, `pedido`) que reutilizan las de toldos de `src/reviewRules.js` sin copiarlas; los campos de fuera se llaman como los de toldos (`orderCode`, `status`, `summary`…) para que Pedidos los trate igual. (2) Un almacén de un JSON por pedido en la carpeta interna (`REMOLQUES_REVISION_DIRECTORY` → Configuración), el adjunto JSON dentro del PDF (`pdf-lib`) y un servicio (`servicio.ts`) con guardar, listar, abrir, vista previa, generar (bloqueo por pedido, CoordinaOT en fresco, `archivarPdfRemolques`) y abrir el generado; `src/server.js` solo pone las rutas. (3) En la web: «Guardar para revisión» y la carga de un pedido guardado en `useRemolques`, el detalle del pedido de remolques, y la bandeja de Pedidos con los dos tipos, su etiqueta y un filtro. (4) El paso desde la web vieja: planificador puro + comando `scripts/migrar-remolques.mjs` con `--simular`.

**Tech Stack:** TypeScript (el servidor lo ejecuta sin compilar, Node ≥ 22.18), React 19, Express 5 (rutas en `src/server.js`, JS), `pdf-lib` 1.17.1 (nuevo: adjuntar el JSON al PDF de Chromium), `pdfjs-dist` (leer el adjunto), `playwright-core` (servicio de PDF de la fase 4), vitest (entorno node), Playwright para la e2e en una instancia aislada.

**Spec:** `docs/superpowers/specs/2026-10-01-remolques-fase-5-flujo-design.md` (**sin su apartado 5**, Parámetros › Remolques, que hace Codex aparte: `tmp/codex/tarea-5.md`). Diseño general: `docs/superpowers/specs/2026-09-29-unificacion-remolques-design.md`. Fase 4: `docs/superpowers/specs/2026-09-30-remolques-fase-4-salidas-design.md` y `docs/superpowers/plans/2026-09-30-remolques-fase-4.md`. Web vieja (**solo lectura**): `Remolques-TGM` (commit `a7ffef0`), `src/lib/store/*`, `src/lib/pedidos/estado-pedido.ts`.

## Decisiones del plan (lo que el spec no fija)

- **Rutas propias para remolques** (`/api/remolques/pedidos…`): las de toldos (`/api/reviews…`) no cambian. La web junta las dos listas.
- **Un número es de toldos o de remolques** (regla «sin pedidos mixtos»): guardar un remolque con un número que ya está como pedido de toldos responde 409.
- **«Solo el autor genera»** se comprueba en la web, como en toldos (`canGenerateReview` / `generateState` tampoco lo comprueba el servidor de toldos).
- **Los parámetros viajan con el pedido**: «Guardar para revisión» manda los parámetros con que se ve la pantalla (`params`, validados con `validarParams`); «Corregir» vuelve a ellos y la vista previa del PDF de la pantalla los manda también (cambio pequeño en `POST /api/remolques/pdf`: `params` opcional). «Reutilizar» usa los actuales.
- **Antes de hacer el PDF se mira si ya está en las carpetas** (409 `needsConfirmation` con los nombres): así no se hace la hoja en Chromium para luego preguntar. `archivarPdfRemolques` lo vuelve a comprobar al escribir.
- **Migración**: se pasan los números con forma de pedido de RPS (`FORMA_PEDIDO_RPS`, dos letras y cinco cifras o más). Lo demás (`SMOKE-TEST`, `TEST-001`, sin número) queda en el informe como «sin pasar». Generado = `data/pedidos.json` dice que se archivó (dos rutas y sin cambios después, como `estadoVisiblePedido` de la web vieja) **o** su PDF ya está en una de las dos carpetas de remolques (solo se mira con `stat`). Cada elemento conserva su `paramsSnapshot` tal cual (así sus resultados salen iguales al recalcular); `params` del pedido es el del último guardado pasado por `normalizarParams`.
- La columna «Toldos» de Pedidos pasa a llamarse «Elementos» (vale para los dos tipos). La etiqueta «Toldo»/«Remolque» va delante de los modelos, con el color de familia de CoordinaOT.

## Global Constraints

- Solo escritorio (1280×720 a 1920); no adaptar a móvil.
- Textos de la interfaz y comentarios en castellano llano; decimales con coma (`toLocaleString('es-ES')`). No citar el Excel en la interfaz.
- Diseño igual que CoordinaOT: tokens y piezas de `src/client/coordina/` (`ghost-button`, `primary-button`, `boton-3d`, `bloque-3d`, `chip-3d`, `familia-tag`, `tira-3d glass-chip`, `pestana-activa`, `pdf-preview-backdrop`, `pdf-preview-window`), en claro y oscuro. Colores de familia de CoordinaOT (`src/lib/familia.ts`): «Toldos» `#c65a11`, «Remolques» `#5a6472`.
- Nunca arrancar la web con el `.env` real: solo la instancia aislada `bash .claude/skills/running-toldos-testar/start-isolated.sh` (puerto 4310). Si otro agente puede estar en 4310: `PORT=4311 FAKE_COORDINA_PORT=4321`. Codex usa 4312. La e2e de esta fase va además con `ISOLATED_DIR="$PWD/tmp/remolques-5"` (su propia configuración). Comprobar `/api/health`: `simulationMode` true y `fileWritesEnabled` false al arrancar.
- En las pruebas no se escribe nada fuera de `tmp/` del repositorio: carpetas temporales con `mkdtempSync(path.join(process.cwd(), "tmp", …))`, nunca `os.tmpdir()`.
- RPS (solo `SELECT`) y la web vieja (`Remolques-TGM`, `/webs/remolques-tgm`) son de solo lectura. El comando de migración solo lee de ellas y de las carpetas compartidas (`stat`), y solo escribe en la carpeta interna de remolques. No se toca el servidor 192.168.0.90 (despliega Iván).
- La paridad no se toca: `src/remolques/paridad-produccion.test.ts`, `src/client/remolques/resultados-paridad.test.tsx`, `src/remolques/hoja/__tests__/paridad-hoja.test.ts` y sus fixtures siguen pasando sin cambiarlos.
- No tocar `src/client/views/ParametersView.tsx`, la pestaña Parámetros ni `src/remolquesParametersStore.js` (lo hace Codex): solo se lee `GET /api/remolques/parametros` / `remolquesParametersStore.get()`.
- Toldos sigue igual: `/api/reviews…`, su PDF, su generación y sus e2e (`scripts/test-coordina-approval-e2e.mjs`) no cambian de comportamiento.
- Estados `PENDING_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `PRODUCED` y las reglas de `src/reviewRules.js` (`saveReviewDecision`, `reviewAuthorship`, `generateFilesDecision`, `generationBlock`, `coordinaGroup`, `approvalReviewers`, `reviewerName`, `normalizeOf`, `uniqueOfs`): se importan, no se copian.
- «Generar archivos» pregunta a CoordinaOT siempre en fresco (`statusOf(ofs, { fresh: true })`); si no responde, no se genera (503). Un bloqueo por pedido («Ya se están generando los archivos de este pedido.», 409). Nada se escribe con `productionEnabled` false (403).
- Mismos nombres y carpetas que la web vieja: `AR…-10.pdf` en `remolquesPlanteamientosDirectory` y `<año>/AR….pdf` en `remolquesOficinaTecnicaDirectory`, con `archivarPdfRemolques` (escritura atómica; 409 si existe y no se pide `sustituir`). Sin subcarpeta `REMOLQUES`.
- Carpeta interna: semilla `REMOLQUES_REVISION_DIRECTORY` → `remolquesRevisionDirectory` de Configuración; ruta absoluta y sin `{YYYY}`; un fichero `<ORDERCODE>.json` por pedido (número normalizado, `AR2604286.json`), escritura atómica; recomendada `/var/lib/toldos-testar/remolques-pedidos`.
- Adjunto del PDF: `<ORDERCODE>.remolques.json`, `application/json`, con el pedido ya en `PRODUCED`, en los dos PDF (son el mismo fichero).
- Dependencia nueva: `pdf-lib` con versión exacta `1.17.1` en `dependencies`.
- Commits en castellano explicando el porqué, terminando en `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. `git add` con rutas explícitas; nada de `git add -A`, stash, reset ni checkout de ficheros ajenos. `git pull --rebase` antes de cada `git push` (Codex sube a `main` a la vez). Mantener los finales de línea de cada fichero.
- Antes de subir: `pnpm test && pnpm typecheck && pnpm lint`, y `pnpm exec vite build` si se toca el cliente.
- Pantallas cambiadas: capturas con Playwright en la aislada, claro y oscuro, 1280×720 y 1600×1000, en `tmp/ui-audit/remolques-5/`, y mirarlas.

## Mapa de ficheros

Crear:
- `src/remolques/flujo/tipos.ts` — `PedidoRemolques` y sus piezas (esquema 1, `kind: "remolques"`).
- `src/remolques/flujo/pedido.ts` — reglas puras: clave, resumen para Pedidos, letras y OF para CoordinaOT, crear, marcar generado, año. Sin Node: lo usa también la web.
- `src/remolques/flujo/almacen.ts` — un JSON por pedido en la carpeta interna.
- `src/remolques/flujo/adjunto.ts` — el pedido dentro del PDF (`pdf-lib`) y su lectura (`pdfjs-dist`).
- `src/remolques/flujo/servicio.ts` — el flujo del servidor (guardar, listar, abrir, vista previa, generar, archivo).
- `src/remolques/flujo/migracion.ts` — plan, aplicación e informe del paso desde la web vieja.
- `src/remolques/flujo/__tests__/pedido.test.ts`, `almacen.test.ts`, `adjunto.test.ts`, `servicio.test.ts`, `migracion.test.ts`
- `scripts/migrar-remolques.mjs` — el comando para el .90.
- `src/client/remolques/guardarPedido.ts` + `guardarPedido.test.ts` — cuerpo de «Guardar» y líneas desde un pedido guardado.
- `src/client/remolques/generarPedido.ts` + `generarPedido.test.ts` — quién y cuándo puede generar.
- `src/client/remolques/PedidoRemolquesDetalle.tsx` + `PedidoRemolquesDetalle.test.tsx` — el pedido de remolques abierto en Pedidos.
- `src/client/hooks/listaPedidos.ts` + `listaPedidos.test.ts` — las dos listas de un año.
- `src/client/components/OrdersInbox.test.tsx` — la bandeja con los dos tipos.
- `scripts/test-remolques-5-e2e.mjs` — prueba de punta a punta.

Modificar:
- `src/reviewRules.js`, `src/reviewRules.test.js` — `generationBlock` con «elemento».
- `src/remolques/hoja/tipos.ts`, `src/remolques/hoja/pagina.ts`, `src/remolques/hoja/__tests__/pagina.test.ts`, `src/client/hoja/prepararHoja.ts`, `src/client/hoja/prepararHoja.test.ts` — «REVISADO POR».
- `src/config.js`, `src/config.test.js`, `src/workflow.js`, `src/workflow.test.js`, `src/client/types.ts`, `src/client/views/SettingsView.tsx` — carpeta interna.
- `scripts/check-deployment.mjs`, `scripts/lib/deploy-remolques.mjs`, `scripts/lib/deploy-remolques.test.mjs`, `.env.example`, `.env.production.example`, `README.md`.
- `.claude/skills/running-toldos-testar/start-isolated.sh`, `.claude/skills/running-toldos-testar/SKILL.md` — `ISOLATED_DIR` y la carpeta interna.
- `package.json`, `pnpm-lock.yaml` — `pdf-lib`.
- `src/server.js` — servicio y rutas.
- `src/client/remolques/useRemolques.ts`, `useRemolques.test.ts`, `RemolquesView.tsx`, `VistaPreviaPdf.tsx`, `vistaPrevia.ts`, `vistaPrevia.test.ts`.
- `src/client/ordersInbox.ts`, `src/client/ordersInbox.test.ts`, `src/client/components/OrdersInbox.tsx`, `src/client/hooks/usePendingReviews.ts`, `src/client/views/ReviewsView.tsx`, `src/client/App.tsx`.
- `src/client/coordina/pedidos.css`, `src/client/coordina/remolques.css`.
- `src/remolques/README.md`.

---

### Task 1: Reglas compartidas: «elemento» en los avisos de generar y «REVISADO POR» en la hoja

Modelo recomendado: el más barato (el código está completo). Esfuerzo: bajo.

**Files:**
- Modify: `src/reviewRules.js` (función `generationBlock`)
- Modify: `src/remolques/hoja/tipos.ts` (`DatosHojaPedido`), `src/remolques/hoja/pagina.ts` (`CabeceraHoja`, `paginaHoja`), `src/client/hoja/prepararHoja.ts`
- Test: `src/reviewRules.test.js`, `src/remolques/hoja/__tests__/pagina.test.ts`, `src/client/hoja/prepararHoja.test.ts`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `AWNING_NOUNS = { one: 'toldo', many: 'toldos', none: 'El pedido no tiene toldos.' }`, `ELEMENT_NOUNS = { one: 'elemento', many: 'elementos', none: 'El pedido no tiene elementos.' }`, `generationBlock(awnings, status, nouns = AWNING_NOUNS): string | null` (con dos argumentos dice lo mismo que hoy). `DatosHojaPedido.revisadoPor?: string`. `paginaHoja(elemento, indice, total, params, revisadoPor = ""): PaginaHojaDatos`.

- [ ] **Step 1: Escribir las pruebas que fallan**

En `src/reviewRules.test.js`, añadir `ELEMENT_NOUNS,` a la lista de imports de `./reviewRules.js` (entre `COORDINA_UNAVAILABLE,` y `coordinaGroup,`) y, dentro del `describe` donde están los `it('generationBlock: …')`, justo después de `it('generationBlock: dice qué falta y cómo está', …)`:

```js
  it('generationBlock: en remolques habla de elementos', () => {
    expect(generationBlock([], { disponible: true, ofs: {} }, ELEMENT_NOUNS)).toBe('El pedido no tiene elementos.');
    expect(generationBlock([{ letter: 'A', of: '0230194' }, { letter: 'B', of: '' }], { disponible: false }, ELEMENT_NOUNS))
      .toBe('Falta la OF en el elemento B.');
    expect(generationBlock([{ letter: 'A', of: '' }, { letter: 'B', of: ' ' }], { disponible: false }, ELEMENT_NOUNS))
      .toBe('Falta la OF en los elementos A, B.');
    // Sin el tercer argumento, lo de siempre.
    expect(generationBlock([], { disponible: true, ofs: {} })).toBe('El pedido no tiene toldos.');
  });
```

En `src/remolques/hoja/__tests__/pagina.test.ts`, dentro de `describe("paginaHoja", …)`, al final:

```ts
  it("«REVISADO POR» lleva el revisor que se le pasa (al generar, el de CoordinaOT)", () => {
    const input = lona();
    const elemento = { version: "10", tipo: "lona" as const, input, result: calcLona(input, DEFAULT_PARAMS) };
    expect(paginaHoja(elemento, 0, 1, DEFAULT_PARAMS, "JAIME").cabecera.revisadoPor).toBe("JAIME");
    expect(paginaHoja(elemento, 0, 1, DEFAULT_PARAMS).cabecera.revisadoPor).toBe("");
  });
```

En `src/client/hoja/prepararHoja.test.ts`, dentro de `describe('prepararHoja', …)`, al final:

```ts
  it('pone en cada hoja el revisor que traen los datos, y vacío si no traen', () => {
    const { capturador } = capturadorFalso();
    const datos = { ...prepararPedidoHoja(muestras.varios, DEFAULT_PARAMS), revisadoPor: 'JAIME' };
    expect(prepararHoja(datos, capturador).map((h) => h.pagina.cabecera.revisadoPor)).toEqual(['JAIME', 'JAIME', 'JAIME']);
    expect(prepararHoja(prepararPedidoHoja(muestras.varios, DEFAULT_PARAMS), capturador)[0].pagina.cabecera.revisadoPor).toBe('');
  });
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `pnpm exec vitest run src/reviewRules.test.js src/remolques/hoja/__tests__/pagina.test.ts src/client/hoja/prepararHoja.test.ts`
Expected: FAIL — `ELEMENT_NOUNS` no existe (`expected 'El pedido no tiene toldos.' to be 'El pedido no tiene elementos.'`), y `revisadoPor` sale `""` en lugar de `"JAIME"`.

- [ ] **Step 3: Implementar**

En `src/reviewRules.js`, sustituir el comentario y el principio de `generationBlock`:

```js
/**
 * Por qué no se puede generar todavía, en castellano llano; null si se puede.
 * La OF que falta va primero: sin ella ni siquiera se puede preguntar a CoordinaOT.
 */
export function generationBlock(awnings, status) {
  if (awnings.length === 0) return 'El pedido no tiene toldos.';
  const withoutOf = awnings.filter((awning) => !normalizeOf(awning.of)).map((awning) => awning.letter);
  if (withoutOf.length === 1) return `Falta la OF en el toldo ${withoutOf[0]}.`;
  if (withoutOf.length > 1) return `Falta la OF en los toldos ${withoutOf.join(', ')}.`;
```

por:

```js
// Cómo se llama lo que lleva OF en los avisos de «Generar archivos»: los toldos de un pedido de
// toldos o los elementos (remolques y baquetones) de uno de remolques (fase 5).
export const AWNING_NOUNS = { one: 'toldo', many: 'toldos', none: 'El pedido no tiene toldos.' };
export const ELEMENT_NOUNS = { one: 'elemento', many: 'elementos', none: 'El pedido no tiene elementos.' };

/**
 * Por qué no se puede generar todavía, en castellano llano; null si se puede.
 * La OF que falta va primero: sin ella ni siquiera se puede preguntar a CoordinaOT.
 */
export function generationBlock(awnings, status, nouns = AWNING_NOUNS) {
  if (awnings.length === 0) return nouns.none;
  const withoutOf = awnings.filter((awning) => !normalizeOf(awning.of)).map((awning) => awning.letter);
  if (withoutOf.length === 1) return `Falta la OF en el ${nouns.one} ${withoutOf[0]}.`;
  if (withoutOf.length > 1) return `Falta la OF en los ${nouns.many} ${withoutOf.join(', ')}.`;
```

(El resto de la función no cambia.)

En `src/remolques/hoja/tipos.ts`, sustituir `DatosHojaPedido`:

```ts
/** El pedido entero que pinta la página de la hoja: una hoja por elemento, en este orden. */
export interface DatosHojaPedido {
  elementos: ElementoHoja[];
  params: CalcParams;
  /** «REVISADO POR» de la cabecera: quien aprobó en CoordinaOT (fase 5). Vacío en la vista previa. */
  revisadoPor?: string;
}
```

En `src/remolques/hoja/pagina.ts`, cambiar el comentario de `revisadoPor` en `CabeceraHoja`:

```ts
  /** Vacío en la vista previa; al generar, el revisor de CoordinaOT (fase 5). */
  revisadoPor: string;
```

y `paginaHoja`:

```ts
export function paginaHoja(elemento: ElementoHoja, indice: number, total: number, params: CalcParams, revisadoPor = ""): PaginaHojaDatos {
  return {
    ...datosHoja(elemento, indice, total),
    clave: elemento.version,
    tipo: elemento.tipo,
    cabecera: cabeceraHoja(elemento.input.cabecera, revisadoPor),
```

(lo demás igual). En `src/client/hoja/prepararHoja.ts`:

```ts
    const pagina = paginaHoja(elemento, indice, total, datos.params, datos.revisadoPor ?? '');
```

- [ ] **Step 4: Ejecutar las pruebas**

Run: `pnpm exec vitest run src/reviewRules.test.js src/remolques/hoja src/client/hoja`
Expected: PASS (todas, también `paridad-hoja.test.ts`).

- [ ] **Step 5: Commit**

```bash
git add src/reviewRules.js src/reviewRules.test.js src/remolques/hoja/tipos.ts src/remolques/hoja/pagina.ts src/remolques/hoja/__tests__/pagina.test.ts src/client/hoja/prepararHoja.ts src/client/hoja/prepararHoja.test.ts
git commit -m "feat(remolques): «REVISADO POR» en la hoja y avisos de generar con «elemento»

La fase 5 genera la hoja de remolques con el revisor de CoordinaOT y con las
mismas comprobaciones que toldos. generationBlock acepta cómo llamar a lo que
lleva OF (sin cambiar lo que dice para toldos) y la hoja recibe el revisor.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: El pedido de remolques: tipos, reglas y almacén

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio.

**Files:**
- Create: `src/remolques/flujo/tipos.ts`, `src/remolques/flujo/pedido.ts`, `src/remolques/flujo/almacen.ts`
- Test: `src/remolques/flujo/__tests__/pedido.test.ts`, `src/remolques/flujo/__tests__/almacen.test.ts`

**Interfaces:**
- Consumes: `awningLetter` (`src/domain/awningCompleteness.js`), `normalizeOf` (`src/reviewRules.js`), `nombrePerfil`, `CalcParams` (`calc/params.ts`), `LonaInput`, `LonaResult`, `CabeceraInput` (`calc/lona.ts`), `BaquetonInput`, `BaquetonResult` (`calc/baqueton.ts`), `DatosHojaPedido`, `ElementoPedidoHoja` (`hoja/tipos.ts`), `normalizarNumeroPedido` (`pedidos/numero-pedido.ts`), `errorPlanteamientoIncompleto` (`pedidos/validar-planteamiento.ts`), `anioDelPlanteamiento` (`salida/nombre-pdf.ts`), `TipoPlanteamiento` (`store/types.ts`).
- Produces (`tipos.ts`): `TIPO_PEDIDO_REMOLQUES = "remolques"`, `ESQUEMA_PEDIDO_REMOLQUES = 1`, `type EstadoPedidoRemolques`, `interface ElementoGuardado { version; tipo; input; result; paramsSnapshot: CalcParams }`, `interface FicheroGenerado { type: "pdf"; filename; savedPath }`, `interface ProduccionRemolques { createdAt; createdBy; files: FicheroGenerado[] }`, `interface ResumenElemento { letter; model; of; state: "ok" | "warn" | "error"; notes: string[] }`, `interface ResumenPedido { customer; orderDate; technician; reviewer; awnings; ofs; models; diagnostics; awningList? }`, `interface OrigenMigracion { web: "remolques-tgm"; ids: string[]; migradoEn: string }`, `interface PedidoRemolques`, `type ResumenPedidoRemolques = Omit<PedidoRemolques, "elementos" | "params">`.
- Produces (`pedido.ts`): `class ErrorPedidoRemolques extends Error { statusCode: number }`, `codigoPedido(numeroPedido: string): string`, `modeloElemento(e: { tipo; input }): string`, `elementosAprobacion(p: Pick<PedidoRemolques, "elementos">): { letter: string; of: string }[]`, `resumenElementos(elementos: ElementoGuardado[]): ResumenElemento[]`, `resumenPedido(elementos, autoria: { technician; reviewer }): ResumenPedido`, `crearPedidoRemolques({ datos, autoria, existente, ahora }): PedidoRemolques`, `marcarPedidoGenerado(p, { revisor, ficheros, ahora }): PedidoRemolques`, `resumenBandeja(p): ResumenPedidoRemolques`, `anioPedido(p: Pick<PedidoRemolques, "numeroPedido" | "summary" | "createdAt">): number`, `elementosPedidoHoja(p): ElementoPedidoHoja[]`.
- Produces (`almacen.ts`): `SIN_CARPETA_INTERNA`, `interface AlmacenPedidosRemolques { obtener; guardar; crear; listar }`, `ficheroPedido(carpeta, orderCode): string`, `crearAlmacenPedidosRemolques({ carpeta: () => Promise<string>, registrar? }): AlmacenPedidosRemolques`.

- [ ] **Step 1: Escribir las pruebas del pedido**

Crear `src/remolques/flujo/__tests__/pedido.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import casos from "../../__fixtures__/produccion-2026-09.json";
import type { BaquetonInput } from "../../calc/baqueton.ts";
import type { LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { prepararPedidoHoja } from "../../hoja/pedido.ts";
import type { ElementoPedidoHoja } from "../../hoja/tipos.ts";
import {
  anioPedido, codigoPedido, crearPedidoRemolques, elementosAprobacion, elementosPedidoHoja, marcarPedidoGenerado,
  modeloElemento, resumenBandeja,
} from "../pedido.ts";

type Caso = { caso: string; tipo: "lona" | "baqueton"; input: LonaInput | BaquetonInput };
const deFixture = (id: string, version: string, of: string): ElementoPedidoHoja => {
  const c = (casos as Caso[]).find((x) => x.caso === id)!;
  return {
    version, tipo: c.tipo,
    input: { ...c.input, cabecera: { ...c.input.cabecera, numeroPedido: "AR.26.04286", cliente: "TALLERES CAL", version, ordenFabricacion: of, fecha: "2026-09-01", realizadoPor: "OTRO" } },
  };
};
const datos = () => prepararPedidoHoja([deFixture("lona-02", "10", "231780"), deFixture("baqueton-01", "11", "0231781")], DEFAULT_PARAMS);
const AHORA = "2026-10-01T08:00:00.000Z";
const nuevo = () => crearPedidoRemolques({ datos: datos(), autoria: { technician: "IVÁN", reviewer: "" }, existente: null, ahora: AHORA });

describe("crearPedidoRemolques", () => {
  it("guarda los elementos completos con su resultado, los parámetros y el resumen para Pedidos", () => {
    const pedido = nuevo();
    expect(pedido).toMatchObject({
      schemaVersion: 1, kind: "remolques", orderCode: "AR2604286", numeroPedido: "AR.26.04286",
      status: "PENDING_REVIEW", createdAt: AHORA, updatedAt: AHORA, createdBy: "IVÁN",
      reviewedAt: null, reviewedBy: "", reviewNote: "", production: null,
      summary: {
        customer: "TALLERES CAL", orderDate: "2026-09-01", technician: "IVÁN", reviewer: "", awnings: 2,
        ofs: ["0231780", "0231781"], models: ["Arquillado con aguas", "Baquetón"], diagnostics: 0,
      },
    });
    expect(pedido.params).toBe(DEFAULT_PARAMS);
    expect(pedido.elementos.map((e) => [e.version, e.tipo, e.input.cabecera.realizadoPor])).toEqual([["10", "lona", "IVÁN"], ["11", "baqueton", "IVÁN"]]);
    expect(pedido.elementos[0].result).toEqual(datos().elementos[0].result);
    expect(pedido.elementos[1].paramsSnapshot).toBe(DEFAULT_PARAMS);
  });

  it("al volver a guardarlo conserva la fecha de creación y el autor", () => {
    const primero = nuevo();
    const segundo = crearPedidoRemolques({ datos: datos(), autoria: { technician: "IVÁN", reviewer: "JAIME" }, existente: primero, ahora: "2026-10-02T08:00:00.000Z" });
    expect(segundo).toMatchObject({ createdAt: AHORA, updatedAt: "2026-10-02T08:00:00.000Z", createdBy: "IVÁN", summary: { reviewer: "JAIME" } });
  });

  it("la clave es el número sin puntos y en mayúsculas; sin número no hay pedido", () => {
    expect(codigoPedido("ar.26.04286")).toBe("AR2604286");
    expect(() => codigoPedido("  ")).toThrow("Falta el número de pedido.");
  });
});

describe("lo que necesitan Pedidos, CoordinaOT y la hoja", () => {
  it("las letras y OF de cada elemento, en orden, con la OF en siete cifras", () => {
    expect(elementosAprobacion(nuevo())).toEqual([{ letter: "A", of: "0231780" }, { letter: "B", of: "0231781" }]);
  });

  it("el resumen de la bandeja no lleva los elementos ni los parámetros y sí el estado de cada elemento", () => {
    const resumen = resumenBandeja(nuevo());
    expect("elementos" in resumen).toBe(false);
    expect("params" in resumen).toBe(false);
    expect(resumen.summary.awningList).toEqual([
      { letter: "A", model: "Arquillado con aguas", of: "0231780", state: "ok", notes: [] },
      { letter: "B", model: "Baquetón", of: "0231781", state: "ok", notes: [] },
    ]);
  });

  it("un elemento incompleto (de la web vieja) sale con error y lo que le falta", () => {
    const p = nuevo();
    const incompleto = { ...p, elementos: [{ ...p.elementos[0], input: { ...p.elementos[0].input, altoDelante: 0 } }] };
    expect(resumenBandeja(incompleto).summary.awningList?.[0]).toMatchObject({ state: "error", notes: ["Introduce el alto delantero."] });
  });

  it("el modelo es el perfil de la lona o «Baquetón»", () => {
    const p = nuevo();
    expect(modeloElemento(p.elementos[0])).toBe("Arquillado con aguas");
    expect(modeloElemento({ tipo: "lona", input: { ...p.elementos[0].input, tipoPerfil: "" } as LonaInput })).toBe("Remolque");
    expect(modeloElemento(p.elementos[1])).toBe("Baquetón");
  });

  it("el año sale del número (AR26…) o, si no lo lleva, de la fecha", () => {
    const p = nuevo();
    expect(anioPedido(p)).toBe(2026);
    expect(anioPedido({ ...p, numeroPedido: "PEDIDO-X", summary: { ...p.summary, orderDate: "2025-12-30" } })).toBe(2025);
  });

  it("la hoja recibe los elementos sin resultado", () => {
    expect(elementosPedidoHoja(nuevo()).map((e) => Object.keys(e))).toEqual([["version", "tipo", "input"], ["version", "tipo", "input"]]);
  });
});

describe("marcarPedidoGenerado", () => {
  it("pasa a PRODUCED con sus dos PDF y apunta el revisor de CoordinaOT en el pedido y en cada elemento", () => {
    const p = nuevo();
    const ficheros = [
      { type: "pdf" as const, filename: "AR2604286-10.pdf", savedPath: "/p/AR2604286-10.pdf" },
      { type: "pdf" as const, filename: "AR2604286.pdf", savedPath: "/o/2026/AR2604286.pdf" },
    ];
    const g = marcarPedidoGenerado(p, { revisor: "JAIME", ficheros, ahora: "2026-10-03T09:00:00.000Z" });
    expect(g).toMatchObject({
      status: "PRODUCED", updatedAt: "2026-10-03T09:00:00.000Z", reviewedBy: "JAIME", reviewedAt: "2026-10-03T09:00:00.000Z",
      summary: { reviewer: "JAIME" }, production: { createdAt: "2026-10-03T09:00:00.000Z", createdBy: "IVÁN", files: ficheros },
    });
    expect(g.elementos.map((e) => e.input.cabecera.revision)).toEqual(["JAIME", "JAIME"]);
    expect(p.status).toBe("PENDING_REVIEW");
  });
});
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `pnpm exec vitest run src/remolques/flujo/__tests__/pedido.test.ts`
Expected: FAIL — `Failed to load url ../pedido.ts` (no existe).

- [ ] **Step 3: Crear los tipos**

Crear `src/remolques/flujo/tipos.ts`:

```ts
import type { BaquetonInput, BaquetonResult } from "../calc/baqueton.ts";
import type { LonaInput, LonaResult } from "../calc/lona.ts";
import type { CalcParams } from "../calc/params.ts";
import type { TipoPlanteamiento } from "../store/types.ts";

// Un pedido de remolques guardado en Planteamientos TGM (fase 5): un JSON por pedido en la carpeta
// interna de remolques. Los campos de fuera se llaman como los de un pedido de toldos (orderCode,
// status, summary…) para que Pedidos los trate igual; lo de dentro es de remolques.

export const TIPO_PEDIDO_REMOLQUES = "remolques";
export const ESQUEMA_PEDIDO_REMOLQUES = 1;

/** Los mismos estados que toldos (src/reviewRules.js). */
export type EstadoPedidoRemolques = "PENDING_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "PRODUCED";

export interface ElementoGuardado {
  version: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
  result: LonaResult | BaquetonResult;
  /** Los parámetros con que se calculó este elemento (los de la web vieja si viene de ella). */
  paramsSnapshot: CalcParams;
}

export interface FicheroGenerado {
  type: "pdf";
  filename: string;
  savedPath: string;
}

export interface ProduccionRemolques {
  createdAt: string;
  createdBy: string;
  /** Los dos PDF: el de planteamientos (AR…-10.pdf) y el de oficina técnica (<año>/AR….pdf). */
  files: FicheroGenerado[];
}

/** Lo que Pedidos enseña de cada elemento: su letra, su perfil, su OF y si está completo. */
export interface ResumenElemento {
  letter: string;
  model: string;
  of: string;
  state: "ok" | "warn" | "error";
  notes: string[];
}

export interface ResumenPedido {
  customer: string;
  orderDate: string;
  technician: string;
  reviewer: string;
  awnings: number;
  ofs: string[];
  /** Los perfiles de las lonas («Recto con aguas») y «Baquetón»: lo que busca Pedidos como modelo. */
  models: string[];
  diagnostics: number;
  /** Se calcula al listar (resumenBandeja), no se guarda. */
  awningList?: ResumenElemento[];
}

export interface OrigenMigracion {
  web: "remolques-tgm";
  ids: string[];
  migradoEn: string;
}

export interface PedidoRemolques {
  schemaVersion: typeof ESQUEMA_PEDIDO_REMOLQUES;
  kind: typeof TIPO_PEDIDO_REMOLQUES;
  /** El número normalizado (AR2604286): nombre del fichero y clave en Pedidos. */
  orderCode: string;
  /** El número tal como se escribió (AR.26.04286). */
  numeroPedido: string;
  status: EstadoPedidoRemolques;
  createdAt: string;
  updatedAt: string;
  /** El autor: quien lo guardó la primera vez. */
  createdBy: string;
  reviewedAt: string | null;
  /** Quien aprobó en CoordinaOT (se apunta al generar). */
  reviewedBy: string;
  reviewNote: string;
  production: ProduccionRemolques | null;
  summary: ResumenPedido;
  /** Los parámetros con que se calculó el pedido al guardarlo: «Corregir» vuelve a ellos. */
  params: CalcParams;
  elementos: ElementoGuardado[];
  /** Solo en los que vienen de la web vieja (comando de migración). */
  origen?: OrigenMigracion;
}

/** Lo que lista Pedidos: el pedido sin los elementos ni los parámetros. */
export type ResumenPedidoRemolques = Omit<PedidoRemolques, "elementos" | "params">;
```

- [ ] **Step 4: Crear las reglas**

Crear `src/remolques/flujo/pedido.ts`:

```ts
import { awningLetter } from "../../domain/awningCompleteness.js";
import { normalizeOf } from "../../reviewRules.js";
import type { BaquetonInput } from "../calc/baqueton.ts";
import type { CabeceraInput, LonaInput } from "../calc/lona.ts";
import { nombrePerfil } from "../calc/params.ts";
import type { DatosHojaPedido, ElementoPedidoHoja } from "../hoja/tipos.ts";
import { normalizarNumeroPedido } from "../pedidos/numero-pedido.ts";
import { errorPlanteamientoIncompleto } from "../pedidos/validar-planteamiento.ts";
import { anioDelPlanteamiento } from "../salida/nombre-pdf.ts";
import type { TipoPlanteamiento } from "../store/types.ts";
import {
  ESQUEMA_PEDIDO_REMOLQUES, TIPO_PEDIDO_REMOLQUES,
  type ElementoGuardado, type FicheroGenerado, type PedidoRemolques, type ResumenElemento, type ResumenPedido,
  type ResumenPedidoRemolques,
} from "./tipos.ts";

// Reglas puras de un pedido de remolques (fase 5), sin Node ni disco: las usan el servidor y la
// web. Las de autoría, estados y CoordinaOT son las de toldos (src/reviewRules.js).

/** Un error del pedido que manda la pantalla o que se pide: la ruta responde con su código. */
export class ErrorPedidoRemolques extends Error {
  statusCode: number;
  constructor(mensaje: string, statusCode = 400) {
    super(mensaje);
    this.name = "ErrorPedidoRemolques";
    this.statusCode = statusCode;
  }
}

/** La clave del pedido: el número sin puntos ni espacios, en mayúsculas (AR.26.04286 → AR2604286). */
export function codigoPedido(numeroPedido: string): string {
  const codigo = normalizarNumeroPedido(String(numeroPedido ?? ""));
  if (!codigo) throw new ErrorPedidoRemolques("Falta el número de pedido.");
  return codigo.slice(0, 80);
}

/** El modelo de un elemento en Pedidos: el perfil de la lona («Recto con aguas») o «Baquetón». */
export function modeloElemento(elemento: { tipo: TipoPlanteamiento; input: LonaInput | BaquetonInput }): string {
  if (elemento.tipo === "baqueton") return "Baquetón";
  const perfil = (elemento.input as LonaInput).tipoPerfil;
  return perfil ? nombrePerfil(perfil) : "Remolque";
}

const ofDe = (elemento: { input: LonaInput | BaquetonInput }) => normalizeOf(elemento.input.cabecera.ordenFabricacion ?? "");
const unicos = (valores: string[]) => [...new Set(valores.filter(Boolean))];

/** Las letras y OF que se preguntan a CoordinaOT, en el orden del pedido (A, B…), como los toldos. */
export function elementosAprobacion(pedido: Pick<PedidoRemolques, "elementos">): { letter: string; of: string }[] {
  return pedido.elementos.map((elemento, indice) => ({ letter: awningLetter(indice), of: ofDe(elemento) }));
}

export function resumenElementos(elementos: ElementoGuardado[]): ResumenElemento[] {
  return elementos.map((elemento, indice) => {
    const falta = errorPlanteamientoIncompleto(elemento.input);
    return {
      letter: awningLetter(indice),
      model: modeloElemento(elemento),
      of: ofDe(elemento),
      state: falta ? "error" : "ok",
      notes: falta ? [falta] : [],
    };
  });
}

export function resumenPedido(elementos: ElementoGuardado[], autoria: { technician: string; reviewer: string }): ResumenPedido {
  const cabeceras = elementos.map((elemento) => elemento.input.cabecera);
  return {
    customer: cabeceras.map((cabecera) => cabecera.cliente.trim()).find(Boolean) ?? "",
    orderDate: cabeceras[0]?.fecha ?? "",
    technician: autoria.technician,
    reviewer: autoria.reviewer,
    awnings: elementos.length,
    ofs: unicos(elementos.map(ofDe)),
    models: unicos(elementos.map(modeloElemento)),
    diagnostics: 0,
  };
}

const conCabecera = (elemento: ElementoGuardado, cambios: Partial<CabeceraInput>): ElementoGuardado => ({
  ...elemento,
  input: { ...elemento.input, cabecera: { ...elemento.input.cabecera, ...cambios } },
});

/**
 * El pedido que se guarda para revisión. `datos` sale de prepararPedidoHoja (completo, ordenado y
 * calculado); `autoria`, de reviewAuthorship. El autor queda como «Realizado por» de cada elemento.
 */
export function crearPedidoRemolques({ datos, autoria, existente, ahora }: {
  datos: DatosHojaPedido;
  autoria: { technician: string; reviewer: string };
  existente: PedidoRemolques | null;
  ahora: string;
}): PedidoRemolques {
  const numeroPedido = datos.elementos[0].input.cabecera.numeroPedido.trim();
  const elementos = datos.elementos.map((e) => conCabecera(
    { version: e.version, tipo: e.tipo, input: e.input, result: e.result, paramsSnapshot: datos.params },
    { realizadoPor: autoria.technician },
  ));
  return {
    schemaVersion: ESQUEMA_PEDIDO_REMOLQUES,
    kind: TIPO_PEDIDO_REMOLQUES,
    orderCode: codigoPedido(numeroPedido),
    numeroPedido,
    status: "PENDING_REVIEW",
    createdAt: existente?.createdAt ?? ahora,
    updatedAt: ahora,
    createdBy: existente?.createdBy || autoria.technician,
    reviewedAt: null,
    reviewedBy: "",
    reviewNote: "",
    production: null,
    summary: resumenPedido(elementos, autoria),
    params: datos.params,
    elementos,
  };
}

/** Generado: PRODUCED, con sus dos PDF y el revisor de CoordinaOT en el pedido y en cada elemento. */
export function marcarPedidoGenerado(pedido: PedidoRemolques, { revisor, ficheros, ahora }: {
  revisor: string;
  ficheros: FicheroGenerado[];
  ahora: string;
}): PedidoRemolques {
  return {
    ...pedido,
    status: "PRODUCED",
    updatedAt: ahora,
    reviewedAt: revisor ? ahora : pedido.reviewedAt,
    reviewedBy: revisor || pedido.reviewedBy,
    summary: { ...pedido.summary, reviewer: revisor || pedido.summary.reviewer },
    elementos: revisor ? pedido.elementos.map((elemento) => conCabecera(elemento, { revision: revisor })) : pedido.elementos,
    production: { createdAt: ahora, createdBy: pedido.summary.technician || pedido.createdBy, files: ficheros },
  };
}

/** Lo que lista Pedidos: sin elementos ni parámetros y con el estado de cada elemento. */
export function resumenBandeja(pedido: PedidoRemolques): ResumenPedidoRemolques {
  const copia: Partial<PedidoRemolques> = { ...pedido };
  delete copia.elementos;
  delete copia.params;
  return { ...(copia as ResumenPedidoRemolques), summary: { ...pedido.summary, awningList: resumenElementos(pedido.elementos) } };
}

/** El año del pedido para Pedidos y «Generados»: las dos cifras tras «AR» o, si no, el de su fecha. */
export function anioPedido(pedido: Pick<PedidoRemolques, "numeroPedido" | "summary" | "createdAt">): number {
  return anioDelPlanteamiento(pedido.numeroPedido, pedido.summary.orderDate || pedido.createdAt.slice(0, 10));
}

/** Los elementos como los pide la hoja de taller: sin resultado, que lo recalcula el servidor. */
export function elementosPedidoHoja(pedido: Pick<PedidoRemolques, "elementos">): ElementoPedidoHoja[] {
  return pedido.elementos.map(({ version, tipo, input }) => ({ version, tipo, input }));
}
```

- [ ] **Step 5: Ejecutar la prueba del pedido**

Run: `pnpm exec vitest run src/remolques/flujo/__tests__/pedido.test.ts`
Expected: PASS (10 pruebas).

- [ ] **Step 6: Escribir la prueba del almacén**

Crear `src/remolques/flujo/__tests__/almacen.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { crearAlmacenPedidosRemolques, ficheroPedido, SIN_CARPETA_INTERNA } from "../almacen.ts";
import type { PedidoRemolques } from "../tipos.ts";

// Nada fuera de tmp/ del repositorio en las pruebas.
const TMP = path.join(process.cwd(), "tmp");
const temporales: string[] = [];
function carpetaNueva() {
  mkdirSync(TMP, { recursive: true });
  const dir = mkdtempSync(path.join(TMP, "remolques-almacen-"));
  temporales.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of temporales.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const pedido = (orderCode: string, updatedAt: string, extra: Partial<PedidoRemolques> = {}): PedidoRemolques => ({
  schemaVersion: 1, kind: "remolques", orderCode, numeroPedido: orderCode, status: "PENDING_REVIEW",
  createdAt: updatedAt, updatedAt, createdBy: "IVÁN", reviewedAt: null, reviewedBy: "", reviewNote: "", production: null,
  summary: { customer: "", orderDate: "2026-09-01", technician: "IVÁN", reviewer: "", awnings: 0, ofs: [], models: [], diagnostics: 0 },
  params: DEFAULT_PARAMS, elementos: [], ...extra,
});

describe("almacén de pedidos de remolques", () => {
  it("guarda un JSON por pedido con el número normalizado y lo vuelve a leer", async () => {
    const dir = carpetaNueva();
    const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => dir });
    expect(await almacen.guardar(pedido("AR2604286", "2026-10-01T08:00:00.000Z"))).toBe(path.join(dir, "AR2604286.json"));
    expect(await almacen.obtener("ar.26.04286")).toMatchObject({ orderCode: "AR2604286" });
    expect(await almacen.obtener("AR2699999")).toBeNull();
    expect(readdirSync(dir)).toEqual(["AR2604286.json"]);
  });

  it("guardar sustituye; crear nunca pisa lo que ya está", async () => {
    const dir = carpetaNueva();
    const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => dir });
    expect(await almacen.crear(pedido("AR2604286", "2026-10-01T08:00:00.000Z"))).toBe("creado");
    expect(await almacen.crear(pedido("AR2604286", "2026-10-02T08:00:00.000Z", { createdBy: "OTRO" }))).toBe("ya-existe");
    expect((await almacen.obtener("AR2604286"))?.createdBy).toBe("IVÁN");
    await almacen.guardar(pedido("AR2604286", "2026-10-03T08:00:00.000Z", { createdBy: "JAIME" }));
    expect((await almacen.obtener("AR2604286"))?.createdBy).toBe("JAIME");
    expect(readdirSync(dir)).toEqual(["AR2604286.json"]);
  });

  it("lista del más reciente al más antiguo y salta lo que no es un pedido", async () => {
    const dir = carpetaNueva();
    const avisos: string[] = [];
    const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => dir, registrar: (mensaje) => avisos.push(mensaje) });
    await almacen.guardar(pedido("AR2600001", "2026-09-01T08:00:00.000Z"));
    await almacen.guardar(pedido("AR2600002", "2026-09-05T08:00:00.000Z"));
    writeFileSync(path.join(dir, "roto.json"), "{no es json");
    writeFileSync(path.join(dir, "otro.json"), JSON.stringify({ kind: "toldos-testar-review" }));
    writeFileSync(path.join(dir, "nota.txt"), "x");
    expect((await almacen.listar()).map((p) => p.orderCode)).toEqual(["AR2600002", "AR2600001"]);
    expect(avisos).toHaveLength(2);
  });

  it("sin carpeta puesta no hay pedidos, y guardar lo dice", async () => {
    const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => "" });
    expect(await almacen.listar()).toEqual([]);
    expect(await almacen.obtener("AR2604286")).toBeNull();
    await expect(almacen.guardar(pedido("AR2604286", "2026-10-01T08:00:00.000Z"))).rejects.toThrow(SIN_CARPETA_INTERNA);
  });

  it("crea la carpeta interna si aún no existe", async () => {
    const dir = path.join(carpetaNueva(), "remolques", "pedidos");
    const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => dir });
    await almacen.guardar(pedido("AR2604286", "2026-10-01T08:00:00.000Z"));
    expect(readdirSync(dir)).toEqual(["AR2604286.json"]);
  });

  it("el nombre del fichero no deja salir de la carpeta", () => {
    expect(ficheroPedido(path.join("/x"), "../../etc/passwd")).toBe(path.join("/x", "ETCPASSWD.json"));
  });
});
```

- [ ] **Step 7: Ejecutarla y ver que falla**

Run: `pnpm exec vitest run src/remolques/flujo/__tests__/almacen.test.ts`
Expected: FAIL — `Failed to load url ../almacen.ts`.

- [ ] **Step 8: Crear el almacén**

Crear `src/remolques/flujo/almacen.ts`:

```ts
import { link, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { codigoPedido, ErrorPedidoRemolques } from "./pedido.ts";
import { TIPO_PEDIDO_REMOLQUES, type PedidoRemolques } from "./tipos.ts";

// Los pedidos de remolques, pendientes y generados, dentro de la web (Iván, 01/10/2026): un JSON
// por pedido en la carpeta interna de remolques (Configuración; semilla REMOLQUES_REVISION_DIRECTORY).
// En las carpetas compartidas solo aparecen los dos PDF al generar, como con la web vieja.

export const SIN_CARPETA_INTERNA = "Falta la carpeta interna de remolques en Configuración: no se pueden guardar pedidos de remolques.";

export interface AlmacenPedidosRemolques {
  obtener(orderCode: string): Promise<PedidoRemolques | null>;
  /** Escribe el pedido (lo sustituye si ya estaba). Devuelve la ruta del fichero. */
  guardar(pedido: PedidoRemolques): Promise<string>;
  /** Solo si no existe: lo usa el paso desde la web vieja, que nunca pisa nada. */
  crear(pedido: PedidoRemolques): Promise<"creado" | "ya-existe">;
  /** Todos, del más reciente al más antiguo. Un fichero que no es un pedido se salta (y se avisa). */
  listar(): Promise<PedidoRemolques[]>;
}

/** El número normalizado como nombre: solo letras y cifras, así nunca sale de la carpeta. */
export const ficheroPedido = (carpeta: string, orderCode: string) => path.join(carpeta, `${codigoPedido(orderCode)}.json`);

function esPedido(valor: unknown): valor is PedidoRemolques {
  const p = valor as Partial<PedidoRemolques> | null;
  return Boolean(p && p.kind === TIPO_PEDIDO_REMOLQUES && typeof p.orderCode === "string" && p.orderCode
    && Array.isArray(p.elementos) && p.summary);
}

async function leer(fichero: string): Promise<PedidoRemolques> {
  const datos: unknown = JSON.parse(await readFile(fichero, "utf8"));
  if (!esPedido(datos)) throw new Error(`${path.basename(fichero)} no es un pedido de remolques.`);
  return datos;
}

const contenido = (pedido: PedidoRemolques) => `${JSON.stringify(pedido, null, 2)}\n`;
const temporalDe = (fichero: string) => `${fichero}.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
const codigo = (error: unknown) => (error as NodeJS.ErrnoException).code;

export function crearAlmacenPedidosRemolques({ carpeta, registrar = (mensaje: string) => console.error(mensaje) }: {
  /** La carpeta interna de la configuración en este momento ('' si no está puesta). */
  carpeta: () => Promise<string>;
  registrar?: (mensaje: string) => void;
}): AlmacenPedidosRemolques {
  async function carpetaObligatoria() {
    const dir = (await carpeta()).trim();
    if (!dir) throw new ErrorPedidoRemolques(SIN_CARPETA_INTERNA);
    await mkdir(dir, { recursive: true });
    return dir;
  }

  return {
    async obtener(orderCode) {
      const dir = (await carpeta()).trim();
      if (!dir) return null;
      try {
        return await leer(ficheroPedido(dir, orderCode));
      } catch (error) {
        if (codigo(error) === "ENOENT") return null;
        throw error;
      }
    },

    async guardar(pedido) {
      const fichero = ficheroPedido(await carpetaObligatoria(), pedido.orderCode);
      const temporal = temporalDe(fichero);
      await writeFile(temporal, contenido(pedido), { flag: "wx" });
      try {
        await rename(temporal, fichero);
      } catch (error) {
        await rm(temporal, { force: true });
        throw error;
      }
      return fichero;
    },

    async crear(pedido) {
      const fichero = ficheroPedido(await carpetaObligatoria(), pedido.orderCode);
      const temporal = temporalDe(fichero);
      await writeFile(temporal, contenido(pedido), { flag: "wx" });
      try {
        // link falla con EEXIST si ya está: nunca se pisa un pedido.
        await link(temporal, fichero);
        return "creado";
      } catch (error) {
        if (codigo(error) === "EEXIST") return "ya-existe";
        throw error;
      } finally {
        await rm(temporal, { force: true });
      }
    },

    async listar() {
      const dir = (await carpeta()).trim();
      if (!dir) return [];
      let nombres: string[];
      try {
        nombres = await readdir(dir);
      } catch (error) {
        if (codigo(error) === "ENOENT") return [];
        throw error;
      }
      const pedidos = await Promise.all(nombres.filter((nombre) => nombre.toLowerCase().endsWith(".json")).map(async (nombre) => {
        try {
          return await leer(path.join(dir, nombre));
        } catch (error) {
          registrar(`No se pudo leer el pedido de remolques ${nombre}: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      }));
      return pedidos
        .filter((pedido): pedido is PedidoRemolques => pedido !== null)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
  };
}
```

- [ ] **Step 9: Ejecutar las pruebas y el tipado**

Run: `pnpm exec vitest run src/remolques/flujo && pnpm typecheck`
Expected: PASS (16 pruebas) y `tsc` sin errores.

- [ ] **Step 10: Commit**

```bash
git add src/remolques/flujo/tipos.ts src/remolques/flujo/pedido.ts src/remolques/flujo/almacen.ts src/remolques/flujo/__tests__/pedido.test.ts src/remolques/flujo/__tests__/almacen.test.ts
git commit -m "feat(remolques): el pedido de remolques guardado y su almacén

Fase 5: lo pendiente de remolques se guarda dentro de la web, un JSON por
pedido en la carpeta interna, con los campos de fuera como los de toldos para
que Pedidos los trate igual. Las reglas son las de reviewRules.js; aquí solo
va lo propio (letras y OF por elemento, perfil como modelo, año del pedido).

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: La carpeta interna de remolques en Configuración, el despliegue y la aislada

Modelo recomendado: el más barato (el código está completo). Esfuerzo: bajo.

**Files:**
- Modify: `src/config.js`, `src/workflow.js` (`defaultWorkflowSettings`, `normalizeWorkflowSettings`, `checkWorkflowDirectories`), `src/server.js` (defaults del `workflowStore`), `src/client/types.ts` (`WorkflowSettings`), `src/client/views/SettingsView.tsx`
- Modify: `scripts/lib/deploy-remolques.mjs`, `scripts/check-deployment.mjs`, `.env.example`, `.env.production.example`, `README.md`
- Modify: `.claude/skills/running-toldos-testar/start-isolated.sh`
- Test: `src/config.test.js`, `src/workflow.test.js`, `scripts/lib/deploy-remolques.test.mjs`

**Interfaces:**
- Consumes: nada de tareas anteriores.
- Produces: `config.remolquesRevisionDirectory` (de `REMOLQUES_REVISION_DIRECTORY`), `settings.remolquesRevisionDirectory` (Configuración, `GET/PUT /api/workflow/settings`), `WorkflowSettings.remolquesRevisionDirectory: string` en el cliente, `comprobarCarpetaInternaRemolques({ carpeta, estricto, acceso? }): Promise<{ errores; avisos; exitos }>`, y `start-isolated.sh` con `ISOLATED_DIR` (por defecto `$PWD/tmp/ui-audit`) y `REMOLQUES_REVISION_DIRECTORY="$D/rem-revision"`.

- [ ] **Step 1: Escribir las pruebas que fallan**

En `src/config.test.js`, añadir arriba, junto a las otras `original…`:

```js
const originalRemolquesRevisionDirectory = process.env.REMOLQUES_REVISION_DIRECTORY;
```

en el `afterEach`:

```js
  restoreEnvironment('REMOLQUES_REVISION_DIRECTORY', originalRemolquesRevisionDirectory);
```

y dentro de `describe('configuración por entorno', …)`:

```js
  test('REMOLQUES_REVISION_DIRECTORY es la carpeta interna de los pedidos de remolques', async () => {
    process.env.REMOLQUES_REVISION_DIRECTORY = '/var/lib/toldos-testar/remolques-pedidos';
    expect((await loadConfig('production', '')).remolquesRevisionDirectory).toBe('/var/lib/toldos-testar/remolques-pedidos');
  });
```

En `src/workflow.test.js`, después de `it('guarda las dos carpetas de remolques y las comprueba solo si están puestas', …)`:

```js
  it('guarda la carpeta interna de remolques: absoluta, sin {YYYY}, y la comprueba si está puesta', async () => {
    // Nada fuera de tmp/ del repositorio.
    await fs.mkdir(path.join(process.cwd(), 'tmp'), { recursive: true });
    const root = await fs.mkdtemp(path.join(process.cwd(), 'tmp', 'workflow-remolques-'));
    temporaryDirectories.push(root);
    const interna = path.join(root, 'remolques-pedidos');
    await fs.mkdir(interna);
    const settings = normalizeWorkflowSettings({ remolquesRevisionDirectory: `${interna}${path.sep}` });
    expect(settings.remolquesRevisionDirectory).toBe(interna);
    expect(() => normalizeWorkflowSettings({ remolquesRevisionDirectory: 'relativa' }))
      .toThrow('La carpeta interna de remolques debe ser una ruta absoluta válida en el sistema del servidor.');
    expect(() => normalizeWorkflowSettings({ remolquesRevisionDirectory: path.join(interna, '{YYYY}') }))
      .toThrow('La carpeta interna de remolques no lleva {YYYY}: todos los pedidos van en la misma carpeta.');
    expect(defaultWorkflowSettings({ remolquesRevisionDirectory: '/var/lib/x' }).remolquesRevisionDirectory).toBe('/var/lib/x');
    expect(defaultWorkflowSettings({}).remolquesRevisionDirectory).toBe('');
    const result = await checkWorkflowDirectories(settings, { year: 2026 });
    expect(result.directories.find((item) => item.key === 'remolquesRevisionDirectory'))
      .toMatchObject({ label: 'Remolques · pedidos guardados', ok: true, path: interna });
    // No cuenta para «Generar archivos» de toldos.
    expect(workflowReadiness(settings).missing).not.toContain('Remolques · pedidos guardados');
  });
```

En `scripts/lib/deploy-remolques.test.mjs`, cambiar el import a:

```js
import { constants as fsConstants } from 'node:fs';
import { comprobarCarpetaInternaRemolques, comprobarCarpetasRemolques, comprobarChromium } from './deploy-remolques.mjs';
```

y añadir al final:

```js
describe('comprobarCarpetaInternaRemolques', () => {
  const existe = async () => {};

  it('avisa, sin fallar, si no está definida', async () => {
    const r = await comprobarCarpetaInternaRemolques({ carpeta: '', estricto: true, acceso: existe });
    expect(r.errores).toEqual([]);
    expect(r.avisos[0]).toContain('REMOLQUES_REVISION_DIRECTORY no está definido');
  });

  it('falla si lleva {YYYY}', async () => {
    const r = await comprobarCarpetaInternaRemolques({ carpeta: '/var/lib/x/{YYYY}', estricto: false, acceso: existe });
    expect(r.errores[0]).toContain('{YYYY}');
  });

  it('exige una ruta Linux absoluta con permiso de escritura', async () => {
    const visto = [];
    const ok = await comprobarCarpetaInternaRemolques({ carpeta: '/var/lib/toldos-testar/remolques-pedidos', estricto: true, acceso: async (ruta, modo) => { visto.push([ruta, modo]); } });
    expect(ok.exitos).toHaveLength(1);
    expect(visto).toEqual([['/var/lib/toldos-testar/remolques-pedidos', fsConstants.R_OK | fsConstants.W_OK]]);
    const sinPermiso = await comprobarCarpetaInternaRemolques({ carpeta: '/var/lib/x', estricto: true, acceso: async () => { throw new Error('EACCES'); } });
    expect(sinPermiso.errores[0]).toContain('sin permiso de escritura');
    const ventanas = await comprobarCarpetaInternaRemolques({ carpeta: 'C:\\pedidos', estricto: false, acceso: existe });
    expect(ventanas.avisos[0]).toContain('Windows');
    const relativa = await comprobarCarpetaInternaRemolques({ carpeta: 'pedidos', estricto: true, acceso: existe });
    expect(relativa.errores[0]).toContain('no usa una ruta Linux absoluta');
  });
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `pnpm exec vitest run src/config.test.js src/workflow.test.js scripts/lib/deploy-remolques.test.mjs`
Expected: FAIL — `remolquesRevisionDirectory` es `undefined` y `comprobarCarpetaInternaRemolques is not a function`.

- [ ] **Step 3: Implementar la configuración**

En `src/config.js`, después de la línea `remolquesOficinaTecnicaDirectory: …`:

```js
  // Pedidos de remolques (fase 5): la carpeta interna donde la web guarda un JSON por pedido,
  // pendiente o generado. No es la compartida: va junto a la configuración, con copia de seguridad.
  remolquesRevisionDirectory: process.env.REMOLQUES_REVISION_DIRECTORY || '',
```

En `src/workflow.js`:
- en `defaultWorkflowSettings`, después de `remolquesOficinaTecnicaDirectory: seed.remolquesOficinaTecnicaDirectory || ''` (añadiendo la coma a esa línea):

```js
    remolquesRevisionDirectory: seed.remolquesRevisionDirectory || ''
```

- en `normalizeWorkflowSettings`, después de `remolquesOficinaTecnicaDirectory: cleanPath(…)` (con coma):

```js
    remolquesRevisionDirectory: cleanPath(input?.remolquesRevisionDirectory ?? current.remolquesRevisionDirectory)
```

  en la lista de rutas que se comprueban, después de `['carpeta de oficina técnica de remolques', settings.remolquesOficinaTecnicaDirectory]` (con coma):

```js
    ['carpeta interna de remolques', settings.remolquesRevisionDirectory]
```

  y después del `if` de `{YYYY}` de oficina técnica:

```js
  if (settings.remolquesRevisionDirectory.includes('{YYYY}')) {
    throw new Error('La carpeta interna de remolques no lleva {YYYY}: todos los pedidos van en la misma carpeta.');
  }
```

- en `checkWorkflowDirectories`, después del `if (settings.remolquesOficinaTecnicaDirectory) { … }`:

```js
  // Pedidos de remolques guardados (fase 5): la web escribe en ella aunque no se genere nada.
  if (settings.remolquesRevisionDirectory) {
    definitions.push(['remolquesRevisionDirectory', 'Remolques · pedidos guardados', settings.remolquesRevisionDirectory, 'write']);
  }
```

En `src/server.js`, en los `defaults` de `createWorkflowStore`, después de `remolquesOficinaTecnicaDirectory: config.remolquesOficinaTecnicaDirectory` (con coma):

```js
    remolquesRevisionDirectory: config.remolquesRevisionDirectory
```

En `src/client/types.ts`, en `WorkflowSettings`, después de `remolquesOficinaTecnicaDirectory: string;`:

```ts
  /** Pedidos de remolques guardados (fase 5): carpeta interna del servidor, un JSON por pedido. */
  remolquesRevisionDirectory: string;
```

En `src/client/views/SettingsView.tsx`, añadir a `formMatchesSaved` (antes del `;` final):

```tsx
    && form.remolquesRevisionDirectory === settings.remolquesRevisionDirectory;
```

(quitando el `;` de la línea anterior), y después del `RouteField` del paso `06`:

```tsx
        <RouteField
          step="07"
          title="Remolques · pedidos guardados"
          description="Carpeta interna del servidor, no la compartida: aquí guarda la web los pedidos de remolques, pendientes y generados, un archivo por pedido. Ponla donde haya copia de seguridad."
          value={form.remolquesRevisionDirectory}
          onChange={(remolquesRevisionDirectory) => updateForm({ remolquesRevisionDirectory })}
          placeholder="/var/lib/toldos-testar/remolques-pedidos"
        />
```

- [ ] **Step 4: Implementar la comprobación de despliegue**

En `scripts/lib/deploy-remolques.mjs`, al final:

```js
// La carpeta interna de remolques (fase 5): los pedidos de remolques pendientes y generados, un JSON
// por pedido. La web escribe en ella al guardar para revisión, aunque la generación esté apagada.
export async function comprobarCarpetaInternaRemolques({ carpeta, estricto, acceso = access }) {
  const clave = 'REMOLQUES_REVISION_DIRECTORY';
  const errores = [];
  const avisos = [];
  const exitos = [];
  const informa = (mensaje) => (estricto ? errores : avisos).push(mensaje);
  if (!carpeta) {
    avisos.push(`${clave} no está definido; no se podrán guardar pedidos de remolques para revisión.`);
  } else if (carpeta.includes('{YYYY}')) {
    errores.push(`${clave} no lleva {YYYY}: todos los pedidos de remolques van en la misma carpeta.`);
  } else if (/^[A-Za-z]:[\\/]/.test(carpeta) || carpeta.startsWith('\\\\') || carpeta.includes('\\')) {
    informa(`${clave} usa una ruta de Windows/UNC; sustitúyela por una ruta Linux (recomendada /var/lib/toldos-testar/remolques-pedidos).`);
  } else if (!path.posix.isAbsolute(carpeta)) {
    informa(`${clave} no usa una ruta Linux absoluta.`);
  } else {
    try {
      await acceso(carpeta, fsConstants.R_OK | fsConstants.W_OK);
      exitos.push(`${clave} apunta a una carpeta accesible con permiso de escritura.`);
    } catch {
      informa(`${clave} apunta a una carpeta inexistente o sin permiso de escritura: créala y da permiso al usuario de PM2.`);
    }
  }
  return { errores, avisos, exitos };
}
```

En `scripts/check-deployment.mjs`:
- el import: `import { comprobarCarpetaInternaRemolques, comprobarCarpetasRemolques, comprobarChromium } from './lib/deploy-remolques.mjs';`
- en `EFFECTIVE_ENV_KEYS`, después de `'REMOLQUES_OFICINA_TECNICA_DIRECTORY',`: `'REMOLQUES_REVISION_DIRECTORY',`
- en `seedSettings`, después de `remolquesOficinaTecnicaDirectory: unquote(values.get('REMOLQUES_OFICINA_TECNICA_DIRECTORY'))` (con coma): `remolquesRevisionDirectory: unquote(values.get('REMOLQUES_REVISION_DIRECTORY'))`
- en `effectiveSettings` (rama `persistedSettings`), después de la línea de `remolquesOficinaTecnicaDirectory` (con coma): `remolquesRevisionDirectory: stringOrFallback(persistedSettings.remolquesRevisionDirectory, seedSettings.remolquesRevisionDirectory)`
- después de `remolques.exitos.forEach(pass);`:

```js
  const interna = await comprobarCarpetaInternaRemolques({
    carpeta: effectiveSettings.remolquesRevisionDirectory,
    estricto: strictDeployment
  });
  interna.errores.forEach(fail);
  interna.avisos.forEach(warn);
  interna.exitos.forEach(pass);
```

En `.env.example`, después de `REMOLQUES_OFICINA_TECNICA_DIRECTORY=`:

```bash
# Pedidos de remolques guardados (fase 5): carpeta interna del servidor (no la compartida), un JSON por
# pedido. En desarrollo, dentro de tmp/ del repositorio.
REMOLQUES_REVISION_DIRECTORY=
```

En `.env.production.example`, después de `REMOLQUES_OFICINA_TECNICA_DIRECTORY=`:

```bash
# Pedidos de remolques guardados (fase 5): carpeta interna, junto a la configuración y con copia de seguridad.
REMOLQUES_REVISION_DIRECTORY=/var/lib/toldos-testar/remolques-pedidos
```

En `README.md`:
- en «### 1. Preparar rutas», después del punto de `/var/lib/toldos-testar`:

```md
- `/var/lib/toldos-testar/remolques-pedidos` para los pedidos de remolques guardados (carpeta
  interna: un JSON por pedido, pendiente o generado; incluirla en la copia de seguridad)
```

- en el bloque de `.env` de «### 2. Configurar `.env`», después de `REMOLQUES_OFICINA_TECNICA_DIRECTORY=`:

```bash
# Pedidos de remolques guardados (carpeta interna, no la compartida).
REMOLQUES_REVISION_DIRECTORY=/var/lib/toldos-testar/remolques-pedidos
```

- [ ] **Step 5: La aislada con otra carpeta de prueba y la carpeta interna**

En `.claude/skills/running-toldos-testar/start-isolated.sh`, sustituir:

```bash
D="$PWD/tmp/ui-audit"
mkdir -p "$D"/{review,plan,rps,export,archive,rpsplan,rem-plan,rem-oficina}
```

por:

```bash
# ISOLATED_DIR: otra carpeta de prueba, siempre dentro de tmp/ del repositorio (la e2e de la fase 5
# activa la generación en la suya y no debe tocar la configuración de la instancia de 4310).
D="${ISOLATED_DIR:-$PWD/tmp/ui-audit}"
case "$D" in /*) ;; *) D="$PWD/$D" ;; esac
case "$D" in *..*) echo "ISOLATED_DIR no puede llevar «..»: $D" >&2; exit 1 ;; esac
case "$D" in "$PWD"/tmp/*) ;; *) echo "ISOLATED_DIR tiene que estar dentro de $PWD/tmp: $D" >&2; exit 1 ;; esac
mkdir -p "$D"/{review,plan,rps,export,archive,rpsplan,rem-plan,rem-oficina,rem-revision}
```

y después de la línea `export REMOLQUES_PLANTEAMIENTOS_DIRECTORY=…`:

```bash
export REMOLQUES_REVISION_DIRECTORY="$D/rem-revision"
```

- [ ] **Step 6: Ejecutar las pruebas, el tipado y el lint**

Run: `pnpm exec vitest run src/config.test.js src/workflow.test.js scripts/lib/deploy-remolques.test.mjs && pnpm typecheck && pnpm lint`
Expected: PASS, `tsc` y `eslint` sin errores.

Run: `bash -n .claude/skills/running-toldos-testar/start-isolated.sh && echo sintaxis-ok`
Expected: `sintaxis-ok`.

- [ ] **Step 7: Mirar Configuración en la aislada**

Run (en segundo plano): `PORT=4311 FAKE_COORDINA_PORT=4321 bash .claude/skills/running-toldos-testar/start-isolated.sh`
Esperar a: `curl -fsS http://127.0.0.1:4311/api/health` → `"simulationMode":true` y `"fileWritesEnabled":false`.
Run: `curl -fsS http://127.0.0.1:4311/api/workflow/settings`
Expected: `"remolquesRevisionDirectory":"…tmp…ui-audit…rem-revision"`.

Capturar con Playwright (`TOLDOS_ISOLATED_URL=http://127.0.0.1:4311`, ayudas de `.claude/skills/running-toldos-testar/drive.mjs`) la pestaña Configuración en claro y oscuro, 1280×720 y 1600×1000, en `tmp/ui-audit/remolques-5/configuracion-*.png`, y mirarlas: la tarjeta «07 · Remolques · pedidos guardados» se ve como las demás. Parar la instancia (terminar el proceso de `start-isolated.sh`).

- [ ] **Step 8: Commit**

```bash
git add src/config.js src/config.test.js src/workflow.js src/workflow.test.js src/server.js src/client/types.ts src/client/views/SettingsView.tsx scripts/lib/deploy-remolques.mjs scripts/lib/deploy-remolques.test.mjs scripts/check-deployment.mjs .env.example .env.production.example README.md .claude/skills/running-toldos-testar/start-isolated.sh
git commit -m "feat(remolques): carpeta interna para los pedidos de remolques

Iván, 01/10/2026: lo pendiente de remolques se guarda dentro de la web y no
en las carpetas compartidas. Nueva ruta en Configuración (semilla
REMOLQUES_REVISION_DIRECTORY), comprobada por «Comprobar carpetas» y por
deploy:check. La aislada admite ISOLATED_DIR para pruebas que activan la
generación sin tocar la configuración de la de 4310.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Los datos del pedido dentro del PDF

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio (dependencia nueva y lectura con pdfjs).

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (`pdf-lib` 1.17.1)
- Create: `src/remolques/flujo/adjunto.ts`
- Test: `src/remolques/flujo/__tests__/adjunto.test.ts`

**Interfaces:**
- Consumes: `PedidoRemolques`, `TIPO_PEDIDO_REMOLQUES` (Task 2).
- Produces: `SUFIJO_ADJUNTO = ".remolques.json"`, `nombreAdjunto(orderCode: string): string`, `adjuntarDatosPedido(pdf: Uint8Array, pedido: PedidoRemolques, ahora?: Date): Promise<Buffer>`, `leerDatosPedido(pdf: Uint8Array): Promise<PedidoRemolques>`.

- [ ] **Step 1: Añadir pdf-lib**

Run: `pnpm add pdf-lib@1.17.1 --save-exact`
Expected: `package.json` lleva `"pdf-lib": "1.17.1"` en `dependencies` y `pnpm-lock.yaml` cambia.

Run: `node --input-type=module -e "import pdfLib from 'pdf-lib'; console.log(typeof pdfLib.PDFDocument)"`
Expected: `function` (el import por defecto funciona en Node; es el que usa `adjunto.ts`).

- [ ] **Step 2: Escribir la prueba que falla**

Crear `src/remolques/flujo/__tests__/adjunto.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import pdfLib from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { adjuntarDatosPedido, leerDatosPedido, nombreAdjunto } from "../adjunto.ts";
import type { PedidoRemolques } from "../tipos.ts";

const pedido: PedidoRemolques = {
  schemaVersion: 1, kind: "remolques", orderCode: "AR2604286", numeroPedido: "AR.26.04286", status: "PRODUCED",
  createdAt: "2026-10-01T08:00:00.000Z", updatedAt: "2026-10-01T09:00:00.000Z", createdBy: "IVÁN",
  reviewedAt: "2026-10-01T09:00:00.000Z", reviewedBy: "JAIME", reviewNote: "",
  production: { createdAt: "2026-10-01T09:00:00.000Z", createdBy: "IVÁN", files: [{ type: "pdf", filename: "AR2604286-10.pdf", savedPath: "/p/AR2604286-10.pdf" }] },
  summary: { customer: "TALLERES CAL", orderDate: "2026-09-01", technician: "IVÁN", reviewer: "JAIME", awnings: 0, ofs: [], models: [], diagnostics: 0 },
  params: DEFAULT_PARAMS, elementos: [],
};

async function pdfDePrueba(paginas = 2) {
  const documento = await pdfLib.PDFDocument.create();
  for (let i = 0; i < paginas; i++) documento.addPage([842, 595]);
  return documento.save();
}

async function nombresDeAdjuntos(pdf: Uint8Array) {
  const documento = await getDocument({ data: new Uint8Array(pdf) }).promise;
  const adjuntos = await documento.getAttachments();
  const lista = adjuntos instanceof Map ? [...adjuntos.values()] : Object.values(adjuntos ?? {});
  const paginas = documento.numPages;
  await documento.destroy();
  return { paginas, nombres: lista.map((adjunto) => (adjunto as { filename: string }).filename) };
}

describe("los datos del pedido dentro del PDF", () => {
  it("el PDF lleva el pedido entero en AR….remolques.json, conserva sus hojas y se vuelve a leer igual", async () => {
    const conDatos = await adjuntarDatosPedido(await pdfDePrueba(), pedido, new Date("2026-10-01T08:00:00Z"));
    expect(conDatos.subarray(0, 4).toString("ascii")).toBe("%PDF");
    expect(await leerDatosPedido(conDatos)).toEqual(pedido);
    expect(await nombresDeAdjuntos(conDatos)).toEqual({ paginas: 2, nombres: [nombreAdjunto("AR2604286")] });
    expect(nombreAdjunto("AR2604286")).toBe("AR2604286.remolques.json");
  });

  it("un PDF sin los datos lo dice", async () => {
    await expect(leerDatosPedido(await pdfDePrueba(1))).rejects.toThrow("El PDF no lleva los datos del pedido de remolques.");
  });

  it("un adjunto que no es un pedido de remolques no se toma por uno", async () => {
    const documento = await pdfLib.PDFDocument.create();
    documento.addPage();
    await documento.attach(Buffer.from(JSON.stringify({ kind: "toldos-testar-review", orderCode: "AR2604286" })), "AR2604286.remolques.json", { mimeType: "application/json" });
    await expect(leerDatosPedido(await documento.save())).rejects.toThrow("Los datos que lleva el PDF no son de un pedido de remolques.");
  });
});
```

- [ ] **Step 3: Ejecutarla y ver que falla**

Run: `pnpm exec vitest run src/remolques/flujo/__tests__/adjunto.test.ts`
Expected: FAIL — `Failed to load url ../adjunto.ts`.

- [ ] **Step 4: Implementar**

Crear `src/remolques/flujo/adjunto.ts`:

```ts
import pdfLib from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { TIPO_PEDIDO_REMOLQUES, type PedidoRemolques } from "./tipos.ts";

// Los datos del pedido dentro de su hoja de taller (fase 5), como los PDF de toldos llevan su
// PEDIDO.toldos.json: con el PDF basta para recuperar o reutilizar el pedido. Chromium no sabe
// adjuntar ficheros al imprimir, así que se añaden después con pdf-lib.

// Import por defecto: pdf-lib es CommonJS y así funciona igual en Node, en vitest y con tsc.
const { PDFDocument } = pdfLib;

export const SUFIJO_ADJUNTO = ".remolques.json";
export const nombreAdjunto = (orderCode: string) => `${orderCode}${SUFIJO_ADJUNTO}`;

type Adjunto = { filename?: string; content?: Uint8Array };

export async function adjuntarDatosPedido(pdf: Uint8Array, pedido: PedidoRemolques, ahora = new Date()): Promise<Buffer> {
  const documento = await PDFDocument.load(pdf, { updateMetadata: false });
  await documento.attach(Buffer.from(`${JSON.stringify(pedido, null, 2)}\n`, "utf8"), nombreAdjunto(pedido.orderCode), {
    mimeType: "application/json",
    description: `Datos del pedido de remolques ${pedido.orderCode}`,
    creationDate: ahora,
    modificationDate: ahora,
  });
  return Buffer.from(await documento.save());
}

export async function leerDatosPedido(pdf: Uint8Array): Promise<PedidoRemolques> {
  const tarea = getDocument({ data: new Uint8Array(pdf) });
  const documento = await tarea.promise;
  try {
    const adjuntos = (await documento.getAttachments()) as Map<string, Adjunto> | Record<string, Adjunto> | null;
    const lista = (adjuntos instanceof Map ? [...adjuntos.values()] : Object.values(adjuntos ?? {})) as Adjunto[];
    const adjunto = lista.find((item) => String(item.filename ?? "").toLowerCase().endsWith(SUFIJO_ADJUNTO));
    if (!adjunto?.content) throw new Error("El PDF no lleva los datos del pedido de remolques.");
    const datos = JSON.parse(Buffer.from(adjunto.content).toString("utf8")) as Partial<PedidoRemolques> | null;
    if (datos?.kind !== TIPO_PEDIDO_REMOLQUES || !datos.orderCode || !Array.isArray(datos.elementos)) {
      throw new Error("Los datos que lleva el PDF no son de un pedido de remolques.");
    }
    return datos as PedidoRemolques;
  } finally {
    await tarea.destroy();
  }
}
```

- [ ] **Step 5: Ejecutar la prueba y el tipado**

Run: `pnpm exec vitest run src/remolques/flujo/__tests__/adjunto.test.ts && pnpm typecheck`
Expected: PASS (3 pruebas) y `tsc` sin errores.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/remolques/flujo/adjunto.ts src/remolques/flujo/__tests__/adjunto.test.ts
git commit -m "feat(remolques): el PDF generado lleva dentro los datos del pedido

Como los planteamientos de toldos (PEDIDO.toldos.json), la hoja de taller de
remolques lleva AR….remolques.json para poder recuperar o reutilizar el pedido
desde el propio PDF. Chromium no adjunta ficheros al imprimir: se añade
pdf-lib 1.17.1 para hacerlo después.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: El flujo en el servidor: guardar, listar, abrir, vista previa, generar y archivo

Modelo recomendado: el más capaz (Opus). Esfuerzo: alto (bloqueo, CoordinaOT, PDF y archivo en orden; errores con su código).

**Files:**
- Create: `src/remolques/flujo/servicio.ts`
- Modify: `src/server.js`
- Test: `src/remolques/flujo/__tests__/servicio.test.ts`

**Interfaces:**
- Consumes: Task 1 (`ELEMENT_NOUNS`, `generationBlock`, `DatosHojaPedido.revisadoPor`), Task 2 (`crearPedidoRemolques`, `marcarPedidoGenerado`, `resumenBandeja`, `elementosAprobacion`, `elementosPedidoHoja`, `anioPedido`, `codigoPedido`, `ErrorPedidoRemolques`, `AlmacenPedidosRemolques`, `crearAlmacenPedidosRemolques`), Task 3 (`settings.remolquesRevisionDirectory`), Task 4 (`adjuntarDatosPedido`). De fases anteriores: `prepararPedidoHoja` (`hoja/pedido.ts`), `archivarPdfRemolques`, `destinosPdfRemolques`, `ErrorArchivoPdf`, `CarpetasRemolques` (`salida/archivo.ts`), `nombrePdf` (`salida/nombre-pdf.ts`), `validarParams` (`calc/validar-params.ts`), y de `src/reviewRules.js` `saveReviewDecision`, `reviewAuthorship`, `generateFilesDecision`, `approvalReviewers`, `uniqueOfs`.
- Produces (`servicio.ts`): `type EstadoCoordina`, `interface DependenciasPedidosRemolques { almacen; ajustes: () => Promise<CarpetasRemolques>; parametros: () => Promise<CalcParams>; coordina: { statusOf(ofs: string[], opciones?: { fresh?: boolean }): Promise<EstadoCoordina> }; tecnicos: string[]; hacerPdf: (datos: DatosHojaPedido) => Promise<Uint8Array>; esPedidoDeToldos: (orderCode: string) => Promise<boolean>; ahora?: () => Date }`, `interface Respuesta { status: number; cuerpo: unknown }`, `paramsDeLaPantalla(bruto: unknown): CalcParams`, `crearServicioPedidosRemolques(deps)` → `{ listar(anio): Promise<{ year; reviews: ResumenPedidoRemolques[] }>; obtener(orderCode): Promise<PedidoRemolques>; guardar(cuerpo): Promise<Respuesta>; generar(orderCode, cuerpo): Promise<Respuesta>; vistaPrevia(orderCode): Promise<{ pdf: Uint8Array; nombre: string }>; archivo(orderCode): Promise<{ pdf: Uint8Array; nombre: string }> }`.
- Produces (HTTP, `src/server.js`):
  - `GET /api/remolques/pedidos?year=AAAA` → `{ year, reviews: ResumenPedidoRemolques[] }`
  - `POST /api/remolques/pedidos` con `{ elementos: ElementoPedidoHoja[], params?: CalcParams, savedBy: string, confirmOverwrite?: boolean }` → 200 `{ ok, review, overwritten }` · 409 `{ needsConfirmation: true, existing: [orderCode], error }` · 409/400 `{ error }`
  - `GET /api/remolques/pedidos/:orderCode` → `PedidoRemolques` · 404
  - `GET /api/remolques/pedidos/:orderCode/vista-previa` → PDF (nunca archiva)
  - `POST /api/remolques/pedidos/:orderCode/generar` con `{ confirmOverwrite?: boolean }` → 200 `{ ok, review, saved: FicheroGenerado[], nombre }` · 200 `{ ok, unchanged: true, review, saved }` · 409 `{ needsConfirmation: true, existing: string[] }` · 403/409/503 `{ error }`
  - `GET /api/remolques/pedidos/:orderCode/archivo` → el PDF generado (planteamientos o, si ya no está, oficina técnica)
  - `POST /api/remolques/pdf` admite `params` opcional (validado) además de `elementos`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/remolques/flujo/__tests__/servicio.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import pdfLib from "pdf-lib";
import casos from "../../__fixtures__/produccion-2026-09.json";
import type { BaquetonInput } from "../../calc/baqueton.ts";
import type { LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS, type CalcParams } from "../../calc/params.ts";
import type { DatosHojaPedido, ElementoPedidoHoja } from "../../hoja/tipos.ts";
import { COORDINA_UNAVAILABLE, PRODUCED_SAVE_ERROR } from "../../../reviewRules.js";
import { leerDatosPedido } from "../adjunto.ts";
import { crearAlmacenPedidosRemolques } from "../almacen.ts";
import { crearServicioPedidosRemolques, paramsDeLaPantalla, type EstadoCoordina } from "../servicio.ts";

// Nada fuera de tmp/ del repositorio en las pruebas.
const TMP = path.join(process.cwd(), "tmp");
const temporales: string[] = [];
afterEach(() => {
  for (const dir of temporales.splice(0)) rmSync(dir, { recursive: true, force: true });
});

type Caso = { caso: string; tipo: "lona" | "baqueton"; input: LonaInput | BaquetonInput };
const elemento = (id: string, version: string, of: string, numeroPedido = "AR.26.04286"): ElementoPedidoHoja => {
  const c = (casos as Caso[]).find((x) => x.caso === id)!;
  return {
    version, tipo: c.tipo,
    input: { ...c.input, cabecera: { ...c.input.cabecera, numeroPedido, version, cliente: "TALLERES CAL", fecha: "2026-09-01", ordenFabricacion: of } },
  };
};
const ELEMENTOS = () => [elemento("lona-02", "10", "231780"), elemento("baqueton-01", "11", "231781")];
const APROBADAS: EstadoCoordina = {
  disponible: true,
  ofs: { "0231780": { estado: "aprobada", revisor: "jaime" }, "0231781": { estado: "aprobada", revisor: "jaime" } },
};

function montar({ generacion = true, coordina = APROBADAS, toldos = [] as string[] } = {}) {
  mkdirSync(TMP, { recursive: true });
  const raiz = mkdtempSync(path.join(TMP, "remolques-servicio-"));
  temporales.push(raiz);
  const planteamientos = path.join(raiz, "PLANTEAMIENTOS");
  const oficina = path.join(raiz, "OFICINA TECNICA");
  mkdirSync(planteamientos);
  mkdirSync(oficina);
  const llamadas = { coordina: [] as Array<{ ofs: string[]; fresh?: boolean }>, pdf: [] as DatosHojaPedido[] };
  let estadoCoordina = coordina;
  let retenido: { entrar: () => void; espera: Promise<void> } | null = null;
  const servicio = crearServicioPedidosRemolques({
    almacen: crearAlmacenPedidosRemolques({ carpeta: async () => path.join(raiz, "interna") }),
    ajustes: async () => ({
      productionEnabled: generacion,
      remolquesPlanteamientosDirectory: planteamientos,
      remolquesOficinaTecnicaDirectory: path.join(oficina, "{YYYY}"),
    }),
    parametros: async () => DEFAULT_PARAMS,
    coordina: {
      statusOf: async (ofs, opciones) => {
        llamadas.coordina.push({ ofs, fresh: opciones?.fresh });
        return estadoCoordina;
      },
    },
    tecnicos: ["JAIME", "IVÁN", "ÁNGEL"],
    hacerPdf: async (datos) => {
      llamadas.pdf.push(datos);
      if (retenido) {
        retenido.entrar();
        await retenido.espera;
      }
      const documento = await pdfLib.PDFDocument.create();
      datos.elementos.forEach(() => documento.addPage([842, 595]));
      return documento.save();
    },
    esPedidoDeToldos: async (codigo) => toldos.includes(codigo),
    ahora: () => new Date("2026-10-01T08:00:00.000Z"),
  });
  return {
    servicio,
    llamadas,
    pdfPlan: path.join(planteamientos, "AR2604286-10.pdf"),
    pdfOficina: path.join(oficina, "2026", "AR2604286.pdf"),
    cambiarCoordina: (nuevo: EstadoCoordina) => { estadoCoordina = nuevo; },
    /** El próximo PDF se queda esperando hasta soltarlo; `dentro` se cumple al empezar a hacerlo. */
    retenerPdf: () => {
      let entrar!: () => void;
      let abrir!: () => void;
      const dentro = new Promise<void>((resolver) => { entrar = resolver; });
      retenido = { entrar, espera: new Promise<void>((resolver) => { abrir = resolver; }) };
      return { dentro, soltar: () => { retenido = null; abrir(); } };
    },
  };
}

type Servicio = ReturnType<typeof montar>["servicio"];
const guardar = (servicio: Servicio, extra: Record<string, unknown> = {}) =>
  servicio.guardar({ elementos: ELEMENTOS(), params: DEFAULT_PARAMS, savedBy: "IVÁN", ...extra });

async function falla(promesa: Promise<unknown>) {
  try {
    await promesa;
  } catch (error) {
    return [(error as { statusCode?: number }).statusCode, (error as Error).message];
  }
  throw new Error("no ha fallado");
}

describe("guardar para revisión", () => {
  it("crea el pedido pendiente con quien guarda como autor y sale en Pedidos de su año", async () => {
    const { servicio } = montar();
    const r = await guardar(servicio);
    expect(r.status).toBe(200);
    expect(r.cuerpo).toMatchObject({
      ok: true, overwritten: false,
      review: { orderCode: "AR2604286", kind: "remolques", status: "PENDING_REVIEW", summary: { technician: "IVÁN", reviewer: "", ofs: ["0231780", "0231781"] } },
    });
    expect((await servicio.listar(2026)).reviews.map((p) => p.orderCode)).toEqual(["AR2604286"]);
    expect((await servicio.listar(2025)).reviews).toEqual([]);
    const pedido = await servicio.obtener("ar.26.04286");
    expect(pedido.elementos.map((e) => e.input.cabecera.realizadoPor)).toEqual(["IVÁN", "IVÁN"]);
  });

  it("si ya está, pide confirmar; quien lo vuelve a guardar queda de revisor y el autor no cambia", async () => {
    const { servicio } = montar();
    await guardar(servicio);
    expect(await guardar(servicio, { savedBy: "JAIME" })).toEqual({
      status: 409, cuerpo: { needsConfirmation: true, existing: ["AR2604286"], error: "Este pedido ya está guardado en Pedidos." },
    });
    const r = await guardar(servicio, { savedBy: "JAIME", confirmOverwrite: true });
    expect(r.cuerpo).toMatchObject({ overwritten: true, review: { summary: { technician: "IVÁN", reviewer: "JAIME" } } });
  });

  it("guarda con los parámetros que manda la pantalla y, si no manda, con los comunes", async () => {
    const { servicio } = montar();
    const propios: CalcParams = { ...DEFAULT_PARAMS, demasiaAlto: DEFAULT_PARAMS.demasiaAlto + 1 };
    await guardar(servicio, { params: propios });
    expect((await servicio.obtener("AR2604286")).params.demasiaAlto).toBe(propios.demasiaAlto);
    await servicio.guardar({ elementos: ELEMENTOS(), savedBy: "IVÁN", confirmOverwrite: true });
    expect((await servicio.obtener("AR2604286")).params).toEqual(DEFAULT_PARAMS);
    expect(paramsDeLaPantalla(propios)).toEqual(propios);
    expect(() => paramsDeLaPantalla({ ...DEFAULT_PARAMS, pasoOllaosDefecto: 0 }))
      .toThrow("Los parámetros de remolques del pedido no son válidos: «pasoOllaosDefecto» debe ser mayor que 0.");
  });

  it("no guarda un elemento incompleto, un número que es de toldos ni encima de uno generado", async () => {
    const { servicio } = montar({ toldos: ["AR2699999"] });
    const [lona] = ELEMENTOS();
    expect(await falla(servicio.guardar({ elementos: [{ ...lona, input: { ...lona.input, altoDelante: 0 } }], savedBy: "IVÁN" })))
      .toEqual([400, "Remolque 1: Introduce el alto delantero."]);
    expect(await falla(servicio.guardar({ elementos: [elemento("lona-02", "10", "1", "AR.26.99999")], savedBy: "IVÁN" })))
      .toEqual([409, "AR2699999 ya está guardado como pedido de toldos: un pedido es de toldos o de remolques. Revisa el número."]);
    await guardar(servicio);
    await servicio.generar("AR2604286", {});
    expect(await falla(guardar(servicio, { confirmOverwrite: true }))).toEqual([409, PRODUCED_SAVE_ERROR]);
  });
});

describe("generar archivos", () => {
  it("con todo aprobado hace el PDF con el revisor, lo deja en las dos carpetas con los datos dentro y pasa a PRODUCED", async () => {
    const { servicio, llamadas, pdfPlan, pdfOficina } = montar();
    await guardar(servicio);
    const r = await servicio.generar("AR2604286", {});
    expect(r.status).toBe(200);
    expect(r.cuerpo).toMatchObject({
      ok: true, nombre: "AR2604286-10.pdf",
      review: { status: "PRODUCED", reviewedBy: "JAIME" },
      saved: [
        { type: "pdf", filename: "AR2604286-10.pdf", savedPath: pdfPlan },
        { type: "pdf", filename: "AR2604286.pdf", savedPath: pdfOficina },
      ],
    });
    expect(llamadas.coordina).toEqual([{ ofs: ["0231780", "0231781"], fresh: true }]);
    expect(llamadas.pdf[0].revisadoPor).toBe("JAIME");
    expect(llamadas.pdf[0].elementos.map((e) => e.version)).toEqual(["10", "11"]);
    const plan = readFileSync(pdfPlan);
    expect(plan.equals(readFileSync(pdfOficina))).toBe(true);
    const dentro = await leerDatosPedido(plan);
    expect(dentro).toMatchObject({
      orderCode: "AR2604286", status: "PRODUCED", reviewedBy: "JAIME",
      production: { files: [{ savedPath: pdfPlan }, { savedPath: pdfOficina }] },
    });
    expect(dentro.elementos.map((e) => e.input.cabecera.revision)).toEqual(["JAIME", "JAIME"]);
    expect(await servicio.obtener("AR2604286")).toEqual(dentro);
    // Ya generado: no se vuelve a hacer.
    expect(await servicio.generar("AR2604286", {})).toMatchObject({ status: 200, cuerpo: { ok: true, unchanged: true } });
    expect(llamadas.pdf).toHaveLength(1);
  });

  it("no genera con la generación desactivada, sin aprobar o sin CoordinaOT", async () => {
    const apagado = montar({ generacion: false });
    await guardar(apagado.servicio);
    expect(await falla(apagado.servicio.generar("AR2604286", {})))
      .toEqual([403, "La generación de archivos está desactivada en Configuración: no se ha generado nada."]);
    const m = montar({ coordina: { disponible: true, ofs: { "0231780": { estado: "devuelta", nota: "cota" }, "0231781": { estado: "aprobada", revisor: "jaime" } } } });
    await guardar(m.servicio);
    expect(await falla(m.servicio.generar("AR2604286", {}))).toEqual([409, "Sin aprobar en CoordinaOT: A (0231780) devuelta."]);
    m.cambiarCoordina({ disponible: false, motivo: "CoordinaOT no responde." });
    expect(await falla(m.servicio.generar("AR2604286", {}))).toEqual([503, COORDINA_UNAVAILABLE]);
    expect(m.llamadas.pdf).toHaveLength(0);
    expect(existsSync(m.pdfPlan)).toBe(false);
  });

  it("sin OF en un elemento lo dice como elemento", async () => {
    const { servicio } = montar();
    await servicio.guardar({ elementos: [elemento("lona-02", "10", "231780"), elemento("baqueton-01", "11", "")], savedBy: "IVÁN" });
    expect(await falla(servicio.generar("AR2604286", {}))).toEqual([409, "Falta la OF en el elemento B."]);
  });

  it("si un PDF ya está en las carpetas, pregunta antes de hacer nada y sustituye solo confirmando", async () => {
    const { servicio, pdfPlan, pdfOficina, llamadas } = montar();
    await guardar(servicio);
    mkdirSync(path.dirname(pdfOficina), { recursive: true });
    writeFileSync(pdfOficina, "%PDF-viejo");
    expect(await servicio.generar("AR2604286", {})).toEqual({ status: 409, cuerpo: { needsConfirmation: true, existing: ["AR2604286.pdf"] } });
    expect(llamadas.pdf).toHaveLength(0);
    expect((await servicio.generar("AR2604286", { confirmOverwrite: true })).status).toBe(200);
    expect(readFileSync(pdfOficina).equals(readFileSync(pdfPlan))).toBe(true);
  });

  it("no genera dos veces a la vez el mismo pedido", async () => {
    const m = montar();
    await guardar(m.servicio);
    const { dentro, soltar } = m.retenerPdf();
    const primero = m.servicio.generar("AR2604286", {});
    await dentro;
    expect(await m.servicio.generar("AR2604286", {})).toEqual({ status: 409, cuerpo: { error: "Ya se están generando los archivos de este pedido." } });
    soltar();
    expect((await primero).status).toBe(200);
  });
});

describe("ver la hoja guardada y el PDF generado", () => {
  it("la vista previa usa los parámetros guardados, sin revisor, y no escribe nada", async () => {
    const { servicio, llamadas, pdfPlan } = montar();
    const propios: CalcParams = { ...DEFAULT_PARAMS, demasiaAlto: DEFAULT_PARAMS.demasiaAlto + 1 };
    await guardar(servicio, { params: propios });
    const { pdf, nombre } = await servicio.vistaPrevia("AR2604286");
    expect(nombre).toBe("AR2604286-10.pdf");
    expect(Buffer.from(pdf).subarray(0, 4).toString("ascii")).toBe("%PDF");
    expect(llamadas.pdf[0].params.demasiaAlto).toBe(propios.demasiaAlto);
    expect(llamadas.pdf[0].revisadoPor).toBe("");
    expect(existsSync(pdfPlan)).toBe(false);
    expect(await falla(servicio.obtener("AR2600000"))).toEqual([404, "No se encontró el pedido de remolques."]);
  });

  it("el generado se abre de planteamientos o, si RPS ya se lo llevó, de oficina técnica", async () => {
    const { servicio, pdfPlan, pdfOficina } = montar();
    await guardar(servicio);
    expect(await falla(servicio.archivo("AR2604286"))).toEqual([404, "Este pedido todavía no tiene archivos generados."]);
    await servicio.generar("AR2604286", {});
    expect((await servicio.archivo("AR2604286")).nombre).toBe("AR2604286-10.pdf");
    rmSync(pdfPlan);
    expect((await servicio.archivo("AR2604286")).nombre).toBe("AR2604286.pdf");
    rmSync(pdfOficina);
    expect(await falla(servicio.archivo("AR2604286"))).toEqual([404, "El PDF generado ya no está en sus carpetas de archivo."]);
  });
});
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `pnpm exec vitest run src/remolques/flujo/__tests__/servicio.test.ts`
Expected: FAIL — `Failed to load url ../servicio.ts`.

- [ ] **Step 3: Implementar el servicio**

Crear `src/remolques/flujo/servicio.ts`:

```ts
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  approvalReviewers, ELEMENT_NOUNS, generateFilesDecision, generationBlock, reviewAuthorship, saveReviewDecision, uniqueOfs,
} from "../../reviewRules.js";
import type { CalcParams } from "../calc/params.ts";
import { validarParams } from "../calc/validar-params.ts";
import { prepararPedidoHoja } from "../hoja/pedido.ts";
import type { DatosHojaPedido } from "../hoja/tipos.ts";
import { archivarPdfRemolques, destinosPdfRemolques, ErrorArchivoPdf, type CarpetasRemolques } from "../salida/archivo.ts";
import { nombrePdf } from "../salida/nombre-pdf.ts";
import { adjuntarDatosPedido } from "./adjunto.ts";
import type { AlmacenPedidosRemolques } from "./almacen.ts";
import {
  anioPedido, codigoPedido, crearPedidoRemolques, elementosAprobacion, elementosPedidoHoja, ErrorPedidoRemolques,
  marcarPedidoGenerado, resumenBandeja,
} from "./pedido.ts";
import type { FicheroGenerado, PedidoRemolques, ResumenPedidoRemolques } from "./tipos.ts";

// El flujo de un pedido de remolques en el servidor (fase 5), con las reglas de toldos de
// src/reviewRules.js. Las rutas de src/server.js solo pasan la petición y devuelven la respuesta.
// Los errores llevan su código (statusCode): 400 dato mal, 403 generación apagada, 404 no está,
// 409 conflicto, 503 CoordinaOT o Chromium no responden.

/** Lo que devuelve coordinaStatus.js (statusOf). */
export type EstadoCoordina = {
  disponible: boolean;
  motivo?: string;
  ofs?: Record<string, { estado?: string; nota?: string; revisor?: string; actualizado?: string | null }>;
};

export interface DependenciasPedidosRemolques {
  almacen: AlmacenPedidosRemolques;
  /** Configuración → Rutas de trabajo en este momento. */
  ajustes: () => Promise<CarpetasRemolques>;
  /** Los parámetros comunes de remolques, si la pantalla no manda los suyos. */
  parametros: () => Promise<CalcParams>;
  coordina: { statusOf(ofs: string[], opciones?: { fresh?: boolean }): Promise<EstadoCoordina> };
  /** La lista de técnicos de toldos (la de «Soy»): da el nombre del revisor de CoordinaOT. */
  tecnicos: string[];
  /** La hoja de taller en PDF (servicio de Chromium de la fase 4). */
  hacerPdf: (datos: DatosHojaPedido) => Promise<Uint8Array>;
  /** true si ese número ya está guardado como pedido de toldos (nunca hay pedidos mixtos). */
  esPedidoDeToldos: (orderCode: string) => Promise<boolean>;
  ahora?: () => Date;
}

export interface Respuesta {
  status: number;
  cuerpo: unknown;
}

/** Los parámetros que manda la pantalla, comprobados como se guardan los de Parámetros. */
export function paramsDeLaPantalla(bruto: unknown): CalcParams {
  const resultado = validarParams(bruto);
  if (!resultado.ok) {
    throw new ErrorPedidoRemolques(`Los parámetros de remolques del pedido no son válidos: ${resultado.errores.join("; ")}.`);
  }
  return resultado.params;
}

async function existeFichero(fichero: string): Promise<boolean> {
  try {
    return (await stat(fichero)).isFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export function crearServicioPedidosRemolques(deps: DependenciasPedidosRemolques) {
  const reloj = deps.ahora ?? (() => new Date());
  const ahora = () => reloj().toISOString();
  // Un bloqueo por pedido: dos «Generar archivos» a la vez no escriben dos veces.
  const generando = new Set<string>();

  async function obtener(orderCode: string): Promise<PedidoRemolques> {
    const pedido = await deps.almacen.obtener(codigoPedido(orderCode));
    if (!pedido) throw new ErrorPedidoRemolques("No se encontró el pedido de remolques.", 404);
    return pedido;
  }

  async function listar(anio: number): Promise<{ year: number; reviews: ResumenPedidoRemolques[] }> {
    const pedidos = await deps.almacen.listar();
    return { year: anio, reviews: pedidos.filter((pedido) => anioPedido(pedido) === anio).map(resumenBandeja) };
  }

  async function guardar(cuerpo: unknown): Promise<Respuesta> {
    const c = (cuerpo ?? {}) as { elementos?: unknown; params?: unknown; savedBy?: unknown; confirmOverwrite?: unknown };
    const params = c.params === undefined || c.params === null ? await deps.parametros() : paramsDeLaPantalla(c.params);
    // Completo, del mismo pedido, ordenado y calculado aquí: nunca se guarda un resultado que no salga del cálculo.
    const datos = prepararPedidoHoja(c.elementos, params);
    const orderCode = codigoPedido(datos.elementos[0].input.cabecera.numeroPedido);
    if (await deps.esPedidoDeToldos(orderCode)) {
      throw new ErrorPedidoRemolques(`${orderCode} ya está guardado como pedido de toldos: un pedido es de toldos o de remolques. Revisa el número.`, 409);
    }
    const existente = await deps.almacen.obtener(orderCode);
    const decision = saveReviewDecision(existente, c.confirmOverwrite === true);
    if (decision.action === "refuse") throw new ErrorPedidoRemolques(decision.error, decision.statusCode);
    if (decision.action === "confirm") {
      return { status: 409, cuerpo: { needsConfirmation: true, existing: [orderCode], error: "Este pedido ya está guardado en Pedidos." } };
    }
    const autoria = reviewAuthorship({
      existingTechnician: existente?.summary.technician,
      existingReviewer: existente?.summary.reviewer,
      technician: datos.elementos[0].input.cabecera.realizadoPor,
      savedBy: typeof c.savedBy === "string" ? c.savedBy : "",
    });
    const pedido = crearPedidoRemolques({ datos, autoria, existente, ahora: ahora() });
    await deps.almacen.guardar(pedido);
    return { status: 200, cuerpo: { ok: true, review: resumenBandeja(pedido), overwritten: Boolean(existente) } };
  }

  async function generar(orderCodeBruto: string, cuerpo: unknown): Promise<Respuesta> {
    const orderCode = codigoPedido(orderCodeBruto);
    if (generando.has(orderCode)) return { status: 409, cuerpo: { error: "Ya se están generando los archivos de este pedido." } };
    generando.add(orderCode);
    try {
      const confirmar = (cuerpo as { confirmOverwrite?: unknown } | null)?.confirmOverwrite === true;
      const ajustes = await deps.ajustes();
      if (!ajustes.productionEnabled) {
        throw new ErrorPedidoRemolques("La generación de archivos está desactivada en Configuración: no se ha generado nada.", 403);
      }
      const pedido = await obtener(orderCode);
      const decision = generateFilesDecision(pedido.status);
      if (decision.action === "unchanged") {
        return { status: 200, cuerpo: { ok: true, unchanged: true, review: resumenBandeja(pedido), saved: pedido.production?.files ?? [] } };
      }
      if (decision.action === "refuse") throw new ErrorPedidoRemolques(decision.error, decision.statusCode);

      // Dónde irá: si faltan las carpetas o el número no vale, se dice antes de preguntar a nadie.
      const { nombre, destinos } = destinosPdfRemolques(pedido.numeroPedido, pedido.summary.orderDate, ajustes);

      // Solo se genera lo que CoordinaOT ha aprobado, OF por OF, preguntando en el momento.
      const aprobacion = elementosAprobacion(pedido);
      const estado = await deps.coordina.statusOf(uniqueOfs(aprobacion), { fresh: true });
      const bloqueo = generationBlock(aprobacion, estado, ELEMENT_NOUNS);
      if (bloqueo) throw new ErrorPedidoRemolques(bloqueo, estado.disponible ? 409 : 503);
      const revisor = approvalReviewers(aprobacion, estado, deps.tecnicos);

      // Si ya hay un PDF de este pedido, se pregunta antes de hacer el nuevo.
      const yaEstan = (await Promise.all(destinos.map(existeFichero)))
        .map((existe, indice) => (existe ? path.basename(destinos[indice]) : ""))
        .filter(Boolean);
      if (yaEstan.length > 0 && !confirmar) return { status: 409, cuerpo: { needsConfirmation: true, existing: yaEstan } };

      const ficheros: FicheroGenerado[] = destinos.map((savedPath) => ({ type: "pdf", filename: path.basename(savedPath), savedPath }));
      const generado = marcarPedidoGenerado(pedido, { revisor, ficheros, ahora: ahora() });
      const datos: DatosHojaPedido = { ...prepararPedidoHoja(elementosPedidoHoja(pedido), pedido.params), revisadoPor: revisor };
      const pdf = await adjuntarDatosPedido(await deps.hacerPdf(datos), generado);
      try {
        await archivarPdfRemolques(pdf, { numeroPedido: pedido.numeroPedido, fecha: pedido.summary.orderDate }, ajustes, { sustituir: confirmar });
      } catch (error) {
        // Apareció un PDF desde la comprobación de arriba: se pregunta igual.
        if (error instanceof ErrorArchivoPdf && error.codigo === "PDF_EXISTENTE") {
          return { status: 409, cuerpo: { needsConfirmation: true, existing: destinos.map((destino) => path.basename(destino)) } };
        }
        throw error;
      }
      // Primero los PDF y después el estado: si el archivo falla, el pedido sigue pendiente y se puede repetir.
      await deps.almacen.guardar(generado);
      return { status: 200, cuerpo: { ok: true, review: resumenBandeja(generado), saved: ficheros, nombre } };
    } finally {
      generando.delete(orderCode);
    }
  }

  async function vistaPrevia(orderCode: string): Promise<{ pdf: Uint8Array; nombre: string }> {
    const pedido = await obtener(orderCode);
    const datos: DatosHojaPedido = {
      ...prepararPedidoHoja(elementosPedidoHoja(pedido), pedido.params),
      revisadoPor: pedido.status === "PRODUCED" ? pedido.reviewedBy : "",
    };
    return { pdf: await deps.hacerPdf(datos), nombre: nombrePdf(pedido.numeroPedido) };
  }

  async function archivo(orderCode: string): Promise<{ pdf: Uint8Array; nombre: string }> {
    const pedido = await obtener(orderCode);
    if (pedido.status !== "PRODUCED" || !pedido.production?.files.length) {
      throw new ErrorPedidoRemolques("Este pedido todavía no tiene archivos generados.", 404);
    }
    for (const fichero of pedido.production.files) {
      try {
        return { pdf: await readFile(fichero.savedPath), nombre: fichero.filename };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    throw new ErrorPedidoRemolques("El PDF generado ya no está en sus carpetas de archivo.", 404);
  }

  return { listar, obtener, guardar, generar, vistaPrevia, archivo };
}
```

- [ ] **Step 4: Ejecutar la prueba**

Run: `pnpm exec vitest run src/remolques/flujo/__tests__/servicio.test.ts && pnpm typecheck`
Expected: PASS (11 pruebas) y `tsc` sin errores.

- [ ] **Step 5: Las rutas en el servidor**

En `src/server.js`:

Imports, después de `import { nombrePdf } from './remolques/salida/nombre-pdf.ts';`:

```js
import { crearAlmacenPedidosRemolques } from './remolques/flujo/almacen.ts';
import { ErrorPedidoRemolques } from './remolques/flujo/pedido.ts';
import { crearServicioPedidosRemolques, paramsDeLaPantalla } from './remolques/flujo/servicio.ts';
```

Después de `const servicioPdfRemolques = crearServicioPdf({ urlHoja: urlHojaRemolques });`:

```js
// Pedidos de remolques (fase 5): un JSON por pedido en la carpeta interna de Configuración y el
// mismo camino que toldos (CoordinaOT aprueba, el autor genera, los dos PDF con sus datos dentro).
const pedidosRemolques = crearServicioPedidosRemolques({
  almacen: crearAlmacenPedidosRemolques({
    carpeta: async () => (await workflowStore.getSettings()).remolquesRevisionDirectory
  }),
  ajustes: () => workflowStore.getSettings(),
  parametros: () => remolquesParametersStore.get(),
  coordina,
  tecnicos: formOptions.tecnicos,
  hacerPdf: hojaRemolquesPdf,
  esPedidoDeToldos: async (orderCode) => {
    try {
      await workflowStore.getReview(orderCode);
      return true;
    } catch {
      return false;
    }
  }
});
```

En la ruta `app.post('/api/remolques/pdf', …)`, sustituir:

```js
    const datos = prepararPedidoHoja(req.body?.elementos, await remolquesParametersStore.get());
```

por:

```js
    // «Corregir» un pedido guardado manda los parámetros con que se guardó; si no, los comunes.
    const params = req.body?.params === undefined
      ? await remolquesParametersStore.get()
      : paramsDeLaPantalla(req.body.params);
    const datos = prepararPedidoHoja(req.body?.elementos, params);
```

y en su `catch`, `if (error instanceof ErrorPedidoHoja) {` por `if (error instanceof ErrorPedidoHoja || error instanceof ErrorPedidoRemolques) {`.

Después de esa ruta (antes de `// Estado de las OF en CoordinaOT para la web`):

```js
// Pedidos de remolques (fase 5). Un error del pedido llega con su código; uno inesperado es 500.
function rutaRemolques(manejar) {
  return async (req, res, next) => {
    try {
      await manejar(req, res);
    } catch (error) {
      if (error?.statusCode) return next(error);
      console.error('Fallo inesperado en los pedidos de remolques:', error);
      return next(httpError(500, `No se pudo completar la operación por un fallo del servidor: ${error instanceof Error ? error.message : String(error)}`));
    }
  };
}

app.get('/api/remolques/pedidos', rutaRemolques(async (req, res) => {
  const year = Number(req.query.year) || new Date().getFullYear();
  if (year < 2000 || year > 2100) throw httpError(400, 'El año no es válido.');
  res.set('Cache-Control', 'no-store').json(await pedidosRemolques.listar(year));
}));

app.post('/api/remolques/pedidos', rutaRemolques(async (req, res) => {
  const { status, cuerpo } = await pedidosRemolques.guardar(req.body);
  res.status(status).json(cuerpo);
}));

app.get('/api/remolques/pedidos/:orderCode', rutaRemolques(async (req, res) => {
  res.set('Cache-Control', 'no-store').json(await pedidosRemolques.obtener(req.params.orderCode));
}));

// La hoja de un pedido guardado, con sus parámetros: nunca se archiva.
app.get('/api/remolques/pedidos/:orderCode/vista-previa', rutaRemolques(async (req, res) => {
  const { pdf, nombre } = await pedidosRemolques.vistaPrevia(req.params.orderCode);
  enviarPdf(res, pdf, nombre);
}));

app.post('/api/remolques/pedidos/:orderCode/generar', rutaRemolques(async (req, res) => {
  const { status, cuerpo } = await pedidosRemolques.generar(req.params.orderCode, req.body);
  res.status(status).json(cuerpo);
}));

app.get('/api/remolques/pedidos/:orderCode/archivo', rutaRemolques(async (req, res) => {
  const { pdf, nombre } = await pedidosRemolques.archivo(req.params.orderCode);
  enviarPdf(res, pdf, nombre);
}));
```

Junto a las funciones del final (después de `urlHojaRemolques`):

```js
/** La hoja de taller de remolques en PDF con el servicio de Chromium; su ficha se borra siempre. */
async function hojaRemolquesPdf(datos) {
  let id = null;
  try {
    return await servicioPdfRemolques.generar({ preparar: () => (id = fichasHojaRemolques.guardar(datos)) });
  } finally {
    if (id) fichasHojaRemolques.borrar(id);
  }
}

function enviarPdf(res, pdf, nombre) {
  res.set('Cache-Control', 'no-store')
    .setHeader('Content-Type', 'application/pdf')
    .setHeader('Content-Disposition', `inline; filename="${String(nombre).replace(/["\\\r\n]/g, '_')}"`)
    .send(Buffer.from(pdf));
}
```

- [ ] **Step 6: Probar las rutas en la aislada**

Run (en segundo plano): `ISOLATED_DIR="$PWD/tmp/remolques-5" PORT=4311 FAKE_COORDINA_PORT=4321 bash .claude/skills/running-toldos-testar/start-isolated.sh`
Esperar a `curl -fsS http://127.0.0.1:4311/api/health` (`"simulationMode":true`, `"fileWritesEnabled":false`).

Run:

```bash
node --input-type=module -e "
import fs from 'node:fs';
const c = JSON.parse(fs.readFileSync('src/remolques/__fixtures__/produccion-2026-09.json', 'utf8')).find((x) => x.caso === 'lona-02');
const input = { ...c.input, cabecera: { ...c.input.cabecera, numeroPedido: 'AR.26.99509', version: '10', ordenFabricacion: '0299509' } };
const base = 'http://127.0.0.1:4311/api/remolques/pedidos';
const r = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ elementos: [{ version: '10', tipo: 'lona', input }], savedBy: 'IVÁN', confirmOverwrite: true }) });
console.log(r.status, (await r.json()).review?.orderCode);
const l = await (await fetch(base + '?year=2026')).json();
console.log(l.reviews.map((p) => p.orderCode + ' ' + p.kind + ' ' + p.summary.awningList.map((e) => e.letter + ':' + e.model).join(',')).join(' | '));
const v = await fetch(base + '/AR2699509/vista-previa');
console.log(v.status, v.headers.get('content-type'));
const g = await fetch(base + '/AR2699509/generar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
console.log(g.status, (await g.json()).error);
"
```

Expected:
```
200 AR2699509
AR2699509 remolques A:Arquillado con aguas
200 application/pdf
403 La generación de archivos está desactivada en Configuración: no se ha generado nada.
```

Borrar lo de la prueba: `rm -f tmp/remolques-5/rem-revision/AR2699509.json` y parar la instancia.

- [ ] **Step 7: Toda la batería**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: todo PASS.

- [ ] **Step 8: Commit**

```bash
git add src/remolques/flujo/servicio.ts src/remolques/flujo/__tests__/servicio.test.ts src/server.js
git commit -m "feat(remolques): guardar, listar, abrir y generar pedidos de remolques en el servidor

Fase 5: el mismo camino que toldos con sus mismas reglas (reviewRules.js):
guardar para revisión con autor y revisor, un pedido generado no se pisa,
«Generar archivos» con CoordinaOT en fresco, un bloqueo por pedido, el
revisor en «REVISADO POR» y el pedido dentro del PDF, archivado en las dos
carpetas de siempre con 409 antes de sustituir. La vista previa de la
pantalla admite los parámetros del pedido para «Corregir».

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Remolques: «Guardar para revisión», «Corregir» y «Reutilizar» en la pantalla

Modelo recomendado: el más capaz (Opus). Esfuerzo: alto (el hook tiene borradores del navegador y consultas en vuelo que no deben pisar lo cargado).

**Files:**
- Create: `src/client/remolques/guardarPedido.ts`, `src/client/remolques/guardarPedido.test.ts`
- Modify: `src/client/remolques/vistaPrevia.ts`, `src/client/remolques/vistaPrevia.test.ts`, `src/client/remolques/VistaPreviaPdf.tsx`
- Modify: `src/client/remolques/useRemolques.ts`, `src/client/remolques/useRemolques.test.ts`, `src/client/remolques/RemolquesView.tsx`, `src/client/App.tsx`

**Interfaces:**
- Consumes: Task 2 (`PedidoRemolques`), Task 5 (`POST /api/remolques/pedidos` y `POST /api/remolques/pdf` con `params`). De antes: `cuerpoVistaPrevia`, `faltaParaPdf` (`vistaPrevia.ts`), `limpiarBorradores` (`workspace/borradores-locales.ts`), `estadoLinea` (`workspace/lineas.ts`).
- Produces: `type ModoCarga = 'corregir' | 'reutilizar'`, `cuerpoGuardar(lineas, params, savedBy, confirmOverwrite)`, `lineasDesdePedidoGuardado(pedido, modo, usuario, hoy): LineaPedido[]`; `peticionVistaPrevia({ lineas?, params?, origen? }): { url; init: RequestInit; clave }`; `VistaPreviaPdf` con props `lineas?`, `params?`, `origen?`; acción `{ tipo: 'PEDIDO_CARGADO'; numeroPedido; cliente; fecha; lineas }`; `useRemolques({ usuario, notify, askForConfirmation, onGuardado? })` devuelve además `guardando: boolean`, `conParamsGuardados: boolean`, `guardarParaRevision(): Promise<void>`, `cargarPedidoGuardado(pedido: PedidoRemolques, modo: ModoCarga): Promise<void>`; `RemolquesView` con props `pedidoGuardadoSolicitado?: { id: number; pedido: PedidoRemolques; modo: ModoCarga } | null` y `onGuardado?: () => void`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/client/remolques/guardarPedido.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { emptyBaqueton, emptyLona } from '../../remolques/entradas-vacias.ts';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import { cuerpoGuardar, lineasDesdePedidoGuardado } from './guardarPedido';
import { cuerpoVistaPrevia } from './vistaPrevia';

const lona = emptyLona();
const baqueton = emptyBaqueton();
const linea: LineaPedido = {
  version: '10', tipo: 'lona',
  input: { ...lona, observaciones: 'UNO\n\nDOS\n', cabecera: { ...lona.cabecera, numeroPedido: 'AR.26.04286' } },
};

describe('cuerpoGuardar', () => {
  it('manda lo de la vista previa (sin resultado y con las observaciones limpias), los parámetros y quién guarda', () => {
    expect(cuerpoGuardar([linea], DEFAULT_PARAMS, 'IVÁN', false)).toEqual({
      ...cuerpoVistaPrevia([linea]), params: DEFAULT_PARAMS, savedBy: 'IVÁN', confirmOverwrite: false,
    });
  });
});

describe('lineasDesdePedidoGuardado', () => {
  const pedido = {
    elementos: [
      { version: '10', tipo: 'lona', input: { ...lona, largo: 250, cabecera: { ...lona.cabecera, realizadoPor: 'JAIME', revision: 'ÁNGEL', fecha: '2026-09-01' } }, result: {}, paramsSnapshot: DEFAULT_PARAMS },
      { version: '11', tipo: 'baqueton', input: { ...baqueton, cabecera: { ...baqueton.cabecera, realizadoPor: 'JAIME', revision: 'ÁNGEL', fecha: '2026-09-01' } }, result: {}, paramsSnapshot: DEFAULT_PARAMS },
    ],
  } as unknown as PedidoRemolques;

  it('«Corregir» deja los elementos como se guardaron', () => {
    expect(lineasDesdePedidoGuardado(pedido, 'corregir', 'IVÁN', '2026-10-01'))
      .toEqual(pedido.elementos.map(({ version, tipo, input }) => ({ version, tipo, input })));
  });

  it('«Reutilizar» es un pedido nuevo: lo hace quien está, sin revisor y con la fecha de hoy', () => {
    const lineas = lineasDesdePedidoGuardado(pedido, 'reutilizar', 'IVÁN', '2026-10-01');
    expect(lineas.map((l) => [l.version, l.input.cabecera.realizadoPor, l.input.cabecera.revision, l.input.cabecera.fecha]))
      .toEqual([['10', 'IVÁN', '', '2026-10-01'], ['11', 'IVÁN', '', '2026-10-01']]);
    expect(lineas[0].input.largo).toBe(250);
  });
});
```

En `src/client/remolques/vistaPrevia.test.ts`, cambiar el import de `./vistaPrevia` a `import { crearGuardaPeticion, cuerpoVistaPrevia, faltaParaPdf, peticionVistaPrevia } from './vistaPrevia';`, añadir `import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';` y, al final:

```ts
describe('peticionVistaPrevia', () => {
  it('de la pantalla: POST con los elementos y, solo si se dan, los parámetros', () => {
    const sin = peticionVistaPrevia({ lineas: [linea('10')] });
    expect(sin.url).toBe('/api/remolques/pdf');
    expect(sin.init.method).toBe('POST');
    expect(JSON.parse(String(sin.init.body))).toEqual(cuerpoVistaPrevia([linea('10')]));
    const con = peticionVistaPrevia({ lineas: [linea('10')], params: DEFAULT_PARAMS });
    expect(JSON.parse(String(con.init.body))).toEqual({ ...cuerpoVistaPrevia([linea('10')]), params: DEFAULT_PARAMS });
    expect(con.clave).not.toBe(sin.clave);
  });

  it('de un pedido guardado: GET a su dirección', () => {
    const ruta = '/api/remolques/pedidos/AR2604286/vista-previa';
    expect(peticionVistaPrevia({ origen: ruta })).toEqual({ url: ruta, init: { cache: 'no-store' }, clave: ruta });
  });
});
```

En `src/client/remolques/useRemolques.test.ts`, al final:

```ts
describe('reducirRemolques · abrir un pedido guardado', () => {
  it('sustituye el pedido abierto por el guardado, con su fecha en cada elemento y el primero abierto', () => {
    const abierto: EstadoRemolques = {
      ...vacio(), numeroPedido: 'AR.26.00001', cliente: 'OTRO', lineas: [linea('10', 'OTRO', '2026-09-01')],
      versionActiva: '10', validacionIntentada: true,
    };
    const siguiente = reducirRemolques(abierto, {
      tipo: 'PEDIDO_CARGADO', numeroPedido: 'AR.26.04286', cliente: 'TALLERES CAL', fecha: '2026-09-20',
      lineas: [linea('10', 'TALLERES CAL', '2026-09-01'), linea('11', 'TALLERES CAL', '2026-09-01')],
    });
    expect(siguiente).toMatchObject({
      numeroPedido: 'AR.26.04286', cliente: 'TALLERES CAL', fecha: '2026-09-20', versionActiva: '10',
      cargandoPedido: false, validacionIntentada: false,
    });
    expect(siguiente.lineas.map((l) => [l.version, l.input.cabecera.fecha])).toEqual([['10', '2026-09-20'], ['11', '2026-09-20']]);
  });
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `pnpm exec vitest run src/client/remolques/guardarPedido.test.ts src/client/remolques/vistaPrevia.test.ts src/client/remolques/useRemolques.test.ts`
Expected: FAIL — no existe `./guardarPedido`, `peticionVistaPrevia is not a function` y `PEDIDO_CARGADO` no cambia el estado.

- [ ] **Step 3: Las piezas puras**

Crear `src/client/remolques/guardarPedido.ts`:

```ts
import type { CalcParams } from '../../remolques/calc/params.ts';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import { cuerpoVistaPrevia } from './vistaPrevia';

// «Guardar para revisión» y abrir un pedido guardado en Remolques (fase 5).

export type ModoCarga = 'corregir' | 'reutilizar';

/** Lo que manda «Guardar para revisión»: los elementos (el servidor los calcula), los parámetros con que se ven y quién guarda. */
export function cuerpoGuardar(lineas: LineaPedido[], params: CalcParams, savedBy: string, confirmOverwrite: boolean) {
  return { ...cuerpoVistaPrevia(lineas), params, savedBy, confirmOverwrite };
}

/**
 * Las líneas de un pedido guardado para volver a la pantalla. «Corregir» lo deja tal cual: el autor
 * lo decide el servidor al guardar. «Reutilizar» es un pedido nuevo, como en toldos: lo hace quien
 * está («Soy»), sin revisor y con la fecha de hoy.
 */
export function lineasDesdePedidoGuardado(pedido: Pick<PedidoRemolques, 'elementos'>, modo: ModoCarga, usuario: string, hoy: string): LineaPedido[] {
  return pedido.elementos.map(({ version, tipo, input }) => ({
    version,
    tipo,
    input: modo === 'corregir'
      ? input
      : { ...input, cabecera: { ...input.cabecera, realizadoPor: usuario, revision: '', fecha: hoy } },
  }));
}
```

En `src/client/remolques/vistaPrevia.ts`, añadir el import `import type { CalcParams } from '../../remolques/calc/params.ts';` y, después de `cuerpoVistaPrevia`:

```ts
/**
 * A dónde y con qué se pide la hoja: la de la pantalla (POST con sus elementos y, si no son los
 * comunes, sus parámetros) o la de un pedido guardado (GET a su dirección). `clave` cambia cuando
 * cambia lo pedido.
 */
export function peticionVistaPrevia({ lineas = [], params, origen }: {
  lineas?: LineaPedido[];
  params?: CalcParams;
  origen?: string;
}): { url: string; init: RequestInit; clave: string } {
  if (origen) return { url: origen, init: { cache: 'no-store' }, clave: origen };
  const cuerpo = JSON.stringify({ ...cuerpoVistaPrevia(lineas), ...(params ? { params } : {}) });
  return { url: '/api/remolques/pdf', init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: cuerpo }, clave: cuerpo };
}
```

En `src/client/remolques/VistaPreviaPdf.tsx`:
- imports: `import type { CalcParams } from '../../remolques/calc/params.ts';` y cambiar `import { crearGuardaPeticion, cuerpoVistaPrevia } from './vistaPrevia';` por `import { crearGuardaPeticion, peticionVistaPrevia } from './vistaPrevia';`
- la firma y la clave:

```tsx
export function VistaPreviaPdf({ lineas, params, origen, bloqueo, notify }: {
  lineas?: LineaPedido[];
  /** Los parámetros con que se calcula si no son los comunes («Corregir» un pedido guardado). */
  params?: CalcParams;
  /** Un pedido ya guardado: la hoja se pide a esta dirección con sus datos y parámetros guardados. */
  origen?: string;
  /** Qué falta, o null si se puede pedir. */
  bloqueo: string | null;
  notify: Notify;
}) {
```

  y sustituir `const cuerpo = JSON.stringify(cuerpoVistaPrevia(lineas));` por:

```tsx
  const peticionPdf = peticionVistaPrevia({ lineas, params, origen });
  const cuerpo = peticionPdf.clave;
```

- en `abrir()`, sustituir el `fetch('/api/remolques/pdf', { … })` por:

```tsx
      const respuesta = await fetch(peticionPdf.url, { ...peticionPdf.init, signal: senal });
```

- [ ] **Step 4: El estado y el hook**

En `src/client/remolques/useRemolques.ts`:

Imports, después de `import { describirLineaRps, rotuloElemento } from './rotulo';`:

```ts
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import { cuerpoGuardar, lineasDesdePedidoGuardado, type ModoCarga } from './guardarPedido';
import { faltaParaPdf } from './vistaPrevia';
```

En `AccionRemolques`, después de `| { tipo: 'PEDIDO_LIMPIADO' }`:

```ts
  /** Un pedido guardado que se abre para «Corregir» o «Reutilizar» (fase 5): sustituye al abierto. */
  | { tipo: 'PEDIDO_CARGADO'; numeroPedido: string; cliente: string; fecha: string; lineas: LineaPedido[] };
```

(quitando el `;` de la línea de `PEDIDO_LIMPIADO`). En `reducirRemolques`, después de la línea de `PEDIDO_LIMPIADO`:

```ts
  if (accion.tipo === 'PEDIDO_CARGADO') {
    return {
      ...estadoInicial(),
      numeroPedido: accion.numeroPedido,
      cliente: accion.cliente,
      fecha: accion.fecha,
      lineas: accion.lineas.map((linea) => conFecha(linea, accion.fecha)),
      versionActiva: accion.lineas[0]?.version ?? null,
    };
  }
```

La firma del hook:

```ts
export function useRemolques({ usuario, notify, askForConfirmation, onGuardado }: {
  /** El «Soy» de la web: es quien figura como «Realizado por» en las líneas nuevas. */
  usuario: string;
  notify: Notify;
  askForConfirmation: AskForConfirmation;
  /** Tras guardar para revisión: Pedidos vuelve a leer sus listas. */
  onGuardado?: () => void;
}) {
```

Sustituir `const { materiales, origenMateriales, params, materialesRef, setMateriales } = useCatalogos();` por:

```ts
  const { materiales, origenMateriales, params: paramsComunes, materialesRef, setMateriales } = useCatalogos();
  // «Corregir» un pedido guardado calcula con los parámetros con que se guardó (fase 5); lo demás,
  // con los comunes. Se vuelve a los comunes al cambiar de pedido, al limpiar y al guardar.
  const [paramsGuardados, setParamsGuardados] = useState<CalcParams | null>(null);
  const params = paramsGuardados ?? paramsComunes;
  const [guardando, setGuardando] = useState(false);
```

Después de `const confirmar = useCallback(…);`:

```ts
  const alGuardar = useRef(onGuardado);
  useEffect(() => { alGuardar.current = onGuardado; });
```

`cambiarNumeroPedido`:

```ts
  const cambiarNumeroPedido = (valor: string) => {
    // Otro número es otro pedido: la consulta que siguiera en curso ya no le sirve, ni los
    // parámetros del pedido que se estaba corrigiendo.
    if (normalizarNumeroPedidoRps(valor) !== clavePedido) {
      consultaEnCurso.current?.abort();
      setParamsGuardados(null);
    }
    despachar({ tipo: 'PEDIDO_CAMBIADO', valor });
  };
```

En `limpiarFormulario`, antes de `despachar({ tipo: 'PEDIDO_LIMPIADO' });`: `setParamsGuardados(null);`.

Antes del `return {` del hook:

```ts
  /**
   * «Guardar para revisión» (fase 5): solo con todos los elementos completos. Si el pedido ya está en
   * Pedidos, pregunta antes de sustituirlo. Guardado, la pantalla queda para un pedido nuevo y se
   * borra el borrador del navegador de ese pedido, como en toldos.
   */
  const guardarParaRevision = useCallback(async () => {
    const actual = estadoRef.current;
    const estados = Object.fromEntries(actual.lineas.map((linea) => [linea.version, estadoLinea(linea)]));
    const falta = faltaParaPdf(actual.lineas, estados);
    if (falta) {
      notificar.current.notify(`Para guardar falta: ${falta}`, { tone: 'warning', title: 'Faltan datos' });
      return;
    }
    setGuardando(true);
    try {
      let confirmOverwrite = false;
      for (;;) {
        const respuesta = await fetch('/api/remolques/pedidos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cuerpoGuardar(actual.lineas, params, usuario, confirmOverwrite)),
        });
        const datos = await respuesta.json().catch(() => ({})) as { needsConfirmation?: boolean; error?: string; review?: { orderCode: string } };
        if (respuesta.status === 409 && datos.needsConfirmation && !confirmOverwrite) {
          const eleccion = await confirmar({
            title: `Actualizar ${actual.numeroPedido}`,
            message: 'Este pedido ya está guardado en Pedidos. Si continúas, se sustituirá por los datos de esta pantalla.',
            confirmLabel: 'Actualizar pedido',
            cancelLabel: 'Conservar el actual',
            tone: 'warning',
          });
          if (eleccion !== 'confirm') return;
          confirmOverwrite = true;
          continue;
        }
        if (!respuesta.ok) {
          avisar('error', datos.error || 'No se pudo guardar el pedido para revisión.');
          return;
        }
        consultaEnCurso.current?.abort();
        pendienteRef.current = null;
        limpiarBorradores(almacen, actual.numeroPedido);
        setParamsGuardados(null);
        despachar({ tipo: 'PEDIDO_LIMPIADO' });
        alGuardar.current?.();
        notificar.current.notify(`Guardado en Pedidos para revisión: ${datos.review?.orderCode ?? actual.numeroPedido}.`, { tone: 'success', title: 'Guardado para revisión' });
        return;
      }
    } catch {
      avisar('error', 'No se pudo guardar el pedido para revisión.');
    } finally {
      setGuardando(false);
    }
  }, [almacen, avisar, confirmar, params, usuario]);

  /**
   * Abre en la pantalla un pedido guardado (desde Pedidos). «Corregir» lo trae tal cual y con sus
   * parámetros; «Reutilizar» lo trae como un pedido nuevo con los parámetros actuales. Lo guardado
   * manda: el borrador del navegador de ese pedido se borra para que no se mezcle con él.
   */
  const cargarPedidoGuardado = useCallback(async (pedido: PedidoRemolques, modo: ModoCarga) => {
    const actual = estadoRef.current;
    const hayDatos = Boolean(actual.numeroPedido.trim() || actual.cliente.trim() || actual.lineas.length > 0);
    if (modo === 'reutilizar' || hayDatos) {
      const respuesta = await confirmar(modo === 'corregir'
        ? {
            title: `Corregir ${pedido.orderCode}`,
            message: 'Los datos que haya ahora en Remolques se sustituirán por los de este pedido, con los parámetros con que se guardó. Lo guardado no cambia hasta que vuelvas a guardar.',
            confirmLabel: 'Abrir para corregir',
            cancelLabel: 'Conservar formulario',
            tone: 'warning',
          }
        : {
            title: `Reutilizar ${pedido.orderCode}`,
            message: 'Se sustituirá el formulario por los datos de este pedido, incluidos el número de pedido y las OF, y se recalculará con los parámetros actuales. Cámbialos antes de guardar si vas a crear un pedido nuevo.',
            confirmLabel: 'Reutilizar datos',
            cancelLabel: 'Conservar formulario',
            tone: 'warning',
          });
      if (respuesta !== 'confirm') return;
    }
    consultaEnCurso.current?.abort();
    pendienteRef.current = null;
    limpiarBorradores(almacen, pedido.numeroPedido);
    const fecha = modo === 'corregir' ? (pedido.summary.orderDate || hoy()) : hoy();
    setParamsGuardados(modo === 'corregir' ? pedido.params : null);
    despachar({
      tipo: 'PEDIDO_CARGADO',
      numeroPedido: pedido.numeroPedido,
      cliente: pedido.summary.customer,
      fecha,
      lineas: lineasDesdePedidoGuardado(pedido, modo, usuario, fecha),
    });
    avisar(modo === 'corregir' ? 'info' : 'exito', modo === 'corregir'
      ? `Pedido ${pedido.orderCode} cargado para corregirlo, con los parámetros con que se guardó.`
      : `Datos de ${pedido.orderCode} cargados como un pedido nuevo, con los parámetros actuales.`);
  }, [almacen, avisar, confirmar, usuario]);
```

En el objeto que devuelve el hook, después de `params,`:

```ts
    guardando,
    /** Se está corrigiendo un pedido guardado con sus parámetros (no los comunes). */
    conParamsGuardados: paramsGuardados !== null,
```

y después de `limpiarFormulario,`:

```ts
    guardarParaRevision,
    cargarPedidoGuardado,
```

Actualizar el comentario de cabecera del hook: sustituir «Es el equivalente de `useWorkspace` de Remolques-TGM sin guardar, revisión ni PDF (llegan en las fases 4 y 5): por eso no hay registros guardados que cargar, ni dibujo que capturar, ni «completar pedido».» por «Es el equivalente de `useWorkspace` de Remolques-TGM: guardar para revisión y abrir un pedido guardado van por la API de Pedidos (fase 5); no hay dibujo que capturar ni «completar pedido».».

- [ ] **Step 5: La pantalla**

En `src/client/remolques/RemolquesView.tsx`:

Imports, después de `import React from 'react';`:

```tsx
import { Save } from 'lucide-react';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
```

y después de `import { faltaParaPdf } from './vistaPrevia';`:

```tsx
import type { ModoCarga } from './guardarPedido';
```

La firma:

```tsx
export function RemolquesView({ usuario, notify, askForConfirmation, pedidoSolicitado, limpiarSolicitado = 0, pedidoGuardadoSolicitado, onGuardado }: {
  usuario: string;
  notify: Notify;
  askForConfirmation: AskForConfirmation;
  /** Pedido que Toldos manda abrir aquí («Abrir en Remolques»); `id` distingue una petición de la siguiente. */
  pedidoSolicitado?: { numero: string; id: number } | null;
  /** Contador de pulsaciones de «Limpiar» (el botón está en la barra de la página): cada subida pide limpiar el formulario. */
  limpiarSolicitado?: number;
  /** Un pedido guardado que Pedidos manda abrir aquí («Corregir» o «Reutilizar datos», fase 5). */
  pedidoGuardadoSolicitado?: { id: number; pedido: PedidoRemolques; modo: ModoCarga } | null;
  /** Tras «Guardar para revisión»: Pedidos vuelve a leer sus listas. */
  onGuardado?: () => void;
}) {
  const ws = useRemolques({ usuario, notify, askForConfirmation, onGuardado });
```

Después del efecto de `limpiarSolicitado`:

```tsx
  // Igual con los pedidos guardados que manda Pedidos: cada petición, una vez.
  const ultimoGuardadoSolicitado = React.useRef<number | null>(null);
  const { cargarPedidoGuardado } = ws;
  React.useEffect(() => {
    if (!pedidoGuardadoSolicitado || ultimoGuardadoSolicitado.current === pedidoGuardadoSolicitado.id) return;
    ultimoGuardadoSolicitado.current = pedidoGuardadoSolicitado.id;
    void cargarPedidoGuardado(pedidoGuardadoSolicitado.pedido, pedidoGuardadoSolicitado.modo);
  }, [cargarPedidoGuardado, pedidoGuardadoSolicitado]);
```

Después del aviso de `ws.origenMateriales === 'semilla'` (dentro de la misma `section`):

```tsx
        {ws.conParamsGuardados && (
          <p className="rem-aviso-materiales rem-aviso-params" role="status">
            Corrigiendo un pedido guardado: se calcula con los parámetros con que se guardó, no con los actuales.
          </p>
        )}
```

En `PestanasElementos`, sustituir la prop `acciones`:

```tsx
        acciones={lineas.length > 0 ? (
          <>
            <VistaPreviaPdf lineas={lineas} params={ws.conParamsGuardados ? params : undefined} bloqueo={faltaPdf} notify={notify} />
            <button type="button" className="primary-button rem-guardar-boton" disabled={Boolean(faltaPdf) || ws.guardando}
              aria-busy={ws.guardando} title={faltaPdf ?? undefined} onClick={() => void ws.guardarParaRevision()}>
              <Save aria-hidden="true" />
              {ws.guardando ? 'Guardando…' : 'Guardar para revisión'}
            </button>
          </>
        ) : null}
```

(el `pie` con «Para la vista previa del PDF falta: …» no cambia: las e2e de la fase 4 lo leen.)

En `src/client/coordina/remolques.css`, al final:

```css
/* «Guardar para revisión» de remolques (fase 5): junto a «Vista previa del PDF», sin partirse. */
.rem-guardar-boton { white-space: nowrap; }
```

En `src/client/App.tsx`, en el `<RemolquesView … />` añadir la prop:

```tsx
onGuardado={() => setReviewRefresh((value) => value + 1)}
```

- [ ] **Step 6: Ejecutar las pruebas, el tipado, el lint y el build**

Run: `pnpm exec vitest run src/client/remolques && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: PASS (también `resultados-paridad.test.tsx`), sin errores de tipado ni de lint, y el build termina.

- [ ] **Step 7: Mirarlo en la aislada**

Con la aislada en `PORT=4311 FAKE_COORDINA_PORT=4321` (y `ISOLATED_DIR="$PWD/tmp/remolques-5"`): en Remolques, pedido `AR.26.99508`, «+ Remolque», teclear el caso `lona-02` (ayuda `teclearCaso` de `scripts/lib/remolques-e2e.mjs`) y la OF `0299508`. Comprobar: con un elemento sin acabar el botón está apagado y su título dice lo que falta; completo, «Guardar para revisión» guarda, sale «Guardado en Pedidos para revisión: AR2699508.» y la pantalla queda vacía; repetirlo pide «Actualizar AR.26.99508». Capturas de la barra de elementos con los dos botones en claro y oscuro, 1280×720 y 1600×1000, en `tmp/ui-audit/remolques-5/guardar-*.png`, y mirarlas. Borrar `tmp/remolques-5/rem-revision/AR2699508.json` y parar la instancia.

- [ ] **Step 8: Commit**

```bash
git add src/client/remolques/guardarPedido.ts src/client/remolques/guardarPedido.test.ts src/client/remolques/vistaPrevia.ts src/client/remolques/vistaPrevia.test.ts src/client/remolques/VistaPreviaPdf.tsx src/client/remolques/useRemolques.ts src/client/remolques/useRemolques.test.ts src/client/remolques/RemolquesView.tsx src/client/coordina/remolques.css src/client/App.tsx
git commit -m "feat(remolques): «Guardar para revisión» y abrir un pedido guardado en Remolques

Fase 5: el pedido de remolques se guarda para revisión como uno de toldos
(solo completo, pregunta antes de sustituir, limpia la pantalla y el
borrador del navegador). La pantalla puede abrir un pedido guardado para
«Corregir» (con sus parámetros, también en la vista previa) o para
«Reutilizar» (como pedido nuevo, con los parámetros actuales).

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: El pedido de remolques abierto en Pedidos: vista previa, «Corregir» y «Generar archivos»

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio.

**Files:**
- Create: `src/client/remolques/generarPedido.ts`, `src/client/remolques/generarPedido.test.ts`
- Create: `src/client/remolques/PedidoRemolquesDetalle.tsx`, `src/client/remolques/PedidoRemolquesDetalle.test.tsx`
- Modify: `src/client/coordina/remolques.css`, `src/client/coordina/pedidos.css`

**Interfaces:**
- Consumes: Task 1 (`ELEMENT_NOUNS`, `generationBlock`), Task 2 (`elementosAprobacion`, `modeloElemento`, `anioPedido`, `PedidoRemolques`, `ElementoGuardado`), Task 5 (rutas `GET /api/remolques/pedidos/:orderCode`, `…/vista-previa`, `…/archivo`, `POST …/generar`), Task 6 (`VistaPreviaPdf` con `origen`). De antes: `useCoordinaStatus`, `controlLabel`, `formatearNumeroEs`, `nombrePdf`, `isPendingGeneration`, `normalizeOf`, `reviewerName`, `formOptions.tecnicos`.
- Produces: `estadoGenerarRemolques(pedido: Pick<PedidoRemolques, 'status' | 'summary' | 'elementos'>, usuario: string, estado: CoordinaStatus | null): { allowed: boolean; note: string }`, `ficherosPrevistos(pedido: Pick<PedidoRemolques, 'numeroPedido' | 'summary' | 'createdAt'>): string[]`, `FichaPedidoRemolques(props)` (presentación), `PedidoRemolquesDetalle({ orderCode, refreshKey, currentUser, onBack, onCorregir: (p: PedidoRemolques) => void, onReutilizar: (p: PedidoRemolques) => void, onChanged, onToast, onConfirm })`. CSS: `.orders-kind-tag` (con `.is-toldos` / `.is-remolques`), `.rem-pedido-elementos`, `.rem-pedido-elemento`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/client/remolques/generarPedido.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import { estadoGenerarRemolques, ficherosPrevistos } from './generarPedido';

const elemento = (of: string) => ({ input: { cabecera: { ordenFabricacion: of } } });
const pedido = (extra: Partial<PedidoRemolques> = {}) => ({
  status: 'PENDING_REVIEW',
  summary: { technician: 'IVÁN', customer: '', orderDate: '2026-09-01', reviewer: '', awnings: 2, ofs: [], models: [], diagnostics: 0 },
  elementos: [elemento('231780'), elemento('0231781')],
  ...extra,
}) as unknown as PedidoRemolques;
const aprobada = { estado: 'aprobada', revisor: 'jaime' };

describe('estadoGenerarRemolques', () => {
  it('un generado no se genera', () => {
    expect(estadoGenerarRemolques(pedido({ status: 'PRODUCED' }), 'IVÁN', null)).toEqual({ allowed: false, note: '' });
  });

  it('solo el autor, y mientras no se sabe qué dice CoordinaOT, espera', () => {
    expect(estadoGenerarRemolques(pedido(), 'JAIME', null)).toEqual({ allowed: false, note: 'Lo genera el autor (Iván)' });
    expect(estadoGenerarRemolques(pedido(), 'IVÁN', null)).toEqual({ allowed: false, note: 'Comprobando la aprobación en CoordinaOT…' });
  });

  it('dice qué falta: la OF de un elemento o la aprobación', () => {
    expect(estadoGenerarRemolques(pedido({ elementos: [elemento('231780'), elemento('')] as never }), 'IVÁN', { disponible: true, ofs: {} }))
      .toEqual({ allowed: false, note: 'Falta la OF en el elemento B.' });
    expect(estadoGenerarRemolques(pedido(), 'IVÁN', { disponible: true, ofs: { '0231780': { estado: 'devuelta' }, '0231781': aprobada } }))
      .toEqual({ allowed: false, note: 'Sin aprobar en CoordinaOT: A (0231780) devuelta.' });
  });

  it('con todo aprobado puede el autor; un pedido sin autor (de la web vieja), cualquiera', () => {
    const todo = { disponible: true, ofs: { '0231780': aprobada, '0231781': aprobada } };
    expect(estadoGenerarRemolques(pedido(), 'IVÁN', todo)).toEqual({ allowed: true, note: '' });
    const sinAutor = pedido({ summary: { ...pedido().summary, technician: '' } });
    expect(estadoGenerarRemolques(sinAutor, 'JAIME', todo)).toEqual({ allowed: true, note: '' });
  });
});

describe('ficherosPrevistos', () => {
  it('los dos PDF de siempre, con el año del pedido', () => {
    expect(ficherosPrevistos({ numeroPedido: 'AR.26.04286', summary: pedido().summary, createdAt: '2026-10-01T08:00:00.000Z' }))
      .toEqual(['Planteamientos: AR2604286-10.pdf', 'Oficina técnica: 2026/AR2604286.pdf']);
  });
});
```

Crear `src/client/remolques/PedidoRemolquesDetalle.test.tsx`:

```tsx
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import casos from '../../remolques/__fixtures__/produccion-2026-09.json';
import type { BaquetonInput } from '../../remolques/calc/baqueton.ts';
import type { LonaInput } from '../../remolques/calc/lona.ts';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { crearPedidoRemolques, marcarPedidoGenerado } from '../../remolques/flujo/pedido.ts';
import { prepararPedidoHoja } from '../../remolques/hoja/pedido.ts';
import type { ElementoPedidoHoja } from '../../remolques/hoja/tipos.ts';
import type { CoordinaStatus } from '../types';
import { FichaPedidoRemolques } from './PedidoRemolquesDetalle';

type Caso = { caso: string; tipo: 'lona' | 'baqueton'; input: LonaInput | BaquetonInput };
const deFixture = (id: string, version: string, of: string): ElementoPedidoHoja => {
  const c = (casos as Caso[]).find((x) => x.caso === id)!;
  return { version, tipo: c.tipo, input: { ...c.input, cabecera: { ...c.input.cabecera, numeroPedido: 'AR.26.04286', cliente: 'TALLERES CAL', version, ordenFabricacion: of, fecha: '2026-09-01' } } };
};
const pendiente = () => crearPedidoRemolques({
  datos: prepararPedidoHoja([deFixture('lona-02', '10', '0231780'), deFixture('baqueton-01', '11', '0231781')], DEFAULT_PARAMS),
  autoria: { technician: 'IVÁN', reviewer: '' }, existente: null, ahora: '2026-10-01T08:00:00.000Z',
});
const aprobado: CoordinaStatus = { disponible: true, ofs: { '0231780': { estado: 'aprobada', revisor: 'jaime' }, '0231781': { estado: 'aprobada', revisor: 'jaime' } } };
const nada = () => undefined;
const pintar = (props: Partial<React.ComponentProps<typeof FichaPedidoRemolques>>) => renderToStaticMarkup(
  <FichaPedidoRemolques pedido={pendiente()} cargando={false} coordina={aprobado} currentUser="IVÁN" generando={false}
    onBack={nada} onCorregir={nada} onReutilizar={nada} onGenerar={nada} notify={nada} {...props} />,
);

describe('el pedido de remolques abierto en Pedidos', () => {
  it('pendiente y aprobado: cada elemento con su OF y quién lo aprobó, «Corregir» y «Generar archivos» encendido para el autor', () => {
    const html = pintar({});
    expect(html).toContain('Remolque · Arquillado con aguas');
    expect(html).toContain('Baquetón');
    expect(html).toContain('OF 0231780');
    expect(html).toContain('Aprobado por Jaime');
    expect(html).toContain('Corregir');
    expect(html).toContain('Generar archivos');
    expect(html).not.toMatch(/review-generate-button" type="button" disabled=""/);
  });

  it('otro técnico ve el botón apagado y por qué', () => {
    const html = pintar({ currentUser: 'JAIME' });
    expect(html).toMatch(/review-generate-button" type="button" disabled=""/);
    expect(html).toContain('Lo genera el autor (Iván)');
  });

  it('devuelto en CoordinaOT: la nota en su elemento', () => {
    const html = pintar({ coordina: { disponible: true, ofs: { '0231780': { estado: 'devuelta', nota: 'Falta cota del alto' }, '0231781': { estado: 'aprobada', revisor: 'jaime' } } } });
    expect(html).toContain('Falta cota del alto');
    expect(html).toContain('Sin aprobar en CoordinaOT: A (0231780) devuelta.');
  });

  it('generado: sin «Generar archivos», con el PDF, quién lo revisó y «Reutilizar datos»', () => {
    const generado = marcarPedidoGenerado(pendiente(), {
      revisor: 'JAIME', ahora: '2026-10-02T08:00:00.000Z',
      ficheros: [{ type: 'pdf', filename: 'AR2604286-10.pdf', savedPath: '/p/AR2604286-10.pdf' }, { type: 'pdf', filename: 'AR2604286.pdf', savedPath: '/o/2026/AR2604286.pdf' }],
    });
    const html = pintar({ pedido: generado });
    expect(html).not.toContain('Generar archivos');
    expect(html).not.toContain('Corregir');
    expect(html).toContain('Reutilizar datos');
    expect(html).toContain('href="/api/remolques/pedidos/AR2604286/archivo"');
    expect(html).toContain('revisado por Jaime');
  });

  it('mientras carga lo dice', () => {
    expect(pintar({ cargando: true, pedido: null })).toContain('Cargando el pedido…');
  });
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `pnpm exec vitest run src/client/remolques/generarPedido.test.ts src/client/remolques/PedidoRemolquesDetalle.test.tsx`
Expected: FAIL — no existen `./generarPedido` ni `./PedidoRemolquesDetalle`.

- [ ] **Step 3: Quién y cuándo puede generar**

Crear `src/client/remolques/generarPedido.ts`:

```ts
import { ELEMENT_NOUNS, generationBlock, isPendingGeneration } from '../../reviewRules.js';
import { anioPedido, elementosAprobacion } from '../../remolques/flujo/pedido.ts';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import { nombrePdf } from '../../remolques/salida/nombre-pdf.ts';
import { controlLabel } from '../components/controlLabels';
import type { CoordinaStatus } from '../types';

// «Generar archivos» de un pedido de remolques: las mismas reglas que el de toldos
// (generatePermission.ts): solo el autor (si no tiene, cualquiera) y con todas las OF aprobadas
// en CoordinaOT. El servidor vuelve a preguntar a CoordinaOT en fresco al generar.
export function estadoGenerarRemolques(
  pedido: Pick<PedidoRemolques, 'status' | 'summary' | 'elementos'>,
  usuario: string,
  estado: CoordinaStatus | null,
): { allowed: boolean; note: string } {
  if (!isPendingGeneration(pedido.status)) return { allowed: false, note: '' };
  const autor = pedido.summary.technician;
  if (autor && autor !== usuario) return { allowed: false, note: `Lo genera el autor (${controlLabel(autor)})` };
  if (!estado) return { allowed: false, note: 'Comprobando la aprobación en CoordinaOT…' };
  const bloqueo = generationBlock(elementosAprobacion(pedido), estado, ELEMENT_NOUNS);
  return bloqueo ? { allowed: false, note: bloqueo } : { allowed: true, note: '' };
}

/** Los dos PDF que deja «Generar archivos», para la pregunta de antes. */
export function ficherosPrevistos(pedido: Pick<PedidoRemolques, 'numeroPedido' | 'summary' | 'createdAt'>): string[] {
  const nombre = nombrePdf(pedido.numeroPedido);
  return [`Planteamientos: ${nombre}`, `Oficina técnica: ${anioPedido(pedido)}/${nombre.replace(/-10\.pdf$/, '.pdf')}`];
}
```

- [ ] **Step 4: El detalle**

Crear `src/client/remolques/PedidoRemolquesDetalle.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { CopyPlus, ExternalLink, Factory, FileSearch, FileText, PencilLine } from 'lucide-react';
import { formOptions } from '../../domain/modelBehavior.js';
import { elementosAprobacion, modeloElemento } from '../../remolques/flujo/pedido.ts';
import type { ElementoGuardado, PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import { normalizeOf, reviewerName } from '../../reviewRules.js';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { controlLabel } from '../components/controlLabels';
import { useCoordinaStatus } from '../hooks/useCoordinaStatus';
import type { CoordinaStatus } from '../types';
import { estadoGenerarRemolques, ficherosPrevistos } from './generarPedido';
import { formatearNumeroEs } from './numeroEs';
import { VistaPreviaPdf } from './VistaPreviaPdf';

// Un pedido de remolques abierto desde Pedidos (fase 5), con las acciones del de toldos: ver la
// hoja, «Corregir», «Generar archivos» (solo el autor, con todo aprobado en CoordinaOT) y, ya
// generado, abrir su PDF y «Reutilizar datos».

function fechaHora(valor: string) {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? valor : new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(fecha);
}

const nombreElemento = (elemento: ElementoGuardado) => (elemento.tipo === 'lona' ? `Remolque · ${modeloElemento(elemento)}` : 'Baquetón');

function FilaElemento({ elemento, letra, coordina }: { elemento: ElementoGuardado; letra: string; coordina: CoordinaStatus | null }) {
  const of = normalizeOf(elemento.input.cabecera.ordenFabricacion ?? '');
  const enCoordina = coordina?.disponible && of ? coordina.ofs?.[of] : undefined;
  const aprobadoPor = enCoordina?.estado === 'aprobada' && enCoordina.revisor
    ? reviewerName(enCoordina.revisor, formOptions.tecnicos as string[])
    : '';
  return (
    <li className="rem-pedido-elemento bloque-3d">
      <strong className="rem-pedido-letra">{letra}</strong>
      <span>{nombreElemento(elemento)}</span>
      <span>{`${formatearNumeroEs(elemento.input.largo)} × ${formatearNumeroEs(elemento.input.ancho)} cm`}</span>
      <span>{`OF ${of || '—'}`}</span>
      <span className="rem-pedido-material" title={elemento.input.material}>{elemento.input.material || 'Sin material'}</span>
      {aprobadoPor && <span className="orders-detail-approved">{`Aprobado por ${controlLabel(aprobadoPor)}`}</span>}
      {enCoordina?.estado === 'devuelta' && (
        <span className="orders-detail-returned"><strong>Devuelta en CoordinaOT:</strong> {enCoordina.nota || 'sin nota'}</span>
      )}
    </li>
  );
}

export function FichaPedidoRemolques({ pedido, cargando, coordina, currentUser, generando, onBack, onCorregir, onReutilizar, onGenerar, notify }: {
  pedido: PedidoRemolques | null;
  cargando: boolean;
  coordina: CoordinaStatus | null;
  currentUser: string;
  generando: boolean;
  onBack: () => void;
  onCorregir: () => void;
  onReutilizar: () => void;
  onGenerar: () => void;
  notify: Notify;
}) {
  const volver = <button type="button" className="ghost-button boton-3d reviews-back-button" onClick={onBack}>← Pedidos</button>;
  if (cargando) {
    return <section className="review-reader">{volver}<div className="review-empty"><FileSearch aria-hidden="true" />Cargando el pedido…</div></section>;
  }
  if (!pedido) {
    return <section className="review-reader">{volver}<div className="review-empty"><FileSearch aria-hidden="true" />No se pudo abrir el pedido.</div></section>;
  }
  const generado = pedido.status === 'PRODUCED';
  const { allowed, note } = estadoGenerarRemolques(pedido, currentUser, coordina);
  const ruta = `/api/remolques/pedidos/${encodeURIComponent(pedido.orderCode)}`;
  const letras = elementosAprobacion(pedido).map((item) => item.letter);
  const datos = [
    pedido.summary.customer || 'Sin cliente',
    pedido.summary.orderDate && `pedido del ${pedido.summary.orderDate.split('-').reverse().join('/')}`,
    pedido.summary.technician && `autor ${controlLabel(pedido.summary.technician)}`,
    pedido.updatedAt && `guardado ${fechaHora(pedido.updatedAt)}`,
  ].filter(Boolean).join(' · ');

  return (
    <section className="review-reader rem-pedido-guardado" aria-label={`Pedido de remolques ${pedido.orderCode}`}>
      <header className="review-reader-header">
        {volver}
        <div className="review-reader-title">
          <h2>{pedido.orderCode}<span className="orders-kind-tag familia-tag is-remolques">Remolque</span></h2>
          <small>{datos}</small>
        </div>
        <div className="review-reader-actions">
          <VistaPreviaPdf origen={`${ruta}/vista-previa`} bloqueo={generando ? 'Generando los archivos…' : null} notify={notify} />
          {!generado && (
            <>
              <button className="ghost-button boton-3d" type="button" disabled={generando} onClick={onCorregir}>
                <PencilLine aria-hidden="true" />Corregir
              </button>
              <button className="primary-button boton-3d review-generate-button" type="button" disabled={generando || !allowed} title={note || undefined} onClick={onGenerar}>
                <Factory aria-hidden="true" />{generando ? 'Generando…' : 'Generar archivos'}
              </button>
              {note && <span className="review-generate-note">{note}</span>}
            </>
          )}
        </div>
      </header>

      {generado && pedido.production && (
        <div className="review-production-block bloque-3d" role="status">
          <div className="review-production-summary">
            <Factory aria-hidden="true" />
            <span>
              <strong>{`Archivos generados${pedido.production.createdBy ? ` por ${controlLabel(pedido.production.createdBy)}, autor del pedido` : ''}`}</strong>
              <small>{`${fechaHora(pedido.production.createdAt)}${pedido.reviewedBy ? ` · revisado por ${controlLabel(pedido.reviewedBy)}` : ''}`}</small>
            </span>
            <button className="ghost-button boton-3d review-reuse-button" type="button" onClick={onReutilizar}>
              <CopyPlus aria-hidden="true" />Reutilizar datos
            </button>
          </div>
          <div className="review-generated-files">
            <a className="review-generated-file chip-3d is-pdf" href={`${ruta}/archivo`} target="_blank" rel="noreferrer"
              title={pedido.production.files.map((fichero) => fichero.savedPath).join('\n')}>
              <span className="review-generated-file-icon"><FileText aria-hidden="true" /></span>
              <span><strong>{pedido.production.files[0]?.filename ?? 'Hoja de taller'}</strong><small>Hoja de taller PDF · planteamientos y oficina técnica</small></span>
              <ExternalLink aria-hidden="true" />
            </a>
          </div>
        </div>
      )}

      <ul className="rem-pedido-elementos" aria-label="Elementos del pedido">
        {pedido.elementos.map((elemento, indice) => (
          <FilaElemento key={elemento.version} elemento={elemento} letra={letras[indice]} coordina={coordina} />
        ))}
      </ul>
    </section>
  );
}

export function PedidoRemolquesDetalle({ orderCode, refreshKey, currentUser, onBack, onCorregir, onReutilizar, onChanged, onToast, onConfirm }: {
  orderCode: string;
  refreshKey: number;
  currentUser: string;
  onBack: () => void;
  onCorregir: (pedido: PedidoRemolques) => void;
  onReutilizar: (pedido: PedidoRemolques) => void;
  onChanged: () => void;
  onToast: Notify;
  onConfirm: AskForConfirmation;
}) {
  const [detalle, setDetalle] = useState<{ orderCode: string; pedido: PedidoRemolques | null } | null>(null);
  const [generando, setGenerando] = useState(false);
  const cargando = detalle?.orderCode !== orderCode;
  const pedido = detalle && detalle.orderCode === orderCode ? detalle.pedido : null;
  // Las OF del pedido abierto en CoordinaOT; un pedido generado no necesita preguntar.
  const ofs = pedido ? elementosAprobacion(pedido).map((item) => item.of) : [];
  const { status: coordina } = useCoordinaStatus(ofs, Boolean(pedido) && pedido?.status !== 'PRODUCED');

  useEffect(() => {
    let cancelado = false;
    fetch(`/api/remolques/pedidos/${encodeURIComponent(orderCode)}`, { cache: 'no-store' })
      .then(async (respuesta) => {
        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error(datos.error || 'No se pudo abrir el pedido.');
        return datos as PedidoRemolques;
      })
      .then((leido) => { if (!cancelado) setDetalle({ orderCode, pedido: leido }); })
      .catch((error) => {
        if (cancelado) return;
        setDetalle({ orderCode, pedido: null });
        onToast(error instanceof Error ? error.message : 'No se pudo abrir el pedido.', { tone: 'error' });
      });
    return () => { cancelado = true; };
  }, [orderCode, refreshKey, onToast]);

  async function generar() {
    if (!pedido || !estadoGenerarRemolques(pedido, currentUser, coordina).allowed) return;
    const codigo = pedido.orderCode;
    const inicial = await onConfirm({
      title: `Generar archivos de ${codigo}`,
      message: 'CoordinaOT ya lo ha aprobado. Se guardará la hoja de taller, con quién la revisó y los datos del pedido dentro, en las dos carpetas de remolques.',
      details: ficherosPrevistos(pedido),
      confirmLabel: 'Sí, generar archivos',
      cancelLabel: 'Ahora no',
      tone: 'warning',
    });
    if (inicial !== 'confirm') return;
    setGenerando(true);
    let confirmOverwrite = false;
    try {
      for (;;) {
        const respuesta = await fetch(`/api/remolques/pedidos/${encodeURIComponent(codigo)}/generar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmOverwrite }),
        });
        const datos = await respuesta.json().catch(() => ({})) as { error?: string; needsConfirmation?: boolean; existing?: string[]; unchanged?: boolean; nombre?: string };
        if (respuesta.status === 409 && datos.needsConfirmation && !confirmOverwrite) {
          const eleccion = await onConfirm({
            title: 'Sustituir archivos existentes',
            message: 'La hoja de taller de este pedido ya está en las carpetas. Comprueba la lista antes de sustituirla.',
            details: datos.existing,
            confirmLabel: 'Sustituir archivos',
            cancelLabel: 'Conservar archivos',
            tone: 'danger',
          });
          if (eleccion !== 'confirm') return;
          confirmOverwrite = true;
          continue;
        }
        if (!respuesta.ok) throw new Error(datos.error || 'No se pudieron generar los archivos.');
        // Se releen pendientes, historial y contador: el pedido pasa a «Generados».
        onChanged();
        onBack();
        if (datos.unchanged) {
          onToast('Este pedido ya estaba generado.', { tone: 'info', title: 'Sin cambios' });
          return;
        }
        onToast(`Guardada la hoja de taller ${datos.nombre ?? ''} en planteamientos y en oficina técnica.`, { tone: 'success', title: 'Archivos generados' });
        return;
      }
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudieron generar los archivos.', { tone: 'error' });
    } finally {
      setGenerando(false);
    }
  }

  return (
    <FichaPedidoRemolques
      pedido={pedido}
      cargando={cargando}
      coordina={coordina}
      currentUser={currentUser}
      generando={generando}
      onBack={onBack}
      onCorregir={() => { if (pedido) onCorregir(pedido); }}
      onReutilizar={() => { if (pedido) onReutilizar(pedido); }}
      onGenerar={() => void generar()}
      notify={onToast}
    />
  );
}
```

- [ ] **Step 5: Estilos**

En `src/client/coordina/remolques.css`, al final:

```css
/* Pedido de remolques abierto en Pedidos (fase 5): un elemento por fila, como el detalle de la
   bandeja (letra, qué es, medidas, OF, material y, debajo, lo que dice CoordinaOT). */
.rem-pedido-elementos {
  display: grid;
  gap: 0.5rem;
  list-style: none;
  margin: 1rem 0 0;
  padding: 0;
}
.rem-pedido-elemento {
  align-items: center;
  border-radius: 0.75rem;
  display: grid;
  font-size: 0.8125rem;
  gap: 0.75rem;
  grid-template-columns: 2rem minmax(10rem, 1.2fr) 9rem 8rem minmax(0, 2fr);
  padding: 0.625rem 0.875rem;
}
.rem-pedido-letra { font-family: var(--mono); }
.rem-pedido-material {
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rem-pedido-elemento .orders-detail-approved,
.rem-pedido-elemento .orders-detail-returned { grid-column: 2 / -1; }
```

En `src/client/coordina/pedidos.css`, después de la regla `:root[data-theme="dark"] .orders-model-tag { … }`:

```css
/* Toldo o remolque (fase 5): la etiqueta de familia de CoordinaOT con su color (lib/familia.ts:
   «Toldos» #c65a11, «Remolques» #5a6472), delante de los modelos y en negrita. */
.orders-kind-tag {
  --fam: #c65a11;
  border-radius: 0.375rem;
  color: var(--text);
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  line-height: 1rem;
  padding: 0.125rem 0.375rem;
  white-space: nowrap;
}
.orders-kind-tag.is-remolques,
.orders-model-tag.is-remolques { --fam: #5a6472; }
.review-reader-title h2 .orders-kind-tag { margin-left: 0.5rem; vertical-align: middle; }
```

- [ ] **Step 6: Ejecutar las pruebas, el tipado, el lint y el build**

Run: `pnpm exec vitest run src/client/remolques && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: PASS (10 pruebas nuevas), sin errores, build terminado.

- [ ] **Step 7: Commit**

```bash
git add src/client/remolques/generarPedido.ts src/client/remolques/generarPedido.test.ts src/client/remolques/PedidoRemolquesDetalle.tsx src/client/remolques/PedidoRemolquesDetalle.test.tsx src/client/coordina/remolques.css src/client/coordina/pedidos.css
git commit -m "feat(remolques): el pedido de remolques abierto en Pedidos

Fase 5: como el de toldos, con la hoja guardada en el visor, «Corregir»,
«Generar archivos» solo para el autor y con todo aprobado en CoordinaOT
(con lo que falta dicho por elemento), y ya generado su PDF, quién lo revisó
y «Reutilizar datos».

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Pedidos con toldos y remolques juntos: etiqueta, filtro, grupos y «Generados»

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio.

**Files:**
- Create: `src/client/hooks/listaPedidos.ts`, `src/client/hooks/listaPedidos.test.ts`, `src/client/components/OrdersInbox.test.tsx`
- Modify: `src/client/types.ts`, `src/client/ordersInbox.ts`, `src/client/ordersInbox.test.ts`, `src/client/components/OrdersInbox.tsx`, `src/client/hooks/usePendingReviews.ts`, `src/client/views/ReviewsView.tsx`, `src/client/App.tsx`

**Interfaces:**
- Consumes: Task 2 (`ResumenPedidoRemolques`, `PedidoRemolques`), Task 5 (`GET /api/remolques/pedidos?year=`), Task 6 (`RemolquesView` prop `pedidoGuardadoSolicitado`, `ModoCarga`), Task 7 (`PedidoRemolquesDetalle`, CSS `.orders-kind-tag`).
- Produces: `type PedidoBandeja = ReviewSummary | ResumenPedidoRemolques` (`types.ts`); en `ordersInbox.ts`: `type FiltroProducto = 'todos' | 'toldos' | 'remolques'`, `filtrosProducto`, `productoDe(review): 'toldos' | 'remolques'`, `claveBandeja(review): string`, `inboxSections(…, { me, scope, query, producto? })`, y `mergePendingReviews`, `pendingGroups`, `groupByDay` genéricos sobre `PedidoBandeja`; `leerPedidosDelAnio(year, pedir?): Promise<{ pedidos: PedidoBandeja[]; avisoRemolques: string | null }>`; `OrdersInbox` con `onOpen: (review: PedidoBandeja) => void`; `ReviewsView` con `onEditRemolques` y `onReuseRemolques: (pedido: PedidoRemolques) => void`.

- [ ] **Step 1: Escribir las pruebas que fallan**

En `src/client/ordersInbox.test.ts`, cambiar el import a:

```ts
import { claveBandeja, collapseAwnings, inboxSections, limitModels, mergePendingReviews, pendingGroups, pendingYears, productoDe } from './ordersInbox';
```

y añadir al final:

```ts
describe('toldos y remolques juntos (fase 5)', () => {
  const toldo = review('AR2601', 'PENDING_REVIEW', 'IVÁN');
  const remolque = review('AR2601', 'PENDING_REVIEW', 'JAIME', {
    kind: 'remolques', numeroPedido: 'AR.26.01',
    summary: { customer: 'Talleres', technician: 'JAIME', ofs: ['0231780'], models: ['Arquillado con aguas'], awnings: 1, reviewer: '', orderDate: '', diagnostics: 0 },
  });
  const generadoRemolque = review('AR2602', 'PRODUCED', 'JAIME', { kind: 'remolques', numeroPedido: 'AR.26.02' });
  const generadoToldo = review('AR2603', 'PRODUCED', 'IVÁN');

  it('cada pedido dice de qué es; el mismo número en los dos son dos filas', () => {
    expect([productoDe(toldo), productoDe(remolque)]).toEqual(['toldos', 'remolques']);
    expect([claveBandeja(toldo), claveBandeja(remolque)]).toEqual(['toldos:AR2601', 'remolques:AR2601']);
    expect(mergePendingReviews([[toldo], [remolque]])).toHaveLength(2);
  });

  it('el filtro deja solo los de un tipo, en pendientes y en generados, y cuenta solo esos', () => {
    const fuentes = { pending: [toldo, remolque], history: [generadoRemolque, generadoToldo] };
    const solo = inboxSections(fuentes, { me: 'IVÁN', scope: 'all', query: '', producto: 'remolques' });
    expect([solo.pending.map(claveBandeja), solo.history.map(claveBandeja), solo.pendingAll]).toEqual([['remolques:AR2601'], ['remolques:AR2602'], 1]);
    const toldos = inboxSections(fuentes, { me: 'IVÁN', scope: 'all', query: '', producto: 'toldos' });
    expect([toldos.pending.map(claveBandeja), toldos.history.map(claveBandeja)]).toEqual([['toldos:AR2601'], ['toldos:AR2603']]);
    expect(inboxSections(fuentes, { me: 'IVÁN', scope: 'all', query: '' }).pending).toHaveLength(2);
  });

  it('busca el perfil del remolque y el número como se escribió', () => {
    const fuentes = { pending: [toldo, remolque], history: [] };
    expect(inboxSections(fuentes, { me: 'IVÁN', scope: 'all', query: 'arquillado' }).pending.map(claveBandeja)).toEqual(['remolques:AR2601']);
    expect(inboxSections(fuentes, { me: 'IVÁN', scope: 'all', query: 'AR.26.01' }).pending.map(claveBandeja)).toEqual(['remolques:AR2601']);
  });
});
```

Crear `src/client/hooks/listaPedidos.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { leerPedidosDelAnio } from './listaPedidos';

const respuesta = (status: number, cuerpo: unknown) => new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });

describe('leerPedidosDelAnio', () => {
  it('junta los de toldos y los de remolques del año', async () => {
    const pedidas: string[] = [];
    const r = await leerPedidosDelAnio(2026, async (url) => {
      pedidas.push(url);
      return url.startsWith('/api/reviews')
        ? respuesta(200, { reviews: [{ orderCode: 'AR1' }] })
        : respuesta(200, { reviews: [{ orderCode: 'AR2', kind: 'remolques' }] });
    });
    expect(pedidas).toEqual(['/api/reviews?year=2026', '/api/remolques/pedidos?year=2026']);
    expect(r).toEqual({ pedidos: [{ orderCode: 'AR1' }, { orderCode: 'AR2', kind: 'remolques' }], avisoRemolques: null });
  });

  it('si fallan los de remolques siguen los de toldos, con el aviso', async () => {
    const r = await leerPedidosDelAnio(2026, async (url) => (url.startsWith('/api/reviews')
      ? respuesta(200, { reviews: [{ orderCode: 'AR1' }] })
      : respuesta(400, { error: 'Falta la carpeta.' })));
    expect(r).toEqual({ pedidos: [{ orderCode: 'AR1' }], avisoRemolques: 'Falta la carpeta.' });
  });

  it('si fallan los de toldos falla todo, como antes', async () => {
    await expect(leerPedidosDelAnio(2026, async (url) => (url.startsWith('/api/reviews')
      ? respuesta(500, { error: 'No hay carpeta de revisión.' })
      : respuesta(200, { reviews: [] })))).rejects.toThrow('No hay carpeta de revisión.');
  });
});
```

Crear `src/client/components/OrdersInbox.test.tsx`:

```tsx
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PedidoBandeja } from '../types';
import { OrdersInbox } from './OrdersInbox';

const fila = (orderCode: string, extra: Record<string, unknown> = {}) => ({
  orderCode, status: 'PENDING_REVIEW', updatedAt: '2026-10-01T09:00:00Z', reviewNote: '',
  summary: { customer: 'Cliente', technician: 'IVÁN', ofs: ['0231780'], models: ['ARZUA PRO'], awnings: 1, reviewer: '', orderDate: '', diagnostics: 0 },
  ...extra,
}) as unknown as PedidoBandeja;

describe('Pedidos con toldos y remolques', () => {
  it('cada fila con su etiqueta, el filtro de tipo y la columna «Elementos»', () => {
    const html = renderToStaticMarkup(
      <OrdersInbox
        pending={[fila('AR2601'), fila('AR2602', { kind: 'remolques', summary: { customer: 'Talleres', technician: 'IVÁN', ofs: ['0231781'], models: ['Recto'], awnings: 1, reviewer: '', orderDate: '', diagnostics: 0 } })]}
        history={[]} currentUser="IVÁN" pendingLoading={false} historyLoading={false} year={2026}
        onYear={() => undefined} onOpen={() => undefined} coordinaStatus={null}
      />,
    );
    expect(html).toContain('aria-label="Qué tipo de pedidos"');
    expect(html).toMatch(/>Todos<\/button>.*>Toldos<\/button>.*>Remolques<\/button>/);
    expect(html).toContain('orders-kind-tag familia-tag is-toldos">Toldo<');
    expect(html).toContain('orders-kind-tag familia-tag is-remolques">Remolque<');
    expect(html).toContain('orders-model-tag familia-tag is-remolques">Recto<');
    expect(html).toContain('<span class="is-end">Elementos</span>');
  });
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `pnpm exec vitest run src/client/ordersInbox.test.ts src/client/hooks/listaPedidos.test.ts src/client/components/OrdersInbox.test.tsx`
Expected: FAIL — `productoDe`/`claveBandeja` no existen, falta `./listaPedidos` y la bandeja no tiene el filtro.

- [ ] **Step 3: Tipos y reglas de la bandeja**

En `src/client/types.ts`, arriba del todo:

```ts
import type { ResumenPedidoRemolques } from '../remolques/flujo/tipos.ts';
```

y después de `export type ReviewPackage = …;`:

```ts
/** Una fila de Pedidos: un pedido de toldos o uno de remolques (fase 5). */
export type PedidoBandeja = ReviewSummary | ResumenPedidoRemolques;
```

En `src/client/ordersInbox.ts`:
- el import de tipos: `import type { CoordinaStatus, PedidoBandeja } from './types';`
- después de `pendingYears`:

```ts
// Toldos y remolques en la misma bandeja (fase 5): cada fila dice de qué es y un filtro deja ver
// solo unos. Un número es de toldos o de remolques; aun así la clave lleva el tipo para no confundirlos.
export type FiltroProducto = 'todos' | 'toldos' | 'remolques';
export const filtrosProducto = [
  { key: 'todos', label: 'Todos' },
  { key: 'toldos', label: 'Toldos' },
  { key: 'remolques', label: 'Remolques' },
] as const;

export function productoDe(review: Pick<PedidoBandeja, 'kind'>): 'toldos' | 'remolques' {
  return review.kind === 'remolques' ? 'remolques' : 'toldos';
}

export function claveBandeja(review: Pick<PedidoBandeja, 'kind' | 'orderCode'>) {
  return `${productoDe(review)}:${review.orderCode}`;
}
```

- `mergePendingReviews`:

```ts
export function mergePendingReviews<T extends PedidoBandeja>(lists: T[][]) {
  const byCode = new Map<string, T>();
  for (const review of lists.flat()) {
    const key = claveBandeja(review);
    const current = byCode.get(key);
    if (!current || (review.updatedAt || '') > (current.updatedAt || '')) byCode.set(key, review);
  }
  return [...byCode.values()]
    .filter((review) => isPendingGeneration(review.status))
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}
```

- `matches`:

```ts
function matches(review: PedidoBandeja, query: string) {
  const term = normalize(query.trim());
  if (!term) return true;
  // En remolques, el número también como se escribió (AR.26.04286) y el perfil como modelo.
  const typed = 'numeroPedido' in review ? review.numeroPedido : '';
  const haystack = [review.orderCode, typed, review.summary.customer, ...(review.summary.ofs || []), ...(review.summary.models || [])].join(' ');
  return normalize(haystack).includes(term);
}
```

- `inboxSections`:

```ts
export function inboxSections<T extends PedidoBandeja>(
  { pending: pendingSource, history: historySource }: { pending: T[]; history: T[] },
  { me, scope, query, producto = 'todos' }: { me: string; scope: 'mine' | 'all'; query: string; producto?: FiltroProducto }
) {
  const ofProduct = (review: T) => producto === 'todos' || productoDe(review) === producto;
  const pendingAllList = pendingSource.filter((review) => isPendingGeneration(review.status) && ofProduct(review));
  const pendingMineList = pendingAllList.filter((review) => review.summary.technician === me);
  const pending = (scope === 'mine' ? pendingMineList : pendingAllList).filter((review) => matches(review, query));
  const history = historySource.filter((review) => review.status === 'PRODUCED' && ofProduct(review) && matches(review, query));
  return { pending, history, pendingMine: pendingMineList.length, pendingAll: pendingAllList.length };
}
```

- `reviewAwnings`, `pendingGroups` y `groupByDay`:

```ts
export function reviewAwnings(review: PedidoBandeja) {
  return (review.summary.awningList || []).map((item) => ({ letter: item.letter, of: item.of }));
}

export function pendingGroups<T extends PedidoBandeja>(pending: T[], status: CoordinaStatus | null) {
  return pendingGroupOrder
    .map((group) => ({ ...group, reviews: pending.filter((review) => coordinaGroup(reviewAwnings(review), status) === group.key) }))
    .filter((group) => group.reviews.length > 0);
}
```

  y en `groupByDay` cambiar la firma a `export function groupByDay<T extends PedidoBandeja>(reviews: T[]) {` y `const groups: { key: string; label: string; reviews: T[] }[] = [];` (el cuerpo no cambia).

- [ ] **Step 4: Las dos listas de un año**

Crear `src/client/hooks/listaPedidos.ts`:

```ts
import type { PedidoBandeja } from '../types';

type Pedir = (url: string) => Promise<Response>;

async function lista(pedir: Pedir, url: string, fallo: string): Promise<PedidoBandeja[]> {
  const respuesta = await pedir(url);
  const datos = await respuesta.json().catch(() => ({})) as { reviews?: PedidoBandeja[]; error?: string };
  if (!respuesta.ok) throw new Error(datos.error || fallo);
  return datos.reviews ?? [];
}

/**
 * Los pedidos guardados de un año (fase 5): los de toldos (su carpeta de revisión) y los de
 * remolques (la carpeta interna). Si fallan los de toldos falla todo, como antes; si fallan solo
 * los de remolques, siguen los de toldos y se devuelve el aviso para enseñarlo.
 */
export async function leerPedidosDelAnio(year: number, pedir: Pedir = (url) => fetch(url)): Promise<{ pedidos: PedidoBandeja[]; avisoRemolques: string | null }> {
  const [toldos, remolques] = await Promise.all([
    lista(pedir, `/api/reviews?year=${year}`, 'No se pudo cargar la bandeja.'),
    lista(pedir, `/api/remolques/pedidos?year=${year}`, 'No se pudieron cargar los pedidos de remolques.').then(
      (pedidos) => ({ pedidos, aviso: null as string | null }),
      (error: unknown) => ({ pedidos: [] as PedidoBandeja[], aviso: error instanceof Error ? error.message : 'No se pudieron cargar los pedidos de remolques.' }),
    ),
  ]);
  return { pedidos: [...toldos, ...remolques.pedidos], avisoRemolques: remolques.aviso };
}
```

En `src/client/hooks/usePendingReviews.ts`, sustituir el import de tipos por `import type { PedidoBandeja } from '../types';`, añadir `import { leerPedidosDelAnio } from './listaPedidos';`, cambiar `useState<ReviewSummary[]>([])` por `useState<PedidoBandeja[]>([])` y el `Promise.all(…)…then(…)` por:

```ts
    Promise.all(pendingYears().map((year) => leerPedidosDelAnio(year)))
      .then((years) => {
        if (current !== requestId.current) return;
        setReviews(mergePendingReviews(years.map((item) => item.pedidos)));
        setLoading(false);
        const warning = years.map((item) => item.avisoRemolques).find(Boolean);
        if (warning) onError(warning, { tone: 'error' });
      })
```

(el `.catch` no cambia). Cambiar el comentario de cabecera: «Pedidos pendientes de generar, de toldos y de remolques (fase 5), para la bandeja y para el contador…».

- [ ] **Step 5: La bandeja**

En `src/client/components/OrdersInbox.tsx`:

Imports:

```tsx
import type { CoordinaStatus, PedidoBandeja } from '../types';
import {
  claveBandeja, collapseAwnings, filtrosProducto, formatListDate, groupByDay, inboxSections, limitModels, pendingGroups, productoDe,
  type FiltroProducto,
} from '../ordersInbox';
```

`type AwningItem = NonNullable<PedidoBandeja['summary']['awningList']>[number];`

En las props: `pending: PedidoBandeja[];`, `history: PedidoBandeja[];`, `onOpen: (review: PedidoBandeja) => void;`.

Sustituir:

```tsx
  const [openCode, setOpenCode] = useState<string | null>(null);
  const sections = inboxSections({ pending, history }, { me: currentUser, scope, query });
```

por:

```tsx
  // Toldos y remolques en la misma lista (fase 5), con un filtro para ver solo unos.
  const [producto, setProducto] = useState<FiltroProducto>('todos');
  const [openCode, setOpenCode] = useState<string | null>(null);
  const sections = inboxSections({ pending, history }, { me: currentUser, scope, query, producto });
```

En `columns`, `<span className="is-end">Toldos</span>` por `<span className="is-end">Elementos</span>`.

En `block`:

```tsx
  const block = (reviews: PedidoBandeja[], withDate = true, tone?: string) => (
    <div className={withDate ? 'orders-block' : 'orders-block is-history'}>
      <ul className="orders-list">
        {reviews.map((review) => (
          <OrderRow
            key={claveBandeja(review)}
            review={review}
            mine={review.summary.technician === currentUser}
            open={openCode === claveBandeja(review)}
            onToggle={() => setOpenCode((current) => (current === claveBandeja(review) ? null : claveBandeja(review)))}
            onOpen={() => onOpen(review)}
            withDate={withDate}
            coordinaStatus={coordinaStatus}
            tone={tone}
          />
        ))}
      </ul>
    </div>
  );
```

En la barra de filtros, después del `div` de `orders-scope` de «Todo el equipo / Míos»:

```tsx
        <span className="orders-filter-label">Pedidos de</span>
        <div className="orders-scope tira-3d glass-chip" role="group" aria-label="Qué tipo de pedidos">
          {filtrosProducto.map((filtro) => (
            <button key={filtro.key} type="button" className={producto === filtro.key ? 'pestana-activa' : undefined} aria-pressed={producto === filtro.key} onClick={() => setProducto(filtro.key)}>{filtro.label}</button>
          ))}
        </div>
```

En `OrderRow`: `review: PedidoBandeja;` en sus props; `const detailId = \`orders-detail-${productoDe(review)}-${review.orderCode}\`;` y `<ModelTags models={review.summary.models} producto={productoDe(review)} />`.

`ModelTags`:

```tsx
function ModelTags({ models, producto }: { models?: string[]; producto: 'toldos' | 'remolques' }) {
  const { visible, hidden } = limitModels(models);
  const tinte = producto === 'remolques' ? ' is-remolques' : '';
  return (
    <span className="orders-model-tags">
      <span className={`orders-kind-tag familia-tag is-${producto}`}>{producto === 'remolques' ? 'Remolque' : 'Toldo'}</span>
      {visible.map((model) => <span key={model} className={`orders-model-tag familia-tag${tinte}`}>{controlLabel(model)}</span>)}
      {hidden.length > 0 && <span className={`orders-model-tag familia-tag${tinte}`} title={Array.from(new Set(models)).map(controlLabel).join('\n')}>+{hidden.length}</span>}
    </span>
  );
}
```

- [ ] **Step 6: La vista de Pedidos y la App**

En `src/client/views/ReviewsView.tsx`:

Imports (sustituir los de tipos y añadir):

```tsx
import type { PedidoBandeja, ReviewPackage, RuleParameters } from '../types';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import { leerPedidosDelAnio } from '../hooks/listaPedidos';
import { productoDe } from '../ordersInbox';
import { PedidoRemolquesDetalle } from '../remolques/PedidoRemolquesDetalle';
```

Firma: añadir `onEditRemolques, onReuseRemolques,` a la desestructuración (después de `onReuse,`), `pending: PedidoBandeja[];` en lugar de `ReviewSummary[]` y, después de `onReuse: …;`:

```tsx
  onEditRemolques: (pedido: PedidoRemolques) => void;
  onReuseRemolques: (pedido: PedidoRemolques) => void;
```

Estado: `const [history, setHistory] = useState<PedidoBandeja[]>([]);` y, después de `const [selectedCode, setSelectedCode] = useState('');`:

```tsx
  // El pedido de remolques abierto (fase 5); el de toldos sigue en selectedCode.
  const [selectedRemolques, setSelectedRemolques] = useState('');
```

`const { status: coordinaStatus } = useCoordinaStatus(pendingOfs, selectedCode === '' && selectedRemolques === '');`

En el efecto del historial, sustituir el `fetch(…)` y sus dos `.then` por:

```tsx
    leerPedidosDelAnio(year)
      .then(({ pedidos, avisoRemolques }) => {
        if (cancelled || requestId !== listRequestId.current) return;
        setHistory(pedidos);
        setHistoryLoading(false);
        if (avisoRemolques) onToast(avisoRemolques, { tone: 'error' });
      })
```

(el `.catch` no cambia).

En el `return`, sustituir `{selectedCode === '' ? <OrdersInbox … onOpen={setSelectedCode} … />` por:

```tsx
      {selectedRemolques
        ? (
          <PedidoRemolquesDetalle
            orderCode={selectedRemolques}
            refreshKey={refreshKey}
            currentUser={currentUser}
            onBack={() => setSelectedRemolques('')}
            onCorregir={onEditRemolques}
            onReutilizar={onReuseRemolques}
            onChanged={onChanged}
            onToast={onToast}
            onConfirm={onConfirm}
          />
        )
        : selectedCode === ''
        ? <OrdersInbox
            pending={pending}
            history={history}
            currentUser={currentUser}
            pendingLoading={pendingLoading}
            historyLoading={historyLoading}
            year={year}
            onYear={(value) => { setHistoryLoading(true); setYear(value); }}
            onOpen={(review) => (productoDe(review) === 'remolques' ? setSelectedRemolques(review.orderCode) : setSelectedCode(review.orderCode))}
            coordinaStatus={coordinaStatus}
          />
```

(la rama de `ReviewOrderDetail` no cambia). Quitar `ReviewSummary` del import de tipos si ya no se usa (lo dice `pnpm lint`).

En `src/client/App.tsx`:
- imports: `import type { PedidoRemolques } from '../remolques/flujo/tipos.ts';` y `import type { ModoCarga } from './remolques/guardarPedido';`
- después de `const [pedidoSolicitado, setPedidoSolicitado] = …;`:

```tsx
  // Un pedido de remolques guardado que Pedidos manda abrir en Remolques («Corregir» o
  // «Reutilizar datos», fase 5); `id` distingue una petición de la siguiente.
  const [pedidoGuardadoSolicitado, setPedidoGuardadoSolicitado] = useState<{ id: number; pedido: PedidoRemolques; modo: ModoCarga } | null>(null);
```

- después de `function openInTrailers(…) { … }`:

```tsx
  // La pregunta de si sustituir lo que haya en Remolques la hace la propia pantalla, que es quien lo sabe.
  function abrirPedidoRemolques(pedido: PedidoRemolques, modo: ModoCarga) {
    chooseProducto('remolques');
    setActiveTab('order');
    setPedidoGuardadoSolicitado({ id: Date.now(), pedido, modo });
  }
```

- en `<ReviewsView … />`, después de `onReuse={reuseReview}`:

```tsx
              onEditRemolques={(pedido) => abrirPedidoRemolques(pedido, 'corregir')}
              onReuseRemolques={(pedido) => abrirPedidoRemolques(pedido, 'reutilizar')}
```

- en `<RemolquesView … />`: `pedidoGuardadoSolicitado={pedidoGuardadoSolicitado}`.

- [ ] **Step 7: Ejecutar las pruebas, el tipado, el lint y el build**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: todo PASS (también las pruebas de toldos de la bandeja), sin errores, build terminado.

- [ ] **Step 8: Mirarlo en la aislada**

Con la aislada en `ISOLATED_DIR="$PWD/tmp/remolques-5" PORT=4311 FAKE_COORDINA_PORT=4321`: guardar un remolque (`AR.26.99507`, caso `lona-02`, OF `0299507`) y un toldo (`fillArzuaAR2603332` de `drive.mjs`, con el CoordinaOT simulado por defecto). En Pedidos: las dos filas con «Toldo» y «Remolque», el filtro deja solo cada tipo, «Abrir el pedido» del remolque lleva al detalle de remolques y el del toldo al de siempre. Capturas de la bandeja y del detalle del remolque en claro y oscuro, 1280×720 y 1600×1000, en `tmp/ui-audit/remolques-5/pedidos-*.png`, y mirarlas (la etiqueta cabe en la fila; nada se sale a 1280). Borrar `tmp/remolques-5/rem-revision/AR2699507.json` y parar la instancia.

- [ ] **Step 9: Commit**

```bash
git add src/client/types.ts src/client/ordersInbox.ts src/client/ordersInbox.test.ts src/client/hooks/listaPedidos.ts src/client/hooks/listaPedidos.test.ts src/client/hooks/usePendingReviews.ts src/client/components/OrdersInbox.tsx src/client/components/OrdersInbox.test.tsx src/client/views/ReviewsView.tsx src/client/App.tsx
git commit -m "feat(pedidos): toldos y remolques juntos en Pedidos

Iván, 01/10/2026 (opción A): los pedidos de remolques van en la misma
pestaña que los de toldos, con su etiqueta «Toldo»/«Remolque» y un filtro.
Mismos grupos de CoordinaOT, «Generados» por año con los dos tipos, el
contador «Pedidos · N» los cuenta todos y «Corregir»/«Reutilizar» de un
remolque lo abren en Remolques.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: El paso desde la web vieja

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio.

**Files:**
- Create: `src/remolques/flujo/migracion.ts`, `scripts/migrar-remolques.mjs`
- Modify: `README.md`
- Test: `src/remolques/flujo/__tests__/migracion.test.ts`

**Interfaces:**
- Consumes: Task 2 (`resumenPedido`, `PedidoRemolques`, `ElementoGuardado`, `FicheroGenerado`, `crearAlmacenPedidosRemolques`, `AlmacenPedidosRemolques`), Task 3 (`settings.remolquesRevisionDirectory`). De antes: `agruparPorPedido` (`pedidos/agrupar-pedido.ts`), `normalizarNumeroPedido`, `FORMA_PEDIDO_RPS` (`rps/numero-pedido.ts`), `normalizarParams`, `reviewerName`, `destinosPdfRemolques`, `PlanteamientoRecord`, `formOptions.tecnicos`, `createWorkflowStore`, `defaultWorkflowSettings`, `config`.
- Produces: `interface EstadoPedidoViejo`, `interface OmitidoMigracion { numeroPedido; ids; motivo }`, `interface PlanMigracion { crear: PedidoRemolques[]; yaEstan: string[]; omitidos: OmitidoMigracion[]; repetidos: { orderCode; descartados }[] }`, `planificarMigracion({ registros, estados, existentes, archivados, tecnicos, ahora }): Promise<PlanMigracion>`, `aplicarMigracion(plan, almacen): Promise<{ creados: string[]; yaEstaban: string[] }>`, `informeMigracion(plan, { simular }): string[]`; el comando `node scripts/migrar-remolques.mjs --origen <dir> [--destino <dir>] [--planteamientos <dir>] [--oficina <plantilla>] [--simular]`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/remolques/flujo/__tests__/migracion.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import casos from "../../__fixtures__/produccion-2026-09.json";
import { formOptions } from "../../../domain/modelBehavior.js";
import { calcBaqueton, type BaquetonInput } from "../../calc/baqueton.ts";
import { calcLona, type LonaInput } from "../../calc/lona.ts";
import type { CalcParams } from "../../calc/params.ts";
import { normalizarNumeroPedido } from "../../pedidos/numero-pedido.ts";
import type { PlanteamientoRecord } from "../../store/types.ts";
import { crearAlmacenPedidosRemolques } from "../almacen.ts";
import { aplicarMigracion, informeMigracion, planificarMigracion, type EstadoPedidoViejo } from "../migracion.ts";

// Nada fuera de tmp/ del repositorio en las pruebas.
const TMP = path.join(process.cwd(), "tmp");
const temporales: string[] = [];
function carpetaNueva() {
  mkdirSync(TMP, { recursive: true });
  const dir = mkdtempSync(path.join(TMP, "remolques-migracion-"));
  temporales.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of temporales.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const AHORA = "2026-10-01T08:00:00.000Z";
const TECNICOS = formOptions.tecnicos as string[];
type Caso = { caso: string; tipo: "lona" | "baqueton"; creado: string; input: LonaInput | BaquetonInput; result: Record<string, unknown>; paramsSnapshot: CalcParams };

// Los 32 planteamientos reales (anonimizados) como los guarda la web vieja: un pedido nuevo cada vez
// que la versión vuelve a 10, con su OF y su autor («IVAN», sin tilde, como en la web vieja).
function webVieja(): PlanteamientoRecord[] {
  let pedido = 0;
  return (casos as unknown as Caso[]).map((c, i) => {
    if (c.input.cabecera.version === "10") pedido += 1;
    const numeroPedido = `AR.26.9${String(pedido).padStart(4, "0")}`;
    const cliente = `CLIENTE ${pedido}`;
    const fecha = `${c.creado}T08:${String(i).padStart(2, "0")}:00.000Z`;
    return {
      id: `id-${c.caso}`, tipo: c.tipo, numeroPedido, version: c.input.cabecera.version, cliente,
      input: { ...c.input, cabecera: { ...c.input.cabecera, numeroPedido, cliente, realizadoPor: "IVAN", revision: "JAIME", ordenFabricacion: String(230100 + i) } },
      result: c.result, paramsSnapshot: c.paramsSnapshot, createdAt: fecha, updatedAt: fecha,
    } as unknown as PlanteamientoRecord;
  });
}

// Como paridad-produccion.test.ts: los baquetones anteriores a `baquetonDelantero` no lo guardaron.
function sinCamposNuevosVacios(calculado: Record<string, unknown>, guardado: Record<string, unknown>) {
  const copia = { ...calculado };
  if (!("baquetonDelantero" in guardado) && copia.baquetonDelantero === null) delete copia.baquetonDelantero;
  return copia;
}

const planDe = (extra: Partial<Parameters<typeof planificarMigracion>[0]> = {}) => planificarMigracion({
  registros: webVieja(), estados: [], existentes: new Set(), archivados: async () => [], tecnicos: TECNICOS, ahora: AHORA, ...extra,
});

describe("planificarMigracion con los 32 casos reales", () => {
  it("un pedido por número, con los elementos tal cual y los mismos resultados que en la web vieja", async () => {
    const plan = await planDe();
    expect(plan.crear).toHaveLength(21);
    expect([plan.omitidos, plan.yaEstan, plan.repetidos]).toEqual([[], [], []]);
    expect(plan.crear.flatMap((p) => p.elementos)).toHaveLength(32);
    const viejos = webVieja();
    for (const p of plan.crear) {
      expect(p).toMatchObject({
        kind: "remolques", status: "PENDING_REVIEW", createdBy: "IVÁN", production: null,
        summary: { technician: "IVÁN", reviewer: "JAIME" }, origen: { web: "remolques-tgm", migradoEn: AHORA },
      });
      for (const e of p.elementos) {
        const viejo = viejos.find((r) => normalizarNumeroPedido(r.numeroPedido) === p.orderCode && r.version === e.version)!;
        expect(e.input).toEqual(viejo.input);
        expect(e.result).toEqual(viejo.result);
        expect(e.paramsSnapshot).toEqual(viejo.paramsSnapshot);
        const recalculado = e.tipo === "lona" ? calcLona(e.input as LonaInput, e.paramsSnapshot) : calcBaqueton(e.input as BaquetonInput, e.paramsSnapshot);
        const guardado = viejo.result as unknown as Record<string, unknown>;
        expect(sinCamposNuevosVacios(recalculado as unknown as Record<string, unknown>, guardado)).toEqual(guardado);
      }
    }
  });

  it("generado si la web vieja lo archivó o su PDF ya está en las carpetas; pendiente si cambió después", async () => {
    const estados: EstadoPedidoViejo[] = [
      {
        pedido: "AR2690001", numeroPedido: "AR.26.90001",
        revision: { estado: "APROBADO", por: "ADRIAN", en: "2026-09-08T09:00:00.000Z" },
        ultimaDecision: { estado: "APROBADO", por: "ADRIAN", en: "2026-09-08T09:00:00.000Z" },
        produccion: { por: "IVAN", en: "2026-09-08T10:00:00.000Z", nombrePdf: "AR2690001-10.pdf", rutas: ["/mnt/plan/AR2690001-10.pdf", "/mnt/ot/2026/AR2690001.pdf"] },
        updatedAt: "2026-09-08T10:00:00.000Z",
      },
      {
        pedido: "AR2690002", numeroPedido: "AR.26.90002",
        revision: { estado: "EN_REVISION", por: "IVAN", en: "2026-09-10T09:00:00.000Z" },
        ultimaDecision: { estado: "APROBADO", por: "JAIME", en: "2026-09-09T09:00:00.000Z" },
        produccion: { por: "IVAN", en: "2026-09-09T10:00:00.000Z", nombrePdf: "AR2690002-10.pdf", rutas: ["/mnt/plan/AR2690002-10.pdf", "/mnt/ot/2026/AR2690002.pdf"] },
        updatedAt: "2026-09-10T09:00:00.000Z",
      },
    ];
    const archivados = async (numero: string) => (numero === "AR.26.90003"
      ? [{ type: "pdf" as const, filename: "AR2690003.pdf", savedPath: "/mnt/ot/2026/AR2690003.pdf" }]
      : []);
    const plan = await planDe({ estados, archivados, existentes: new Set(["AR2690021"]) });
    const de = (codigo: string) => plan.crear.find((p) => p.orderCode === codigo)!;
    expect(de("AR2690001")).toMatchObject({
      status: "PRODUCED", reviewedBy: "ADRIÁN", updatedAt: "2026-09-08T10:00:00.000Z",
      production: {
        createdAt: "2026-09-08T10:00:00.000Z", createdBy: "IVÁN",
        files: [
          { type: "pdf", filename: "AR2690001-10.pdf", savedPath: "/mnt/plan/AR2690001-10.pdf" },
          { type: "pdf", filename: "AR2690001.pdf", savedPath: "/mnt/ot/2026/AR2690001.pdf" },
        ],
      },
    });
    expect(de("AR2690002")).toMatchObject({ status: "PENDING_REVIEW", production: null });
    expect(de("AR2690003")).toMatchObject({ status: "PRODUCED", production: { files: [{ savedPath: "/mnt/ot/2026/AR2690003.pdf" }] } });
    expect(plan.crear.filter((p) => p.status === "PRODUCED").map((p) => p.orderCode).sort()).toEqual(["AR2690001", "AR2690003"]);
    expect(plan.yaEstan).toEqual(["AR2690021"]);
    expect(plan.crear).toHaveLength(20);
  });

  it("deja sin pasar lo que no tiene número de pedido y pasa solo el último guardado de un elemento repetido", async () => {
    const [uno, dos] = webVieja();
    const registros = [
      uno,
      { ...uno, id: "id-repetido", updatedAt: "2026-09-08T09:30:00.000Z", input: { ...uno.input, cantidad: 2 } },
      { ...dos, id: "id-smoke", numeroPedido: "SMOKE-TEST" },
      { ...dos, id: "id-vacio", numeroPedido: "" },
    ] as PlanteamientoRecord[];
    const plan = await planDe({ registros });
    expect(plan.crear.map((p) => [p.orderCode, p.elementos.length, p.elementos[0].input.cantidad])).toEqual([["AR2690001", 1, 2]]);
    expect(plan.repetidos).toEqual([{ orderCode: "AR2690001", descartados: 1 }]);
    expect(plan.omitidos).toEqual([
      { numeroPedido: "SMOKE-TEST", ids: ["id-smoke"], motivo: "«SMOKE-TEST» no tiene forma de número de pedido (dos letras y cinco cifras o más)." },
      { numeroPedido: "", ids: ["id-vacio"], motivo: "No tiene número de pedido." },
    ]);
  });
});

describe("aplicar e informar", () => {
  it("crea los pedidos sin pisar ninguno y el informe lo cuenta", async () => {
    const dir = carpetaNueva();
    const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => dir });
    const plan = await planDe();
    expect(informeMigracion(plan, { simular: true }).slice(0, 2)).toEqual([
      "SIMULACIÓN: no se ha escrito nada.",
      "Se crearían 21 pedidos: 0 generados (a «Generados») y 21 pendientes (a «Por revisar»).",
    ]);
    const codigos = plan.crear.map((p) => p.orderCode);
    expect(await aplicarMigracion(plan, almacen)).toEqual({ creados: codigos, yaEstaban: [] });
    expect(readdirSync(dir)).toHaveLength(21);
    expect(await aplicarMigracion(plan, almacen)).toEqual({ creados: [], yaEstaban: codigos });
  });

  it("el comando simula sin escribir, pasa los 32 casos, no duplica al repetirlo y no toca la web vieja", () => {
    const raiz = carpetaNueva();
    const origen = path.join(raiz, "remolques-tgm");
    mkdirSync(path.join(origen, "data"), { recursive: true });
    const fichero = path.join(origen, "data", "planteamientos.json");
    writeFileSync(fichero, JSON.stringify(webVieja(), null, 1));
    const huella = () => createHash("sha256").update(readFileSync(fichero)).digest("hex");
    const antes = huella();
    const destino = path.join(raiz, "interna");
    const correr = (...extra: string[]) => execFileSync(process.execPath, ["scripts/migrar-remolques.mjs", "--origen", origen, "--destino", destino, ...extra], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const simulado = correr("--simular");
    expect(simulado).toContain("SIMULACIÓN: no se ha escrito nada.");
    expect(simulado).toContain("Se crearían 21 pedidos");
    expect(existsSync(destino)).toBe(false);
    expect(correr()).toContain("Hecho: 21 pedidos creados");
    expect(readdirSync(destino)).toHaveLength(21);
    const otra = correr();
    expect(otra).toContain("Se crean 0 pedidos");
    expect(otra).toContain("Hecho: 0 pedidos creados");
    expect(readdirSync(destino)).toHaveLength(21);
    expect(huella()).toBe(antes);
  }, 60_000);
});
```

- [ ] **Step 2: Ejecutarla y ver que falla**

Run: `pnpm exec vitest run src/remolques/flujo/__tests__/migracion.test.ts`
Expected: FAIL — `Failed to load url ../migracion.ts`.

- [ ] **Step 3: El planificador**

Crear `src/remolques/flujo/migracion.ts`:

```ts
import { reviewerName } from "../../reviewRules.js";
import { normalizarParams } from "../calc/validar-params.ts";
import { agruparPorPedido } from "../pedidos/agrupar-pedido.ts";
import { normalizarNumeroPedido } from "../pedidos/numero-pedido.ts";
import { FORMA_PEDIDO_RPS } from "../rps/numero-pedido.ts";
import type { PlanteamientoRecord } from "../store/types.ts";
import type { AlmacenPedidosRemolques } from "./almacen.ts";
import { resumenPedido } from "./pedido.ts";
import {
  ESQUEMA_PEDIDO_REMOLQUES, TIPO_PEDIDO_REMOLQUES, type ElementoGuardado, type FicheroGenerado, type PedidoRemolques,
} from "./tipos.ts";

// Paso desde la web vieja de remolques (fase 5, apartado 6). Se ejecuta una vez en el .90 con
// scripts/migrar-remolques.mjs: lee data/planteamientos.json (y data/pedidos.json si existe) de
// /webs/remolques-tgm y crea un pedido por número en la carpeta interna. No toca la web vieja ni
// escribe en las carpetas compartidas; repetirlo no duplica (lo que ya está no se pisa).

/** El estado de revisión de la web vieja (Remolques-TGM/src/lib/pedidos/estado-pedido.ts). */
export interface EstadoPedidoViejo {
  pedido: string;
  numeroPedido: string;
  revision: { estado: "EN_REVISION" | "APROBADO" | "NO_APROBADO"; por: string; en: string };
  ultimaDecision: { estado: "APROBADO" | "NO_APROBADO"; por: string; en: string } | null;
  produccion: { por: string; en: string; nombrePdf: string; rutas: string[] } | null;
  updatedAt: string;
}

export interface OmitidoMigracion {
  numeroPedido: string;
  ids: string[];
  motivo: string;
}

export interface PlanMigracion {
  crear: PedidoRemolques[];
  /** Pedidos que ya estaban en la web nueva: no se tocan. */
  yaEstan: string[];
  omitidos: OmitidoMigracion[];
  /** Guardados repetidos del mismo elemento en la web vieja: se pasa solo el último. */
  repetidos: { orderCode: string; descartados: number }[];
}

const masReciente = (fechas: string[]) => fechas.reduce((max, fecha) => (fecha > max ? fecha : max), "");
const masAntigua = (fechas: string[]) => fechas.reduce((min, fecha) => (!min || (fecha && fecha < min) ? fecha : min), "");
const nombreDe = (ruta: string) => ruta.split(/[\\/]/).pop() ?? ruta;
const claveDe = (registro: PlanteamientoRecord) => normalizarNumeroPedido(registro.numeroPedido) || `SIN-PEDIDO:${registro.id}`;

export async function planificarMigracion({ registros, estados, existentes, archivados, tecnicos, ahora }: {
  registros: PlanteamientoRecord[];
  estados: EstadoPedidoViejo[];
  /** Los pedidos que ya hay en la carpeta interna (orderCode). */
  existentes: Set<string>;
  /** Los PDF de ese pedido que ya están en las carpetas de remolques (solo se mira, nunca se escribe). */
  archivados: (numeroPedido: string, fecha: string) => Promise<FicheroGenerado[]>;
  /** La lista de técnicos de toldos: «IVAN» de la web vieja pasa a «IVÁN». */
  tecnicos: string[];
  ahora: string;
}): Promise<PlanMigracion> {
  const plan: PlanMigracion = { crear: [], yaEstan: [], omitidos: [], repetidos: [] };
  for (const grupo of agruparPorPedido(registros)) {
    const todos = registros.filter((registro) => claveDe(registro) === grupo.clave);
    const ids = todos.map((registro) => registro.id);
    if (grupo.clave.startsWith("SIN-PEDIDO:")) {
      plan.omitidos.push({ numeroPedido: "", ids, motivo: "No tiene número de pedido." });
      continue;
    }
    if (!FORMA_PEDIDO_RPS.test(grupo.clave)) {
      plan.omitidos.push({ numeroPedido: grupo.numeroPedido, ids, motivo: `«${grupo.numeroPedido}» no tiene forma de número de pedido (dos letras y cinco cifras o más).` });
      continue;
    }
    if (existentes.has(grupo.clave)) {
      plan.yaEstan.push(grupo.clave);
      continue;
    }
    if (todos.length > grupo.remolques.length) {
      plan.repetidos.push({ orderCode: grupo.clave, descartados: todos.length - grupo.remolques.length });
    }

    // Tal cual: entrada, resultado y parámetros del momento. Así los resultados son los de la web vieja.
    const elementos: ElementoGuardado[] = grupo.remolques.map((registro) => ({
      version: registro.version, tipo: registro.tipo, input: registro.input, result: registro.result, paramsSnapshot: registro.paramsSnapshot,
    }));
    const ultimo = [...grupo.remolques].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    const technician = reviewerName(ultimo.input.cabecera.realizadoPor, tecnicos);
    const reviewer = reviewerName(ultimo.input.cabecera.revision, tecnicos);
    const estado = estados.find((item) => normalizarNumeroPedido(item.pedido || item.numeroPedido) === grupo.clave) ?? null;
    const ultimoCambio = masReciente(todos.map((registro) => registro.updatedAt));
    const produccion = estado?.produccion ?? null;
    // Como estadoVisiblePedido de la web vieja: si se tocó después de archivar, está pendiente.
    const cambiosDespues = Boolean(produccion && (ultimoCambio > produccion.en || (estado && estado.revision.en > produccion.en)));
    const enCarpetas = await archivados(ultimo.numeroPedido, ultimo.input.cabecera.fecha);
    const generado = !cambiosDespues && (Boolean(produccion && produccion.rutas.length === 2) || enCarpetas.length > 0);
    const ficheros: FicheroGenerado[] = produccion?.rutas.length
      ? produccion.rutas.map((ruta) => ({ type: "pdf", filename: nombreDe(ruta), savedPath: ruta }))
      : enCarpetas;
    const enGenerado = produccion?.en || ultimoCambio;
    const decision = estado?.ultimaDecision ?? null;

    plan.crear.push({
      schemaVersion: ESQUEMA_PEDIDO_REMOLQUES,
      kind: TIPO_PEDIDO_REMOLQUES,
      orderCode: grupo.clave,
      numeroPedido: ultimo.numeroPedido.trim(),
      status: generado ? "PRODUCED" : "PENDING_REVIEW",
      createdAt: masAntigua(todos.map((registro) => registro.createdAt)) || ultimoCambio,
      updatedAt: generado ? masReciente([enGenerado, ultimoCambio]) : ultimoCambio,
      createdBy: technician,
      reviewedAt: decision?.en ?? null,
      reviewedBy: decision?.estado === "APROBADO" ? reviewerName(decision.por, tecnicos) : reviewer,
      reviewNote: "",
      production: generado
        ? { createdAt: enGenerado, createdBy: produccion?.por ? reviewerName(produccion.por, tecnicos) : technician, files: ficheros }
        : null,
      summary: resumenPedido(elementos, { technician, reviewer }),
      params: normalizarParams(ultimo.paramsSnapshot),
      elementos,
      origen: { web: "remolques-tgm", ids, migradoEn: ahora },
    });
  }
  return plan;
}

export async function aplicarMigracion(plan: PlanMigracion, almacen: Pick<AlmacenPedidosRemolques, "crear">): Promise<{ creados: string[]; yaEstaban: string[] }> {
  const creados: string[] = [];
  const yaEstaban = [...plan.yaEstan];
  for (const pedido of plan.crear) {
    ((await almacen.crear(pedido)) === "creado" ? creados : yaEstaban).push(pedido.orderCode);
  }
  return { creados, yaEstaban };
}

export function informeMigracion(plan: PlanMigracion, { simular }: { simular: boolean }): string[] {
  const generados = plan.crear.filter((pedido) => pedido.status === "PRODUCED").length;
  const pendientes = plan.crear.length - generados;
  const lineas = [
    simular ? "SIMULACIÓN: no se ha escrito nada." : "Paso desde la web vieja de remolques:",
    `${simular ? "Se crearían" : "Se crean"} ${plan.crear.length} pedidos: ${generados} generados (a «Generados») y ${pendientes} pendientes (a «Por revisar»).`,
    ...plan.crear.map((pedido) => `  ${pedido.orderCode} · ${pedido.status === "PRODUCED" ? "generado" : "pendiente"} · ${pedido.elementos.length} ${pedido.elementos.length === 1 ? "elemento" : "elementos"} · ${pedido.summary.customer || "sin cliente"}`),
  ];
  if (plan.yaEstan.length) lineas.push(`Ya estaban en la web nueva (no se tocan): ${plan.yaEstan.join(", ")}.`);
  for (const r of plan.repetidos) {
    lineas.push(`${r.orderCode}: ${r.descartados} ${r.descartados === 1 ? "guardado repetido" : "guardados repetidos"} del mismo elemento; se pasa el último.`);
  }
  for (const o of plan.omitidos) {
    lineas.push(`Se deja sin pasar ${o.numeroPedido || "(sin número)"} (${o.ids.length} ${o.ids.length === 1 ? "planteamiento" : "planteamientos"}): ${o.motivo}`);
  }
  return lineas;
}
```

- [ ] **Step 4: El comando**

Crear `scripts/migrar-remolques.mjs`:

```js
// Paso de los planteamientos de la web vieja de remolques a Planteamientos TGM (fase 5).
// Una vez, en el .90, desde /webs/toldos-testar y primero simulando:
//   node scripts/migrar-remolques.mjs --origen /webs/remolques-tgm --simular
//   node scripts/migrar-remolques.mjs --origen /webs/remolques-tgm
// Lee (nunca escribe) <origen>/data/planteamientos.json y, si existe, <origen>/data/pedidos.json.
// Escribe solo en la carpeta interna de remolques de Configuración (o en --destino). Para saber si un
// pedido ya tiene su PDF archivado mira (sin escribir) las dos carpetas de remolques.
// Repetirlo no duplica: lo que ya está en la carpeta interna no se toca.
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { formOptions } from '../src/domain/modelBehavior.js';
import { crearAlmacenPedidosRemolques } from '../src/remolques/flujo/almacen.ts';
import { aplicarMigracion, informeMigracion, planificarMigracion } from '../src/remolques/flujo/migracion.ts';
import { destinosPdfRemolques } from '../src/remolques/salida/archivo.ts';

const { values } = parseArgs({
  options: {
    origen: { type: 'string' },
    destino: { type: 'string' },
    planteamientos: { type: 'string' },
    oficina: { type: 'string' },
    simular: { type: 'boolean', default: false }
  }
});
if (!values.origen) {
  console.error('Falta --origen: la carpeta de la web vieja (p. ej. /webs/remolques-tgm).');
  process.exit(2);
}

async function leerJson(fichero, siFalta) {
  try {
    return JSON.parse(await readFile(fichero, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT' && siFalta !== undefined) return siFalta;
    throw new Error(`No se pudo leer ${fichero}: ${error.message}`);
  }
}

// Sin --destino, las carpetas son las de la configuración de la web (las mismas que usa el servidor).
async function carpetas() {
  if (values.destino) {
    return { interna: values.destino, planteamientos: values.planteamientos ?? '', oficina: values.oficina ?? '' };
  }
  const { config } = await import('../src/config.js');
  const { createWorkflowStore, defaultWorkflowSettings } = await import('../src/workflow.js');
  const ajustes = await createWorkflowStore({ settingsFile: config.workflowSettingsFile, defaults: defaultWorkflowSettings(config) }).getSettings();
  return {
    interna: ajustes.remolquesRevisionDirectory,
    planteamientos: values.planteamientos ?? ajustes.remolquesPlanteamientosDirectory,
    oficina: values.oficina ?? ajustes.remolquesOficinaTecnicaDirectory
  };
}

const dirs = await carpetas();
if (!dirs.interna) {
  console.error('Falta la carpeta interna de remolques (Configuración o REMOLQUES_REVISION_DIRECTORY, o --destino).');
  process.exit(2);
}
const registros = await leerJson(path.join(values.origen, 'data', 'planteamientos.json'));
if (!Array.isArray(registros)) {
  console.error('data/planteamientos.json no es una lista de planteamientos.');
  process.exit(2);
}
const estados = await leerJson(path.join(values.origen, 'data', 'pedidos.json'), []);
if (!dirs.planteamientos || !dirs.oficina) {
  console.warn('AVISO: sin las dos carpetas de remolques no se puede mirar qué PDF ya están archivados; solo cuenta data/pedidos.json.');
}

async function archivados(numeroPedido, fecha) {
  if (!dirs.planteamientos || !dirs.oficina) return [];
  let destinos;
  try {
    ({ destinos } = destinosPdfRemolques(numeroPedido, fecha, {
      remolquesPlanteamientosDirectory: dirs.planteamientos,
      remolquesOficinaTecnicaDirectory: dirs.oficina
    }));
  } catch {
    return [];
  }
  const hay = await Promise.all(destinos.map((destino) => stat(destino).then((s) => s.isFile(), () => false)));
  return destinos.filter((_, indice) => hay[indice]).map((savedPath) => ({ type: 'pdf', filename: path.basename(savedPath), savedPath }));
}

const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => dirs.interna });
const existentes = new Set((await almacen.listar()).map((pedido) => pedido.orderCode));
const plan = await planificarMigracion({
  registros,
  estados: Array.isArray(estados) ? estados : [],
  existentes,
  archivados,
  tecnicos: formOptions.tecnicos,
  ahora: new Date().toISOString()
});
for (const linea of informeMigracion(plan, { simular: values.simular })) console.log(linea);
if (values.simular) process.exit(0);
const { creados, yaEstaban } = await aplicarMigracion(plan, almacen);
console.log(`Hecho: ${creados.length} pedidos creados en ${dirs.interna}; ${yaEstaban.length} ya estaban.`);
```

- [ ] **Step 5: Ejecutar la prueba**

Run: `pnpm exec vitest run src/remolques/flujo/__tests__/migracion.test.ts && pnpm typecheck && pnpm lint`
Expected: PASS (5 pruebas), sin errores.

- [ ] **Step 6: Documentar el paso para Iván**

En `README.md`, antes de `## Prueba de extremo a extremo con RPS`:

````md
### 6. Paso de los pedidos de la web vieja de remolques (una vez)

Con la carpeta interna de remolques ya puesta en `Configuración` (o en
`REMOLQUES_REVISION_DIRECTORY`), en el .90 y desde `/webs/toldos-testar`:

```bash
node scripts/migrar-remolques.mjs --origen /webs/remolques-tgm --simular
node scripts/migrar-remolques.mjs --origen /webs/remolques-tgm
```

La primera orden solo enseña qué haría: los pedidos que pasan (los ya archivados a «Generados» y los
pendientes a «Por revisar»), los guardados repetidos de un mismo elemento (pasa el último) y lo que
deja sin pasar y por qué (sin número o con un número que no es de pedido). Solo lee la web vieja
(`data/planteamientos.json` y, si existe, `data/pedidos.json`) y mira, sin escribir, si el PDF de
cada pedido está ya en las carpetas de remolques; solo escribe en la carpeta interna. Repetirla no
duplica nada: un pedido que ya está no se toca.
````

- [ ] **Step 7: Commit**

```bash
git add src/remolques/flujo/migracion.ts src/remolques/flujo/__tests__/migracion.test.ts scripts/migrar-remolques.mjs README.md
git commit -m "feat(remolques): comando para pasar los pedidos de la web vieja

Fase 5, para poder retirar la web vieja: un comando que se ejecuta una vez
en el .90, primero con --simular. Agrupa los planteamientos por pedido y los
crea en la carpeta interna: los ya archivados como generados y los demás
pendientes, con sus entradas, resultados y parámetros tal cual. Solo lee la
web vieja y las carpetas compartidas, informa de lo que hace y repetirlo no
duplica. Probado con los 32 casos reales.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 10: Prueba de punta a punta, toldos igual y documentación

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio.

**Files:**
- Create: `scripts/test-remolques-5-e2e.mjs`
- Modify: `.claude/skills/running-toldos-testar/SKILL.md`, `src/remolques/README.md`

**Interfaces:**
- Consumes: todo lo anterior; `openApp`, `BASE_URL` (`.claude/skills/running-toldos-testar/drive.mjs`), `editor`, `teclearCaso` (`scripts/lib/remolques-e2e.mjs`), `leerDatosPedido` (Task 4), el CoordinaOT simulado (`POST /__estado`, `/__reset`).
- Produces: `node scripts/test-remolques-5-e2e.mjs` (termina con `Remolques fase 5: OK`), capturas en `tmp/ui-audit/remolques-5/`.

- [ ] **Step 1: Escribir la e2e**

Crear `scripts/test-remolques-5-e2e.mjs`:

```js
// Prueba e2e de la fase 5 de remolques: guardar para revisión en Remolques, Pedidos con toldos y
// remolques (etiqueta, filtro, grupos de CoordinaOT), «Generar archivos» con los dos PDF iguales,
// sus datos dentro y «REVISADO POR», lo que no se puede hacer, «Reutilizar datos» y «Corregir».
// Va en una aislada con su propia carpeta de prueba, porque activa la generación de archivos (solo
// dentro de tmp/) y no debe tocar la configuración de la de 4310:
//   ISOLATED_DIR="$PWD/tmp/remolques-5" PORT=4311 FAKE_COORDINA_PORT=4321 bash .claude/skills/running-toldos-testar/start-isolated.sh
//   TOLDOS_ISOLATED_URL=http://127.0.0.1:4311 FAKE_COORDINA_PORT=4321 node scripts/test-remolques-5-e2e.mjs
// Capturas en tmp/ui-audit/remolques-5/ (claro y oscuro, 1280×720 y 1600×1000). Al acabar deja la
// generación apagada y el CoordinaOT simulado como al principio.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { leerDatosPedido } from '../src/remolques/flujo/adjunto.ts';
import { editor, teclearCaso } from './lib/remolques-e2e.mjs';

const FAKE = `http://127.0.0.1:${process.env.FAKE_COORDINA_PORT || 4320}`;
const SALIDA = 'tmp/ui-audit/remolques-5';
fs.mkdirSync(SALIDA, { recursive: true });
const CON_WEBGL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
// El año del número es el de hoy: así el generado sale en «Generados» del año que abre Pedidos.
const ANIO = String(new Date().getFullYear());
const AA = ANIO.slice(2);
const numero = (n) => ({ pedido: `AR.${AA}.${n}`, codigo: `AR${AA}${n}` });
const P1 = numero('99501');
const P2 = numero('99502');
const P3 = numero('99503');
const OF = { a: '0299501', b: '0299502', c: '0299503', d: '0299504' };
const fixture = JSON.parse(fs.readFileSync('src/remolques/__fixtures__/produccion-2026-09.json', 'utf8'));
const caso = (id) => fixture.find((c) => c.caso === id);
const json = (datos) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos ?? {}) });
async function api(ruta, init) {
  const r = await fetch(`${BASE_URL}${ruta}`, init);
  return { status: r.status, datos: await r.json().catch(() => null) };
}
const fijarCoordina = (ofs) => fetch(`${FAKE}/__estado`, json({ ofs }));
const elemento = (id, version, pedido, of) => {
  const c = caso(id);
  return { version, tipo: c.tipo, input: { ...c.input, cabecera: { ...c.input.cabecera, numeroPedido: pedido, version, cliente: 'TALLERES DE PRUEBA', fecha: `${ANIO}-09-30`, ordenFabricacion: of } } };
};

// Las carpetas de esta aislada tienen que estar dentro de tmp/ del repositorio: aquí se activa la generación.
const { settings: ajustes } = (await api('/api/workflow/settings')).datos;
const TMP = path.resolve('tmp');
for (const clave of ['remolquesRevisionDirectory', 'remolquesPlanteamientosDirectory', 'remolquesOficinaTecnicaDirectory']) {
  const ruta = path.resolve(String(ajustes[clave] || '').replace('{YYYY}', ANIO));
  assert.ok(ajustes[clave] && ruta.startsWith(`${TMP}${path.sep}`), `${clave} tiene que estar dentro de tmp/: «${ajustes[clave]}»`);
}
const ponerGeneracion = (activa) => api('/api/workflow/settings', { ...json({ ...ajustes, productionEnabled: activa }), method: 'PUT' });
const oficinaDelAnio = ajustes.remolquesOficinaTecnicaDirectory.replace('{YYYY}', ANIO);
const pdfPlan = path.join(ajustes.remolquesPlanteamientosDirectory, `${P1.codigo}-10.pdf`);
const pdfOficina = path.join(oficinaDelAnio, `${P1.codigo}.pdf`);

// Empezar de cero: los pedidos y los PDF de una vuelta anterior, la generación apagada.
for (const p of [P1, P2, P3]) {
  fs.rmSync(path.join(ajustes.remolquesRevisionDirectory, `${p.codigo}.json`), { force: true });
  fs.rmSync(path.join(ajustes.remolquesPlanteamientosDirectory, `${p.codigo}-10.pdf`), { force: true });
  fs.rmSync(path.join(oficinaDelAnio, `${p.codigo}.pdf`), { force: true });
}
await ponerGeneracion(false);
await fetch(`${FAKE}/__reset`, json());
await fijarCoordina({ [OF.a]: { estado: 'en_revision' }, [OF.b]: { estado: 'en_revision' } });

const { browser, page, errors } = await openApp({ width: 1600, height: 1000 }, { launchArgs: CON_WEBGL });
page.setDefaultTimeout(20000);
const irAPedidos = () => page.getByRole('button', { name: /^Pedidos/ }).first().click();
const fila = (codigo) => page.locator('.orders-row', { hasText: codigo });
const grupoDe = (codigo) => page.locator('.orders-group', { has: fila(codigo) });
async function abrir(codigo) {
  await fila(codigo).first().waitFor();
  if (!(await fila(codigo).getByRole('button', { name: 'Abrir el pedido' }).isVisible())) await fila(codigo).locator('.orders-row-toggle').click();
  await fila(codigo).getByRole('button', { name: 'Abrir el pedido' }).click();
}
const botonActivo = (texto) => page.waitForFunction((t) => [...document.querySelectorAll('button')].some((b) => b.textContent.trim() === t && !b.disabled), texto);
// El servidor recuerda 30 s cada respuesta de CoordinaOT: se repite hasta que se cumple (40 s como mucho).
async function hasta(comprobar, que, limiteMs = 40_000) {
  const fin = Date.now() + limiteMs;
  let ultimo;
  for (;;) {
    try {
      await comprobar();
      return;
    } catch (error) {
      ultimo = error;
    }
    if (Date.now() > fin) throw new Error(`${que}: no se cumplió en ${limiteMs / 1000} s. ${ultimo.message}`);
    await page.waitForTimeout(3000);
  }
}
async function capturas(nombre) {
  for (const [width, height] of [[1280, 720], [1600, 1000]]) {
    await page.setViewportSize({ width, height });
    for (const tema of ['light', 'dark']) {
      await page.evaluate((t) => { document.documentElement.dataset.theme = t; }, tema);
      await page.screenshot({ path: `${SALIDA}/${nombre}-${width}-${tema === 'light' ? 'claro' : 'oscuro'}.png` });
    }
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  await page.setViewportSize({ width: 1600, height: 1000 });
}

try {
  // ── 1. Guardar para revisión desde Remolques ──
  await page.getByRole('button', { name: /^Remolques/ }).click();
  await page.getByLabel('Pedido', { exact: true }).fill(P1.pedido);
  await page.getByLabel('Cliente', { exact: true }).fill('TALLERES DE PRUEBA');
  for (const [id, boton, of] of [['lona-02', '+ Remolque', OF.a], ['baqueton-01', '+ Baquetón', OF.b]]) {
    await page.getByRole('button', { name: boton, exact: true }).click();
    await editor(page).waitFor();
    await teclearCaso(page, caso(id));
    await editor(page).locator('input[data-campo="ordenFabricacion"]').fill(of);
  }
  await botonActivo('Guardar para revisión');
  await capturas('1-remolques-listo');
  await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
  await page.getByText(`Guardado en Pedidos para revisión: ${P1.codigo}.`).waitFor();
  assert.equal(await page.locator('.rem-pestana').count(), 0, 'al guardar, la pantalla queda para un pedido nuevo');
  const guardado = (await api(`/api/remolques/pedidos/${P1.codigo}`)).datos;
  assert.equal(guardado.status, 'PENDING_REVIEW');
  assert.equal(guardado.summary.technician, 'IVÁN');
  assert.deepEqual(guardado.summary.ofs, [OF.a, OF.b]);
  console.log('OK: guardado para revisión desde Remolques');

  // ── 2. En Pedidos: etiqueta, filtro, búsqueda y «Por revisar» ──
  await irAPedidos();
  await fila(P1.codigo).waitFor();
  assert.equal((await fila(P1.codigo).locator('.orders-kind-tag').innerText()).trim(), 'Remolque');
  assert.match(await grupoDe(P1.codigo).locator('.orders-group-title').innerText(), /Por revisar/);
  const filtro = page.getByRole('group', { name: 'Qué tipo de pedidos' });
  await filtro.getByRole('button', { name: 'Toldos', exact: true }).click();
  assert.equal(await fila(P1.codigo).count(), 0, '«Toldos» deja fuera los remolques');
  await filtro.getByRole('button', { name: 'Remolques', exact: true }).click();
  await fila(P1.codigo).waitFor();
  assert.equal(await page.locator('.orders-kind-tag.is-toldos').count(), 0, '«Remolques» deja solo remolques');
  await filtro.getByRole('button', { name: 'Todos', exact: true }).click();
  await page.getByLabel('Buscar pedidos').fill('arquillado');
  await fila(P1.codigo).waitFor();
  await page.getByLabel('Buscar pedidos').fill('');
  await capturas('2-pedidos-por-revisar');
  await abrir(P1.codigo);
  await page.getByText(`Sin aprobar en CoordinaOT: A (${OF.a}) en revisión, B (${OF.b}) en revisión.`).first().waitFor();
  assert.equal(await page.getByRole('button', { name: 'Generar archivos', exact: true }).isDisabled(), true);
  console.log('OK: en Pedidos con «Remolque», el filtro, la búsqueda por perfil y «Por revisar»');

  // ── 3. CoordinaOT aprueba (revisor «jaime») ──
  await fijarCoordina({ [OF.a]: { estado: 'aprobada', revisor: 'jaime' }, [OF.b]: { estado: 'aprobada', revisor: 'jaime' } });
  await hasta(async () => {
    await page.reload();
    await irAPedidos();
    await fila(P1.codigo).waitFor();
    assert.match(await grupoDe(P1.codigo).locator('.orders-group-title').innerText(), /Aprobados · falta generar/);
  }, 'aprobado en CoordinaOT');
  await ponerGeneracion(true);
  await abrir(P1.codigo);
  await botonActivo('Generar archivos');
  await page.getByText('Aprobado por Jaime').first().waitFor();
  await capturas('3-detalle-aprobado');
  console.log('OK: aprobado → «Aprobados · falta generar» y «Generar archivos» encendido para el autor');

  // ── 4. Generar archivos ──
  await page.getByRole('button', { name: 'Generar archivos', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Sí, generar archivos' }).click();
  await page.getByText(new RegExp(`Guardada la hoja de taller ${P1.codigo}-10\\.pdf`)).waitFor({ timeout: 90_000 });
  const plan = fs.readFileSync(pdfPlan);
  assert.ok(plan.equals(fs.readFileSync(pdfOficina)), 'las dos copias son el mismo PDF');
  const dentro = await leerDatosPedido(plan);
  assert.equal(dentro.orderCode, P1.codigo);
  assert.equal(dentro.status, 'PRODUCED');
  assert.equal(dentro.reviewedBy, 'JAIME');
  assert.deepEqual(dentro.elementos.map((e) => [e.tipo, e.input.cabecera.ordenFabricacion]), [['lona', OF.a], ['baqueton', OF.b]]);
  const doc = await getDocument({ data: new Uint8Array(plan) }).promise;
  assert.equal(doc.numPages, 2, 'una hoja por elemento');
  for (let n = 1; n <= doc.numPages; n++) {
    const texto = (await (await doc.getPage(n)).getTextContent()).items.map((i) => i.str).join(' ');
    assert.match(texto, /REVISADO POR/, `hoja ${n}: lleva «REVISADO POR»`);
    assert.match(texto, /JAIME/, `hoja ${n}: con el revisor de CoordinaOT`);
  }
  fs.copyFileSync(pdfPlan, `${SALIDA}/${P1.codigo}-10.pdf`);
  await fila(P1.codigo).waitFor();
  assert.equal(await grupoDe(P1.codigo).locator('.orders-day-title').count(), 1, 'el pedido está en «Generados»');
  await capturas('4-generados');
  console.log('OK: generado, dos PDF iguales con los datos dentro y «REVISADO POR» JAIME, y en «Generados»');

  // ── 5. Lo que no se puede: regenerar, guardar encima, sustituir sin preguntar ──
  assert.equal((await api(`/api/remolques/pedidos/${P1.codigo}/generar`, json({}))).datos?.unchanged, true, 'un generado no se vuelve a generar');
  const encima = await api('/api/remolques/pedidos', json({ elementos: [elemento('lona-02', '10', P1.pedido, OF.a)], savedBy: 'IVÁN', confirmOverwrite: true }));
  assert.deepEqual([encima.status, encima.datos.error], [409, 'Este pedido ya está generado. Cambia el número de pedido para guardarlo como uno nuevo.']);
  assert.equal((await api('/api/remolques/pedidos', json({ elementos: [elemento('lona-03', '10', P3.pedido, OF.d)], savedBy: 'IVÁN' }))).status, 200);
  await fijarCoordina({ [OF.d]: { estado: 'aprobada', revisor: 'angel' } });
  const yaHay = path.join(ajustes.remolquesPlanteamientosDirectory, `${P3.codigo}-10.pdf`);
  fs.writeFileSync(yaHay, '%PDF-1.4 viejo');
  const pregunta = await api(`/api/remolques/pedidos/${P3.codigo}/generar`, json({}));
  assert.deepEqual([pregunta.status, pregunta.datos.needsConfirmation, pregunta.datos.existing], [409, true, [`${P3.codigo}-10.pdf`]]);
  const sustituido = await api(`/api/remolques/pedidos/${P3.codigo}/generar`, json({ confirmOverwrite: true }));
  assert.equal(sustituido.status, 200, JSON.stringify(sustituido.datos));
  assert.equal((await leerDatosPedido(fs.readFileSync(yaHay))).reviewedBy, 'ÁNGEL');
  console.log('OK: sin regenerar, sin guardar encima de un generado y sustituir solo confirmando');

  // ── 6. Reutilizar datos ──
  await abrir(P1.codigo);
  await page.getByRole('button', { name: 'Reutilizar datos', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Reutilizar datos', exact: true }).click();
  await editor(page).waitFor();
  assert.equal(await page.getByLabel('Pedido', { exact: true }).inputValue(), P1.pedido);
  assert.equal(await page.locator('.rem-pestana').count(), 2);
  assert.equal(await page.locator('.rem-aviso-params').count(), 0, '«Reutilizar» calcula con los parámetros actuales');
  console.log('OK: «Reutilizar datos» carga el pedido como uno nuevo');

  // ── 7. Corregir, con sus parámetros, y volver a guardar ──
  const comunes = (await api('/api/remolques/parametros')).datos;
  const propios = { ...comunes, demasiaAlto: comunes.demasiaAlto + 1 };
  assert.equal((await api('/api/remolques/pedidos', json({ elementos: [elemento('lona-02', '10', P2.pedido, OF.c)], params: propios, savedBy: 'IVÁN' }))).status, 200);
  // Guardado por la API: la lista de pendientes se lee al cargar la página.
  await page.reload();
  await irAPedidos();
  await abrir(P2.codigo);
  await page.getByRole('button', { name: 'Corregir', exact: true }).click();
  // Solo pregunta si Remolques tiene algo (tras recargar está vacío).
  const abrirParaCorregir = page.getByRole('alertdialog').getByRole('button', { name: 'Abrir para corregir', exact: true });
  if (await abrirParaCorregir.waitFor({ timeout: 3000 }).then(() => true, () => false)) await abrirParaCorregir.click();
  await page.locator('.rem-aviso-params').waitFor();
  assert.equal(await page.getByLabel('Pedido', { exact: true }).inputValue(), P2.pedido);
  assert.equal(await editor(page).locator('input[data-campo="ordenFabricacion"]').inputValue(), OF.c);
  await capturas('5-corregir');
  await page.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Actualizar pedido', exact: true }).click();
  await page.getByText(`Guardado en Pedidos para revisión: ${P2.codigo}.`).waitFor();
  assert.equal((await api(`/api/remolques/pedidos/${P2.codigo}`)).datos.params.demasiaAlto, propios.demasiaAlto, '«Corregir» guarda con los parámetros con que se guardó');
  console.log('OK: «Corregir» abre el pedido con sus datos y sus parámetros, y se vuelve a guardar');
} finally {
  await ponerGeneracion(false).catch(() => {});
  await fetch(`${FAKE}/__reset`, json()).catch(() => {});
  await browser.close();
}
// Los 409 son las preguntas de confirmar («Actualizar pedido»): el navegador los apunta como error de red.
assert.deepEqual(errors.filter((e) => !/status of 409/.test(e)), [], 'sin errores de consola');
console.log('Remolques fase 5: OK');
```

- [ ] **Step 2: Ejecutarla**

Run (en segundo plano): `ISOLATED_DIR="$PWD/tmp/remolques-5" PORT=4311 FAKE_COORDINA_PORT=4321 bash .claude/skills/running-toldos-testar/start-isolated.sh`
Esperar a `curl -fsS http://127.0.0.1:4311/api/health` (`"simulationMode":true`, `"fileWritesEnabled":false`).

Run: `TOLDOS_ISOLATED_URL=http://127.0.0.1:4311 FAKE_COORDINA_PORT=4321 node scripts/test-remolques-5-e2e.mjs`
Expected: las siete líneas `OK: …` y al final `Remolques fase 5: OK`.

Mirar las capturas de `tmp/ui-audit/remolques-5/` (claro y oscuro, 1280 y 1600) y el PDF copiado `tmp/ui-audit/remolques-5/AR<AA>99501-10.pdf`: dos hojas, «REVISADO POR» con JAIME. Si algo se ve mal, corregirlo en la tarea que toca (CSS de las tareas 6 a 8) antes de seguir.

- [ ] **Step 3: Toldos y remolques siguen igual**

Con la misma instancia:

Run: `TOLDOS_ISOLATED_URL=http://127.0.0.1:4311 FAKE_COORDINA_PORT=4321 node scripts/test-coordina-approval-e2e.mjs`
Expected: `Aprobación CoordinaOT: OK (503 saltado en la aislada)` (sin cambiar el script).

Run: `TOLDOS_ISOLATED_URL=http://127.0.0.1:4311 node scripts/test-remolques-2a-e2e.mjs`
Expected: termina sin errores (sin cambiar el script).

Run: `TOLDOS_ISOLATED_URL=http://127.0.0.1:4311 node scripts/test-remolques-4-e2e.mjs`
Expected: termina sin errores; las partes que necesitan RPS o la web vieja pueden salir como `SALTADO` (sin cambiar el script).

Parar la instancia.

- [ ] **Step 4: Documentación**

En `.claude/skills/running-toldos-testar/SKILL.md`, en la parte que explica `start-isolated.sh`, añadir:

```md
- `ISOLATED_DIR="$PWD/tmp/<carpeta>"` arranca la aislada con otra carpeta de prueba (siempre dentro
  de `tmp/` del repositorio; el script se niega si no). Úsala con otro puerto cuando la prueba cambie
  la configuración (p. ej. activa la generación), para no tocar la de 4310.
- La carpeta interna de remolques (pedidos de remolques guardados) es `$D/rem-revision`.
- E2e de la fase 5 de remolques (flujo):
  `ISOLATED_DIR="$PWD/tmp/remolques-5" PORT=4311 FAKE_COORDINA_PORT=4321 bash .claude/skills/running-toldos-testar/start-isolated.sh`
  y `TOLDOS_ISOLATED_URL=http://127.0.0.1:4311 FAKE_COORDINA_PORT=4321 node scripts/test-remolques-5-e2e.mjs`.
```

En `src/remolques/README.md`, al final:

```md
## Fase 5: el flujo

`flujo/` lleva el camino de un pedido de remolques, con las reglas de toldos de
`src/reviewRules.js` (no se copian):

- `tipos.ts` y `pedido.ts`: el pedido guardado (`kind: "remolques"`, mismos estados y campos de
  fuera que toldos) y sus reglas puras (letras y OF por elemento, perfil como modelo, año).
- `almacen.ts`: un JSON por pedido en la carpeta interna (`REMOLQUES_REVISION_DIRECTORY`).
- `adjunto.ts`: el pedido dentro del PDF generado (`AR….remolques.json`, con `pdf-lib`).
- `servicio.ts`: guardar, listar, abrir, vista previa, generar (CoordinaOT en fresco, solo con todo
  aprobado, un bloqueo por pedido, `archivarPdfRemolques`) y abrir el generado. Las rutas
  `/api/remolques/pedidos…` de `src/server.js` solo lo llaman.
- `migracion.ts` y `scripts/migrar-remolques.mjs`: el paso desde la web vieja (una vez, con
  `--simular` primero).

Diseño: `docs/superpowers/specs/2026-10-01-remolques-fase-5-flujo-design.md`. Los Parámetros de
remolques (su apartado 5) los hace otra tarea.
```

- [ ] **Step 5: Batería completa**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: todo PASS (también la paridad de remolques), sin errores y build terminado.

- [ ] **Step 6: Commit y subida**

```bash
git add scripts/test-remolques-5-e2e.mjs .claude/skills/running-toldos-testar/SKILL.md src/remolques/README.md
git commit -m "test(remolques): e2e del flujo de la fase 5 y su documentación

Guardar para revisión, Pedidos con los dos tipos y su filtro, la aprobación
de CoordinaOT simulado, «Generar archivos» con los dos PDF iguales, sus
datos dentro y «REVISADO POR», lo que no se puede hacer, «Reutilizar» y
«Corregir». Va en su propia aislada (ISOLATED_DIR) porque activa la
generación dentro de tmp/. Las e2e de toldos y de remolques siguen igual.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git pull --rebase
git push origin main
```

---

## Después del plan

- Revisión final de toda la rama con el modelo más capaz (Opus, esfuerzo alto): orden de escritura al generar (PDF → archivo → estado), bloqueo, mensajes y que toldos no ha cambiado.
- Para Iván, al desplegar (en una línea): `pnpm install && pnpm build && pnpm deploy:check && pnpm pm2:reload`, después crear `/var/lib/toldos-testar/remolques-pedidos`, ponerla en Configuración, `node scripts/migrar-remolques.mjs --origen /webs/remolques-tgm --simular`, revisar el informe y repetir sin `--simular`.
- Fase 3 (fichas de cliente) y fase 6 (retirada de la web vieja) siguen pendientes.

## Cobertura del spec (sin el apartado 5)

| Spec | Tarea |
| --- | --- |
| 1. Pedidos juntos, etiqueta «Toldo»/«Remolque», filtro, búsqueda (perfil), grupos `coordinaGroup` por OF, etiquetas A, B… con `collapseAwnings`, «Generados» por año | 2 (resumen), 8 |
| 2. «Guardar para revisión» con `saveReviewDecision`/`reviewAuthorship`, solo completo, almacén interno con su contenido, estados de toldos, borradores borrados | 2, 3, 5, 6 |
| 3. Detalle con la vista previa, «Corregir» (datos y parámetros guardados, mismo autor), «Reutilizar» (nuevo, sin técnico ni revisor, parámetros actuales) | 6, 7, 8 |
| 4. «Generar archivos»: `generationBlock` en fresco, solo el autor, bloqueo, escritura activada, «REVISADO POR» con `approvalReviewers` + `reviewerName`, JSON dentro, `archivarPdfRemolques` con 409, `PRODUCED` | 1, 4, 5, 7 |
| 6. Migración con `--simular`, idempotente, sin escribir fuera, informe, 32 casos | 9 |
| 7. Configuración y `deploy:check` | 3 |
| Pruebas unitarias y e2e (toldos igual) | todas, 10 |
