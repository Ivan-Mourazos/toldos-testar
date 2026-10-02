# Buscador de remolques en Pedidos — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que en Pedidos, junto a «Generados», un botón «Buscar remolques» abra un buscador sobre todos los pedidos de remolques guardados (todos los años) que filtre cada elemento por cliente, tipo, perfil, recogidas, medidas con margen, radios, aguas, chaflán, ventana, rotulación, bastilla, detrás distinto, material, estado y fechas; que enseñe una fila por elemento, y que al pulsarla abra la ficha de lectura del pedido con ese elemento elegido.

**Architecture:** Tres capas. (1) Un módulo puro nuevo `src/remolques/flujo/buscar.ts` con los tipos de los filtros y del resultado, la validación de los filtros que llegan al servidor y el filtrado elemento a elemento (sin Node ni disco, probado aparte). (2) En el servidor, `crearServicioPedidosRemolques` gana `buscar(cuerpo)` (lee el almacén entero con `almacen.listar()` y filtra) y `src/server.js` la ruta `POST /api/remolques/buscar`. (3) En la web, un módulo `src/client/remolques/busquedaRemolques.ts` (formulario ↔ filtros, llamada, textos de la lista) y la pantalla `src/client/remolques/BuscadorRemolques.tsx` con su hoja `src/client/coordina/buscador-remolques.css`; `ReviewsView` la abre en lugar de la bandeja y, al pulsar una fila, abre `PedidoRemolquesDetalle` con `elementoInicial`. No cambia nada de guardar, generar, borradores ni fichas.

**Tech Stack:** TypeScript (el servidor lo ejecuta sin compilar, Node ≥ 22.18: solo tipos borrables e `import type`), React 19, Express 5 (rutas en `src/server.js`, JS), vitest (entorno node; componentes con `renderToStaticMarkup`), Playwright para la e2e en una instancia aislada.

**Spec:** `docs/superpowers/specs/2026-10-02-buscador-remolques-design.md`. Patrones que se copian: `src/client/components/OrdersInbox.tsx` y `src/client/coordina/pedidos.css` (barra de filtros, `orders-search`, `orders-scope tira-3d glass-chip`, filas `bloque-3d`), `src/client/remolques/fichasClientes.ts` (llamadas a la API y sus pruebas con `vi.stubGlobal('fetch', …)`), `scripts/test-remolques-5-e2e.mjs` y `scripts/test-remolques-clientes-e2e.mjs` (e2e en su aislada, capturas).

## Decisiones del plan (lo que el spec no fija)

- **Cliente por ficha = por nombre.** Los pedidos guardados no llevan el código de cliente de RPS (`ElementoGuardado` solo guarda `version`, `tipo`, `input`, `result` y `paramsSnapshot`; el `origenRps` se queda en el borrador). Así que el filtro «Cliente» es un texto que se busca dentro del cliente del elemento (`cabecera.cliente`, o el del pedido) sin acentos, signos ni mayúsculas (`normalizarNombre` de las fichas), y la casilla sugiere los nombres de las fichas (`<datalist>`). La ficha «AYALA» encuentra «REMOLQUES AYALA» y «ENGANCHES Y REMOLQUES AYALA S.L.U». Buscar por los códigos de RPS exigiría guardar el código en el pedido (cambia el guardado, que el spec deja fuera): queda en «Después del plan».
- **Filtros que solo tienen las lonas** (perfil, recogida, alto, radios, aguas, chaflán, ventana, bastilla, detrás distinto): si se ponen, los baquetones no salen, tanto con «Sí» como con «No». Largo, ancho, rotulación, material, cliente, texto, estado y fechas valen para los dos.
- **«Alto»** es el alto de delante de la lona (`altoDelante`). **«Detrás distinto»** es la regla del cálculo, `detrasDistinto(input)`: otro ancho u otro alto detrás.
- **Medidas con margen:** cada medida (largo, ancho, alto, radio esquina, radio cumbrera, radio hombro, aguas, chaflán) lleva su margen; vacío = ± 5 cm (`MARGEN_POR_DEFECTO`), 0 = exacta; los bordes cuentan (250 ± 5 encuentra 245 y 255). Un radio, aguas o chaflán sin escribir en el elemento cuenta como 0.
- **Recogida:** un desplegable con las recogidas de los parámetros efectivos (`GET /api/remolques/parametros`, que ya incluyen las propias de las fichas) y una tira «Cualquier lado / Delante / Detrás» (por defecto, cualquier lado). Se compara sin acentos ni mayúsculas.
- **Texto libre:** se parte en palabras y **cada una** tiene que salir en el número de pedido (tal cual o normalizado, `AR.26.04286` o `AR2604286`), el cliente, la OF (tal cual o con el 0 delante) o las observaciones del elemento.
- **Estado:** «Pendientes» = todo lo que no está generado (`PENDING_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`); «Generados» = `PRODUCED`.
- **Fecha del elemento** = `cabecera.fecha` (AAAA-MM-DD); si no vale, la del pedido (`summary.orderDate`) y, si no, el día en que se guardó (`createdAt`). «Desde» y «Hasta» incluyen el día.
- **Orden:** fecha del pedido, de la más nueva a la más antigua; a igual fecha, el pedido guardado más tarde (`updatedAt`); dentro del pedido, por letra (A, B…).
- **Límite:** 500 filas (`LIMITE_FILAS`). El contador dice el total de verdad («812 remolques en 300 pedidos») y, si se corta, un aviso: «Se enseñan los 500 más nuevos: afina los filtros para ver el resto.»
- **La ruta es `POST /api/remolques/buscar`** con los filtros en JSON (las medidas son objetos anidados). Unos filtros mal hechos son un 400 que dice cuál. Sin carpeta interna configurada no hay nada que buscar (0 resultados, sin error). Cada búsqueda lee todos los ficheros del almacén (sin caché ni índice): con unos miles de pedidos va sobrado; si un día tarda, se añade caché.
- **Se busca al pulsar «Buscar» o Enter**, no a cada tecla. Al abrir el buscador por primera vez se busca sin filtros (salen los más nuevos). «Quitar filtros» vacía el formulario y vuelve a buscar.
- **Volver:** el buscador tiene «← Pedidos». Un pedido abierto desde el buscador tiene «← Buscar remolques», que vuelve al buscador con sus filtros y su resultado (viven en `ReviewsView`). Si se generan los archivos desde ese pedido, se vuelve al buscador con el resultado de antes; «Buscar» lo refresca.
- **Etiquetas en pantalla:** perfil con su nombre («Arquillado con aguas», «Baquetón»), recogidas con `etiquetaOpcion` («No / Cremallera»), medidas «190 × 136 × 103 cm» con coma decimal (`formatearNumeroEs`), fecha «30/09/2026», estado «Pendiente» (`pildora-revisar`) o «Generado» (`pildora-plantear`).
- **Ficheros de Nuevo pedido intocables:** Codex rediseña Nuevo pedido a la vez. Este plan no toca `OrderView.tsx`, `AwningColumn.tsx`, `RemolquesView.tsx`, `FormularioLona.tsx`, `FormularioBaqueton.tsx`, `nuevo-pedido.css` ni `remolques.css`. Lo nuevo va en ficheros nuevos; en `ReviewsView.tsx`, `OrdersInbox.tsx`, `PedidoRemolquesDetalle.tsx`, `servicio.ts`, `server.js` y `estilos.css` solo se cablea.
- **La e2e va en su propia aislada** (`tmp/buscador`, puertos 4314/4324), porque vacía la carpeta interna de remolques de esa aislada y siembra sus pedidos.

## Global Constraints

- Solo escritorio (1280×720 a 1920); no adaptar a móvil.
- Textos de la interfaz y comentarios en castellano llano; decimales con coma (`formatearNumeroEs` / `InputDecimal`). No citar el Excel en la interfaz.
- Diseño igual que CoordinaOT: tokens y piezas de `src/client/coordina/` (`ghost-button`, `primary-button`, `boton-3d`, `bloque-3d`, `bloque-3d-hundido`, `tira-3d`, `glass-chip`, `pestana-activa`, `pildora-*`, `orders-search`, `orders-scope`), en claro y oscuro. Sin colores propios: todo con variables de `tokens.css`.
- Nunca arrancar la web con el `.env` real. Este plan usa su propia aislada: `ISOLATED_DIR="$PWD/tmp/buscador" PORT=4314 FAKE_COORDINA_PORT=4324 bash .claude/skills/running-toldos-testar/start-isolated.sh` (Codex usa 4312; fase 5, 4311; fichas, 4313). Comprobar `/api/health`: `simulationMode` true y `fileWritesEnabled` false.
- En las pruebas no se escribe nada fuera de `tmp/` del repositorio (`path.join(process.cwd(), "tmp")` con `mkdtemp`, nunca `os.tmpdir()`).
- RPS es solo lectura; este plan no añade consultas a RPS. No se toca el servidor 192.168.0.90 (despliega Iván). `coordina-ot` y `Remolques-TGM` son de solo lectura.
- La paridad de remolques no se toca: `src/remolques/paridad-produccion.test.ts`, `src/client/remolques/resultados-paridad.test.tsx`, `src/remolques/hoja/__tests__/paridad-hoja.test.ts` y sus fixtures (`src/remolques/__fixtures__/produccion-2026-09.json` se **lee** en la e2e, no se cambia).
- No cambia nada de guardar, generar, borradores, fichas ni toldos. Las e2e que ya existen pasan sin cambiarlas.
- No tocar los ficheros de Nuevo pedido (ver «Decisiones del plan»).
- Finales de línea: `ReviewsView.tsx`, `OrdersInbox.tsx`, `PedidoRemolquesDetalle.tsx`, `server.js` y `.claude/skills/running-toldos-testar/SKILL.md` son CRLF; `servicio.ts`, `estilos.css`, `README.md` y los ficheros nuevos, LF. Mantenerlos.
- Commits en castellano explicando el porqué, terminando en `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. `git add` con rutas explícitas; nada de `git add -A`, stash, reset ni checkout de ficheros ajenos. Codex trabaja en `..\toldos-testar-codex` (rama `codex-trabajo`): para subir, `git pull --rebase origin main` y `git push origin HEAD:main`; sin worktree, `git pull --rebase` y `git push origin main`.
- Antes de subir: `pnpm test && pnpm typecheck && pnpm lint`, y `pnpm exec vite build` si se toca el cliente.
- Pantallas cambiadas: capturas con Playwright en la aislada, claro y oscuro, 1280×720 y 1600×1000, en `tmp/ui-audit/buscador-remolques/`, y mirarlas (las hace la e2e de la tarea 5).

## Orden y reparto

| Tarea | Depende de | UI independiente | Modelo recomendado |
| --- | --- | --- | --- |
| 1. Filtrado puro: tipos, validación y búsqueda | — | no | el más barato |
| 2. Servidor: `buscar` del servicio y `POST /api/remolques/buscar` | 1 | no | intermedio (Sonnet) |
| 3. Web: formulario ↔ filtros, llamada y textos | 1 | no | el más barato |
| 4. Pantalla del buscador y su cableado en Pedidos | 2, 3 | **sí** | el más capaz (Opus) |
| 5. e2e, capturas y documentación | todas | no | intermedio (Sonnet) |

Las tareas 2 y 3 no se pisan (servidor / web) y pueden ir en paralelo cuando la 1 esté hecha.

## Mapa de ficheros

Crear:
- `src/remolques/flujo/buscar.ts` — `CAMPOS_MEDIDA`, `MARGEN_POR_DEFECTO`, `LIMITE_FILAS`, `LADOS_RECOGIDA`, tipos `FiltrosBusqueda`, `FilaBusqueda`, `ResultadoBusqueda`…, `validarFiltros`, `elementoCumple`, `filaBusqueda`, `fechaElemento`, `buscarRemolques`.
- `src/remolques/flujo/__tests__/pedidos-busqueda.ts` — pedidos de prueba compartidos (no es una prueba).
- `src/remolques/flujo/__tests__/buscar.test.ts` — el filtrado.
- `src/remolques/flujo/__tests__/servicio-buscar.test.ts` — el servicio sobre un almacén de verdad en `tmp/`.
- `src/client/remolques/busquedaRemolques.ts` + `busquedaRemolques.test.ts` — formulario, filtros, llamada y textos.
- `src/client/remolques/BuscadorRemolques.tsx` + `BuscadorRemolques.test.tsx` — la pantalla.
- `src/client/coordina/buscador-remolques.css` — su rejilla, con tokens.
- `scripts/test-remolques-buscador-e2e.mjs` — prueba de punta a punta.

Modificar:
- `src/remolques/flujo/servicio.ts` (añadir `buscar`), `src/server.js` (ruta).
- `src/client/views/ReviewsView.tsx`, `src/client/components/OrdersInbox.tsx` + `OrdersInbox.test.tsx`, `src/client/remolques/PedidoRemolquesDetalle.tsx` + `PedidoRemolquesDetalle.test.tsx`, `src/client/estilos.css`.
- `README.md`, `.claude/skills/running-toldos-testar/SKILL.md`.

---

### Task 1: Filtrado puro: tipos, validación y búsqueda

Modelo recomendado: el más barato (el código está completo). Esfuerzo: bajo.

**Files:**
- Create: `src/remolques/flujo/buscar.ts`, `src/remolques/flujo/__tests__/pedidos-busqueda.ts`
- Test: `src/remolques/flujo/__tests__/buscar.test.ts`

**Interfaces:**
- Consumes: `normalizeOf` (`src/reviewRules.js`); `awningLetter` (`src/domain/awningCompleteness.js`); `detrasDistinto`, `LonaInput`, `CabeceraInput` (`src/remolques/calc/lona.ts`); `BaquetonInput` (`src/remolques/calc/baqueton.ts`); `TIPOS_PERFIL`, `TipoPerfil`, `DEFAULT_PARAMS` (`src/remolques/calc/params.ts`); `normalizarNombre` (`src/remolques/clientes/reglas.ts`); `normalizarNumeroPedido` (`src/remolques/pedidos/numero-pedido.ts`); `TipoPlanteamiento` (`src/remolques/store/types.ts`); `ErrorPedidoRemolques`, `modeloElemento`, `codigoPedido`, `resumenPedido` (`src/remolques/flujo/pedido.ts`); `ElementoGuardado`, `EstadoPedidoRemolques`, `PedidoRemolques` (`src/remolques/flujo/tipos.ts`); `emptyLona`, `emptyBaqueton` (`src/remolques/entradas-vacias.ts`, solo en las pruebas).
- Produces (constantes): `CAMPOS_MEDIDA = ["largo", "ancho", "alto", "radioEsquina", "radioCumbrera", "radioHombro", "aguas", "chaflan"] as const`, `MARGEN_POR_DEFECTO = 5`, `LIMITE_FILAS = 500`, `LADOS_RECOGIDA = ["delante", "detras", "cualquiera"] as const`.
- Produces (tipos): `CampoMedida`, `LadoRecogida`, `SiNoFiltro = "si" | "no"`, `EstadoFiltro = "pendientes" | "generados"`, `MedidaFiltro { valor: number; margen: number }`, `FiltrosBusqueda { texto?; cliente?; tipo?: TipoPlanteamiento; perfil?: TipoPerfil; recogida?: { nombre: string; lado: LadoRecogida }; medidas?: Partial<Record<CampoMedida, MedidaFiltro>>; ventana?; rotulacion?; bastilla?; detrasDistinto?: SiNoFiltro; material?; estado?: EstadoFiltro; desde?; hasta? }`, `FilaBusqueda { orderCode; numeroPedido; version; letra; tipo; cliente; fecha; modelo; largo; ancho; alto: number | null; recogeDelante; recogeAtras; material; of; estado: EstadoPedidoRemolques }`, `ResultadoBusqueda { filas: FilaBusqueda[]; total: number; pedidos: number; cortado: boolean; limite: number }`.
- Produces (funciones): `validarFiltros(bruto: unknown): FiltrosBusqueda` (lanza `ErrorPedidoRemolques` 400), `fechaElemento(pedido: PedidoRemolques, elemento: ElementoGuardado): string`, `elementoCumple(pedido: PedidoRemolques, elemento: ElementoGuardado, filtros: FiltrosBusqueda): boolean`, `filaBusqueda(pedido: PedidoRemolques, elemento: ElementoGuardado, indice: number): FilaBusqueda`, `buscarRemolques(pedidos: readonly PedidoRemolques[], filtros: FiltrosBusqueda, limite?: number): ResultadoBusqueda`.
- Produces (pruebas): `lonaGuardada(numeroPedido, version, cambios, cabecera)`, `baquetonGuardado(numeroPedido, version, cambios, cabecera)`, `pedidoGuardado(elementos, cambios?)`, `PEDIDOS_BUSQUEDA(): PedidoRemolques[]` en `__tests__/pedidos-busqueda.ts`.

- [ ] **Step 1: Escribir los pedidos de prueba**

Crear `src/remolques/flujo/__tests__/pedidos-busqueda.ts`:

```ts
import type { BaquetonInput } from "../../calc/baqueton.ts";
import type { CabeceraInput, LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { emptyBaqueton, emptyLona } from "../../entradas-vacias.ts";
import { codigoPedido, resumenPedido } from "../pedido.ts";
import type { ElementoGuardado, PedidoRemolques } from "../tipos.ts";

// Pedidos de prueba del buscador (no es una prueba): tres pedidos de dos años con cuatro elementos
// de formas distintas. Los usan buscar.test.ts y servicio-buscar.test.ts.

const cabecera = (numeroPedido: string, version: string, cambios: Partial<CabeceraInput>): CabeceraInput => ({
  ...emptyLona().cabecera, numeroPedido, version, ...cambios,
});

export function lonaGuardada(numeroPedido: string, version: string, cambios: Partial<LonaInput>, cab: Partial<CabeceraInput>): ElementoGuardado {
  const input: LonaInput = {
    ...emptyLona(),
    largo: 250, ancho: 143, altoDelante: 88, tipoPerfil: "TIPO 05", radioEsquina: 8,
    recogeDelante: "NO", recogeAtras: "GOMA", bastillaEnfundar: false, ventana: false, rotulacion: false,
    modoOllaos: "REPARTIDOS", material: "LONA NS86 2L 630 g/m² :GRIS 7037",
    ...cambios,
    cabecera: cabecera(numeroPedido, version, cab),
  };
  return { version, tipo: "lona", input, result: {} as never, paramsSnapshot: DEFAULT_PARAMS };
}

export function baquetonGuardado(numeroPedido: string, version: string, cambios: Partial<BaquetonInput>, cab: Partial<CabeceraInput>): ElementoGuardado {
  const input: BaquetonInput = {
    ...emptyBaqueton(),
    largo: 260, ancho: 160, baqueton: 12, rotulacion: false, modoOllaos: "REPARTIDOS",
    material: "LONA ALPHA 1L 580 g/m² :AZUL 5015",
    ...cambios,
    cabecera: cabecera(numeroPedido, version, cab),
  };
  return { version, tipo: "baqueton", input, result: {} as never, paramsSnapshot: DEFAULT_PARAMS };
}

export function pedidoGuardado(elementos: ElementoGuardado[], cambios: Partial<PedidoRemolques> = {}): PedidoRemolques {
  const numeroPedido = elementos[0].input.cabecera.numeroPedido;
  return {
    schemaVersion: 1,
    kind: "remolques",
    orderCode: codigoPedido(numeroPedido),
    numeroPedido,
    status: "PENDING_REVIEW",
    createdAt: "2026-09-10T08:00:00.000Z",
    updatedAt: "2026-09-10T08:00:00.000Z",
    createdBy: "IVÁN",
    reviewedAt: null,
    reviewedBy: "",
    reviewNote: "",
    production: null,
    summary: resumenPedido(elementos, { technician: "IVÁN", reviewer: "" }),
    params: DEFAULT_PARAMS,
    elementos,
    ...cambios,
  };
}

/** AR2604286 (A lona, B baquetón), AR2605000 generado (A lona) y AR2501234 del año pasado (A lona). */
export const PEDIDOS_BUSQUEDA = (): PedidoRemolques[] => [
  pedidoGuardado([
    lonaGuardada("AR.26.04286", "10",
      { ventana: true, ventanaAncho: 40, ventanaAlto: 30, observaciones: "LLEVA CINTA REFLECTANTE" },
      { cliente: "TALLERES CAL", fecha: "2026-09-10", ordenFabricacion: "231780" }),
    baquetonGuardado("AR.26.04286", "11",
      { rotulacion: true },
      { cliente: "TALLERES CAL", fecha: "2026-09-10", ordenFabricacion: "231781" }),
  ]),
  pedidoGuardado([
    lonaGuardada("AR.26.05000", "10",
      {
        tipoPerfil: "TIPO 03", largo: 253, ancho: 152, anchoAtras: 153.5, altoDelante: 125, radioEsquina: 0,
        aguas: 16, radioCumbrera: 20, radioHombro: 10, recogeAtras: "CREMALLERA", bastillaEnfundar: true,
        material: "LONA NS86 2L 630 g/m² :GRIS CLARO 7038",
      },
      { cliente: "HIJOS DE PEDRO LÓPEZ, S.L.", fecha: "2026-09-20", ordenFabricacion: "240001" }),
  ], { status: "PRODUCED", updatedAt: "2026-09-21T08:00:00.000Z" }),
  pedidoGuardado([
    lonaGuardada("AR.25.01234", "10",
      {
        tipoPerfil: "TIPO 04", largo: 190, ancho: 136, altoDelante: 103, radioEsquina: 0, chaflan: 12,
        recogeDelante: "CREMALLERA", recogeAtras: "VELCRO",
      },
      { cliente: "REMOLQUES AYALA", fecha: "2025-12-01", ordenFabricacion: "199999" }),
  ], { createdAt: "2025-12-01T08:00:00.000Z", updatedAt: "2025-12-01T08:00:00.000Z" }),
];
```

- [ ] **Step 2: Escribir las pruebas que fallan**

Crear `src/remolques/flujo/__tests__/buscar.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buscarRemolques, filaBusqueda, validarFiltros, type FiltrosBusqueda, type ResultadoBusqueda } from "../buscar.ts";
import { ErrorPedidoRemolques } from "../pedido.ts";
import { PEDIDOS_BUSQUEDA } from "./pedidos-busqueda.ts";

// P1 = AR2604286 (A lona TIPO 05, B baquetón), P2 = AR2605000 (generado), P3 = AR2501234 (2025).
const claves = (r: ResultadoBusqueda) => r.filas.map((f) => `${f.orderCode}-${f.letra}`);
const buscar = (filtros: FiltrosBusqueda) => claves(buscarRemolques(PEDIDOS_BUSQUEDA(), filtros));

describe("validarFiltros", () => {
  it("sin cuerpo no hay filtros; quita lo vacío, recorta textos y pone el margen por defecto", () => {
    expect(validarFiltros(undefined)).toEqual({});
    expect(validarFiltros(null)).toEqual({});
    expect(validarFiltros({
      texto: "  ", cliente: " cal ", estado: "", ventana: null,
      medidas: { largo: { valor: 250 }, ancho: null, aguas: { valor: 10, margen: 0 } },
      recogida: { nombre: "GOMA" },
    })).toEqual({
      cliente: "cal",
      medidas: { largo: { valor: 250, margen: 5 }, aguas: { valor: 10, margen: 0 } },
      recogida: { nombre: "GOMA", lado: "cualquiera" },
    });
  });

  it("rechaza con un 400 lo que no es un filtro válido y dice cuál", () => {
    expect(() => validarFiltros([])).toThrow(ErrorPedidoRemolques);
    expect(() => validarFiltros({ medidas: { largo: { valor: "x" } } })).toThrow(/largo/);
    expect(() => validarFiltros({ medidas: { largo: { valor: 200, margen: -1 } } })).toThrow(/largo/);
    expect(() => validarFiltros({ medidas: { peso: { valor: 1 } } })).toThrow(/peso/);
    expect(() => validarFiltros({ perfil: "TIPO 09" })).toThrow(/perfil/);
    expect(() => validarFiltros({ tipo: "toldo" })).toThrow(/tipo/);
    expect(() => validarFiltros({ recogida: { nombre: "GOMA", lado: "arriba" } })).toThrow(/lado de la recogida/);
    expect(() => validarFiltros({ desde: "30/09/2026" })).toThrow(/desde/);
    expect(() => validarFiltros({ ventana: "quizá" })).toThrow(/ventana/);
    try {
      validarFiltros({ texto: 5 });
      expect.unreachable();
    } catch (error) {
      expect((error as ErrorPedidoRemolques).statusCode).toBe(400);
      expect((error as Error).message).toContain("«texto» tiene que ser un texto.");
    }
  });
});

describe("buscarRemolques", () => {
  it("sin filtros salen todos los elementos, de la fecha más nueva a la más antigua y por letra", () => {
    const r = buscarRemolques(PEDIDOS_BUSQUEDA(), {});
    expect(claves(r)).toEqual(["AR2605000-A", "AR2604286-A", "AR2604286-B", "AR2501234-A"]);
    expect(r).toMatchObject({ total: 4, pedidos: 3, cortado: false, limite: 500 });
  });

  it("con límite: salen los más nuevos, el total de verdad y el aviso de corte", () => {
    const r = buscarRemolques(PEDIDOS_BUSQUEDA(), {}, 2);
    expect(claves(r)).toEqual(["AR2605000-A", "AR2604286-A"]);
    expect(r).toMatchObject({ total: 4, pedidos: 3, cortado: true, limite: 2 });
  });

  it("cada fila lleva lo que enseña la lista", () => {
    const [p1, p2] = PEDIDOS_BUSQUEDA();
    expect(filaBusqueda(p2, p2.elementos[0], 0)).toEqual({
      orderCode: "AR2605000", numeroPedido: "AR.26.05000", version: "10", letra: "A", tipo: "lona",
      cliente: "HIJOS DE PEDRO LÓPEZ, S.L.", fecha: "2026-09-20", modelo: "Arquillado con aguas",
      largo: 253, ancho: 152, alto: 125, recogeDelante: "NO", recogeAtras: "CREMALLERA",
      material: "LONA NS86 2L 630 g/m² :GRIS CLARO 7038", of: "0240001", estado: "PRODUCED",
    });
    expect(filaBusqueda(p1, p1.elementos[1], 1)).toMatchObject({
      version: "11", letra: "B", tipo: "baqueton", modelo: "Baquetón", alto: null, recogeDelante: "", recogeAtras: "", of: "0231781",
    });
  });

  it("texto libre: número como se escribió o normalizado, cliente, OF y observaciones; cada palabra tiene que salir", () => {
    expect(buscar({ texto: "ar.26.04286" })).toEqual(["AR2604286-A", "AR2604286-B"]);
    expect(buscar({ texto: "AR2604286" })).toEqual(["AR2604286-A", "AR2604286-B"]);
    expect(buscar({ texto: "pedro lopez" })).toEqual(["AR2605000-A"]);
    expect(buscar({ texto: "231781" })).toEqual(["AR2604286-B"]);
    expect(buscar({ texto: "0231781" })).toEqual(["AR2604286-B"]);
    expect(buscar({ texto: "reflectante" })).toEqual(["AR2604286-A"]);
    expect(buscar({ texto: "cal 231780" })).toEqual(["AR2604286-A"]);
    expect(buscar({ texto: "cal ayala" })).toEqual([]);
  });

  it("cliente: por nombre o por el de su ficha, sin acentos ni mayúsculas", () => {
    expect(buscar({ cliente: "hijos de pedro lopez" })).toEqual(["AR2605000-A"]);
    expect(buscar({ cliente: "AYALA" })).toEqual(["AR2501234-A"]);
  });

  it("tipo y perfil", () => {
    expect(buscar({ tipo: "baqueton" })).toEqual(["AR2604286-B"]);
    expect(buscar({ tipo: "lona" })).toEqual(["AR2605000-A", "AR2604286-A", "AR2501234-A"]);
    expect(buscar({ perfil: "TIPO 03" })).toEqual(["AR2605000-A"]);
  });

  it("recogidas: delante, detrás o cualquier lado, sin mayúsculas", () => {
    expect(buscar({ recogida: { nombre: "CREMALLERA", lado: "detras" } })).toEqual(["AR2605000-A"]);
    expect(buscar({ recogida: { nombre: "CREMALLERA", lado: "delante" } })).toEqual(["AR2501234-A"]);
    expect(buscar({ recogida: { nombre: "cremallera", lado: "cualquiera" } })).toEqual(["AR2605000-A", "AR2501234-A"]);
    expect(buscar({ recogida: { nombre: "GOMA", lado: "cualquiera" } })).toEqual(["AR2604286-A"]);
  });

  it("medidas con margen: los bordes cuentan y el baquetón entra por largo y ancho", () => {
    expect(buscar({ medidas: { largo: { valor: 255, margen: 5 } } })).toEqual(["AR2605000-A", "AR2604286-A", "AR2604286-B"]);
    expect(buscar({ medidas: { largo: { valor: 255, margen: 2 } } })).toEqual(["AR2605000-A"]);
    expect(buscar({ medidas: { largo: { valor: 250, margen: 0 }, ancho: { valor: 145, margen: 2 } } })).toEqual(["AR2604286-A"]);
    expect(buscar({ medidas: { alto: { valor: 90, margen: 5 } } })).toEqual(["AR2604286-A"]);
  });

  it("radios, aguas y chaflán (sin escribir cuenta como 0)", () => {
    expect(buscar({ medidas: { radioEsquina: { valor: 8, margen: 0 } } })).toEqual(["AR2604286-A"]);
    expect(buscar({ medidas: { radioCumbrera: { valor: 20, margen: 0 }, radioHombro: { valor: 10, margen: 0 } } })).toEqual(["AR2605000-A"]);
    expect(buscar({ medidas: { aguas: { valor: 15, margen: 1 } } })).toEqual(["AR2605000-A"]);
    expect(buscar({ medidas: { chaflan: { valor: 12, margen: 0 } } })).toEqual(["AR2501234-A"]);
    expect(buscar({ medidas: { aguas: { valor: 0, margen: 0 } } })).toEqual(["AR2604286-A", "AR2501234-A"]);
  });

  it("Sí / No: ventana, rotulación, bastilla y detrás distinto; los de lona dejan fuera los baquetones", () => {
    expect(buscar({ ventana: "si" })).toEqual(["AR2604286-A"]);
    expect(buscar({ ventana: "no" })).toEqual(["AR2605000-A", "AR2501234-A"]);
    expect(buscar({ rotulacion: "si" })).toEqual(["AR2604286-B"]);
    expect(buscar({ rotulacion: "no" })).toEqual(["AR2605000-A", "AR2604286-A", "AR2501234-A"]);
    expect(buscar({ bastilla: "si" })).toEqual(["AR2605000-A"]);
    expect(buscar({ detrasDistinto: "si" })).toEqual(["AR2605000-A"]);
    expect(buscar({ detrasDistinto: "no" })).toEqual(["AR2604286-A", "AR2501234-A"]);
  });

  it("material: texto contenido, sin mayúsculas", () => {
    expect(buscar({ material: "7038" })).toEqual(["AR2605000-A"]);
    expect(buscar({ material: "alpha" })).toEqual(["AR2604286-B"]);
  });

  it("estado: pendientes o generados", () => {
    expect(buscar({ estado: "generados" })).toEqual(["AR2605000-A"]);
    expect(buscar({ estado: "pendientes" })).toEqual(["AR2604286-A", "AR2604286-B", "AR2501234-A"]);
  });

  it("fechas del pedido: desde y hasta incluyen el día", () => {
    expect(buscar({ desde: "2026-09-15" })).toEqual(["AR2605000-A"]);
    expect(buscar({ hasta: "2025-12-31" })).toEqual(["AR2501234-A"]);
    expect(buscar({ desde: "2026-09-10", hasta: "2026-09-10" })).toEqual(["AR2604286-A", "AR2604286-B"]);
  });

  it("los filtros se combinan", () => {
    expect(buscar({ recogida: { nombre: "CREMALLERA", lado: "cualquiera" }, estado: "pendientes" })).toEqual(["AR2501234-A"]);
    expect(buscar({ cliente: "cal", tipo: "lona", ventana: "si", medidas: { largo: { valor: 250, margen: 5 } } })).toEqual(["AR2604286-A"]);
    const r = buscarRemolques(PEDIDOS_BUSQUEDA(), { cliente: "cal" });
    expect(r).toMatchObject({ total: 2, pedidos: 1 });
  });
});
```

- [ ] **Step 3: Ejecutar las pruebas para ver que fallan**

Run: `pnpm exec vitest run src/remolques/flujo/__tests__/buscar.test.ts`
Expected: FAIL, no encuentra `../buscar.ts`.

- [ ] **Step 4: Escribir el módulo**

Crear `src/remolques/flujo/buscar.ts`:

```ts
import { awningLetter } from "../../domain/awningCompleteness.js";
import { normalizeOf } from "../../reviewRules.js";
import { detrasDistinto, type LonaInput } from "../calc/lona.ts";
import { TIPOS_PERFIL, type TipoPerfil } from "../calc/params.ts";
import { normalizarNombre } from "../clientes/reglas.ts";
import { normalizarNumeroPedido } from "../pedidos/numero-pedido.ts";
import type { TipoPlanteamiento } from "../store/types.ts";
import { ErrorPedidoRemolques, modeloElemento } from "./pedido.ts";
import type { ElementoGuardado, EstadoPedidoRemolques, PedidoRemolques } from "./tipos.ts";

// El buscador de remolques (diseño 02/10/2026): filtra, elemento a elemento, todos los pedidos de
// remolques guardados por las características del remolque. Puro, sin Node ni disco: lo usan el
// servidor (POST /api/remolques/buscar) y las pruebas; la web solo toma sus tipos y constantes.

export const CAMPOS_MEDIDA = ["largo", "ancho", "alto", "radioEsquina", "radioCumbrera", "radioHombro", "aguas", "chaflan"] as const;
export type CampoMedida = (typeof CAMPOS_MEDIDA)[number];
/** El margen de una medida si no se escribe otro: ± 5 cm. */
export const MARGEN_POR_DEFECTO = 5;
/** Cuántas filas devuelve como mucho una búsqueda (las más nuevas). */
export const LIMITE_FILAS = 500;
export const LADOS_RECOGIDA = ["delante", "detras", "cualquiera"] as const;
export type LadoRecogida = (typeof LADOS_RECOGIDA)[number];
const SI_NO = ["si", "no"] as const;
export type SiNoFiltro = (typeof SI_NO)[number];
const ESTADOS = ["pendientes", "generados"] as const;
export type EstadoFiltro = (typeof ESTADOS)[number];
const TIPOS: readonly TipoPlanteamiento[] = ["lona", "baqueton"];

/** Una medida buscada: el valor y cuánto puede apartarse, en cm (los bordes cuentan). */
export interface MedidaFiltro {
  valor: number;
  margen: number;
}

/** Los filtros, todos opcionales: el que no está no filtra. */
export interface FiltrosBusqueda {
  /** Número de pedido (como se escribió o normalizado), cliente, OF u observaciones; cada palabra tiene que salir. */
  texto?: string;
  /** Parte del nombre del cliente (también el de una ficha), sin acentos ni mayúsculas. */
  cliente?: string;
  tipo?: TipoPlanteamiento;
  /** Solo lonas. */
  perfil?: TipoPerfil;
  /** Solo lonas. */
  recogida?: { nombre: string; lado: LadoRecogida };
  /** Largo y ancho valen para los dos; el resto, solo lonas. */
  medidas?: Partial<Record<CampoMedida, MedidaFiltro>>;
  /** Solo lonas. */
  ventana?: SiNoFiltro;
  rotulacion?: SiNoFiltro;
  /** Bastilla de enfundar. Solo lonas. */
  bastilla?: SiNoFiltro;
  /** Otro ancho u otro alto detrás. Solo lonas. */
  detrasDistinto?: SiNoFiltro;
  /** Texto contenido en el material («ALPHA», «7038»). */
  material?: string;
  estado?: EstadoFiltro;
  /** Fecha del pedido, AAAA-MM-DD; las dos incluyen el día. */
  desde?: string;
  hasta?: string;
}

/** Una fila del resultado: un elemento de un pedido. */
export interface FilaBusqueda {
  orderCode: string;
  numeroPedido: string;
  /** La versión del elemento (10, 11…): con ella se abre elegido en la ficha del pedido. */
  version: string;
  letra: string;
  tipo: TipoPlanteamiento;
  cliente: string;
  /** AAAA-MM-DD, o "" si no se sabe. */
  fecha: string;
  /** El perfil («Recto con aguas») o «Baquetón». */
  modelo: string;
  largo: number;
  ancho: number;
  /** El alto de delante; null en un baquetón. */
  alto: number | null;
  /** "" en un baquetón. */
  recogeDelante: string;
  recogeAtras: string;
  material: string;
  of: string;
  estado: EstadoPedidoRemolques;
}

export interface ResultadoBusqueda {
  filas: FilaBusqueda[];
  /** Cuántos elementos cumplen, aunque no salgan todos. */
  total: number;
  /** En cuántos pedidos están. */
  pedidos: number;
  /** true si cumplen más de `limite`: solo salen los más nuevos. */
  cortado: boolean;
  limite: number;
}

// ── Validación de lo que llega al servidor ──

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const esNumero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const vacio = (v: unknown) => v === undefined || v === null || v === "";
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function leerTexto(origen: Record<string, unknown>, clave: string, errores: string[], nombre = clave): string | undefined {
  const valor = origen[clave];
  if (vacio(valor)) return undefined;
  if (typeof valor !== "string") {
    errores.push(`«${nombre}» tiene que ser un texto.`);
    return undefined;
  }
  return valor.trim().slice(0, 200) || undefined;
}

function leerDeLista<T extends string>(
  origen: Record<string, unknown>, clave: string, valores: readonly T[], errores: string[], nombre = clave,
): T | undefined {
  const valor = origen[clave];
  if (vacio(valor)) return undefined;
  if (typeof valor !== "string" || !(valores as readonly string[]).includes(valor)) {
    errores.push(`«${nombre}» no es válido.`);
    return undefined;
  }
  return valor as T;
}

function leerFecha(origen: Record<string, unknown>, clave: string, errores: string[]): string | undefined {
  const fecha = leerTexto(origen, clave, errores);
  if (fecha && !FECHA.test(fecha)) {
    errores.push(`«${clave}» tiene que ser una fecha AAAA-MM-DD.`);
    return undefined;
  }
  return fecha;
}

function leerRecogida(bruto: unknown, errores: string[]): FiltrosBusqueda["recogida"] {
  if (vacio(bruto)) return undefined;
  if (!esObjeto(bruto)) {
    errores.push("«recogida» no es válida.");
    return undefined;
  }
  const nombre = leerTexto(bruto, "nombre", errores, "recogida");
  const lado = leerDeLista(bruto, "lado", LADOS_RECOGIDA, errores, "lado de la recogida") ?? "cualquiera";
  return nombre ? { nombre, lado } : undefined;
}

function leerMedidas(bruto: unknown, errores: string[]): FiltrosBusqueda["medidas"] {
  if (vacio(bruto)) return undefined;
  if (!esObjeto(bruto)) {
    errores.push("«medidas» no son válidas.");
    return undefined;
  }
  const medidas: Partial<Record<CampoMedida, MedidaFiltro>> = {};
  for (const [campo, medida] of Object.entries(bruto)) {
    if (!(CAMPOS_MEDIDA as readonly string[]).includes(campo)) {
      errores.push(`No se puede buscar por «${campo}».`);
      continue;
    }
    if (vacio(medida)) continue;
    const valor = esObjeto(medida) ? medida.valor : undefined;
    const margen = esObjeto(medida) && !vacio(medida.margen) ? medida.margen : MARGEN_POR_DEFECTO;
    if (!esNumero(valor) || valor < 0 || !esNumero(margen) || margen < 0) {
      errores.push(`La medida «${campo}» no es válida.`);
      continue;
    }
    medidas[campo as CampoMedida] = { valor, margen };
  }
  return Object.keys(medidas).length ? medidas : undefined;
}

/** Los filtros que manda la pantalla, comprobados. Lo vacío se quita; lo mal hecho es un 400 que dice qué. */
export function validarFiltros(bruto: unknown): FiltrosBusqueda {
  if (vacio(bruto)) return {};
  if (!esObjeto(bruto)) throw new ErrorPedidoRemolques("Los filtros de la búsqueda no son válidos.");
  const errores: string[] = [];
  const filtros: FiltrosBusqueda = {
    texto: leerTexto(bruto, "texto", errores),
    cliente: leerTexto(bruto, "cliente", errores),
    tipo: leerDeLista(bruto, "tipo", TIPOS, errores),
    perfil: leerDeLista(bruto, "perfil", TIPOS_PERFIL, errores),
    recogida: leerRecogida(bruto.recogida, errores),
    medidas: leerMedidas(bruto.medidas, errores),
    ventana: leerDeLista(bruto, "ventana", SI_NO, errores),
    rotulacion: leerDeLista(bruto, "rotulacion", SI_NO, errores),
    bastilla: leerDeLista(bruto, "bastilla", SI_NO, errores),
    detrasDistinto: leerDeLista(bruto, "detrasDistinto", SI_NO, errores),
    material: leerTexto(bruto, "material", errores),
    estado: leerDeLista(bruto, "estado", ESTADOS, errores),
    desde: leerFecha(bruto, "desde", errores),
    hasta: leerFecha(bruto, "hasta", errores),
  };
  if (errores.length) throw new ErrorPedidoRemolques(`Los filtros de la búsqueda no son válidos: ${errores.join(" ")}`);
  return Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor !== undefined)) as FiltrosBusqueda;
}

// ── Filtrado ──

const norm = (valor: string | null | undefined) => normalizarNombre(String(valor ?? ""));
const contiene = (donde: string | null | undefined, que: string) => norm(donde).includes(norm(que));
const cerca = (valor: number, filtro: MedidaFiltro) => Math.abs(valor - filtro.valor) <= filtro.margen + 1e-9;
const cumpleSiNo = (filtro: SiNoFiltro | undefined, valor: boolean) => filtro === undefined || (filtro === "si") === valor;

/** Las medidas que solo tienen las lonas; en un baquetón no hay. Lo que no se escribió cuenta como 0. */
const MEDIDA_LONA: Record<Exclude<CampoMedida, "largo" | "ancho">, (lona: LonaInput) => number> = {
  alto: (lona) => lona.altoDelante,
  radioEsquina: (lona) => lona.radioEsquina ?? 0,
  radioCumbrera: (lona) => lona.radioCumbrera ?? 0,
  radioHombro: (lona) => lona.radioHombro ?? 0,
  aguas: (lona) => lona.aguas ?? 0,
  chaflan: (lona) => lona.chaflan ?? 0,
};

function valorMedida(elemento: ElementoGuardado, campo: CampoMedida): number | null {
  if (campo === "largo") return elemento.input.largo;
  if (campo === "ancho") return elemento.input.ancho;
  return elemento.tipo === "lona" ? MEDIDA_LONA[campo](elemento.input as LonaInput) : null;
}

const clienteElemento = (pedido: PedidoRemolques, elemento: ElementoGuardado) =>
  elemento.input.cabecera.cliente?.trim() || pedido.summary.customer || "";

/** La fecha del pedido de un elemento (AAAA-MM-DD): la de su cabecera, la del pedido o el día en que se guardó. */
export function fechaElemento(pedido: PedidoRemolques, elemento: ElementoGuardado): string {
  for (const fecha of [elemento.input.cabecera.fecha, pedido.summary.orderDate, pedido.createdAt]) {
    const corta = String(fecha ?? "").slice(0, 10);
    if (FECHA.test(corta)) return corta;
  }
  return "";
}

function cumpleTexto(pedido: PedidoRemolques, elemento: ElementoGuardado, texto: string): boolean {
  const of = elemento.input.cabecera.ordenFabricacion ?? "";
  const donde = norm([
    pedido.numeroPedido, pedido.orderCode, clienteElemento(pedido, elemento), of, normalizeOf(of), elemento.input.observaciones,
  ].join(" "));
  return texto.split(/\s+/)
    .map((palabra) => ({ palabra: norm(palabra), numero: normalizarNumeroPedido(palabra) }))
    .filter(({ palabra, numero }) => palabra !== "" || numero !== "")
    .every(({ palabra, numero }) => (palabra !== "" && donde.includes(palabra)) || (numero !== "" && pedido.orderCode.includes(numero)));
}

function cumpleRecogida(lona: LonaInput, { nombre, lado }: { nombre: string; lado: LadoRecogida }): boolean {
  const buscada = norm(nombre);
  const delante = norm(lona.recogeDelante) === buscada;
  const atras = norm(lona.recogeAtras) === buscada;
  return lado === "delante" ? delante : lado === "detras" ? atras : delante || atras;
}

/** ¿Cumple este elemento de este pedido todos los filtros? */
export function elementoCumple(pedido: PedidoRemolques, elemento: ElementoGuardado, filtros: FiltrosBusqueda): boolean {
  const f = filtros;
  if (f.texto && !cumpleTexto(pedido, elemento, f.texto)) return false;
  if (f.cliente && !contiene(clienteElemento(pedido, elemento), f.cliente)) return false;
  if (f.tipo && elemento.tipo !== f.tipo) return false;
  if (f.estado && (pedido.status === "PRODUCED") !== (f.estado === "generados")) return false;
  const fecha = fechaElemento(pedido, elemento);
  if (f.desde && (!fecha || fecha < f.desde)) return false;
  if (f.hasta && (!fecha || fecha > f.hasta)) return false;
  if (f.material && !contiene(elemento.input.material, f.material)) return false;
  if (!cumpleSiNo(f.rotulacion, elemento.input.rotulacion === true)) return false;
  for (const [campo, medida] of Object.entries(f.medidas ?? {}) as [CampoMedida, MedidaFiltro][]) {
    const valor = valorMedida(elemento, campo);
    if (valor === null || !cerca(valor, medida)) return false;
  }
  // Lo que solo tienen las lonas: con cualquiera de estos filtros puestos, un baquetón no sale.
  if (!(f.perfil || f.recogida || f.ventana || f.bastilla || f.detrasDistinto)) return true;
  if (elemento.tipo !== "lona") return false;
  const lona = elemento.input as LonaInput;
  if (f.perfil && lona.tipoPerfil !== f.perfil) return false;
  if (f.recogida && !cumpleRecogida(lona, f.recogida)) return false;
  return cumpleSiNo(f.ventana, lona.ventana === true)
    && cumpleSiNo(f.bastilla, lona.bastillaEnfundar === true)
    && cumpleSiNo(f.detrasDistinto, detrasDistinto(lona));
}

/** Lo que enseña la lista de un elemento. */
export function filaBusqueda(pedido: PedidoRemolques, elemento: ElementoGuardado, indice: number): FilaBusqueda {
  const lona = elemento.tipo === "lona" ? (elemento.input as LonaInput) : null;
  return {
    orderCode: pedido.orderCode,
    numeroPedido: pedido.numeroPedido,
    version: elemento.version,
    letra: awningLetter(indice),
    tipo: elemento.tipo,
    cliente: clienteElemento(pedido, elemento),
    fecha: fechaElemento(pedido, elemento),
    modelo: modeloElemento(elemento),
    largo: elemento.input.largo,
    ancho: elemento.input.ancho,
    alto: lona ? lona.altoDelante : null,
    recogeDelante: lona?.recogeDelante ?? "",
    recogeAtras: lona?.recogeAtras ?? "",
    material: elemento.input.material ?? "",
    of: normalizeOf(elemento.input.cabecera.ordenFabricacion ?? ""),
    estado: pedido.status,
  };
}

/**
 * Los elementos que cumplen los filtros, del pedido más nuevo al más antiguo (fecha del pedido; a
 * igual fecha, el guardado más tarde; dentro del pedido, por letra). Como mucho `limite` filas;
 * el total y los pedidos cuentan todos.
 */
export function buscarRemolques(pedidos: readonly PedidoRemolques[], filtros: FiltrosBusqueda, limite = LIMITE_FILAS): ResultadoBusqueda {
  const encontradas: { fila: FilaBusqueda; updatedAt: string; indice: number }[] = [];
  for (const pedido of pedidos) {
    pedido.elementos.forEach((elemento, indice) => {
      if (elementoCumple(pedido, elemento, filtros)) encontradas.push({ fila: filaBusqueda(pedido, elemento, indice), updatedAt: pedido.updatedAt, indice });
    });
  }
  encontradas.sort((a, b) => b.fila.fecha.localeCompare(a.fila.fecha)
    || b.updatedAt.localeCompare(a.updatedAt)
    || a.fila.orderCode.localeCompare(b.fila.orderCode)
    || a.indice - b.indice);
  return {
    filas: encontradas.slice(0, limite).map((e) => e.fila),
    total: encontradas.length,
    pedidos: new Set(encontradas.map((e) => e.fila.orderCode)).size,
    cortado: encontradas.length > limite,
    limite,
  };
}
```

- [ ] **Step 5: Ejecutar las pruebas para ver que pasan**

Run: `pnpm exec vitest run src/remolques/flujo/__tests__/buscar.test.ts`
Expected: PASS (15 pruebas).

Run: `pnpm typecheck && pnpm exec eslint src/remolques/flujo/buscar.ts src/remolques/flujo/__tests__/buscar.test.ts src/remolques/flujo/__tests__/pedidos-busqueda.ts`
Expected: sin errores.

- [ ] **Step 6: Commit**

```bash
git add src/remolques/flujo/buscar.ts src/remolques/flujo/__tests__/buscar.test.ts src/remolques/flujo/__tests__/pedidos-busqueda.ts
git commit -m "feat(remolques): filtrado del buscador de remolques

Iván quiere buscar en todo el historial de remolques por cliente,
recogidas, medidas, radios, aguas y demás. El filtrado va puro y probado
aparte: valida los filtros que lleguen al servidor (400 con lo que
falla), filtra elemento a elemento con márgenes en las medidas y ordena
del pedido más nuevo al más antiguo, con límite y aviso de corte.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Servidor: `buscar` del servicio y `POST /api/remolques/buscar`

Modelo recomendado: intermedio (Sonnet). Esfuerzo: bajo (el código está completo; hay que encajar la ruta y comprobarla en la aislada).

**Files:**
- Modify: `src/remolques/flujo/servicio.ts`, `src/server.js` (CRLF)
- Test: `src/remolques/flujo/__tests__/servicio-buscar.test.ts`

**Interfaces:**
- Consumes: de la tarea 1 `validarFiltros`, `buscarRemolques`, `ResultadoBusqueda`, `PEDIDOS_BUSQUEDA`; `crearAlmacenPedidosRemolques({ carpeta, registrar })` (`almacen.ts`, su `listar()` ya lee todos los años y se salta lo que no es un pedido); `crearServicioPedidosRemolques(deps)`; `rutaRemolques(manejar)` y `pedidosRemolques` de `src/server.js`.
- Produces: `crearServicioPedidosRemolques(...)` devuelve además `buscar(cuerpo: unknown): Promise<ResultadoBusqueda>`; ruta `POST /api/remolques/buscar` (cuerpo `FiltrosBusqueda`) → `200 ResultadoBusqueda` | `400 { error }`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/remolques/flujo/__tests__/servicio-buscar.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { crearAlmacenPedidosRemolques } from "../almacen.ts";
import { ErrorPedidoRemolques } from "../pedido.ts";
import { crearServicioPedidosRemolques } from "../servicio.ts";
import { PEDIDOS_BUSQUEDA } from "./pedidos-busqueda.ts";

// Nada fuera de tmp/ del repositorio en las pruebas.
const TMP = path.join(process.cwd(), "tmp");
const temporales: string[] = [];
afterEach(() => {
  for (const dir of temporales.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function carpetaDePrueba() {
  mkdirSync(TMP, { recursive: true });
  const raiz = mkdtempSync(path.join(TMP, "remolques-buscar-"));
  temporales.push(raiz);
  return path.join(raiz, "interna");
}

function montar(carpeta: string) {
  const registrar = vi.fn();
  const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => carpeta, registrar });
  const servicio = crearServicioPedidosRemolques({
    almacen,
    ajustes: async () => { throw new Error("El buscador no mira las carpetas compartidas."); },
    parametros: async () => DEFAULT_PARAMS,
    coordina: { statusOf: async () => ({ disponible: false }) },
    tecnicos: ["IVÁN"],
    hacerPdf: async () => new Uint8Array(),
    esPedidoDeToldos: async () => false,
  });
  return { almacen, servicio, registrar };
}

describe("buscar en los pedidos de remolques guardados", () => {
  it("busca en todos los pedidos de la carpeta interna, de todos los años, y se salta lo que no es un pedido", async () => {
    const carpeta = carpetaDePrueba();
    const { almacen, servicio, registrar } = montar(carpeta);
    for (const pedido of PEDIDOS_BUSQUEDA()) await almacen.guardar(pedido);
    writeFileSync(path.join(carpeta, "ROTO.json"), "{ roto");

    const todos = await servicio.buscar({});
    expect(todos).toMatchObject({ total: 4, pedidos: 3, cortado: false });
    expect(todos.filas.map((f) => `${f.orderCode}-${f.letra}`)).toEqual(["AR2605000-A", "AR2604286-A", "AR2604286-B", "AR2501234-A"]);
    expect(registrar).toHaveBeenCalledTimes(1);

    const cremallera = await servicio.buscar({ recogida: { nombre: "CREMALLERA", lado: "cualquiera" }, estado: "pendientes" });
    expect(cremallera.filas.map((f) => `${f.orderCode}-${f.letra}`)).toEqual(["AR2501234-A"]);
  });

  it("sin carpeta interna no hay nada que buscar", async () => {
    const { servicio } = montar("");
    expect(await servicio.buscar({})).toEqual({ filas: [], total: 0, pedidos: 0, cortado: false, limite: 500 });
  });

  it("unos filtros mal hechos son un 400 que dice cuál", async () => {
    const { servicio } = montar(carpetaDePrueba());
    const error = await servicio.buscar({ medidas: { largo: { valor: "x" } } }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorPedidoRemolques);
    expect((error as ErrorPedidoRemolques).statusCode).toBe(400);
    expect((error as Error).message).toContain("largo");
  });
});
```

- [ ] **Step 2: Ejecutar la prueba para ver que falla**

Run: `pnpm exec vitest run src/remolques/flujo/__tests__/servicio-buscar.test.ts`
Expected: FAIL, `servicio.buscar is not a function` (y error de tipos: `buscar` no existe).

- [ ] **Step 3: Añadir `buscar` al servicio**

En `src/remolques/flujo/servicio.ts`, debajo de `import { adjuntarDatosPedido } from "./adjunto.ts";` añadir:

```ts
import { buscarRemolques, validarFiltros, type ResultadoBusqueda } from "./buscar.ts";
```

Dentro de `crearServicioPedidosRemolques`, justo después de la función `listar(anio)`:

```ts
  /** El buscador (diseño 02/10/2026): todos los pedidos guardados, de todos los años, elemento a elemento. */
  async function buscar(cuerpo: unknown): Promise<ResultadoBusqueda> {
    const filtros = validarFiltros(cuerpo);
    return buscarRemolques(await deps.almacen.listar(), filtros);
  }
```

y cambiar la última línea de la función:

```ts
  return { listar, obtener, guardar, generar, vistaPrevia, archivo, buscar };
```

- [ ] **Step 4: Ejecutar la prueba para ver que pasa**

Run: `pnpm exec vitest run src/remolques/flujo/__tests__/servicio-buscar.test.ts src/remolques/flujo/__tests__/servicio.test.ts`
Expected: PASS (las 3 nuevas y las de siempre del servicio).

- [ ] **Step 5: La ruta en `src/server.js`**

En `src/server.js` (CRLF), justo después de la ruta `app.get('/api/remolques/pedidos/:orderCode/archivo', …)` y antes del comentario `// Borradores (diseño 01/10/2026)…`, añadir:

```js
// Buscador de remolques (diseño 02/10/2026): todos los pedidos guardados, de todos los años, con
// los filtros en el cuerpo. Unos filtros mal hechos son un 400 que dice cuál.
app.post('/api/remolques/buscar', rutaRemolques(async (req, res) => {
  res.set('Cache-Control', 'no-store').json(await pedidosRemolques.buscar(req.body));
}));
```

- [ ] **Step 6: Comprobarla en la aislada**

Arrancar en segundo plano (≈ 20 s): `ISOLATED_DIR="$PWD/tmp/buscador" PORT=4314 FAKE_COORDINA_PORT=4324 bash .claude/skills/running-toldos-testar/start-isolated.sh`

Run: `curl -s http://127.0.0.1:4314/api/health`
Expected: `"simulationMode":true` y `"fileWritesEnabled":false`.

Run: `curl -s -X POST http://127.0.0.1:4314/api/remolques/buscar -H "Content-Type: application/json" -d "{}"`
Expected: `{"filas":[...],"total":N,"pedidos":M,"cortado":false,"limite":500}` (con la carpeta de la aislada vacía, `"filas":[],"total":0,"pedidos":0`).

Run: `curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:4314/api/remolques/buscar -H "Content-Type: application/json" -d "{\"medidas\":{\"largo\":{\"valor\":\"x\"}}}"`
Expected: `400`.

Parar la aislada.

- [ ] **Step 7: Batería y commit**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: todo PASS.

```bash
git add src/remolques/flujo/servicio.ts src/remolques/flujo/__tests__/servicio-buscar.test.ts src/server.js
git commit -m "feat(remolques): ruta POST /api/remolques/buscar

El buscador de Pedidos pregunta al servidor, que recorre todos los
pedidos de remolques de la carpeta interna (todos los años, también los
pasados de la web vieja) y devuelve una fila por elemento que cumpla los
filtros. Sin carpeta interna no hay nada que buscar.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Web: formulario ↔ filtros, llamada y textos

Modelo recomendado: el más barato (el código está completo). Esfuerzo: bajo.

**Files:**
- Create: `src/client/remolques/busquedaRemolques.ts`
- Test: `src/client/remolques/busquedaRemolques.test.ts`

**Interfaces:**
- Consumes: de la tarea 1 `CAMPOS_MEDIDA`, `MARGEN_POR_DEFECTO`, `CampoMedida`, `EstadoFiltro`, `FilaBusqueda`, `FiltrosBusqueda`, `LadoRecogida`, `MedidaFiltro`, `ResultadoBusqueda`, `SiNoFiltro`; `TipoPerfil` (`calc/params.ts`); `TipoPlanteamiento`; `etiquetaOpcion` (`src/remolques/etiquetas.ts`); `leerFichas()` (`src/client/remolques/fichasClientes.ts`); `formatearNumeroEs` (`src/client/remolques/numeroEs.ts`).
- Produces: `RUTA_BUSCAR = '/api/remolques/buscar'`, `ETIQUETAS_MEDIDA: Record<CampoMedida, string>`, `interface MedidaFormulario { valor: number | null; margen: number | null }`, `interface FormularioBusqueda { texto; cliente; tipo: '' | TipoPlanteamiento; perfil: '' | TipoPerfil; recogida: string; ladoRecogida: LadoRecogida; medidas: Record<CampoMedida, MedidaFormulario>; ventana; rotulacion; bastilla; detrasDistinto: '' | SiNoFiltro; material; estado: '' | EstadoFiltro; desde; hasta }`, `interface EstadoBuscador { formulario: FormularioBusqueda; resultado: ResultadoBusqueda | null }`, `interface OpcionesBuscador { recogidas: string[]; clientes: string[] }`, `formularioVacio(): FormularioBusqueda`, `estadoBuscadorInicial(): EstadoBuscador`, `filtrosDesdeFormulario(f: FormularioBusqueda): FiltrosBusqueda`, `buscarRemolques(filtros: FiltrosBusqueda): Promise<ResultadoBusqueda>`, `leerOpcionesBuscador(): Promise<OpcionesBuscador>` (nunca falla), `textoContador(r: ResultadoBusqueda): string`, `textoCorte(r: ResultadoBusqueda): string`, `textoMedidas(fila: FilaBusqueda): string`, `textoRecogidas(fila: FilaBusqueda): string`, `fechaCorta(fecha: string): string`.

El fichero se llama `busquedaRemolques.ts` (no `buscadorRemolques.ts`): en Windows, que no distingue mayúsculas, `./BuscadorRemolques` podría resolver al `.ts` en vez de al `.tsx`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/client/remolques/busquedaRemolques.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FilaBusqueda, ResultadoBusqueda } from '../../remolques/flujo/buscar.ts';
import {
  buscarRemolques, estadoBuscadorInicial, fechaCorta, filtrosDesdeFormulario, formularioVacio, leerOpcionesBuscador, RUTA_BUSCAR,
  textoContador, textoCorte, textoMedidas, textoRecogidas,
} from './busquedaRemolques';

afterEach(() => vi.unstubAllGlobals());
const respuesta = (status: number, datos: unknown) => ({ ok: status < 400, status, json: async () => datos });
const fila = (cambios: Partial<FilaBusqueda> = {}): FilaBusqueda => ({
  orderCode: 'AR2501234', numeroPedido: 'AR.25.01234', version: '10', letra: 'A', tipo: 'lona', cliente: 'REMOLQUES AYALA',
  fecha: '2025-12-01', modelo: 'Con chaflán', largo: 190, ancho: 136.5, alto: 103, recogeDelante: 'NO', recogeAtras: 'CREMALLERA',
  material: 'LONA NS86', of: '0199999', estado: 'PENDING_REVIEW', ...cambios,
});
const resultado = (cambios: Partial<ResultadoBusqueda> = {}): ResultadoBusqueda => ({ filas: [], total: 0, pedidos: 0, cortado: false, limite: 500, ...cambios });

describe('formulario del buscador → filtros', () => {
  it('vacío no filtra nada', () => {
    expect(filtrosDesdeFormulario(formularioVacio())).toEqual({});
    expect(estadoBuscadorInicial()).toEqual({ formulario: formularioVacio(), resultado: null });
  });

  it('recorta textos, quita lo vacío y pone el margen por defecto a las medidas sin margen', () => {
    const f = formularioVacio();
    f.texto = ' AR.26.04286 ';
    f.cliente = 'ayala';
    f.tipo = 'lona';
    f.perfil = 'TIPO 04';
    f.recogida = 'CREMALLERA';
    f.ladoRecogida = 'delante';
    f.medidas.largo = { valor: 190, margen: null };
    f.medidas.aguas = { valor: 10, margen: 1.5 };
    f.medidas.ancho = { valor: null, margen: 3 };
    f.ventana = 'no';
    f.material = ' 7038 ';
    f.estado = 'pendientes';
    f.desde = '2025-01-01';
    f.hasta = '2025-12-31';
    expect(filtrosDesdeFormulario(f)).toEqual({
      texto: 'AR.26.04286', cliente: 'ayala', tipo: 'lona', perfil: 'TIPO 04',
      recogida: { nombre: 'CREMALLERA', lado: 'delante' },
      medidas: { largo: { valor: 190, margen: 5 }, aguas: { valor: 10, margen: 1.5 } },
      ventana: 'no', material: '7038', estado: 'pendientes', desde: '2025-01-01', hasta: '2025-12-31',
    });
  });
});

describe('llamada al servidor', () => {
  it('manda los filtros por POST y devuelve el resultado', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(200, resultado({ total: 0 })));
    vi.stubGlobal('fetch', fetchMock);
    expect(await buscarRemolques({ cliente: 'cal' })).toEqual(resultado());
    expect(fetchMock.mock.calls[0][0]).toBe(RUTA_BUSCAR);
    expect(fetchMock.mock.calls[0][1].method).toBe('POST');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ cliente: 'cal' });
  });

  it('si el servidor no puede, su mensaje; si la respuesta no tiene forma, un aviso', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(respuesta(400, { error: 'Los filtros de la búsqueda no son válidos: La medida «largo» no es válida.' }))
      .mockResolvedValueOnce(respuesta(200, {})));
    await expect(buscarRemolques({})).rejects.toThrow('La medida «largo» no es válida.');
    await expect(buscarRemolques({})).rejects.toThrow('La respuesta de la búsqueda no es válida.');
  });

  it('opciones: las recogidas de los parámetros y los nombres de las fichas; si algo falla, vacío', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url === '/api/remolques/parametros'
      ? respuesta(200, { recogidas: [{ nombre: 'NO' }, { nombre: 'GOMA' }, { nombre: 'PUENTES HIJOS DE PEDRO LOPEZ' }] })
      : respuesta(200, { fichas: [{ id: 'gw', nombre: 'GENERAL WOLDER', codigosRps: [] }, { id: 'ayala', nombre: 'AYALA', codigosRps: [] }] }))));
    expect(await leerOpcionesBuscador()).toEqual({ recogidas: ['NO', 'GOMA', 'PUENTES HIJOS DE PEDRO LOPEZ'], clientes: ['AYALA', 'GENERAL WOLDER'] });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('caído')));
    expect(await leerOpcionesBuscador()).toEqual({ recogidas: [], clientes: [] });
  });
});

describe('textos de la lista', () => {
  it('contador en singular y plural, sin resultados y aviso de corte', () => {
    expect(textoContador(resultado({ total: 1, pedidos: 1 }))).toBe('1 remolque en 1 pedido');
    expect(textoContador(resultado({ total: 5, pedidos: 3 }))).toBe('5 remolques en 3 pedidos');
    expect(textoContador(resultado())).toBe('Ningún remolque cumple estos filtros');
    expect(textoCorte(resultado({ total: 812, pedidos: 300, cortado: true }))).toBe('Se enseñan los 500 más nuevos: afina los filtros para ver el resto.');
  });

  it('medidas con coma, recogidas con su nombre y fecha corta', () => {
    expect(textoMedidas(fila())).toBe('190 × 136,5 × 103 cm');
    expect(textoMedidas(fila({ tipo: 'baqueton', alto: null, largo: 260, ancho: 160 }))).toBe('260 × 160 cm');
    expect(textoRecogidas(fila())).toBe('No / Cremallera');
    expect(textoRecogidas(fila({ recogeDelante: '', recogeAtras: 'PUENTES ESVA' }))).toBe('— / Puentes ESVA');
    expect(textoRecogidas(fila({ tipo: 'baqueton', recogeDelante: '', recogeAtras: '' }))).toBe('—');
    expect(fechaCorta('2025-12-01')).toBe('01/12/2025');
    expect(fechaCorta('')).toBe('—');
  });
});
```

- [ ] **Step 2: Ejecutar las pruebas para ver que fallan**

Run: `pnpm exec vitest run src/client/remolques/busquedaRemolques.test.ts`
Expected: FAIL, no encuentra `./busquedaRemolques`.

- [ ] **Step 3: Escribir el módulo**

Crear `src/client/remolques/busquedaRemolques.ts`:

```ts
import type { TipoPerfil } from '../../remolques/calc/params.ts';
import { etiquetaOpcion } from '../../remolques/etiquetas.ts';
import {
  CAMPOS_MEDIDA, MARGEN_POR_DEFECTO,
  type CampoMedida, type EstadoFiltro, type FilaBusqueda, type FiltrosBusqueda, type LadoRecogida, type MedidaFiltro,
  type ResultadoBusqueda, type SiNoFiltro,
} from '../../remolques/flujo/buscar.ts';
import type { TipoPlanteamiento } from '../../remolques/store/types.ts';
import { leerFichas } from './fichasClientes';
import { formatearNumeroEs } from './numeroEs';

// El buscador de remolques desde la web (diseño 02/10/2026): lo que se escribe en los filtros, los
// filtros que se mandan al servidor, la llamada y los textos de la lista. La pantalla es
// BuscadorRemolques.tsx; el filtrado de verdad lo hace el servidor (src/remolques/flujo/buscar.ts).

export const RUTA_BUSCAR = '/api/remolques/buscar';

export const ETIQUETAS_MEDIDA: Record<CampoMedida, string> = {
  largo: 'Largo',
  ancho: 'Ancho',
  alto: 'Alto delante',
  radioEsquina: 'Radio esquina',
  radioCumbrera: 'Radio cumbrera',
  radioHombro: 'Radio hombro',
  aguas: 'Aguas',
  chaflan: 'Chaflán',
};

/** Lo escrito en una medida: vacío es null (no filtra); margen vacío es ± 5 cm. */
export interface MedidaFormulario {
  valor: number | null;
  margen: number | null;
}

export interface FormularioBusqueda {
  texto: string;
  cliente: string;
  tipo: '' | TipoPlanteamiento;
  perfil: '' | TipoPerfil;
  /** El nombre de la recogida tal como se guarda («CREMALLERA»); '' = cualquiera. */
  recogida: string;
  ladoRecogida: LadoRecogida;
  medidas: Record<CampoMedida, MedidaFormulario>;
  ventana: '' | SiNoFiltro;
  rotulacion: '' | SiNoFiltro;
  bastilla: '' | SiNoFiltro;
  detrasDistinto: '' | SiNoFiltro;
  material: string;
  estado: '' | EstadoFiltro;
  /** AAAA-MM-DD (lo que da una casilla de fecha) o ''. */
  desde: string;
  hasta: string;
}

/** Lo que guarda Pedidos del buscador para que siga igual al volver de un pedido. */
export interface EstadoBuscador {
  formulario: FormularioBusqueda;
  resultado: ResultadoBusqueda | null;
}

export interface OpcionesBuscador {
  /** Las recogidas de los parámetros (con las propias de las fichas), por su nombre guardado. */
  recogidas: string[];
  /** Los nombres de las fichas de cliente, para sugerir en «Cliente». */
  clientes: string[];
}

export function formularioVacio(): FormularioBusqueda {
  return {
    texto: '', cliente: '', tipo: '', perfil: '', recogida: '', ladoRecogida: 'cualquiera',
    medidas: Object.fromEntries(CAMPOS_MEDIDA.map((campo) => [campo, { valor: null, margen: null }])) as Record<CampoMedida, MedidaFormulario>,
    ventana: '', rotulacion: '', bastilla: '', detrasDistinto: '', material: '', estado: '', desde: '', hasta: '',
  };
}

export const estadoBuscadorInicial = (): EstadoBuscador => ({ formulario: formularioVacio(), resultado: null });

const esNumero = (valor: number | null): valor is number => valor !== null && Number.isFinite(valor);

/** Los filtros que se mandan: sin lo vacío; una medida sin margen lleva el de por defecto. */
export function filtrosDesdeFormulario(f: FormularioBusqueda): FiltrosBusqueda {
  const filtros: FiltrosBusqueda = {};
  if (f.texto.trim()) filtros.texto = f.texto.trim();
  if (f.cliente.trim()) filtros.cliente = f.cliente.trim();
  if (f.tipo) filtros.tipo = f.tipo;
  if (f.perfil) filtros.perfil = f.perfil;
  if (f.recogida) filtros.recogida = { nombre: f.recogida, lado: f.ladoRecogida };
  const medidas: Partial<Record<CampoMedida, MedidaFiltro>> = {};
  for (const campo of CAMPOS_MEDIDA) {
    const { valor, margen } = f.medidas[campo];
    if (esNumero(valor)) medidas[campo] = { valor, margen: esNumero(margen) ? margen : MARGEN_POR_DEFECTO };
  }
  if (Object.keys(medidas).length) filtros.medidas = medidas;
  if (f.ventana) filtros.ventana = f.ventana;
  if (f.rotulacion) filtros.rotulacion = f.rotulacion;
  if (f.bastilla) filtros.bastilla = f.bastilla;
  if (f.detrasDistinto) filtros.detrasDistinto = f.detrasDistinto;
  if (f.material.trim()) filtros.material = f.material.trim();
  if (f.estado) filtros.estado = f.estado;
  if (f.desde) filtros.desde = f.desde;
  if (f.hasta) filtros.hasta = f.hasta;
  return filtros;
}

export async function buscarRemolques(filtros: FiltrosBusqueda): Promise<ResultadoBusqueda> {
  const respuesta = await fetch(RUTA_BUSCAR, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filtros),
    cache: 'no-store',
  });
  const datos = await respuesta.json().catch(() => ({})) as Partial<ResultadoBusqueda> & { error?: string };
  if (!respuesta.ok) throw new Error(datos.error || 'No se pudo buscar en los pedidos de remolques.');
  if (!Array.isArray(datos.filas)) throw new Error('La respuesta de la búsqueda no es válida.');
  return datos as ResultadoBusqueda;
}

/** Las opciones de los desplegables. Nunca falla: si algo no se puede leer, esa lista va vacía. */
export async function leerOpcionesBuscador(): Promise<OpcionesBuscador> {
  const [recogidas, clientes] = await Promise.all([
    fetch('/api/remolques/parametros', { cache: 'no-store' })
      .then(async (r): Promise<string[]> => {
        if (!r.ok) return [];
        const params = await r.json() as { recogidas?: { nombre: string }[] };
        return (params.recogidas ?? []).map((recogida) => recogida.nombre).filter(Boolean);
      })
      .catch((): string[] => []),
    leerFichas()
      .then((snapshot) => snapshot.fichas.map((ficha) => ficha.nombre))
      .catch((): string[] => []),
  ]);
  return {
    recogidas: [...new Set(recogidas)],
    clientes: [...new Set(clientes)].sort((a, b) => a.localeCompare(b, 'es')),
  };
}

export function textoContador(r: ResultadoBusqueda): string {
  if (r.total === 0) return 'Ningún remolque cumple estos filtros';
  return `${r.total} ${r.total === 1 ? 'remolque' : 'remolques'} en ${r.pedidos} ${r.pedidos === 1 ? 'pedido' : 'pedidos'}`;
}

export const textoCorte = (r: ResultadoBusqueda): string =>
  `Se enseñan los ${r.limite} más nuevos: afina los filtros para ver el resto.`;

/** «190 × 136,5 × 103 cm» (largo × ancho × alto delante); un baquetón, sin alto. */
export function textoMedidas(fila: FilaBusqueda): string {
  const medidas = fila.alto === null ? [fila.largo, fila.ancho] : [fila.largo, fila.ancho, fila.alto];
  return `${medidas.map(formatearNumeroEs).join(' × ')} cm`;
}

/** «No / Cremallera» (delante / detrás); un baquetón no tiene. */
export function textoRecogidas(fila: FilaBusqueda): string {
  if (fila.tipo !== 'lona') return '—';
  const una = (valor: string) => (valor.trim() ? etiquetaOpcion(valor) : '—');
  return `${una(fila.recogeDelante)} / ${una(fila.recogeAtras)}`;
}

/** «2025-12-01» → «01/12/2025». */
export function fechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : '—';
}
```

- [ ] **Step 4: Ejecutar las pruebas para ver que pasan**

Run: `pnpm exec vitest run src/client/remolques/busquedaRemolques.test.ts`
Expected: PASS (8 pruebas).

Run: `pnpm typecheck && pnpm exec eslint src/client/remolques/busquedaRemolques.ts src/client/remolques/busquedaRemolques.test.ts`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/client/remolques/busquedaRemolques.ts src/client/remolques/busquedaRemolques.test.ts
git commit -m "feat(remolques): formulario y llamada del buscador de remolques

La pantalla del buscador necesita pasar lo escrito (con coma decimal y
medidas vacías que no filtran) a los filtros del servidor, llamar a la
ruta nueva y escribir la lista: contador, medidas, recogidas y fecha.
Va aparte y probado para que la pantalla solo pinte.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Pantalla del buscador y su cableado en Pedidos

Modelo recomendado: el más capaz (Opus). Esfuerzo: medio (el código está completo; lo delicado es el cableado de `ReviewsView` y que se vea como Pedidos; las capturas de verdad salen en la tarea 5 y sus arreglos vuelven a estos ficheros).

**Files:**
- Create: `src/client/remolques/BuscadorRemolques.tsx`, `src/client/coordina/buscador-remolques.css`
- Modify: `src/client/views/ReviewsView.tsx` (CRLF), `src/client/components/OrdersInbox.tsx` (CRLF), `src/client/remolques/PedidoRemolquesDetalle.tsx` (CRLF), `src/client/estilos.css`
- Test: `src/client/remolques/BuscadorRemolques.test.tsx`, `src/client/components/OrdersInbox.test.tsx`, `src/client/remolques/PedidoRemolquesDetalle.test.tsx`

**Interfaces:**
- Consumes: de la tarea 1 `CAMPOS_MEDIDA`, `MARGEN_POR_DEFECTO`, `CampoMedida`, `FiltrosBusqueda`, `FilaBusqueda`, `ResultadoBusqueda`; de la tarea 3 todo `busquedaRemolques.ts`; `PERFILES` (`calc/params.ts`); `etiquetaOpcion`; `SelectField({ label, value, options, onChange })` (`src/client/components/SelectField.tsx`, opciones por su etiqueta, `role="combobox"`); `InputDecimal({ value, onValor, ...input })`; `formatearNumeroEs`; `Notify`; `FichaPedidoRemolques` y `PedidoRemolquesDetalle` (ya aceptan `elementoInicial` en la ficha; `LecturaPedidoRemolques` lo usa como `versionInicial`).
- Produces: `BuscadorRemolques({ estado: EstadoBuscador; onEstado: React.Dispatch<React.SetStateAction<EstadoBuscador>>; onVolver: () => void; onAbrir: (orderCode: string, version: string) => void; onToast: Notify })`; `OrdersInbox` gana `onBuscarRemolques?: () => void` (botón «Buscar remolques» en la barra de «Generados»); `PedidoRemolquesDetalle` gana `elementoInicial?: string` y `textoVolver?: string`; `FichaPedidoRemolques` gana `textoVolver?: string` (por defecto «← Pedidos»).
- Textos y nombres accesibles que usa la e2e: botón «Buscar remolques»; título «Buscar remolques»; botones «← Pedidos», «Buscar», «Quitar filtros»; casilla «Cliente» (`<label>`); desplegables «Perfil» y «Recogida»; tiras `role="group"` «Tipo», «Estado», «Lado de la recogida», «Ventana», «Rotulación», «Bastilla de enfundar», «Detrás distinto»; casillas `aria-label` «Largo» y «Margen de largo» (y así cada medida); contador `.buscador-contador` (`role="status"`); lista «Remolques encontrados» con botones «Abrir AR.25.01234 · B»; en el pedido abierto desde aquí, «← Buscar remolques».

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/client/remolques/BuscadorRemolques.test.tsx`:

```tsx
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { FilaBusqueda, ResultadoBusqueda } from '../../remolques/flujo/buscar.ts';
import { BuscadorRemolques } from './BuscadorRemolques';
import { estadoBuscadorInicial, type EstadoBuscador } from './busquedaRemolques';

const fila = (cambios: Partial<FilaBusqueda> = {}): FilaBusqueda => ({
  orderCode: 'AR2501234', numeroPedido: 'AR.25.01234', version: '11', letra: 'B', tipo: 'lona', cliente: 'REMOLQUES AYALA',
  fecha: '2025-12-01', modelo: 'Con chaflán', largo: 190, ancho: 136, alto: 103, recogeDelante: 'CREMALLERA', recogeAtras: 'VELCRO',
  material: 'LONA NS86 2L 630 :GRIS 7037', of: '0199999', estado: 'PENDING_REVIEW', ...cambios,
});
const resultado = (cambios: Partial<ResultadoBusqueda> = {}): ResultadoBusqueda => ({
  filas: [
    fila(),
    fila({ orderCode: 'AR2605000', numeroPedido: 'AR.26.05000', version: '10', letra: 'A', tipo: 'baqueton', modelo: 'Baquetón', largo: 260.5, ancho: 160, alto: null, recogeDelante: '', recogeAtras: '', estado: 'PRODUCED' }),
  ],
  total: 2, pedidos: 2, cortado: false, limite: 500, ...cambios,
});
const nada = () => undefined;
const pintar = (estado: EstadoBuscador) => renderToStaticMarkup(
  <BuscadorRemolques estado={estado} onEstado={nada} onVolver={nada} onAbrir={nada} onToast={nada} />,
);
const conResultado = (r: ResultadoBusqueda) => ({ ...estadoBuscadorInicial(), resultado: r });

describe('el buscador de remolques', () => {
  it('los filtros del spec, con «← Pedidos», «Buscar» y «Quitar filtros»', () => {
    const html = pintar(conResultado(resultado()));
    expect(html).toContain('aria-label="Buscar remolques"');
    expect(html).toContain('← Pedidos');
    expect(html).toContain('>Buscar<');
    expect(html).toContain('Quitar filtros');
    expect(html).toContain('aria-label="Buscar en los remolques"');
    expect(html).toContain('>Cliente<');
    for (const grupo of ['Tipo', 'Estado', 'Lado de la recogida', 'Ventana', 'Rotulación', 'Bastilla de enfundar', 'Detrás distinto']) {
      expect(html).toContain(`role="group" aria-label="${grupo}"`);
    }
    expect(html).toContain('>Perfil<');
    expect(html).toContain('>Recogida<');
    expect(html).toContain('>Material<');
    expect(html).toContain('>Desde<');
    expect(html).toContain('>Hasta<');
    for (const medida of ['Largo', 'Ancho', 'Alto delante', 'Radio esquina', 'Radio cumbrera', 'Radio hombro', 'Aguas', 'Chaflán']) {
      expect(html).toContain(`aria-label="${medida}"`);
    }
    expect(html).toContain('aria-label="Margen de largo"');
    expect(html).toMatch(/aria-label="Margen de largo"[^>]*placeholder="5"|placeholder="5"[^>]*aria-label="Margen de largo"/);
  });

  it('una fila por elemento: pedido y letra, cliente, fecha, perfil, medidas, recogidas, material y estado', () => {
    const html = pintar(conResultado(resultado()));
    expect(html).toContain('2 remolques en 2 pedidos');
    expect(html).toContain('aria-label="Remolques encontrados"');
    expect(html).toContain('aria-label="Abrir AR.25.01234 · B"');
    expect(html).toContain('REMOLQUES AYALA');
    expect(html).toContain('01/12/2025');
    expect(html).toContain('Con chaflán');
    expect(html).toContain('190 × 136 × 103 cm');
    expect(html).toContain('Cremallera / Velcro');
    expect(html).toContain('>Pendiente<');
    expect(html).toContain('aria-label="Abrir AR.26.05000 · A"');
    expect(html).toContain('260,5 × 160 cm');
    expect(html).toContain('>Generado<');
  });

  it('sin resultados lo dice y no pinta la lista; si se corta, avisa', () => {
    const vacio = pintar(conResultado(resultado({ filas: [], total: 0, pedidos: 0 })));
    expect(vacio).toContain('Ningún remolque cumple estos filtros');
    expect(vacio).not.toContain('aria-label="Remolques encontrados"');
    const cortado = pintar(conResultado(resultado({ total: 812, pedidos: 300, cortado: true })));
    expect(cortado).toContain('812 remolques en 300 pedidos');
    expect(cortado).toContain('Se enseñan los 500 más nuevos: afina los filtros para ver el resto.');
  });

  it('al abrirlo por primera vez está buscando', () => {
    expect(pintar(estadoBuscadorInicial())).toContain('Buscando…');
  });
});
```

En `src/client/components/OrdersInbox.test.tsx`, dentro de `describe('Pedidos con toldos y remolques', …)`, añadir:

```tsx
  it('«Buscar remolques» en la barra de «Generados», solo si Pedidos lo ofrece', () => {
    const pintar = (onBuscarRemolques?: () => void) => renderToStaticMarkup(
      <OrdersInbox
        pending={[]} history={[]} currentUser="IVÁN" pendingLoading={false} historyLoading={false} year={2026}
        onYear={() => undefined} onOpen={() => undefined} coordinaStatus={null} onBuscarRemolques={onBuscarRemolques}
      />,
    );
    expect(pintar(() => undefined)).toMatch(/<h2>Generados<\/h2>.*orders-buscar-remolques.*Buscar remolques<\/button>/);
    expect(pintar()).not.toContain('Buscar remolques');
  });
```

En `src/client/remolques/PedidoRemolquesDetalle.test.tsx`, dentro de `describe('el pedido de remolques abierto en Pedidos', …)`, añadir:

```tsx
  it('abierto desde el buscador: vuelve al buscador y abre el elemento buscado', () => {
    expect(pintar({})).toContain('← Pedidos');
    const html = desescapar(pintar({ textoVolver: '← Buscar remolques', elementoInicial: '11' }));
    expect(html).toContain('← Buscar remolques');
    expect(html).not.toContain('← Pedidos');
    expect(html).toMatch(/aria-current="true"[^>]*><span class="rem-pestana-rotulo">B · /);
  });
```

(`desescapar` ya existe en ese fichero; si se llama de otra forma, usar la que haya.)

- [ ] **Step 2: Ejecutar las pruebas para ver que fallan**

Run: `pnpm exec vitest run src/client/remolques/BuscadorRemolques.test.tsx src/client/components/OrdersInbox.test.tsx src/client/remolques/PedidoRemolquesDetalle.test.tsx`
Expected: FAIL: no encuentra `./BuscadorRemolques`; en `OrdersInbox` no sale «Buscar remolques»; en el detalle no sale «← Buscar remolques» (y error de tipos de las props nuevas).

- [ ] **Step 3: La pantalla**

Crear `src/client/remolques/BuscadorRemolques.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { FileSearch, Search, X } from 'lucide-react';
import { PERFILES } from '../../remolques/calc/params.ts';
import { etiquetaOpcion } from '../../remolques/etiquetas.ts';
import { CAMPOS_MEDIDA, MARGEN_POR_DEFECTO, type CampoMedida, type FiltrosBusqueda } from '../../remolques/flujo/buscar.ts';
import type { Notify } from '../components/NotificationCenter';
import { SelectField } from '../components/SelectField';
import {
  buscarRemolques, ETIQUETAS_MEDIDA, fechaCorta, filtrosDesdeFormulario, formularioVacio, leerOpcionesBuscador, textoContador,
  textoCorte, textoMedidas, textoRecogidas,
  type EstadoBuscador, type FormularioBusqueda, type MedidaFormulario, type OpcionesBuscador,
} from './busquedaRemolques';
import { InputDecimal } from './InputDecimal';
import { formatearNumeroEs } from './numeroEs';

// Buscador de remolques en Pedidos (diseño 02/10/2026): filtros por las características del
// remolque sobre todos los pedidos guardados y una fila por elemento. Pulsar una fila abre la
// ficha de lectura del pedido con ese elemento elegido. Los filtros y el último resultado viven en
// ReviewsView (`estado`), para que sigan ahí al volver del pedido. Mismas piezas que Pedidos.

const CUALQUIERA = 'Cualquiera';
type Opcion<T extends string> = { value: T; label: string };

const TIPOS: Opcion<FormularioBusqueda['tipo']>[] = [
  { value: '', label: 'Todos' }, { value: 'lona', label: 'Lona' }, { value: 'baqueton', label: 'Baquetón' },
];
const ESTADOS: Opcion<FormularioBusqueda['estado']>[] = [
  { value: '', label: 'Todos' }, { value: 'pendientes', label: 'Pendientes' }, { value: 'generados', label: 'Generados' },
];
const LADOS: Opcion<FormularioBusqueda['ladoRecogida']>[] = [
  { value: 'cualquiera', label: 'Cualquier lado' }, { value: 'delante', label: 'Delante' }, { value: 'detras', label: 'Detrás' },
];
const SI_NO: Opcion<FormularioBusqueda['ventana']>[] = [
  { value: '', label: 'Da igual' }, { value: 'si', label: 'Sí' }, { value: 'no', label: 'No' },
];
const CAMPOS_SI_NO = [
  ['ventana', 'Ventana'], ['rotulacion', 'Rotulación'], ['bastilla', 'Bastilla de enfundar'], ['detrasDistinto', 'Detrás distinto'],
] as const;

/** Una tira de teclas como «Pendientes de» en Pedidos. */
function Tira<T extends string>({ etiqueta, valor, opciones, onCambio }: {
  etiqueta: string;
  valor: T;
  opciones: Opcion<T>[];
  onCambio: (valor: T) => void;
}) {
  return (
    <div className="buscador-campo">
      <span className="buscador-rotulo" aria-hidden="true">{etiqueta}</span>
      <div className="orders-scope tira-3d glass-chip" role="group" aria-label={etiqueta}>
        {opciones.map((opcion) => (
          <button key={opcion.value} type="button" className={valor === opcion.value ? 'pestana-activa' : undefined}
            aria-pressed={valor === opcion.value} onClick={() => onCambio(opcion.value)}>
            {opcion.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Una medida con su margen: «Largo [250] ± [5] cm». Vacía no filtra; margen vacío = ± 5. */
function Medida({ campo, medida, onCambio }: { campo: CampoMedida; medida: MedidaFormulario; onCambio: (medida: MedidaFormulario) => void }) {
  const etiqueta = ETIQUETAS_MEDIDA[campo];
  return (
    <div className="buscador-medida">
      <span className="buscador-rotulo">{etiqueta}</span>
      <InputDecimal aria-label={etiqueta} placeholder="—" value={medida.valor} onValor={(valor) => onCambio({ ...medida, valor })} />
      <span className="buscador-mas-menos" aria-hidden="true">±</span>
      <InputDecimal aria-label={`Margen de ${etiqueta.toLocaleLowerCase('es-ES')}`} placeholder={formatearNumeroEs(MARGEN_POR_DEFECTO)}
        value={medida.margen} onValor={(margen) => onCambio({ ...medida, margen })} />
      <span className="buscador-unidad" aria-hidden="true">cm</span>
    </div>
  );
}

export function BuscadorRemolques({ estado, onEstado, onVolver, onAbrir, onToast }: {
  estado: EstadoBuscador;
  onEstado: React.Dispatch<React.SetStateAction<EstadoBuscador>>;
  onVolver: () => void;
  /** Abre la ficha del pedido con ese elemento (por su versión) elegido. */
  onAbrir: (orderCode: string, version: string) => void;
  onToast: Notify;
}) {
  const { formulario, resultado } = estado;
  const [opciones, setOpciones] = useState<OpcionesBuscador>({ recogidas: [], clientes: [] });
  // La búsqueda en marcha. La primera vez que se abre, sin filtros: salen los más nuevos.
  const [peticion, setPeticion] = useState<{ filtros: FiltrosBusqueda } | null>(
    () => (resultado ? null : { filtros: filtrosDesdeFormulario(formulario) }),
  );
  const buscando = peticion !== null;

  useEffect(() => {
    let activo = true;
    void leerOpcionesBuscador().then((leidas) => { if (activo) setOpciones(leidas); });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (!peticion) return undefined;
    let activo = true;
    buscarRemolques(peticion.filtros)
      .then((nuevo) => { if (activo) onEstado((actual) => ({ ...actual, resultado: nuevo })); })
      .catch((error: unknown) => {
        if (activo) onToast(error instanceof Error ? error.message : 'No se pudo buscar en los pedidos de remolques.', { tone: 'error' });
      })
      .finally(() => { if (activo) setPeticion((actual) => (actual === peticion ? null : actual)); });
    return () => { activo = false; };
  }, [peticion, onEstado, onToast]);

  const cambiar = (cambios: Partial<FormularioBusqueda>) =>
    onEstado((actual) => ({ ...actual, formulario: { ...actual.formulario, ...cambios } }));
  const cambiarMedida = (campo: CampoMedida, medida: MedidaFormulario) =>
    onEstado((actual) => ({ ...actual, formulario: { ...actual.formulario, medidas: { ...actual.formulario.medidas, [campo]: medida } } }));
  const buscar = (evento: React.FormEvent) => {
    evento.preventDefault();
    setPeticion({ filtros: filtrosDesdeFormulario(formulario) });
  };
  const quitarFiltros = () => {
    onEstado((actual) => ({ ...actual, formulario: formularioVacio() }));
    setPeticion({ filtros: {} });
  };

  const perfilElegido = PERFILES.find((perfil) => perfil.value === formulario.perfil)?.label ?? CUALQUIERA;
  const recogidaElegida = formulario.recogida ? etiquetaOpcion(formulario.recogida) : CUALQUIERA;

  return (
    <section className="buscador-remolques" aria-label="Buscar remolques">
      <form className="buscador-form" onSubmit={buscar}>
        <header className="buscador-cabecera">
          <button type="button" className="ghost-button boton-3d reviews-back-button" onClick={onVolver}>← Pedidos</button>
          <h2>Buscar remolques</h2>
          <label className="orders-search">
            <Search aria-hidden="true" />
            <input type="search" value={formulario.texto} onChange={(evento) => cambiar({ texto: evento.target.value })}
              placeholder="Pedido, cliente, OF u observaciones…" aria-label="Buscar en los remolques" />
          </label>
          <div className="buscador-acciones">
            <button type="button" className="ghost-button boton-3d" disabled={buscando} onClick={quitarFiltros}>
              <X aria-hidden="true" />Quitar filtros
            </button>
            <button type="submit" className="primary-button boton-3d" disabled={buscando}>
              <Search aria-hidden="true" />Buscar
            </button>
          </div>
        </header>

        <div className="buscador-filtros bloque-3d-hundido">
          <label className="buscador-campo">
            <span className="buscador-rotulo">Cliente</span>
            <input type="text" list="buscador-clientes" value={formulario.cliente} placeholder="Nombre o ficha de cliente"
              onChange={(evento) => cambiar({ cliente: evento.target.value })} />
            <datalist id="buscador-clientes">
              {opciones.clientes.map((nombre) => <option key={nombre} value={nombre} />)}
            </datalist>
          </label>
          <Tira etiqueta="Tipo" valor={formulario.tipo} opciones={TIPOS} onCambio={(tipo) => cambiar({ tipo })} />
          <div className="buscador-campo">
            <SelectField label="Perfil" value={perfilElegido} options={[CUALQUIERA, ...PERFILES.map((perfil) => perfil.label)]}
              onChange={(valor) => cambiar({ perfil: PERFILES.find((perfil) => perfil.label === valor)?.value ?? '' })} />
          </div>
          <Tira etiqueta="Estado" valor={formulario.estado} opciones={ESTADOS} onCambio={(valor) => cambiar({ estado: valor })} />

          <div className="buscador-campo">
            <SelectField label="Recogida" value={recogidaElegida} options={[CUALQUIERA, ...opciones.recogidas.map(etiquetaOpcion)]}
              onChange={(valor) => cambiar({ recogida: opciones.recogidas.find((recogida) => etiquetaOpcion(recogida) === valor) ?? '' })} />
          </div>
          <Tira etiqueta="Lado de la recogida" valor={formulario.ladoRecogida} opciones={LADOS}
            onCambio={(ladoRecogida) => cambiar({ ladoRecogida })} />
          <label className="buscador-campo">
            <span className="buscador-rotulo">Material</span>
            <input type="text" value={formulario.material} placeholder="ALPHA, 7038…" onChange={(evento) => cambiar({ material: evento.target.value })} />
          </label>
          <div className="buscador-fechas">
            <label className="buscador-campo">
              <span className="buscador-rotulo">Desde</span>
              <input type="date" value={formulario.desde} onChange={(evento) => cambiar({ desde: evento.target.value })} />
            </label>
            <label className="buscador-campo">
              <span className="buscador-rotulo">Hasta</span>
              <input type="date" value={formulario.hasta} onChange={(evento) => cambiar({ hasta: evento.target.value })} />
            </label>
          </div>

          <div className="buscador-medidas">
            {CAMPOS_MEDIDA.map((campo) => (
              <Medida key={campo} campo={campo} medida={formulario.medidas[campo]} onCambio={(medida) => cambiarMedida(campo, medida)} />
            ))}
          </div>

          {CAMPOS_SI_NO.map(([campo, etiqueta]) => (
            <Tira key={campo} etiqueta={etiqueta} valor={formulario[campo]} opciones={SI_NO}
              onCambio={(valor) => cambiar({ [campo]: valor } as Partial<FormularioBusqueda>)} />
          ))}
        </div>
      </form>

      {buscando ? (
        <p className="buscador-contador" role="status">Buscando…</p>
      ) : resultado && resultado.total === 0 ? (
        <p className="review-empty buscador-contador" role="status"><FileSearch aria-hidden="true" />{textoContador(resultado)}</p>
      ) : resultado && (
        <p className="buscador-contador" role="status">{textoContador(resultado)}</p>
      )}
      {!buscando && resultado?.cortado && <p className="buscador-aviso pildora-aviso" role="note">{textoCorte(resultado)}</p>}

      {resultado && resultado.filas.length > 0 && (
        <div className="buscador-resultados">
          <div className="buscador-columnas" aria-hidden="true">
            <span>Pedido</span><span>Cliente</span><span>Fecha</span><span>Perfil</span><span>Medidas</span>
            <span>Recogidas (delante / detrás)</span><span>Material</span><span>Estado</span>
          </div>
          <ul className="buscador-lista" aria-label="Remolques encontrados">
            {resultado.filas.map((fila) => (
              <li key={`${fila.orderCode}-${fila.version}`}>
                <button type="button" className="buscador-fila bloque-3d" aria-label={`Abrir ${fila.numeroPedido} · ${fila.letra}`}
                  onClick={() => onAbrir(fila.orderCode, fila.version)}>
                  <strong className="buscador-pedido">{fila.numeroPedido}<span>{` · ${fila.letra}`}</span></strong>
                  <span title={fila.cliente}>{fila.cliente || 'Sin cliente'}</span>
                  <span>{fechaCorta(fila.fecha)}</span>
                  <span>{fila.modelo}</span>
                  <span>{textoMedidas(fila)}</span>
                  <span>{textoRecogidas(fila)}</span>
                  <span title={fila.material}>{fila.material || '—'}</span>
                  <span className={fila.estado === 'PRODUCED' ? 'pildora-plantear' : 'pildora-revisar'}>
                    {fila.estado === 'PRODUCED' ? 'Generado' : 'Pendiente'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Su hoja de estilo**

Crear `src/client/coordina/buscador-remolques.css`:

```css
/* Buscador de remolques en Pedidos (diseño 02/10/2026). Mismas piezas que Pedidos (pedidos.css):
   la búsqueda `orders-search`, las tiras `orders-scope tira-3d glass-chip` con `pestana-activa`,
   los botones `ghost-button` / `primary-button` con `boton-3d`, el bloque `bloque-3d-hundido` de los
   filtros y una fila `bloque-3d` por elemento. Aquí solo va la rejilla; colores, relieve y letra
   salen de tokens.css y piezas.css, igual en claro y oscuro. Solo escritorio (1280 a 1920). */

.app-shell:has(.buscador-remolques) .topbar { margin-inline: 0; max-width: none; }

/* El botón que lo abre, al final de la barra de «Generados». */
.orders-inbox-bar .orders-buscar-remolques { margin-left: auto; }

.buscador-remolques {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.buscador-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* ── Cabecera: volver, título, texto libre y acciones (como la barra de Pedidos) ── */
.buscador-cabecera {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.75rem;
}
.buscador-cabecera h2 {
  color: var(--text);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.25rem;
  margin: 0;
}
.buscador-cabecera .orders-search {
  display: block;
  flex: 1 1 14rem;
  margin: 0;
  max-width: 28rem;
  min-width: 14rem;
  position: relative;
}
.buscador-cabecera .orders-search input {
  font-size: 0.75rem;
  line-height: 1rem;
  padding: 0.375rem 1.75rem 0.375rem 2rem;
  width: 100%;
}
.buscador-acciones {
  display: inline-flex;
  gap: 0.5rem;
  margin-left: auto;
}

/* ── Filtros: una rejilla de campos con su rótulo encima ── */
.buscador-filtros {
  align-items: start;
  border-radius: 0.75rem;
  display: grid;
  gap: 0.75rem 1rem;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  padding: 0.75rem;
}
.buscador-campo {
  display: grid;
  gap: 0.25rem;
  margin: 0;
  min-width: 0;
}
.buscador-campo > .orders-scope { justify-self: start; }
.buscador-campo > input {
  font-size: 0.75rem;
  line-height: 1rem;
  padding: 0.375rem 0.625rem;
  width: 100%;
}
/* El rótulo de un filtro, como el de Pedidos (`text-[10px] font-semibold uppercase`). */
.buscador-rotulo {
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.025em;
  text-transform: uppercase;
}
.buscador-fechas {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  min-width: 0;
}

/* Las ocho medidas a lo ancho, cuatro por fila: «Largo [   ] ± [ 5 ] cm». */
.buscador-medidas {
  display: grid;
  gap: 0.5rem 1rem;
  grid-column: 1 / -1;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
.buscador-medida {
  align-items: center;
  column-gap: 0.375rem;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 3.5rem auto;
  min-width: 0;
  row-gap: 0.25rem;
}
.buscador-medida > .buscador-rotulo { grid-column: 1 / -1; }
.buscador-medida > input {
  font-size: 0.75rem;
  line-height: 1rem;
  padding: 0.375rem 0.5rem;
  width: 100%;
}
.buscador-mas-menos,
.buscador-unidad {
  color: var(--text-muted);
  font-size: 0.75rem;
}

/* ── Resultado ── */
.buscador-contador {
  color: var(--text-muted);
  font-size: 0.75rem;
  line-height: 1rem;
  margin: 0;
}
.buscador-aviso {
  align-self: flex-start;
  font-size: 0.75rem;
  margin: 0;
}
.buscador-resultados {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
/* Las mismas columnas en la cabecera y en cada fila. */
.buscador-columnas,
.buscador-fila {
  column-gap: 0.75rem;
  display: grid;
  grid-template-columns: 150px minmax(0, 1.2fr) 84px 150px 150px 190px minmax(0, 1fr) 84px;
}
.buscador-columnas {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  padding: 0 0.75rem 0.25rem;
}
.buscador-lista {
  display: grid;
  gap: 0.375rem;
  list-style: none;
  margin: 0;
  padding: 0;
}
.buscador-fila {
  align-items: center;
  border: 0;
  border-radius: 0.75rem;
  color: var(--text);
  cursor: pointer;
  font: inherit;
  font-size: 11px;
  line-height: 1rem;
  min-height: 2.25rem;
  padding: 0.375rem 0.75rem;
  text-align: left;
  width: 100%;
}
.buscador-fila:hover { background: var(--surface-2); }
.buscador-fila > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.buscador-fila > span:last-child { justify-self: start; }
.buscador-pedido {
  font-family: var(--mono);
  font-weight: 700;
  white-space: nowrap;
}
.buscador-pedido span {
  color: var(--text-muted);
  font-weight: 400;
}
```

En `src/client/estilos.css`, después de `@import './coordina/clientes-remolques.css';` añadir:

```css
@import './coordina/buscador-remolques.css';
```

- [ ] **Step 5: El botón en Pedidos (`OrdersInbox.tsx`, CRLF)**

En la firma de `OrdersInbox`, añadir `onBuscarRemolques` al destructurado (después de `onDescartarBorrador = () => undefined`) y a su tipo:

```tsx
  onDescartarBorrador?: (borrador: ResumenBorrador) => void;
  /** Abre el buscador de remolques (diseño 02/10/2026); sin él no sale el botón. */
  onBuscarRemolques?: () => void;
```

En la barra de «Generados», después de `<span className="orders-count">{sections.history.length}</span>`:

```tsx
        {onBuscarRemolques && (
          <button type="button" className="ghost-button boton-3d orders-buscar-remolques" onClick={onBuscarRemolques}>
            <Search aria-hidden="true" />Buscar remolques
          </button>
        )}
```

(`Search` ya está importado de `lucide-react`.)

- [ ] **Step 6: El pedido abierto desde el buscador (`PedidoRemolquesDetalle.tsx`, CRLF)**

En `FichaPedidoRemolques`: añadir `textoVolver = '← Pedidos'` al destructurado, a su tipo

```tsx
  /** El texto del botón de volver: «← Buscar remolques» si se abrió desde el buscador. */
  textoVolver?: string;
```

y cambiar el botón:

```tsx
  const volver = <button type="button" className="ghost-button boton-3d reviews-back-button" onClick={onBack}>{textoVolver}</button>;
```

En `PedidoRemolquesDetalle`: añadir `elementoInicial, textoVolver` al destructurado y a su tipo

```tsx
  /** El elemento que se abre elegido (por su versión): el de la fila pulsada en el buscador. */
  elementoInicial?: string;
  textoVolver?: string;
```

y pasarlos a la ficha (`<FichaPedidoRemolques … notify={onToast} elementoInicial={elementoInicial} textoVolver={textoVolver} />`).

- [ ] **Step 7: El cableado en `ReviewsView.tsx` (CRLF)**

Imports, junto a `import { PedidoRemolquesDetalle } from '../remolques/PedidoRemolquesDetalle';`:

```tsx
import { BuscadorRemolques } from '../remolques/BuscadorRemolques';
import { estadoBuscadorInicial, type EstadoBuscador } from '../remolques/busquedaRemolques';
```

Estado, justo después de `const [selectedRemolques, setSelectedRemolques] = useState('');`:

```tsx
  // El buscador de remolques (diseño 02/10/2026): si está abierto, y sus filtros y resultado, que
  // siguen ahí al abrir un pedido desde él y volver. `elementoRemolques` es el elemento buscado.
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);
  const [estadoBuscador, setEstadoBuscador] = useState<EstadoBuscador>(estadoBuscadorInicial);
  const [elementoRemolques, setElementoRemolques] = useState<string | undefined>(undefined);
```

La consulta a CoordinaOT de la bandeja tampoco corre con el buscador abierto:

```tsx
  const { status: coordinaStatus } = useCoordinaStatus(pendingOfs, selectedCode === '' && selectedRemolques === '' && !buscadorAbierto);
```

En el `return`, el pedido de remolques recibe el elemento y el texto de volver, y entre él y la bandeja va el buscador:

```tsx
      {selectedRemolques
        ? (
          <PedidoRemolquesDetalle
            orderCode={selectedRemolques}
            refreshKey={refreshKey}
            currentUser={currentUser}
            elementoInicial={elementoRemolques}
            textoVolver={buscadorAbierto ? '← Buscar remolques' : undefined}
            onBack={() => { setSelectedRemolques(''); setElementoRemolques(undefined); }}
            onCorregir={onEditRemolques}
            onReutilizar={onReuseRemolques}
            onChanged={onChanged}
            onToast={onToast}
            onConfirm={onConfirm}
          />
        )
        : buscadorAbierto
        ? (
          <BuscadorRemolques
            estado={estadoBuscador}
            onEstado={setEstadoBuscador}
            onVolver={() => setBuscadorAbierto(false)}
            onAbrir={(orderCode, version) => { setElementoRemolques(version); setSelectedRemolques(orderCode); }}
            onToast={onToast}
          />
        )
        : selectedCode === ''
        ? <OrdersInbox
            …lo de siempre…
            onDescartarBorrador={(borrador) => void descartar(borrador)}
            onBuscarRemolques={() => setBuscadorAbierto(true)}
          />
        : (
```

(Solo cambian las props nuevas de `PedidoRemolquesDetalle`, su `onBack`, el bloque del buscador y `onBuscarRemolques`; el resto del `return` sigue igual.)

- [ ] **Step 8: Ejecutar las pruebas, tipos, lint y build**

Run: `pnpm exec vitest run src/client/remolques/BuscadorRemolques.test.tsx src/client/components/OrdersInbox.test.tsx src/client/remolques/PedidoRemolquesDetalle.test.tsx`
Expected: PASS.

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: todo PASS (también la paridad de remolques), sin errores y build terminado. Si `react-hooks` se queja de algún efecto, no desactivar la regla: ajustar el efecto (las llamadas a `setState` van siempre en `then`/`finally`, nunca de forma síncrona en el cuerpo del efecto).

- [ ] **Step 9: Mirarlo a ojo en la aislada**

Arrancar la aislada de 4314 en segundo plano (como en la tarea 2), abrir `http://127.0.0.1:4314`, Pedidos → «Buscar remolques»: tiene que salir el buscador con «Ningún remolque cumple estos filtros» (la carpeta está vacía hasta la tarea 5), «← Pedidos» tiene que volver a la bandeja y el oscuro (`document.documentElement.dataset.theme = 'dark'`) tiene que verse con los mismos tokens. Las capturas con datos las hace la e2e de la tarea 5. Parar la aislada.

- [ ] **Step 10: Commit**

```bash
git add src/client/remolques/BuscadorRemolques.tsx src/client/remolques/BuscadorRemolques.test.tsx src/client/coordina/buscador-remolques.css src/client/estilos.css src/client/components/OrdersInbox.tsx src/client/components/OrdersInbox.test.tsx src/client/remolques/PedidoRemolquesDetalle.tsx src/client/remolques/PedidoRemolquesDetalle.test.tsx src/client/views/ReviewsView.tsx
git commit -m "feat(remolques): buscador de remolques en Pedidos

Junto a «Generados», «Buscar remolques» abre en la misma página un
buscador con los filtros del diseño (cliente, tipo, perfil, recogidas,
medidas con margen, radios, aguas, chaflán, sí/no, material, estado y
fechas) y una fila por elemento. Pulsar una fila abre la ficha de
lectura del pedido con ese elemento elegido; «← Buscar remolques»
vuelve con los filtros como estaban. Va en ficheros nuevos para no
pisar el rediseño de Nuevo pedido.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: e2e, capturas y documentación

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio (≈ 2 min por vuelta de la e2e; si falla o las capturas no se ven como Pedidos, el arreglo va en los ficheros de la tarea 4).

**Files:**
- Create: `scripts/test-remolques-buscador-e2e.mjs`
- Modify: `README.md`, `.claude/skills/running-toldos-testar/SKILL.md` (CRLF)

**Interfaces:**
- Consumes: todo lo anterior; `BASE_URL`, `openApp` (`.claude/skills/running-toldos-testar/drive.mjs`); `crearPedidoRemolques`, `marcarPedidoGenerado` (`src/remolques/flujo/pedido.ts`); `prepararPedidoHoja` (`src/remolques/hoja/pedido.ts`); `DEFAULT_PARAMS`; los casos `lona-02`, `baqueton-01`, `lona-08`, `lona-10` y `lona-32` de `src/remolques/__fixtures__/produccion-2026-09.json` (solo lectura).
- Produces: `scripts/test-remolques-buscador-e2e.mjs`; capturas en `tmp/ui-audit/buscador-remolques/`.

- [ ] **Step 1: Escribir la e2e**

Crear `scripts/test-remolques-buscador-e2e.mjs`:

```js
// Prueba e2e del buscador de remolques en Pedidos (diseño 02/10/2026): siembra tres pedidos de
// remolques (uno generado) en la carpeta interna de su aislada, busca por la API y en pantalla (por
// cliente, por cremallera en cualquier lado y por largo con margen), abre un resultado, comprueba
// que la ficha del pedido sale con ese elemento elegido y vuelve al buscador con sus filtros.
// Va en su propia aislada, porque vacía la carpeta interna de remolques de esa aislada:
//   ISOLATED_DIR="$PWD/tmp/buscador" PORT=4314 FAKE_COORDINA_PORT=4324 bash .claude/skills/running-toldos-testar/start-isolated.sh
//   TOLDOS_ISOLATED_URL=http://127.0.0.1:4314 node scripts/test-remolques-buscador-e2e.mjs
// Capturas en tmp/ui-audit/buscador-remolques/ (claro y oscuro, 1280×720 y 1600×1000).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { DEFAULT_PARAMS } from '../src/remolques/calc/params.ts';
import { crearPedidoRemolques, marcarPedidoGenerado } from '../src/remolques/flujo/pedido.ts';
import { prepararPedidoHoja } from '../src/remolques/hoja/pedido.ts';

const SALIDA = 'tmp/ui-audit/buscador-remolques';
fs.mkdirSync(SALIDA, { recursive: true });
assert.equal(new URL(BASE_URL).port, '4314', 'esta prueba va en su aislada de 4314: vacía la carpeta interna de remolques');
const CON_WEBGL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const ANIO = String(new Date().getFullYear());
const AA = ANIO.slice(2);
const fixture = JSON.parse(fs.readFileSync('src/remolques/__fixtures__/produccion-2026-09.json', 'utf8'));
const json = (datos) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos ?? {}) });
async function api(ruta, init) {
  const r = await fetch(`${BASE_URL}${ruta}`, init);
  return { status: r.status, datos: await r.json().catch(() => null) };
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

// ── 1. Sembrar: tres pedidos con elementos reales de producción ──
function pedido(numero, cliente, fecha, casos) {
  const elementos = casos.map(([id, version, of]) => {
    const c = fixture.find((x) => x.caso === id);
    return { version, tipo: c.tipo, input: { ...c.input, cabecera: { ...c.input.cabecera, numeroPedido: numero, version, cliente, fecha, ordenFabricacion: of } } };
  });
  return crearPedidoRemolques({
    datos: prepararPedidoHoja(elementos, DEFAULT_PARAMS),
    autoria: { technician: 'IVÁN', reviewer: '' }, existente: null, ahora: `${fecha}T08:00:00.000Z`,
  });
}
// P1: lona 200 con goma detrás + baquetón; P2 (generado): lona 253 con cremallera detrás;
// P3: lona 150 con velcro (A) y lona 190 con cremallera detrás (B).
const P1 = pedido(`AR.${AA}.99601`, 'TALLERES CAL', `${ANIO}-09-28`, [['lona-02', '10', '0299601'], ['baqueton-01', '11', '0299602']]);
const P2 = marcarPedidoGenerado(pedido(`AR.${AA}.99602`, 'HIJOS DE PEDRO LOPEZ S.L.', `${ANIO}-09-29`, [['lona-08', '10', '0299603']]),
  { revisor: 'JAIME', ficheros: [], ahora: `${ANIO}-09-29T10:00:00.000Z` });
const P3 = pedido(`AR.${AA}.99603`, 'REMOLQUES AYALA', `${ANIO}-09-30`, [['lona-10', '10', '0299604'], ['lona-32', '11', '0299605']]);

const { settings: ajustes } = (await api('/api/workflow/settings')).datos;
const carpeta = path.resolve(String(ajustes.remolquesRevisionDirectory || ''));
assert.ok(carpeta.startsWith(`${path.resolve('tmp/buscador')}${path.sep}`), `la carpeta interna de remolques tiene que estar en tmp/buscador: «${carpeta}»`);
fs.mkdirSync(carpeta, { recursive: true });
for (const nombre of fs.readdirSync(carpeta)) if (nombre.toLowerCase().endsWith('.json')) fs.rmSync(path.join(carpeta, nombre));
for (const p of [P1, P2, P3]) fs.writeFileSync(path.join(carpeta, `${p.orderCode}.json`), `${JSON.stringify(p, null, 2)}\n`);

// ── 2. La API ──
const clave = (f) => `${f.orderCode}-${f.letra}`;
const todos = (await api('/api/remolques/buscar', json({}))).datos;
assert.equal(todos.total, 5);
assert.equal(todos.pedidos, 3);
assert.deepEqual(todos.filas.map(clave), [`${P3.orderCode}-A`, `${P3.orderCode}-B`, `${P2.orderCode}-A`, `${P1.orderCode}-A`, `${P1.orderCode}-B`]);
const cremallera = (await api('/api/remolques/buscar', json({ recogida: { nombre: 'CREMALLERA', lado: 'detras' } }))).datos;
assert.deepEqual(cremallera.filas.map(clave), [`${P3.orderCode}-B`, `${P2.orderCode}-A`]);
const mal = await api('/api/remolques/buscar', json({ medidas: { largo: { valor: 'x' } } }));
assert.equal(mal.status, 400);
assert.match(mal.datos.error, /largo/);
console.log('OK: la API busca en todos los pedidos guardados');

// ── 3. La pantalla ──
const { browser, page, errors } = await openApp({ width: 1600, height: 1000 }, { launchArgs: CON_WEBGL });
page.setDefaultTimeout(20000);
const inesperadas = [];
page.on('response', (r) => {
  const { pathname } = new URL(r.url());
  if (!pathname.startsWith('/api/') || r.status() < 400) return;
  if (/^\/api\/(coordina|remolques\/materiales)/.test(pathname)) return;
  inesperadas.push(`${r.status()} ${r.request().method()} ${pathname}`);
});
const contador = (texto) => page.locator('.buscador-contador', { hasText: texto });
const buscar = () => page.getByRole('button', { name: 'Buscar', exact: true }).click();
const quitar = () => page.getByRole('button', { name: 'Quitar filtros' }).click();

try {
  await page.getByRole('button', { name: /^Pedidos/ }).first().click();
  await page.getByRole('button', { name: 'Buscar remolques' }).click();
  await page.getByRole('heading', { name: 'Buscar remolques' }).waitFor();
  await contador('5 remolques en 3 pedidos').waitFor();
  await capturas(page, 'sin-filtros');
  console.log('OK: «Buscar remolques» abre el buscador con los más nuevos');

  await page.getByLabel('Cliente', { exact: true }).fill('pedro lopez');
  await buscar();
  await contador('1 remolque en 1 pedido').waitFor();
  console.log('OK: por cliente');

  await quitar();
  await contador('5 remolques en 3 pedidos').waitFor();
  await page.getByRole('combobox', { name: 'Recogida' }).click();
  await page.getByRole('option', { name: 'Cremallera', exact: true }).click();
  await buscar();
  await contador('2 remolques en 2 pedidos').waitFor();
  await capturas(page, 'cremallera');
  console.log('OK: por cremallera en cualquier lado');

  await quitar();
  await contador('5 remolques en 3 pedidos').waitFor();
  await page.getByLabel('Largo', { exact: true }).fill('195');
  await buscar();
  await contador('2 remolques en 2 pedidos').waitFor();
  await page.getByLabel('Margen de largo').fill('2');
  await buscar();
  await contador('Ningún remolque cumple estos filtros').waitFor();
  await capturas(page, 'sin-resultados');
  await page.getByLabel('Margen de largo').fill('');
  await buscar();
  await contador('2 remolques en 2 pedidos').waitFor();
  console.log('OK: por largo con margen (± 5 por defecto)');

  await page.getByRole('button', { name: `Abrir ${P3.numeroPedido} · B` }).click();
  await page.locator(`[aria-label="Pedido de remolques ${P3.orderCode}"]`).waitFor();
  const activa = page.locator('.rem-pestana-abrir[aria-current="true"] .rem-pestana-rotulo');
  assert.match(await activa.textContent(), /^B · /, 'el pedido se abre con el elemento buscado elegido');
  await capturas(page, 'pedido-abierto');
  await page.getByRole('button', { name: '← Buscar remolques' }).click();
  await contador('2 remolques en 2 pedidos').waitFor();
  assert.equal(await page.getByLabel('Largo', { exact: true }).inputValue(), '195', 'al volver, los filtros siguen');
  await page.getByRole('button', { name: '← Pedidos' }).click();
  await page.getByRole('button', { name: 'Buscar remolques' }).waitFor();
  console.log('OK: abrir un resultado con su elemento elegido y volver al buscador');

  assert.deepEqual(inesperadas, [], `respuestas de error inesperadas: ${inesperadas.join(', ')}`);
  assert.deepEqual(errors, [], `errores de la página: ${errors.join(' | ')}`);
} finally {
  await browser.close();
}
console.log('OK: buscador de remolques de punta a punta');
```

Notas: si `prepararPedidoHoja` reordena o rechaza algún caso, mirar `src/remolques/hoja/pedido.ts` y elegir otro caso del fixture con la misma recogida y un largo que mantenga las cuentas (no cambiar el fixture). Si «Pedidos» tiene otro nombre accesible, copiar el `irAPedidos` de `scripts/test-remolques-5-e2e.mjs`. Si el `SelectField` no abre con `getByRole('combobox')`, usar el patrón de `scripts/test-remolques-clientes-e2e.mjs`. Los `errors` de `openApp` incluyen los `console.error` de la página: si CoordinaOT simulado no responde a alguna OF, filtrarlos como hace `test-remolques-5-e2e.mjs`.

- [ ] **Step 2: Ejecutar la e2e y mirar las capturas**

Arrancar la aislada de 4314 en segundo plano y esperar a `/api/health` (`simulationMode` true, `fileWritesEnabled` false). Luego (≈ 1 min; avisar a Iván del tiempo):

Run: `TOLDOS_ISOLATED_URL=http://127.0.0.1:4314 node scripts/test-remolques-buscador-e2e.mjs`
Expected: las líneas `OK: …` de cada parte y `OK: buscador de remolques de punta a punta`.

Mirar todas las capturas de `tmp/ui-audit/buscador-remolques/` (claro y oscuro, 1280 y 1600): que se vea como Pedidos (misma barra, mismas tiras, mismas filas), que a 1280 no se corten los rótulos ni haya scroll horizontal, que las columnas de la lista caigan bajo su rótulo y que el oscuro no tenga blancos sueltos. Los arreglos van en `buscador-remolques.css` o `BuscadorRemolques.tsx` (y se vuelve a pasar la e2e).

Run: `TOLDOS_ISOLATED_URL=http://127.0.0.1:4314 node scripts/test-remolques-2a-e2e.mjs`
Expected: pasa sin cambiarla (Pedidos y Remolques siguen igual).

- [ ] **Step 3: Documentación**

En `README.md`, después de la sección `### Fichas de cliente de remolques` (antes de `## Configuración de carpetas`):

```md
### Buscador de remolques

En Pedidos, junto a «Generados», «Buscar remolques» abre un buscador sobre todos los pedidos de
remolques guardados en la carpeta interna (todos los años, también los pasados de la web vieja; los
que solo existen como PDF en las carpetas compartidas no entran). Filtra cada elemento por texto libre
(pedido, cliente, OF u observaciones), cliente (por nombre o el de su ficha), tipo, perfil, recogida
(delante, detrás o cualquier lado), medidas con margen (± 5 cm si no se pone otro), radios, aguas,
chaflán, ventana, rotulación, bastilla de enfundar, detrás distinto, material, estado y fechas. Sale
una fila por elemento, del pedido más nuevo al más antiguo (500 como mucho, con aviso); al pulsarla se
abre el pedido con ese elemento elegido, y desde ahí «Corregir» o «Reutilizar datos» como siempre. Por
debajo es `POST /api/remolques/buscar` con los filtros en JSON.
```

En `.claude/skills/running-toldos-testar/SKILL.md` (CRLF), después de la línea de las fichas de cliente (`ISOLATED_DIR="$PWD/tmp/clientes" PORT=4313 FAKE_COORDINA_PORT=4323`):

```md
- La e2e del buscador de remolques usa su propia aislada, porque vacía la carpeta interna de remolques
  y siembra sus pedidos: `ISOLATED_DIR="$PWD/tmp/buscador" PORT=4314 FAKE_COORDINA_PORT=4324`, y
  `TOLDOS_ISOLATED_URL=http://127.0.0.1:4314 node scripts/test-remolques-buscador-e2e.mjs`.
```

- [ ] **Step 4: Batería completa**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: todo PASS (también la paridad de remolques), sin errores y build terminado.

- [ ] **Step 5: Commit y subida**

```bash
git add scripts/test-remolques-buscador-e2e.mjs README.md .claude/skills/running-toldos-testar/SKILL.md
git commit -m "test(remolques): e2e del buscador de remolques y su documentación

Siembra tres pedidos reales (uno generado) en su aislada, busca por la
API y en pantalla por cliente, por cremallera en cualquier lado y por
largo con margen, abre un resultado con su elemento elegido y vuelve al
buscador con los filtros. El README y la guía de la aislada lo cuentan.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
git pull --rebase
git push origin main
```

(Desde el worktree de Codex: `git pull --rebase origin main` y `git push origin HEAD:main`.)

---

## Después del plan

- Revisión final de toda la rama con el modelo más capaz (Opus, esfuerzo alto): que no se ha tocado ningún fichero de Nuevo pedido ni de la paridad, que el buscador no escribe nada (la ruta solo lee el almacén), que `ReviewsView` vuelve bien en los tres caminos (bandeja → pedido, buscador → pedido → buscador, buscador → Pedidos) y que la consulta a CoordinaOT de la bandeja no corre con el buscador abierto.
- **Para Iván, una pregunta:** ¿quiere filtrar por los códigos de RPS de la ficha? Hoy no se puede porque el pedido guardado no lleva el código del cliente; habría que guardarlo al guardar para revisión (`origenRps.cliente.codigo` en cada elemento) y los pedidos de antes seguirían yendo por nombre.
- Toldos podrá usar el mismo buscador más adelante (decisión de Iván: solo remolques por ahora).
- Para Iván, al desplegar (en una línea): `pnpm install && pnpm build && pnpm deploy:check && pnpm pm2:reload`. No hay configuración nueva: busca en la carpeta interna de remolques que ya está en Configuración.

## Cobertura del spec

| Spec | Tarea |
| --- | --- |
| Decisiones de Iván: solo remolques; dentro de Pedidos, no en una pestaña nueva | 4 |
| 1. Dónde: botón «Buscar remolques» junto a «Generados»; se abre en la misma página; «← Pedidos» vuelve; piezas de CoordinaOT, claro y oscuro, solo escritorio | 4, 5 |
| 2. Texto libre: número de pedido (como se escribió o normalizado), cliente, OF, observaciones | 1, 3, 4 |
| 2. Cliente por ficha o por nombre | 1 (por nombre), 3 (nombres de las fichas), 4 (sugerencias); códigos de RPS en «Después del plan» |
| 2. Tipo lona / baquetón; perfil (los cinco) | 1, 3, 4 |
| 2. Recogidas delante, detrás o cualquier lado, con los valores de Parámetros (también las propias de las fichas) | 1, 3, 4 |
| 2. Largo, ancho, alto (delante) con margen ± 5 editable; radios (esquina, cumbrera, hombro), aguas y chaflán con margen | 1, 3, 4 |
| 2. Ventana, rotulación, bastilla de enfundar, detrás distinto: Sí / No / da igual | 1, 3, 4 |
| 2. Material contenido; estado todos / pendientes / generados; fechas desde / hasta | 1, 3, 4 |
| 2. Decimales con coma; una medida vacía no filtra | 3 (`filtrosDesdeFormulario`), 4 (`InputDecimal`) |
| 3. Una fila por elemento: pedido y letra, cliente, fecha, perfil o «Baquetón», medidas, recogidas, material y estado; más nuevos primero; «N remolques en M pedidos» | 1, 3, 4 |
| 3. Pulsar una fila abre la ficha de lectura del pedido con ese elemento elegido; «Corregir» o «Reutilizar» como siempre | 4, 5 |
| 3. Sin resultados: «Ningún remolque cumple estos filtros» | 3, 4, 5 |
| 4. Todos los pedidos de remolques guardados en la carpeta interna, todos los años, también los de la web vieja; los que solo son PDF no entran | 1, 2 (`almacen.listar()`) |
| 4. Ruta nueva `POST /api/remolques/buscar`; el servidor recorre el almacén y filtra por elemento; límite razonable y aviso si se corta; lógica pura probada aparte | 1, 2, 4 |
| 4. No cambia nada de guardar, generar, borradores ni fichas | Global Constraints (ningún fichero de esas partes cambia salvo `servicio.ts`, que solo gana `buscar`) |
| Pruebas: unitarias del filtrado (cada filtro, márgenes, combinaciones, recogidas «cualquier lado», texto libre sin acentos ni mayúsculas, fechas, estado) | 1, 2, 3 |
| Pruebas: e2e en la aislada sembrando pedidos variados; por cliente, cremallera y medida con margen; abrir un resultado y comprobar el elemento elegido | 5 |
