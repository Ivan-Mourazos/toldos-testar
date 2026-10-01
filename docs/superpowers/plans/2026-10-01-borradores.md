# Borradores en el servidor (toldos y remolques) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un pedido a medias, de toldos o de remolques, se pueda dejar en el servidor con «Guardar borrador» (uno por número de pedido), verlo desde cualquier puesto en Pedidos › «Borradores», seguir con él o descartarlo, y que desaparezca solo al pasarlo a revisión.

**Architecture:** Cuatro capas. (1) Un módulo nuevo `src/borradores/` con los tipos, las reglas puras (número, forma del contenido, resumen) que usan el servidor y la web, un almacén de un JSON por pedido en una carpeta interna nueva (Configuración, paso 08; semilla `DRAFTS_DIRECTORY`) y un servicio con las reglas de guardar (autor, «ya en Pedidos», toldos o remolques, bloqueo por número). (2) `src/server.js` solo pone las rutas `/api/borradores…` y, tras guardar para revisión (toldos y remolques), borra el borrador de ese número. (3) En la web, un módulo común `src/client/borradores.ts` (llamadas y preguntas) que usan Toldos (`App.tsx`) y Remolques (`useRemolques`): «Guardar borrador», abrir un borrador y la pregunta de «Obtener datos del pedido». (4) Pedidos: apartado «Borradores» encima de «Por revisar», con su etiqueta, el filtro y la búsqueda de siempre, «Seguir con el borrador» y «Descartar borrador».

**Tech Stack:** TypeScript (el servidor lo ejecuta sin compilar, Node ≥ 22.18), React 19, Express 5 (rutas en `src/server.js`, JS), vitest (entorno node; componentes con `renderToStaticMarkup`), Playwright para la e2e en una instancia aislada.

**Spec:** `docs/superpowers/specs/2026-10-01-borradores-design.md`. Patrones que se copian: `src/remolques/flujo/almacen.ts` (almacén atómico) y `src/remolques/flujo/servicio.ts` (bloqueo por pedido, `Respuesta`), y la tarea 3 del plan `docs/superpowers/plans/2026-10-01-remolques-fase-5.md` (carpeta interna en Configuración, `deploy:check` y la aislada).

## Decisiones del plan (lo que el spec no fija)

- **Módulo propio `src/borradores/`** (no dentro de `src/remolques/`): es de los dos productos. Rutas propias `/api/borradores…`; las de pedidos no cambian salvo el borrado tras guardar para revisión.
- **El número manda en la dirección**: `PUT /api/borradores/:orderCode` comprueba que el número del contenido (`order.orderCode` en toldos, `numeroPedido` en remolques) normalizado es el de la dirección (400 si no). Nombre del fichero: el número sin puntos ni espacios, solo letras y cifras (`normalizarNumeroPedido`, como los pedidos de remolques: `AR.26.04286` → `AR2604286.json`).
- **Orden de las comprobaciones al guardar**: número → carpeta configurada (400 «Falta la carpeta de borradores…») → «Soy» (400) → forma del contenido (400) → bloqueo (409) → ya en Pedidos, de toldos o de remolques (409 «Este pedido ya está en Pedidos: ábrelo y usa «Corregir».») → borrador del otro producto (409) → de otra persona sin `confirmOverwrite` (409 `needsConfirmation` con `savedBy`) → guardar.
- **Contenido de remolques** = `{ numeroPedido, cliente, fecha, lineas, paramsGuardados? }`: el spec pide las líneas y los parámetros de «Corregir»; el número, el cliente y la fecha de la cabecera hacen falta para volver a cargar la pantalla. En la práctica `paramsGuardados` casi nunca irá (corregir es de un pedido ya en Pedidos, y ese número no admite borrador), pero se guarda si la pantalla lo tiene, como el borrador del navegador.
- **Contenido de toldos** = `{ order }` con los campos del formulario (`DraftState`) tal cual, **sin** `parameters`/`parametersVersion` ni autor sellado: un borrador siempre es de un pedido nuevo (uno guardado no admite borrador), así que «Seguir» calcula con los parámetros actuales y el autor lo decide el servidor al guardar para revisión.
- **«Guardar borrador» en Remolques sale junto a «Guardar para revisión»**, es decir, cuando el pedido tiene al menos un elemento (un borrador sin elementos no sirve de nada). En Toldos, en la barra de arriba, activo en cuanto hay número (aunque no haya toldos).
- **«Seguir con el borrador» y «Descartar borrador» van en la fila desplegada** de Pedidos (como «Abrir el pedido»), no en una pantalla de detalle aparte.
- **«Obtener datos del pedido» con borrador**: diálogo de tres salidas de `askForConfirmation`: «Abrir borrador» (`confirm`), «Empezar de cero» (`alternative`, sigue con RPS como hoy) y «Cancelar». Si el borrador es del otro producto, el mensaje lo dice y se abre en su pantalla. Si leer el borrador falla, se sigue con RPS sin decir nada.
- **«Abrir borrador» desde «Obtener datos» en la misma pantalla no vuelve a preguntar** (el diálogo ya dice que se sustituye lo que hay); abrirlo en la otra pantalla, o desde Pedidos, pregunta si esa pantalla tiene datos.
- **«Descartar borrador»** responde 200 aunque ya no estuviera (`existia: false`): dos puestos que descartan a la vez no ven un error.
- La comprobación de despliegue de la carpeta de borradores vive en `scripts/lib/deploy-remolques.mjs` junto a la de la carpeta interna de remolques (misma función, otros textos) para no duplicarla.

## Global Constraints

- Solo escritorio (1280×720 a 1920); no adaptar a móvil.
- Textos de la interfaz y comentarios en castellano llano; decimales con coma (`toLocaleString('es-ES')`). No citar el Excel en la interfaz.
- Diseño igual que CoordinaOT: tokens y piezas de `src/client/coordina/` (`ghost-button`, `primary-button`, `boton-3d`, `bloque-3d`, `bloque-3d-hundido`, `familia-tag`, `orders-*` de `pedidos.css`), en claro y oscuro. Colores de familia de CoordinaOT: «Toldos» `#c65a11`, «Remolques» `#5a6472`.
- Nunca arrancar la web con el `.env` real: solo la instancia aislada `bash .claude/skills/running-toldos-testar/start-isolated.sh`. Esta tarea usa su propia carpeta y otro puerto: `ISOLATED_DIR="$PWD/tmp/borradores" PORT=4311 FAKE_COORDINA_PORT=4321` (Codex usa 4312). Comprobar `/api/health`: `simulationMode` true y `fileWritesEnabled` false.
- En las pruebas no se escribe nada fuera de `tmp/` del repositorio: carpetas temporales con `mkdtempSync(path.join(process.cwd(), "tmp", …))`, nunca `os.tmpdir()`.
- RPS es solo lectura (`SELECT`). No se toca el servidor 192.168.0.90 (despliega Iván). `coordina-ot` y `Remolques-TGM` son de solo lectura.
- La paridad de remolques no se toca: `src/remolques/paridad-produccion.test.ts`, `src/client/remolques/resultados-paridad.test.tsx`, `src/remolques/hoja/__tests__/paridad-hoja.test.ts` y sus fixtures siguen pasando sin cambiarlos.
- Toldos y remolques siguen igual salvo lo que pide el spec: `/api/reviews…` y `/api/remolques/pedidos…` responden lo mismo (solo se añade el borrado del borrador tras guardar bien); el borrador del navegador sigue como hoy; `scripts/test-coordina-approval-e2e.mjs` y `scripts/test-remolques-5-e2e.mjs` pasan sin cambiarlos.
- Los borradores **no** cuentan en «Pedidos N», no preguntan a CoordinaOT y no entran en «Generar archivos».
- Carpeta de borradores: semilla `DRAFTS_DIRECTORY` → `draftsDirectory` de Configuración (paso 08 «Borradores»); ruta absoluta y sin `{YYYY}`; recomendada `/var/lib/toldos-testar/borradores`; un fichero `<CODIGO>.json` por pedido, escritura atómica (temporal y renombrar). Sin carpeta: «Guardar borrador» dice que falta y Pedidos no enseña borradores, sin romper lo demás.
- Mensajes fijos del spec: «Este pedido ya está en Pedidos: ábrelo y usa «Corregir».», «Este borrador es de Jaime, ¿lo sustituyes?» (nombre con `controlLabel`), «Borrador guardado: AR…», «AR… tiene un borrador de Jaime del 01/10. ¿Lo abres?», botones «Guardar borrador», «Seguir con el borrador», «Descartar borrador», «Abrir borrador», «Empezar de cero», etiqueta «Borrador».
- Hay cambios a medias de otro agente en `src/client/remolques/RemolquesView.tsx`, `PestanasElementos.tsx`, `PedidoRemolquesDetalle.tsx` y `src/client/coordina/remolques.css`: editar sobre lo que haya, solo las líneas de esta tarea, y no añadir esos ficheros enteros a un commit si siguen con cambios ajenos (preguntar).
- Commits en castellano explicando el porqué, terminando en `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. `git add` con rutas explícitas; nada de `git add -A`, stash, reset ni checkout de ficheros ajenos. Mantener los finales de línea de cada fichero. `git pull --rebase` antes de `git push` (solo en la última tarea).
- Antes de subir: `pnpm test && pnpm typecheck && pnpm lint`, y `pnpm exec vite build` si se toca el cliente.
- Pantallas cambiadas: capturas con Playwright en la aislada, claro y oscuro, 1280×720 y 1600×1000, en `tmp/ui-audit/borradores/`, y mirarlas.

## Mapa de ficheros

Crear:
- `src/borradores/tipos.ts` — `Borrador` (toldos | remolques), su contenido y su resumen.
- `src/borradores/reglas.ts` — reglas puras (sin Node): número, forma del contenido, resumen, crear, mensajes. Las usa también la web.
- `src/borradores/almacen.ts` — un JSON por pedido en la carpeta de borradores.
- `src/borradores/servicio.ts` — listar, abrir, guardar (reglas y bloqueo), descartar y borrar tras revisión.
- `src/borradores/__tests__/reglas.test.ts`, `almacen.test.ts`, `servicio.test.ts`
- `src/client/borradores.ts` + `borradores.test.ts` — llamadas a la API y preguntas, comunes a Toldos y Remolques.
- `src/client/hooks/useBorradores.ts` — la lista para Pedidos.
- `scripts/test-borradores-e2e.mjs` — prueba de punta a punta.

Modificar:
- `src/config.js`, `src/config.test.js`, `src/workflow.js`, `src/workflow.test.js`, `src/client/types.ts`, `src/client/views/SettingsView.tsx` — carpeta de borradores.
- `scripts/lib/deploy-remolques.mjs`, `scripts/lib/deploy-remolques.test.mjs`, `scripts/check-deployment.mjs`, `.env.example`, `.env.production.example`, `README.md`.
- `.claude/skills/running-toldos-testar/start-isolated.sh`, `.claude/skills/running-toldos-testar/SKILL.md`.
- `src/server.js` — servicio, rutas y borrado tras revisión.
- `src/client/remolques/guardarPedido.ts`, `guardarPedido.test.ts`, `useRemolques.ts`, `RemolquesView.tsx`.
- `src/client/App.tsx` — abrir un borrador, «Guardar borrador» y la pregunta de «Obtener datos» en Toldos.
- `src/client/ordersInbox.ts`, `src/client/ordersInbox.test.ts`, `src/client/components/OrdersInbox.tsx`, `src/client/components/OrdersInbox.test.tsx`, `src/client/views/ReviewsView.tsx`, `src/client/coordina/pedidos.css`.

---

### Task 1: El borrador: tipos, reglas y almacén

Modelo recomendado: el más barato (el código está completo). Esfuerzo: bajo.

**Files:**
- Create: `src/borradores/tipos.ts`, `src/borradores/reglas.ts`, `src/borradores/almacen.ts`
- Test: `src/borradores/__tests__/reglas.test.ts`, `src/borradores/__tests__/almacen.test.ts`

**Interfaces:**
- Consumes: `normalizarNumeroPedido(value: string): string` (`src/remolques/pedidos/numero-pedido.ts`), `modeloElemento(elemento: { tipo; input }): string` (`src/remolques/flujo/pedido.ts`), `validarParams(bruto): { ok: true; params } | { ok: false; errores: string[] }` (`src/remolques/calc/validar-params.ts`), `LineaPedido` (`src/remolques/workspace/lineas.ts`), `CalcParams`.
- Produces (tipos): `ESQUEMA_BORRADOR = 1 as const`, `TipoBorrador = "toldos" | "remolques"`, `TIPOS_BORRADOR`, `ContenidoToldos = { order: { orderCode: string; awnings: unknown[] } & Record<string, unknown> }`, `ContenidoRemolques = { numeroPedido: string; cliente: string; fecha: string; lineas: LineaPedido[]; paramsGuardados?: CalcParams }`, `ResumenContenido = { customer: string; orderDate: string; elementos: number; models: string[] }`, `BorradorToldos`, `BorradorRemolques`, `Borrador = BorradorToldos | BorradorRemolques` (campos `schemaVersion, kind, orderCode, numeroPedido, savedBy, createdAt, updatedAt, summary, contenido`), `ResumenBorrador = Omit<Borrador, "contenido">`.
- Produces (reglas): `class ErrorBorrador extends Error { statusCode: number }` (400 por defecto), `MENSAJE_SIN_NUMERO`, `MENSAJE_SIN_AUTOR`, `MENSAJE_YA_EN_PEDIDOS`, `MENSAJE_OCUPADO`, `MENSAJE_OTRO_NUMERO`, `MENSAJE_NO_HAY`, `SIN_CARPETA_BORRADORES`, `mensajeOtroTipo(orderCode: string, kind: TipoBorrador): string`, `codigoBorrador(numeroPedido: unknown): string`, `type ContenidoLeido`, `leerContenido(kind: unknown, contenido: unknown): ContenidoLeido`, `resumenContenido(b): ResumenContenido`, `crearBorrador({ leido, savedBy, existente, ahora }): Borrador`, `resumenDeBorrador(b: Borrador): ResumenBorrador`, `esBorrador(valor: unknown): valor is Borrador`.
- Produces (almacén): `interface AlmacenBorradores { configurada(): Promise<boolean>; obtener(orderCode): Promise<Borrador | null>; guardar(b): Promise<string>; listar(): Promise<Borrador[]>; borrar(orderCode): Promise<boolean> }`, `ficheroBorrador(carpeta, orderCode): string`, `crearAlmacenBorradores({ carpeta: () => Promise<string>, registrar? }): AlmacenBorradores`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/borradores/__tests__/reglas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../../remolques/calc/params.ts";
import { emptyBaqueton, emptyLona } from "../../remolques/entradas-vacias.ts";
import type { LineaPedido } from "../../remolques/workspace/lineas.ts";
import {
  codigoBorrador, crearBorrador, ErrorBorrador, esBorrador, leerContenido, MENSAJE_SIN_NUMERO, mensajeOtroTipo,
  resumenContenido, resumenDeBorrador,
} from "../reglas.ts";

const lona = emptyLona();
const baqueton = emptyBaqueton();
const lineaLona = (cliente = "TALLERES CAL"): LineaPedido => ({
  version: "10", tipo: "lona",
  input: { ...lona, tipoPerfil: "TIPO 02", cabecera: { ...lona.cabecera, numeroPedido: "AR.26.04286", version: "10", cliente } },
});
const lineaBaqueton: LineaPedido = {
  version: "11", tipo: "baqueton",
  input: { ...baqueton, cabecera: { ...baqueton.cabecera, numeroPedido: "AR.26.04286", version: "11", cliente: "" } },
};
const ordenToldos = { orderCode: "AR.26.04286", customer: " TOLDOS CAL ", orderDate: "2026-10-01", awnings: [{ id: "a", model: "ARZUA PRO" }, { id: "b", model: "ARZUA PRO" }, { id: "c", model: "" }] };

describe("codigoBorrador", () => {
  it("es el número sin puntos ni espacios, en mayúsculas", () => {
    expect(codigoBorrador(" ar.26.04286 ")).toBe("AR2604286");
  });
  it("sin número no hay borrador", () => {
    expect(() => codigoBorrador("")).toThrow(MENSAJE_SIN_NUMERO);
    expect(() => codigoBorrador(" .. ")).toThrow(ErrorBorrador);
  });
});

describe("leerContenido", () => {
  it("toldos: el formulario tal cual, aunque esté incompleto", () => {
    const leido = leerContenido("toldos", { order: { orderCode: "AR.26.04286", awnings: [] } });
    expect(leido).toEqual({ kind: "toldos", numeroPedido: "AR.26.04286", contenido: { order: { orderCode: "AR.26.04286", awnings: [] } } });
  });

  it("toldos sin la forma del formulario: 400", () => {
    expect(() => leerContenido("toldos", { order: { awnings: [] } })).toThrow("El borrador de toldos no tiene la forma del formulario.");
    expect(() => leerContenido("toldos", {})).toThrow(ErrorBorrador);
  });

  it("remolques: número, cliente, fecha y líneas; los parámetros solo si son válidos", () => {
    const leido = leerContenido("remolques", { numeroPedido: " AR.26.04286 ", cliente: "TALLERES CAL", fecha: "2026-10-01", lineas: [lineaLona()] });
    expect(leido).toEqual({
      kind: "remolques", numeroPedido: "AR.26.04286",
      contenido: { numeroPedido: "AR.26.04286", cliente: "TALLERES CAL", fecha: "2026-10-01", lineas: [lineaLona()] },
    });
    const conParams = leerContenido("remolques", { numeroPedido: "AR.26.04286", lineas: [], paramsGuardados: DEFAULT_PARAMS });
    expect(conParams.contenido).toEqual({ numeroPedido: "AR.26.04286", cliente: "", fecha: "", lineas: [], paramsGuardados: DEFAULT_PARAMS });
    expect(() => leerContenido("remolques", { numeroPedido: "AR.26.04286", lineas: [], paramsGuardados: { demasiaAlto: "x" } }))
      .toThrow("Los parámetros guardados del borrador no son válidos");
  });

  it("remolques con una línea que no lo es: 400", () => {
    expect(() => leerContenido("remolques", { numeroPedido: "AR.26.04286", lineas: [{ version: "10", tipo: "otra", input: {} }] }))
      .toThrow("El borrador de remolques no tiene la forma de la pantalla.");
  });

  it("otro tipo: 400", () => {
    expect(() => leerContenido("persianas", {})).toThrow("El borrador tiene que ser de toldos o de remolques.");
  });
});

describe("resumenContenido", () => {
  it("toldos: cliente, fecha, cuántos toldos y los modelos sin repetir", () => {
    expect(resumenContenido({ kind: "toldos", contenido: { order: ordenToldos } }))
      .toEqual({ customer: "TOLDOS CAL", orderDate: "2026-10-01", elementos: 3, models: ["ARZUA PRO"] });
  });

  it("remolques: el perfil o «Baquetón» como modelo, y el cliente de las líneas si la cabecera no lo tiene", () => {
    expect(resumenContenido({ kind: "remolques", contenido: { numeroPedido: "AR.26.04286", cliente: "", fecha: "2026-10-01", lineas: [lineaLona(), lineaBaqueton] } }))
      .toEqual({ customer: "TALLERES CAL", orderDate: "2026-10-01", elementos: 2, models: ["Recto con aguas", "Baquetón"] });
  });
});

describe("crearBorrador y resumenDeBorrador", () => {
  it("el número normalizado como clave, quién y cuándo; al sustituir conserva cuándo se creó", () => {
    const leido = leerContenido("toldos", { order: ordenToldos });
    const primero = crearBorrador({ leido, savedBy: "IVÁN", existente: null, ahora: "2026-10-01T08:00:00.000Z" });
    expect(primero).toMatchObject({
      schemaVersion: 1, kind: "toldos", orderCode: "AR2604286", numeroPedido: "AR.26.04286", savedBy: "IVÁN",
      createdAt: "2026-10-01T08:00:00.000Z", updatedAt: "2026-10-01T08:00:00.000Z",
      summary: { customer: "TOLDOS CAL", elementos: 3 },
    });
    const segundo = crearBorrador({ leido, savedBy: "JAIME", existente: primero, ahora: "2026-10-01T09:00:00.000Z" });
    expect(segundo).toMatchObject({ savedBy: "JAIME", createdAt: "2026-10-01T08:00:00.000Z", updatedAt: "2026-10-01T09:00:00.000Z" });
    const resumen = resumenDeBorrador(segundo);
    expect(resumen).not.toHaveProperty("contenido");
    expect(resumen).toMatchObject({ orderCode: "AR2604286", kind: "toldos", savedBy: "JAIME" });
    expect(esBorrador(segundo)).toBe(true);
    expect(esBorrador(resumen)).toBe(false);
    expect(esBorrador({ kind: "remolques", orderCode: "" })).toBe(false);
  });

  it("dice de qué es el borrador que ya está", () => {
    expect(mensajeOtroTipo("AR2604286", "remolques"))
      .toBe("AR2604286 ya tiene un borrador de remolques: un pedido es de toldos o de remolques. Ábrelo desde Pedidos o revisa el número.");
  });
});
```

Crear `src/borradores/__tests__/almacen.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { crearAlmacenBorradores, ficheroBorrador } from "../almacen.ts";
import { crearBorrador, leerContenido, SIN_CARPETA_BORRADORES } from "../reglas.ts";

// Nada fuera de tmp/ del repositorio en las pruebas.
const TMP = path.join(process.cwd(), "tmp");
const temporales: string[] = [];
function carpetaNueva() {
  mkdirSync(TMP, { recursive: true });
  const dir = mkdtempSync(path.join(TMP, "borradores-almacen-"));
  temporales.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of temporales.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const borrador = (numero: string, ahora: string, savedBy = "IVÁN") =>
  crearBorrador({ leido: leerContenido("toldos", { order: { orderCode: numero, awnings: [] } }), savedBy, existente: null, ahora });

describe("almacén de borradores", () => {
  it("guarda un JSON por número normalizado, sin dejar temporales, y lo vuelve a leer", async () => {
    const dir = carpetaNueva();
    const almacen = crearAlmacenBorradores({ carpeta: async () => dir });
    expect(await almacen.configurada()).toBe(true);
    expect(await almacen.guardar(borrador("AR.26.04286", "2026-10-01T08:00:00.000Z"))).toBe(path.join(dir, "AR2604286.json"));
    expect(readdirSync(dir)).toEqual(["AR2604286.json"]);
    expect(await almacen.obtener("ar2604286")).toMatchObject({ orderCode: "AR2604286", savedBy: "IVÁN" });
    expect(await almacen.obtener("AR2699999")).toBeNull();
    expect(ficheroBorrador(dir, "AR.26.04286")).toBe(path.join(dir, "AR2604286.json"));
  });

  it("guardar sustituye; listar va del más reciente al más antiguo y salta los ficheros rotos", async () => {
    const dir = carpetaNueva();
    const avisos: string[] = [];
    const almacen = crearAlmacenBorradores({ carpeta: async () => dir, registrar: (m) => avisos.push(m) });
    await almacen.guardar(borrador("AR2604286", "2026-10-01T08:00:00.000Z"));
    await almacen.guardar(borrador("AR2604287", "2026-10-01T09:00:00.000Z"));
    await almacen.guardar(borrador("AR2604286", "2026-10-01T10:00:00.000Z", "JAIME"));
    writeFileSync(path.join(dir, "ROTO.json"), "{no es json");
    writeFileSync(path.join(dir, "OTRO.json"), JSON.stringify({ hola: 1 }));
    writeFileSync(path.join(dir, "notas.txt"), "no es un borrador");
    const lista = await almacen.listar();
    expect(lista.map((b) => [b.orderCode, b.savedBy])).toEqual([["AR2604286", "JAIME"], ["AR2604287", "IVÁN"]]);
    expect(avisos).toHaveLength(2);
    expect(avisos[0]).toContain("No se pudo leer el borrador");
  });

  it("borrar dice si estaba", async () => {
    const dir = carpetaNueva();
    const almacen = crearAlmacenBorradores({ carpeta: async () => dir });
    await almacen.guardar(borrador("AR2604286", "2026-10-01T08:00:00.000Z"));
    expect(await almacen.borrar("AR.26.04286")).toBe(true);
    expect(await almacen.borrar("AR2604286")).toBe(false);
    expect(await almacen.obtener("AR2604286")).toBeNull();
  });

  it("sin carpeta: no hay borradores y guardar dice que falta", async () => {
    const almacen = crearAlmacenBorradores({ carpeta: async () => "  " });
    expect(await almacen.configurada()).toBe(false);
    expect(await almacen.listar()).toEqual([]);
    expect(await almacen.obtener("AR2604286")).toBeNull();
    expect(await almacen.borrar("AR2604286")).toBe(false);
    await expect(almacen.guardar(borrador("AR2604286", "2026-10-01T08:00:00.000Z"))).rejects.toMatchObject({ message: SIN_CARPETA_BORRADORES, statusCode: 400 });
  });

  it("una carpeta que aún no existe se crea al guardar", async () => {
    const dir = path.join(carpetaNueva(), "nueva");
    const almacen = crearAlmacenBorradores({ carpeta: async () => dir });
    expect(await almacen.listar()).toEqual([]);
    await almacen.guardar(borrador("AR2604286", "2026-10-01T08:00:00.000Z"));
    expect(readdirSync(dir)).toEqual(["AR2604286.json"]);
  });
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `pnpm exec vitest run src/borradores`
Expected: FAIL — `Failed to load url ../reglas.ts` / `../almacen.ts` (no existen).

- [ ] **Step 3: Implementar los tipos**

Crear `src/borradores/tipos.ts`:

```ts
import type { CalcParams } from "../remolques/calc/params.ts";
import type { LineaPedido } from "../remolques/workspace/lineas.ts";

// Un borrador en el servidor (diseño 01/10/2026): un pedido a medias, de toldos o de remolques, que
// cualquiera puede seguir desde otro puesto. Uno por número de pedido, un JSON por borrador en la
// carpeta de borradores (Configuración, paso 08). No es un pedido: no cuenta en «Pedidos N», no va a
// CoordinaOT y desaparece al guardarlo para revisión o al descartarlo.

export const ESQUEMA_BORRADOR = 1 as const;

export type TipoBorrador = "toldos" | "remolques";
export const TIPOS_BORRADOR: readonly TipoBorrador[] = ["toldos", "remolques"];

/** Toldos: el formulario de Nuevo pedido tal cual (el `DraftState` de la web), aunque esté incompleto. */
export interface ContenidoToldos {
  order: { orderCode: string; awnings: unknown[] } & Record<string, unknown>;
}

/** Remolques: la cabecera y las líneas de la pantalla; los parámetros solo si se estaba corrigiendo. */
export interface ContenidoRemolques {
  numeroPedido: string;
  cliente: string;
  fecha: string;
  lineas: LineaPedido[];
  paramsGuardados?: CalcParams;
}

/** Lo que enseña Pedidos de cada borrador. */
export interface ResumenContenido {
  customer: string;
  orderDate: string;
  /** Cuántos toldos o elementos lleva. */
  elementos: number;
  /** Modelos de toldo, o perfiles de remolque y «Baquetón». */
  models: string[];
}

interface BaseBorrador {
  schemaVersion: typeof ESQUEMA_BORRADOR;
  /** El número normalizado (AR2604286): nombre del fichero y clave. */
  orderCode: string;
  /** El número tal como se escribió (AR.26.04286). */
  numeroPedido: string;
  /** Quien lo guardó la última vez («Soy»). */
  savedBy: string;
  createdAt: string;
  updatedAt: string;
  summary: ResumenContenido;
}

export interface BorradorToldos extends BaseBorrador {
  kind: "toldos";
  contenido: ContenidoToldos;
}

export interface BorradorRemolques extends BaseBorrador {
  kind: "remolques";
  contenido: ContenidoRemolques;
}

export type Borrador = BorradorToldos | BorradorRemolques;

/** Lo que lista Pedidos: el borrador sin su contenido. */
export type ResumenBorrador = Omit<Borrador, "contenido">;
```

- [ ] **Step 4: Implementar las reglas**

Crear `src/borradores/reglas.ts`:

```ts
import { validarParams } from "../remolques/calc/validar-params.ts";
import { modeloElemento } from "../remolques/flujo/pedido.ts";
import { normalizarNumeroPedido } from "../remolques/pedidos/numero-pedido.ts";
import type { LineaPedido } from "../remolques/workspace/lineas.ts";
import {
  ESQUEMA_BORRADOR, TIPOS_BORRADOR,
  type Borrador, type BorradorToldos, type ContenidoRemolques, type ContenidoToldos, type ResumenBorrador, type ResumenContenido,
  type TipoBorrador,
} from "./tipos.ts";

// Reglas puras de los borradores (diseño 01/10/2026), sin Node ni disco: las usan el servidor y la web.

/** Un error del borrador que se manda o se pide: la ruta responde con su código. */
export class ErrorBorrador extends Error {
  statusCode: number;
  constructor(mensaje: string, statusCode = 400) {
    super(mensaje);
    this.name = "ErrorBorrador";
    this.statusCode = statusCode;
  }
}

export const MENSAJE_SIN_NUMERO = "Falta el número de pedido: sin número no hay borrador.";
export const MENSAJE_SIN_AUTOR = "Elige quién eres en «Soy» antes de guardar el borrador.";
export const MENSAJE_YA_EN_PEDIDOS = "Este pedido ya está en Pedidos: ábrelo y usa «Corregir».";
export const MENSAJE_OCUPADO = "Se está guardando o descartando este borrador: vuelve a intentarlo en un momento.";
export const MENSAJE_OTRO_NUMERO = "El número del borrador no coincide con el de la dirección.";
export const MENSAJE_NO_HAY = "No hay borrador de este pedido.";
export const SIN_CARPETA_BORRADORES = "Falta la carpeta de borradores en Configuración (paso 08): no se pueden guardar borradores.";
const MENSAJE_TIPO = "El borrador tiene que ser de toldos o de remolques.";
const MENSAJE_FORMA_TOLDOS = "El borrador de toldos no tiene la forma del formulario.";
const MENSAJE_FORMA_REMOLQUES = "El borrador de remolques no tiene la forma de la pantalla.";

export const mensajeOtroTipo = (orderCode: string, kind: TipoBorrador) =>
  `${orderCode} ya tiene un borrador de ${kind}: un pedido es de toldos o de remolques. Ábrelo desde Pedidos o revisa el número.`;

/** La clave del borrador: el número sin puntos ni espacios, en mayúsculas (AR.26.04286 → AR2604286). */
export function codigoBorrador(numeroPedido: unknown): string {
  const codigo = normalizarNumeroPedido(String(numeroPedido ?? ""));
  if (!codigo) throw new ErrorBorrador(MENSAJE_SIN_NUMERO);
  return codigo.slice(0, 80);
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);
const texto = (valor: unknown) => (typeof valor === "string" ? valor : "");
const unicos = (valores: string[]) => [...new Set(valores.filter(Boolean))];
const pareceLinea = (valor: unknown): valor is LineaPedido =>
  esObjeto(valor) && typeof valor.version === "string" && (valor.tipo === "lona" || valor.tipo === "baqueton")
  && esObjeto(valor.input) && esObjeto(valor.input.cabecera);

/** El contenido que manda la pantalla, comprobado: su tipo, su número tal como se escribió y lo que se guarda. */
export type ContenidoLeido =
  | { kind: "toldos"; numeroPedido: string; contenido: ContenidoToldos }
  | { kind: "remolques"; numeroPedido: string; contenido: ContenidoRemolques };

/** Solo se comprueba la forma: un borrador puede estar a medias. */
export function leerContenido(kind: unknown, contenido: unknown): ContenidoLeido {
  if (!TIPOS_BORRADOR.includes(kind as TipoBorrador)) throw new ErrorBorrador(MENSAJE_TIPO);
  if (kind === "toldos") {
    const order = esObjeto(contenido) ? contenido.order : null;
    if (!esObjeto(order) || typeof order.orderCode !== "string" || !Array.isArray(order.awnings)) {
      throw new ErrorBorrador(MENSAJE_FORMA_TOLDOS);
    }
    return { kind: "toldos", numeroPedido: String(order.orderCode).trim(), contenido: { order: order as ContenidoToldos["order"] } };
  }
  if (!esObjeto(contenido) || typeof contenido.numeroPedido !== "string" || !Array.isArray(contenido.lineas)) {
    throw new ErrorBorrador(MENSAJE_FORMA_REMOLQUES);
  }
  const lineas: unknown[] = contenido.lineas;
  if (!lineas.every(pareceLinea)) throw new ErrorBorrador(MENSAJE_FORMA_REMOLQUES);
  const leido: ContenidoRemolques = {
    numeroPedido: String(contenido.numeroPedido).trim(),
    cliente: texto(contenido.cliente),
    fecha: texto(contenido.fecha),
    lineas,
  };
  if (contenido.paramsGuardados != null) {
    const params = validarParams(contenido.paramsGuardados);
    if (!params.ok) throw new ErrorBorrador(`Los parámetros guardados del borrador no son válidos: ${params.errores.join("; ")}.`);
    leido.paramsGuardados = params.params;
  }
  return { kind: "remolques", numeroPedido: leido.numeroPedido, contenido: leido };
}

type ConContenido =
  | { kind: "toldos"; contenido: ContenidoToldos }
  | { kind: "remolques"; contenido: ContenidoRemolques };

export function resumenContenido(borrador: ConContenido): ResumenContenido {
  if (borrador.kind === "toldos") {
    const { order } = borrador.contenido;
    return {
      customer: texto(order.customer).trim(),
      orderDate: texto(order.orderDate),
      elementos: order.awnings.length,
      models: unicos(order.awnings.map((awning) => (esObjeto(awning) ? texto(awning.model) : ""))),
    };
  }
  const { cliente, fecha, lineas } = borrador.contenido;
  return {
    customer: cliente.trim() || (lineas.map((linea) => texto(linea.input.cabecera.cliente).trim()).find(Boolean) ?? ""),
    orderDate: fecha,
    elementos: lineas.length,
    models: unicos(lineas.map(modeloElemento)),
  };
}

/** El borrador que se guarda. Al sustituir uno, conserva cuándo se creó; quién lo guardó es el último. */
export function crearBorrador({ leido, savedBy, existente, ahora }: {
  leido: ContenidoLeido;
  savedBy: string;
  existente: Borrador | null;
  ahora: string;
}): Borrador {
  const base: Omit<BorradorToldos, "kind" | "contenido"> = {
    schemaVersion: ESQUEMA_BORRADOR,
    orderCode: codigoBorrador(leido.numeroPedido),
    numeroPedido: leido.numeroPedido,
    savedBy,
    createdAt: existente?.createdAt ?? ahora,
    updatedAt: ahora,
    summary: resumenContenido(leido),
  };
  return leido.kind === "toldos"
    ? { ...base, kind: "toldos", contenido: leido.contenido }
    : { ...base, kind: "remolques", contenido: leido.contenido };
}

/** Lo que lista Pedidos: sin el contenido, que puede ser grande. */
export function resumenDeBorrador(borrador: Borrador): ResumenBorrador {
  const copia: Partial<Borrador> = { ...borrador };
  delete copia.contenido;
  return copia as ResumenBorrador;
}

/** Lo que se lee del disco puede ser cualquier cosa: solo vale lo que tiene forma de borrador. */
export function esBorrador(valor: unknown): valor is Borrador {
  return esObjeto(valor) && TIPOS_BORRADOR.includes(valor.kind as TipoBorrador)
    && typeof valor.orderCode === "string" && Boolean(valor.orderCode)
    && typeof valor.savedBy === "string" && typeof valor.updatedAt === "string"
    && esObjeto(valor.summary) && esObjeto(valor.contenido);
}
```

- [ ] **Step 5: Implementar el almacén**

Crear `src/borradores/almacen.ts`:

```ts
import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { codigoBorrador, ErrorBorrador, esBorrador, SIN_CARPETA_BORRADORES } from "./reglas.ts";
import type { Borrador } from "./tipos.ts";

// Los borradores en el servidor (diseño 01/10/2026): un JSON por número de pedido en la carpeta de
// borradores (Configuración, paso 08; semilla DRAFTS_DIRECTORY). Como el de los pedidos de remolques
// (src/remolques/flujo/almacen.ts): escritura atómica (temporal y renombrar) y un fichero roto se salta.

export interface AlmacenBorradores {
  /** Si la carpeta está puesta en Configuración. */
  configurada(): Promise<boolean>;
  obtener(orderCode: string): Promise<Borrador | null>;
  /** Escribe el borrador (lo sustituye si ya estaba). Devuelve la ruta del fichero. */
  guardar(borrador: Borrador): Promise<string>;
  /** Todos, del más reciente al más antiguo. */
  listar(): Promise<Borrador[]>;
  /** true si estaba y se ha borrado. */
  borrar(orderCode: string): Promise<boolean>;
}

/** El número normalizado como nombre: solo letras y cifras, así nunca sale de la carpeta. */
export const ficheroBorrador = (carpeta: string, orderCode: string) => path.join(carpeta, `${codigoBorrador(orderCode)}.json`);

async function leer(fichero: string): Promise<Borrador> {
  const datos: unknown = JSON.parse(await readFile(fichero, "utf8"));
  if (!esBorrador(datos)) throw new Error(`${path.basename(fichero)} no es un borrador.`);
  return datos;
}

const contenido = (borrador: Borrador) => `${JSON.stringify(borrador, null, 2)}\n`;
const temporalDe = (fichero: string) => `${fichero}.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
const codigo = (error: unknown) => (error as NodeJS.ErrnoException).code;

export function crearAlmacenBorradores({ carpeta, registrar = (mensaje: string) => console.error(mensaje) }: {
  /** La carpeta de borradores de la configuración en este momento ('' si no está puesta). */
  carpeta: () => Promise<string>;
  registrar?: (mensaje: string) => void;
}): AlmacenBorradores {
  const carpetaActual = async () => (await carpeta()).trim();

  return {
    async configurada() {
      return Boolean(await carpetaActual());
    },

    async obtener(orderCode) {
      const dir = await carpetaActual();
      if (!dir) return null;
      try {
        return await leer(ficheroBorrador(dir, orderCode));
      } catch (error) {
        if (codigo(error) === "ENOENT") return null;
        throw error;
      }
    },

    async guardar(borrador) {
      const dir = await carpetaActual();
      if (!dir) throw new ErrorBorrador(SIN_CARPETA_BORRADORES);
      await mkdir(dir, { recursive: true });
      const fichero = ficheroBorrador(dir, borrador.orderCode);
      const temporal = temporalDe(fichero);
      await writeFile(temporal, contenido(borrador), { flag: "wx" });
      try {
        await rename(temporal, fichero);
      } catch (error) {
        await rm(temporal, { force: true });
        throw error;
      }
      return fichero;
    },

    async listar() {
      const dir = await carpetaActual();
      if (!dir) return [];
      let nombres: string[];
      try {
        nombres = await readdir(dir);
      } catch (error) {
        if (codigo(error) === "ENOENT") return [];
        throw error;
      }
      const borradores = await Promise.all(nombres.filter((nombre) => nombre.toLowerCase().endsWith(".json")).map(async (nombre) => {
        try {
          return await leer(path.join(dir, nombre));
        } catch (error) {
          registrar(`No se pudo leer el borrador ${nombre}: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      }));
      return borradores
        .filter((borrador): borrador is Borrador => borrador !== null)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async borrar(orderCode) {
      const dir = await carpetaActual();
      if (!dir) return false;
      try {
        await rm(ficheroBorrador(dir, orderCode));
        return true;
      } catch (error) {
        if (codigo(error) === "ENOENT") return false;
        throw error;
      }
    },
  };
}
```

- [ ] **Step 6: Ejecutar las pruebas, el tipado y el lint**

Run: `pnpm exec vitest run src/borradores && pnpm typecheck && pnpm lint`
Expected: PASS (las dos pruebas nuevas), `tsc` y `eslint` sin errores.

- [ ] **Step 7: Commit**

```bash
git add src/borradores/tipos.ts src/borradores/reglas.ts src/borradores/almacen.ts src/borradores/__tests__/reglas.test.ts src/borradores/__tests__/almacen.test.ts
git commit -m "feat(borradores): el borrador en el servidor, sus reglas y su almacén

Iván, 01/10/2026: un pedido a medias se deja en el servidor para seguirlo
desde cualquier puesto, uno por número de pedido, de toldos o de remolques.
Un JSON por borrador con el número normalizado como nombre, escritura
atómica y un fichero roto se salta. Las reglas son puras para que la web
use las mismas.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: La carpeta de borradores en Configuración, el despliegue y la aislada

Modelo recomendado: el más barato (el código está completo). Esfuerzo: bajo.

**Files:**
- Modify: `src/config.js`, `src/workflow.js` (`defaultWorkflowSettings`, `normalizeWorkflowSettings`, `checkWorkflowDirectories`), `src/server.js` (defaults del `workflowStore`), `src/client/types.ts` (`WorkflowSettings`), `src/client/views/SettingsView.tsx`
- Modify: `scripts/lib/deploy-remolques.mjs`, `scripts/check-deployment.mjs`, `.env.example`, `.env.production.example`, `README.md`
- Modify: `.claude/skills/running-toldos-testar/start-isolated.sh`, `.claude/skills/running-toldos-testar/SKILL.md`
- Test: `src/config.test.js`, `src/workflow.test.js`, `scripts/lib/deploy-remolques.test.mjs`

**Interfaces:**
- Consumes: nada de tareas anteriores.
- Produces: `config.draftsDirectory` (de `DRAFTS_DIRECTORY`), `settings.draftsDirectory` (Configuración, `GET/PUT /api/workflow/settings`; `''` si no está), `WorkflowSettings.draftsDirectory: string` en el cliente, `comprobarCarpetaBorradores({ carpeta, estricto, acceso? }): Promise<{ errores; avisos; exitos }>`, y la aislada con `DRAFTS_DIRECTORY="$D/borradores"`.

- [ ] **Step 1: Escribir las pruebas que fallan**

En `src/config.test.js`, añadir arriba, junto a `const originalRemolquesRevisionDirectory = …`:

```js
const originalDraftsDirectory = process.env.DRAFTS_DIRECTORY;
```

en el `afterEach`, después de `restoreEnvironment('REMOLQUES_REVISION_DIRECTORY', originalRemolquesRevisionDirectory);`:

```js
  restoreEnvironment('DRAFTS_DIRECTORY', originalDraftsDirectory);
```

y dentro de `describe('configuración por entorno', …)`, después de `test('REMOLQUES_REVISION_DIRECTORY es la carpeta interna …', …)`:

```js
  test('DRAFTS_DIRECTORY es la carpeta de los borradores', async () => {
    process.env.DRAFTS_DIRECTORY = '/var/lib/toldos-testar/borradores';
    expect((await loadConfig('production', '')).draftsDirectory).toBe('/var/lib/toldos-testar/borradores');
  });
```

En `src/workflow.test.js`, después de `it('guarda la carpeta interna de remolques: absoluta, sin {YYYY}, y la comprueba si está puesta', …)`:

```js
  it('guarda la carpeta de borradores: absoluta, sin {YYYY}, y la comprueba si está puesta', async () => {
    // Nada fuera de tmp/ del repositorio.
    await fs.mkdir(path.join(process.cwd(), 'tmp'), { recursive: true });
    const root = await fs.mkdtemp(path.join(process.cwd(), 'tmp', 'workflow-borradores-'));
    temporaryDirectories.push(root);
    const borradores = path.join(root, 'borradores');
    await fs.mkdir(borradores);
    const settings = normalizeWorkflowSettings({ draftsDirectory: `${borradores}${path.sep}` });
    expect(settings.draftsDirectory).toBe(borradores);
    expect(() => normalizeWorkflowSettings({ draftsDirectory: 'relativa' }))
      .toThrow('La carpeta de borradores debe ser una ruta absoluta válida en el sistema del servidor.');
    expect(() => normalizeWorkflowSettings({ draftsDirectory: path.join(borradores, '{YYYY}') }))
      .toThrow('La carpeta de borradores no lleva {YYYY}: todos los borradores van en la misma carpeta.');
    expect(defaultWorkflowSettings({ draftsDirectory: '/var/lib/x' }).draftsDirectory).toBe('/var/lib/x');
    expect(defaultWorkflowSettings({}).draftsDirectory).toBe('');
    expect(normalizeWorkflowSettings({}).draftsDirectory).toBe('');
    const result = await checkWorkflowDirectories(settings, { year: 2026 });
    expect(result.directories.find((item) => item.key === 'draftsDirectory'))
      .toMatchObject({ label: 'Borradores', ok: true, path: borradores });
    // No cuenta para «Generar archivos» de toldos.
    expect(workflowReadiness(settings).missing).not.toContain('Borradores');
    // Sin ponerla, no se comprueba.
    const sinBorradores = await checkWorkflowDirectories(normalizeWorkflowSettings({}), { year: 2026 });
    expect(sinBorradores.directories.some((item) => item.key === 'draftsDirectory')).toBe(false);
  });
```

En `scripts/lib/deploy-remolques.test.mjs`, cambiar el import a:

```js
import { comprobarCarpetaBorradores, comprobarCarpetaInternaRemolques, comprobarCarpetasRemolques, comprobarChromium } from './deploy-remolques.mjs';
```

y añadir al final:

```js
describe('comprobarCarpetaBorradores', () => {
  const existe = async () => {};

  it('avisa, sin fallar, si no está definida', async () => {
    const r = await comprobarCarpetaBorradores({ carpeta: '', estricto: true, acceso: existe });
    expect(r.errores).toEqual([]);
    expect(r.avisos).toEqual(['DRAFTS_DIRECTORY no está definido; no se podrán guardar borradores en el servidor.']);
  });

  it('falla si lleva {YYYY}', async () => {
    const r = await comprobarCarpetaBorradores({ carpeta: '/var/lib/x/{YYYY}', estricto: false, acceso: existe });
    expect(r.errores).toEqual(['DRAFTS_DIRECTORY no lleva {YYYY}: todos los borradores van en la misma carpeta.']);
  });

  it('exige una ruta Linux absoluta con permiso de escritura', async () => {
    const visto = [];
    const ok = await comprobarCarpetaBorradores({ carpeta: '/var/lib/toldos-testar/borradores', estricto: true, acceso: async (ruta, modo) => { visto.push([ruta, modo]); } });
    expect(ok.exitos).toEqual(['DRAFTS_DIRECTORY apunta a una carpeta accesible con permiso de escritura.']);
    expect(visto).toEqual([['/var/lib/toldos-testar/borradores', fsConstants.R_OK | fsConstants.W_OK]]);
    const sinPermiso = await comprobarCarpetaBorradores({ carpeta: '/var/lib/x', estricto: true, acceso: async () => { throw new Error('EACCES'); } });
    expect(sinPermiso.errores[0]).toContain('sin permiso de escritura');
    const ventanas = await comprobarCarpetaBorradores({ carpeta: 'C:\\borradores', estricto: false, acceso: existe });
    expect(ventanas.avisos[0]).toContain('recomendada /var/lib/toldos-testar/borradores');
    const relativa = await comprobarCarpetaBorradores({ carpeta: 'borradores', estricto: true, acceso: existe });
    expect(relativa.errores[0]).toBe('DRAFTS_DIRECTORY no usa una ruta Linux absoluta.');
  });
});
```

(Las pruebas de `comprobarCarpetaInternaRemolques` que ya hay no cambian: siguen diciendo lo mismo.)

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `pnpm exec vitest run src/config.test.js src/workflow.test.js scripts/lib/deploy-remolques.test.mjs`
Expected: FAIL — `draftsDirectory` es `undefined` y `comprobarCarpetaBorradores is not a function`.

- [ ] **Step 3: Implementar la configuración**

En `src/config.js`, después de la línea `remolquesRevisionDirectory: process.env.REMOLQUES_REVISION_DIRECTORY || '',`:

```js
  // Borradores (diseño 01/10/2026): carpeta interna donde la web guarda los pedidos a medias de toldos
  // y remolques, un JSON por pedido. No es la compartida: va junto a la configuración.
  draftsDirectory: process.env.DRAFTS_DIRECTORY || '',
```

En `src/workflow.js`:
- en `defaultWorkflowSettings`, cambiar `remolquesRevisionDirectory: seed.remolquesRevisionDirectory || ''` por (con coma):

```js
    remolquesRevisionDirectory: seed.remolquesRevisionDirectory || '',
    draftsDirectory: seed.draftsDirectory || ''
```

- en `normalizeWorkflowSettings`, cambiar `remolquesRevisionDirectory: cleanPath(input?.remolquesRevisionDirectory ?? current.remolquesRevisionDirectory)` por (con coma):

```js
    remolquesRevisionDirectory: cleanPath(input?.remolquesRevisionDirectory ?? current.remolquesRevisionDirectory),
    draftsDirectory: cleanPath(input?.draftsDirectory ?? current.draftsDirectory)
```

  en la lista de rutas que se comprueban, cambiar `['carpeta interna de remolques', settings.remolquesRevisionDirectory]` por:

```js
    ['carpeta interna de remolques', settings.remolquesRevisionDirectory],
    ['carpeta de borradores', settings.draftsDirectory]
```

  y después del `if (settings.remolquesRevisionDirectory.includes('{YYYY}')) { … }`:

```js
  if (settings.draftsDirectory.includes('{YYYY}')) {
    throw new Error('La carpeta de borradores no lleva {YYYY}: todos los borradores van en la misma carpeta.');
  }
```

- en `checkWorkflowDirectories`, después del `if (settings.remolquesRevisionDirectory) { … }`:

```js
  // Borradores (diseño 01/10/2026): la web escribe en ella aunque no se genere nada.
  if (settings.draftsDirectory) {
    definitions.push(['draftsDirectory', 'Borradores', settings.draftsDirectory, 'write']);
  }
```

En `src/server.js`, en los `defaults` de `createWorkflowStore`, cambiar `remolquesRevisionDirectory: config.remolquesRevisionDirectory` por:

```js
    remolquesRevisionDirectory: config.remolquesRevisionDirectory,
    draftsDirectory: config.draftsDirectory
```

En `src/client/types.ts`, en `WorkflowSettings`, después de `remolquesRevisionDirectory: string;`:

```ts
  /** Borradores de toldos y remolques: carpeta interna del servidor, un JSON por pedido a medias. */
  draftsDirectory: string;
```

En `src/client/views/SettingsView.tsx`, en `formMatchesSaved`, cambiar la última línea `&& form.remolquesRevisionDirectory === settings.remolquesRevisionDirectory;` por:

```tsx
    && form.remolquesRevisionDirectory === settings.remolquesRevisionDirectory
    && form.draftsDirectory === settings.draftsDirectory;
```

y después del `RouteField` del paso `07` (el que acaba en `placeholder="/var/lib/toldos-testar/remolques-pedidos"\n        />`):

```tsx
        <RouteField
          step="08"
          title="Borradores"
          description="Carpeta interna del servidor, no la compartida: aquí guarda la web los pedidos a medias de toldos y remolques, un archivo por pedido, hasta que se guardan para revisión o se descartan. Ponla donde haya copia de seguridad."
          value={form.draftsDirectory}
          onChange={(draftsDirectory) => updateForm({ draftsDirectory })}
          placeholder="/var/lib/toldos-testar/borradores"
        />
```

- [ ] **Step 4: Implementar la comprobación de despliegue**

En `scripts/lib/deploy-remolques.mjs`, sustituir desde el comentario `// La carpeta interna de remolques (fase 5): …` hasta el final del fichero (la función `comprobarCarpetaInternaRemolques` entera) por:

```js
// Una carpeta interna del servidor (no la compartida): absoluta, Linux, sin {YYYY} y con permiso de
// escritura para el usuario de PM2. Si no está definida solo se avisa: la web funciona sin ella.
async function comprobarCarpetaInterna({ clave, carpeta, estricto, acceso, sinDefinir, sinAnio, recomendada }) {
  const errores = [];
  const avisos = [];
  const exitos = [];
  const informa = (mensaje) => (estricto ? errores : avisos).push(mensaje);
  if (!carpeta) {
    avisos.push(`${clave} no está definido; ${sinDefinir}.`);
  } else if (carpeta.includes('{YYYY}')) {
    errores.push(`${clave} no lleva {YYYY}: ${sinAnio}.`);
  } else if (/^[A-Za-z]:[\\/]/.test(carpeta) || carpeta.startsWith('\\\\') || carpeta.includes('\\')) {
    informa(`${clave} usa una ruta de Windows/UNC; sustitúyela por una ruta Linux (recomendada ${recomendada}).`);
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

// La carpeta interna de remolques (fase 5): los pedidos de remolques pendientes y generados, un JSON
// por pedido. La web escribe en ella al guardar para revisión, aunque la generación esté apagada.
export function comprobarCarpetaInternaRemolques({ carpeta, estricto, acceso = access }) {
  return comprobarCarpetaInterna({
    clave: 'REMOLQUES_REVISION_DIRECTORY',
    carpeta,
    estricto,
    acceso,
    sinDefinir: 'no se podrán guardar pedidos de remolques para revisión',
    sinAnio: 'todos los pedidos de remolques van en la misma carpeta',
    recomendada: '/var/lib/toldos-testar/remolques-pedidos'
  });
}

// La carpeta de borradores (diseño 01/10/2026): los pedidos a medias de toldos y remolques.
export function comprobarCarpetaBorradores({ carpeta, estricto, acceso = access }) {
  return comprobarCarpetaInterna({
    clave: 'DRAFTS_DIRECTORY',
    carpeta,
    estricto,
    acceso,
    sinDefinir: 'no se podrán guardar borradores en el servidor',
    sinAnio: 'todos los borradores van en la misma carpeta',
    recomendada: '/var/lib/toldos-testar/borradores'
  });
}
```

En `scripts/check-deployment.mjs`:
- el import: `import { comprobarCarpetaBorradores, comprobarCarpetaInternaRemolques, comprobarCarpetasRemolques, comprobarChromium } from './lib/deploy-remolques.mjs';`
- en `EFFECTIVE_ENV_KEYS`, después de `'REMOLQUES_REVISION_DIRECTORY',`: `'DRAFTS_DIRECTORY',`
- en `seedSettings`, cambiar `remolquesRevisionDirectory: unquote(values.get('REMOLQUES_REVISION_DIRECTORY'))` por (con coma) esa línea y `draftsDirectory: unquote(values.get('DRAFTS_DIRECTORY'))`
- en `effectiveSettings` (rama `persistedSettings`), después de la línea de `remolquesRevisionDirectory` (añadiéndole la coma): `draftsDirectory: stringOrFallback(persistedSettings.draftsDirectory, seedSettings.draftsDirectory)`
- después de `interna.exitos.forEach(pass);`:

```js
  const borradores = await comprobarCarpetaBorradores({
    carpeta: effectiveSettings.draftsDirectory,
    estricto: strictDeployment
  });
  borradores.errores.forEach(fail);
  borradores.avisos.forEach(warn);
  borradores.exitos.forEach(pass);
```

En `.env.example`, después de `REMOLQUES_REVISION_DIRECTORY=`:

```bash
# Borradores de toldos y remolques: carpeta interna del servidor (no la compartida), un JSON por
# pedido a medias. En desarrollo, dentro de tmp/ del repositorio.
DRAFTS_DIRECTORY=
```

En `.env.production.example`, después de `REMOLQUES_REVISION_DIRECTORY=/var/lib/toldos-testar/remolques-pedidos`:

```bash
# Borradores de toldos y remolques (carpeta interna, con copia de seguridad).
DRAFTS_DIRECTORY=/var/lib/toldos-testar/borradores
```

En `README.md`:
- en «### 1. Preparar rutas», después del punto de `/var/lib/toldos-testar/remolques-pedidos` (las dos líneas que acaban en `incluirla en la copia de seguridad)`):

```md
- `/var/lib/toldos-testar/borradores` para los borradores de toldos y remolques (carpeta interna:
  un JSON por pedido a medias; incluirla en la copia de seguridad)
```

- en el bloque de `.env` de «### 2. Configurar `.env`», después de `REMOLQUES_REVISION_DIRECTORY=/var/lib/toldos-testar/remolques-pedidos`:

```bash
# Borradores de toldos y remolques (carpeta interna, no la compartida).
DRAFTS_DIRECTORY=/var/lib/toldos-testar/borradores
```

- [ ] **Step 5: La aislada con su carpeta de borradores**

En `.claude/skills/running-toldos-testar/start-isolated.sh`, cambiar:

```bash
mkdir -p "$D"/{review,plan,rps,export,archive,rpsplan,rem-plan,rem-oficina,rem-revision}
```

por:

```bash
mkdir -p "$D"/{review,plan,rps,export,archive,rpsplan,rem-plan,rem-oficina,rem-revision,borradores}
```

y después de `export REMOLQUES_REVISION_DIRECTORY="$D/rem-revision"`:

```bash
export DRAFTS_DIRECTORY="$D/borradores"
```

En `.claude/skills/running-toldos-testar/SKILL.md`, después de la línea `- La carpeta interna de remolques (pedidos de remolques guardados) es \`$D/rem-revision\`.`:

```md
- La carpeta de borradores (toldos y remolques) es `$D/borradores`.
```

Ojo: si una aislada ya tiene `settings.json` guardado de antes, la semilla no entra (manda lo guardado). Para comprobarlo, usar una carpeta nueva (`ISOLATED_DIR="$PWD/tmp/borradores"`).

- [ ] **Step 6: Ejecutar las pruebas, el tipado y el lint**

Run: `pnpm exec vitest run src/config.test.js src/workflow.test.js scripts/lib/deploy-remolques.test.mjs && pnpm typecheck && pnpm lint`
Expected: PASS, `tsc` y `eslint` sin errores.

Run: `bash -n .claude/skills/running-toldos-testar/start-isolated.sh && echo sintaxis-ok`
Expected: `sintaxis-ok`.

- [ ] **Step 7: Mirar Configuración en la aislada**

Run (en segundo plano): `ISOLATED_DIR="$PWD/tmp/borradores" PORT=4311 FAKE_COORDINA_PORT=4321 bash .claude/skills/running-toldos-testar/start-isolated.sh`
Esperar a: `curl -fsS http://127.0.0.1:4311/api/health` → `"simulationMode":true` y `"fileWritesEnabled":false`.
Run: `curl -fsS http://127.0.0.1:4311/api/workflow/settings`
Expected: `"draftsDirectory":"…tmp…borradores…borradores"`.

Capturar con Playwright (`TOLDOS_ISOLATED_URL=http://127.0.0.1:4311`, ayudas de `.claude/skills/running-toldos-testar/drive.mjs`) la pestaña Configuración en claro y oscuro, 1280×720 y 1600×1000, en `tmp/ui-audit/borradores/configuracion-*.png`, y mirarlas: la tarjeta «08 · Borradores» se ve como las demás. Pulsar «Comprobar carpetas»: «Borradores» sale bien. Parar la instancia.

- [ ] **Step 8: Commit**

```bash
git add src/config.js src/config.test.js src/workflow.js src/workflow.test.js src/server.js src/client/types.ts src/client/views/SettingsView.tsx scripts/lib/deploy-remolques.mjs scripts/lib/deploy-remolques.test.mjs scripts/check-deployment.mjs .env.example .env.production.example README.md .claude/skills/running-toldos-testar/start-isolated.sh .claude/skills/running-toldos-testar/SKILL.md
git commit -m "feat(borradores): carpeta de borradores en Configuración

Los borradores viven en una carpeta interna del servidor, no en la
compartida. Nueva ruta en Configuración, paso 08 (semilla DRAFTS_DIRECTORY),
comprobada por «Comprobar carpetas» y por deploy:check (si falta, solo
avisa). La aislada la crea en su carpeta de prueba.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: El servidor: servicio, rutas y borrado al pasar a revisión

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio (el código está completo; hay que encajarlo en `server.js` y comprobarlo en la aislada).

**Files:**
- Create: `src/borradores/servicio.ts`
- Modify: `src/server.js` (imports, servicio, rutas `/api/borradores…`, `POST /api/reviews`, `POST /api/remolques/pedidos`)
- Test: `src/borradores/__tests__/servicio.test.ts`

**Interfaces:**
- Consumes: de la tarea 1, `AlmacenBorradores`, `crearAlmacenBorradores`, `codigoBorrador`, `crearBorrador`, `ErrorBorrador`, `leerContenido`, `resumenDeBorrador` y los mensajes `MENSAJE_*`, `SIN_CARPETA_BORRADORES`, `mensajeOtroTipo`; de la tarea 2, `settings.draftsDirectory`. Del servidor: `comprobadorPedidoToldos(workflowStore)` y `yaEsPedidoDeRemolques(almacen, orderCode)` (`src/remolques/flujo/servicio.ts`).
- Produces: `interface DependenciasBorradores { almacen; tecnicos: string[]; esPedidoDeToldos(orderCode): Promise<boolean>; esPedidoDeRemolques(orderCode): Promise<boolean>; ahora?: () => Date; registrar?: (mensaje: string) => void }`, `crearServicioBorradores(deps)` → `{ listar(): Promise<{ configurado: boolean; borradores: ResumenBorrador[] }>; obtener(orderCode): Promise<Borrador>; guardar(orderCode, cuerpo): Promise<Respuesta>; descartar(orderCode): Promise<Respuesta>; borrarTrasRevision(orderCode): Promise<void> }`. Rutas:
  - `GET /api/borradores` → `200 { configurado, borradores: ResumenBorrador[] }`
  - `GET /api/borradores/:orderCode` → `200 Borrador` | `404 { error: "No hay borrador de este pedido." }`
  - `PUT /api/borradores/:orderCode` con `{ kind, savedBy, contenido, confirmOverwrite? }` → `200 { ok: true, borrador: ResumenBorrador, sustituido: boolean }` | `409 { needsConfirmation: true, savedBy, error }` | `409 { error }` | `400 { error }`
  - `DELETE /api/borradores/:orderCode` → `200 { ok: true, existia: boolean }` | `409 { error }`
  - Tras `POST /api/reviews` y `POST /api/remolques/pedidos` con éxito, el borrador de ese número desaparece.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/borradores/__tests__/servicio.test.ts`:

```ts
import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { emptyLona } from "../../remolques/entradas-vacias.ts";
import { crearAlmacenBorradores, type AlmacenBorradores } from "../almacen.ts";
import {
  MENSAJE_NO_HAY, MENSAJE_OCUPADO, MENSAJE_OTRO_NUMERO, MENSAJE_SIN_AUTOR, MENSAJE_YA_EN_PEDIDOS, mensajeOtroTipo,
  SIN_CARPETA_BORRADORES,
} from "../reglas.ts";
import { crearServicioBorradores, type DependenciasBorradores } from "../servicio.ts";

// Nada fuera de tmp/ del repositorio en las pruebas.
const TMP = path.join(process.cwd(), "tmp");
const temporales: string[] = [];
afterEach(() => {
  for (const dir of temporales.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function carpetaNueva() {
  mkdirSync(TMP, { recursive: true });
  const dir = mkdtempSync(path.join(TMP, "borradores-servicio-"));
  temporales.push(dir);
  return dir;
}

function montar({ carpeta, ...deps }: Partial<DependenciasBorradores> & { carpeta?: string } = {}) {
  const dir = carpeta ?? carpetaNueva();
  let minuto = 0;
  return crearServicioBorradores({
    almacen: crearAlmacenBorradores({ carpeta: async () => dir, registrar: () => {} }),
    tecnicos: ["IVÁN", "JAIME"],
    esPedidoDeToldos: async () => false,
    esPedidoDeRemolques: async () => false,
    ahora: () => new Date(Date.UTC(2026, 9, 1, 9, minuto++)),
    ...deps,
  });
}

const cuerpoToldos = (numero: string, savedBy = "IVÁN", extra: Record<string, unknown> = {}) => ({
  kind: "toldos", savedBy, contenido: { order: { orderCode: numero, customer: "TOLDOS CAL", awnings: [{ model: "ARZUA PRO" }] } }, ...extra,
});
const lona = emptyLona();
const cuerpoRemolques = (numero: string, savedBy = "IVÁN") => ({
  kind: "remolques", savedBy,
  contenido: { numeroPedido: numero, cliente: "TALLERES CAL", fecha: "2026-10-01", lineas: [{ version: "10", tipo: "lona", input: { ...lona, cabecera: { ...lona.cabecera, numeroPedido: numero } } }] },
});

describe("servicio de borradores", () => {
  it("guarda y lista sin el contenido", async () => {
    const servicio = montar();
    const respuesta = await servicio.guardar("AR.26.04286", cuerpoToldos("AR.26.04286"));
    expect(respuesta.status).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ ok: true, sustituido: false, borrador: { orderCode: "AR2604286", kind: "toldos", savedBy: "IVÁN" } });
    expect(respuesta.cuerpo).not.toHaveProperty("borrador.contenido");
    const lista = await servicio.listar();
    expect(lista.configurado).toBe(true);
    expect(lista.borradores.map((b) => b.orderCode)).toEqual(["AR2604286"]);
    expect(lista.borradores[0]).not.toHaveProperty("contenido");
    expect((await servicio.obtener("ar2604286")).contenido).toMatchObject({ order: { orderCode: "AR.26.04286" } });
  });

  it("sin carpeta: no hay borradores y guardar dice que falta configurarla", async () => {
    const servicio = montar({ carpeta: "" });
    expect(await servicio.listar()).toEqual({ configurado: false, borradores: [] });
    await expect(servicio.guardar("AR2604286", cuerpoToldos("AR2604286"))).rejects.toMatchObject({ message: SIN_CARPETA_BORRADORES, statusCode: 400 });
  });

  it("pide «Soy» de la lista de técnicos y que el número sea el de la dirección", async () => {
    const servicio = montar();
    await expect(servicio.guardar("AR2604286", cuerpoToldos("AR2604286", ""))).rejects.toMatchObject({ message: MENSAJE_SIN_AUTOR, statusCode: 400 });
    await expect(servicio.guardar("AR2604286", cuerpoToldos("AR2604286", "PEPE"))).rejects.toMatchObject({ message: MENSAJE_SIN_AUTOR });
    await expect(servicio.guardar("AR2604286", cuerpoToldos("AR2604287"))).rejects.toMatchObject({ message: MENSAJE_OTRO_NUMERO, statusCode: 400 });
    await expect(servicio.guardar("AR2604286", cuerpoToldos(""))).rejects.toMatchObject({ statusCode: 400 });
  });

  it("el mismo autor lo sustituye sin preguntar; otro autor tiene que confirmarlo", async () => {
    const servicio = montar();
    await servicio.guardar("AR2604286", cuerpoToldos("AR2604286", "IVÁN"));
    const otraVez = await servicio.guardar("AR2604286", cuerpoToldos("AR2604286", "IVÁN"));
    expect(otraVez).toMatchObject({ status: 200, cuerpo: { sustituido: true } });
    const deJaime = await servicio.guardar("AR2604286", cuerpoToldos("AR2604286", "JAIME"));
    expect(deJaime).toEqual({ status: 409, cuerpo: { needsConfirmation: true, savedBy: "IVÁN", error: "Este borrador es de IVÁN." } });
    const confirmado = await servicio.guardar("AR2604286", cuerpoToldos("AR2604286", "JAIME", { confirmOverwrite: true }));
    expect(confirmado).toMatchObject({ status: 200, cuerpo: { sustituido: true, borrador: { savedBy: "JAIME", createdAt: "2026-10-01T09:00:00.000Z" } } });
  });

  it("un número que ya está en Pedidos, de toldos o de remolques, no admite borrador", async () => {
    const deToldos = montar({ esPedidoDeToldos: async (codigo) => codigo === "AR2604286" });
    await expect(deToldos.guardar("AR.26.04286", cuerpoRemolques("AR.26.04286"))).rejects.toMatchObject({ message: MENSAJE_YA_EN_PEDIDOS, statusCode: 409 });
    const deRemolques = montar({ esPedidoDeRemolques: async (codigo) => codigo === "AR2604286" });
    await expect(deRemolques.guardar("AR2604286", cuerpoToldos("AR2604286"))).rejects.toMatchObject({ message: MENSAJE_YA_EN_PEDIDOS, statusCode: 409 });
  });

  it("un número es de toldos o de remolques: no se cambia el tipo de un borrador", async () => {
    const servicio = montar();
    await servicio.guardar("AR.26.04286", cuerpoRemolques("AR.26.04286"));
    await expect(servicio.guardar("AR2604286", cuerpoToldos("AR2604286", "IVÁN", { confirmOverwrite: true })))
      .rejects.toMatchObject({ message: mensajeOtroTipo("AR2604286", "remolques"), statusCode: 409 });
  });

  it("dos guardados del mismo número no se cruzan", async () => {
    let soltar!: () => void;
    const espera = new Promise<void>((resolver) => { soltar = resolver; });
    const servicio = montar({ esPedidoDeToldos: async () => { await espera; return false; } });
    const primero = servicio.guardar("AR2604286", cuerpoToldos("AR2604286"));
    await new Promise((resolver) => setTimeout(resolver, 0));
    expect(await servicio.guardar("AR2604286", cuerpoToldos("AR2604286"))).toEqual({ status: 409, cuerpo: { error: MENSAJE_OCUPADO } });
    expect(await servicio.descartar("AR2604286")).toEqual({ status: 409, cuerpo: { error: MENSAJE_OCUPADO } });
    soltar();
    expect((await primero).status).toBe(200);
  });

  it("abrir uno que no está es 404; descartar dice si estaba", async () => {
    const servicio = montar();
    await expect(servicio.obtener("AR2604286")).rejects.toMatchObject({ message: MENSAJE_NO_HAY, statusCode: 404 });
    await servicio.guardar("AR2604286", cuerpoToldos("AR2604286"));
    expect(await servicio.descartar("AR.26.04286")).toEqual({ status: 200, cuerpo: { ok: true, existia: true } });
    expect(await servicio.descartar("AR2604286")).toEqual({ status: 200, cuerpo: { ok: true, existia: false } });
  });

  it("al pasar a revisión se borra; si falla, se apunta y no se rompe nada", async () => {
    const servicio = montar();
    await servicio.guardar("AR2604286", cuerpoToldos("AR2604286"));
    await servicio.borrarTrasRevision("AR.26.04286");
    expect((await servicio.listar()).borradores).toEqual([]);
    await expect(servicio.borrarTrasRevision("")).resolves.toBeUndefined();

    const apuntes: string[] = [];
    const roto: AlmacenBorradores = {
      configurada: async () => true, obtener: async () => null, guardar: async () => "", listar: async () => [],
      borrar: async () => { throw new Error("EACCES"); },
    };
    const conFallo = crearServicioBorradores({
      almacen: roto, tecnicos: ["IVÁN"], esPedidoDeToldos: async () => false, esPedidoDeRemolques: async () => false,
      registrar: (mensaje) => apuntes.push(mensaje),
    });
    await expect(conFallo.borrarTrasRevision("AR2604286")).resolves.toBeUndefined();
    expect(apuntes).toEqual(["El pedido AR2604286 se ha guardado para revisión, pero no se pudo borrar su borrador: EACCES"]);
  });
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `pnpm exec vitest run src/borradores/__tests__/servicio.test.ts`
Expected: FAIL — `Failed to load url ../servicio.ts`.

- [ ] **Step 3: Implementar el servicio**

Crear `src/borradores/servicio.ts`:

```ts
import type { AlmacenBorradores } from "./almacen.ts";
import {
  codigoBorrador, crearBorrador, ErrorBorrador, leerContenido, MENSAJE_NO_HAY, MENSAJE_OCUPADO, MENSAJE_OTRO_NUMERO,
  MENSAJE_SIN_AUTOR, MENSAJE_YA_EN_PEDIDOS, mensajeOtroTipo, resumenDeBorrador, SIN_CARPETA_BORRADORES,
} from "./reglas.ts";
import type { Borrador, ResumenBorrador } from "./tipos.ts";

// Los borradores en el servidor (diseño 01/10/2026). Las rutas de src/server.js solo pasan la
// petición y devuelven la respuesta. Los errores llevan su código (statusCode): 400 dato mal,
// 404 no está, 409 conflicto; 503 si no se puede mirar si el número ya es un pedido de toldos.

export interface DependenciasBorradores {
  almacen: AlmacenBorradores;
  /** La lista de técnicos de «Soy». */
  tecnicos: string[];
  /** true si ese número ya está guardado como pedido de toldos (para revisión o generado). */
  esPedidoDeToldos: (orderCode: string) => Promise<boolean>;
  /** true si ese número ya está guardado como pedido de remolques. */
  esPedidoDeRemolques: (orderCode: string) => Promise<boolean>;
  ahora?: () => Date;
  registrar?: (mensaje: string) => void;
}

export interface Respuesta {
  status: number;
  cuerpo: unknown;
}

export function crearServicioBorradores(deps: DependenciasBorradores) {
  const reloj = deps.ahora ?? (() => new Date());
  const registrar = deps.registrar ?? ((mensaje: string) => console.error(mensaje));
  // Un bloqueo por número: dos guardados (o un guardado y un «Descartar») del mismo borrador no se
  // cruzan; el segundo recibe un 409 y se repite.
  const ocupados = new Set<string>();

  async function listar(): Promise<{ configurado: boolean; borradores: ResumenBorrador[] }> {
    if (!(await deps.almacen.configurada())) return { configurado: false, borradores: [] };
    return { configurado: true, borradores: (await deps.almacen.listar()).map(resumenDeBorrador) };
  }

  async function obtener(orderCodeBruto: string): Promise<Borrador> {
    const borrador = await deps.almacen.obtener(codigoBorrador(orderCodeBruto));
    if (!borrador) throw new ErrorBorrador(MENSAJE_NO_HAY, 404);
    return borrador;
  }

  async function guardar(orderCodeBruto: string, cuerpo: unknown): Promise<Respuesta> {
    const orderCode = codigoBorrador(orderCodeBruto);
    if (!(await deps.almacen.configurada())) throw new ErrorBorrador(SIN_CARPETA_BORRADORES);
    const c = (cuerpo ?? {}) as { kind?: unknown; savedBy?: unknown; contenido?: unknown; confirmOverwrite?: unknown };
    const savedBy = typeof c.savedBy === "string" ? c.savedBy.trim() : "";
    if (!savedBy || !deps.tecnicos.includes(savedBy)) throw new ErrorBorrador(MENSAJE_SIN_AUTOR);
    const leido = leerContenido(c.kind, c.contenido);
    if (codigoBorrador(leido.numeroPedido) !== orderCode) throw new ErrorBorrador(MENSAJE_OTRO_NUMERO);
    if (ocupados.has(orderCode)) return { status: 409, cuerpo: { error: MENSAJE_OCUPADO } };
    ocupados.add(orderCode);
    try {
      // Un pedido ya guardado se corrige desde Pedidos, no con un borrador.
      if ((await deps.esPedidoDeToldos(orderCode)) || (await deps.esPedidoDeRemolques(orderCode))) {
        throw new ErrorBorrador(MENSAJE_YA_EN_PEDIDOS, 409);
      }
      const existente = await deps.almacen.obtener(orderCode);
      if (existente && existente.kind !== leido.kind) throw new ErrorBorrador(mensajeOtroTipo(orderCode, existente.kind), 409);
      if (existente && existente.savedBy !== savedBy && c.confirmOverwrite !== true) {
        return { status: 409, cuerpo: { needsConfirmation: true, savedBy: existente.savedBy, error: `Este borrador es de ${existente.savedBy}.` } };
      }
      const borrador = crearBorrador({ leido, savedBy, existente, ahora: reloj().toISOString() });
      await deps.almacen.guardar(borrador);
      return { status: 200, cuerpo: { ok: true, borrador: resumenDeBorrador(borrador), sustituido: Boolean(existente) } };
    } finally {
      ocupados.delete(orderCode);
    }
  }

  /** «Descartar borrador»: cualquiera puede (la web pregunta antes). Si ya no estaba, no es un error. */
  async function descartar(orderCodeBruto: string): Promise<Respuesta> {
    const orderCode = codigoBorrador(orderCodeBruto);
    if (ocupados.has(orderCode)) return { status: 409, cuerpo: { error: MENSAJE_OCUPADO } };
    ocupados.add(orderCode);
    try {
      return { status: 200, cuerpo: { ok: true, existia: await deps.almacen.borrar(orderCode) } };
    } finally {
      ocupados.delete(orderCode);
    }
  }

  /**
   * Tras guardar un pedido para revisión, su borrador sobra. Nunca falla: el pedido ya está guardado,
   * y si no se puede borrar se apunta para informática.
   */
  async function borrarTrasRevision(orderCodeBruto: string): Promise<void> {
    let orderCode: string;
    try {
      orderCode = codigoBorrador(orderCodeBruto);
    } catch {
      return;
    }
    try {
      await deps.almacen.borrar(orderCode);
    } catch (error) {
      registrar(`El pedido ${orderCode} se ha guardado para revisión, pero no se pudo borrar su borrador: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { listar, obtener, guardar, descartar, borrarTrasRevision };
}
```

- [ ] **Step 4: Ejecutar las pruebas**

Run: `pnpm exec vitest run src/borradores`
Expected: PASS.

- [ ] **Step 5: Las rutas y el borrado al pasar a revisión**

En `src/server.js`:
- después de la línea `} from './remolques/flujo/servicio.ts';`:

```js
import { crearAlmacenBorradores } from './borradores/almacen.ts';
import { crearServicioBorradores } from './borradores/servicio.ts';
```

- después del bloque `const pedidosRemolques = crearServicioPedidosRemolques({ … });`:

```js
// Borradores en el servidor (diseño 01/10/2026): un JSON por número de pedido en la carpeta de
// Configuración (paso 08), de toldos o de remolques. No son pedidos: no cuentan ni van a CoordinaOT.
const borradores = crearServicioBorradores({
  almacen: crearAlmacenBorradores({ carpeta: async () => (await workflowStore.getSettings()).draftsDirectory }),
  tecnicos: formOptions.tecnicos,
  esPedidoDeToldos: comprobadorPedidoToldos(workflowStore),
  esPedidoDeRemolques: (orderCode) => yaEsPedidoDeRemolques(almacenPedidosRemolques, orderCode)
});
```

- sustituir la ruta `app.post('/api/remolques/pedidos', …)` por:

```js
app.post('/api/remolques/pedidos', rutaRemolques(async (req, res) => {
  const { status, cuerpo } = await pedidosRemolques.guardar(req.body);
  // Guardado para revisión: su borrador sobra (diseño 01/10/2026). Nunca falla.
  if (status === 200) await borradores.borrarTrasRevision(cuerpo.review.orderCode);
  res.status(status).json(cuerpo);
}));
```

- después de la ruta `app.get('/api/remolques/pedidos/:orderCode/archivo', …)` (antes del comentario `// Estado de las OF en CoordinaOT para la web …`):

```js
// Borradores (diseño 01/10/2026). Un error del borrador llega con su código; uno inesperado es 500.
function rutaBorradores(manejar) {
  return async (req, res, next) => {
    try {
      await manejar(req, res);
    } catch (error) {
      if (error?.statusCode) return next(error);
      console.error('Fallo inesperado en los borradores:', error);
      return next(httpError(500, 'No se pudo completar la operación por un fallo del servidor. Avisa a informática.'));
    }
  };
}

app.get('/api/borradores', rutaBorradores(async (_req, res) => {
  res.set('Cache-Control', 'no-store').json(await borradores.listar());
}));

app.get('/api/borradores/:orderCode', rutaBorradores(async (req, res) => {
  res.set('Cache-Control', 'no-store').json(await borradores.obtener(req.params.orderCode));
}));

app.put('/api/borradores/:orderCode', rutaBorradores(async (req, res) => {
  const { status, cuerpo } = await borradores.guardar(req.params.orderCode, req.body);
  res.status(status).json(cuerpo);
}));

app.delete('/api/borradores/:orderCode', rutaBorradores(async (req, res) => {
  const { status, cuerpo } = await borradores.descartar(req.params.orderCode);
  res.status(status).json(cuerpo);
}));
```

- en `app.post('/api/reviews', …)`, después de `const savedPath = await workflowStore.saveReview(review, pdf);`:

```js
    // Pasado a revisión, su borrador sobra (diseño 01/10/2026). Si no se puede borrar, se apunta
    // y el pedido queda guardado igual.
    await borradores.borrarTrasRevision(orderCode);
```

- [ ] **Step 6: Comprobarlo en la aislada**

Run (en segundo plano): `ISOLATED_DIR="$PWD/tmp/borradores" PORT=4311 FAKE_COORDINA_PORT=4321 bash .claude/skills/running-toldos-testar/start-isolated.sh`
Esperar a `curl -fsS http://127.0.0.1:4311/api/health` (`"simulationMode":true`, `"fileWritesEnabled":false`).

Run:
```bash
B=http://127.0.0.1:4311
curl -s -X PUT -H 'Content-Type: application/json' -d '{"kind":"toldos","savedBy":"JAIME","contenido":{"order":{"orderCode":"AR.26.99001","customer":"PRUEBA","awnings":[]}}}' $B/api/borradores/AR.26.99001; echo
curl -s $B/api/borradores; echo
curl -s -X PUT -H 'Content-Type: application/json' -d '{"kind":"toldos","savedBy":"","contenido":{"order":{"orderCode":"AR2699001","awnings":[]}}}' $B/api/borradores/AR2699001; echo
curl -s -X DELETE $B/api/borradores/AR2699001; echo
curl -s -o /dev/null -w '%{http_code}\n' $B/api/borradores/AR2699001
```
Expected, en orden: `{"ok":true,"borrador":{"schemaVersion":1,"orderCode":"AR2699001",…,"kind":"toldos"},"sustituido":false}`; `{"configurado":true,"borradores":[{…"orderCode":"AR2699001"…}]}`; `{"error":"Elige quién eres en «Soy» antes de guardar el borrador."}`; `{"ok":true,"existia":true}`; `404`.

Y el borrado al pasar a revisión (remolques):
```bash
node --input-type=module -e "
const B='http://127.0.0.1:4311';
const c=JSON.parse((await import('node:fs')).readFileSync('src/remolques/__fixtures__/produccion-2026-09.json','utf8')).find((x)=>x.caso==='lona-02');
const el={version:'10',tipo:c.tipo,input:{...c.input,cabecera:{...c.input.cabecera,numeroPedido:'AR.26.99002',version:'10',cliente:'PRUEBA',fecha:'2026-10-01',ordenFabricacion:'0299002'}}};
const json=(method,d)=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});
console.log('borrador', (await fetch(B+'/api/borradores/AR2699002',json('PUT',{kind:'remolques',savedBy:'JAIME',contenido:{numeroPedido:'AR.26.99002',cliente:'PRUEBA',fecha:'2026-10-01',lineas:[el]}}))).status);
console.log('revision', (await fetch(B+'/api/remolques/pedidos',json('POST',{elementos:[el],savedBy:'JAIME'}))).status);
console.log('despues', (await fetch(B+'/api/borradores/AR2699002')).status);
const ya=await fetch(B+'/api/borradores/AR2699002',json('PUT',{kind:'remolques',savedBy:'JAIME',contenido:{numeroPedido:'AR.26.99002',cliente:'',fecha:'',lineas:[]}}));
console.log('otra-vez', ya.status, (await ya.json()).error);
"
rm -f tmp/borradores/rem-revision/AR2699002.json
```
Expected: `borrador 200`, `revision 200`, `despues 404`, `otra-vez 409 Este pedido ya está en Pedidos: ábrelo y usa «Corregir».`

(El borrado tras `POST /api/reviews` de toldos lo comprueba la e2e de la tarea 7.) Parar la instancia.

- [ ] **Step 7: Batería**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: todo PASS.

- [ ] **Step 8: Commit**

```bash
git add src/borradores/servicio.ts src/borradores/__tests__/servicio.test.ts src/server.js
git commit -m "feat(borradores): rutas de borradores y borrado al pasar a revisión

GET/PUT/DELETE /api/borradores: guardar pide «Soy», no deja un número que
ya está en Pedidos ni cambiar un borrador de toldos a remolques, pregunta
antes de sustituir el de otra persona y tiene un bloqueo por número.
Guardar para revisión (toldos y remolques) borra el borrador de ese número;
si falla, el pedido queda guardado igual y se apunta.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: La web: módulo común de borradores y Remolques

Modelo recomendado: el más capaz (Opus). Esfuerzo: alto (el hook de remolques tiene el borrador del navegador, la cola de escritura y consultas a RPS en vuelo que no deben pisar lo que se carga).

**Files:**
- Create: `src/client/borradores.ts`
- Modify: `src/client/remolques/guardarPedido.ts`, `src/client/remolques/useRemolques.ts`, `src/client/remolques/RemolquesView.tsx`, `src/client/App.tsx`
- Test: `src/client/borradores.test.ts`, `src/client/remolques/guardarPedido.test.ts`

**Interfaces:**
- Consumes: de la tarea 1, los tipos `Borrador`, `BorradorRemolques`, `BorradorToldos`, `ContenidoRemolques`, `ContenidoToldos`, `ResumenBorrador`; de la tarea 3, las rutas `/api/borradores…`. De la web: `AskForConfirmation`, `ConfirmOptions` (`components/NotificationCenter`), `controlLabel` (`components/controlLabels`), `normalizarNumeroPedido`, `DraftState`.
- Produces (`src/client/borradores.ts`): `type Pedir = (url: string, init?: RequestInit) => Promise<Response>`; `type CuerpoBorrador = { kind: 'toldos'; savedBy: string; contenido: ContenidoToldos } | { kind: 'remolques'; savedBy: string; contenido: ContenidoRemolques }`; `listarBorradores(pedir?): Promise<{ configurado: boolean; borradores: ResumenBorrador[] }>`; `leerBorrador(numero: string, pedir?): Promise<Borrador | null>`; `descartarBorrador(numero: string, pedir?): Promise<void>`; `guardarBorradorPreguntando({ numero, cuerpo, confirmar, pedir? }): Promise<{ ok: true; borrador: ResumenBorrador } | { ok: false; mensaje: string | null }>`; `preguntaAlObtener(borrador: Borrador, producto: 'toldos' | 'remolques'): ConfirmOptions`; `buscarBorradorAlObtener(numero, producto, confirmar, pedir?): Promise<{ accion: 'abrir'; borrador: Borrador } | { accion: 'seguir' } | { accion: 'cancelar' }>`; `contenidoBorradorToldos(formulario: DraftState): ContenidoToldos`.
- Produces (remolques): `contenidoBorradorRemolques(estado: { numeroPedido; cliente; fecha; lineas }, paramsGuardados: CalcParams | null): ContenidoRemolques` (`guardarPedido.ts`); en `useRemolques`, los parámetros nuevos `onAbrirBorradorToldos?: (borrador: BorradorToldos) => void` y lo que devuelve de más: `guardandoBorrador: boolean`, `guardarBorrador(): Promise<void>`, `cargarBorrador(borrador: BorradorRemolques, opciones?: { preguntar?: boolean }): Promise<void>`, `obtenerDatosPulsado(): Promise<void>`; en `RemolquesView`, las props `borradorSolicitado?: { id: number; borrador: BorradorRemolques; preguntar: boolean } | null` y `onAbrirBorradorToldos?: (borrador: BorradorToldos) => void`.
- Produces (App): `abrirBorrador(borrador: Borrador, opciones?: { preguntar?: boolean }): Promise<void>` (Toldos lo carga en el formulario; Remolques lo manda a su pantalla), que usan las tareas 5 y 6.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/client/borradores.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import type { Borrador } from '../borradores/tipos.ts';
import type { ConfirmOptions, DialogResult } from './components/NotificationCenter';
import {
  buscarBorradorAlObtener, contenidoBorradorToldos, descartarBorrador, guardarBorradorPreguntando, leerBorrador, listarBorradores,
  preguntaAlObtener, type Pedir,
} from './borradores';
import { defaultDraft } from './hooks/useDraft';

const respuesta = (status: number, cuerpo: unknown) =>
  new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } });
const borrador: Borrador = {
  schemaVersion: 1, kind: 'toldos', orderCode: 'AR2604286', numeroPedido: 'AR.26.04286', savedBy: 'JAIME',
  createdAt: '2026-10-01T08:00:00.000Z', updatedAt: '2026-10-01T09:30:00.000Z',
  summary: { customer: 'TOLDOS CAL', orderDate: '2026-10-01', elementos: 1, models: ['ARZUA PRO'] },
  contenido: { order: { orderCode: 'AR.26.04286', awnings: [] } },
};
const resumen = { ...borrador } as Partial<Borrador>;
delete resumen.contenido;
const cuerpo = { kind: 'toldos' as const, savedBy: 'IVÁN', contenido: { order: { orderCode: 'AR.26.04286', awnings: [] } } };

describe('listar, leer y descartar', () => {
  it('la lista trae si hay carpeta y los resúmenes; un fallo da su mensaje', async () => {
    const pedir = vi.fn<Pedir>(async () => respuesta(200, { configurado: true, borradores: [resumen] }));
    expect(await listarBorradores(pedir)).toEqual({ configurado: true, borradores: [resumen] });
    expect(pedir).toHaveBeenCalledWith('/api/borradores', { cache: 'no-store' });
    await expect(listarBorradores(async () => respuesta(500, { error: 'Carpeta caída' }))).rejects.toThrow('Carpeta caída');
  });

  it('leer: 404 es que no hay; el número va tal cual en la dirección', async () => {
    const pedir = vi.fn<Pedir>(async () => respuesta(404, { error: 'No hay borrador de este pedido.' }));
    expect(await leerBorrador('AR.26.04286', pedir)).toBeNull();
    expect(pedir).toHaveBeenCalledWith('/api/borradores/AR.26.04286', { cache: 'no-store' });
    expect(await leerBorrador('AR.26.04286', async () => respuesta(200, borrador))).toEqual(borrador);
    await expect(leerBorrador('AR.26.04286', async () => respuesta(503, { error: 'No se puede comprobar' }))).rejects.toThrow('No se puede comprobar');
  });

  it('descartar usa DELETE y da el error del servidor', async () => {
    const pedir = vi.fn<Pedir>(async () => respuesta(200, { ok: true, existia: true }));
    await descartarBorrador('AR2604286', pedir);
    expect(pedir).toHaveBeenCalledWith('/api/borradores/AR2604286', { method: 'DELETE' });
    await expect(descartarBorrador('AR2604286', async () => respuesta(409, { error: 'Ocupado' }))).rejects.toThrow('Ocupado');
  });
});

describe('guardarBorradorPreguntando', () => {
  it('guarda con PUT y devuelve el resumen', async () => {
    const pedir = vi.fn<Pedir>(async () => respuesta(200, { ok: true, borrador: resumen, sustituido: false }));
    const confirmar = vi.fn();
    expect(await guardarBorradorPreguntando({ numero: 'AR.26.04286', cuerpo, confirmar, pedir })).toEqual({ ok: true, borrador: resumen });
    expect(confirmar).not.toHaveBeenCalled();
    const [url, init] = pedir.mock.calls[0];
    expect(url).toBe('/api/borradores/AR.26.04286');
    expect(init?.method).toBe('PUT');
    expect(JSON.parse(String(init?.body))).toEqual({ ...cuerpo, confirmOverwrite: false });
  });

  it('si es de otra persona pregunta, y solo sustituye si se confirma', async () => {
    const pedir = vi.fn<Pedir>()
      .mockResolvedValueOnce(respuesta(409, { needsConfirmation: true, savedBy: 'JAIME', error: 'Este borrador es de JAIME.' }))
      .mockResolvedValueOnce(respuesta(200, { ok: true, borrador: resumen, sustituido: true }));
    let pregunta: ConfirmOptions | null = null;
    const confirmar = vi.fn(async (opciones: ConfirmOptions): Promise<DialogResult> => { pregunta = opciones; return 'confirm'; });
    expect(await guardarBorradorPreguntando({ numero: 'AR.26.04286', cuerpo, confirmar, pedir })).toEqual({ ok: true, borrador: resumen });
    expect(pregunta).toMatchObject({ message: expect.stringContaining('Este borrador es de Jaime, ¿lo sustituyes?'), confirmLabel: 'Sustituir borrador' });
    expect(JSON.parse(String(pedir.mock.calls[1][1]?.body)).confirmOverwrite).toBe(true);

    const noSustituir = vi.fn<Pedir>(async () => respuesta(409, { needsConfirmation: true, savedBy: 'JAIME' }));
    expect(await guardarBorradorPreguntando({ numero: 'AR2604286', cuerpo, confirmar: async () => 'cancel', pedir: noSustituir }))
      .toEqual({ ok: false, mensaje: null });
    expect(noSustituir).toHaveBeenCalledTimes(1);
  });

  it('los demás errores dan el texto del servidor, y sin red un texto propio', async () => {
    const yaEnPedidos = async () => respuesta(409, { error: 'Este pedido ya está en Pedidos: ábrelo y usa «Corregir».' });
    expect(await guardarBorradorPreguntando({ numero: 'AR2604286', cuerpo, confirmar: vi.fn(), pedir: yaEnPedidos }))
      .toEqual({ ok: false, mensaje: 'Este pedido ya está en Pedidos: ábrelo y usa «Corregir».' });
    const sinRed = async () => { throw new TypeError('Failed to fetch'); };
    expect(await guardarBorradorPreguntando({ numero: 'AR2604286', cuerpo, confirmar: vi.fn(), pedir: sinRed }))
      .toEqual({ ok: false, mensaje: 'No se pudo guardar el borrador.' });
  });
});

describe('«Obtener datos del pedido» con borrador', () => {
  it('la pregunta dice de quién y de cuándo, y si se abre en la otra pantalla', () => {
    const misma = preguntaAlObtener(borrador, 'toldos');
    expect(misma).toMatchObject({ confirmLabel: 'Abrir borrador', alternativeLabel: 'Empezar de cero', cancelLabel: 'Cancelar' });
    expect(misma.message).toContain('AR2604286 tiene un borrador de Jaime del 01/10. ¿Lo abres?');
    expect(misma.message).not.toContain('se abrirá en');
    expect(preguntaAlObtener(borrador, 'remolques').message).toContain('Es de toldos: se abrirá en Toldos.');
  });

  it('sin número, sin borrador o si falla la lectura, sigue con RPS sin preguntar', async () => {
    const confirmar = vi.fn();
    const pedir = vi.fn<Pedir>(async () => respuesta(404, {}));
    expect(await buscarBorradorAlObtener(' . ', 'toldos', confirmar, pedir)).toEqual({ accion: 'seguir' });
    expect(pedir).not.toHaveBeenCalled();
    expect(await buscarBorradorAlObtener('AR2604286', 'toldos', confirmar, pedir)).toEqual({ accion: 'seguir' });
    expect(await buscarBorradorAlObtener('AR2604286', 'toldos', confirmar, async () => { throw new Error('caído'); })).toEqual({ accion: 'seguir' });
    expect(confirmar).not.toHaveBeenCalled();
  });

  it('con borrador: «Abrir borrador», «Empezar de cero» o nada', async () => {
    const pedir = async () => respuesta(200, borrador);
    expect(await buscarBorradorAlObtener('AR2604286', 'toldos', async () => 'confirm', pedir)).toEqual({ accion: 'abrir', borrador });
    expect(await buscarBorradorAlObtener('AR2604286', 'toldos', async () => 'alternative', pedir)).toEqual({ accion: 'seguir' });
    expect(await buscarBorradorAlObtener('AR2604286', 'toldos', async () => 'cancel', pedir)).toEqual({ accion: 'cancelar' });
    expect(await buscarBorradorAlObtener('AR2604286', 'toldos', async () => 'dismiss', pedir)).toEqual({ accion: 'cancelar' });
  });
});

describe('contenidoBorradorToldos', () => {
  it('lleva solo los campos del formulario, sin funciones ni parámetros', () => {
    const formulario = { ...defaultDraft(), orderCode: 'AR.26.04286', customer: 'TOLDOS CAL', setOrderCode: () => undefined, parameters: { x: 1 } };
    const { order } = contenidoBorradorToldos(formulario);
    expect(order).toEqual({ ...defaultDraft(), orderCode: 'AR.26.04286', customer: 'TOLDOS CAL', orderDate: formulario.orderDate });
    expect(order).not.toHaveProperty('setOrderCode');
    expect(order).not.toHaveProperty('parameters');
  });
});
```

En `src/client/remolques/guardarPedido.test.ts`, cambiar el import de `./guardarPedido` a:

```ts
import { contenidoBorradorRemolques, cuerpoGuardar, lineasDesdePedidoGuardado } from './guardarPedido';
```

y añadir al final:

```ts
describe('contenidoBorradorRemolques', () => {
  it('la cabecera y las líneas tal cual; los parámetros solo si se estaba corrigiendo', () => {
    const estado = { numeroPedido: ' AR.26.04286 ', cliente: 'TALLERES CAL', fecha: '2026-10-01', lineas: [linea] };
    expect(contenidoBorradorRemolques(estado, null)).toEqual({ numeroPedido: 'AR.26.04286', cliente: 'TALLERES CAL', fecha: '2026-10-01', lineas: [linea] });
    expect(contenidoBorradorRemolques(estado, DEFAULT_PARAMS)).toEqual({
      numeroPedido: 'AR.26.04286', cliente: 'TALLERES CAL', fecha: '2026-10-01', lineas: [linea], paramsGuardados: DEFAULT_PARAMS,
    });
  });
});
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `pnpm exec vitest run src/client/borradores.test.ts src/client/remolques/guardarPedido.test.ts`
Expected: FAIL — `Failed to load url ./borradores` y `contenidoBorradorRemolques is not a function`.

- [ ] **Step 3: Implementar el módulo común**

Crear `src/client/borradores.ts`:

```ts
import type {
  Borrador, ContenidoRemolques, ContenidoToldos, ResumenBorrador,
} from '../borradores/tipos.ts';
import { normalizarNumeroPedido } from '../remolques/pedidos/numero-pedido.ts';
import type { AskForConfirmation, ConfirmOptions } from './components/NotificationCenter';
import { controlLabel } from './components/controlLabels';
import type { DraftState } from './types';

// Borradores en el servidor (diseño 01/10/2026): las llamadas a /api/borradores y las preguntas, las
// mismas en Toldos y en Remolques. `pedir` es `fetch` salvo en las pruebas.

export type Pedir = (url: string, init?: RequestInit) => Promise<Response>;
const porDefecto: Pedir = (url, init) => fetch(url, init);
const direccion = (numero: string) => `/api/borradores/${encodeURIComponent(numero.trim())}`;

export type CuerpoBorrador =
  | { kind: 'toldos'; savedBy: string; contenido: ContenidoToldos }
  | { kind: 'remolques'; savedBy: string; contenido: ContenidoRemolques };

async function datosDe(respuesta: Response) {
  return await respuesta.json().catch(() => ({})) as Record<string, unknown>;
}
const errorDe = (datos: Record<string, unknown>, porDefectoTexto: string) =>
  (typeof datos.error === 'string' && datos.error) || porDefectoTexto;

/** Pedidos › «Borradores». Sin carpeta configurada, `configurado: false` y ninguno. */
export async function listarBorradores(pedir: Pedir = porDefecto): Promise<{ configurado: boolean; borradores: ResumenBorrador[] }> {
  const respuesta = await pedir('/api/borradores', { cache: 'no-store' });
  const datos = await datosDe(respuesta);
  if (!respuesta.ok) throw new Error(errorDe(datos, 'No se pudieron cargar los borradores.'));
  return { configurado: datos.configurado !== false, borradores: (datos.borradores as ResumenBorrador[] | undefined) ?? [] };
}

/** El borrador de ese número, o null si no hay. */
export async function leerBorrador(numero: string, pedir: Pedir = porDefecto): Promise<Borrador | null> {
  const respuesta = await pedir(direccion(numero), { cache: 'no-store' });
  if (respuesta.status === 404) return null;
  const datos = await datosDe(respuesta);
  if (!respuesta.ok) throw new Error(errorDe(datos, 'No se pudo leer el borrador.'));
  return datos as unknown as Borrador;
}

export async function descartarBorrador(numero: string, pedir: Pedir = porDefecto): Promise<void> {
  const respuesta = await pedir(direccion(numero), { method: 'DELETE' });
  if (!respuesta.ok) throw new Error(errorDe(await datosDe(respuesta), 'No se pudo descartar el borrador.'));
}

/**
 * «Guardar borrador»: si el borrador de ese número es de otra persona, pregunta antes de sustituirlo
 * («Este borrador es de Jaime, ¿lo sustituyes?»). `mensaje: null` es que se ha dicho que no.
 */
export async function guardarBorradorPreguntando({ numero, cuerpo, confirmar, pedir = porDefecto }: {
  numero: string;
  cuerpo: CuerpoBorrador;
  confirmar: AskForConfirmation;
  pedir?: Pedir;
}): Promise<{ ok: true; borrador: ResumenBorrador } | { ok: false; mensaje: string | null }> {
  let confirmOverwrite = false;
  for (;;) {
    let respuesta: Response;
    try {
      respuesta = await pedir(direccion(numero), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cuerpo, confirmOverwrite }),
      });
    } catch {
      return { ok: false, mensaje: 'No se pudo guardar el borrador.' };
    }
    const datos = await datosDe(respuesta);
    if (respuesta.ok) return { ok: true, borrador: datos.borrador as ResumenBorrador };
    if (respuesta.status === 409 && datos.needsConfirmation === true && !confirmOverwrite) {
      const deQuien = controlLabel(String(datos.savedBy ?? '')) || 'otra persona';
      const eleccion = await confirmar({
        title: `Sustituir el borrador de ${numero.trim()}`,
        message: `Este borrador es de ${deQuien}, ¿lo sustituyes? Lo que guardó se perderá.`,
        confirmLabel: 'Sustituir borrador',
        cancelLabel: 'Conservar el suyo',
        tone: 'warning',
      });
      if (eleccion !== 'confirm') return { ok: false, mensaje: null };
      confirmOverwrite = true;
      continue;
    }
    return { ok: false, mensaje: errorDe(datos, 'No se pudo guardar el borrador.') };
  }
}

const diaYMes = (valor: string) => {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? '' : fecha.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
};

/** «AR… tiene un borrador de Jaime del 01/10. ¿Lo abres?» */
export function preguntaAlObtener(borrador: Borrador, producto: 'toldos' | 'remolques'): ConfirmOptions {
  const dia = diaYMes(borrador.updatedAt);
  const otraPantalla = borrador.kind === producto ? ''
    : borrador.kind === 'remolques' ? ' Es de remolques: se abrirá en Remolques.' : ' Es de toldos: se abrirá en Toldos.';
  return {
    title: `${borrador.orderCode} tiene un borrador`,
    message: `${borrador.orderCode} tiene un borrador de ${controlLabel(borrador.savedBy)}${dia ? ` del ${dia}` : ''}. ¿Lo abres?${otraPantalla} «Empezar de cero» obtiene los datos de RPS y el borrador sigue en Pedidos.`,
    confirmLabel: 'Abrir borrador',
    alternativeLabel: 'Empezar de cero',
    cancelLabel: 'Cancelar',
    tone: 'warning',
  };
}

/**
 * Antes de «Obtener datos del pedido»: si ese número tiene borrador, pregunta. Si no lo tiene o no se
 * puede leer, se sigue con RPS como siempre (un fallo aquí no impide obtener el pedido).
 */
export async function buscarBorradorAlObtener(
  numero: string, producto: 'toldos' | 'remolques', confirmar: AskForConfirmation, pedir: Pedir = porDefecto,
): Promise<{ accion: 'abrir'; borrador: Borrador } | { accion: 'seguir' } | { accion: 'cancelar' }> {
  if (!normalizarNumeroPedido(numero)) return { accion: 'seguir' };
  let borrador: Borrador | null;
  try {
    borrador = await leerBorrador(numero, pedir);
  } catch {
    return { accion: 'seguir' };
  }
  if (!borrador) return { accion: 'seguir' };
  const eleccion = await confirmar(preguntaAlObtener(borrador, producto));
  if (eleccion === 'confirm') return { accion: 'abrir', borrador };
  return eleccion === 'alternative' ? { accion: 'seguir' } : { accion: 'cancelar' };
}

const CAMPOS_FORMULARIO = [
  'orderCode', 'customer', 'orderDate', 'technician', 'reviewer', 'fabric', 'sameFabric', 'remate', 'remateColor',
  'structureColor', 'rotTela', 'rotBamba', 'notes', 'awnings', 'fabricProposals', 'confirmedFabricProposals',
] as const satisfies readonly (keyof DraftState)[];

/**
 * El formulario de Toldos para el borrador: solo sus campos, sin los parámetros (un borrador es de un
 * pedido nuevo y sigue con los actuales) ni el autor sellado (lo decide el servidor al pasar a revisión).
 */
export function contenidoBorradorToldos(formulario: DraftState): ContenidoToldos {
  const order = Object.fromEntries(CAMPOS_FORMULARIO.map((campo) => [campo, formulario[campo]])) as DraftState;
  return { order };
}
```

En `src/client/remolques/guardarPedido.ts`, añadir al import de tipos:

```ts
import type { ContenidoRemolques } from '../../borradores/tipos.ts';
```

y al final:

```ts
/** Lo que guarda «Guardar borrador» de Remolques: la cabecera, las líneas y, si se corregía, sus parámetros. */
export function contenidoBorradorRemolques(
  estado: { numeroPedido: string; cliente: string; fecha: string; lineas: LineaPedido[] },
  paramsGuardados: CalcParams | null,
): ContenidoRemolques {
  return {
    numeroPedido: estado.numeroPedido.trim(),
    cliente: estado.cliente,
    fecha: estado.fecha,
    lineas: estado.lineas,
    ...(paramsGuardados ? { paramsGuardados } : {}),
  };
}
```

Run: `pnpm exec vitest run src/client/borradores.test.ts src/client/remolques/guardarPedido.test.ts`
Expected: PASS.

- [ ] **Step 4: Remolques: guardar, cargar y la pregunta de «Obtener datos»**

En `src/client/remolques/useRemolques.ts`:
- imports: añadir `contenidoBorradorRemolques` al import de `./guardarPedido` (`import { contenidoBorradorRemolques, cuerpoGuardar, lineasDesdePedidoGuardado, type ModoCarga } from './guardarPedido';`) y, debajo:

```ts
import type { BorradorRemolques, BorradorToldos } from '../../borradores/tipos.ts';
import { buscarBorradorAlObtener, guardarBorradorPreguntando } from '../borradores';
```

- en la firma de `useRemolques`, cambiar `export function useRemolques({ usuario, notify, askForConfirmation, onGuardado }: {` por `export function useRemolques({ usuario, notify, askForConfirmation, onGuardado, onAbrirBorradorToldos }: {` y, después de `onGuardado?: () => void;`:

```ts
  /** «Abrir borrador» al obtener un número cuyo borrador es de toldos: lo abre la aplicación en Toldos. */
  onAbrirBorradorToldos?: (borrador: BorradorToldos) => void;
```

- después de `useEffect(() => { alGuardar.current = onGuardado; });`:

```ts
  const alAbrirBorradorToldos = useRef(onAbrirBorradorToldos);
  useEffect(() => { alAbrirBorradorToldos.current = onAbrirBorradorToldos; });
```

- después de `const [guardando, setGuardando] = useState(false);`:

```ts
  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
```

- después del `useCallback` de `cargarPedidoGuardado` (antes del `return {`):

```ts
  /**
   * «Guardar borrador» (diseño 01/10/2026): deja el pedido a medias en el servidor, aunque esté
   * incompleto. Con número y «Soy». Guardado, la pantalla queda para un pedido nuevo y se borra el
   * borrador del navegador de ese pedido, como tras «Guardar para revisión».
   */
  const guardarBorrador = useCallback(async () => {
    const actual = estadoRef.current;
    if (!actual.numeroPedido.trim()) {
      notificar.current.notify('Indica el número de pedido para guardar el borrador.', { tone: 'warning', title: 'Falta el número' });
      return;
    }
    if (!usuario) {
      notificar.current.notify('Elige quién eres en «Soy» antes de guardar el borrador.', { tone: 'warning' });
      return;
    }
    setGuardandoBorrador(true);
    try {
      const resultado = await guardarBorradorPreguntando({
        numero: actual.numeroPedido,
        cuerpo: { kind: 'remolques', savedBy: usuario, contenido: contenidoBorradorRemolques(actual, paramsGuardados) },
        confirmar,
      });
      if (!resultado.ok) {
        if (resultado.mensaje) avisar('error', resultado.mensaje);
        return;
      }
      alGuardar.current?.();
      if (!pantallaSigueIgual(estadoRef.current, actual)) {
        notificar.current.notify(`El borrador de ${resultado.borrador.orderCode} se ha guardado, pero la pantalla ha cambiado mientras tanto y se conserva tal cual.`, { tone: 'info', title: 'Borrador guardado' });
        return;
      }
      consultaEnCurso.current?.abort();
      consultaEnEspera.current = null;
      pendienteRef.current = null;
      limpiarBorradores(almacen, actual.numeroPedido);
      setParamsGuardados(null);
      despachar({ tipo: 'PEDIDO_LIMPIADO' });
      notificar.current.notify(`Borrador guardado: ${resultado.borrador.orderCode}.`, { tone: 'success', title: 'Borrador guardado' });
    } finally {
      setGuardandoBorrador(false);
    }
  }, [almacen, avisar, confirmar, paramsGuardados, usuario]);

  /**
   * Abre un borrador del servidor en la pantalla («Seguir con el borrador» o «Abrir borrador»). Si la
   * pantalla tiene datos y `preguntar`, pregunta antes. Manda lo del servidor: el borrador del
   * navegador de ese pedido se borra para que no se mezcle; lo de otro pedido en cola se escribe ya.
   */
  const cargarBorrador = useCallback(async (borrador: BorradorRemolques, { preguntar = true }: { preguntar?: boolean } = {}) => {
    const actual = estadoRef.current;
    const hayDatos = Boolean(actual.numeroPedido.trim() || actual.cliente.trim() || actual.lineas.length > 0);
    if (preguntar && hayDatos) {
      const respuesta = await confirmar({
        title: `Seguir con el borrador de ${borrador.orderCode}`,
        message: 'Los datos que haya ahora en Remolques se sustituirán por los del borrador. El borrador sigue en Pedidos hasta que lo guardes para revisión o lo descartes.',
        confirmLabel: 'Seguir con el borrador',
        cancelLabel: 'Conservar formulario',
        tone: 'warning',
      });
      if (respuesta !== 'confirm') return;
    }
    const { contenido } = borrador;
    consultaEnCurso.current?.abort();
    consultaEnEspera.current = null;
    const pendiente = pendienteRef.current;
    if (pendiente && normalizarNumeroPedidoRps(pendiente.numeroPedido) !== normalizarNumeroPedidoRps(contenido.numeroPedido)) {
      volcar();
    }
    pendienteRef.current = null;
    limpiarBorradores(almacen, contenido.numeroPedido);
    setParamsGuardados(contenido.paramsGuardados ?? null);
    despachar({
      tipo: 'PEDIDO_CARGADO',
      numeroPedido: contenido.numeroPedido,
      cliente: contenido.cliente,
      fecha: contenido.fecha || hoy(),
      lineas: contenido.lineas,
    });
    avisar('info', `Borrador de ${borrador.orderCode} abierto: sigue con él y guárdalo para revisión cuando esté listo.`);
  }, [almacen, avisar, confirmar, volcar]);

  /**
   * El botón «Obtener datos del pedido» (y «Reintentar»): si el número tiene borrador, pregunta
   * «Abrir borrador» / «Empezar de cero»; si no, obtiene el pedido de RPS como siempre.
   */
  const obtenerDatosPulsado = useCallback(async () => {
    const numero = estadoRef.current.numeroPedido;
    const respuesta = await buscarBorradorAlObtener(numero, 'remolques', confirmar);
    if (respuesta.accion === 'cancelar') return;
    if (respuesta.accion === 'abrir') {
      // De remolques, aquí mismo y sin volver a preguntar; de toldos, lo abre la aplicación en Toldos.
      const { borrador } = respuesta;
      if (borrador.kind === 'remolques') await cargarBorrador(borrador, { preguntar: false });
      else alAbrirBorradorToldos.current?.(borrador);
      return;
    }
    obtenerDatosPedido(numero);
  }, [cargarBorrador, confirmar, obtenerDatosPedido]);
```

- en el `return { … }` del hook, después de `guardando,`:

```ts
    guardandoBorrador,
```

  y después de `cargarPedidoGuardado,`:

```ts
    guardarBorrador,
    cargarBorrador,
    obtenerDatosPulsado,
```

- [ ] **Step 5: Remolques: el botón y el borrador que manda abrir la aplicación**

En `src/client/remolques/RemolquesView.tsx` (puede tener cambios a medias de otro agente: editar sobre lo que haya):
- el import de iconos: `import { FilePen, Save } from 'lucide-react';` y, debajo de `import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';`:

```tsx
import type { BorradorRemolques, BorradorToldos } from '../../borradores/tipos.ts';
```

- en la firma, añadir `borradorSolicitado, onAbrirBorradorToldos` a la lista desestructurada (después de `onGuardado`) y, en el tipo de las props, después de `onGuardado?: () => void;`:

```tsx
  /** Un borrador que la aplicación manda abrir aquí (Pedidos › «Seguir con el borrador», o desde Toldos). */
  borradorSolicitado?: { id: number; borrador: BorradorRemolques; preguntar: boolean } | null;
  /** «Abrir borrador» de un número cuyo borrador es de toldos. */
  onAbrirBorradorToldos?: (borrador: BorradorToldos) => void;
```

- cambiar `const ws = useRemolques({ usuario, notify, askForConfirmation, onGuardado });` por:

```tsx
  const ws = useRemolques({ usuario, notify, askForConfirmation, onGuardado, onAbrirBorradorToldos });
```

- después del efecto de `pedidoGuardadoSolicitado` (el que acaba en `}, [cargarPedidoGuardado, pedidoGuardadoSolicitado]);`):

```tsx
  // Y con los borradores: cada petición, una vez.
  const ultimoBorradorSolicitado = React.useRef<number | null>(null);
  const { cargarBorrador } = ws;
  React.useEffect(() => {
    if (!borradorSolicitado || ultimoBorradorSolicitado.current === borradorSolicitado.id) return;
    ultimoBorradorSolicitado.current = borradorSolicitado.id;
    void cargarBorrador(borradorSolicitado.borrador, { preguntar: borradorSolicitado.preguntar });
  }, [cargarBorrador, borradorSolicitado]);
```

- en `<CabeceraPedido …>`, cambiar `onConsultarRps={() => ws.obtenerDatosPedido()}` por `onConsultarRps={() => void ws.obtenerDatosPulsado()}`.
- en `acciones` de `<PestanasElementos …>`, entre `<VistaPreviaPdf … />` y el botón `rem-guardar-boton`:

```tsx
            {/* Un pedido a medias se deja en el servidor (diseño 01/10/2026): sin completar ni calcular. */}
            <button type="button" className="ghost-button rem-borrador-boton"
              disabled={ws.guardandoBorrador || ws.guardando} aria-busy={ws.guardandoBorrador}
              onClick={() => void ws.guardarBorrador()}>
              <FilePen aria-hidden="true" />
              {ws.guardandoBorrador ? 'Guardando…' : 'Guardar borrador'}
            </button>
```

- [ ] **Step 6: La aplicación abre un borrador en su pantalla**

En `src/client/App.tsx`:
- en el import de `./types`, añadir `DraftState`: `import type { ActiveTab, Catalog, DraftState, OrderAutofill, ReviewPackage, WorkflowReadiness, WorkflowSettings } from './types';`
- debajo de `import type { PedidoRemolques } from '../remolques/flujo/tipos.ts';`:

```tsx
import type { Borrador, BorradorRemolques } from '../borradores/tipos.ts';
```

- después de `const [pedidoGuardadoSolicitado, setPedidoGuardadoSolicitado] = useState<…>(null);`:

```tsx
  // Un borrador de remolques que se manda abrir en Remolques (Pedidos o «Obtener datos» de Toldos);
  // la pantalla de remolques pregunta si tiene datos (`preguntar`).
  const [borradorRemolquesSolicitado, setBorradorRemolquesSolicitado] = useState<{ id: number; borrador: BorradorRemolques; preguntar: boolean } | null>(null);
```

- después de la función `abrirPedidoRemolques(…)`:

```tsx
  // Abrir un borrador del servidor (diseño 01/10/2026): «Seguir con el borrador» de Pedidos o «Abrir
  // borrador» al obtener un pedido. Los de remolques los abre su pantalla; los de toldos, el formulario,
  // con los parámetros actuales (un borrador es siempre de un pedido nuevo).
  async function abrirBorrador(borrador: Borrador, { preguntar = true }: { preguntar?: boolean } = {}) {
    if (borrador.kind === 'remolques') {
      chooseProducto('remolques');
      setActiveTab('order');
      setBorradorRemolquesSolicitado({ id: Date.now(), borrador, preguntar });
      return;
    }
    const hasDraftData = Boolean(
      draft.orderCode || draft.customer || draft.fabric || draft.notes
      || draft.awnings.some((awning) => awning.model || awning.of || awning.width || awning.projection)
    );
    if (preguntar && hasDraftData) {
      const choice = await askForConfirmation({
        title: `Seguir con el borrador de ${borrador.orderCode}`,
        message: 'Los datos que haya ahora en Nuevo pedido se sustituirán por los del borrador. El borrador sigue en Pedidos hasta que lo guardes para revisión o lo descartes.',
        confirmLabel: 'Seguir con el borrador',
        cancelLabel: 'Conservar formulario',
        tone: 'warning'
      });
      if (choice !== 'confirm') return;
    }
    draft.loadOrder(borrador.contenido.order as unknown as DraftState);
    setAutofill(null);
    setReturnNote(null);
    setPedidoRemolques(null);
    ruleSettings.restoreParameters();
    chooseProducto('toldos');
    setActiveTab('order');
    notify(`Borrador de ${borrador.orderCode} abierto: sigue con él y guárdalo para revisión cuando esté listo.`, { tone: 'info', title: 'Borrador' });
  }
```

- en `<RemolquesView …>`, después de `pedidoGuardadoSolicitado={pedidoGuardadoSolicitado}`:

```tsx
                borradorSolicitado={borradorRemolquesSolicitado}
                onAbrirBorradorToldos={(borrador) => void abrirBorrador(borrador)}
```

- [ ] **Step 7: Tipado, lint, pruebas y build**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: todo PASS (también `useRemolques.test.ts`, `obtener-pedido-pantalla.test.tsx` y la paridad), build terminado.

- [ ] **Step 8: Mirarlo en la aislada**

Arrancar la aislada de la tarea 3 (`ISOLATED_DIR="$PWD/tmp/borradores" PORT=4311 FAKE_COORDINA_PORT=4321`). Con Playwright (`TOLDOS_ISOLATED_URL=http://127.0.0.1:4311`, `openApp` de `drive.mjs`, usuario IVÁN): Nuevo pedido › Remolques, Pedido `AR.26.99611`, «+ Remolque» → sale «Guardar borrador» junto a «Guardar para revisión»; pulsarlo → aviso «Borrador guardado: AR2699611.» y la pantalla vacía. Volver a escribir `AR.26.99611` y pulsar «Obtener datos del pedido» → diálogo «AR2699611 tiene un borrador de Iván del …» con «Abrir borrador» / «Empezar de cero» / «Cancelar»; «Abrir borrador» → vuelve el elemento. Capturas en `tmp/ui-audit/borradores/remolques-*.png` (claro y oscuro, 1280×720 y 1600×1000) y mirarlas: el botón es un `ghost-button` como «Vista previa». Borrar el de prueba: `curl -s -X DELETE http://127.0.0.1:4311/api/borradores/AR2699611`. Parar la instancia.

- [ ] **Step 9: Commit**

Si `RemolquesView.tsx` tiene además cambios de otro agente sin subir, no añadirlo entero: preguntar a Iván antes (o añadir solo estas líneas con su permiso).

```bash
git add src/client/borradores.ts src/client/borradores.test.ts src/client/remolques/guardarPedido.ts src/client/remolques/guardarPedido.test.ts src/client/remolques/useRemolques.ts src/client/remolques/RemolquesView.tsx src/client/App.tsx
git commit -m "feat(borradores): «Guardar borrador» y abrir borradores en Remolques

Iván, 01/10/2026: un pedido de remolques a medias se deja en el servidor
para seguirlo desde otro puesto. «Guardar borrador» pide número y «Soy»,
pregunta antes de sustituir el de otra persona y deja la pantalla limpia.
«Obtener datos del pedido» con borrador pregunta «Abrir borrador» o
«Empezar de cero». Las llamadas y las preguntas van en un módulo común
para que Toldos use las mismas.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Toldos: «Guardar borrador» y la pregunta de «Obtener datos»

Modelo recomendado: el más barato (el código está completo). Esfuerzo: bajo.

**Files:**
- Modify: `src/client/App.tsx`

**Interfaces:**
- Consumes: de la tarea 4, `guardarBorradorPreguntando`, `buscarBorradorAlObtener`, `contenidoBorradorToldos` (`./borradores`) y `abrirBorrador(borrador, { preguntar })` (en `App.tsx`).
- Produces: el botón «Guardar borrador» de la barra de Toldos (`ghost-button`, entre «Vista previa» y «Guardar para revisión»; activo con número aunque no haya toldos); `working` admite `'draft'`.

- [ ] **Step 1: Implementar**

En `src/client/App.tsx`:
- imports de iconos: `import { Eraser, Eye, FilePen, Save, UserRound, X, Undo2, Moon, Sun } from 'lucide-react';` (respetando el formato del fichero: añadir `FilePen,` en su lista) y, debajo de `import { usePendingReviews } from './hooks/usePendingReviews';`:

```tsx
import { buscarBorradorAlObtener, contenidoBorradorToldos, guardarBorradorPreguntando } from './borradores';
```

- cambiar `const [working, setWorking] = useState<'review' | 'preview' | null>(null);` por:

```tsx
  const [working, setWorking] = useState<'review' | 'preview' | 'draft' | null>(null);
```

- en `autofillOrder`, después del bloque `if (!orderCode) { … return; }`:

```tsx
    // Si este número tiene borrador (diseño 01/10/2026), se pregunta antes de ir a RPS.
    const conBorrador = await buscarBorradorAlObtener(orderCode, 'toldos', askForConfirmation);
    if (conBorrador.accion === 'cancelar') return;
    if (conBorrador.accion === 'abrir') {
      // Aquí mismo sin volver a preguntar; si es de remolques, su pantalla pregunta si tiene datos.
      await abrirBorrador(conBorrador.borrador, { preguntar: conBorrador.borrador.kind !== 'toldos' });
      return;
    }
```

- después de la función `saveForReview(…)`:

```tsx
  // «Guardar borrador» (diseño 01/10/2026): el pedido a medias, aunque no tenga toldos ni esté
  // calculado, queda en el servidor para seguirlo desde cualquier puesto. Pide número y «Soy».
  async function saveDraftToServer() {
    const orderCode = draft.orderCode.trim();
    if (!orderCode) {
      notify('Indica el número de pedido para guardar el borrador.', { tone: 'warning', title: 'Falta el número' });
      return;
    }
    if (!currentUser) {
      setChoosingUser(true);
      notify('Elige quién eres en «Soy» antes de guardar el borrador.', { tone: 'warning' });
      return;
    }
    setWorking('draft');
    try {
      const result = await guardarBorradorPreguntando({
        numero: orderCode,
        cuerpo: { kind: 'toldos', savedBy: currentUser, contenido: contenidoBorradorToldos(draft) },
        confirmar: askForConfirmation
      });
      if (!result.ok) {
        if (result.mensaje) notify(result.mensaje, { tone: 'error' });
        return;
      }
      setReviewRefresh((value) => value + 1);
      setReturnNote(null);
      draft.resetDraft();
      setAutofill(null);
      setPedidoRemolques(null);
      ruleSettings.restoreParameters();
      notify(`Borrador guardado: ${result.borrador.orderCode}.`, { tone: 'success', title: 'Borrador guardado' });
    } finally {
      setWorking(null);
    }
  }
```

- en la barra de Toldos (`activeTab === 'order' && producto === 'toldos'`), entre el botón de «Vista previa» y el de «Guardar para revisión»:

```tsx
              <button className="ghost-button" type="button" disabled={Boolean(working) || !draft.orderCode.trim()} title={draft.orderCode.trim() ? undefined : 'Escribe el número de pedido para guardar el borrador.'} onClick={() => void saveDraftToServer()}>
                <FilePen aria-hidden="true" />
                {working === 'draft' ? 'Guardando…' : 'Guardar borrador'}
              </button>
```

- [ ] **Step 2: Tipado, lint, pruebas y build**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: todo PASS, build terminado.

- [ ] **Step 3: Mirarlo en la aislada**

Arrancar la aislada (`ISOLATED_DIR="$PWD/tmp/borradores" PORT=4311 FAKE_COORDINA_PORT=4321`). Con Playwright como IVÁN: Nuevo pedido › Toldos, Pedido `AR2699612`, Cliente `PRUEBA` → «Guardar borrador» activo sin toldos; pulsarlo → «Borrador guardado: AR2699612.» y el formulario vacío. Escribir `AR2699612` y pulsar «Obtener datos del pedido» → el diálogo de borrador; «Abrir borrador» → vuelve el cliente `PRUEBA` sin consultar RPS. Con un pedido ya guardado para revisión en la aislada (si no hay, saltar): «Guardar borrador» con su número → «Este pedido ya está en Pedidos: ábrelo y usa «Corregir».». Capturas de la barra en `tmp/ui-audit/borradores/toldos-*.png` (claro y oscuro, 1280×720 y 1600×1000): a 1280 los cuatro botones caben en una línea. Borrar el de prueba (`curl -s -X DELETE http://127.0.0.1:4311/api/borradores/AR2699612`). Parar la instancia.

- [ ] **Step 4: Commit**

```bash
git add src/client/App.tsx
git commit -m "feat(borradores): «Guardar borrador» en Toldos

Iván, 01/10/2026: un pedido de toldos a medias, aunque no tenga toldos ni
esté calculado, se deja en el servidor con su número y se sigue desde
cualquier puesto. «Obtener datos del pedido» con borrador pregunta antes de
ir a RPS.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Pedidos: el apartado «Borradores»

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio.

**Files:**
- Create: `src/client/hooks/useBorradores.ts`
- Modify: `src/client/ordersInbox.ts`, `src/client/components/OrdersInbox.tsx`, `src/client/views/ReviewsView.tsx`, `src/client/App.tsx`, `src/client/coordina/pedidos.css`
- Test: `src/client/ordersInbox.test.ts`, `src/client/components/OrdersInbox.test.tsx`

**Interfaces:**
- Consumes: de la tarea 4, `listarBorradores`, `leerBorrador`, `descartarBorrador` (`src/client/borradores.ts`) y `abrirBorrador(borrador)` de `App.tsx`; `ResumenBorrador`, `Borrador` (tarea 1); `FiltroProducto` y lo de `ordersInbox.ts`.
- Produces: `borradoresVisibles(borradores: ResumenBorrador[], { me, scope, query, producto? }): ResumenBorrador[]` y `fechaBorrador(valor: string): string` (`ordersInbox.ts`); `useBorradores(refreshKey: number, onError: Notify): { borradores: ResumenBorrador[]; cargando: boolean }`; `OrdersInbox` con las props opcionales `borradores?: ResumenBorrador[]`, `onSeguirBorrador?: (b: ResumenBorrador) => void`, `onDescartarBorrador?: (b: ResumenBorrador) => void`; `ReviewsView` con la prop `onSeguirBorrador: (borrador: Borrador) => void | Promise<void>`.

- [ ] **Step 1: Escribir las pruebas que fallan**

En `src/client/ordersInbox.test.ts`, cambiar el import a:

```ts
import { borradoresVisibles, claveBandeja, collapseAwnings, fechaBorrador, inboxSections, limitModels, mergePendingReviews, pendingGroups, pendingYears, productoDe } from './ordersInbox';
import type { ResumenBorrador } from '../borradores/tipos.ts';
```

y añadir al final:

```ts
describe('borradoresVisibles', () => {
  const borrador = (orderCode: string, kind: 'toldos' | 'remolques', savedBy: string, updatedAt: string, extra: Partial<ResumenBorrador> = {}) => ({
    schemaVersion: 1, kind, orderCode, numeroPedido: orderCode, savedBy, createdAt: updatedAt, updatedAt,
    summary: { customer: 'Cliente', orderDate: '', elementos: 1, models: ['ARZUA PRO'] }, ...extra,
  }) as ResumenBorrador;
  const lista = [
    borrador('AR2601', 'toldos', 'IVÁN', '2026-10-01T08:00:00Z'),
    borrador('AR2602', 'remolques', 'JAIME', '2026-10-01T09:00:00Z', { numeroPedido: 'AR.26.02', summary: { customer: 'Talleres', orderDate: '', elementos: 2, models: ['Arquillado'] } }),
  ];
  const codigos = (filtro: Parameters<typeof borradoresVisibles>[1]) => borradoresVisibles(lista, filtro).map((b) => b.orderCode);

  it('todos, del más reciente al más antiguo', () => {
    expect(codigos({ me: 'IVÁN', scope: 'all', query: '' })).toEqual(['AR2602', 'AR2601']);
  });
  it('el filtro de tipo y «Míos» (los que guardé yo)', () => {
    expect(codigos({ me: 'IVÁN', scope: 'all', query: '', producto: 'toldos' })).toEqual(['AR2601']);
    expect(codigos({ me: 'IVÁN', scope: 'all', query: '', producto: 'remolques' })).toEqual(['AR2602']);
    expect(codigos({ me: 'IVÁN', scope: 'mine', query: '' })).toEqual(['AR2601']);
  });
  it('busca número (también como se escribió), cliente y modelo, sin tildes ni mayúsculas', () => {
    expect(codigos({ me: 'IVÁN', scope: 'all', query: 'ar.26.02' })).toEqual(['AR2602']);
    expect(codigos({ me: 'IVÁN', scope: 'all', query: 'talleres' })).toEqual(['AR2602']);
    expect(codigos({ me: 'IVÁN', scope: 'all', query: 'arzua' })).toEqual(['AR2601']);
  });
  it('fechaBorrador: día, mes y hora', () => {
    expect(fechaBorrador('2026-10-01T09:30:00')).toMatch(/^01\/10,? 09:30$/);
    expect(fechaBorrador('no')).toBe('—');
  });
});
```

En `src/client/components/OrdersInbox.test.tsx`, añadir el import `import type { ResumenBorrador } from '../../borradores/tipos.ts';` y, dentro del `describe`, al final:

```tsx
  it('los borradores van encima de «Por revisar», con su etiqueta, y no cuentan como pendientes', () => {
    const borrador = {
      schemaVersion: 1, kind: 'remolques', orderCode: 'AR2609', numeroPedido: 'AR.26.09', savedBy: 'JAIME',
      createdAt: '2026-10-01T08:00:00Z', updatedAt: '2026-10-01T09:00:00Z',
      summary: { customer: 'Talleres', orderDate: '2026-10-01', elementos: 2, models: ['Recto'] },
    } as ResumenBorrador;
    const html = renderToStaticMarkup(
      <OrdersInbox
        pending={[fila('AR2601')]} history={[]} borradores={[borrador]} currentUser="IVÁN" pendingLoading={false} historyLoading={false} year={2026}
        onYear={() => undefined} onOpen={() => undefined} coordinaStatus={null}
        onSeguirBorrador={() => undefined} onDescartarBorrador={() => undefined}
      />,
    );
    expect(html.indexOf('aria-label="Borradores: 1"')).toBeGreaterThan(-1);
    expect(html.indexOf('aria-label="Borradores: 1"')).toBeLessThan(html.indexOf('Por revisar'));
    expect(html).toContain('orders-borrador-tag">Borrador<');
    expect(html).toContain('orders-kind-tag familia-tag is-remolques">Remolque<');
    // React separa con <!-- --> los textos seguidos: «2», « » y «elementos».
    expect(html).toMatch(/2(<!-- -->)? (<!-- -->)?elementos/);
    expect(html).toMatch(/Todo el equipo (<!-- -->)?1</);
    // Una sola cabecera de columnas para borradores y pendientes.
    expect(html.match(/class="orders-columns"/g)).toHaveLength(1);
  });

  it('sin borradores no sale el apartado', () => {
    const html = renderToStaticMarkup(
      <OrdersInbox pending={[fila('AR2601')]} history={[]} currentUser="IVÁN" pendingLoading={false} historyLoading={false} year={2026}
        onYear={() => undefined} onOpen={() => undefined} coordinaStatus={null} />,
    );
    expect(html).not.toContain('Borradores');
  });
```

- [ ] **Step 2: Ejecutarlas y ver que fallan**

Run: `pnpm exec vitest run src/client/ordersInbox.test.ts src/client/components/OrdersInbox.test.tsx`
Expected: FAIL — `borradoresVisibles is not a function` y no sale `Borradores`.

- [ ] **Step 3: El filtro y la fecha**

En `src/client/ordersInbox.ts`, añadir al principio `import type { ResumenBorrador } from '../borradores/tipos.ts';` y, después de la función `inboxSections(…)`:

```ts
// Borradores (diseño 01/10/2026): todos ven todos, con el mismo filtro de tipo y la misma búsqueda
// que los pedidos; «Míos» son los que guardé yo. No son pendientes: no cuentan en ningún número.
export function borradoresVisibles(
  borradores: ResumenBorrador[],
  { me, scope, query, producto = 'todos' }: { me: string; scope: 'mine' | 'all'; query: string; producto?: FiltroProducto }
) {
  const term = normalize(query.trim());
  return borradores
    .filter((borrador) => producto === 'todos' || borrador.kind === producto)
    .filter((borrador) => scope === 'all' || borrador.savedBy === me)
    .filter((borrador) => !term || normalize([borrador.orderCode, borrador.numeroPedido, borrador.summary.customer, ...borrador.summary.models].join(' ')).includes(term))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

// Cuándo se guardó un borrador: día, mes y hora («01/10, 09:30»).
export function fechaBorrador(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
```

- [ ] **Step 4: La bandeja con el apartado «Borradores»**

En `src/client/components/OrdersInbox.tsx`:
- iconos: `import { AlertTriangle, Check, ChevronDown, CircleAlert, FilePen, FileSearch, FolderOpen, Search, Trash2 } from 'lucide-react';`
- el import de `../ordersInbox`: añadir `borradoresVisibles, fechaBorrador,` a la lista; y debajo `import type { ResumenBorrador } from '../../borradores/tipos.ts';`
- la firma: `export function OrdersInbox({ pending, history, currentUser, pendingLoading, historyLoading, year, onYear, onOpen, coordinaStatus, borradores = [], onSeguirBorrador = () => undefined, onDescartarBorrador = () => undefined }: {` y, en el tipo, después de `coordinaStatus: CoordinaStatus | null;`:

```tsx
  /** Borradores del servidor (diseño 01/10/2026): van encima de «Por revisar» y no cuentan. */
  borradores?: ResumenBorrador[];
  onSeguirBorrador?: (borrador: ResumenBorrador) => void;
  onDescartarBorrador?: (borrador: ResumenBorrador) => void;
```

- después de `const groups = pendingGroups(sections.pending, coordinaStatus);`:

```tsx
  const drafts = borradoresVisibles(borradores, { me: currentUser, scope, query, producto });
```

- sustituir el bloque de pendientes:

```tsx
      {pendingLoading ? <p className="review-empty">Cargando pedidos…</p>
        : groups.length === 0 ? <p className="review-empty"><FileSearch aria-hidden="true" />{scope === 'mine' ? 'No tienes pedidos pendientes.' : 'No hay pedidos pendientes.'}</p>
          : <>{columns(true)}{groups.map((group) => (
            <section key={group.key} className="orders-group" aria-label={`${group.label}: ${group.reviews.length}`}>
              <h3 className={`orders-group-title tone-${group.tone}`}><span className="orders-dot" aria-hidden="true" />{group.label}<span className="orders-count">{group.reviews.length}</span></h3>
              {block(group.reviews, true, group.tone)}
            </section>
          ))}</>}
```

por:

```tsx
      {(drafts.length > 0 || (!pendingLoading && groups.length > 0)) && columns(true)}
      {drafts.length > 0 && (
        <section className="orders-group" aria-label={`Borradores: ${drafts.length}`}>
          <h3 className="orders-group-title tone-draft"><span className="orders-dot" aria-hidden="true" />Borradores<span className="orders-count">{drafts.length}</span></h3>
          <div className="orders-block">
            <ul className="orders-list">
              {drafts.map((borrador) => {
                const clave = `borrador:${borrador.orderCode}`;
                return (
                  <DraftRow
                    key={clave}
                    borrador={borrador}
                    mine={borrador.savedBy === currentUser}
                    open={openCode === clave}
                    onToggle={() => setOpenCode((current) => (current === clave ? null : clave))}
                    onSeguir={() => onSeguirBorrador(borrador)}
                    onDescartar={() => onDescartarBorrador(borrador)}
                  />
                );
              })}
            </ul>
          </div>
        </section>
      )}
      {pendingLoading ? <p className="review-empty">Cargando pedidos…</p>
        : groups.length === 0 ? <p className="review-empty"><FileSearch aria-hidden="true" />{scope === 'mine' ? 'No tienes pedidos pendientes.' : 'No hay pedidos pendientes.'}</p>
          : groups.map((group) => (
            <section key={group.key} className="orders-group" aria-label={`${group.label}: ${group.reviews.length}`}>
              <h3 className={`orders-group-title tone-${group.tone}`}><span className="orders-dot" aria-hidden="true" />{group.label}<span className="orders-count">{group.reviews.length}</span></h3>
              {block(group.reviews, true, group.tone)}
            </section>
          ))}
```

- después de la función `OrderRow(…)`:

```tsx
// Un borrador (diseño 01/10/2026): las mismas columnas que un pedido, con la etiqueta «Borrador»
// delante; al desplegarlo, «Descartar borrador» y «Seguir con el borrador».
function DraftRow({ borrador, mine, open, onToggle, onSeguir, onDescartar }: {
  borrador: ResumenBorrador;
  mine: boolean;
  open: boolean;
  onToggle: () => void;
  onSeguir: () => void;
  onDescartar: () => void;
}) {
  const detailId = `orders-detail-borrador-${borrador.orderCode}`;
  const author = borrador.savedBy ? controlLabel(borrador.savedBy) : '—';
  const elementos = borrador.summary.elementos;
  return (
    <li className={`orders-row is-draft ${open ? 'bloque-3d-hundido is-open' : 'bloque-3d'} tone-draft`}>
      <div className="orders-row-head">
      <button
        type="button"
        className="orders-row-toggle"
        aria-expanded={open}
        aria-controls={detailId}
        aria-label={`${open ? 'Plegar' : 'Desplegar'} el borrador ${borrador.orderCode}`}
        onClick={onToggle}
      />
      <div className="orders-row-cells">
        <ChevronDown className="orders-chevron" aria-hidden="true" />
        <strong className="orders-code">{borrador.orderCode}</strong>
        <span className="orders-customer">{borrador.summary.customer || 'Sin cliente'}</span>
        <ModelTags models={borrador.summary.models} producto={borrador.kind} borrador />
        <span className="orders-author">{author}{mine && <em className="orders-me">Tú</em>}</span>
        <span className="orders-date">{fechaBorrador(borrador.updatedAt)}</span>
        <span className="orders-awnings"><span className="orders-models">{elementos} {elementos === 1 ? 'elemento' : 'elementos'}</span></span>
      </div>
      </div>
      {open && (
        <div className="orders-detail" id={detailId}>
          <p className="orders-detail-empty">Guardado por {author} el {fechaBorrador(borrador.updatedAt)}. Es un borrador: no está en revisión hasta que se guarde para revisión.</p>
          <div className="orders-detail-actions">
            <button type="button" className="ghost-button" onClick={onDescartar}><Trash2 aria-hidden="true" />Descartar borrador</button>
            <button type="button" className="primary-button boton-3d" onClick={onSeguir}><FilePen aria-hidden="true" />Seguir con el borrador</button>
          </div>
        </div>
      )}
    </li>
  );
}
```

- en `ModelTags`, cambiar la firma a `function ModelTags({ models, producto, borrador = false }: { models?: string[]; producto: 'toldos' | 'remolques'; borrador?: boolean }) {` y, dentro de `<span className="orders-model-tags">`, antes de la etiqueta `orders-kind-tag`:

```tsx
      {borrador && <span className="orders-borrador-tag">Borrador</span>}
```

En `src/client/coordina/pedidos.css`, después de `.tone-approved .orders-dot { background: #0891b2; }`:

```css
/* Borradores (diseño 01/10/2026): punto gris; no están en ningún estado de CoordinaOT. */
.tone-draft .orders-dot { background: var(--text-muted); }
```

y después de la regla `.review-reader-title h2 .orders-kind-tag { … }`:

```css
/* «Borrador»: borde discontinuo y sin color de familia, para que no se confunda con un pedido. */
.orders-borrador-tag {
  border: 1px dashed var(--border-strong);
  border-radius: 0.375rem;
  color: var(--text-muted);
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  line-height: 1rem;
  padding: calc(0.125rem - 1px) 0.375rem;
  white-space: nowrap;
}
```

- [ ] **Step 5: La lista y las acciones en Pedidos**

Crear `src/client/hooks/useBorradores.ts`:

```ts
import { useEffect, useState } from 'react';
import type { ResumenBorrador } from '../../borradores/tipos.ts';
import type { Notify } from '../components/NotificationCenter';
import { listarBorradores } from '../borradores';

// Los borradores para Pedidos (diseño 01/10/2026). Se leen al entrar y cada vez que cambia
// `refreshKey`; no van en App porque no cuentan en «Pedidos N». Sin carpeta configurada, ninguno.
export function useBorradores(refreshKey: number, onError: Notify) {
  const [borradores, setBorradores] = useState<ResumenBorrador[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    listarBorradores()
      .then((datos) => {
        if (cancelado) return;
        setBorradores(datos.borradores);
        setCargando(false);
      })
      .catch((error) => {
        if (cancelado) return;
        setCargando(false);
        onError(error instanceof Error ? error.message : 'No se pudieron cargar los borradores.', { tone: 'error' });
      });
    return () => { cancelado = true; };
  }, [refreshKey, onError]);

  return { borradores, cargando };
}
```

En `src/client/views/ReviewsView.tsx`:
- imports, después de `import { PedidoRemolquesDetalle } from '../remolques/PedidoRemolquesDetalle';`:

```tsx
import type { Borrador, ResumenBorrador } from '../../borradores/tipos.ts';
import { descartarBorrador, leerBorrador } from '../borradores';
import { useBorradores } from '../hooks/useBorradores';
import { controlLabel } from '../components/controlLabels';
```

- en la firma, añadir `onSeguirBorrador` a la lista desestructurada (después de `onReuseRemolques`) y en el tipo, después de `onReuseRemolques: (pedido: PedidoRemolques) => void;`:

```tsx
  /** «Seguir con el borrador»: lo abre App en Toldos o en Remolques. */
  onSeguirBorrador: (borrador: Borrador) => void | Promise<void>;
```

- después de `const { status: coordinaStatus } = useCoordinaStatus(…);`:

```tsx
  const { borradores } = useBorradores(refreshKey, onToast);
```

- antes de `return (` (después de `generateSelected`):

```tsx
  // «Seguir con el borrador»: se lee entero (la lista no trae el contenido) y lo abre App.
  async function seguirBorrador(resumen: ResumenBorrador) {
    try {
      const borrador = await leerBorrador(resumen.orderCode);
      if (!borrador) {
        onToast('Este borrador ya no está: puede que otro puesto lo haya guardado para revisión o descartado.', { tone: 'warning' });
        onChanged();
        return;
      }
      await onSeguirBorrador(borrador);
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudo abrir el borrador.', { tone: 'error' });
    }
  }

  // «Descartar borrador»: cualquiera puede, preguntando antes.
  async function descartar(resumen: ResumenBorrador) {
    const choice = await onConfirm({
      title: `Descartar el borrador de ${resumen.orderCode}`,
      message: `Se borrará el borrador que guardó ${controlLabel(resumen.savedBy)}. No se puede deshacer. Lo que haya en RPS y en Pedidos no cambia.`,
      confirmLabel: 'Descartar borrador',
      cancelLabel: 'Conservar borrador',
      tone: 'danger'
    });
    if (choice !== 'confirm') return;
    try {
      await descartarBorrador(resumen.orderCode);
      onToast(`Borrador descartado: ${resumen.orderCode}.`, { tone: 'success', title: 'Borrador descartado' });
      onChanged();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudo descartar el borrador.', { tone: 'error' });
    }
  }
```

- en `<OrdersInbox …>`, después de `coordinaStatus={coordinaStatus}`:

```tsx
            borradores={borradores}
            onSeguirBorrador={(borrador) => void seguirBorrador(borrador)}
            onDescartarBorrador={(borrador) => void descartar(borrador)}
```

En `src/client/App.tsx`, en `<ReviewsView …>`, después de `onReuseRemolques={(pedido) => abrirPedidoRemolques(pedido, 'reutilizar')}`:

```tsx
              onSeguirBorrador={(borrador) => abrirBorrador(borrador)}
```

- [ ] **Step 6: Pruebas, tipado, lint y build**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: todo PASS, build terminado.

- [ ] **Step 7: Mirarlo en la aislada**

Arrancar la aislada (`ISOLATED_DIR="$PWD/tmp/borradores" PORT=4311 FAKE_COORDINA_PORT=4321`). Crear dos borradores por la API (uno de toldos de JAIME y uno de remolques de IVÁN, con los cuerpos de la tarea 3, números `AR2699621` y `AR.26.99622`). Con Playwright como IVÁN, en Pedidos: «Borradores 2» encima de «Por revisar», cada fila con «Borrador» y «Toldo»/«Remolque»; el número de «Pedidos N» no ha cambiado; «Míos» deja solo el de IVÁN; «Remolques» deja solo el de remolques; desplegar uno enseña «Descartar borrador» y «Seguir con el borrador». Capturas en `tmp/ui-audit/borradores/pedidos-*.png` (claro y oscuro, 1280×720 y 1600×1000, con una fila desplegada) y mirarlas: la etiqueta «Borrador» se distingue en los dos modos y las columnas cuadran con las de los pedidos. Descartar los dos desde la pantalla. Parar la instancia.

- [ ] **Step 8: Commit**

```bash
git add src/client/ordersInbox.ts src/client/ordersInbox.test.ts src/client/components/OrdersInbox.tsx src/client/components/OrdersInbox.test.tsx src/client/hooks/useBorradores.ts src/client/views/ReviewsView.tsx src/client/App.tsx src/client/coordina/pedidos.css
git commit -m "feat(borradores): apartado «Borradores» en Pedidos

Iván, 01/10/2026: todos ven todos los borradores, encima de «Por revisar»
y con la etiqueta «Borrador» bien distinta. Respetan el filtro de tipo, la
búsqueda y «Míos» (los guardados por mí), y no cuentan en «Pedidos N» ni
preguntan a CoordinaOT. Al desplegarlos: «Seguir con el borrador» (lo abre
en Toldos o en Remolques) y «Descartar borrador» (con confirmación).

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Prueba de punta a punta, toldos y remolques igual, y documentación

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio (≈ 3 min por vuelta de la e2e; si falla, el arreglo va en la tarea que toca).

**Files:**
- Create: `scripts/test-borradores-e2e.mjs`
- Modify: `.claude/skills/running-toldos-testar/SKILL.md`, `README.md`

**Interfaces:**
- Consumes: todo lo anterior; de `drive.mjs`: `BASE_URL`, `openApp(viewport, { user, launchArgs })`, `addAwning(page, modelName)`, `fillArzuaAR2603332(page)`; de `scripts/lib/remolques-e2e.mjs`: `editor(page)`, `teclearCaso(page, caso)`.
- Produces: `node scripts/test-borradores-e2e.mjs` contra una aislada; termina con `Borradores: OK`.

- [ ] **Step 1: Escribir la e2e**

Crear `scripts/test-borradores-e2e.mjs`:

```js
// Prueba e2e de los borradores en el servidor (diseño 01/10/2026): guardar borrador de toldos y de
// remolques; verlos en «Borradores» como otro técnico (etiquetas, filtro, búsqueda, «Míos»); que no
// cuentan en «Pedidos N»; descartar uno; «Seguir con el borrador» y sustituir el de otra persona; el
// aviso al obtener un pedido con borrador («Abrir borrador» y «Empezar de cero»); pasarlo a revisión,
// en toldos y en remolques, y que desaparece.
// Va en su propia aislada, porque borra pedidos de prueba de su carpeta:
//   ISOLATED_DIR="$PWD/tmp/borradores" PORT=4311 FAKE_COORDINA_PORT=4321 bash .claude/skills/running-toldos-testar/start-isolated.sh
//   TOLDOS_ISOLATED_URL=http://127.0.0.1:4311 node scripts/test-borradores-e2e.mjs
// Capturas en tmp/ui-audit/borradores/ (claro y oscuro, 1280×720 y 1600×1000).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL, addAwning, fillArzuaAR2603332, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { editor, teclearCaso } from './lib/remolques-e2e.mjs';

const SALIDA = 'tmp/ui-audit/borradores';
fs.mkdirSync(SALIDA, { recursive: true });
const CON_WEBGL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const AA = String(new Date().getFullYear()).slice(2);
const T1 = 'AR2603332'; // el pedido de Arzúa que rellena fillArzuaAR2603332
const R1 = { pedido: `AR.${AA}.99602`, codigo: `AR${AA}99602` };
const T2 = `AR${AA}99603`;
const OF_R1 = '0299602';
const fixture = JSON.parse(fs.readFileSync('src/remolques/__fixtures__/produccion-2026-09.json', 'utf8'));
const caso = (id) => fixture.find((c) => c.caso === id);
const enviar = (method, datos) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos ?? {}) });
async function api(ruta, init) {
  const r = await fetch(`${BASE_URL}${ruta}`, init);
  return { status: r.status, datos: await r.json().catch(() => null) };
}

// Las carpetas de esta aislada tienen que estar dentro de tmp/: aquí se borran ficheros.
const { settings: ajustes } = (await api('/api/workflow/settings')).datos;
const TMP = path.resolve('tmp');
const enTmp = (ruta) => path.resolve(String(ruta || '').replace('{YYYY}', '2026')).startsWith(`${TMP}${path.sep}`);
for (const clave of ['draftsDirectory', 'reviewDirectory', 'remolquesRevisionDirectory']) {
  assert.ok(ajustes[clave] && enTmp(ajustes[clave]), `${clave} tiene que estar dentro de tmp/: «${ajustes[clave]}»`);
}
// Empezar de cero: los borradores y pedidos de prueba de una vuelta anterior.
for (const codigo of [T1, R1.codigo, T2]) fs.rmSync(path.join(ajustes.draftsDirectory, `${codigo}.json`), { force: true });
fs.rmSync(path.join(ajustes.reviewDirectory.replace('{YYYY}', '2026'), `${T1}.pdf`), { force: true });
fs.rmSync(path.join(ajustes.remolquesRevisionDirectory, `${R1.codigo}.json`), { force: true });

const ivan = await openApp({ width: 1600, height: 1000 }, { launchArgs: CON_WEBGL });
const jaime = await openApp({ width: 1600, height: 1000 }, { user: 'JAIME', launchArgs: CON_WEBGL });
ivan.page.setDefaultTimeout(20000);
jaime.page.setDefaultTimeout(20000);
const toldos = (page) => page.locator('.order-form-fieldset');
const remolques = (page) => page.locator('.remolques-pantalla');
const pestanaPedidos = (page) => page.getByRole('button', { name: /^Pedidos/ }).first();
const seccionBorradores = (page) => page.locator('section.orders-group', { has: page.locator('.orders-group-title.tone-draft') });
const filaBorrador = (page, codigo) => seccionBorradores(page).locator('.orders-row', { hasText: codigo });
const dialogo = (page) => page.getByRole('alertdialog');
async function desplegar(page, codigo) {
  const fila = filaBorrador(page, codigo);
  await fila.waitFor();
  if (!(await fila.getByRole('button', { name: 'Seguir con el borrador' }).isVisible())) await fila.locator('.orders-row-toggle').click();
  return fila;
}
async function capturas(page, nombre) {
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
  const page = ivan.page;
  const pj = jaime.page;
  await page.waitForLoadState('networkidle');
  const pedidosAntes = (await pestanaPedidos(page).innerText()).trim();

  // ── 1. Borrador de toldos (Iván) ──
  await page.getByRole('button', { name: 'Toldos', exact: true }).click();
  await addAwning(page, 'Arzúa Pro');
  await fillArzuaAR2603332(page);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await page.getByText(`Borrador guardado: ${T1}.`).waitFor();
  assert.equal(await toldos(page).getByLabel('Pedido', { exact: true }).inputValue(), '', 'tras guardar el borrador, el formulario queda limpio');
  const b1 = (await api(`/api/borradores/${T1}`)).datos;
  assert.equal(b1.kind, 'toldos');
  assert.equal(b1.savedBy, 'IVÁN');
  assert.equal(b1.summary.elementos, 1);
  console.log('OK: borrador de toldos guardado y formulario limpio');

  // ── 2. Borrador de remolques (Iván) ──
  await page.getByRole('button', { name: 'Remolques', exact: true }).click();
  await remolques(page).getByLabel('Pedido', { exact: true }).fill(R1.pedido);
  await remolques(page).getByLabel('Cliente', { exact: true }).fill('TALLERES DE PRUEBA');
  await page.getByRole('button', { name: '+ Remolque', exact: true }).click();
  await editor(page).waitFor();
  await teclearCaso(page, caso('lona-02'));
  await editor(page).locator('input[data-campo="ordenFabricacion"]').fill(OF_R1);
  await capturas(page, '1-remolques-guardar-borrador');
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await page.getByText(`Borrador guardado: ${R1.codigo}.`).waitFor();
  assert.equal(await page.locator('.rem-pestana').count(), 0, 'tras guardar el borrador, la pantalla queda para un pedido nuevo');
  assert.equal((await api(`/api/borradores/${R1.codigo}`)).datos.kind, 'remolques');
  console.log('OK: borrador de remolques guardado y pantalla limpia');

  // ── 3. Reglas por la API y un borrador de Jaime para descartar ──
  const ordenT2 = { orderCode: T2, customer: 'CLIENTE PARA DESCARTAR', orderDate: `20${AA}-10-01`, awnings: [] };
  assert.equal((await api(`/api/borradores/${T2}`, enviar('PUT', { kind: 'toldos', savedBy: 'JAIME', contenido: { order: ordenT2 } }))).status, 200);
  assert.equal((await api(`/api/borradores/${T2}`, enviar('PUT', { kind: 'toldos', savedBy: '', contenido: { order: ordenT2 } }))).status, 400, 'sin «Soy» no se guarda');
  const otroTipo = await api(`/api/borradores/${T1}`, enviar('PUT', { kind: 'remolques', savedBy: 'IVÁN', contenido: { numeroPedido: T1, cliente: '', fecha: '', lineas: [] } }));
  assert.equal(otroTipo.status, 409);
  assert.match(otroTipo.datos.error, /toldos o de remolques/);
  await page.reload();
  await page.waitForLoadState('networkidle');
  assert.equal((await pestanaPedidos(page).innerText()).trim(), pedidosAntes, 'los borradores no cuentan en «Pedidos N»');
  console.log('OK: reglas del servidor y «Pedidos N» sin cambiar');

  // ── 4. Jaime ve todos en «Borradores» ──
  await pestanaPedidos(pj).click();
  for (const codigo of [T1, R1.codigo, T2]) await filaBorrador(pj, codigo).waitFor();
  assert.match(await pj.locator('.orders-group-title').first().innerText(), /Borradores/, '«Borradores» va el primero, encima de «Por revisar»');
  assert.equal((await filaBorrador(pj, T1).locator('.orders-borrador-tag').innerText()).trim(), 'Borrador');
  assert.equal((await filaBorrador(pj, T1).locator('.orders-kind-tag').innerText()).trim(), 'Toldo');
  assert.equal((await filaBorrador(pj, R1.codigo).locator('.orders-kind-tag').innerText()).trim(), 'Remolque');
  const filtro = pj.getByRole('group', { name: 'Qué tipo de pedidos' });
  await filtro.getByRole('button', { name: 'Remolques', exact: true }).click();
  await filaBorrador(pj, R1.codigo).waitFor();
  assert.equal(await filaBorrador(pj, T1).count(), 0, '«Remolques» deja fuera los borradores de toldos');
  await filtro.getByRole('button', { name: 'Todos', exact: true }).click();
  await pj.getByLabel('Buscar pedidos').fill('99603');
  await filaBorrador(pj, T2).waitFor();
  assert.equal(await filaBorrador(pj, T1).count(), 0, 'la búsqueda también filtra los borradores');
  await pj.getByLabel('Buscar pedidos').fill('');
  const alcance = pj.getByRole('group', { name: 'Qué pedidos pendientes' });
  await alcance.getByRole('button', { name: /^Míos/ }).click();
  await filaBorrador(pj, T2).waitFor();
  assert.equal(await filaBorrador(pj, T1).count(), 0, '«Míos» enseña solo los borradores guardados por mí');
  await alcance.getByRole('button', { name: /^Todo el equipo/ }).click();
  await desplegar(pj, T1);
  await capturas(pj, '2-pedidos-borradores');
  console.log('OK: «Borradores» con etiquetas, filtro, búsqueda y «Míos»');

  // ── 5. Descartar ──
  let fila = await desplegar(pj, T2);
  await fila.getByRole('button', { name: 'Descartar borrador' }).click();
  await dialogo(pj).getByRole('button', { name: 'Descartar borrador', exact: true }).click();
  await pj.getByText(`Borrador descartado: ${T2}.`).waitFor();
  await filaBorrador(pj, T2).waitFor({ state: 'detached' });
  assert.equal((await api(`/api/borradores/${T2}`)).status, 404);
  console.log('OK: «Descartar borrador» con confirmación');

  // ── 6. Jaime sigue con el borrador de Iván y lo sustituye ──
  fila = await desplegar(pj, T1);
  await fila.getByRole('button', { name: 'Seguir con el borrador' }).click();
  await toldos(pj).getByLabel('OF', { exact: true }).waitFor();
  assert.equal(await toldos(pj).getByLabel('Pedido', { exact: true }).inputValue(), T1);
  assert.equal(await toldos(pj).getByLabel('OF', { exact: true }).inputValue(), '0230194');
  await capturas(pj, '3-seguir-con-el-borrador');
  await pj.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await dialogo(pj).getByText('Este borrador es de Iván, ¿lo sustituyes?').waitFor();
  await capturas(pj, '4-sustituir-borrador-de-otro');
  await dialogo(pj).getByRole('button', { name: 'Sustituir borrador', exact: true }).click();
  await pj.getByText(`Borrador guardado: ${T1}.`).waitFor();
  assert.equal((await api(`/api/borradores/${T1}`)).datos.savedBy, 'JAIME');
  console.log('OK: «Seguir con el borrador» y sustituir el de otra persona preguntando');

  // ── 7. Iván obtiene el pedido: «Abrir borrador», y lo pasa a revisión ──
  await page.getByRole('button', { name: 'Toldos', exact: true }).click();
  await toldos(page).getByLabel('Pedido', { exact: true }).fill(T1);
  await page.getByRole('button', { name: 'Obtener datos del pedido' }).click();
  await dialogo(page).getByText(`${T1} tiene un borrador de Jaime del`).waitFor();
  await capturas(page, '5-obtener-con-borrador');
  await dialogo(page).getByRole('button', { name: 'Abrir borrador', exact: true }).click();
  await toldos(page).getByLabel('OF', { exact: true }).waitFor();
  assert.equal(await toldos(page).getByLabel('OF', { exact: true }).inputValue(), '0230194');
  // El cálculo llega tras cargar el formulario; con él pendiente, guardar avisa «Faltan datos».
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Guardar para revisión' }).click();
  await page.getByText(`Guardado en Pedidos para revisión: ${T1}.pdf`).waitFor();
  assert.equal((await api(`/api/borradores/${T1}`)).status, 404, 'al pasar a revisión, el borrador de toldos desaparece');
  const yaEnPedidos = await api(`/api/borradores/${T1}`, enviar('PUT', { kind: 'toldos', savedBy: 'IVÁN', contenido: { order: { orderCode: T1, awnings: [] } } }));
  assert.equal(yaEnPedidos.status, 409);
  assert.equal(yaEnPedidos.datos.error, 'Este pedido ya está en Pedidos: ábrelo y usa «Corregir».');
  console.log('OK: «Abrir borrador» al obtener el pedido, y pasado a revisión el borrador desaparece');

  // ── 8. Remolques: «Empezar de cero» deja el borrador; Jaime lo sigue y lo pasa a revisión ──
  await page.getByRole('button', { name: 'Remolques', exact: true }).click();
  await remolques(page).getByLabel('Pedido', { exact: true }).fill(R1.pedido);
  await page.getByRole('button', { name: 'Obtener datos del pedido' }).click();
  await dialogo(page).getByText(`${R1.codigo} tiene un borrador de Iván del`).waitFor();
  await dialogo(page).getByRole('button', { name: 'Empezar de cero', exact: true }).click();
  // Sigue con RPS como siempre (en la aislada puede no responder: da igual aquí).
  await page.waitForLoadState('networkidle');
  assert.equal((await api(`/api/borradores/${R1.codigo}`)).status, 200, '«Empezar de cero» no borra el borrador');
  await pestanaPedidos(pj).click();
  fila = await desplegar(pj, R1.codigo);
  await fila.getByRole('button', { name: 'Seguir con el borrador' }).click();
  await editor(pj).waitFor();
  assert.equal(await remolques(pj).getByLabel('Pedido', { exact: true }).inputValue(), R1.pedido);
  assert.equal(await pj.locator('.rem-pestana').count(), 1);
  await capturas(pj, '6-seguir-remolques');
  await pj.getByRole('button', { name: 'Guardar para revisión', exact: true }).click();
  await pj.getByText(`Guardado en Pedidos para revisión: ${R1.codigo}.`).waitFor();
  assert.equal((await api(`/api/borradores/${R1.codigo}`)).status, 404, 'al pasar a revisión, el borrador de remolques desaparece');
  console.log('OK: remolques: «Empezar de cero», «Seguir con el borrador» y pasado a revisión');
} finally {
  await ivan.browser.close();
  await jaime.browser.close();
}
// Las respuestas con error las apunta el navegador como error de red: 404 (leer un borrador que no hay),
// 409 (preguntas de confirmar) y las de RPS, que en la aislada puede no responder (las OF del pedido
// de toldos, «Empezar de cero»). Los fallos de la página (pageerror) sí cuentan.
const errores = [...ivan.errors, ...jaime.errors].filter((e) => !/Failed to load resource: the server responded with a status of \d{3}/.test(e));
assert.deepEqual(errores, [], 'sin errores de consola');
console.log('Borradores: OK');
```

- [ ] **Step 2: Ejecutarla**

Run (en segundo plano): `ISOLATED_DIR="$PWD/tmp/borradores" PORT=4311 FAKE_COORDINA_PORT=4321 bash .claude/skills/running-toldos-testar/start-isolated.sh`
Esperar a `curl -fsS http://127.0.0.1:4311/api/health` (`"simulationMode":true`, `"fileWritesEnabled":false`).

Run: `TOLDOS_ISOLATED_URL=http://127.0.0.1:4311 node scripts/test-borradores-e2e.mjs`
Expected: las ocho líneas `OK: …` y al final `Borradores: OK` (unos 3 minutos).

Mirar las capturas de `tmp/ui-audit/borradores/` (claro y oscuro, 1280 y 1600). Si algo se ve mal, corregirlo en la tarea que toca (CSS de la tarea 6, botones de las tareas 4 y 5) antes de seguir.

- [ ] **Step 3: Toldos y remolques siguen igual**

Con la misma instancia:

Run: `TOLDOS_ISOLATED_URL=http://127.0.0.1:4311 FAKE_COORDINA_PORT=4321 node scripts/test-coordina-approval-e2e.mjs`
Expected: termina con su línea final de OK (sin cambiar el script).

Parar la instancia. La e2e de remolques activa la generación, así que va en la suya:

Run (en segundo plano): `ISOLATED_DIR="$PWD/tmp/remolques-5" PORT=4311 FAKE_COORDINA_PORT=4321 bash .claude/skills/running-toldos-testar/start-isolated.sh`
Run: `TOLDOS_ISOLATED_URL=http://127.0.0.1:4311 FAKE_COORDINA_PORT=4321 node scripts/test-remolques-5-e2e.mjs`
Expected: `Remolques fase 5: OK` (sin cambiar el script). Parar la instancia.

- [ ] **Step 4: Documentación**

En `.claude/skills/running-toldos-testar/SKILL.md`, después del punto de la e2e de la fase 5 de remolques (el que acaba en `node scripts/test-remolques-5-e2e.mjs\`.`):

```md
- Drafts e2e (borradores en el servidor, toldos y remolques): it deletes its test orders, so it runs on
  its own isolated instance:
  `ISOLATED_DIR="$PWD/tmp/borradores" PORT=4311 FAKE_COORDINA_PORT=4321 bash .claude/skills/running-toldos-testar/start-isolated.sh`
  and then `TOLDOS_ISOLATED_URL=http://127.0.0.1:4311 node scripts/test-borradores-e2e.mjs`.
```

En `README.md`, en «## Flujo de revisión», justo antes del primer punto (`- \`Guardar para revisión\` crea únicamente …`):

```md
- `Guardar borrador` (Toldos y Remolques) deja un pedido a medias en el servidor, uno por número de
  pedido, para seguirlo desde cualquier puesto. Sale en Pedidos › «Borradores» para todos, no cuenta
  como pendiente ni va a CoordinaOT, y desaparece al guardarlo para revisión o con «Descartar
  borrador». Se guarda en la carpeta de borradores de Configuración (`DRAFTS_DIRECTORY`).
```

y en «## Configuración de carpetas», después de la lista de rutas:

```md
Además, dos carpetas internas del servidor (no compartidas): la de los pedidos de remolques
guardados (`REMOLQUES_REVISION_DIRECTORY`) y la de los borradores de toldos y remolques
(`DRAFTS_DIRECTORY`, paso 08). Sin la de borradores la web funciona igual, pero no se pueden guardar
borradores.
```

- [ ] **Step 5: Batería completa**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: todo PASS (también la paridad de remolques), sin errores y build terminado.

- [ ] **Step 6: Commit y subida**

```bash
git add scripts/test-borradores-e2e.mjs .claude/skills/running-toldos-testar/SKILL.md README.md
git commit -m "test(borradores): e2e de los borradores y su documentación

Guardar borrador de toldos y de remolques, verlos en «Borradores» como otro
técnico con su etiqueta, filtro, búsqueda y «Míos», que no cuentan en
«Pedidos N», descartar uno, seguir con el de otra persona y sustituirlo
preguntando, el aviso al obtener un pedido con borrador y que desaparecen
al pasar a revisión. Las e2e de toldos y de remolques siguen igual.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git pull --rebase
git push origin main
```

---

## Después del plan

- Revisión final de toda la rama con el modelo más capaz (Opus, esfuerzo alto): orden de las comprobaciones al guardar, el bloqueo, que toldos y remolques no han cambiado salvo el borrado tras revisión, y la interacción del borrador del servidor con el del navegador en `useRemolques`.
- Para Iván, al desplegar (en una línea): `mkdir -p /var/lib/toldos-testar/borradores && pnpm install && pnpm build && pnpm deploy:check && pnpm pm2:reload`, y después poner la carpeta en Configuración › 08 «Borradores» (si `workflow-settings.json` ya existe, la semilla de `.env` no entra).

## Cobertura del spec

| Spec | Tarea |
| --- | --- |
| Decisiones 1–4: todos ven todos y se nota; uno por número, sin número no hay; con botón; desaparecen al pasar a revisión o al descartar, sin borrado automático | 1, 3, 4, 5, 6 |
| Enfoque: almacén propio, un JSON por pedido, carpeta interna, mismo para toldos y remolques; sin estado nuevo en los pedidos | 1, 2, 3 |
| 1. «Guardar borrador» en Toldos y Remolques, número y «Soy», incompleto vale; sustituir el propio; el de otro pregunta (409 `needsConfirmation`/`confirmOverwrite`); número ya en Pedidos 409 con su texto; toldos o remolques; pantalla limpia, borrador del navegador borrado, «Borrador guardado: AR…» | 1, 3, 4, 5 |
| 2. «Borradores» encima de «Por revisar», etiqueta «Borrador» y «Toldo»/«Remolque», filtro, búsqueda, «Míos»; fila con número, cliente, quién, cuándo y elementos; no cuenta ni pregunta a CoordinaOT; «Seguir con el borrador» (pregunta si hay datos) y «Descartar borrador» (confirmación) | 4, 6 |
| 3. «Obtener datos del pedido» con borrador: «AR… tiene un borrador de Jaime del 01/10. ¿Lo abres?», «Abrir borrador» / «Empezar de cero» | 4, 5 |
| 4. «Guardar para revisión» borra el borrador; si falla, el pedido queda y se registra | 3 |
| 5. Configuración paso 08, `DRAFTS_DIRECTORY`, absoluta y sin `{YYYY}`, `deploy:check`; sin carpeta, avisa y Pedidos sin borradores; fichero `<CODIGO>.json` atómico con esquema, tipo, número, cliente, fecha, `savedBy`, fechas, resumen y contenido; rutas GET/GET/PUT/DELETE con bloqueo por número; el borrador del navegador sigue | 1, 2, 3, 4 |
| Pruebas: unitarias de almacén y reglas; e2e en la aislada; las e2e de toldos y remolques siguen pasando | 1, 3, 4, 6, 7 |
