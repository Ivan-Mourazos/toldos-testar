# Remolques · fase 4: salidas (hoja de taller en PDF) — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que Planteamientos TGM haga la hoja de taller de remolques en PDF (una hoja A4 apaisada por elemento, con el contenido de la web vieja o mejor y el dibujo nuevo en grises), que se vea con «Vista previa del PDF» en Remolques y que quede hecha y probada la pieza que la guarda en las mismas carpetas que hoy (la llamará la fase 5).

**Architecture:** Cuatro capas. (1) Datos puros en `src/remolques/hoja/`: los textos de cada casilla copiados de la web vieja (`datos-hoja`, `datos-geometria`) con paridad en los 32 casos reales, las tablas de ollaos y ganchos, la cabecera y la preparación del pedido (valida y calcula). (2) El render en modo impresión (`src/client/remolques/render/`): mismas mallas con materiales grises y aristas, y un capturador que pinta cada vista en un solo contexto WebGL fuera de pantalla. (3) Una página interna, segunda entrada de Vite (`hoja-remolques.html`), que pide los datos con un identificador de un solo uso, pinta las hojas con CSS de impresión y avisa con `window.hojaLista`. (4) En el servidor (`src/remolques/salida/`): el almacén de identificadores, el servicio de Chromium sin ventana (`playwright-core`: abierto una vez, cola, 30 s, mensajes claros), `POST /api/remolques/pdf` (solo vista previa) y el archivo en dos carpetas (escritura atómica, 409 sin confirmar, respeta la escritura desactivada), sin botón todavía.

**Tech Stack:** TypeScript (el servidor lo ejecuta sin compilar, Node ≥ 22.18), React 19, three.js 0.186, Express 5, Vite 6 (dos entradas), `playwright-core` 1.61.1 (Chromium con WebGL por SwiftShader), `pdfjs-dist` (textos y rasterizado en las pruebas), vitest (entorno node), Playwright para la e2e en la instancia aislada.

**Spec:** `docs/superpowers/specs/2026-09-30-remolques-fase-4-salidas-design.md`. Diseño general: `docs/superpowers/specs/2026-09-29-unificacion-remolques-design.md`. Origen de los textos: `Remolques-TGM/src/lib/pdf/` (commit `a7ffef0`, **solo lectura**).

## Cambios posteriores al plan (30/09/2026) — mandan sobre el texto de las tareas

- **Sin notas del cálculo** (Iván): la hoja no lleva el recuadro «NOTAS DEL CÁLCULO» ni el campo `notas` de `PaginaHojaDatos`; lo único escrito aparte son las OBSERVACIONES del técnico. Quitar de las tareas 1 y 4 el campo, su prueba y su sección.
- **Bastilla de enfundar:** si la lleva, se indica en ACABADOS (fila «BASTILLA ENFUNDAR»); si no la lleva, «NO».
- **Más de 12 columnas de ollaos** si algún lado las necesita (nunca ha pasado): se mantiene.
- **Remolque sesgado** (commits `28bee2c` y `e70e102`, posteriores al plan): `LonaInput.contornoAtras`, y con «detrás distinto» el resultado lleva `contornoAtrasIntroducido`, `contornoAtrasAjustado` y `panoContorno.altoAtras`; la recogida de Hijos de Pedro López lleva `panoTraseroConAnchoDelante`. La hoja enseña el paño de contorno con sus dos medidas, como la tarjeta de resultados: «234,5 × 169,3 del. / 170,8 tras.» (y el CONTORNO DE CORTE igual). Los textos de la web vieja no lo tenían: es lo nuevo que se añade a `datos-hoja` con su prueba (caso de Hijos de Pedro López de `src/remolques/calc/__tests__/lona.test.ts`).

## Global Constraints

- Solo escritorio (1280×720 a 1920); no adaptar a móvil.
- Textos de la interfaz y comentarios en castellano; decimales con coma (`toLocaleString('es-ES')`). No citar el Excel en la interfaz ni en la hoja.
- Diseño igual que CoordinaOT: tokens y piezas de `src/client/coordina/` (`ghost-button`, `--aviso-fondo`, `--aviso-borde`, `--aviso-texto`, `pdf-preview-backdrop`, `pdf-preview-window`), en claro y oscuro. La hoja impresa es blanco y negro y no usa los tokens de pantalla.
- Nunca arrancar la web con el `.env` real: solo la instancia aislada `bash .claude/skills/running-toldos-testar/start-isolated.sh` (puerto 4310). En las pruebas no se escribe nada fuera de `tmp/` del repositorio. RPS y la web vieja son de solo lectura (solo `GET`).
- La paridad de los 32 casos no se toca: `src/remolques/paridad-produccion.test.ts` y `src/client/remolques/resultados-paridad.test.tsx` siguen pasando sin cambiarlos.
- La impresora del taller es de blanco y negro: el dibujo del PDF se pinta en grises (lona gris claro, cajón en otro gris, goma y ollaos en negro, aristas oscuras, sombras muy suaves); la pantalla sigue en color.
- Mismas carpetas y nombres que la web vieja: `AR…-10.pdf` en la carpeta de planteamientos de remolques y `<año>/AR….pdf` en la de oficina técnica de remolques; nombre = número de pedido normalizado (mayúsculas, sin puntos); año = `2000 +` las dos cifras tras «AR» (si no las hay, el de la fecha).
- Sustituir solo con confirmación (409 si ya existe y no se pide `sustituir`); escritura atómica (temporal, comprobación y cambio de nombre, con marcha atrás si falla la segunda copia); nada se escribe con la escritura de ficheros desactivada (`productionEnabled` / `ENABLE_FILE_WRITES`).
- «REVISADO POR» queda vacío hasta la fase 5.
- La vista previa (`POST /api/remolques/pdf`) nunca archiva.
- Chromium: `ARGUMENTOS_CHROMIUM = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']`, tiempo máximo `30_000` ms por PDF, un PDF cada vez. `playwright-core` en `dependencies` con la versión exacta de `playwright` (`1.61.1`).
- Letra de medidas en la hoja: nunca por debajo de 7 pt. Cada vista se captura a 220 ppp de su tamaño en la hoja (mínimo exigido: 200 ppp).
- Commits en castellano explicando el porqué, terminando en `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`. `git add` con rutas explícitas; nada de `git add -A`, stash, reset ni checkout de ficheros ajenos. Mantener los finales de línea.

## Mapa de ficheros

Crear:
- `src/remolques/hoja/datos-geometria.ts`, `src/remolques/hoja/datos-hoja.ts` — copiados de la web vieja (imports relativos con `.ts`); la hoja añade «BASTILLA ENFUNDAR».
- `src/remolques/hoja/tipos.ts` — `ElementoPedidoHoja`, `ElementoHoja`, `DatosHojaPedido`.
- `src/remolques/hoja/pagina.ts` — cabecera, tablas de ollaos y ganchos, notas, `paginaHoja`.
- `src/remolques/hoja/pedido.ts` — `prepararPedidoHoja` (valida, ordena, calcula) y `ErrorPedidoHoja`.
- `src/remolques/hoja/muestras.ts` — pedidos de muestra sacados de la fixture (página en desarrollo, e2e y smoke).
- `src/remolques/hoja/__tests__/datos-geometria.test.ts`, `datos-hoja.test.ts`, `pagina.test.ts`, `paridad-hoja.test.ts`, `pedido.test.ts`, `muestras.test.ts`
- `src/remolques/__fixtures__/hoja-produccion-2026-09.json` — los textos que da la web vieja para los 32 casos (generado con su código).
- `src/remolques/salida/nombre-pdf.ts` — `nombrePdf`, `anioDelPlanteamiento` (copiados).
- `src/remolques/salida/fichas.ts` — identificadores de un solo uso en memoria.
- `src/remolques/salida/navegador.ts` — servicio de Chromium.
- `src/remolques/salida/archivo.ts` — archivo en las dos carpetas.
- `src/remolques/salida/__tests__/nombre-pdf.test.ts`, `fichas.test.ts`, `navegador.test.ts`, `archivo.test.ts`
- `src/client/remolques/render/escenaBase.ts` — luces, entorno, suelo y sol (pantalla e impresión).
- `src/client/remolques/render/captura.ts` — capturador de vistas para la hoja.
- `src/client/remolques/render/impresion.test.ts`
- `hoja-remolques.html` — segunda entrada de Vite.
- `src/client/hoja/main.tsx`, `ventana-hoja.d.ts`, `cargarHoja.ts`, `muestraDev.ts`, `medidas.ts`, `prepararHoja.ts`, `HojaPedido.tsx`, `PaginaHoja.tsx`, `CapaCotasHoja.tsx`, `hoja.css`
- `src/client/hoja/cargarHoja.test.ts`, `medidas.test.ts`, `prepararHoja.test.ts`, `PaginaHoja.test.tsx`
- `src/client/remolques/VistaPreviaPdf.tsx`, `src/client/remolques/vistaPrevia.ts`, `src/client/remolques/vistaPrevia.test.ts`
- `scripts/test-remolques-4-e2e.mjs` — e2e y muestras para Iván.

Modificar:
- `src/remolques/escena/tipos.ts`, `src/remolques/escena/cotas.ts` (`hacia` en las etiquetas).
- `src/client/remolques/render/camaras.ts` (`VistaCamara` con `tres-cuartos-detras`), `materiales.ts` (`crearMaterialesImpresion`), `mallas.ts` (aristas), `proyeccion.ts` (`hacia`), `RenderRemolque.tsx` (usa `escenaBase`).
- `vite.config.ts` (dos entradas).
- `src/server.js` (rutas, servicio, cierre), `src/config.js`, `src/workflow.js`, `src/workflow.test.js`.
- `src/client/types.ts`, `src/client/views/SettingsView.tsx` (dos carpetas nuevas).
- `src/client/remolques/RemolquesView.tsx`, `src/client/remolques/PestanasElementos.tsx`, `src/client/coordina/remolques.css`.
- `package.json`, `pnpm-lock.yaml` (`playwright-core`).
- `scripts/check-deployment.mjs`, `scripts/smoke-production.mjs`, `README.md`, `.env.example`, `.env.production.example`, `src/remolques/README.md`.
- `.claude/skills/running-toldos-testar/start-isolated.sh`, `.claude/skills/running-toldos-testar/SKILL.md`.

---

### Task 1: Datos de la hoja (textos, cabecera y tablas)

Modelo recomendado: el más barato (el código está completo). Esfuerzo: medio.

**Files:**
- Create: `src/remolques/hoja/datos-geometria.ts`, `src/remolques/hoja/datos-hoja.ts`, `src/remolques/hoja/tipos.ts`, `src/remolques/hoja/pagina.ts`, `src/remolques/__fixtures__/hoja-produccion-2026-09.json`
- Modify: `src/remolques/README.md`
- Test: `src/remolques/hoja/__tests__/datos-geometria.test.ts`, `datos-hoja.test.ts`, `pagina.test.ts`, `paridad-hoja.test.ts`

**Interfaces:**
- Consumes: `LonaInput`, `LonaResult`, `CabeceraInput` (`src/remolques/calc/lona.ts`), `BaquetonInput`, `BaquetonResult` (`calc/baqueton.ts`), `CalcParams`, `nombrePerfil` (`calc/params.ts`), `RepartoLados`, `sinPosiciones` (`calc/ollaos.ts`), `Lado`, `sinReves` (`calc/ganchos.ts`), `PlanteamientoRecord`, `TipoPlanteamiento` (`store/types.ts`).
- Produces (`tipos.ts`): `interface ElementoPedidoHoja { version: string; tipo: TipoPlanteamiento; input: LonaInput | BaquetonInput }`, `type ElementoHoja = { version; tipo: "lona"; input: LonaInput; result: LonaResult } | { version; tipo: "baqueton"; input: BaquetonInput; result: BaquetonResult }`, `interface DatosHojaPedido { elementos: ElementoHoja[]; params: CalcParams }`.
- Produces (`datos-hoja.ts`): `Dato`, `Grupo`, `Celda`, `CuerpoHoja`, `DatosHoja`, `textoPanos(cantidad, a, b): string`, `tituloPagina(tipo, indice, total): string`, `hojaLona(i, r): CuerpoHoja`, `hojaBaqueton(i, r): CuerpoHoja`, `datosHoja(rec: Pick<PlanteamientoRecord, "tipo" | "input" | "result">, indice, total): DatosHoja`.
- Produces (`datos-geometria.ts`): `datosGeometriaPdf(input: LonaInput): string[]`.
- Produces (`pagina.ts`): `interface CabeceraHoja { cliente; realizadoPor; revisadoPor; numeroPedido; of; fecha: string }`, `interface FilaPosiciones { nombre: string; posiciones: number[] }`, `interface TablaPosiciones { titulo: string; columnas: number; filas: FilaPosiciones[] }`, `interface PaginaHojaDatos extends DatosHoja { clave: string; tipo: TipoPlanteamiento; cabecera: CabeceraHoja; ollaos: TablaPosiciones; ganchos: TablaPosiciones | null; notas: string[] }`, `COLUMNAS_MINIMAS = 12`, `fechaEs(fecha): string`, `cabeceraHoja(c: CabeceraInput, revisadoPor = ""): CabeceraHoja`, `tituloOllaos(input, primerOllao): string`, `tablaOllaos(input, reparto: RepartoLados, primerOllao: number): TablaPosiciones`, `tablaGanchos(input): TablaPosiciones | null`, `paginaHoja(elemento: ElementoHoja, indice: number, total: number, params: CalcParams): PaginaHojaDatos`.

- [ ] **Step 1: Generar los textos de referencia con el código de la web vieja**

La web vieja es de solo lectura: el generador vive en `tmp/` (no se versiona) y solo lee de `../Remolques-TGM/src`. Crear `tmp/hoja-golden/vitest.config.ts`:

```ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

// Resuelve `@/…` a la web vieja para ejecutar su `datos-hoja` tal cual (solo lectura).
const VIEJA = path.resolve('..', 'Remolques-TGM', 'src');

export default defineConfig({
  root: path.resolve('.'),
  resolve: { alias: { '@': VIEJA } },
  test: { include: ['tmp/hoja-golden/*.test.ts'], environment: 'node' },
});
```

Crear `tmp/hoja-golden/generar.test.ts`:

```ts
import { writeFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import casos from '../../src/remolques/__fixtures__/produccion-2026-09.json';
import { datosHoja } from '@/lib/pdf/datos-hoja';

// Copia literal de la tabla de ollaos de Remolques-TGM/src/lib/pdf/PlanteamientoPdf.tsx
// (componente `Reparto`): título, nombres de fila y 12 columnas.
const fmt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ollaosViejos(c: any) {
  const modo = c.input.modoOllaos;
  const primerOllao = c.input.primerOllao ?? c.paramsSnapshot?.primerOllao ?? 2.5;
  const r = c.result.reparto;
  return {
    titulo: modo === 'REPARTIDOS'
      ? `OLLAOS · REPARTIDOS · PRIMER Y ÚLTIMO OLLAO A ${fmt(primerOllao)} CM DEL BORDE`
      : `OLLAOS · ${modo || 'SIN ELEGIR'}`,
    columnas: 12,
    filas: [
      { nombre: 'OLLAOS LATERALES DE ATRÁS A ADELANTE', posiciones: r.laterales },
      { nombre: 'OLLAOS ATRÁS DE IZQUIERDA A DERECHA', posiciones: r.atras },
      { nombre: 'OLLAOS DELANTE DE IZQUIERDA A DERECHA', posiciones: r.delante },
    ],
  };
}

it('textos de la hoja vieja para los 32 casos reales', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const salida = (casos as any[]).map((c) => ({
    caso: c.caso,
    hoja: datosHoja({ tipo: c.tipo, input: c.input, result: c.result } as never, 0, 1),
    ollaos: ollaosViejos(c),
  }));
  expect(salida).toHaveLength(32);
  writeFileSync('src/remolques/__fixtures__/hoja-produccion-2026-09.json', `${JSON.stringify(salida, null, 2)}\n`);
});
```

Run: `pnpm exec vitest run --config tmp/hoja-golden/vitest.config.ts`
Expected: `1 passed`, y existe `src/remolques/__fixtures__/hoja-produccion-2026-09.json` con 32 entradas (sin nombres de cliente: la fixture ya viene anonimizada). Comprobar: `node -e "console.log(require('./src/remolques/__fixtures__/hoja-produccion-2026-09.json').length)"` → `32`. Después borrar `tmp/hoja-golden/`.

- [ ] **Step 2: Escribir las pruebas que fallan**

Crear `src/remolques/hoja/__tests__/datos-geometria.test.ts` (copiada de la web vieja; solo cambian los imports):

```ts
import { describe, expect, it } from "vitest";
import { emptyLona } from "../../entradas-vacias.ts";
import { datosGeometriaPdf } from "../datos-geometria.ts";

describe("datos geométricos del PDF", () => {
  it("detalla aguas y los dos radios del perfil curvo", () => {
    expect(datosGeometriaPdf({
      ...emptyLona(), tipoPerfil: "TIPO 03", aguas: 35, radioCumbrera: 20, radioHombro: 18,
    })).toEqual([
      "AGUAS 35 CM",
      "RADIO CUMBRERA 20 CM",
      "RADIO HOMBRO 18 CM",
    ]);
  });

  it("incluye la medida propia de chaflán y esquina redonda", () => {
    expect(datosGeometriaPdf({ ...emptyLona(), tipoPerfil: "TIPO 04", chaflan: 25 }))
      .toEqual(["CHAFLÁN 25 CM"]);
    expect(datosGeometriaPdf({ ...emptyLona(), tipoPerfil: "TIPO 05", radioEsquina: 30 }))
      .toEqual(["RADIO ESQUINA 30 CM"]);
  });

  it("añade los radios del chaflán solo cuando alguno es mayor que cero", () => {
    expect(datosGeometriaPdf({
      ...emptyLona(), tipoPerfil: "TIPO 04", chaflan: 25,
      radioChaflanAbajo: 7, radioChaflanArriba: 7.5,
    })).toEqual(["CHAFLÁN 25 CM", "RADIOS 7 / 7,5 CM"]);
    expect(datosGeometriaPdf({
      ...emptyLona(), tipoPerfil: "TIPO 04", chaflan: 25, radioChaflanArriba: 5,
    })).toEqual(["CHAFLÁN 25 CM", "RADIOS 0 / 5 CM"]);
    expect(datosGeometriaPdf({ ...emptyLona(), tipoPerfil: "TIPO 04", chaflan: 25 }))
      .toEqual(["CHAFLÁN 25 CM"]);
  });
});
```

Crear `src/remolques/hoja/__tests__/datos-hoja.test.ts` (copiada; imports cambiados y una prueba nueva al final para la bastilla):

```ts
import { describe, expect, it } from "vitest";
import { datosHoja, hojaBaqueton, hojaLona, textoPanos, tituloPagina } from "../datos-hoja.ts";
import { calcBaqueton, type BaquetonInput } from "../../calc/baqueton.ts";
import { calcLona, type LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { emptyBaqueton, emptyLona } from "../../entradas-vacias.ts";
import type { PlanteamientoRecord } from "../../store/types.ts";

describe("textos sueltos de la hoja", () => {
  it("concuerda el plural de los paños con la cantidad", () => {
    expect(textoPanos(1, 160, 124.5)).toBe("1 PAÑO DE 160 × 124,5");
    expect(textoPanos(2, 160, 124.5)).toBe("2 PAÑOS DE 160 × 124,5");
  });

  it("numera la página solo cuando el pedido tiene más de una", () => {
    expect(tituloPagina("lona", 0, 1)).toBe("REMOLQUE");
    expect(tituloPagina("lona", 0, 3)).toBe("REMOLQUE · 1 DE 3");
    expect(tituloPagina("baqueton", 1, 3)).toBe("BAQUETÓN · 2 DE 3");
    expect(tituloPagina("baqueton", 0, 1)).toBe("BAQUETÓN");
  });
});

const hojaDeLona = (extra: Partial<LonaInput> = {}) => {
  const input: LonaInput = {
    ...emptyLona(),
    cantidad: 1, largo: 300, ancho: 157, altoDelante: 120, altoAtras: 0,
    tipoPerfil: "TIPO 05", radioEsquina: 8, contorno: 391,
    recogeDelante: "NO", recogeAtras: "GOMA",
    ventana: true, ventanaAncho: 148, ventanaAlto: 35, rotulacion: true,
    modoOllaos: "REPARTIDOS", material: "LONA ALPHA 1L 580", observaciones: "SIN NADA",
    ...extra,
  };
  return hojaLona(input, calcLona(input, DEFAULT_PARAMS));
};

describe("datos de la lona en la hoja", () => {
  it("reparte la banda en paños, lona hecha y contorno", () => {
    const hoja = hojaDeLona();
    expect(hoja.banda.map((celda) => celda.titulo))
      .toEqual(["PAÑOS A CORTAR", "MEDIDA LONA HECHA", "CONTORNO DE CORTE"]);
    expect(hoja.banda[0].lineas).toHaveLength(3);
    expect(hoja.banda[1].lineas[0]).toBe("301 × 158");
  });

  it("solo desdobla alto y ancho cuando delante y detrás difieren", () => {
    expect(hojaDeLona().banda[1].lineas[1]).toBe("ALTO 120");
    expect(hojaDeLona().banda[1].notas).toEqual([]);

    const sesgado = hojaDeLona({ altoAtras: 110, anchoAtras: 150 });
    expect(sesgado.banda[1].lineas[1]).toBe("ALTO 120 DEL. / 110 TRAS.");
    expect(sesgado.banda[1].notas).toEqual(["ANCHO 157 DEL. / 150 TRAS."]);
  });

  it("dice PENDIENTE cuando no hay contorno, y entonces no hay paño de contorno", () => {
    const hoja = hojaDeLona({ contorno: 0 });
    expect(hoja.banda[2].lineas).toEqual(["PENDIENTE"]);
    expect(hoja.banda[0].lineas).toHaveLength(2);
  });

  it("agrupa la forma y los acabados, y deja fuera el modo de ollaos", () => {
    const hoja = hojaDeLona();
    expect(hoja.grupos.map((grupo) => grupo.titulo)).toEqual(["FORMA", "ACABADOS"]);
    expect(hoja.grupos[0].datos[1].valores).toEqual(["RADIO ESQUINA 8 CM"]);
    const etiquetas = hoja.grupos.flatMap((grupo) => grupo.datos.map((dato) => dato.etiqueta));
    expect(etiquetas).not.toContain("OLLAOS");
  });

  it("saca los opcionales sin elegir como raya en vez de esconderlos", () => {
    const hoja = hojaDeLona({
      tipoPerfil: "", ventana: null, rotulacion: null, material: "", observaciones: "",
    });
    const acabados = hoja.grupos[1].datos;
    expect(acabados.find((dato) => dato.etiqueta === "VENTANA")!.valores).toEqual(["—"]);
    expect(acabados.find((dato) => dato.etiqueta === "ROTULACIÓN")!.valores).toEqual(["—"]);
    expect(hoja.grupos[0].datos[0].valores).toEqual(["—"]);
    expect(hoja.material).toBe("—");
    expect(hoja.observaciones).toBe("—");
  });

  it("da las medidas de la ventana cuando las hay y avisa cuando faltan", () => {
    expect(hojaDeLona().grupos[1].datos[2].valores).toEqual(["SÍ · 148 × 35 CM"]);
    expect(hojaDeLona({ ventanaAncho: 0, ventanaAlto: 0 }).grupos[1].datos[2].valores)
      .toEqual(["SÍ · MEDIDAS PENDIENTES"]);
    expect(hojaDeLona({ ventana: false }).grupos[1].datos[2].valores).toEqual(["NO"]);
  });

  // Añadido en la fase 4: la bastilla cambia el corte (demasía de contorno) y la hoja vieja no la decía.
  it("dice si lleva bastilla de enfundar, justo después de la ventana", () => {
    const acabados = (extra: Partial<LonaInput>) => hojaDeLona(extra).grupos[1].datos;
    expect(acabados({ bastillaEnfundar: true })[3]).toEqual({ etiqueta: "BASTILLA ENFUNDAR", valores: ["SÍ"] });
    expect(acabados({ bastillaEnfundar: false })[3].valores).toEqual(["NO"]);
    expect(acabados({ bastillaEnfundar: null })[3].valores).toEqual(["—"]);
  });
});

const entradaBaqueton = (extra: Partial<BaquetonInput> = {}): BaquetonInput => ({
  ...emptyBaqueton(),
  cantidad: 1, largo: 300, ancho: 157, baqueton: 12,
  clienteEspecifico: "GENERAL", rotulacion: false,
  modoOllaos: "REPARTIDOS", material: "LONA ALPHA 1L 580", observaciones: "",
  ...extra,
});

describe("datos del baquetón en la hoja", () => {
  it("identifica las dos caídas independientes en la hoja de taller", () => {
    const input = entradaBaqueton({ baquetonDelante: 18, baquetonDetras: 25 });
    const hoja = hojaBaqueton(input, calcBaqueton(input, DEFAULT_PARAMS));
    expect(hoja.banda[2].notas).toEqual(["DELANTERO 18 · NO EN LÍNEA", "TRASERO 25 · NO EN LÍNEA"]);
  });
  it("tiene sus tres celdas y no las de la lona", () => {
    const input = entradaBaqueton();
    const hoja = hojaBaqueton(input, calcBaqueton(input, DEFAULT_PARAMS));
    expect(hoja.banda.map((celda) => celda.titulo))
      .toEqual(["PAÑOS A CORTAR", "MEDIDA REMOLQUE", "BAQUETÓN"]);
    expect(hoja.banda[2].notas).toEqual(["EN LÍNEA"]);
    const etiquetas = hoja.grupos.flatMap((grupo) => grupo.datos.map((dato) => dato.etiqueta));
    expect(etiquetas).toEqual(["CLIENTE ESPECÍFICO", "ROTULACIÓN"]);
    expect(etiquetas).not.toContain("PERFIL");
    expect(etiquetas).not.toContain("VENTANA");
  });
});

describe("reparto por tipo de planteamiento", () => {
  it("da el título y el cuerpo que le tocan a cada tipo", () => {
    const input = entradaBaqueton();
    const registro = {
      id: "x", tipo: "baqueton", numeroPedido: "AR.26.04329", version: "10",
      cliente: "TALLERES CAL", input, result: calcBaqueton(input, DEFAULT_PARAMS),
      paramsSnapshot: DEFAULT_PARAMS, createdAt: "", updatedAt: "",
    } as PlanteamientoRecord;
    const hoja = datosHoja(registro, 1, 3);
    expect(hoja.titulo).toBe("BAQUETÓN · 2 DE 3");
    expect(hoja.banda[1].titulo).toBe("MEDIDA REMOLQUE");
  });
});
```

Crear `src/remolques/hoja/__tests__/paridad-hoja.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import casos from "../../__fixtures__/produccion-2026-09.json";
import referencia from "../../__fixtures__/hoja-produccion-2026-09.json";
import type { CalcParams } from "../../calc/params.ts";
import { datosHoja, type DatosHoja } from "../datos-hoja.ts";
import { tablaOllaos, type TablaPosiciones } from "../pagina.ts";
import type { ElementoHoja } from "../tipos.ts";

// Paridad con la web vieja (fase 4): los 32 planteamientos reales dan los mismos textos en
// cada casilla y en la tabla de ollaos. La referencia la generó el código de Remolques-TGM
// (commit a7ffef0) sobre la misma fixture. Única diferencia a propósito: la fila nueva
// «BASTILLA ENFUNDAR» de los acabados de la lona, que la hoja vieja no tenía.
type Caso = { caso: string; tipo: "lona" | "baqueton"; input: unknown; result: unknown; paramsSnapshot: unknown };
type Referencia = { caso: string; hoja: DatosHoja; ollaos: TablaPosiciones };

function sinAnadidos(hoja: DatosHoja): DatosHoja {
  return {
    ...hoja,
    grupos: hoja.grupos.map((grupo) => ({ ...grupo, datos: grupo.datos.filter((dato) => dato.etiqueta !== "BASTILLA ENFUNDAR") })),
  };
}

describe("hoja de taller: paridad con la web vieja", () => {
  const lista = casos as Caso[];
  const esperadas = new Map((referencia as Referencia[]).map((r) => [r.caso, r]));

  it("hay 32 hojas de referencia, una por caso", () => {
    expect(esperadas.size).toBe(32);
    expect(lista.every((c) => esperadas.has(c.caso))).toBe(true);
  });

  it.each(lista.map((c) => [c.caso, c] as const))("%s da los mismos textos que la web vieja", (_nombre, caso) => {
    const elemento = { version: "10", tipo: caso.tipo, input: caso.input, result: caso.result } as ElementoHoja;
    const esperada = esperadas.get(caso.caso)!;
    expect(sinAnadidos(datosHoja(elemento, 0, 1))).toEqual(esperada.hoja);
    const primerOllao = elemento.input.primerOllao ?? (caso.paramsSnapshot as CalcParams).primerOllao;
    expect(tablaOllaos(elemento.input, elemento.result.reparto, primerOllao)).toEqual(esperada.ollaos);
  });
});
```

Crear `src/remolques/hoja/__tests__/pagina.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calcLona, type LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { emptyLona } from "../../entradas-vacias.ts";
import { cabeceraHoja, fechaEs, paginaHoja, tablaGanchos, tablaOllaos, tituloOllaos } from "../pagina.ts";

const lona = (extra: Partial<LonaInput> = {}): LonaInput => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "ar.26.04329", cliente: "TALLERES CAL", realizadoPor: "IVÁN", ordenFabricacion: "0231234", fecha: "2026-09-30" },
  largo: 300, ancho: 200, altoDelante: 100, tipoPerfil: "TIPO 01", contorno: 400,
  recogeDelante: "NO", recogeAtras: "NO", bastillaEnfundar: false, ventana: false, rotulacion: false,
  modoOllaos: "REPARTIDOS", pasoOllaos: 35, primerOllao: 2.5, material: "PVC GRIS",
  ...extra,
});

describe("cabecera de la hoja", () => {
  it("fecha en castellano y pedido en mayúsculas", () => {
    expect(fechaEs("2026-09-30")).toBe("30/09/2026");
    expect(fechaEs("30/09/2026")).toBe("30/09/2026");
    expect(cabeceraHoja(lona().cabecera)).toEqual({
      cliente: "TALLERES CAL", realizadoPor: "IVÁN", revisadoPor: "",
      numeroPedido: "AR.26.04329", of: "0231234", fecha: "30/09/2026",
    });
  });
  it("lo que falta sale con raya; «REVISADO POR» queda vacío hasta la fase 5", () => {
    const c = cabeceraHoja({ ...emptyLona().cabecera, fecha: "" });
    expect(c).toMatchObject({ cliente: "—", realizadoPor: "—", numeroPedido: "—", of: "—", fecha: "—", revisadoPor: "" });
  });
});

describe("tabla de ollaos", () => {
  it("el título dice el modo, como la hoja vieja", () => {
    expect(tituloOllaos(lona(), 2.5)).toBe("OLLAOS · REPARTIDOS · PRIMER Y ÚLTIMO OLLAO A 2,5 CM DEL BORDE");
    expect(tituloOllaos(lona({ modoOllaos: "SEGUN SE INDICA" }), 2.5)).toBe("OLLAOS · SEGUN SE INDICA");
    expect(tituloOllaos(lona({ modoOllaos: "" }), 2.5)).toBe("OLLAOS · SIN ELEGIR");
  });
  it("según ganchos dice que van entre ellos y si lleva los de los extremos", () => {
    expect(tituloOllaos(lona({ modoOllaos: "SEGUN GANCHOS" }), 4))
      .toBe("OLLAOS · SEGÚN GANCHOS · UNO ENTRE CADA DOS GANCHOS Y LOS DE LOS EXTREMOS A 4 CM DEL BORDE");
    expect(tituloOllaos(lona({ modoOllaos: "SEGUN GANCHOS", ollaosExtremos: false }), 4))
      .toBe("OLLAOS · SEGÚN GANCHOS · UNO ENTRE CADA DOS GANCHOS, SIN OLLAOS EN LOS EXTREMOS");
  });
  it("12 columnas como siempre, y más si un lado lleva más (la vieja cortaba en 12)", () => {
    const corta = tablaOllaos(lona(), { laterales: [2.5, 150], atras: [2.5], delante: [2.5] }, 2.5);
    expect(corta.columnas).toBe(12);
    expect(corta.filas.map((f) => f.nombre)).toEqual([
      "OLLAOS LATERALES DE ATRÁS A ADELANTE", "OLLAOS ATRÁS DE IZQUIERDA A DERECHA", "OLLAOS DELANTE DE IZQUIERDA A DERECHA",
    ]);
    const larga = tablaOllaos(lona(), { laterales: Array.from({ length: 15 }, (_, i) => i * 10 + 2.5), atras: [], delante: [] }, 2.5);
    expect(larga.columnas).toBe(15);
  });
});

describe("tabla de ganchos", () => {
  it("solo con «Según ganchos»", () => {
    expect(tablaGanchos(lona())).toBeNull();
  });
  it("los ganchos tal cual vienen en el pedido, sobre el remolque, y el lado medido al revés lo dice", () => {
    const tabla = tablaGanchos(lona({
      modoOllaos: "SEGUN GANCHOS",
      ganchos: { laterales: [5, 150, 295], atras: [160, 110, 60, 10], delante: [40, 90, 140, 190] },
      ganchosAlReves: { laterales: false, atras: false, delante: true },
    }))!;
    expect(tabla.titulo).toBe("GANCHOS · SOBRE EL REMOLQUE, COMO VIENEN EN EL PEDIDO");
    expect(tabla.filas).toEqual([
      { nombre: "GANCHOS LATERALES DE ATRÁS A ADELANTE", posiciones: [5, 150, 295] },
      { nombre: "GANCHOS ATRÁS DE IZQUIERDA A DERECHA", posiciones: [160, 110, 60, 10] },
      { nombre: "GANCHOS DELANTE DE DERECHA A IZQUIERDA (MEDIDO AL REVÉS)", posiciones: [40, 90, 140, 190] },
    ]);
    expect(tabla.columnas).toBe(12);
  });
});

describe("paginaHoja", () => {
  it("junta cabecera, textos, tablas y notas del cálculo de un elemento", () => {
    const input = lona({ rotulacion: true });
    const result = calcLona(input, DEFAULT_PARAMS);
    const pagina = paginaHoja({ version: "11", tipo: "lona", input, result }, 1, 2, DEFAULT_PARAMS);
    expect(pagina.clave).toBe("11");
    expect(pagina.titulo).toBe("REMOLQUE · 2 DE 2");
    expect(pagina.cabecera.numeroPedido).toBe("AR.26.04329");
    expect(pagina.ollaos.filas[0].posiciones).toEqual(result.reparto.laterales);
    expect(pagina.ganchos).toBeNull();
    expect(pagina.notas).toEqual(result.notas);
    expect(pagina.notas).toContain("Incluye rotulación.");
  });
  it("sin primer ollao en la entrada usa el de los parámetros", () => {
    const input = lona({ primerOllao: undefined });
    const pagina = paginaHoja({ version: "10", tipo: "lona", input, result: calcLona(input, DEFAULT_PARAMS) }, 0, 1, DEFAULT_PARAMS);
    expect(pagina.ollaos.titulo).toContain(`A ${DEFAULT_PARAMS.primerOllao.toLocaleString("es-ES")} CM DEL BORDE`);
  });
});
```

- [ ] **Step 3: Ver que fallan**

Run: `pnpm exec vitest run src/remolques/hoja`
Expected: FAIL, `Failed to resolve import "../datos-geometria.ts"` (y los demás de `hoja/`).

- [ ] **Step 4: Copiar `datos-geometria.ts`**

Crear `src/remolques/hoja/datos-geometria.ts` (copia de `Remolques-TGM/src/lib/pdf/datos-geometria.ts`; solo cambia el import):

```ts
import type { LonaInput } from "../calc/lona.ts";

const fmt = (n: number | null | undefined) => Number(n ?? 0).toLocaleString("es-ES", {
  maximumFractionDigits: 1,
});

export function datosGeometriaPdf(input: LonaInput): string[] {
  const tipo = input.tipoPerfil;
  // Sin perfil no hay geometría que describir, y la hoja lo dice en vez de
  // callarse: es una vista previa a medias, no un remolque recto.
  if (!tipo) return ["PERFIL SIN ELEGIR"];
  switch (tipo) {
    case "TIPO 01":
      return ["PERFIL RECTO"];
    case "TIPO 02":
      return [`AGUAS ${fmt(input.aguas)} CM`];
    case "TIPO 03":
      return [
        `AGUAS ${fmt(input.aguas)} CM`,
        `RADIO CUMBRERA ${fmt(input.radioCumbrera)} CM`,
        `RADIO HOMBRO ${fmt(input.radioHombro)} CM`,
      ];
    case "TIPO 04": {
      const lineas = [`CHAFLÁN ${fmt(input.chaflan)} CM`];
      if ((input.radioChaflanAbajo ?? 0) > 0 || (input.radioChaflanArriba ?? 0) > 0) {
        lineas.push(`RADIOS ${fmt(input.radioChaflanAbajo)} / ${fmt(input.radioChaflanArriba)} CM`);
      }
      return lineas;
    }
    case "TIPO 05":
      return [`RADIO ESQUINA ${fmt(input.radioEsquina)} CM`];
  }
}
```

- [ ] **Step 5: Copiar `datos-hoja.ts` (con la bastilla)**

Crear `src/remolques/hoja/datos-hoja.ts` (copia de `Remolques-TGM/src/lib/pdf/datos-hoja.ts`; cambian los imports, `datosHoja` pide solo lo que usa y la lona dice la bastilla):

```ts
import type { LonaInput, LonaResult } from "../calc/lona.ts";
import type { BaquetonInput, BaquetonResult } from "../calc/baqueton.ts";
import type { PlanteamientoRecord, TipoPlanteamiento } from "../store/types.ts";
import { nombrePerfil } from "../calc/params.ts";
import { datosGeometriaPdf } from "./datos-geometria.ts";

// Textos de cada casilla de la hoja de taller. Copiado de la web vieja de remolques
// (Remolques-TGM/src/lib/pdf/datos-hoja.ts, commit a7ffef0); `paridad-hoja.test.ts` comprueba
// que los 32 planteamientos reales siguen dando lo mismo.

/** Una etiqueta con sus valores; varios valores se pintan uno por línea. */
export interface Dato { etiqueta: string; valores: string[] }
export interface Grupo { titulo: string; datos: Dato[] }
/** Celda de la banda de corte: `lineas` va en grande, `notas` en gris pequeño. */
export interface Celda { titulo: string; lineas: string[]; notas: string[] }
export interface CuerpoHoja {
  banda: Celda[];
  grupos: Grupo[];
  material: string;
  observaciones: string;
}

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });

/** Que un dato no esté puesto es justo lo que hay que poder ver. */
const oRaya = (valor: string) => (valor.trim() === "" ? "—" : valor);

/** «Sin elegir» no es un «NO»: imprimirlo como tal sería inventar la decisión. */
const siNo = (valor: boolean | null | undefined) => (valor == null ? "—" : valor ? "SÍ" : "NO");

/** «1 PAÑO DE» pero «2 PAÑOS DE»: la hoja anterior decía «2 PAÑO DE». */
export function textoPanos(cantidad: number, a: number, b: number): string {
  return `${cantidad} ${cantidad === 1 ? "PAÑO" : "PAÑOS"} DE ${fmt(a)} × ${fmt(b)}`;
}

/**
 * Un pedido de una sola pieza no necesita que le digan que es la 1 de 1; con
 * varias, quien tiene las hojas en la mano sabe cuál es cuál y si le falta una.
 */
export function tituloPagina(tipo: TipoPlanteamiento, indice: number, total: number): string {
  const nombre = tipo === "lona" ? "REMOLQUE" : "BAQUETÓN";
  return total <= 1 ? nombre : `${nombre} · ${indice + 1} DE ${total}`;
}

function textoVentana(i: LonaInput): string {
  if (i.ventana == null) return "—";
  if (!i.ventana) return "NO";
  return (i.ventanaAncho ?? 0) > 0 && (i.ventanaAlto ?? 0) > 0
    ? `SÍ · ${fmt(i.ventanaAncho!)} × ${fmt(i.ventanaAlto!)} CM`
    : "SÍ · MEDIDAS PENDIENTES";
}

export function hojaLona(i: LonaInput, r: LonaResult): CuerpoHoja {
  // vacío (0) = igual que delante
  const altoAtras = i.altoAtras > 0 ? i.altoAtras : i.altoDelante;
  const sesgado = (i.anchoAtras ?? 0) > 0 && i.anchoAtras !== i.ancho;
  const panos = [
    textoPanos(i.cantidad, r.panoDelantero.ancho, r.panoDelantero.alto),
    textoPanos(i.cantidad, r.panoTrasero.ancho, r.panoTrasero.alto),
    ...(r.panoContorno ? [textoPanos(i.cantidad, r.panoContorno.ancho, r.panoContorno.alto)] : []),
  ];
  return {
    banda: [
      { titulo: "PAÑOS A CORTAR", lineas: panos, notas: [] },
      {
        titulo: "MEDIDA LONA HECHA",
        lineas: [
          `${fmt(r.lonaHecha.largo)} × ${fmt(r.lonaHecha.ancho)}`,
          altoAtras !== i.altoDelante
            ? `ALTO ${fmt(i.altoDelante)} DEL. / ${fmt(altoAtras)} TRAS.`
            : `ALTO ${fmt(i.altoDelante)}`,
        ],
        notas: sesgado ? [`ANCHO ${fmt(i.ancho)} DEL. / ${fmt(i.anchoAtras!)} TRAS.`] : [],
      },
      {
        titulo: "CONTORNO DE CORTE",
        lineas: [r.contornoAjustado ? fmt(r.contornoAjustado) : "PENDIENTE"],
        notas: [],
      },
    ],
    grupos: [
      {
        titulo: "FORMA",
        datos: [
          { etiqueta: "PERFIL", valores: [i.tipoPerfil ? nombrePerfil(i.tipoPerfil) : "—"] },
          { etiqueta: "GEOMETRÍA", valores: datosGeometriaPdf(i) },
        ],
      },
      {
        // El modo de ollaos no está aquí: ya lo dice el título de su tabla.
        titulo: "ACABADOS",
        datos: [
          { etiqueta: "RECOGE DELANTE", valores: [oRaya(r.recogeDelanteTexto)] },
          { etiqueta: "RECOGE ATRÁS", valores: [oRaya(r.recogeAtrasTexto)] },
          { etiqueta: "VENTANA", valores: [textoVentana(i)] },
          // Fase 4: la bastilla cambia el corte y la hoja vieja no la decía.
          { etiqueta: "BASTILLA ENFUNDAR", valores: [siNo(i.bastillaEnfundar)] },
          { etiqueta: "ROTULACIÓN", valores: [siNo(i.rotulacion)] },
        ],
      },
    ],
    material: oRaya(i.material),
    observaciones: oRaya(i.observaciones),
  };
}

export function hojaBaqueton(i: BaquetonInput, r: BaquetonResult): CuerpoHoja {
  return {
    banda: [
      {
        titulo: "PAÑOS A CORTAR",
        lineas: [textoPanos(i.cantidad, r.panoUnico.largo, r.panoUnico.ancho)],
        notas: [],
      },
      {
        titulo: "MEDIDA REMOLQUE",
        lineas: [`${fmt(r.remolqueHecho.largo)} × ${fmt(r.remolqueHecho.ancho)}`],
        notas: [],
      },
      {
        titulo: "BAQUETÓN",
        lineas: [fmt(i.baqueton)],
        notas: r.baquetonDelantero == null && r.baquetonTrasero == null ? ["EN LÍNEA"] : [
          r.baquetonDelantero != null ? `DELANTERO ${fmt(r.baquetonDelantero)} · NO EN LÍNEA` : "DELANTE EN LÍNEA",
          r.baquetonTrasero != null ? `TRASERO ${fmt(r.baquetonTrasero)} · NO EN LÍNEA` : "DETRÁS EN LÍNEA",
        ],
      },
    ],
    grupos: [
      {
        titulo: "ACABADOS",
        datos: [
          { etiqueta: "CLIENTE ESPECÍFICO", valores: [oRaya(i.clienteEspecifico)] },
          { etiqueta: "ROTULACIÓN", valores: [siNo(i.rotulacion)] },
        ],
      },
    ],
    material: oRaya(i.material),
    observaciones: oRaya(i.observaciones),
  };
}

export interface DatosHoja extends CuerpoHoja { titulo: string }

/** Lo único que la hoja necesita saber de un elemento. */
export function datosHoja(
  rec: Pick<PlanteamientoRecord, "tipo" | "input" | "result">, indice: number, total: number,
): DatosHoja {
  const cuerpo = rec.tipo === "lona"
    ? hojaLona(rec.input as LonaInput, rec.result as LonaResult)
    : hojaBaqueton(rec.input as BaquetonInput, rec.result as BaquetonResult);
  return { titulo: tituloPagina(rec.tipo, indice, total), ...cuerpo };
}
```

- [ ] **Step 6: Tipos de la hoja**

Crear `src/remolques/hoja/tipos.ts`:

```ts
import type { BaquetonInput, BaquetonResult } from "../calc/baqueton.ts";
import type { LonaInput, LonaResult } from "../calc/lona.ts";
import type { CalcParams } from "../calc/params.ts";
import type { TipoPlanteamiento } from "../store/types.ts";

// Lo que viaja de la pantalla al servidor y del servidor a la página interna de la hoja (fase 4).

/** Un elemento tal como lo manda la pantalla: sin resultado, que lo calcula el servidor. */
export interface ElementoPedidoHoja {
  version: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
}

/** Un elemento ya calculado con los parámetros comunes. */
export type ElementoHoja =
  | { version: string; tipo: "lona"; input: LonaInput; result: LonaResult }
  | { version: string; tipo: "baqueton"; input: BaquetonInput; result: BaquetonResult };

/** El pedido entero que pinta la página de la hoja: una hoja por elemento, en este orden. */
export interface DatosHojaPedido {
  elementos: ElementoHoja[];
  params: CalcParams;
}
```

- [ ] **Step 7: Cabecera, tablas y página**

Crear `src/remolques/hoja/pagina.ts`:

```ts
import type { BaquetonInput } from "../calc/baqueton.ts";
import { sinReves, type Lado } from "../calc/ganchos.ts";
import type { CabeceraInput, LonaInput } from "../calc/lona.ts";
import { sinPosiciones, type RepartoLados } from "../calc/ollaos.ts";
import type { CalcParams } from "../calc/params.ts";
import type { TipoPlanteamiento } from "../store/types.ts";
import { datosHoja, type DatosHoja } from "./datos-hoja.ts";
import type { ElementoHoja } from "./tipos.ts";

// Todo lo que lleva una hoja de taller, en texto: lo de la web vieja (cabecera, título, banda,
// grupos y tabla de ollaos) y lo nuevo de la fase 4 (tabla de ganchos y notas del cálculo).

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
const oRaya = (valor: string | undefined) => (valor ?? "").trim() || "—";

export interface CabeceraHoja {
  cliente: string;
  realizadoPor: string;
  /** Vacío hasta la fase 5, que pone el revisor de CoordinaOT. */
  revisadoPor: string;
  numeroPedido: string;
  of: string;
  fecha: string;
}
export interface FilaPosiciones { nombre: string; posiciones: number[] }
export interface TablaPosiciones { titulo: string; columnas: number; filas: FilaPosiciones[] }
export interface PaginaHojaDatos extends DatosHoja {
  /** La versión del elemento (10, 11…): identifica la hoja. */
  clave: string;
  tipo: TipoPlanteamiento;
  cabecera: CabeceraHoja;
  ollaos: TablaPosiciones;
  ganchos: TablaPosiciones | null;
  notas: string[];
}

/** 12 columnas como la hoja de siempre; más si algún lado lleva más (la vieja cortaba en 12). */
export const COLUMNAS_MINIMAS = 12;
const columnas = (filas: FilaPosiciones[]) => Math.max(COLUMNAS_MINIMAS, ...filas.map((f) => f.posiciones.length));
const LADOS_TABLA: Lado[] = ["laterales", "atras", "delante"];

export function fechaEs(fecha: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : fecha;
}

export function cabeceraHoja(c: CabeceraInput, revisadoPor = ""): CabeceraHoja {
  return {
    cliente: oRaya(c.cliente),
    realizadoPor: oRaya(c.realizadoPor),
    revisadoPor,
    numeroPedido: oRaya(c.numeroPedido.toUpperCase()),
    of: oRaya(c.ordenFabricacion),
    fecha: oRaya(fechaEs(c.fecha)),
  };
}

export function tituloOllaos(input: LonaInput | BaquetonInput, primerOllao: number): string {
  if (input.modoOllaos === "REPARTIDOS") {
    return `OLLAOS · REPARTIDOS · PRIMER Y ÚLTIMO OLLAO A ${fmt(primerOllao)} CM DEL BORDE`;
  }
  if (input.modoOllaos === "SEGUN GANCHOS") {
    return (input.ollaosExtremos ?? true)
      ? `OLLAOS · SEGÚN GANCHOS · UNO ENTRE CADA DOS GANCHOS Y LOS DE LOS EXTREMOS A ${fmt(primerOllao)} CM DEL BORDE`
      : "OLLAOS · SEGÚN GANCHOS · UNO ENTRE CADA DOS GANCHOS, SIN OLLAOS EN LOS EXTREMOS";
  }
  return `OLLAOS · ${input.modoOllaos || "SIN ELEGIR"}`;
}

const NOMBRE_OLLAOS: Record<Lado, string> = {
  laterales: "OLLAOS LATERALES DE ATRÁS A ADELANTE",
  atras: "OLLAOS ATRÁS DE IZQUIERDA A DERECHA",
  delante: "OLLAOS DELANTE DE IZQUIERDA A DERECHA",
};

/** Las posiciones de los ollaos sobre la lona hecha (o el remolque hecho del baquetón). */
export function tablaOllaos(input: LonaInput | BaquetonInput, reparto: RepartoLados, primerOllao: number): TablaPosiciones {
  const filas = LADOS_TABLA.map((lado) => ({ nombre: NOMBRE_OLLAOS[lado], posiciones: reparto[lado] }));
  return { titulo: tituloOllaos(input, primerOllao), columnas: columnas(filas), filas };
}

/** [normal, medido al revés]: el lado medido desde el otro extremo se lee al revés. */
const NOMBRE_GANCHOS: Record<Lado, [string, string]> = {
  laterales: ["GANCHOS LATERALES DE ATRÁS A ADELANTE", "GANCHOS LATERALES DE ADELANTE A ATRÁS (MEDIDO AL REVÉS)"],
  atras: ["GANCHOS ATRÁS DE IZQUIERDA A DERECHA", "GANCHOS ATRÁS DE DERECHA A IZQUIERDA (MEDIDO AL REVÉS)"],
  delante: ["GANCHOS DELANTE DE IZQUIERDA A DERECHA", "GANCHOS DELANTE DE DERECHA A IZQUIERDA (MEDIDO AL REVÉS)"],
};

/** Solo con «Según ganchos»: los ganchos tal cual vienen en el pedido, medidos sobre el remolque. */
export function tablaGanchos(input: LonaInput | BaquetonInput): TablaPosiciones | null {
  if (input.modoOllaos !== "SEGUN GANCHOS") return null;
  const ganchos = input.ganchos ?? sinPosiciones();
  const alReves = input.ganchosAlReves ?? sinReves();
  const filas = LADOS_TABLA.map((lado) => ({ nombre: NOMBRE_GANCHOS[lado][alReves[lado] ? 1 : 0], posiciones: ganchos[lado] }));
  return { titulo: "GANCHOS · SOBRE EL REMOLQUE, COMO VIENEN EN EL PEDIDO", columnas: columnas(filas), filas };
}

export function paginaHoja(elemento: ElementoHoja, indice: number, total: number, params: CalcParams): PaginaHojaDatos {
  return {
    ...datosHoja(elemento, indice, total),
    clave: elemento.version,
    tipo: elemento.tipo,
    cabecera: cabeceraHoja(elemento.input.cabecera),
    ollaos: tablaOllaos(elemento.input, elemento.result.reparto, elemento.input.primerOllao ?? params.primerOllao),
    ganchos: tablaGanchos(elemento.input),
    notas: elemento.result.notas,
  };
}
```

- [ ] **Step 8: Ver que pasan, con la paridad de siempre**

Run: `pnpm exec vitest run src/remolques/hoja src/remolques/paridad-produccion.test.ts`
Expected: PASS; `paridad-hoja.test.ts` con 33 pruebas (1 + 32), `datos-hoja.test.ts` con 12 (las 11 copiadas y la de la bastilla), `datos-geometria.test.ts` con 3, `pagina.test.ts` con 9.

Run: `pnpm typecheck`
Expected: sin errores.

- [ ] **Step 9: Apuntarlo en el README de remolques**

Añadir al final de `src/remolques/README.md`:

```markdown

## Fase 4: la hoja de taller

`hoja/datos-hoja.ts` y `hoja/datos-geometria.ts` están copiados de `Remolques-TGM/src/lib/pdf`
(commit a7ffef0) con las mismas reglas: solo cambian los imports. `paridad-hoja.test.ts` compara
los 32 casos reales con `__fixtures__/hoja-produccion-2026-09.json`, que generó el código de la web
vieja sobre la misma fixture. Añadidos a propósito: la fila «BASTILLA ENFUNDAR», la tabla de
ganchos («Según ganchos»), las notas del cálculo y las columnas que hagan falta si un lado lleva
más de 12 ollaos (la vieja cortaba en 12).
```

- [ ] **Step 10: Commit**

```bash
git add src/remolques/hoja/datos-geometria.ts src/remolques/hoja/datos-hoja.ts src/remolques/hoja/tipos.ts src/remolques/hoja/pagina.ts src/remolques/hoja/__tests__/datos-geometria.test.ts src/remolques/hoja/__tests__/datos-hoja.test.ts src/remolques/hoja/__tests__/pagina.test.ts src/remolques/hoja/__tests__/paridad-hoja.test.ts src/remolques/__fixtures__/hoja-produccion-2026-09.json src/remolques/README.md
git commit -m "feat(remolques): textos de la hoja de taller copiados de la web vieja

La hoja nueva tiene que decir lo mismo que la vieja o más: los textos de cada
casilla salen de las mismas funciones, y los 32 planteamientos reales dan los
mismos textos que el código de Remolques-TGM. Añade lo que faltaba al taller:
si lleva bastilla, la tabla de ganchos tal como vienen en el pedido y las notas
del cálculo.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Pedido de la hoja, muestras y nombre del PDF

Modelo recomendado: el más barato (el código está completo). Esfuerzo: bajo.

**Files:**
- Create: `src/remolques/hoja/pedido.ts`, `src/remolques/hoja/muestras.ts`, `src/remolques/salida/nombre-pdf.ts`
- Test: `src/remolques/hoja/__tests__/pedido.test.ts`, `src/remolques/hoja/__tests__/muestras.test.ts`, `src/remolques/salida/__tests__/nombre-pdf.test.ts`

**Interfaces:**
- Consumes: `ElementoPedidoHoja`, `ElementoHoja`, `DatosHojaPedido` (Task 1), `calcLona`, `calcBaqueton`, `errorPlanteamientoIncompleto` (`pedidos/validar-planteamiento.ts`), `nombreElementoPedido` (`pedidos/agrupar-pedido.ts`), `normalizarNumeroPedido` (`pedidos/numero-pedido.ts`).
- Produces (`pedido.ts`): `MAX_ELEMENTOS_HOJA = 30`, `class ErrorPedidoHoja extends Error { statusCode = 400 }`, `prepararPedidoHoja(elementos: unknown, params: CalcParams): DatosHojaPedido`.
- Produces (`muestras.ts`): `interface CasoFixture { caso: string; tipo: TipoPlanteamiento; input: LonaInput | BaquetonInput }`, `NOMBRES_MUESTRAS = ["lona-ventana", "baqueton", "segun-ganchos", "bastilla", "perfiles", "varios"] as const`, `type NombreMuestra`, `muestrasHoja(casos: CasoFixture[]): Record<NombreMuestra, ElementoPedidoHoja[]>`.
- Produces (`nombre-pdf.ts`): `nombrePdf(numeroPedido: string): string` (`AR2604329-10.pdf`, `SIN-PEDIDO-10.pdf`), `anioDelPlanteamiento(numeroPedido: string, fecha: string, ahora = new Date()): number`.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/remolques/salida/__tests__/nombre-pdf.test.ts` (las de `ruta-pdf.test.ts` y el año de `archivo-pdf.test.ts` de la web vieja):

```ts
import { describe, expect, it } from "vitest";
import { anioDelPlanteamiento, nombrePdf } from "../nombre-pdf.ts";

describe("nombrePdf", () => {
  it("un PDF por pedido con el sufijo fijo -10", () => {
    expect(nombrePdf("AR2603583")).toBe("AR2603583-10.pdf");
  });

  it("quita los puntos: en PLANTEAMIENTOS los ficheros van sin ellos", () => {
    expect(nombrePdf("AR.26.04329")).toBe("AR2604329-10.pdf");
  });

  it("el mismo pedido escrito de dos formas da el mismo fichero", () => {
    expect(nombrePdf("AR.26.04329")).toBe(nombrePdf("ar 26 04329"));
  });

  it("sanea caracteres inválidos en Windows", () => {
    expect(nombrePdf("AR/26:02796")).toBe("AR2602796-10.pdf");
  });

  it("sin pedido usa SIN-PEDIDO", () => {
    expect(nombrePdf("")).toBe("SIN-PEDIDO-10.pdf");
  });
});

describe("anioDelPlanteamiento", () => {
  it("obtiene el año del pedido antes que la fecha del formulario", () => {
    expect(anioDelPlanteamiento("ar.26.03632", "2025-12-20")).toBe(2026);
    expect(anioDelPlanteamiento("OTRO", "2025-12-20")).toBe(2025);
    expect(anioDelPlanteamiento("OTRO", "", new Date("2027-02-01"))).toBe(2027);
  });
});
```

Crear `src/remolques/hoja/__tests__/pedido.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import casos from "../../__fixtures__/produccion-2026-09.json";
import { calcBaqueton, type BaquetonInput } from "../../calc/baqueton.ts";
import { calcLona, type LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { ErrorPedidoHoja, MAX_ELEMENTOS_HOJA, prepararPedidoHoja } from "../pedido.ts";
import type { ElementoPedidoHoja } from "../tipos.ts";

type Caso = { caso: string; tipo: "lona" | "baqueton"; input: LonaInput | BaquetonInput };
const deFixture = (id: string, version: string, numeroPedido = "AR.26.99990"): ElementoPedidoHoja => {
  const c = (casos as Caso[]).find((x) => x.caso === id)!;
  return { version, tipo: c.tipo, input: { ...c.input, cabecera: { ...c.input.cabecera, numeroPedido, version } } };
};
const falla = (elementos: unknown) => {
  try {
    prepararPedidoHoja(elementos, DEFAULT_PARAMS);
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorPedidoHoja);
    expect((error as ErrorPedidoHoja).statusCode).toBe(400);
    return (error as Error).message;
  }
  throw new Error("no ha fallado");
};

describe("prepararPedidoHoja", () => {
  it("ordena por versión y calcula cada elemento con los parámetros comunes", () => {
    const lona = deFixture("lona-02", "11");
    const baqueton = deFixture("baqueton-01", "10");
    const datos = prepararPedidoHoja([lona, baqueton], DEFAULT_PARAMS);
    expect(datos.elementos.map((e) => e.version)).toEqual(["10", "11"]);
    expect(datos.elementos[0].result).toEqual(calcBaqueton(baqueton.input as BaquetonInput, DEFAULT_PARAMS));
    expect(datos.elementos[1].result).toEqual(calcLona(lona.input as LonaInput, DEFAULT_PARAMS));
    expect(datos.params).toBe(DEFAULT_PARAMS);
  });

  it("rechaza un pedido vacío o demasiado grande", () => {
    expect(falla([])).toBe("El pedido no tiene elementos para la hoja de taller.");
    expect(falla(undefined)).toBe("El pedido no tiene elementos para la hoja de taller.");
    const muchos = Array.from({ length: MAX_ELEMENTOS_HOJA + 1 }, (_, i) => deFixture("lona-02", String(10 + i)));
    expect(falla(muchos)).toBe("Un pedido admite como mucho 30 elementos en la hoja de taller.");
  });

  it("rechaza lo que no tiene forma de elemento", () => {
    expect(falla([{ tipo: "toldo", version: "10", input: {} }])).toBe("El elemento 1 del pedido no tiene el formato esperado.");
    const cambiado = { ...deFixture("lona-02", "10"), tipo: "baqueton" };
    expect(falla([cambiado])).toBe("Baquetón 1: el tipo no cuadra con sus datos.");
  });

  it("todos del mismo pedido, con número y sin versiones repetidas", () => {
    expect(falla([deFixture("lona-02", "10"), deFixture("lona-03", "11", "AR.26.99991")]))
      .toBe("Todos los elementos de la hoja tienen que ser del mismo pedido.");
    expect(falla([deFixture("lona-02", "10", "  ")])).toBe("Falta el número de pedido.");
    expect(falla([deFixture("lona-02", "10"), deFixture("lona-03", "10")])).toBe("Hay dos elementos con la misma versión en el pedido.");
    // El mismo pedido escrito con y sin puntos es el mismo pedido.
    expect(prepararPedidoHoja([deFixture("lona-02", "10"), deFixture("lona-03", "11", "AR2699990")], DEFAULT_PARAMS).elementos).toHaveLength(2);
  });

  it("un elemento incompleto dice cuál y qué le falta", () => {
    const incompleto = deFixture("lona-02", "11");
    (incompleto.input as LonaInput).altoDelante = 0;
    expect(falla([deFixture("baqueton-01", "10"), incompleto])).toBe("Remolque 2: Introduce el alto delantero.");
  });
});
```

Crear `src/remolques/hoja/__tests__/muestras.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import casos from "../../__fixtures__/produccion-2026-09.json";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { normalizarNumeroPedido } from "../../pedidos/numero-pedido.ts";
import { muestrasHoja, NOMBRES_MUESTRAS, type CasoFixture } from "../muestras.ts";
import { tablaGanchos } from "../pagina.ts";
import { prepararPedidoHoja } from "../pedido.ts";

const ELEMENTOS: Record<(typeof NOMBRES_MUESTRAS)[number], number> = {
  "lona-ventana": 1, baqueton: 1, "segun-ganchos": 1, bastilla: 1, perfiles: 5, varios: 3,
};

describe("muestras de la hoja de taller", () => {
  const muestras = muestrasHoja(casos as CasoFixture[]);

  it.each(NOMBRES_MUESTRAS)("%s es un pedido completo", (nombre) => {
    expect(prepararPedidoHoja(muestras[nombre], DEFAULT_PARAMS).elementos).toHaveLength(ELEMENTOS[nombre]);
  });

  it("cada muestra es un pedido distinto de prueba (AR.26.9999x)", () => {
    const numeros = NOMBRES_MUESTRAS.map((n) => normalizarNumeroPedido(muestras[n][0].input.cabecera.numeroPedido));
    expect(new Set(numeros).size).toBe(NOMBRES_MUESTRAS.length);
    expect(numeros.every((n) => n.startsWith("AR269999"))).toBe(true);
  });

  it("la de ganchos lleva la tabla de ganchos con delante medido al revés", () => {
    const tabla = tablaGanchos(muestras["segun-ganchos"][0].input)!;
    expect(tabla.filas[2].nombre).toBe("GANCHOS DELANTE DE DERECHA A IZQUIERDA (MEDIDO AL REVÉS)");
  });

  it("los cinco perfiles, la ventana, la bastilla y observaciones largas", () => {
    expect(muestras.perfiles.map((e) => ("tipoPerfil" in e.input ? e.input.tipoPerfil : ""))).toEqual(["TIPO 01", "TIPO 02", "TIPO 03", "TIPO 04", "TIPO 05"]);
    expect("ventana" in muestras["lona-ventana"][0].input && muestras["lona-ventana"][0].input.ventana).toBe(true);
    expect("bastillaEnfundar" in muestras.bastilla[0].input && muestras.bastilla[0].input.bastillaEnfundar).toBe(true);
    expect(muestras.varios.map((e) => e.tipo)).toEqual(["lona", "baqueton", "lona"]);
    expect(muestras.varios[2].input.observaciones.length).toBeGreaterThan(200);
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm exec vitest run src/remolques/hoja/__tests__/pedido.test.ts src/remolques/hoja/__tests__/muestras.test.ts src/remolques/salida`
Expected: FAIL, `Failed to resolve import "../pedido.ts"`, `"../muestras.ts"` y `"../nombre-pdf.ts"`.

- [ ] **Step 3: Nombre y año del PDF**

Crear `src/remolques/salida/nombre-pdf.ts` (de `ruta-pdf.ts` y `archivo-pdf.ts` de la web vieja):

```ts
import { normalizarNumeroPedido } from "../pedidos/numero-pedido.ts";

/**
 * Un PDF por pedido: mantiene el sufijo histórico -10. Los distintos
 * remolques ya no generan -11, -12…; van como páginas del mismo PDF.
 *
 * El nombre lleva el número **normalizado**, sin puntos: en la carpeta de
 * PLANTEAMIENTOS todos los ficheros se llaman así (AR2604329-10.pdf), y el
 * mismo pedido tecleado con puntos o sin ellos tiene que dar el mismo fichero
 * en vez de dos. De paso, normalizar deja fuera los caracteres que Windows no
 * admite en un nombre de archivo.
 */
export function nombrePdf(numeroPedido: string): string {
  return `${normalizarNumeroPedido(numeroPedido) || "SIN-PEDIDO"}-10.pdf`;
}

/** El año de la carpeta de oficina técnica: las dos cifras tras «AR»; si no, el de la fecha. */
export function anioDelPlanteamiento(numeroPedido: string, fecha: string, ahora = new Date()): number {
  const anioPedido = /^AR[\s._/-]*(\d{2})/i.exec(numeroPedido.trim())?.[1];
  if (anioPedido) return 2000 + Number(anioPedido);
  const anioFecha = /^(20\d{2})[-/]/.exec(fecha.trim())?.[1];
  return anioFecha ? Number(anioFecha) : ahora.getFullYear();
}
```

- [ ] **Step 4: Preparar el pedido de la hoja**

Crear `src/remolques/hoja/pedido.ts`:

```ts
import { calcBaqueton, type BaquetonInput } from "../calc/baqueton.ts";
import { calcLona, type LonaInput } from "../calc/lona.ts";
import type { CalcParams } from "../calc/params.ts";
import { nombreElementoPedido } from "../pedidos/agrupar-pedido.ts";
import { normalizarNumeroPedido } from "../pedidos/numero-pedido.ts";
import { errorPlanteamientoIncompleto } from "../pedidos/validar-planteamiento.ts";
import type { DatosHojaPedido, ElementoHoja, ElementoPedidoHoja } from "./tipos.ts";

// El pedido que manda la pantalla para la hoja de taller: se comprueba (mismo pedido, cada
// elemento completo), se ordena por versión (10, 11…) y se calcula aquí con los parámetros
// comunes, para que la hoja nunca imprima un resultado que no sale del cálculo.

export const MAX_ELEMENTOS_HOJA = 30;

/** Un error en lo que manda la pantalla: la ruta responde 400 con este mensaje. */
export class ErrorPedidoHoja extends Error {
  statusCode = 400;
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorPedidoHoja";
  }
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

function leerElemento(valor: unknown, posicion: number): ElementoPedidoHoja {
  if (
    !esObjeto(valor) || (valor.tipo !== "lona" && valor.tipo !== "baqueton") || typeof valor.version !== "string"
    || !esObjeto(valor.input) || !esObjeto(valor.input.cabecera)
  ) {
    throw new ErrorPedidoHoja(`El elemento ${posicion + 1} del pedido no tiene el formato esperado.`);
  }
  const input = valor.input as unknown as LonaInput | BaquetonInput;
  if ((valor.tipo === "baqueton") !== ("baqueton" in input)) {
    throw new ErrorPedidoHoja(`${nombreElementoPedido(valor.version, valor.tipo)}: el tipo no cuadra con sus datos.`);
  }
  return { version: valor.version, tipo: valor.tipo, input };
}

const numeroVersion = (version: string) => {
  const numero = Number(version);
  return Number.isFinite(numero) ? numero : Number.MAX_SAFE_INTEGER;
};

export function prepararPedidoHoja(elementos: unknown, params: CalcParams): DatosHojaPedido {
  if (!Array.isArray(elementos) || elementos.length === 0) {
    throw new ErrorPedidoHoja("El pedido no tiene elementos para la hoja de taller.");
  }
  if (elementos.length > MAX_ELEMENTOS_HOJA) {
    throw new ErrorPedidoHoja(`Un pedido admite como mucho ${MAX_ELEMENTOS_HOJA} elementos en la hoja de taller.`);
  }
  const lista = elementos.map(leerElemento).sort((a, b) => numeroVersion(a.version) - numeroVersion(b.version));
  const pedidos = new Set(lista.map((e) => normalizarNumeroPedido(String(e.input.cabecera.numeroPedido ?? ""))));
  if (pedidos.has("")) throw new ErrorPedidoHoja("Falta el número de pedido.");
  if (pedidos.size > 1) throw new ErrorPedidoHoja("Todos los elementos de la hoja tienen que ser del mismo pedido.");
  if (new Set(lista.map((e) => e.version)).size !== lista.length) {
    throw new ErrorPedidoHoja("Hay dos elementos con la misma versión en el pedido.");
  }
  const calculados = lista.map((e): ElementoHoja => {
    const error = errorPlanteamientoIncompleto(e.input);
    if (error) throw new ErrorPedidoHoja(`${nombreElementoPedido(e.version, e.tipo)}: ${error}`);
    if (e.tipo === "lona") {
      const input = e.input as LonaInput;
      return { version: e.version, tipo: "lona", input, result: calcLona(input, params) };
    }
    const input = e.input as BaquetonInput;
    return { version: e.version, tipo: "baqueton", input, result: calcBaqueton(input, params) };
  });
  return { elementos: calculados, params };
}
```

- [ ] **Step 5: Muestras**

Crear `src/remolques/hoja/muestras.ts`:

```ts
import type { BaquetonInput } from "../calc/baqueton.ts";
import type { LonaInput } from "../calc/lona.ts";
import type { TipoPlanteamiento } from "../store/types.ts";
import type { ElementoPedidoHoja } from "./tipos.ts";

// Pedidos de muestra de la hoja de taller, sacados de los casos reales de la fixture
// (src/remolques/__fixtures__/produccion-2026-09.json). Los usan la página de la hoja en
// desarrollo (?muestra=…), la e2e, el smoke del despliegue y las muestras para Iván.
// Números de pedido de prueba (AR.26.9999x): no existen en RPS.

export interface CasoFixture { caso: string; tipo: TipoPlanteamiento; input: LonaInput | BaquetonInput }

export const NOMBRES_MUESTRAS = ["lona-ventana", "baqueton", "segun-ganchos", "bastilla", "perfiles", "varios"] as const;
export type NombreMuestra = (typeof NOMBRES_MUESTRAS)[number];

const OBSERVACIONES_LARGAS = "REFORZAR LAS ESQUINAS DE DETRÁS CON DOBLE COSTURA. EL CLIENTE QUIERE LA ROTULACIÓN "
  + "CENTRADA EN EL LATERAL DERECHO Y LOS OLLAOS DE DELANTE LIBRES PARA LA CINCHA. COMPROBAR LA MEDIDA DEL CAJÓN "
  + "ANTES DE CORTAR: EL REMOLQUE TIENE UN GOLPE EN LA ESQUINA DELANTERA IZQUIERDA.";

function copia(
  casos: CasoFixture[], id: string, numeroPedido: string, version: string, cambios: Partial<LonaInput> | Partial<BaquetonInput> = {},
): ElementoPedidoHoja {
  const caso = casos.find((c) => c.caso === id);
  if (!caso) throw new Error(`La fixture de producción no trae el caso ${id}.`);
  const cabecera = {
    ...caso.input.cabecera, numeroPedido, version,
    cliente: "CLIENTE DE PRUEBA", realizadoPor: "IVÁN", ordenFabricacion: "0239999", fecha: "2026-09-30",
  };
  return { version, tipo: caso.tipo, input: { ...caso.input, ...cambios, cabecera } as LonaInput | BaquetonInput };
}

const SIN_AGUAS = { aguas: 0, radioCumbrera: 0, radioHombro: 0 };

export function muestrasHoja(casos: CasoFixture[]): Record<NombreMuestra, ElementoPedidoHoja[]> {
  return {
    // TIPO 03 de 200 × 121 con ventana de 50 × 35 y recogida con goma detrás.
    "lona-ventana": [copia(casos, "lona-02", "AR.26.99990", "10")],
    "baqueton": [copia(casos, "baqueton-01", "AR.26.99991", "10")],
    // La misma lona, recta y sin ventana, con los ganchos del pedido y delante medido al revés.
    "segun-ganchos": [copia(casos, "lona-02", "AR.26.99992", "10", {
      tipoPerfil: "TIPO 01", ...SIN_AGUAS, contorno: 307, ventana: false,
      modoOllaos: "SEGUN GANCHOS",
      ganchos: { laterales: [5, 100, 195], atras: [10, 60, 111], delante: [11, 61, 111] },
      ganchosAlReves: { laterales: false, atras: false, delante: true },
      ollaosExtremos: true,
    })],
    "bastilla": [copia(casos, "lona-02", "AR.26.99993", "10", { bastillaEnfundar: true })],
    "perfiles": [
      copia(casos, "lona-02", "AR.26.99994", "10", { tipoPerfil: "TIPO 01", ...SIN_AGUAS }),
      copia(casos, "lona-02", "AR.26.99994", "11", { tipoPerfil: "TIPO 02", ...SIN_AGUAS, aguas: 8 }),
      copia(casos, "lona-02", "AR.26.99994", "12", { tipoPerfil: "TIPO 03" }),
      copia(casos, "lona-02", "AR.26.99994", "13", { tipoPerfil: "TIPO 04", ...SIN_AGUAS, chaflan: 15 }),
      copia(casos, "lona-02", "AR.26.99994", "14", { tipoPerfil: "TIPO 05", ...SIN_AGUAS, radioEsquina: 10 }),
    ],
    "varios": [
      copia(casos, "lona-02", "AR.26.99996", "10"),
      copia(casos, "baqueton-04", "AR.26.99996", "11"),
      copia(casos, "lona-03", "AR.26.99996", "12", { observaciones: OBSERVACIONES_LARGAS }),
    ],
  };
}
```

- [ ] **Step 6: Ver que pasan**

Run: `pnpm exec vitest run src/remolques/hoja src/remolques/salida && pnpm typecheck`
Expected: PASS (`pedido.test.ts` 5, `muestras.test.ts` 9, `nombre-pdf.test.ts` 6) y sin errores de tipos.

- [ ] **Step 7: Commit**

```bash
git add src/remolques/hoja/pedido.ts src/remolques/hoja/muestras.ts src/remolques/salida/nombre-pdf.ts src/remolques/hoja/__tests__/pedido.test.ts src/remolques/hoja/__tests__/muestras.test.ts src/remolques/salida/__tests__/nombre-pdf.test.ts
git commit -m "feat(remolques): pedido de la hoja de taller, muestras y nombre del PDF

El servidor recalcula cada elemento con los parámetros comunes y solo acepta un
pedido completo y de un solo número, para que la hoja nunca imprima algo que no
sale del cálculo. Las muestras (lona con ventana, baquetón, según ganchos,
bastilla, los cinco perfiles y un pedido de tres) salen de casos reales y sirven
a la página en desarrollo, a la e2e y al smoke del despliegue. El nombre del
PDF y su año son los de la web vieja.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: El render en blanco y negro y la captura de vistas

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio (hay que tocar `RenderRemolque.tsx` sin cambiar la pantalla).

**Files:**
- Create: `src/client/remolques/render/escenaBase.ts`, `src/client/remolques/render/captura.ts`
- Modify: `src/remolques/escena/tipos.ts`, `src/remolques/escena/cotas.ts`, `src/client/remolques/render/camaras.ts`, `materiales.ts`, `mallas.ts`, `proyeccion.ts`, `RenderRemolque.tsx`
- Test: `src/client/remolques/render/impresion.test.ts`

**Interfaces:**
- Consumes: `EscenaRemolque`, `Vec3`, `Vista` (`src/remolques/escena/tipos.ts`), `aMundo`, `encuadre`, `espejar`, `crearCamara` (`camaras.ts`), `construirMallas`, `liberarGrupo` (`mallas.ts`), `cotasVisibles`, `rotulosVisibles` (`proyeccion.ts`).
- Produces (`camaras.ts`): `type VistaCamara = Vista | 'tres-cuartos-detras'`; `crearCamara(vista: VistaCamara, caja, aspecto): THREE.Camera`.
- Produces (`escenaBase.ts`): `colocarSol(sol: THREE.DirectionalLight, caja: EscenaRemolque['caja'], vista: VistaCamara): void`, `interface EscenaBase { escena: THREE.Scene; sol: THREE.DirectionalLight; suelo: THREE.Mesh; liberar(): void }`, `montarEscenaBase(renderer: THREE.WebGLRenderer, opciones?: { impresion?: boolean }): EscenaBase`.
- Produces (`materiales.ts`): `crearMaterialesImpresion(): Materiales`.
- Produces (`mallas.ts`): `COLOR_ARISTA = '#111111'`, `construirMallas(escena, materiales, opciones?: { aristas?: boolean }): THREE.Group`.
- Produces (`escena/tipos.ts`, `proyeccion.ts`): `EtiquetaEscena.hacia` y `MarcaCota.hacia: 'arriba' | 'abajo'` (ollaos arriba, ganchos abajo: hacia dónde se escribe su número en la hoja).
- Produces (`captura.ts`): `type VistaHoja = 'tres-cuartos' | 'tres-cuartos-detras' | 'delante' | 'detras' | 'lateral'`, `VISTAS_HOJA: VistaHoja[]`, `interface CapturaVista { png: string; ancho: number; alto: number; cotas: CotasPantalla | null; rotulos: RotuloPantalla[] }`, `interface Capturador { capturar(escena: EscenaRemolque, vista: VistaHoja, ancho: number, alto: number): CapturaVista; liberar(): void }`, `crearCapturador(): Capturador`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/client/remolques/render/impresion.test.ts`:

```ts
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { crearCamara } from './camaras';
import { escenaDePrueba } from './casos-prueba';
import { COLOR_ARISTA, construirMallas, liberarGrupo } from './mallas';
import { crearMaterialesImpresion, liberarMateriales } from './materiales';
import { cotasVisibles } from './proyeccion';

// La hoja de taller (fase 4) se imprime en blanco y negro: mismas mallas que la pantalla, con
// materiales grises, aristas oscuras y una segunda 3/4 desde detrás.

const gris = (m: THREE.Material) => (m as THREE.MeshStandardMaterial).color;

describe('materiales de la hoja impresa', () => {
  it('todos son grises: la impresora del taller es de blanco y negro', () => {
    const materiales = crearMaterialesImpresion();
    for (const [clave, material] of Object.entries(materiales)) {
      const c = gris(material);
      expect(c.r, clave).toBeCloseTo(c.g, 5);
      expect(c.g, clave).toBeCloseTo(c.b, 5);
    }
    liberarMateriales(materiales);
  });

  it('lona gris claro, cajón en otro gris y goma y ollaos en negro', () => {
    const m = crearMaterialesImpresion();
    expect(gris(m.lona).r).toBeGreaterThan(0.7);
    expect(gris(m.chapa).r).toBeLessThan(gris(m.lona).r - 0.2);
    expect(gris(m.goma).r).toBeLessThan(0.05);
    expect(gris(m.laton).r).toBeLessThan(0.05);
    liberarMateriales(m);
  });
});

describe('aristas', () => {
  const lineas = (g: THREE.Group) => {
    const lista: THREE.LineSegments[] = [];
    g.traverse((o) => { if (o instanceof THREE.LineSegments) lista.push(o); });
    return lista;
  };

  it('en la hoja, la lona y el cajón llevan su contorno en línea oscura; en pantalla, no', () => {
    const escena = escenaDePrueba();
    const m = crearMaterialesImpresion();
    const sin = construirMallas(escena, m);
    const con = construirMallas(escena, m, { aristas: true });
    expect(lineas(sin)).toHaveLength(0);
    expect(lineas(con).length).toBeGreaterThan(3);
    expect(lineas(con).every((l) => (l.material as THREE.LineBasicMaterial).color.getHexString() === COLOR_ARISTA.slice(1))).toBe(true);
    liberarGrupo(sin);
    liberarGrupo(con);
    liberarMateriales(m);
  });
});

describe('3/4 desde detrás', () => {
  const escena = escenaDePrueba();
  const esquinas = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => new THREE.Vector3(
    i & 1 ? escena.caja.max[0] : escena.caja.min[0],
    i & 2 ? escena.caja.max[1] : escena.caja.min[1],
    i & 4 ? escena.caja.max[2] : escena.caja.min[2],
  ).multiply(new THREE.Vector3(-1, 1, 1)));

  it('enseña el remolque entero, con perspectiva', () => {
    const camara = crearCamara('tres-cuartos-detras', escena.caja, 104 / 56);
    expect(camara).toBeInstanceOf(THREE.PerspectiveCamera);
    for (const p of esquinas) {
      const ndc = p.clone().project(camara);
      expect(Math.abs(ndc.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(ndc.y)).toBeLessThanOrEqual(1);
    }
  });

  it('mira la trasera desde el lado izquierdo del remolque (la otra 3/4 mira el frente desde el derecho)', () => {
    const detras = crearCamara('tres-cuartos-detras', escena.caja, 1.6);
    const delante = crearCamara('tres-cuartos', escena.caja, 1.6);
    expect(detras.position.z).toBeLessThan(escena.caja.min[2]);
    expect(delante.position.z).toBeGreaterThan(escena.caja.max[2]);
    // Con el espejo del render (x del mundo = −x de la escena), el lado izquierdo queda en x > 0.
    expect(detras.position.x).toBeGreaterThan(0);
    expect(delante.position.x).toBeLessThan(0);
  });
});

describe('hacia dónde va el número de cada ollao y gancho', () => {
  it('los ollaos, hacia arriba (sobre la lona); los ganchos del pedido, hacia abajo (sobre el cajón)', () => {
    const escena = escenaDePrueba({
      modoOllaos: 'SEGUN GANCHOS',
      ganchos: { laterales: [5, 150, 295], atras: [10, 100, 190], delante: [10, 100, 190] },
    });
    const marcas = cotasVisibles(escena, 'delante', crearCamara('delante', escena.caja, 1.6), 800, 500).marcas;
    expect(marcas.find((m) => m.texto === '2,5')?.hacia).toBe('arriba');
    expect(marcas.find((m) => m.texto === '10,5')?.hacia).toBe('abajo');
    expect(escena.etiquetas.every((e) => e.hacia === 'arriba' || e.hacia === 'abajo')).toBe(true);
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `pnpm exec vitest run src/client/remolques/render/impresion.test.ts`
Expected: FAIL, `crearMaterialesImpresion is not a function` / `COLOR_ARISTA` no exportado.

- [ ] **Step 3: `hacia` en las etiquetas de la escena**

En `src/remolques/escena/tipos.ts`, sustituir:

```ts
/** Número junto a un ollao o un gancho. */
export interface EtiquetaEscena { vistas: Vista[]; punto: Vec3; texto: string }
```

por:

```ts
/** Número junto a un ollao o un gancho. `hacia`: hacia dónde se escribe en la hoja de taller, que
 *  los pone en vertical para que no se pisen (ollaos hacia arriba, sobre la lona; ganchos hacia
 *  abajo, sobre el cajón). */
export interface EtiquetaEscena { vistas: Vista[]; punto: Vec3; texto: string; hacia: "arriba" | "abajo" }
```

En `src/remolques/escena/cotas.ts`, en `etiquetasMarcas`, añadir `hacia` a los dos `push`:

```ts
    if (vista) etiquetas.push({ vistas: [vista], punto: [o.punto[0], o.punto[1] + SEPARACION_ETIQUETA, o.punto[2]], texto: fmt(o.posicion), hacia: "arriba" });
```

```ts
    if (vista && g.delPedido) etiquetas.push({ vistas: [vista], punto: [g.punto[0], g.punto[1] - SEPARACION_ETIQUETA, g.punto[2]], texto: fmt(g.posicion), hacia: "abajo" });
```

En `src/client/remolques/render/proyeccion.ts`, sustituir:

```ts
export interface MarcaCota { x: number; y: number; texto: string }
```

por:

```ts
export interface MarcaCota { x: number; y: number; texto: string; hacia: 'arriba' | 'abajo' }
```

y en `cotasVisibles`:

```ts
    .map((e) => ({ ...aPantalla(e.punto, camara, ancho, alto), texto: e.texto }));
```

por:

```ts
    .map((e) => ({ ...aPantalla(e.punto, camara, ancho, alto), texto: e.texto, hacia: e.hacia }));
```

- [ ] **Step 4: La 3/4 desde detrás**

En `src/client/remolques/render/camaras.ts`:

Añadir tras `const FOV = 30;`:

```ts
/** Las vistas de la pantalla y la segunda 3/4 de la hoja de taller, desde detrás en diagonal:
 *  entre las dos 3/4 se ven los cuatro cierres. */
export type VistaCamara = Vista | 'tres-cuartos-detras';
```

Sustituir la tabla `DIRECCION`:

```ts
/** Desde dónde mira cada vista, en ejes de la escena. La 3/4 mira desde delante a la derecha y algo por encima. */
const DIRECCION: Record<Vista, Vec3> = {
  'tres-cuartos': [1, 0.6, 1.25],
```

por:

```ts
/** Desde dónde mira cada vista, en ejes de la escena. La 3/4 mira desde delante a la derecha y algo
 *  por encima; la de detrás, desde detrás a la izquierda. */
const DIRECCION: Record<VistaCamara, Vec3> = {
  'tres-cuartos': [1, 0.6, 1.25],
  'tres-cuartos-detras': [-1, 0.6, -1.25],
```

Sustituir la firma y la primera comprobación de `crearCamara`:

```ts
export function crearCamara(vista: Vista, caja: EscenaRemolque['caja'], aspecto: number): THREE.Camera {
  const { centro, tamano, caja: mundo } = encuadre(caja);
  const direccion = aMundo(DIRECCION[vista]).normalize();
  const radio = tamano.length() / 2;
  if (vista === 'tres-cuartos') {
```

por:

```ts
export function crearCamara(vista: VistaCamara, caja: EscenaRemolque['caja'], aspecto: number): THREE.Camera {
  const { centro, tamano, caja: mundo } = encuadre(caja);
  const direccion = aMundo(DIRECCION[vista]).normalize();
  const radio = tamano.length() / 2;
  if (vista === 'tres-cuartos' || vista === 'tres-cuartos-detras') {
```

- [ ] **Step 5: Luces, entorno y suelo en común**

Crear `src/client/remolques/render/escenaBase.ts`:

```ts
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { EscenaRemolque, Vec3 } from '../../../remolques/escena/tipos.ts';
import { aMundo, encuadre, type VistaCamara } from './camaras';

// Luces, entorno y suelo de sombras del render. Los usan la pantalla (RenderRemolque, en color)
// y la hoja de taller (captura.ts, en grises para la impresora de blanco y negro).

/**
 * De dónde viene el sol en cada vista, en ejes de la escena. Con un sol fijo, la cara de detrás
 * salía casi negra y la de delante lavada: cada vista fija lo pone delante de la cara que enseña,
 * alto y a la izquierda de quien mira. La 3/4, por delante a la derecha, como su cámara; la 3/4 de
 * detrás de la hoja, por detrás a la izquierda.
 */
const DIRECCION_SOL: Record<VistaCamara, Vec3> = {
  'tres-cuartos': [0.6, 1.3, 0.9],
  'tres-cuartos-detras': [-0.6, 1.3, -0.9],
  delante: [0.4, 1, 1.2],
  detras: [-0.4, 1, -1.2],
  lateral: [1.2, 1, -0.4],
  arriba: [0.9, 1.1, 0.7],
};

/** Sol y su caja de sombras alrededor del remolque, para la vista que toca. */
export function colocarSol(sol: THREE.DirectionalLight, caja: EscenaRemolque['caja'], vista: VistaCamara) {
  const { centro, tamano } = encuadre(caja);
  const radio = tamano.length() / 2;
  sol.position.copy(centro).add(aMundo(DIRECCION_SOL[vista]).normalize().multiplyScalar(radio * 3));
  sol.target.position.copy(centro);
  const sombra = sol.shadow.camera;
  sombra.left = -radio; sombra.right = radio; sombra.top = radio; sombra.bottom = -radio;
  sombra.near = 1; sombra.far = radio * 6;
  sombra.updateProjectionMatrix();
}

export interface EscenaBase {
  escena: THREE.Scene;
  sol: THREE.DirectionalLight;
  suelo: THREE.Mesh;
  liberar(): void;
}

/** La escena sin el remolque. En impresión, más luz de ambiente y menos sol: grises planos y
 *  sombras muy suaves, que en blanco y negro no tapen nada. */
export function montarEscenaBase(renderer: THREE.WebGLRenderer, { impresion = false }: { impresion?: boolean } = {}): EscenaBase {
  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const sala = new RoomEnvironment();
  const entorno = pmrem.fromScene(sala, 0.04);
  sala.dispose();
  pmrem.dispose();
  escena.environment = entorno.texture;
  // La sala tiene un panel de luz justo detrás de la cámara de delante: a plena intensidad y sin
  // girar, la lona de frente salía rosa y la de detrás, granate. Girada 45° y más suave, las
  // cinco vistas enseñan el color de la lona.
  escena.environmentIntensity = impresion ? 0.5 : 0.8;
  escena.environmentRotation.y = Math.PI / 4;
  escena.add(new THREE.HemisphereLight(0xffffff, impresion ? 0xd9d9d9 : 0x9aa0a6, impresion ? 1.1 : 0.35));
  const sol = new THREE.DirectionalLight(0xffffff, impresion ? 1.3 : 2.4);
  sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048);
  sol.shadow.bias = -0.0004;
  if (impresion) sol.shadow.radius = 6;
  escena.add(sol, sol.target);
  const suelo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShadowMaterial({ opacity: impresion ? 0.06 : 0.16 }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.receiveShadow = true;
  escena.add(suelo);
  return {
    escena,
    sol,
    suelo,
    liberar() {
      entorno.dispose();
      sol.dispose();
      suelo.geometry.dispose();
      (suelo.material as THREE.Material).dispose();
    },
  };
}
```

- [ ] **Step 6: `RenderRemolque.tsx` usa la escena base (la pantalla no cambia)**

En `src/client/remolques/render/RenderRemolque.tsx`:

Sustituir los imports:

```ts
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { EscenaRemolque, Vec3, Vista } from '../../../remolques/escena/tipos.ts';
import { aMundo, crearCamara, encuadre, espejar } from './camaras';
import { CapaCotas, CapaRotulos } from './CapaCotas';
```

por:

```ts
import type { EscenaRemolque, Vista } from '../../../remolques/escena/tipos.ts';
import { crearCamara, encuadre, espejar } from './camaras';
import { CapaCotas, CapaRotulos } from './CapaCotas';
import { colocarSol, montarEscenaBase } from './escenaBase';
```

Borrar entero el bloque que empieza en `/**\n * De dónde viene el sol en cada vista` (la constante `DIRECCION_SOL`) y la función `colocarSol` que le sigue (ahora viven en `escenaBase.ts`). `NOMBRE_VISTA` se queda.

Sustituir, dentro del primer `useEffect`, desde `const escena3D = new THREE.Scene();` hasta `escena3D.add(suelo);` (ambas incluidas) por:

```ts
    // Luces, entorno y suelo de sombras: los mismos que la hoja de taller, en color (escenaBase.ts).
    const base = montarEscenaBase(renderer);
    const { escena: escena3D, sol, suelo } = base;
```

Y en la limpieza de ese mismo efecto, sustituir:

```ts
      entorno.dispose();
      sol.dispose();
      suelo.geometry.dispose();
      (suelo.material as THREE.Material).dispose();
      renderer.dispose();
```

por:

```ts
      base.liberar();
      renderer.dispose();
```

- [ ] **Step 7: Materiales en grises**

Añadir al final de `src/client/remolques/render/materiales.ts`, antes de `liberarMateriales`:

```ts
/**
 * Materiales de la hoja de taller (fase 4). La impresora del taller es de blanco y negro, así que
 * el dibujo se piensa en grises: lona gris claro, cajón y chasis en otro gris, goma y ollaos en
 * negro. Mismas claves que en pantalla y sin texturas: en papel la trama del tejido solo ensucia.
 */
export function crearMaterialesImpresion(): Materiales {
  const mate = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, ...extra });
  const doble = { side: THREE.DoubleSide };
  return {
    lona: mate('#e6e6e6', doble),
    lonaOscura: mate('#a6a6a6', doble),
    chapa: mate('#9c9c9c'),
    laton: mate('#111111'),
    hueco: new THREE.MeshBasicMaterial({ color: '#000000' }),
    goma: mate('#111111'),
    oscuro: mate('#2b2b2b', doble),
    malla: mate('#8c8c8c', { ...doble, transparent: true, opacity: 0.55 }),
    cincha: mate('#f2f2f2', doble),
    herraje: mate('#3c3c3c'),
    guardabarros: mate('#b0b0b0', doble),
    neumatico: mate('#2e2e2e'),
    piloto: mate('#707070'),
    ambar: mate('#8f8f8f'),
  };
}
```

- [ ] **Step 8: Aristas en las mallas**

En `src/client/remolques/render/mallas.ts`:

Añadir el import de `ClaveMaterial` (sustituir `import type { Materiales } from './materiales';` por `import type { ClaveMaterial, Materiales } from './materiales';`) y, tras `const SEPARACION_HUECO = 0.2;`:

```ts
/** Aristas de la hoja impresa: el contorno de la lona, las costuras, la bastilla y el cajón, en
 *  línea oscura. Se dibuja el borde de cada pieza y los pliegues de más de `ANGULO_ARISTA` grados. */
export const COLOR_ARISTA = '#111111';
const ANGULO_ARISTA = 30;
const CON_ARISTAS = new Set<ClaveMaterial>(['lona', 'lonaOscura', 'chapa', 'guardabarros']);
```

Sustituir el principio de `construirMallas`:

```ts
export function construirMallas(escena: EscenaRemolque, materiales: Materiales): THREE.Group {
  const grupo = new THREE.Group();
  const anadir = ({ geometria, material }: Pieza) => {
    const malla = new THREE.Mesh(geometria, materiales[material]);
    malla.castShadow = true;
    malla.receiveShadow = true;
    grupo.add(malla);
  };
```

por:

```ts
export function construirMallas(escena: EscenaRemolque, materiales: Materiales, { aristas = false }: { aristas?: boolean } = {}): THREE.Group {
  const grupo = new THREE.Group();
  const lineaArista = aristas ? new THREE.LineBasicMaterial({ color: COLOR_ARISTA }) : null;
  const anadir = ({ geometria, material }: Pieza) => {
    const malla = new THREE.Mesh(geometria, materiales[material]);
    malla.castShadow = true;
    malla.receiveShadow = true;
    if (lineaArista && CON_ARISTAS.has(material)) malla.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometria, ANGULO_ARISTA), lineaArista));
    grupo.add(malla);
  };
```

Sustituir `liberarGrupo`:

```ts
export function liberarGrupo(grupo: THREE.Group) {
  grupo.traverse((objeto) => {
    if (objeto instanceof THREE.Mesh) objeto.geometry.dispose();
    // El InstancedMesh guarda además su búfer de matrices en la GPU, que solo suelta él mismo.
    if (objeto instanceof THREE.InstancedMesh) objeto.dispose();
  });
}
```

por:

```ts
export function liberarGrupo(grupo: THREE.Group) {
  grupo.traverse((objeto) => {
    if (objeto instanceof THREE.Mesh) objeto.geometry.dispose();
    // El InstancedMesh guarda además su búfer de matrices en la GPU, que solo suelta él mismo.
    if (objeto instanceof THREE.InstancedMesh) objeto.dispose();
    // Las aristas de la hoja: su geometría y su material son solo suyos.
    if (objeto instanceof THREE.LineSegments) {
      objeto.geometry.dispose();
      (objeto.material as THREE.Material).dispose();
    }
  });
}
```

- [ ] **Step 9: Ver que pasa, y que la pantalla sigue igual**

Run: `pnpm exec vitest run src/client/remolques src/remolques/escena`
Expected: PASS, incluidas `camaras.test.ts`, `mallas.test.ts`, `detalles.test.ts` y la nueva `impresion.test.ts` (6 pruebas).

- [ ] **Step 10: El capturador**

Crear `src/client/remolques/render/captura.ts`:

```ts
import * as THREE from 'three';
import type { EscenaRemolque } from '../../../remolques/escena/tipos.ts';
import { crearCamara, encuadre, espejar } from './camaras';
import { colocarSol, montarEscenaBase } from './escenaBase';
import { construirMallas, liberarGrupo } from './mallas';
import { crearMaterialesImpresion, liberarMateriales } from './materiales';
import { cotasVisibles, rotulosVisibles, type CotasPantalla, type RotuloPantalla } from './proyeccion';

// Vistas de la hoja de taller (fase 4): el mismo render que la pantalla, en grises, pintado en un
// solo lienzo fuera de pantalla (un único contexto WebGL para todas las vistas de todos los
// elementos: el navegador admite pocos a la vez) y guardado como PNG. Las cotas y los rótulos de
// las vistas rectas salen en píxeles de la captura, para pintarlos encima en SVG.

export type VistaHoja = 'tres-cuartos' | 'tres-cuartos-detras' | 'delante' | 'detras' | 'lateral';
/** Arriba, grandes y sin cotas, las dos 3/4; abajo, las vistas rectas con cotas. Sin vista de arriba. */
export const VISTAS_HOJA: VistaHoja[] = ['tres-cuartos', 'tres-cuartos-detras', 'delante', 'detras', 'lateral'];

export interface CapturaVista {
  /** PNG en data URL, de `ancho` × `alto` píxeles. */
  png: string;
  ancho: number;
  alto: number;
  /** Solo en las vistas rectas. */
  cotas: CotasPantalla | null;
  rotulos: RotuloPantalla[];
}

export interface Capturador {
  capturar(escena: EscenaRemolque, vista: VistaHoja, ancho: number, alto: number): CapturaVista;
  liberar(): void;
}

const esRecta = (vista: VistaHoja): vista is 'delante' | 'detras' | 'lateral' =>
  vista === 'delante' || vista === 'detras' || vista === 'lateral';

export function crearCapturador(): Capturador {
  const lienzo = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: lienzo, antialias: true, alpha: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setClearColor(0xffffff, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Sin mapeo de tonos: los grises de los materiales llegan al papel tal cual.
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const base = montarEscenaBase(renderer, { impresion: true });
  const materiales = crearMaterialesImpresion();
  let actual: { escena: EscenaRemolque; grupo: THREE.Group } | null = null;

  /** Las mallas de un elemento se hacen una vez y valen para sus cinco vistas. */
  function preparar(escena: EscenaRemolque) {
    if (actual?.escena === escena) return;
    if (actual) {
      base.escena.remove(actual.grupo);
      liberarGrupo(actual.grupo);
    }
    const grupo = construirMallas(escena, materiales, { aristas: true });
    espejar(grupo);
    base.escena.add(grupo);
    const { centro, tamano } = encuadre(escena.caja);
    base.suelo.scale.set(tamano.x * 4, tamano.z * 4, 1);
    base.suelo.position.set(centro.x, escena.caja.min[1] - 0.05, centro.z);
    actual = { escena, grupo };
  }

  return {
    capturar(escena, vista, ancho, alto) {
      preparar(escena);
      renderer.setSize(ancho, alto, false);
      const camara = crearCamara(vista, escena.caja, ancho / alto);
      colocarSol(base.sol, escena.caja, vista);
      renderer.render(base.escena, camara);
      const png = lienzo.toDataURL('image/png');
      if (!esRecta(vista)) return { png, ancho, alto, cotas: null, rotulos: [] };
      return {
        png, ancho, alto,
        cotas: cotasVisibles(escena, vista, camara, ancho, alto),
        rotulos: rotulosVisibles(escena, vista, camara, ancho, alto),
      };
    },
    liberar() {
      if (actual) {
        base.escena.remove(actual.grupo);
        liberarGrupo(actual.grupo);
        actual = null;
      }
      liberarMateriales(materiales);
      base.liberar();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
```

- [ ] **Step 11: Comprobar todo**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: todo pasa. (La captura necesita WebGL: se ve funcionar en la Task 4.)

Arrancar la aislada (`bash .claude/skills/running-toldos-testar/start-isolated.sh`, en segundo plano), abrir Remolques con un caso con ventana y mirar las cinco vistas en claro: tienen que verse **igual que antes** (mismo color, luz y sombras). Parar la aislada.

- [ ] **Step 12: Commit**

```bash
git add src/remolques/escena/tipos.ts src/remolques/escena/cotas.ts src/client/remolques/render/camaras.ts src/client/remolques/render/escenaBase.ts src/client/remolques/render/materiales.ts src/client/remolques/render/mallas.ts src/client/remolques/render/proyeccion.ts src/client/remolques/render/RenderRemolque.tsx src/client/remolques/render/captura.ts src/client/remolques/render/impresion.test.ts
git commit -m "feat(remolques): render en grises y captura de vistas para la hoja

La impresora del taller es de blanco y negro: la hoja usa las mismas mallas que
la pantalla con materiales grises, aristas y costuras en línea oscura y sombras
muy suaves, y una segunda 3/4 desde detrás para ver los cuatro cierres. El
capturador pinta todas las vistas en un solo contexto WebGL y deja las cotas en
píxeles para dibujarlas encima. Luces y suelo pasan a una pieza común; la
pantalla no cambia.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: La página interna de la hoja

Modelo recomendado: el más capaz (Opus). Esfuerzo: alto (maquetación de impresión y ajuste visual con muestras).

**Files:**
- Create: `hoja-remolques.html`, `src/client/hoja/main.tsx`, `ventana-hoja.d.ts`, `cargarHoja.ts`, `muestraDev.ts`, `medidas.ts`, `prepararHoja.ts`, `HojaPedido.tsx`, `PaginaHoja.tsx`, `CapaCotasHoja.tsx`, `hoja.css`
- Modify: `vite.config.ts`, `.claude/skills/running-toldos-testar/SKILL.md`
- Test: `src/client/hoja/cargarHoja.test.ts`, `medidas.test.ts`, `prepararHoja.test.ts`, `PaginaHoja.test.tsx`

**Interfaces:**
- Consumes: `DatosHojaPedido` (Task 1), `paginaHoja`, `PaginaHojaDatos`, `TablaPosiciones` (Task 1), `prepararPedidoHoja`, `muestrasHoja`, `NOMBRES_MUESTRAS` (Task 2), `crearCapturador`, `VISTAS_HOJA`, `VistaHoja`, `CapturaVista`, `Capturador` (Task 3), `construirEscena` (`src/remolques/escena/index.ts`).
- Produces: la página `/hoja-remolques.html?id=<id>` (y en desarrollo `?muestra=<nombre>`), que deja `window.hojaLista = true` cuando está pintada o `window.hojaError = "<motivo>"`.
- Produces (`medidas.ts`): `PX_POR_MM = 220 / 25.4`, `aPixeles(mm: number): number`, `ANCHO_DIBUJO_MM = 211`, `HUECO_MM = 3`, `LETRA_COTA_MM = 7 * 0.3528`, `interface MedidaMm { ancho: number; alto: number }`, `tamanoVista(vista: VistaHoja, conGanchos: boolean): MedidaMm`.
- Produces (`cargarHoja.ts`): `cargarDatosHoja(busqueda: string, pedir?: (url: string, init?: RequestInit) => Promise<Response>): Promise<DatosHojaPedido>`.
- Produces (`prepararHoja.ts`): `interface HojaPreparada { pagina: PaginaHojaDatos; vistas: Record<VistaHoja, CapturaVista> | null }`, `prepararHoja(datos: DatosHojaPedido, capturador: Capturador): HojaPreparada[]`.
- Produces: `PaginaHoja({ pagina, vistas })`, `HojaPedido({ hojas, onLista, onError })`, `CapaCotasHoja({ captura })`.

Distribución de cada hoja (A4 apaisado, 297 × 210 mm, margen 8 mm; medidas en `medidas.ts`, que manda):

```
┌ cabecera: logo · CLIENTE (REALIZADO POR, REVISADO POR) · Nº PEDIDO (O.F., FECHA) ───────────┐
├ título: REMOLQUE · 2 DE 3 ────────────────────────────────────────────────────────────────────┤
├ banda de corte: PAÑOS A CORTAR │ MEDIDA LONA HECHA (o REMOLQUE) │ CONTORNO (o BAQUETÓN) ─────┤
├ columna 62 mm ┬ dibujo 211 mm ────────────────────────────────────────────────────────────────┤
│ FORMA         │ [3/4 desde delante 104×56]  [3/4 desde detrás 104×56]   (sin cotas)          │
│ ACABADOS      │ [delante 52×47] [detrás 52×47] [lateral 101×47]         (cotas, ollaos)      │
│ MATERIAL      │                                                                              │
│ OBSERVACIONES │                                                                              │
├ OLLAOS · … (tabla 3 filas × N columnas + TOTAL, a lo ancho) ──────────────────────────────────┤
├ GANCHOS · … (solo «Según ganchos»; entonces las vistas bajan a 104×44 y 52/101×35) ──────────┤
└ NOTAS DEL CÁLCULO ─────────────────────────────────────────────────────────────────────────────┘
```

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/client/hoja/medidas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { VISTAS_HOJA } from '../remolques/render/captura';
import { ANCHO_DIBUJO_MM, aPixeles, HUECO_MM, LETRA_COTA_MM, tamanoVista } from './medidas';

describe('medidas de las vistas en la hoja', () => {
  it.each([false, true])('caben a lo ancho del dibujo (con ganchos: %s)', (conGanchos) => {
    const t = (v: (typeof VISTAS_HOJA)[number]) => tamanoVista(v, conGanchos);
    expect(t('tres-cuartos').ancho + HUECO_MM + t('tres-cuartos-detras').ancho).toBe(ANCHO_DIBUJO_MM);
    expect(t('delante').ancho + t('detras').ancho + t('lateral').ancho + 2 * HUECO_MM).toBe(ANCHO_DIBUJO_MM);
  });

  it('con la tabla de ganchos las vistas encogen, más las rectas que las 3/4', () => {
    const alto = (conGanchos: boolean) => tamanoVista('tres-cuartos', conGanchos).alto + HUECO_MM + tamanoVista('delante', conGanchos).alto;
    expect(alto(false)).toBe(106);
    expect(alto(true)).toBe(82);
  });

  it.each(VISTAS_HOJA)('%s se captura a 200 ppp o más en su tamaño impreso', (vista) => {
    for (const conGanchos of [false, true]) {
      const { ancho, alto } = tamanoVista(vista, conGanchos);
      expect(aPixeles(ancho) / (ancho / 25.4)).toBeGreaterThanOrEqual(200);
      expect(aPixeles(alto) / (alto / 25.4)).toBeGreaterThanOrEqual(200);
    }
  });

  it('la letra de las cotas no baja de 7 pt', () => {
    expect(LETRA_COTA_MM / 0.3528).toBeGreaterThanOrEqual(7);
  });
});
```

Crear `src/client/hoja/cargarHoja.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { cargarDatosHoja } from './cargarHoja';

const respuesta = (status: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } }));

describe('cargarDatosHoja', () => {
  it('pide los datos con el identificador de la dirección, sin caché', async () => {
    const pedidas: Array<[string, RequestInit | undefined]> = [];
    const datos = await cargarDatosHoja('?id=abc%20123', (url, init) => {
      pedidas.push([url, init]);
      return respuesta(200, { elementos: [], params: {} });
    });
    expect(pedidas).toEqual([['/api/remolques/hoja/abc%20123', { cache: 'no-store' }]]);
    expect(datos).toEqual({ elementos: [], params: {} });
  });

  it('sin identificador no pide nada', async () => {
    await expect(cargarDatosHoja('', () => respuesta(200, {}))).rejects.toThrow('Falta el identificador de la hoja.');
  });

  it('devuelve el error del servidor tal cual', async () => {
    await expect(cargarDatosHoja('?id=x', () => respuesta(404, { error: 'Los datos de esta hoja ya no están disponibles: vuelve a pedir el PDF.' })))
      .rejects.toThrow('Los datos de esta hoja ya no están disponibles: vuelve a pedir el PDF.');
    await expect(cargarDatosHoja('?id=x', () => Promise.resolve(new Response('roto', { status: 500 }))))
      .rejects.toThrow('No se pudieron leer los datos de la hoja (500).');
  });
});
```

Crear `src/client/hoja/prepararHoja.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import casos from '../../remolques/__fixtures__/produccion-2026-09.json';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { muestrasHoja, type CasoFixture } from '../../remolques/hoja/muestras.ts';
import { prepararPedidoHoja } from '../../remolques/hoja/pedido.ts';
import type { Capturador, VistaHoja } from '../remolques/render/captura';
import { aPixeles, tamanoVista } from './medidas';
import { prepararHoja } from './prepararHoja';

function capturadorFalso() {
  const llamadas: Array<[VistaHoja, number, number]> = [];
  const capturador: Capturador = {
    capturar: (_escena, vista, ancho, alto) => {
      llamadas.push([vista, ancho, alto]);
      return { png: `data:image/png;base64,${vista}`, ancho, alto, cotas: null, rotulos: [] };
    },
    liberar: () => {},
  };
  return { capturador, llamadas };
}

const muestras = muestrasHoja(casos as CasoFixture[]);

describe('prepararHoja', () => {
  it('una hoja por elemento, en orden, con sus cinco vistas al tamaño de la hoja', () => {
    const { capturador, llamadas } = capturadorFalso();
    const hojas = prepararHoja(prepararPedidoHoja(muestras.varios, DEFAULT_PARAMS), capturador);
    expect(hojas.map((h) => h.pagina.titulo)).toEqual(['REMOLQUE · 1 DE 3', 'BAQUETÓN · 2 DE 3', 'REMOLQUE · 3 DE 3']);
    expect(llamadas).toHaveLength(15);
    const { ancho, alto } = tamanoVista('lateral', false);
    expect(llamadas[4]).toEqual(['lateral', aPixeles(ancho), aPixeles(alto)]);
    expect(Object.keys(hojas[0].vistas!)).toEqual(['tres-cuartos', 'tres-cuartos-detras', 'delante', 'detras', 'lateral']);
  });

  it('con «Según ganchos» captura las vistas al tamaño más pequeño', () => {
    const { capturador, llamadas } = capturadorFalso();
    const [hoja] = prepararHoja(prepararPedidoHoja(muestras['segun-ganchos'], DEFAULT_PARAMS), capturador);
    expect(hoja.pagina.ganchos).not.toBeNull();
    expect(llamadas[0]).toEqual(['tres-cuartos', aPixeles(tamanoVista('tres-cuartos', true).ancho), aPixeles(tamanoVista('tres-cuartos', true).alto)]);
  });
});
```

Crear `src/client/hoja/PaginaHoja.test.tsx`:

```tsx
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import casos from '../../remolques/__fixtures__/produccion-2026-09.json';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { muestrasHoja, type CasoFixture } from '../../remolques/hoja/muestras.ts';
import { paginaHoja } from '../../remolques/hoja/pagina.ts';
import { prepararPedidoHoja } from '../../remolques/hoja/pedido.ts';
import { PaginaHoja } from './PaginaHoja';

const muestras = muestrasHoja(casos as CasoFixture[]);
const pagina = (nombre: keyof typeof muestras, indice = 0) => {
  const datos = prepararPedidoHoja(muestras[nombre], DEFAULT_PARAMS);
  return paginaHoja(datos.elementos[indice], indice, datos.elementos.length, datos.params);
};
const desescapar = (t: string) => t.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

describe('PaginaHoja', () => {
  it('lleva cabecera, título, banda, grupos, tabla de ollaos y las cinco vistas', () => {
    const html = desescapar(renderToStaticMarkup(<PaginaHoja pagina={pagina('varios')} vistas={null} />));
    for (const texto of [
      'CLIENTE DE PRUEBA', 'REALIZADO POR', 'REVISADO POR', 'AR.26.99996', '0239999', '30/09/2026',
      'REMOLQUE · 1 DE 3', 'PAÑOS A CORTAR', 'MEDIDA LONA HECHA', 'FORMA', 'ACABADOS', 'MATERIAL', 'OBSERVACIONES',
      'OLLAOS LATERALES DE ATRÁS A ADELANTE', 'TOTAL', '3/4 DESDE DELANTE', '3/4 DESDE DETRÁS', 'VISTA LATERAL',
    ]) expect(html).toContain(texto);
    expect(html).not.toContain('GANCHOS ·');
    expect(html).toContain('src="/logo-tgm-transparent.png"');
  });

  it('con «Según ganchos» añade su tabla y encoge el dibujo', () => {
    const html = desescapar(renderToStaticMarkup(<PaginaHoja pagina={pagina('segun-ganchos')} vistas={null} />));
    expect(html).toContain('GANCHOS DELANTE DE DERECHA A IZQUIERDA (MEDIDO AL REVÉS)');
    expect(html).toContain('hoja-pagina con-ganchos');
  });

  it('«REVISADO POR» va vacío y las notas del cálculo salen al pie', () => {
    const html = desescapar(renderToStaticMarkup(<PaginaHoja pagina={pagina('lona-ventana')} vistas={null} />));
    expect(html).toMatch(/<span>REVISADO POR<\/span><strong><\/strong>/);
    expect(html).toContain('NOTAS DEL CÁLCULO');
    expect(html).toContain('Incluye rotulación.');
  });
});
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm exec vitest run src/client/hoja`
Expected: FAIL, `Failed to resolve import "./medidas"` (y los demás).

- [ ] **Step 3: Medidas**

Crear `src/client/hoja/medidas.ts`:

```ts
import type { VistaHoja } from '../remolques/render/captura';

// Tamaños de la hoja de taller, en milímetros de papel (A4 apaisado). hoja.css usa los mismos
// números: si cambias uno aquí, cámbialo allí. Las vistas se capturan a 220 ppp de su tamaño
// impreso para que el papel no las pixele (mínimo pedido: 200 ppp).

export const PX_POR_MM = 220 / 25.4;
export const aPixeles = (mm: number) => Math.round(mm * PX_POR_MM);

/** Ancho del hueco del dibujo (a la derecha de la columna de datos) y separación entre vistas. */
export const ANCHO_DIBUJO_MM = 211;
export const HUECO_MM = 3;

/** Letra de cotas y números de ollaos: 7 pt, lo mínimo que se lee bien impreso (1 pt = 0,3528 mm). */
export const LETRA_COTA_MM = 7 * 0.3528;

export interface MedidaMm { ancho: number; alto: number }

const NORMAL: Record<VistaHoja, MedidaMm> = {
  'tres-cuartos': { ancho: 104, alto: 56 },
  'tres-cuartos-detras': { ancho: 104, alto: 56 },
  delante: { ancho: 52, alto: 47 },
  detras: { ancho: 52, alto: 47 },
  lateral: { ancho: 101, alto: 47 },
};

/** Con la tabla de ganchos no cabe todo: primero encogen las vistas rectas, luego las 3/4. */
const CON_GANCHOS: Record<VistaHoja, MedidaMm> = {
  'tres-cuartos': { ancho: 104, alto: 44 },
  'tres-cuartos-detras': { ancho: 104, alto: 44 },
  delante: { ancho: 52, alto: 35 },
  detras: { ancho: 52, alto: 35 },
  lateral: { ancho: 101, alto: 35 },
};

export function tamanoVista(vista: VistaHoja, conGanchos: boolean): MedidaMm {
  return (conGanchos ? CON_GANCHOS : NORMAL)[vista];
}
```

- [ ] **Step 4: Cargar los datos**

Crear `src/client/hoja/ventana-hoja.d.ts`:

```ts
export {};

declare global {
  interface Window {
    /** La hoja de taller está pintada entera (fuentes, logo y dibujos): Chromium ya puede imprimirla. */
    hojaLista?: boolean;
    /** Por qué no se ha podido pintar la hoja; el servidor lo devuelve tal cual. */
    hojaError?: string;
  }
}
```

Crear `src/client/hoja/cargarHoja.ts`:

```ts
import type { DatosHojaPedido } from '../../remolques/hoja/tipos.ts';

type Pedir = (url: string, init?: RequestInit) => Promise<Response>;

/** Los datos de la hoja, con el identificador de un solo uso que puso el servidor en la dirección. */
export async function cargarDatosHoja(busqueda: string, pedir: Pedir = (url, init) => fetch(url, init)): Promise<DatosHojaPedido> {
  const id = new URLSearchParams(busqueda).get('id');
  if (!id) throw new Error('Falta el identificador de la hoja.');
  const respuesta = await pedir(`/api/remolques/hoja/${encodeURIComponent(id)}`, { cache: 'no-store' });
  const cuerpo = await respuesta.json().catch(() => null) as { error?: string } | null;
  if (!respuesta.ok) throw new Error(cuerpo?.error ?? `No se pudieron leer los datos de la hoja (${respuesta.status}).`);
  return cuerpo as unknown as DatosHojaPedido;
}
```

Crear `src/client/hoja/muestraDev.ts` (solo se carga en desarrollo; el build lo deja fuera):

```ts
import casos from '../../remolques/__fixtures__/produccion-2026-09.json';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { muestrasHoja, NOMBRES_MUESTRAS, type CasoFixture, type NombreMuestra } from '../../remolques/hoja/muestras.ts';
import { prepararPedidoHoja } from '../../remolques/hoja/pedido.ts';
import type { DatosHojaPedido } from '../../remolques/hoja/tipos.ts';

/** `hoja-remolques.html?muestra=varios` en desarrollo: la hoja sin pasar por el servidor. */
export function datosMuestra(nombre: string): DatosHojaPedido {
  if (!NOMBRES_MUESTRAS.includes(nombre as NombreMuestra)) {
    throw new Error(`No hay muestra «${nombre}». Hay: ${NOMBRES_MUESTRAS.join(', ')}.`);
  }
  return prepararPedidoHoja(muestrasHoja(casos as CasoFixture[])[nombre as NombreMuestra], DEFAULT_PARAMS);
}
```

- [ ] **Step 5: Preparar las hojas (datos y capturas)**

Crear `src/client/hoja/prepararHoja.ts`:

```ts
import { construirEscena } from '../../remolques/escena/index.ts';
import type { ElementoEscena } from '../../remolques/escena/tipos.ts';
import { paginaHoja, type PaginaHojaDatos } from '../../remolques/hoja/pagina.ts';
import type { DatosHojaPedido } from '../../remolques/hoja/tipos.ts';
import { VISTAS_HOJA, type CapturaVista, type Capturador, type VistaHoja } from '../remolques/render/captura';
import { aPixeles, tamanoVista } from './medidas';

export interface HojaPreparada {
  pagina: PaginaHojaDatos;
  /** null si el elemento no tiene forma que dibujar (la hoja lo dice). */
  vistas: Record<VistaHoja, CapturaVista> | null;
}

/** Los textos y las cinco vistas de cada elemento, antes de pintar nada en la página. */
export function prepararHoja(datos: DatosHojaPedido, capturador: Capturador): HojaPreparada[] {
  const total = datos.elementos.length;
  return datos.elementos.map((elemento, indice) => {
    const pagina = paginaHoja(elemento, indice, total, datos.params);
    const escena = construirEscena({ tipo: elemento.tipo, input: elemento.input, res: elemento.result } as ElementoEscena, datos.params);
    if (!escena) return { pagina, vistas: null };
    const vistas = {} as Record<VistaHoja, CapturaVista>;
    for (const vista of VISTAS_HOJA) {
      const { ancho, alto } = tamanoVista(vista, pagina.ganchos != null);
      vistas[vista] = capturador.capturar(escena, vista, aPixeles(ancho), aPixeles(alto));
    }
    return { pagina, vistas };
  });
}
```

- [ ] **Step 6: Las cotas encima de cada vista**

Crear `src/client/hoja/CapaCotasHoja.tsx`:

```tsx
import React, { useId } from 'react';
import type { CapturaVista } from '../remolques/render/captura';
import { LETRA_COTA_MM, PX_POR_MM } from './medidas';

// Cotas, números de ollaos y ganchos y rótulos DELANTE / DETRÁS encima de una vista recta, en SVG
// con las coordenadas de la captura (el SVG se estira con la imagen). Todo en negro; los números
// de ollaos van en vertical para que no se pisen: los ollaos hacia arriba (sobre la lona) y los
// ganchos hacia abajo (sobre el cajón).
const LETRA = LETRA_COTA_MM * PX_POR_MM;
const TRAZO = 0.2 * PX_POR_MM;
const HALO = 0.7 * PX_POR_MM;

export function CapaCotasHoja({ captura }: { captura: CapturaVista }) {
  const flecha = `hoja-flecha-${useId().replace(/:/g, '')}`;
  const { ancho, alto, cotas, rotulos } = captura;
  if (!cotas && rotulos.length === 0) return null;
  return (
    <svg className="hoja-cotas" viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <marker id={flecha} markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto-start-reverse">
          <path d="M8 0 L0 4 L8 8 z" />
        </marker>
      </defs>
      {cotas?.lineas.map((l, i) => {
        const vertical = Math.abs(l.x2 - l.x1) < Math.abs(l.y2 - l.y1);
        return (
          <g key={`l${i}`}>
            <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={TRAZO} markerStart={`url(#${flecha})`} markerEnd={`url(#${flecha})`} />
            <text x={vertical ? l.tx + LETRA * 0.6 : l.tx} y={vertical ? l.ty + LETRA * 0.35 : l.ty - LETRA * 0.45}
              textAnchor={vertical ? 'start' : 'middle'} fontSize={LETRA} strokeWidth={HALO}>
              {l.texto}
            </text>
          </g>
        );
      })}
      {cotas?.marcas.map((m, i) => (
        <text key={`m${i}`} className="hoja-marca" x={m.x} y={m.y} fontSize={LETRA} strokeWidth={HALO}
          textAnchor={m.hacia === 'arriba' ? 'start' : 'end'} dominantBaseline="middle" transform={`rotate(-90 ${m.x} ${m.y})`}>
          {m.texto}
        </text>
      ))}
      {rotulos.map((r) => (
        <text key={r.texto + r.alinear} className="hoja-rotulo-vista" x={r.x} y={r.y} textAnchor={r.alinear} fontSize={LETRA} strokeWidth={HALO}>
          {r.texto}
        </text>
      ))}
    </svg>
  );
}
```

- [ ] **Step 7: La hoja de un elemento**

Crear `src/client/hoja/PaginaHoja.tsx`:

```tsx
import React from 'react';
import type { PaginaHojaDatos, TablaPosiciones } from '../../remolques/hoja/pagina.ts';
import type { CapturaVista, VistaHoja } from '../remolques/render/captura';
import { CapaCotasHoja } from './CapaCotasHoja';
import { tamanoVista } from './medidas';

// Una hoja de taller (A4 apaisado) de un elemento del pedido. Mismo contenido y orden que la hoja
// de la web vieja, con el dibujo nuevo: arriba las dos 3/4 sin cotas, abajo las vistas rectas con
// cotas y la posición de cada ollao y gancho.

const fmt = (n: number) => n.toLocaleString('es-ES', { maximumFractionDigits: 2 });

const NOMBRE_VISTA: Record<VistaHoja, string> = {
  'tres-cuartos': '3/4 DESDE DELANTE',
  'tres-cuartos-detras': '3/4 DESDE DETRÁS',
  delante: 'VISTA DE DELANTE',
  detras: 'VISTA DE DETRÁS',
  lateral: 'VISTA LATERAL',
};

function DatoCabecera({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return <div className="hoja-cab-dato"><span>{etiqueta}</span><strong>{valor}</strong></div>;
}

function Vista({ vista, captura, conGanchos }: { vista: VistaHoja; captura: CapturaVista | null; conGanchos: boolean }) {
  const { ancho, alto } = tamanoVista(vista, conGanchos);
  return (
    <figure className={`hoja-vista hoja-vista-${vista}`} style={{ width: `${ancho}mm`, height: `${alto}mm` }}>
      <figcaption>{NOMBRE_VISTA[vista]}</figcaption>
      {captura ? (
        <>
          <img src={captura.png} alt={NOMBRE_VISTA[vista]} />
          <CapaCotasHoja captura={captura} />
        </>
      ) : <span className="hoja-sin-dibujo">SIN DIBUJO</span>}
    </figure>
  );
}

function Tabla({ tabla }: { tabla: TablaPosiciones }) {
  const columnas = Array.from({ length: tabla.columnas }, (_, i) => i);
  return (
    <section className="hoja-tabla-bloque">
      <span className="hoja-rotulo">{tabla.titulo}</span>
      <table className="hoja-tabla">
        <thead>
          <tr>
            <th className="hoja-tabla-nombre" />
            {columnas.map((i) => <th key={i}>{i + 1}</th>)}
            <th className="hoja-tabla-total">TOTAL</th>
          </tr>
        </thead>
        <tbody>
          {tabla.filas.map((fila) => (
            <tr key={fila.nombre}>
              <td className="hoja-tabla-nombre">{fila.nombre}</td>
              {columnas.map((i) => <td key={i}>{fila.posiciones[i] == null ? '' : fmt(fila.posiciones[i])}</td>)}
              <td className="hoja-tabla-total">{fila.posiciones.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function PaginaHoja({ pagina, vistas }: { pagina: PaginaHojaDatos; vistas: Record<VistaHoja, CapturaVista> | null }) {
  const { cabecera } = pagina;
  const conGanchos = pagina.ganchos != null;
  const vista = (v: VistaHoja) => <Vista vista={v} captura={vistas?.[v] ?? null} conGanchos={conGanchos} />;
  return (
    <article className={`hoja-pagina${conGanchos ? ' con-ganchos' : ''}`} data-titulo={pagina.titulo}>
      <header className="hoja-cabecera">
        <div className="hoja-logo"><img src="/logo-tgm-transparent.png" alt="TGM" /></div>
        <div>
          <span className="hoja-rotulo">CLIENTE</span>
          <strong className="hoja-cab-grande">{cabecera.cliente}</strong>
          <div className="hoja-cab-datos">
            <DatoCabecera etiqueta="REALIZADO POR" valor={cabecera.realizadoPor} />
            <DatoCabecera etiqueta="REVISADO POR" valor={cabecera.revisadoPor} />
          </div>
        </div>
        <div>
          <span className="hoja-rotulo">Nº PEDIDO</span>
          <strong className="hoja-cab-grande">{cabecera.numeroPedido}</strong>
          <div className="hoja-cab-datos">
            <DatoCabecera etiqueta="O.F." valor={cabecera.of} />
            <DatoCabecera etiqueta="FECHA" valor={cabecera.fecha} />
          </div>
        </div>
      </header>

      <h1 className="hoja-titulo">{pagina.titulo}</h1>

      <section className="hoja-banda">
        {pagina.banda.map((celda) => (
          <div key={celda.titulo} className="hoja-celda">
            <span className="hoja-rotulo">{celda.titulo}</span>
            {celda.lineas.map((linea, i) => <strong key={i} className="hoja-celda-linea">{linea}</strong>)}
            {celda.notas.map((nota, i) => <span key={i} className="hoja-celda-nota">{nota}</span>)}
          </div>
        ))}
      </section>

      <section className="hoja-cuerpo">
        <div className="hoja-columna">
          {pagina.grupos.map((grupo) => (
            <div key={grupo.titulo} className="hoja-grupo">
              <span className="hoja-rotulo">{grupo.titulo}</span>
              <dl>
                {grupo.datos.map((dato) => (
                  <div key={dato.etiqueta} className="hoja-dato">
                    <dt>{dato.etiqueta}</dt>
                    <dd>{dato.valores.map((valor, i) => <span key={i}>{valor}</span>)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
          <div className="hoja-grupo">
            <span className="hoja-rotulo">MATERIAL</span>
            <p className="hoja-material">{pagina.material}</p>
          </div>
          <div className="hoja-grupo">
            <span className="hoja-rotulo">OBSERVACIONES</span>
            <p className="hoja-observaciones">{pagina.observaciones}</p>
          </div>
        </div>
        <div className="hoja-dibujo">
          <div className="hoja-fila">{vista('tres-cuartos')}{vista('tres-cuartos-detras')}</div>
          <div className="hoja-fila">{vista('delante')}{vista('detras')}{vista('lateral')}</div>
        </div>
      </section>

      <Tabla tabla={pagina.ollaos} />
      {pagina.ganchos && <Tabla tabla={pagina.ganchos} />}
      {pagina.notas.length > 0 && (
        <section className="hoja-notas">
          <span className="hoja-rotulo">NOTAS DEL CÁLCULO</span>
          <ul>{pagina.notas.map((nota) => <li key={nota}>{nota}</li>)}</ul>
        </section>
      )}
    </article>
  );
}
```

- [ ] **Step 8: El pedido entero y el aviso de «lista»**

Crear `src/client/hoja/HojaPedido.tsx`:

```tsx
import React, { useEffect, useRef } from 'react';
import { PaginaHoja } from './PaginaHoja';
import type { HojaPreparada } from './prepararHoja';

const texto = (error: unknown) => (error instanceof Error ? error.message : String(error));
const desborda = (el: HTMLElement) => el.scrollHeight > el.clientHeight + 1;

async function esperarRecursos(): Promise<void> {
  await document.fonts.ready;
  await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => {
    throw new Error(`No se pudo cargar la imagen ${img.getAttribute('src')?.slice(0, 60)}.`);
  })));
}

/**
 * Todas las hojas del pedido. Cuando están pintadas comprueba que cada una cabe en su A4 (si la
 * columna de datos no cabe, prueba con la letra algo menor; si tampoco, lo dice) y, con las
 * fuentes y las imágenes cargadas, avisa de que se puede imprimir.
 */
export function HojaPedido({ hojas, onLista, onError }: {
  hojas: HojaPreparada[];
  onLista: () => void;
  onError: (mensaje: string) => void;
}) {
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const paginas = Array.from(raiz.current?.querySelectorAll<HTMLElement>('.hoja-pagina') ?? []);
    for (const pagina of paginas) {
      const columna = pagina.querySelector<HTMLElement>('.hoja-columna');
      if (columna && desborda(columna)) pagina.classList.add('hoja-apretada');
      if ((columna && desborda(columna)) || desborda(pagina)) {
        onError(`«${pagina.dataset.titulo}» no cabe en una hoja: acorta las observaciones.`);
        return;
      }
    }
    esperarRecursos().then(onLista, (error: unknown) => onError(texto(error)));
  }, [hojas, onLista, onError]);

  return (
    <div ref={raiz}>
      {hojas.map(({ pagina, vistas }) => <PaginaHoja key={pagina.clave} pagina={pagina} vistas={vistas} />)}
    </div>
  );
}
```

- [ ] **Step 9: La entrada y su HTML**

Crear `src/client/hoja/main.tsx`:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import './hoja.css';
import type { DatosHojaPedido } from '../../remolques/hoja/tipos.ts';
import { crearCapturador } from '../remolques/render/captura';
import { cargarDatosHoja } from './cargarHoja';
import { HojaPedido } from './HojaPedido';
import { prepararHoja, type HojaPreparada } from './prepararHoja';

// Hoja de taller de remolques (fase 4): página interna, sin la aplicación alrededor, que Chromium
// abre en el servidor para hacer el PDF. Avisa con window.hojaLista cuando todo está pintado, o
// deja el motivo en window.hojaError. Sin StrictMode: los datos se piden una sola vez.
const raiz = createRoot(document.getElementById('hoja')!);
const lista = () => { window.hojaLista = true; };
const fallar = (mensaje: string) => {
  if (window.hojaError) return;
  window.hojaError = mensaje;
  raiz.render(<p className="hoja-error">{mensaje}</p>);
};

function pintar(datos: DatosHojaPedido) {
  const capturador = crearCapturador();
  let hojas: HojaPreparada[];
  try {
    hojas = prepararHoja(datos, capturador);
  } finally {
    capturador.liberar();
  }
  raiz.render(<HojaPedido hojas={hojas} onLista={lista} onError={fallar} />);
}

function cargar(): Promise<DatosHojaPedido> {
  // Solo en desarrollo, y con un `if` para que el build deje fuera la muestra y su fixture.
  if (import.meta.env.DEV) {
    const muestra = new URLSearchParams(window.location.search).get('muestra');
    if (muestra) return import('./muestraDev').then(({ datosMuestra }) => datosMuestra(muestra));
  }
  return cargarDatosHoja(window.location.search);
}

cargar()
  .then(pintar)
  .catch((error: unknown) => fallar(`No se pudo preparar la hoja: ${error instanceof Error ? error.message : String(error)}`));
```

Crear `hoja-remolques.html` en la raíz del repositorio:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Hoja de taller · remolques</title>
  </head>
  <body>
    <!-- Página interna de la hoja de taller de remolques (fase 4): la abre Chromium en el
         servidor para hacer el PDF. No lleva la aplicación. -->
    <div id="hoja"></div>
    <script type="module" src="/src/client/hoja/main.tsx"></script>
  </body>
</html>
```

Sustituir `vite.config.ts` entero por:

```ts
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 4400
  },
  build: {
    rollupOptions: {
      // Dos páginas: la aplicación y la hoja de taller de remolques (fase 4), que Chromium abre
      // en el servidor para hacer el PDF. `index` mantiene el nombre del bundle principal.
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        hoja: fileURLToPath(new URL('./hoja-remolques.html', import.meta.url))
      }
    }
  },
  test: {
    // Alineado con eslint.config.js: .claude/ y output/releases/ alojan worktrees de otras
    // ramas y tmp/ borradores locales; sus tests no son evidencia de main.
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**', 'output/**', 'tmp/**']
  }
});
```

- [ ] **Step 10: El CSS de impresión**

Crear `src/client/hoja/hoja.css`:

```css
/* Hoja de taller de remolques (fase 4): A4 apaisado, una hoja por elemento, en blanco y negro
   (la impresora del taller es monocroma). Los tamaños de las vistas salen de medidas.ts, que es
   a lo que se capturan: si cambias uno aquí, cámbialo allí. La letra de medidas nunca baja de
   7 pt; el resto de tamaños sigue a la hoja de la web vieja. */
@page { size: A4 landscape; margin: 0; }

:root {
  --tinta: #000;
  --gris: #4d4d4d;
  --filete: #9a9a9a;
}

* { box-sizing: border-box; }
html, body { background: #fff; margin: 0; padding: 0; }
body {
  color: var(--tinta);
  font-family: 'Geist Variable', Arial, Helvetica, sans-serif;
  font-size: 8pt;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.hoja-pagina {
  break-after: page;
  display: flex;
  flex-direction: column;
  gap: 2mm;
  height: 210mm;
  overflow: hidden;
  padding: 8mm 8mm 7mm;
  width: 297mm;
}
.hoja-pagina:last-child { break-after: auto; }

.hoja-rotulo {
  color: var(--gris);
  display: block;
  font-size: 6.5pt;
  font-weight: 600;
  letter-spacing: 0.08em;
  margin-bottom: 0.8mm;
}

/* ── Cabecera ── */
.hoja-cabecera {
  align-items: center;
  border-bottom: 0.4mm solid var(--tinta);
  display: grid;
  gap: 4mm;
  grid-template-columns: 34mm 1fr 74mm;
  padding-bottom: 2mm;
}
.hoja-logo img { display: block; filter: grayscale(1); height: 16mm; object-fit: contain; width: 30mm; }
.hoja-cab-grande { display: block; font-size: 12pt; font-weight: 700; margin-bottom: 1mm; }
.hoja-cab-datos { display: flex; gap: 6mm; }
.hoja-cab-dato { align-items: baseline; display: flex; gap: 1.5mm; }
.hoja-cab-dato span { color: var(--gris); font-size: 6.5pt; font-weight: 600; letter-spacing: 0.06em; }
/* Hueco también cuando va vacío («REVISADO POR» hasta la fase 5). */
.hoja-cab-dato strong { display: inline-block; font-size: 8.5pt; font-weight: 600; min-width: 22mm; }

.hoja-titulo {
  border-bottom: 0.2mm solid var(--filete);
  font-size: 9pt;
  font-weight: 700;
  letter-spacing: 0.14em;
  margin: 0;
  padding: 1mm 0;
  text-align: center;
}

/* ── Banda de corte: los paños son tres líneas y el contorno un número ── */
.hoja-banda {
  border-bottom: 0.2mm solid var(--filete);
  display: grid;
  grid-template-columns: 2.4fr 1.5fr 1fr;
  padding-bottom: 2mm;
}
.hoja-celda { padding: 0 3mm; }
.hoja-celda:first-child { padding-left: 0; }
.hoja-celda + .hoja-celda { border-left: 0.2mm solid var(--filete); }
.hoja-celda-linea { display: block; font-size: 12pt; font-weight: 700; line-height: 1.15; }
.hoja-celda-nota { color: var(--gris); display: block; font-size: 7.5pt; margin-top: 0.3mm; }

/* ── Cuerpo: datos a la izquierda, dibujo a la derecha ── */
.hoja-cuerpo {
  display: grid;
  flex: none;
  gap: 4mm;
  grid-template-columns: 62mm 211mm;
  height: 106mm;
}
.con-ganchos .hoja-cuerpo { height: 82mm; }
.hoja-columna { border-right: 0.2mm solid var(--filete); overflow: hidden; padding-right: 3mm; }
.hoja-grupo { margin-bottom: 3mm; }
.hoja-grupo dl { margin: 0; }
.hoja-dato { display: grid; gap: 1.5mm; grid-template-columns: 24mm 1fr; margin-bottom: 1.2mm; }
.hoja-dato dt { color: var(--gris); font-size: 7pt; padding-top: 0.3mm; }
.hoja-dato dd { font-size: 9pt; font-weight: 600; line-height: 1.15; margin: 0; }
.hoja-dato dd span { display: block; }
.hoja-material { font-size: 9pt; font-weight: 600; margin: 0; }
/* Regular, no negrita: el texto largo en negrita se lee peor. */
.hoja-observaciones { font-size: 9pt; line-height: 1.3; margin: 0; white-space: pre-wrap; }
/* Si la columna no cabe, un punto menos antes de dar la hoja por mala (HojaPedido.tsx). */
.hoja-apretada .hoja-dato dd,
.hoja-apretada .hoja-material,
.hoja-apretada .hoja-observaciones { font-size: 7.5pt; }

.hoja-dibujo { display: flex; flex-direction: column; gap: 3mm; }
.hoja-fila { display: flex; gap: 3mm; }
.hoja-vista { border: 0.2mm solid var(--filete); flex: none; margin: 0; position: relative; }
.hoja-vista img,
.hoja-cotas { height: 100%; inset: 0; position: absolute; width: 100%; }
.hoja-vista figcaption {
  color: var(--gris);
  font-size: 6pt;
  font-weight: 600;
  left: 1mm;
  letter-spacing: 0.08em;
  position: absolute;
  top: 0.8mm;
  z-index: 1;
}
.hoja-sin-dibujo { align-items: center; color: var(--gris); display: flex; height: 100%; justify-content: center; }
.hoja-cotas line { stroke: var(--tinta); }
.hoja-cotas marker path { fill: var(--tinta); }
.hoja-cotas text {
  fill: var(--tinta);
  font-family: 'Geist Variable', Arial, sans-serif;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  paint-order: stroke;
  stroke: #fff;
}
.hoja-cotas .hoja-marca { font-weight: 500; }
.hoja-cotas .hoja-rotulo-vista { fill: var(--gris); letter-spacing: 0.12em; }

/* ── Tablas de ollaos y ganchos, a lo ancho ── */
.hoja-tabla {
  border-bottom: 0.3mm solid var(--tinta);
  border-collapse: collapse;
  border-top: 0.3mm solid var(--tinta);
  table-layout: fixed;
  width: 100%;
}
.hoja-tabla th,
.hoja-tabla td {
  border-right: 0.2mm solid var(--filete);
  font-size: 8pt;
  padding: 0.6mm 0.5mm;
  text-align: center;
}
.hoja-tabla th { border-bottom: 0.3mm solid var(--tinta); color: var(--gris); font-size: 6.5pt; font-weight: 600; }
.hoja-tabla td { border-bottom: 0.2mm solid var(--filete); font-variant-numeric: tabular-nums; }
.hoja-tabla tr:last-child td { border-bottom: 0; }
.hoja-tabla th:last-child,
.hoja-tabla td:last-child { border-right: 0; }
.hoja-tabla .hoja-tabla-nombre { font-size: 7pt; font-weight: 600; text-align: left; width: 66mm; }
.hoja-tabla .hoja-tabla-total { font-weight: 700; width: 12mm; }

.hoja-notas ul { font-size: 8pt; margin: 0; padding-left: 4mm; }

.hoja-error { font: 12pt Arial, sans-serif; padding: 10mm; }
```

- [ ] **Step 11: Ver que pasan las pruebas y el build hace las dos páginas**

Run: `pnpm exec vitest run src/client/hoja && pnpm typecheck && pnpm lint`
Expected: PASS (`medidas.test.ts` 9, `cargarHoja.test.ts` 3, `prepararHoja.test.ts` 2, `PaginaHoja.test.tsx` 3) y sin errores.

Run: `pnpm exec vite build`
Expected: termina bien y existen `dist/index.html` y `dist/hoja-remolques.html`. Comprobar que three.js sigue en un solo trozo y fuera del bundle principal:

```bash
node -e "const fs=require('fs');const t=fs.readdirSync('dist/assets').filter(f=>f.endsWith('.js')&&fs.readFileSync('dist/assets/'+f,'utf8').includes('WebGLRenderer'));console.log(t);if(t.length!==1||t[0].startsWith('index-'))process.exit(1)"
```

Expected: una sola línea con un trozo que no empieza por `index-`. Y la muestra de desarrollo no llega al build:

```bash
node -e "const fs=require('fs');const m=fs.readdirSync('dist/assets').filter(f=>/muestra/i.test(f));console.log(m);if(m.length)process.exit(1)"
```

Expected: `[]`.

- [ ] **Step 12: Verla en la instancia aislada con las muestras**

Arrancar la aislada en segundo plano: `bash .claude/skills/running-toldos-testar/start-isolated.sh`; esperar a `curl -fsS http://127.0.0.1:4310/api/health`.

Crear `tmp/ver-hoja.mjs` (no se versiona; dentro del repo para que resuelva `playwright`):

```js
import fs from 'node:fs';
import { chromium } from 'playwright';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const SALIDA = 'tmp/ui-audit/remolques-4';
fs.mkdirSync(SALIDA, { recursive: true });
const HOJAS = { 'lona-ventana': 1, baqueton: 1, 'segun-ganchos': 1, bastilla: 1, perfiles: 5, varios: 3 };
const navegador = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const pagina = await navegador.newPage({ viewport: { width: 1123, height: 794 } });
const errores = [];
pagina.on('pageerror', (e) => errores.push(e.message));
pagina.on('console', (m) => { if (m.type() === 'error') errores.push(m.text()); });
for (const [muestra, hojas] of Object.entries(HOJAS)) {
  const inicio = Date.now();
  await pagina.goto(`http://127.0.0.1:4310/hoja-remolques.html?muestra=${muestra}`);
  await pagina.waitForFunction(() => window.hojaLista === true || typeof window.hojaError === 'string', undefined, { timeout: 60000 });
  const error = await pagina.evaluate(() => window.hojaError ?? null);
  if (error) throw new Error(`${muestra}: ${error}`);
  const ruta = `${SALIDA}/pagina-${muestra}.pdf`;
  await pagina.pdf({ path: ruta, format: 'A4', landscape: true, printBackground: true, preferCSSPageSize: true });
  await pagina.screenshot({ path: `${SALIDA}/pagina-${muestra}.png`, fullPage: true });
  const pdf = await getDocument({ data: new Uint8Array(fs.readFileSync(ruta)) }).promise;
  if (pdf.numPages !== hojas) throw new Error(`${muestra}: ${pdf.numPages} hojas en vez de ${hojas}`);
  console.log(`${muestra}: ${hojas} hoja(s), ${Date.now() - inicio} ms`);
}
if (errores.length) throw new Error(errores.join('\n'));
await navegador.close();
```

Run: `node tmp/ver-hoja.mjs`
Expected: seis líneas `…: N hoja(s), … ms` y ningún error.

**Mirar todos los PDF y PNG de `tmp/ui-audit/remolques-4/`** (en Windows, `Invoke-Item tmp/ui-audit/remolques-4/pagina-varios.pdf`). Criterios para darla por buena, y ajustar `medidas.ts` + `hoja.css` (siempre los dos a la vez) hasta que se cumplan:
- Cada elemento en una sola hoja A4 apaisada; nada cortado por abajo ni por la derecha.
- Las dos 3/4 enseñan entre las dos los cuatro cierres; las vistas rectas tienen las cotas de largo, ancho y alto y un número por cada ollao (y por cada gancho en «Según ganchos») que se leen sin pisarse; «DELANTE» y «DETRÁS» como en pantalla.
- En grises: la lona se distingue del cajón, la goma y los ollaos se ven en negro, las aristas marcan la forma y las sombras no tapan nada.
- La letra de las cotas nunca por debajo de 7 pt: si no cabe, se encogen primero las vistas rectas (`CON_GANCHOS`/`NORMAL` en `medidas.ts`), nunca la letra.
- La tabla de ollaos y la de ganchos se leen enteras, con su título.

Parar la aislada.

- [ ] **Step 13: Apuntarlo en la skill de la instancia aislada**

Añadir al final de `.claude/skills/running-toldos-testar/SKILL.md`:

```markdown

## Hoja de taller de remolques (fase 4)

`/hoja-remolques.html` es una página interna (segunda entrada de Vite) que Chromium imprime en el
servidor. En desarrollo se ve sin pasar por el servidor con una muestra:
`http://127.0.0.1:4310/hoja-remolques.html?muestra=varios` (hay `lona-ventana`, `baqueton`,
`segun-ganchos`, `bastilla`, `perfiles` y `varios`, de `src/remolques/hoja/muestras.ts`). Cuando
termina de pintarse deja `window.hojaLista = true`, o el motivo en `window.hojaError`. Necesita
WebGL: en Playwright, `launchArgs: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']`.
```

- [ ] **Step 14: Commit**

```bash
git add hoja-remolques.html vite.config.ts src/client/hoja/main.tsx src/client/hoja/ventana-hoja.d.ts src/client/hoja/cargarHoja.ts src/client/hoja/muestraDev.ts src/client/hoja/medidas.ts src/client/hoja/prepararHoja.ts src/client/hoja/HojaPedido.tsx src/client/hoja/PaginaHoja.tsx src/client/hoja/CapaCotasHoja.tsx src/client/hoja/hoja.css src/client/hoja/cargarHoja.test.ts src/client/hoja/medidas.test.ts src/client/hoja/prepararHoja.test.ts src/client/hoja/PaginaHoja.test.tsx .claude/skills/running-toldos-testar/SKILL.md
git commit -m "feat(remolques): página interna de la hoja de taller

La hoja se maqueta en HTML y CSS de impresión, fuera de la aplicación, para que
Chromium la convierta en PDF en el servidor: una hoja A4 apaisada por elemento,
con la cabecera, la banda de corte, los datos y las tablas de la hoja vieja, y
el dibujo nuevo en grises (dos 3/4 arriba, vistas rectas con cotas abajo). Cada
vista se captura a 220 ppp de su tamaño en papel y la página avisa cuando está
lista o dice por qué no.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Servidor — identificador de un uso, Chromium y vista previa

Modelo recomendado: el más capaz (Opus). Esfuerzo: alto (proceso externo, cola, tiempos y cierre ordenado).

**Files:**
- Create: `src/remolques/salida/fichas.ts`, `src/remolques/salida/navegador.ts`
- Modify: `src/server.js`, `package.json`, `pnpm-lock.yaml`
- Test: `src/remolques/salida/__tests__/fichas.test.ts`, `src/remolques/salida/__tests__/navegador.test.ts`

**Interfaces:**
- Consumes: `prepararPedidoHoja`, `ErrorPedidoHoja` (Task 2), `nombrePdf` (Task 2), `DatosHojaPedido` (Task 1), la página `/hoja-remolques.html?id=` y `window.hojaLista` / `window.hojaError` (Task 4), `remolquesParametersStore.get()` (`src/server.js`).
- Produces (`fichas.ts`): `interface AlmacenFichas<T> { guardar(datos: T): string; tomar(id: string): T | null; borrar(id: string): void; tamano(): number }`, `crearAlmacenFichas<T>(opciones?: { duracionMs?: number; ahora?: () => number; crearId?: () => string }): AlmacenFichas<T>`.
- Produces (`navegador.ts`): `ARGUMENTOS_CHROMIUM`, `TIEMPO_MAXIMO_MS = 30_000`, `interface PaginaHojaPdf { errores: string[]; ir(url: string, tiempoMs: number): Promise<void>; esperarHoja(tiempoMs: number): Promise<string | null>; pdf(): Promise<Buffer>; cerrar(): Promise<void> }`, `interface NavegadorPdf { conectado(): boolean; abrirPagina(): Promise<PaginaHojaPdf>; cerrar(): Promise<void> }`, `interface ServicioPdf { generar(id: string): Promise<Buffer>; cerrar(): Promise<void> }`, `class ErrorSalidaPdf extends Error { statusCode = 503 }`, `mensajeFalloLanzar(error: unknown): string`, `lanzarChromium(): Promise<NavegadorPdf>`, `crearServicioPdf(opciones: { urlHoja: (id: string) => string; lanzar?: () => Promise<NavegadorPdf>; tiempoMaximoMs?: number }): ServicioPdf`.
- Produces (HTTP): `GET /api/remolques/hoja/:id` → 200 `DatosHojaPedido` una sola vez, luego 404 `{ error }`; `POST /api/remolques/pdf` con `{ elementos: ElementoPedidoHoja[] }` → 200 `application/pdf` (`inline; filename="AR…-10.pdf"`), 400 `{ error }` si el pedido no vale, 503 `{ error }` si Chromium falla. Nunca escribe en disco.

- [ ] **Step 1: `playwright-core` en las dependencias**

Run: `pnpm add --save-exact playwright-core@1.61.1`
Expected: `package.json` tiene en `dependencies` `"playwright-core": "1.61.1"` (la misma versión que `playwright` en `devDependencies`: el Chromium que se instala es el de esa versión).

- [ ] **Step 2: Escribir las pruebas que fallan**

Crear `src/remolques/salida/__tests__/fichas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { crearAlmacenFichas } from "../fichas.ts";

describe("identificadores de un solo uso", () => {
  it("los datos se toman una vez y desaparecen", () => {
    const fichas = crearAlmacenFichas<{ pedido: string }>();
    const id = fichas.guardar({ pedido: "AR.26.99990" });
    expect(fichas.tomar(id)).toEqual({ pedido: "AR.26.99990" });
    expect(fichas.tomar(id)).toBeNull();
    expect(fichas.tamano()).toBe(0);
  });

  it("caducan a los pocos segundos aunque nadie los pida", () => {
    let ahora = 1000;
    const fichas = crearAlmacenFichas<number>({ duracionMs: 60_000, ahora: () => ahora });
    const id = fichas.guardar(1);
    ahora += 59_999;
    expect(fichas.tamano()).toBe(1);
    ahora += 1;
    expect(fichas.tomar(id)).toBeNull();
    expect(fichas.tamano()).toBe(0);
  });

  it("cada PDF tiene su identificador y se puede borrar sin tomarlo", () => {
    const fichas = crearAlmacenFichas<number>();
    const a = fichas.guardar(1);
    const b = fichas.guardar(2);
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[0-9a-f-]{36}$/);
    fichas.borrar(a);
    expect(fichas.tomar(a)).toBeNull();
    expect(fichas.tomar(b)).toBe(2);
  });
});
```

Crear `src/remolques/salida/__tests__/navegador.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { crearServicioPdf, ErrorSalidaPdf, mensajeFalloLanzar, type NavegadorPdf, type PaginaHojaPdf } from "../navegador.ts";

const PDF = Buffer.from("%PDF-1.7 prueba");

function paginaFalsa(registro: string[], opciones: { error?: string; errores?: string[]; colgada?: boolean; pdf?: Buffer } = {}): PaginaHojaPdf {
  return {
    errores: opciones.errores ?? [],
    async ir(url) { registro.push(`ir ${url}`); await Promise.resolve(); },
    esperarHoja: () => (opciones.colgada ? new Promise<string | null>(() => {}) : Promise.resolve(opciones.error ?? null)),
    async pdf() { registro.push("pdf"); return opciones.pdf ?? PDF; },
    async cerrar() { registro.push("cerrar"); },
  };
}

function navegadorFalso(paginas: () => PaginaHojaPdf) {
  const estado = { lanzados: 0, conectado: true, cerrado: false };
  const lanzar = async (): Promise<NavegadorPdf> => {
    estado.lanzados += 1;
    estado.conectado = true;
    return {
      conectado: () => estado.conectado,
      abrirPagina: async () => paginas(),
      cerrar: async () => { estado.cerrado = true; },
    };
  };
  return { estado, lanzar };
}

const urlHoja = (id: string) => `http://127.0.0.1:4310/hoja-remolques.html?id=${id}`;

describe("servicio de PDF con Chromium", () => {
  it("abre la hoja con su identificador, hace el PDF y cierra la página", async () => {
    const registro: string[] = [];
    const { lanzar } = navegadorFalso(() => paginaFalsa(registro));
    const servicio = crearServicioPdf({ urlHoja, lanzar });
    expect(await servicio.generar("abc")).toEqual(PDF);
    expect(registro).toEqual([`ir ${urlHoja("abc")}`, "pdf", "cerrar"]);
  });

  it("abre Chromium una vez y lo reutiliza; si se cae, lo vuelve a abrir", async () => {
    const registro: string[] = [];
    const { estado, lanzar } = navegadorFalso(() => paginaFalsa(registro));
    const servicio = crearServicioPdf({ urlHoja, lanzar });
    await servicio.generar("a");
    await servicio.generar("b");
    expect(estado.lanzados).toBe(1);
    estado.conectado = false;
    await servicio.generar("c");
    expect(estado.lanzados).toBe(2);
  });

  it("hace los PDF de uno en uno", async () => {
    const registro: string[] = [];
    const { lanzar } = navegadorFalso(() => paginaFalsa(registro));
    const servicio = crearServicioPdf({ urlHoja, lanzar });
    await Promise.all([servicio.generar("a"), servicio.generar("b")]);
    expect(registro).toEqual([`ir ${urlHoja("a")}`, "pdf", "cerrar", `ir ${urlHoja("b")}`, "pdf", "cerrar"]);
  });

  it("corta a los 30 s (aquí, 20 ms) con un mensaje claro y cierra la página", async () => {
    const registro: string[] = [];
    let abiertas = 0;
    // La primera página se cuelga; la segunda va bien.
    const { lanzar } = navegadorFalso(() => paginaFalsa(registro, { colgada: abiertas++ === 0 }));
    const servicio = crearServicioPdf({ urlHoja, lanzar, tiempoMaximoMs: 20 });
    await expect(servicio.generar("a")).rejects.toThrow(/tardó más de 0,02 s en prepararse/);
    expect(registro).toContain("cerrar");
    // La cola sigue: el siguiente PDF no se queda esperando al que se cortó.
    await expect(servicio.generar("b")).resolves.toEqual(PDF);
  });

  it("devuelve lo que dice la página o sus errores de consola", async () => {
    const conError = crearServicioPdf({ urlHoja, lanzar: navegadorFalso(() => paginaFalsa([], { error: "Falta el identificador de la hoja." })).lanzar });
    await expect(conError.generar("a")).rejects.toThrow("No se pudo preparar la hoja de taller: Falta el identificador de la hoja.");
    const conConsola = crearServicioPdf({ urlHoja, lanzar: navegadorFalso(() => paginaFalsa([], { errores: ["TypeError: x"] })).lanzar });
    await expect(conConsola.generar("a")).rejects.toThrow("La hoja de taller dio errores al pintarse: TypeError: x");
    const sinPdf = crearServicioPdf({ urlHoja, lanzar: navegadorFalso(() => paginaFalsa([], { pdf: Buffer.from("<html>") })).lanzar });
    await expect(sinPdf.generar("a")).rejects.toThrow("Chromium no devolvió un PDF válido.");
  });

  it("todos los fallos son 503 para la ruta", async () => {
    const servicio = crearServicioPdf({ urlHoja, lanzar: navegadorFalso(() => paginaFalsa([], { error: "x" })).lanzar });
    await expect(servicio.generar("a")).rejects.toBeInstanceOf(ErrorSalidaPdf);
    await expect(servicio.generar("a")).rejects.toMatchObject({ statusCode: 503 });
  });

  it("sin Chromium instalado dice cómo instalarlo y lo reintenta en la siguiente", async () => {
    let intentos = 0;
    const lanzar = async (): Promise<NavegadorPdf> => {
      intentos += 1;
      throw new Error("browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium-1234/chrome");
    };
    const servicio = crearServicioPdf({ urlHoja, lanzar });
    await expect(servicio.generar("a")).rejects.toThrow("Falta el Chromium de la hoja de taller en el servidor. Instálalo con: pnpm exec playwright install chromium");
    await expect(servicio.generar("b")).rejects.toThrow(ErrorSalidaPdf);
    expect(intentos).toBe(2);
    expect(mensajeFalloLanzar(new Error("sin memoria"))).toBe("No se pudo abrir Chromium para hacer el PDF: sin memoria");
  });

  it("al cerrar el servidor cierra Chromium", async () => {
    const { estado, lanzar } = navegadorFalso(() => paginaFalsa([]));
    const servicio = crearServicioPdf({ urlHoja, lanzar });
    await servicio.generar("a");
    await servicio.cerrar();
    expect(estado.cerrado).toBe(true);
  });
});
```

- [ ] **Step 3: Ver que fallan**

Run: `pnpm exec vitest run src/remolques/salida/__tests__/fichas.test.ts src/remolques/salida/__tests__/navegador.test.ts`
Expected: FAIL, `Failed to resolve import "../fichas.ts"` y `"../navegador.ts"`.

- [ ] **Step 4: El almacén de identificadores**

Crear `src/remolques/salida/fichas.ts`:

```ts
import { randomUUID } from "node:crypto";

// Datos de cada hoja de taller mientras Chromium la pinta (fase 4): en memoria, un minuto como
// mucho y una sola lectura. Nada se guarda en disco.

export interface AlmacenFichas<T> {
  guardar(datos: T): string;
  /** Devuelve los datos y los borra: cada identificador vale una sola vez. */
  tomar(id: string): T | null;
  borrar(id: string): void;
  tamano(): number;
}

export function crearAlmacenFichas<T>({
  duracionMs = 60_000,
  ahora = Date.now,
  crearId = randomUUID,
}: { duracionMs?: number; ahora?: () => number; crearId?: () => string } = {}): AlmacenFichas<T> {
  const fichas = new Map<string, { datos: T; caduca: number }>();
  const limpiar = () => {
    const momento = ahora();
    for (const [id, ficha] of fichas) if (ficha.caduca <= momento) fichas.delete(id);
  };
  return {
    guardar(datos) {
      limpiar();
      const id = crearId();
      fichas.set(id, { datos, caduca: ahora() + duracionMs });
      return id;
    },
    tomar(id) {
      limpiar();
      const ficha = fichas.get(id);
      if (!ficha) return null;
      fichas.delete(id);
      return ficha.datos;
    },
    borrar(id) {
      fichas.delete(id);
    },
    tamano() {
      limpiar();
      return fichas.size;
    },
  };
}
```

- [ ] **Step 5: El servicio de Chromium**

Crear `src/remolques/salida/navegador.ts`:

```ts
import { chromium } from "playwright-core";

// Chromium sin ventana para la hoja de taller de remolques (fase 4). Se abre una vez y se
// reutiliza (arrancarlo cuesta segundos); los PDF se hacen de uno en uno, con un tiempo máximo y
// mensajes que se entienden. Cada PDF usa un contexto nuevo: sin caché ni estado de otro.

/** WebGL por software (SwiftShader): el servidor .90 no tiene GPU. Los mismos que usan las e2e. */
export const ARGUMENTOS_CHROMIUM = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
export const TIEMPO_MAXIMO_MS = 30_000;
/** A4 apaisado a 96 ppp: la página se pinta al tamaño de la hoja. */
const VENTANA = { width: 1123, height: 794 };

export interface PaginaHojaPdf {
  /** Errores de la página (excepciones y `console.error`) desde que se abrió. */
  errores: string[];
  ir(url: string, tiempoMs: number): Promise<void>;
  /** Espera a `window.hojaLista` o a `window.hojaError`; devuelve el error o null. */
  esperarHoja(tiempoMs: number): Promise<string | null>;
  pdf(): Promise<Buffer>;
  cerrar(): Promise<void>;
}

export interface NavegadorPdf {
  conectado(): boolean;
  abrirPagina(): Promise<PaginaHojaPdf>;
  cerrar(): Promise<void>;
}

export interface ServicioPdf {
  generar(id: string): Promise<Buffer>;
  cerrar(): Promise<void>;
}

/** Cualquier fallo al hacer el PDF: la ruta responde 503 con este mensaje. */
export class ErrorSalidaPdf extends Error {
  statusCode = 503;
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorSalidaPdf";
  }
}

const texto = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function mensajeFalloLanzar(error: unknown): string {
  const detalle = texto(error);
  return /Executable doesn't exist|playwright install/i.test(detalle)
    ? "Falta el Chromium de la hoja de taller en el servidor. Instálalo con: pnpm exec playwright install chromium"
    : `No se pudo abrir Chromium para hacer el PDF: ${detalle}`;
}

export async function lanzarChromium(): Promise<NavegadorPdf> {
  const navegador = await chromium.launch({ headless: true, args: ARGUMENTOS_CHROMIUM });
  return {
    conectado: () => navegador.isConnected(),
    cerrar: () => navegador.close(),
    async abrirPagina() {
      const contexto = await navegador.newContext({ viewport: VENTANA, deviceScaleFactor: 1 });
      const pagina = await contexto.newPage();
      const errores: string[] = [];
      pagina.on("pageerror", (error) => errores.push(error.message));
      pagina.on("console", (mensaje) => {
        if (mensaje.type() === "error") errores.push(mensaje.text());
      });
      return {
        errores,
        async ir(url, tiempoMs) {
          await pagina.goto(url, { waitUntil: "load", timeout: tiempoMs });
        },
        async esperarHoja(tiempoMs) {
          await pagina.waitForFunction(
            () => window.hojaLista === true || typeof window.hojaError === "string",
            undefined,
            { timeout: tiempoMs },
          );
          return pagina.evaluate(() => window.hojaError ?? null);
        },
        pdf: () => pagina.pdf({ format: "A4", landscape: true, printBackground: true, preferCSSPageSize: true }),
        cerrar: () => contexto.close(),
      };
    },
  };
}

export function crearServicioPdf({
  urlHoja,
  lanzar = lanzarChromium,
  tiempoMaximoMs = TIEMPO_MAXIMO_MS,
}: {
  urlHoja: (id: string) => string;
  lanzar?: () => Promise<NavegadorPdf>;
  tiempoMaximoMs?: number;
}): ServicioPdf {
  let navegador: Promise<NavegadorPdf> | null = null;
  let cola: Promise<unknown> = Promise.resolve();

  async function abrirNavegador(): Promise<NavegadorPdf> {
    if (navegador) {
      const actual = await navegador.catch(() => null);
      if (actual?.conectado()) return actual;
      await actual?.cerrar().catch(() => {});
    }
    const lanzado = lanzar().catch((error: unknown) => {
      navegador = null;
      throw new ErrorSalidaPdf(mensajeFalloLanzar(error));
    });
    navegador = lanzado;
    return lanzado;
  }

  async function imprimir(pagina: PaginaHojaPdf, id: string): Promise<Buffer> {
    await pagina.ir(urlHoja(id), tiempoMaximoMs);
    const error = await pagina.esperarHoja(tiempoMaximoMs);
    if (error) throw new ErrorSalidaPdf(`No se pudo preparar la hoja de taller: ${error}`);
    if (pagina.errores.length > 0) {
      throw new ErrorSalidaPdf(`La hoja de taller dio errores al pintarse: ${pagina.errores.join(" · ")}`);
    }
    const pdf = await pagina.pdf();
    if (pdf.subarray(0, 4).toString("ascii") !== "%PDF") throw new ErrorSalidaPdf("Chromium no devolvió un PDF válido.");
    return pdf;
  }

  async function hacer(id: string): Promise<Buffer> {
    const nav = await abrirNavegador();
    let pagina: PaginaHojaPdf;
    try {
      pagina = await nav.abrirPagina();
    } catch (error) {
      throw new ErrorSalidaPdf(`No se pudo abrir una página en Chromium: ${texto(error)}`);
    }
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const limite = new Promise<never>((_, rechazar) => {
      temporizador = setTimeout(() => rechazar(new ErrorSalidaPdf(
        `La hoja de taller tardó más de ${(tiempoMaximoMs / 1000).toLocaleString("es-ES")} s en prepararse. Vuelve a intentarlo; si se repite, avisa a informática.`,
      )), tiempoMaximoMs);
    });
    const trabajo = imprimir(pagina, id);
    // Si gana el tiempo máximo, lo que quede del trabajo no debe acabar en un rechazo sin atender.
    trabajo.catch(() => {});
    try {
      return await Promise.race([trabajo, limite]);
    } catch (error) {
      throw error instanceof ErrorSalidaPdf ? error : new ErrorSalidaPdf(`No se pudo hacer el PDF: ${texto(error)}`);
    } finally {
      clearTimeout(temporizador);
      await pagina.cerrar().catch(() => {});
    }
  }

  return {
    generar(id) {
      const trabajo = cola.then(() => hacer(id));
      cola = trabajo.catch(() => undefined);
      return trabajo;
    },
    async cerrar() {
      const actual = navegador ? await navegador.catch(() => null) : null;
      navegador = null;
      await actual?.cerrar().catch(() => {});
    },
  };
}
```

- [ ] **Step 6: Ver que pasan**

Run: `pnpm exec vitest run src/remolques/salida && pnpm typecheck`
Expected: PASS (`fichas.test.ts` 3, `navegador.test.ts` 8) y sin errores de tipos.

- [ ] **Step 7: Las rutas en `src/server.js`**

Añadir a los imports, tras `import { materialPreferidoRps } from './remolques/rps/material-rps.ts';`:

```js
import { prepararPedidoHoja } from './remolques/hoja/pedido.ts';
import { crearAlmacenFichas } from './remolques/salida/fichas.ts';
import { crearServicioPdf } from './remolques/salida/navegador.ts';
import { nombrePdf } from './remolques/salida/nombre-pdf.ts';
```

Tras `const generationLocks = new Set();` añadir:

```js
// Hoja de taller de remolques (fase 4): los datos de cada PDF esperan aquí, en memoria y un
// minuto como mucho, a que la página interna los pida una sola vez; Chromium la imprime.
const fichasHojaRemolques = crearAlmacenFichas({ duracionMs: 60_000 });
const servicioPdfRemolques = crearServicioPdf({ urlHoja: urlHojaRemolques });
```

Tras la ruta `app.get('/api/remolques/parametros', …)` añadir:

```js
// La página interna de la hoja pide sus datos con el identificador que le dio el PDF. Un solo uso.
app.get('/api/remolques/hoja/:id', (req, res) => {
  const datos = fichasHojaRemolques.tomar(req.params.id);
  if (!datos) {
    res.status(404).json({ error: 'Los datos de esta hoja ya no están disponibles: vuelve a pedir el PDF.' });
    return;
  }
  res.set('Cache-Control', 'no-store').json(datos);
});

// Vista previa de la hoja de taller: hace el PDF y lo devuelve. Nunca lo guarda en ninguna
// carpeta; el archivo (src/remolques/salida/archivo.ts) lo llamará la fase 5.
app.post('/api/remolques/pdf', async (req, res, next) => {
  let id = null;
  try {
    const datos = prepararPedidoHoja(req.body?.elementos, await remolquesParametersStore.get());
    id = fichasHojaRemolques.guardar(datos);
    const pdf = await servicioPdfRemolques.generar(id);
    res.set('Cache-Control', 'no-store')
      .setHeader('Content-Type', 'application/pdf')
      .setHeader('Content-Disposition', `inline; filename="${nombrePdf(datos.elementos[0].input.cabecera.numeroPedido)}"`)
      .send(pdf);
  } catch (error) {
    if (error?.statusCode >= 500) console.error('No se pudo hacer la hoja de taller de remolques:', error.message);
    next(error);
  } finally {
    if (id) fichasHojaRemolques.borrar(id);
  }
});
```

Tras la función `sanitizeOf` (al final del fichero, con las demás ayudas) añadir:

```js
/** Dirección de la página de la hoja para el Chromium del propio servidor. */
function urlHojaRemolques(id) {
  const { port } = server.address();
  const comodin = ['', '0.0.0.0', '::'].includes(config.host);
  const host = comodin ? '127.0.0.1' : config.host.includes(':') ? `[${config.host}]` : config.host;
  return `http://${host}:${port}/hoja-remolques.html?id=${encodeURIComponent(id)}`;
}
```

En `shutdown`, tras el bloque `try { await closeRpsCatalog(); } catch …`, añadir:

```js
  try {
    await servicioPdfRemolques.cerrar();
  } catch (error) {
    closeErrors.push(error);
  }
```

- [ ] **Step 8: Probarlo en la instancia aislada**

Arrancar la aislada en segundo plano (`bash .claude/skills/running-toldos-testar/start-isolated.sh`) y esperar a `/api/health`.

Run:

```bash
node --input-type=module -e "
import fs from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { muestrasHoja } from './src/remolques/hoja/muestras.ts';
const casos = JSON.parse(fs.readFileSync('src/remolques/__fixtures__/produccion-2026-09.json', 'utf8'));
const pedir = (elementos) => fetch('http://127.0.0.1:4310/api/remolques/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ elementos }) });
const inicio = Date.now();
const r = await pedir(muestrasHoja(casos).varios);
const bytes = new Uint8Array(await r.arrayBuffer());
fs.mkdirSync('tmp/ui-audit/remolques-4', { recursive: true });
fs.writeFileSync('tmp/ui-audit/remolques-4/servidor-varios.pdf', bytes);
const pdf = await getDocument({ data: bytes }).promise;
console.log(r.status, r.headers.get('content-type'), r.headers.get('content-disposition'), pdf.numPages, 'hojas', Date.now() - inicio, 'ms');
const mal = await pedir([]);
console.log(mal.status, (await mal.json()).error);
"
```

Expected:

```
200 application/pdf inline; filename="AR2699996-10.pdf" 3 hojas <ms> ms
400 El pedido no tiene elementos para la hoja de taller.
```

y `<ms>` por debajo de 30000 (apuntarlo en el informe). Comprobar también que no se ha escrito nada: `ls tmp/ui-audit/plan tmp/ui-audit/review` sigue igual que antes. Parar la aislada y comprobar en su salida que el cierre dice «Servidor HTTP y conexión RPS cerrados correctamente.» sin errores de Chromium.

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-lock.yaml src/remolques/salida/fichas.ts src/remolques/salida/navegador.ts src/remolques/salida/__tests__/fichas.test.ts src/remolques/salida/__tests__/navegador.test.ts src/server.js
git commit -m "feat(remolques): el servidor hace la hoja de taller en PDF con Chromium

Decidido con Iván: el servidor dibuja la hoja él solo con un Chrome sin
ventana, ya comprobado en el .90. Chromium se abre una vez y se reutiliza, los
PDF salen de uno en uno y con 30 s como mucho, y cualquier fallo se dice claro
(también cómo instalar Chromium si falta). Los datos pasan a la página por un
identificador de un solo uso en memoria. La ruta de vista previa nunca guarda
nada en disco.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Archivo en las dos carpetas y Configuración

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio.

**Files:**
- Create: `src/remolques/salida/archivo.ts`
- Modify: `src/config.js`, `src/workflow.js`, `src/server.js`, `src/client/types.ts`, `src/client/views/SettingsView.tsx`, `.claude/skills/running-toldos-testar/start-isolated.sh`
- Test: `src/remolques/salida/__tests__/archivo.test.ts`, `src/workflow.test.js`

**Interfaces:**
- Consumes: `nombrePdf`, `anioDelPlanteamiento` (Task 2).
- Produces (`archivo.ts`): `interface CarpetasRemolques { productionEnabled: boolean; remolquesPlanteamientosDirectory: string; remolquesOficinaTecnicaDirectory: string }`, `class ErrorArchivoPdf extends Error { statusCode: number; codigo: "ESCRITURA_DESACTIVADA" | "SIN_CARPETAS" | "RUTA_NO_VALIDA" | "PEDIDO_NO_VALIDO" | "NO_ES_PDF" | "CARPETA_NO_DISPONIBLE" | "PDF_EXISTENTE" }`, `MENSAJE_PDF_EXISTENTE`, `raizPlantilla(plantilla: string): string`, `destinosPdfRemolques(numeroPedido: string, fecha: string, carpetas: Omit<CarpetasRemolques, "productionEnabled">, ahora?: Date): { nombre: string; anio: number; destinos: [string, string]; raices: [string, string] }`, `archivarPdfRemolques(contenido: Uint8Array, pedido: { numeroPedido: string; fecha: string }, carpetas: CarpetasRemolques, opciones?: { sustituir?: boolean; ahora?: Date }): Promise<{ nombre: string; anio: number; destinos: string[]; sustituido: boolean }>`.
- Produces (configuración): campos `remolquesPlanteamientosDirectory` y `remolquesOficinaTecnicaDirectory` en `WorkflowSettings` (servidor y cliente), con semillas `REMOLQUES_PLANTEAMIENTOS_DIRECTORY` y `REMOLQUES_OFICINA_TECNICA_DIRECTORY` (plantillas con `{YYYY}`, como las de toldos). No cambian `workflowReadiness` (es de toldos).

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/remolques/salida/__tests__/archivo.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { rename } from "node:fs/promises";
import path from "node:path";
import { archivarPdfRemolques, destinosPdfRemolques, MENSAJE_PDF_EXISTENTE, raizPlantilla } from "../archivo.ts";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, rename: vi.fn(actual.rename) };
});

// Nada fuera de tmp/ del repositorio en las pruebas.
const TMP = path.join(process.cwd(), "tmp");
const temporales: string[] = [];
function preparar() {
  mkdirSync(TMP, { recursive: true });
  const raiz = mkdtempSync(path.join(TMP, "remolques-archivo-"));
  temporales.push(raiz);
  const planteamientos = path.join(raiz, "PLANTEAMIENTOS");
  const oficina = path.join(raiz, "OFICINA TECNICA");
  mkdirSync(planteamientos);
  mkdirSync(oficina);
  return {
    planteamientos,
    oficina,
    carpetas: {
      productionEnabled: true,
      remolquesPlanteamientosDirectory: planteamientos,
      remolquesOficinaTecnicaDirectory: path.join(oficina, "{YYYY}"),
    },
  };
}
afterEach(() => {
  vi.mocked(rename).mockReset();
  for (const d of temporales.splice(0)) rmSync(d, { recursive: true, force: true });
});
const PDF = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
const PEDIDO = { numeroPedido: "ar.26.03632", fecha: "2025-12-20" };

describe("dónde va el PDF", () => {
  it("la raíz de una plantilla es lo que hay antes del año", () => {
    expect(raizPlantilla(path.join("/mnt", "oficina", "{YYYY}"))).toBe(path.join("/mnt", "oficina"));
    expect(raizPlantilla(path.join("/mnt", "planteamientos"))).toBe(path.join("/mnt", "planteamientos"));
  });

  it("-10 en planteamientos y <año>/AR….pdf en oficina técnica, con el año del pedido", () => {
    const { planteamientos, oficina, carpetas } = preparar();
    expect(destinosPdfRemolques(PEDIDO.numeroPedido, PEDIDO.fecha, carpetas)).toEqual({
      nombre: "AR2603632-10.pdf",
      anio: 2026,
      destinos: [path.join(planteamientos, "AR2603632-10.pdf"), path.join(oficina, "2026", "AR2603632.pdf")],
      raices: [planteamientos, oficina],
    });
  });

  it("exige las dos carpetas, rutas absolutas y un número de pedido", () => {
    const { carpetas } = preparar();
    expect(() => destinosPdfRemolques("AR2603632", "", { ...carpetas, remolquesOficinaTecnicaDirectory: "" }))
      .toThrow("Faltan las carpetas de remolques en Configuración (planteamientos y oficina técnica). No se ha guardado el PDF.");
    expect(() => destinosPdfRemolques("AR2603632", "", { remolquesPlanteamientosDirectory: "relativa/a", remolquesOficinaTecnicaDirectory: "relativa/{YYYY}" }))
      .toThrow("Las carpetas de remolques deben ser rutas absolutas del servidor.");
    expect(() => destinosPdfRemolques("", "", carpetas)).toThrow("El número de pedido no es válido para archivar el PDF.");
  });
});

describe("archivo del PDF en dos carpetas", () => {
  it("con la escritura desactivada no toca nada", async () => {
    const { planteamientos, oficina, carpetas } = preparar();
    await expect(archivarPdfRemolques(PDF, PEDIDO, { ...carpetas, productionEnabled: false }))
      .rejects.toMatchObject({ statusCode: 403, codigo: "ESCRITURA_DESACTIVADA" });
    expect(readdirSync(planteamientos)).toEqual([]);
    expect(readdirSync(oficina)).toEqual([]);
  });

  it("solo archiva PDF", async () => {
    const { carpetas } = preparar();
    await expect(archivarPdfRemolques(new Uint8Array([60, 104, 116, 109]), PEDIDO, carpetas)).rejects.toMatchObject({ statusCode: 400, codigo: "NO_ES_PDF" });
  });

  it("guarda los mismos bytes en las dos y crea la carpeta del año", async () => {
    const { carpetas } = preparar();
    const hecho = await archivarPdfRemolques(PDF, PEDIDO, carpetas);
    expect(hecho.sustituido).toBe(false);
    for (const d of hecho.destinos) expect(readFileSync(d)).toEqual(Buffer.from(PDF));
  });

  it("no crea una raíz que falta (montaje caído) ni escribe en la otra", async () => {
    const { planteamientos, oficina, carpetas } = preparar();
    rmSync(oficina, { recursive: true });
    await expect(archivarPdfRemolques(PDF, PEDIDO, carpetas)).rejects.toMatchObject({ statusCode: 503, codigo: "CARPETA_NO_DISPONIBLE" });
    expect(existsSync(oficina)).toBe(false);
    expect(readdirSync(planteamientos)).toEqual([]);
  });

  it("si ya existe, 409 sin tocarlo; con «sustituir», sustituye las dos copias", async () => {
    const { carpetas } = preparar();
    const { destinos } = destinosPdfRemolques(PEDIDO.numeroPedido, PEDIDO.fecha, carpetas);
    writeFileSync(destinos[0], "anterior");
    await expect(archivarPdfRemolques(PDF, PEDIDO, carpetas)).rejects.toMatchObject({ statusCode: 409, codigo: "PDF_EXISTENTE", message: MENSAJE_PDF_EXISTENTE });
    expect(readFileSync(destinos[0], "utf8")).toBe("anterior");
    const hecho = await archivarPdfRemolques(PDF, PEDIDO, carpetas, { sustituir: true });
    expect(hecho.sustituido).toBe(true);
    for (const d of destinos) expect(readFileSync(d)).toEqual(Buffer.from(PDF));
  });

  it("si falla la segunda copia, deja la primera como estaba", async () => {
    const { planteamientos, carpetas } = preparar();
    const { destinos } = await archivarPdfRemolques(PDF, PEDIDO, carpetas);
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(rename)
      .mockImplementationOnce(actual.rename)
      .mockRejectedValueOnce(new Error("segunda carpeta sin red"));
    await expect(archivarPdfRemolques(new Uint8Array([37, 80, 68, 70, 1, 2]), PEDIDO, carpetas, { sustituir: true }))
      .rejects.toThrow("segunda carpeta sin red");
    for (const d of destinos) expect(readFileSync(d)).toEqual(Buffer.from(PDF));
    expect(readdirSync(planteamientos)).toEqual(["AR2603632-10.pdf"]);
  });
});
```

Añadir a `src/workflow.test.js`, dentro del mismo `describe` que la prueba `'indica qué carpeta no existe sin ocultar las que sí están disponibles'`, justo después de ella:

```js
  it('guarda las dos carpetas de remolques y las comprueba solo si están puestas', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'toldos-directory-check-'));
    temporaryDirectories.push(root);
    const available = path.join(root, 'Disponible');
    await fs.mkdir(path.join(available, '2026'), { recursive: true });
    const settings = normalizeWorkflowSettings({
      productionEnabled: true,
      reviewDirectory: available,
      planteamientosDirectory: available,
      rpsUploadDirectory: available,
      remolquesPlanteamientosDirectory: available,
      remolquesOficinaTecnicaDirectory: path.join(available, '{YYYY}')
    });
    expect(settings.remolquesOficinaTecnicaDirectory).toBe(path.join(available, '{YYYY}'));
    expect(() => normalizeWorkflowSettings({ remolquesPlanteamientosDirectory: 'relativa' }))
      .toThrow('La carpeta de planteamientos de remolques debe ser una ruta absoluta válida en el sistema del servidor.');
    const result = await checkWorkflowDirectories(settings, { year: 2026 });
    expect(result.directories.map(({ label, ok }) => ({ label, ok }))).toEqual([
      { label: 'Pedidos para revisión', ok: true },
      { label: 'Planteamientos generados', ok: true },
      { label: 'Subida de material', ok: true },
      { label: 'Remolques · planteamientos', ok: true },
      { label: 'Remolques · oficina técnica', ok: true }
    ]);
    // Las de remolques no cuentan para «Generar archivos» de toldos.
    expect(workflowReadiness({ ...settings, remolquesPlanteamientosDirectory: '' }).productionReady).toBe(true);
    expect(defaultWorkflowSettings({ remolquesPlanteamientosDirectory: '/mnt/r/plan' }).remolquesPlanteamientosDirectory).toBe('/mnt/r/plan');
  });
```

- [ ] **Step 2: Ver que fallan**

Run: `pnpm exec vitest run src/remolques/salida/__tests__/archivo.test.ts src/workflow.test.js`
Expected: FAIL, `Failed to resolve import "../archivo.ts"` y, en `workflow.test.js`, la prueba nueva (no conoce los campos de remolques).

- [ ] **Step 3: El archivo**

Crear `src/remolques/salida/archivo.ts` (el algoritmo de escritura es el de `guardarPdfDuplicado` de la web vieja, `Remolques-TGM/src/lib/pdf/archivo-pdf.ts`; cambia de dónde salen las carpetas):

```ts
import path from "node:path";
import { access, copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { anioDelPlanteamiento, nombrePdf } from "./nombre-pdf.ts";

// Archivo de la hoja de taller de remolques en las dos carpetas de siempre (fase 4; lo llama la
// fase 5 al pasar a producción): `AR…-10.pdf` en la de planteamientos (la que procesa RPS) y
// `<año>/AR….pdf` en la de oficina técnica. Las carpetas salen de Configuración (plantillas con
// {YYYY}, como las de toldos). Escritura atómica: las dos copias o ninguna.

/** Lo que el archivo necesita de la configuración del flujo (Configuración → Rutas de trabajo). */
export interface CarpetasRemolques {
  productionEnabled: boolean;
  remolquesPlanteamientosDirectory: string;
  remolquesOficinaTecnicaDirectory: string;
}

type CodigoArchivo =
  | "ESCRITURA_DESACTIVADA" | "SIN_CARPETAS" | "RUTA_NO_VALIDA" | "PEDIDO_NO_VALIDO"
  | "NO_ES_PDF" | "CARPETA_NO_DISPONIBLE" | "PDF_EXISTENTE";

export class ErrorArchivoPdf extends Error {
  statusCode: number;
  codigo: CodigoArchivo;
  constructor(mensaje: string, statusCode: number, codigo: CodigoArchivo) {
    super(mensaje);
    this.name = "ErrorArchivoPdf";
    this.statusCode = statusCode;
    this.codigo = codigo;
  }
}

export const MENSAJE_PDF_EXISTENTE = "Ya existe un PDF de este pedido en las carpetas de archivo. Se sustituirán las dos copias.";

/** La parte fija de una plantilla, hasta el primer {YYYY}: tiene que existir (es el montaje de red). */
export function raizPlantilla(plantilla: string): string {
  const i = plantilla.indexOf("{YYYY}");
  return i < 0 ? plantilla : path.dirname(`${plantilla.slice(0, i)}x`);
}

export function destinosPdfRemolques(
  numeroPedido: string,
  fecha: string,
  carpetas: Omit<CarpetasRemolques, "productionEnabled">,
  ahora = new Date(),
): { nombre: string; anio: number; destinos: [string, string]; raices: [string, string] } {
  const planteamientos = carpetas.remolquesPlanteamientosDirectory.trim();
  const oficina = carpetas.remolquesOficinaTecnicaDirectory.trim();
  if (!planteamientos || !oficina) {
    throw new ErrorArchivoPdf("Faltan las carpetas de remolques en Configuración (planteamientos y oficina técnica). No se ha guardado el PDF.", 400, "SIN_CARPETAS");
  }
  const raices: [string, string] = [raizPlantilla(planteamientos), raizPlantilla(oficina)];
  if (!raices.every((raiz) => path.isAbsolute(raiz))) {
    throw new ErrorArchivoPdf("Las carpetas de remolques deben ser rutas absolutas del servidor.", 400, "RUTA_NO_VALIDA");
  }
  const nombre = nombrePdf(numeroPedido);
  if (!/^[A-Z0-9]+-10\.pdf$/.test(nombre) || nombre.startsWith("SIN-PEDIDO")) {
    throw new ErrorArchivoPdf("El número de pedido no es válido para archivar el PDF.", 400, "PEDIDO_NO_VALIDO");
  }
  const anio = anioDelPlanteamiento(numeroPedido, fecha, ahora);
  const conAnio = (plantilla: string) => plantilla.replaceAll("{YYYY}", String(anio));
  return {
    nombre,
    anio,
    destinos: [path.join(conAnio(planteamientos), nombre), path.join(conAnio(oficina), nombre.replace(/-10\.pdf$/, ".pdf"))],
    raices,
  };
}

async function existe(fichero: string): Promise<boolean> {
  try {
    const datos = await stat(fichero);
    if (!datos.isFile()) throw new Error(`El destino no es un archivo: ${fichero}`);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

export async function archivarPdfRemolques(
  contenido: Uint8Array,
  pedido: { numeroPedido: string; fecha: string },
  carpetas: CarpetasRemolques,
  opciones: { sustituir?: boolean; ahora?: Date } = {},
): Promise<{ nombre: string; anio: number; destinos: string[]; sustituido: boolean }> {
  if (!carpetas.productionEnabled) {
    throw new ErrorArchivoPdf("La escritura de archivos está desactivada en Configuración: no se ha guardado el PDF.", 403, "ESCRITURA_DESACTIVADA");
  }
  if (Buffer.from(contenido.subarray(0, 4)).toString("ascii") !== "%PDF") {
    throw new ErrorArchivoPdf("Lo que se iba a archivar no es un PDF.", 400, "NO_ES_PDF");
  }
  const { nombre, anio, destinos, raices } = destinosPdfRemolques(pedido.numeroPedido, pedido.fecha, carpetas, opciones.ahora);
  // Las raíces deben existir: no crear una carpeta local si falta el montaje de red.
  for (const raiz of raices) {
    try {
      if (!(await stat(raiz)).isDirectory()) throw new Error("No es una carpeta");
      await access(raiz, constants.W_OK);
    } catch {
      throw new ErrorArchivoPdf(`La carpeta de archivo no está disponible o no permite escribir: ${raiz}`, 503, "CARPETA_NO_DISPONIBLE");
    }
  }
  for (const destino of destinos) await mkdir(path.dirname(destino), { recursive: true });
  const anteriores = await Promise.all(destinos.map(existe));
  if (anteriores.some(Boolean) && !opciones.sustituir) throw new ErrorArchivoPdf(MENSAJE_PDF_EXISTENTE, 409, "PDF_EXISTENTE");

  const marca = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const temporales = destinos.map((d) => `${d}.${marca}.tmp`);
  const copias = destinos.map((d) => `${d}.${marca}.bak`);
  const escritos: number[] = [];
  try {
    // Preparar ambas copias antes de tocar los PDF publicados.
    for (let i = 0; i < destinos.length; i++) {
      await writeFile(temporales[i], contenido, { flag: "wx" });
      if (anteriores[i]) await copyFile(destinos[i], copias[i], constants.COPYFILE_EXCL);
    }
    for (let i = 0; i < destinos.length; i++) {
      if (opciones.sustituir) {
        await rename(temporales[i], destinos[i]);
      } else {
        // No sobrescribir un fichero que haya aparecido desde la comprobación.
        await copyFile(temporales[i], destinos[i], constants.COPYFILE_EXCL);
      }
      escritos.push(i);
    }
    for (const destino of destinos) {
      if (!Buffer.from(await readFile(destino)).equals(Buffer.from(contenido))) {
        throw new Error(`La copia del PDF no coincide: ${destino}`);
      }
    }
  } catch (error) {
    const fallos: string[] = [];
    for (const i of escritos.reverse()) {
      try {
        if (anteriores[i]) await rename(copias[i], destinos[i]);
        else await rm(destinos[i], { force: true });
      } catch {
        fallos.push(destinos[i]);
      }
    }
    if (fallos.length) {
      throw new Error(`Archivo incompleto. Revisa ${fallos.join(", ")}; se conservan las copias .bak para recuperar los PDF anteriores.`);
    }
    await Promise.all(copias.map((d) => rm(d, { force: true }).catch(() => {})));
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new ErrorArchivoPdf(MENSAJE_PDF_EXISTENTE, 409, "PDF_EXISTENTE");
    throw error;
  } finally {
    await Promise.all(temporales.map((d) => rm(d, { force: true }).catch(() => {})));
  }
  await Promise.all(copias.map((d) => rm(d, { force: true }).catch(() => {})));
  return { nombre, anio, destinos, sustituido: anteriores.some(Boolean) };
}
```

- [ ] **Step 4: Las dos carpetas en la configuración del servidor**

En `src/config.js`, tras `rpsPlanteamientosDirectory: process.env.RPS_PLANTEAMIENTOS_DIRECTORY || '',` añadir:

```js
  // Hoja de taller de remolques (fase 4): las carpetas de la web vieja (RUTA_PLANTEAMIENTOS y
  // RUTA_OFICINA_TECNICA/<año>), como plantillas con {YYYY}. La configuración guardada prevalece.
  remolquesPlanteamientosDirectory: process.env.REMOLQUES_PLANTEAMIENTOS_DIRECTORY || '',
  remolquesOficinaTecnicaDirectory: process.env.REMOLQUES_OFICINA_TECNICA_DIRECTORY || '',
```

En `src/workflow.js`, en `defaultWorkflowSettings`, sustituir:

```js
    rpsPlanteamientosDirectory: seed.rpsPlanteamientosDirectory || inferRpsPlanteamientosDirectory(seed.rpsUploadDirectory)
  };
}
```

por:

```js
    rpsPlanteamientosDirectory: seed.rpsPlanteamientosDirectory || inferRpsPlanteamientosDirectory(seed.rpsUploadDirectory),
    remolquesPlanteamientosDirectory: seed.remolquesPlanteamientosDirectory || '',
    remolquesOficinaTecnicaDirectory: seed.remolquesOficinaTecnicaDirectory || ''
  };
}
```

En `normalizeWorkflowSettings`, sustituir:

```js
    rpsPlanteamientosDirectory: cleanPath(input?.rpsPlanteamientosDirectory ?? current.rpsPlanteamientosDirectory)
  };

  for (const [label, value] of [
    ['carpeta de revisión', settings.reviewDirectory],
    ['carpeta de planteamientos', settings.planteamientosDirectory],
    ['carpeta de subida de material', settings.rpsUploadDirectory],
    ['archivo histórico de planteamientos de RPS', settings.rpsPlanteamientosDirectory]
  ]) {
```

por:

```js
    rpsPlanteamientosDirectory: cleanPath(input?.rpsPlanteamientosDirectory ?? current.rpsPlanteamientosDirectory),
    remolquesPlanteamientosDirectory: cleanPath(input?.remolquesPlanteamientosDirectory ?? current.remolquesPlanteamientosDirectory),
    remolquesOficinaTecnicaDirectory: cleanPath(input?.remolquesOficinaTecnicaDirectory ?? current.remolquesOficinaTecnicaDirectory)
  };

  for (const [label, value] of [
    ['carpeta de revisión', settings.reviewDirectory],
    ['carpeta de planteamientos', settings.planteamientosDirectory],
    ['carpeta de subida de material', settings.rpsUploadDirectory],
    ['archivo histórico de planteamientos de RPS', settings.rpsPlanteamientosDirectory],
    ['carpeta de planteamientos de remolques', settings.remolquesPlanteamientosDirectory],
    ['carpeta de oficina técnica de remolques', settings.remolquesOficinaTecnicaDirectory]
  ]) {
```

En `checkWorkflowDirectories`, tras el `if (settings.rpsPlanteamientosDirectory) { definitions.push(…); }` añadir:

```js
  // Remolques (fase 4): solo si están puestas; no cuentan para «Generar archivos» de toldos.
  if (settings.remolquesPlanteamientosDirectory) {
    definitions.push(['remolquesPlanteamientosDirectory', 'Remolques · planteamientos', settings.remolquesPlanteamientosDirectory, 'write']);
  }
  if (settings.remolquesOficinaTecnicaDirectory) {
    definitions.push(['remolquesOficinaTecnicaDirectory', 'Remolques · oficina técnica', settings.remolquesOficinaTecnicaDirectory, 'write']);
  }
```

En `src/server.js`, en `defaultWorkflowSettings({ … })`, sustituir `rpsPlanteamientosDirectory: config.rpsPlanteamientosDirectory` por:

```js
    rpsPlanteamientosDirectory: config.rpsPlanteamientosDirectory,
    remolquesPlanteamientosDirectory: config.remolquesPlanteamientosDirectory,
    remolquesOficinaTecnicaDirectory: config.remolquesOficinaTecnicaDirectory
```

- [ ] **Step 5: Las dos carpetas en la pantalla Configuración**

En `src/client/types.ts`, en `WorkflowSettings`, tras `rpsPlanteamientosDirectory: string;` añadir:

```ts
  /** Hoja de taller de remolques: AR…-10.pdf (la carpeta que procesa RPS). */
  remolquesPlanteamientosDirectory: string;
  /** Hoja de taller de remolques: <año>/AR….pdf, con {YYYY}. */
  remolquesOficinaTecnicaDirectory: string;
```

En `src/client/views/SettingsView.tsx`, sustituir:

```tsx
    && form.rpsPlanteamientosDirectory === settings.rpsPlanteamientosDirectory;
```

por:

```tsx
    && form.rpsPlanteamientosDirectory === settings.rpsPlanteamientosDirectory
    && form.remolquesPlanteamientosDirectory === settings.remolquesPlanteamientosDirectory
    && form.remolquesOficinaTecnicaDirectory === settings.remolquesOficinaTecnicaDirectory;
```

Y tras el `RouteField` con `step="04"` (dentro de `workflow-route-grid`) añadir:

```tsx
        <RouteField
          step="05"
          title="Remolques · planteamientos"
          description="Aquí se guarda la hoja de taller de remolques PEDIDO-10.pdf al pasar a producción: la misma carpeta que usaba la web de remolques."
          value={form.remolquesPlanteamientosDirectory}
          onChange={(remolquesPlanteamientosDirectory) => updateForm({ remolquesPlanteamientosDirectory })}
          placeholder="/mnt/remolques/planteamientos"
        />
        <RouteField
          step="06"
          title="Remolques · oficina técnica"
          description="Copia de la hoja de taller de remolques, PEDIDO.pdf en la carpeta del año del pedido."
          value={form.remolquesOficinaTecnicaDirectory}
          onChange={(remolquesOficinaTecnicaDirectory) => updateForm({ remolquesOficinaTecnicaDirectory })}
          placeholder="/mnt/oftecnica/{YYYY}"
        />
```

- [ ] **Step 6: La aislada escribe estas carpetas en `tmp/`**

En `.claude/skills/running-toldos-testar/start-isolated.sh`, sustituir:

```bash
mkdir -p "$D"/{review,plan,rps,export,archive,rpsplan}
```

por:

```bash
mkdir -p "$D"/{review,plan,rps,export,archive,rpsplan,rem-plan,rem-oficina}
```

y tras `export ORDER_ARCHIVE_ROOT="$D/archive" RPS_PLANTEAMIENTOS_DIRECTORY="$D/rpsplan"` añadir:

```bash
export REMOLQUES_PLANTEAMIENTOS_DIRECTORY="$D/rem-plan" REMOLQUES_OFICINA_TECNICA_DIRECTORY="$D/rem-oficina/{YYYY}"
```

- [ ] **Step 7: Ver que pasa y verlo en pantalla**

Run: `pnpm exec vitest run src/remolques/salida src/workflow.test.js && pnpm typecheck && pnpm lint`
Expected: PASS (`archivo.test.ts` 9) y sin errores.

Arrancar la aislada; en Configuración salen las tarjetas 05 y 06 con `tmp/ui-audit/rem-plan` y `tmp/ui-audit/rem-oficina/{YYYY}`; «Comprobar carpetas» (con la generación activada en el formulario, sin guardar) enseña «Remolques · planteamientos» bien y «Remolques · oficina técnica» con «La carpeta no existe o no está accesible.» (no hay carpeta del año; se crea al archivar). Capturar la pantalla en `tmp/ui-audit/remolques-4/configuracion.png` y mirarla. No pulsar «Guardar configuración». Parar la aislada.

- [ ] **Step 8: Commit**

```bash
git add src/remolques/salida/archivo.ts src/remolques/salida/__tests__/archivo.test.ts src/config.js src/workflow.js src/workflow.test.js src/server.js src/client/types.ts src/client/views/SettingsView.tsx .claude/skills/running-toldos-testar/start-isolated.sh
git commit -m "feat(remolques): archivo de la hoja en las dos carpetas de siempre

La hoja tiene que acabar donde la dejaba la web vieja: AR…-10.pdf en la carpeta
de planteamientos y <año>/AR….pdf en oficina técnica, con el mismo nombre. Las
dos carpetas pasan a Configuración, con semilla en el entorno como las de
toldos. Se escribe de forma atómica (las dos copias o ninguna), responde 409 si
ya existe y no se confirma sustituir, y no escribe nada con la escritura
desactivada. Queda probado y sin botón: lo usará la fase 5.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Botón «Vista previa del PDF» en Remolques

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio.

**Files:**
- Create: `src/client/remolques/vistaPrevia.ts`, `src/client/remolques/VistaPreviaPdf.tsx`
- Modify: `src/client/remolques/PestanasElementos.tsx`, `src/client/remolques/RemolquesView.tsx`, `src/client/coordina/remolques.css`
- Test: `src/client/remolques/vistaPrevia.test.ts`

**Interfaces:**
- Consumes: `POST /api/remolques/pdf` (Task 5), `PdfPreviewViewer` (`src/client/components/PdfPreviewViewer.tsx`), `Notify`, `LineaPedido`, `EstadoLinea`, `estadoLinea` (`src/remolques/workspace/lineas.ts`), `rotuloElemento` (`./rotulo`).
- Produces (`vistaPrevia.ts`): `faltaParaPdf(lineas: LineaPedido[], estados: Record<string, EstadoLinea>): string | null`, `cuerpoVistaPrevia(lineas: LineaPedido[]): { elementos: ElementoPedidoHoja[] }`.
- Produces: `VistaPreviaPdf({ lineas, bloqueo, notify })`; `PestanasElementos` acepta `acciones?: React.ReactNode` y `pie?: React.ReactNode`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/client/remolques/vistaPrevia.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import casos from '../../remolques/__fixtures__/produccion-2026-09.json';
import type { LonaInput } from '../../remolques/calc/lona.ts';
import { estadoLinea, type LineaPedido } from '../../remolques/workspace/lineas.ts';
import { cuerpoVistaPrevia, faltaParaPdf } from './vistaPrevia';

const lona02 = (casos as Array<{ caso: string; input: LonaInput }>).find((c) => c.caso === 'lona-02')!.input;
const linea = (version: string, cambios: Partial<LonaInput> = {}): LineaPedido => ({
  version, tipo: 'lona', id: `id-${version}`, snapshotSvg: '<svg/>', origenRps: null,
  input: { ...lona02, ...cambios, cabecera: { ...lona02.cabecera, numeroPedido: 'AR.26.99990', version } },
});
const estados = (lineas: LineaPedido[]) => Object.fromEntries(lineas.map((l) => [l.version, estadoLinea(l)]));

describe('vista previa del PDF de remolques', () => {
  it('sin elementos no hay PDF', () => {
    expect(faltaParaPdf([], {})).toBe('Añade al menos un elemento.');
  });

  it('dice el primer elemento que falta, con el rótulo de su pestaña', () => {
    const lineas = [linea('10'), linea('11', { altoDelante: 0 })];
    expect(faltaParaPdf(lineas, estados(lineas))).toBe('B · Remolque 200×121: Introduce el alto delantero.');
  });

  it('con todo listo no falta nada', () => {
    const lineas = [linea('10'), linea('11')];
    expect(faltaParaPdf(lineas, estados(lineas))).toBeNull();
  });

  it('manda solo versión, tipo y datos de cada elemento', () => {
    const cuerpo = cuerpoVistaPrevia([linea('10')]);
    expect(cuerpo.elementos).toHaveLength(1);
    expect(Object.keys(cuerpo.elementos[0]).sort()).toEqual(['input', 'tipo', 'version']);
  });
});
```

- [ ] **Step 2: Ver que falla**

Run: `pnpm exec vitest run src/client/remolques/vistaPrevia.test.ts`
Expected: FAIL, `Failed to resolve import "./vistaPrevia"`.

- [ ] **Step 3: Las ayudas**

Crear `src/client/remolques/vistaPrevia.ts`:

```ts
import type { ElementoPedidoHoja } from '../../remolques/hoja/tipos.ts';
import type { EstadoLinea, LineaPedido } from '../../remolques/workspace/lineas.ts';
import { rotuloElemento } from './rotulo';

/** Qué falta para poder ver la hoja de taller: solo sale con todos los elementos completos. */
export function faltaParaPdf(lineas: LineaPedido[], estados: Record<string, EstadoLinea>): string | null {
  if (lineas.length === 0) return 'Añade al menos un elemento.';
  const indice = lineas.findIndex((linea) => !estados[linea.version]?.lista);
  if (indice < 0) return null;
  const linea = lineas[indice];
  return `${rotuloElemento(linea, indice)}: ${estados[linea.version]?.falta ?? 'faltan datos.'}`;
}

/** Lo que necesita el servidor: el resultado lo calcula él con los parámetros comunes. */
export function cuerpoVistaPrevia(lineas: LineaPedido[]): { elementos: ElementoPedidoHoja[] } {
  return { elementos: lineas.map(({ version, tipo, input }) => ({ version, tipo, input })) };
}
```

- [ ] **Step 4: El botón y el visor**

Crear `src/client/remolques/VistaPreviaPdf.tsx`:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, X } from 'lucide-react';
import type { Notify } from '../components/NotificationCenter';
import { PdfPreviewViewer } from '../components/PdfPreviewViewer';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import { cuerpoVistaPrevia } from './vistaPrevia';

// «Vista previa del PDF» de remolques (fase 4): pide al servidor la hoja de taller del pedido y la
// abre en el mismo visor que toldos. No guarda nada en ninguna carpeta.
export function VistaPreviaPdf({ lineas, bloqueo, notify }: {
  lineas: LineaPedido[];
  /** Qué falta, o null si se puede pedir. */
  bloqueo: string | null;
  notify: Notify;
}) {
  const [url, setUrl] = useState('');
  const [preparando, setPreparando] = useState(false);
  const boton = useRef<HTMLButtonElement>(null);
  const dialogo = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  useEffect(() => {
    if (!url) return undefined;
    const foco = requestAnimationFrame(() => dialogo.current?.querySelector<HTMLElement>('.pdf-carousel')?.focus());
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      evento.preventDefault();
      setUrl('');
      requestAnimationFrame(() => boton.current?.focus());
    };
    window.addEventListener('keydown', alPulsar);
    return () => {
      cancelAnimationFrame(foco);
      window.removeEventListener('keydown', alPulsar);
    };
  }, [url]);

  async function abrir() {
    setPreparando(true);
    try {
      const respuesta = await fetch('/api/remolques/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpoVistaPrevia(lineas)),
      });
      if (!respuesta.ok) {
        const datos = await respuesta.json().catch(() => ({})) as { error?: string };
        notify(datos.error || 'No se pudo preparar la vista previa del PDF.', { tone: 'error' });
        return;
      }
      setUrl(URL.createObjectURL(await respuesta.blob()));
    } catch {
      notify('No se pudo preparar la vista previa del PDF.', { tone: 'error' });
    } finally {
      setPreparando(false);
    }
  }

  function cerrar() {
    setUrl('');
    requestAnimationFrame(() => boton.current?.focus());
  }

  return (
    <>
      <button ref={boton} type="button" className="ghost-button" disabled={Boolean(bloqueo) || preparando}
        title={bloqueo ?? undefined} onClick={() => void abrir()}>
        <Eye aria-hidden="true" />
        {preparando ? 'Preparando…' : 'Vista previa del PDF'}
      </button>
      {/* En el body: dentro del panel, su backdrop-filter recortaría el diálogo a la sección. */}
      {url && createPortal(
        <div ref={dialogo} className="pdf-preview-backdrop" role="dialog" aria-modal="true" aria-label="Vista previa de la hoja de taller">
          <div className="pdf-preview-window">
            <header>
              <div><strong>Vista previa de la hoja de taller</strong><span>Una hoja A4 apaisada por elemento · no se guarda en ninguna carpeta</span></div>
              <div className="pdf-preview-actions">
                <button className="ghost-button" type="button" disabled={preparando} onClick={() => void abrir()}><Eye aria-hidden="true" />Actualizar</button>
                <button className="icon-button" type="button" onClick={cerrar} aria-label="Cerrar vista previa"><X aria-hidden="true" /></button>
              </div>
            </header>
            <PdfPreviewViewer key={url} url={url} ariaLabel="Hoja de taller de remolques" />
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
```

- [ ] **Step 5: Sitio en las pestañas y en la vista**

En `src/client/remolques/PestanasElementos.tsx`:

Sustituir:

```tsx
export function PestanasElementos({
  lineas, estadosLinea, versionActiva, puedeAnadir, onSeleccionar, onEliminar, onNuevo,
}: {
```

por:

```tsx
export function PestanasElementos({
  lineas, estadosLinea, versionActiva, puedeAnadir, onSeleccionar, onEliminar, onNuevo, acciones, pie,
}: {
```

Tras `onNuevo: (tipo: TipoPlanteamiento) => void;` añadir:

```tsx
  /** Acciones del pedido entero, antes de «+ Remolque» (la vista previa del PDF). */
  acciones?: React.ReactNode;
  /** Debajo de las pestañas (qué falta para el PDF). */
  pie?: React.ReactNode;
```

Sustituir:

```tsx
        <div className="order-add-actions">
          <button type="button" className="ghost-button" disabled={!puedeAnadir} onClick={() => onNuevo('lona')}>+ Remolque</button>
```

por:

```tsx
        <div className="order-add-actions">
          {acciones}
          <button type="button" className="ghost-button" disabled={!puedeAnadir} onClick={() => onNuevo('lona')}>+ Remolque</button>
```

Y justo antes del `</section>` final añadir `{pie}`.

En `src/client/remolques/RemolquesView.tsx`:

Añadir a los imports:

```tsx
import { VistaPreviaPdf } from './VistaPreviaPdf';
import { faltaParaPdf } from './vistaPrevia';
```

Tras `const estadoActivo = lineaActiva ? estadosLinea[lineaActiva.version] : null;` añadir:

```tsx
  // La hoja de taller solo sale con todos los elementos completos (fase 4).
  const faltaPdf = faltaParaPdf(lineas, estadosLinea);
```

En `<PestanasElementos … />`, tras `onNuevo={ws.nuevaLinea}` añadir:

```tsx
        acciones={lineas.length > 0 ? <VistaPreviaPdf lineas={lineas} bloqueo={faltaPdf} notify={notify} /> : null}
        pie={lineas.length > 0 && faltaPdf
          ? <p className="rem-pdf-falta" role="status">Para la vista previa del PDF falta: {faltaPdf}</p>
          : null}
```

En `src/client/coordina/remolques.css`, tras la regla `.rem-editor-estado.is-ok { … }` añadir:

```css
/* ── Vista previa del PDF (fase 4): qué falta para poder verla, con el aviso de «Falta: …» ── */
.rem-pdf-falta {
  background: var(--aviso-fondo);
  border: 1px solid var(--aviso-borde);
  border-radius: 0.5rem;
  color: var(--aviso-texto);
  font-size: 12px;
  font-weight: 700;
  margin: 0.5rem 0 0;
  padding: 0.5rem 0.75rem;
}
```

- [ ] **Step 6: Ver que pasa y compila**

Run: `pnpm exec vitest run src/client/remolques && pnpm typecheck && pnpm lint`
Expected: PASS (`vistaPrevia.test.ts` 4) y sin errores.

- [ ] **Step 7: Verlo en la instancia aislada**

Arrancar la aislada. En Remolques, pedido `AR.26.99989`, «+ Remolque»: el botón «Vista previa del PDF» está desactivado y debajo de las pestañas sale «Para la vista previa del PDF falta: A · Remolque: Introduce el largo del remolque.» (el primer error del elemento vacío). Completar el remolque con los datos de `lona-02` de la fixture: el aviso desaparece, el botón se activa y al pulsarlo sale «Preparando…» y después el visor con «Página 1 de 1»; `Esc` lo cierra y el foco vuelve al botón. Capturar en claro y oscuro a 1600×1000 y 1280×720 en `tmp/ui-audit/remolques-4/boton-*.png` y mirarlas. Parar la aislada.

- [ ] **Step 8: Commit**

```bash
git add src/client/remolques/vistaPrevia.ts src/client/remolques/vistaPrevia.test.ts src/client/remolques/VistaPreviaPdf.tsx src/client/remolques/PestanasElementos.tsx src/client/remolques/RemolquesView.tsx src/client/coordina/remolques.css
git commit -m "feat(remolques): botón «Vista previa del PDF» en Remolques

El técnico tiene que poder ver la hoja de taller antes de pasarla a producción.
El botón abre el PDF del pedido en el mismo visor que toldos y solo se puede
pulsar con todos los elementos completos; si falta algo, lo dice debajo de las
pestañas como el «Falta: …» de cada elemento. No guarda nada.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: Despliegue (Chromium, comprobaciones y documentación)

Modelo recomendado: el más barato (el código está completo). Esfuerzo: bajo.

**Files:**
- Modify: `scripts/check-deployment.mjs`, `scripts/smoke-production.mjs`, `README.md`, `.env.example`, `.env.production.example`

**Interfaces:**
- Consumes: `muestrasHoja` (Task 2), `POST /api/remolques/pdf` (Task 5), `dist/hoja-remolques.html` (Task 4), `playwright-core` (Task 5).
- Produces: `pnpm deploy:check` falla si falta el Chromium de `playwright-core`, si `playwright` y `playwright-core` no van en la misma versión o si falta `dist/hoja-remolques.html`; `pnpm deploy:smoke` hace de verdad una hoja en PDF con el build.

- [ ] **Step 1: `deploy:check`**

En `scripts/check-deployment.mjs`:

Añadir `'REMOLQUES_PLANTEAMIENTOS_DIRECTORY', 'REMOLQUES_OFICINA_TECNICA_DIRECTORY',` a `EFFECTIVE_ENV_KEYS`, tras `'RPS_PLANTEAMIENTOS_DIRECTORY',`.

Sustituir:

```js
await checkProductionBuild();
await checkEcosystem();
```

por:

```js
await checkProductionBuild();
await checkChromium();
await checkEcosystem();
```

Al final de `checkProductionBuild`, antes de su `}` de cierre, añadir:

```js

  // Segunda página del build: la hoja de taller de remolques que imprime Chromium (fase 4).
  try {
    const hoja = await stat(path.join(projectDirectory, 'dist', 'hoja-remolques.html'));
    if (!hoja.isFile() || hoja.size === 0) fail('dist/hoja-remolques.html no es válido. Ejecuta pnpm build.');
    else pass('dist/hoja-remolques.html existe (hoja de taller de remolques).');
  } catch {
    fail('Falta dist/hoja-remolques.html. Ejecuta pnpm build.');
  }
```

Tras la función `checkProductionBuild` añadir:

```js
// La hoja de taller de remolques se hace con el Chromium de playwright-core (fase 4). El que se
// instala con `pnpm exec playwright install chromium` es el de `playwright`: tienen que ir en la
// misma versión o playwright-core buscaría otro que no existe.
async function checkChromium() {
  try {
    const packageJson = JSON.parse(await readFile(path.join(projectDirectory, 'package.json'), 'utf8'));
    const core = packageJson.dependencies?.['playwright-core'];
    const cli = packageJson.devDependencies?.playwright;
    if (!core) {
      fail('package.json no tiene playwright-core en dependencies: el servidor no podría hacer la hoja de taller de remolques.');
      return;
    }
    if (cli && cli.replace(/^[\^~]/, '') !== core) {
      fail(`playwright (${cli}) y playwright-core (${core}) deben ir en la misma versión.`);
      return;
    }
    const { chromium } = await import('playwright-core');
    const ejecutable = chromium.executablePath();
    await access(ejecutable, fsConstants.X_OK);
    pass(`Chromium de la hoja de taller de remolques instalado (${ejecutable}).`);
  } catch (error) {
    fail(`Falta el Chromium de la hoja de taller de remolques. Instálalo con: pnpm exec playwright install chromium (${error.message}).`);
  }
}
```

- [ ] **Step 2: `deploy:smoke` hace una hoja de verdad**

En `scripts/smoke-production.mjs`, añadir tras `import { spawn } from 'node:child_process';`:

```js
import { readFile } from 'node:fs/promises';
```

y, tras la comprobación de HERA (`assert(heraAttempt.body.ofs[0].materials.some(…), …);`), añadir:

```js
  // Hoja de taller de remolques (fase 4): Chromium arranca, pinta WebGL y hace el PDF con el build.
  const { muestrasHoja } = await import('../src/remolques/hoja/muestras.ts');
  const casosRemolques = JSON.parse(await readFile(path.join(projectDirectory, 'src', 'remolques', '__fixtures__', 'produccion-2026-09.json'), 'utf8'));
  const hoja = await fetch(`${baseUrl}/api/remolques/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ elementos: muestrasHoja(casosRemolques)['lona-ventana'] })
  });
  const hojaBytes = Buffer.from(await hoja.arrayBuffer());
  assert(
    hoja.ok && hojaBytes.subarray(0, 4).toString('ascii') === '%PDF',
    `La hoja de taller de remolques no sale en PDF (${hoja.status}: ${hoja.ok ? 'no es un PDF' : hojaBytes.toString('utf8').slice(0, 300)}).`
  );
```

- [ ] **Step 3: Probarlo en local**

Run: `pnpm build && pnpm deploy:check && pnpm deploy:smoke`
Expected: `deploy:check` enseña `[OK] dist/hoja-remolques.html existe (hoja de taller de remolques).` y `[OK] Chromium de la hoja de taller de remolques instalado (…)` (los errores de `.env` que ya diera antes en este equipo no cuentan; no puede salir ninguno nuevo); `deploy:smoke` termina bien. Si Chromium falta en este equipo: `pnpm exec playwright install chromium` y repetir.

- [ ] **Step 4: Documentación**

En `.env.example`, tras `RPS_PLANTEAMIENTOS_DIRECTORY=` añadir:

```
# Hoja de taller de remolques (fase 4): las carpetas de la web de remolques (sus RUTA_PLANTEAMIENTOS y
# RUTA_OFICINA_TECNICA). La de oficina técnica lleva {YYYY}: ahí va <año>/PEDIDO.pdf.
REMOLQUES_PLANTEAMIENTOS_DIRECTORY=
REMOLQUES_OFICINA_TECNICA_DIRECTORY=
```

En `.env.production.example`, tras `RPS_PLANTEAMIENTOS_DIRECTORY=/mnt/rps/ventas/planteamientos/{YYYY}` añadir:

```
# Hoja de taller de remolques: los valores de RUTA_PLANTEAMIENTOS y RUTA_OFICINA_TECNICA de la web de
# remolques; a la de oficina técnica se le añade /{YYYY}.
REMOLQUES_PLANTEAMIENTOS_DIRECTORY=
REMOLQUES_OFICINA_TECNICA_DIRECTORY=
```

En `README.md`, en «### 3. Publicar y arrancar», sustituir el bloque:

```bash
cd /webs/toldos-testar
pnpm install --frozen-lockfile
pnpm build
```

por:

```bash
cd /webs/toldos-testar
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm build
```

y tras el párrafo «`ecosystem.config.cjs` ejecuta una sola instancia `fork`…» añadir:

```markdown
La hoja de taller de remolques la hace el propio servidor con un Chromium sin ventana
(`playwright-core`, WebGL por SwiftShader; Chrome for Testing se instala en
`~/.cache/ms-playwright`). La primera vez en un servidor nuevo hacen falta además sus
librerías: `pnpm exec playwright install --with-deps chromium`. `deploy:check` comprueba que
está instalado y `deploy:smoke` hace una hoja de verdad. Chromium vive fuera del proceso de
Node: el límite de memoria de PM2 no lo cuenta.
```

En «### 5. Actualizar», sustituir:

```bash
git pull --ff-only
pnpm install --frozen-lockfile
pnpm build
```

por:

```bash
git pull --ff-only
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm build
```

- [ ] **Step 5: Commit**

```bash
git add scripts/check-deployment.mjs scripts/smoke-production.mjs README.md .env.example .env.production.example
git commit -m "chore(despliegue): Chromium de la hoja de taller en el despliegue

El servidor hace la hoja de remolques con Chromium, así que el despliegue lo
instala, deploy:check comprueba que está y que su versión casa con la de
playwright, y deploy:smoke hace una hoja de verdad con el build antes de
recargar PM2. Documentadas las dos carpetas nuevas de remolques.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

### Task 9: Prueba de punta a punta y muestras para Iván

Modelo recomendado: intermedio (Sonnet). Esfuerzo: medio.

**Files:**
- Create: `scripts/test-remolques-4-e2e.mjs`

**Interfaces:**
- Consumes: `openApp`, `BASE_URL` (`.claude/skills/running-toldos-testar/drive.mjs`), `editor`, `teclearCaso` (`scripts/lib/remolques-e2e.mjs`), `muestrasHoja` (Task 2), `prepararPedidoHoja`, `paginaHoja` (Tasks 1–2), `nombrePdf`, `anioDelPlanteamiento` (Task 2), `remolquesUnicos` (`src/remolques/pedidos/agrupar-pedido.ts`), `normalizarNumeroPedido`, `POST /api/remolques/pdf`, `GET /api/remolques/parametros`, la web vieja `GET ${REMOLQUES_VIEJA_URL}/api/planteamientos` (solo lectura).
- Produces: `tmp/ui-audit/remolques-4/` con `muestra-<nombre>.pdf`, `muestra-<nombre>-hoja<N>-grises.png`, `pedido-<AR…>-nuevo.pdf` (+ grises) y, si hay `PDF_VIEJOS_DIR`, `pedido-<AR…>-viejo.pdf`.

- [ ] **Step 1: La e2e**

Crear `scripts/test-remolques-4-e2e.mjs`:

```js
// Prueba e2e de la hoja de taller de remolques (fase 4) y muestras para Iván. Con la aislada en
// marcha (puerto 4310):
//   1. POST /api/remolques/pdf con cada muestra (src/remolques/hoja/muestras.ts): lona con ventana,
//      baquetón, «Según ganchos», bastilla, los cinco perfiles y un pedido de tres elementos. Cada
//      PDF: una hoja A4 apaisada por elemento, con los textos que da paginaHoja (pdfjs), en menos
//      de 30 s. Cada hoja se pasa además a PNG en grises, como la imprimiría el taller.
//   2. Errores claros: un elemento incompleto → 400 con cuál y qué le falta; dos pedidos → 400.
//   3. En la pantalla: «Vista previa del PDF» desactivado con lo que falta; con el remolque completo
//      abre el visor con «Página 1 de 1» y Esc lo cierra; sin errores de consola.
//   4. El PDF viejo del mismo pedido: busca en la web vieja (solo GET) el pedido real de los casos de
//      la fixture usados en las muestras y hace el PDF nuevo de ese pedido entero; con PDF_VIEJOS_DIR
//      (la carpeta OFICINA TÉCNICA de la web vieja, solo lectura) copia al lado el PDF viejo.
// Ejecutar con la aislada en marcha: node scripts/test-remolques-4-e2e.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { BASE_URL, openApp } from '../.claude/skills/running-toldos-testar/drive.mjs';
import { muestrasHoja, NOMBRES_MUESTRAS } from '../src/remolques/hoja/muestras.ts';
import { paginaHoja } from '../src/remolques/hoja/pagina.ts';
import { prepararPedidoHoja } from '../src/remolques/hoja/pedido.ts';
import { remolquesUnicos } from '../src/remolques/pedidos/agrupar-pedido.ts';
import { normalizarNumeroPedido } from '../src/remolques/pedidos/numero-pedido.ts';
import { anioDelPlanteamiento, nombrePdf } from '../src/remolques/salida/nombre-pdf.ts';
import { editor, teclearCaso } from './lib/remolques-e2e.mjs';

const SALIDA = 'tmp/ui-audit/remolques-4';
fs.mkdirSync(SALIDA, { recursive: true });
const CON_WEBGL = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const fixture = JSON.parse(fs.readFileSync('src/remolques/__fixtures__/produccion-2026-09.json', 'utf8'));
const muestras = muestrasHoja(fixture);
const params = await (await fetch(`${BASE_URL}/api/remolques/parametros`)).json();
const sinEspacios = (t) => t.replace(/\s+/g, '');

async function pedirPdf(elementos) {
  const inicio = Date.now();
  const r = await fetch(`${BASE_URL}/api/remolques/pdf`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ elementos }),
  });
  return { status: r.status, tipo: r.headers.get('content-type') ?? '', cuerpo: Buffer.from(await r.arrayBuffer()), ms: Date.now() - inicio };
}

async function leerPdf(bytes) {
  const doc = await getDocument({ data: new Uint8Array(bytes) }).promise;
  const paginas = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const p = await doc.getPage(n);
    const { width, height } = p.getViewport({ scale: 1 });
    paginas.push({ width, height, texto: (await p.getTextContent()).items.map((i) => i.str).join(' ') });
  }
  return { doc, paginas };
}

/** Cada hoja a PNG en grises (luminancia), como la sacaría la impresora de blanco y negro. */
async function aGrises(doc, base) {
  for (let n = 1; n <= doc.numPages; n++) {
    const p = await doc.getPage(n);
    const viewport = p.getViewport({ scale: 2 });
    const { canvas, context } = doc.canvasFactory.create(viewport.width, viewport.height);
    await p.render({ canvas, canvasContext: context, viewport }).promise;
    const img = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const g = Math.round(0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2]);
      img.data[i] = g; img.data[i + 1] = g; img.data[i + 2] = g;
    }
    context.putImageData(img, 0, 0);
    fs.writeFileSync(`${base}-hoja${n}-grises.png`, canvas.toBuffer('image/png'));
  }
}

function comprobarTextos(nombre, leido, esperadas) {
  assert.equal(leido.paginas.length, esperadas.length, `${nombre}: una hoja por elemento`);
  for (const [n, p] of leido.paginas.entries()) {
    assert.equal(Math.round(p.width), 842, `${nombre} hoja ${n + 1}: A4 apaisado (ancho)`);
    assert.equal(Math.round(p.height), 595, `${nombre} hoja ${n + 1}: A4 apaisado (alto)`);
    const e = esperadas[n];
    const textos = [
      e.titulo, e.cabecera.numeroPedido, e.cabecera.cliente, e.cabecera.of, e.cabecera.fecha, 'REVISADO POR',
      ...e.banda.map((c) => c.titulo), ...e.banda[0].lineas, e.material,
      e.ollaos.titulo, ...e.ollaos.filas.map((f) => f.nombre),
      ...(e.ganchos ? [e.ganchos.titulo, ...e.ganchos.filas.map((f) => f.nombre)] : []),
      ...e.notas,
    ];
    for (const t of textos) assert.ok(sinEspacios(p.texto).includes(sinEspacios(t)), `${nombre} hoja ${n + 1}: sale «${t}»`);
  }
}

// ── 1. Las muestras ──
for (const nombre of NOMBRES_MUESTRAS) {
  const pdf = await pedirPdf(muestras[nombre]);
  assert.equal(pdf.status, 200, `${nombre}: ${pdf.cuerpo.toString('utf8').slice(0, 300)}`);
  assert.equal(pdf.tipo, 'application/pdf');
  assert.ok(pdf.ms < 30000, `${nombre}: ${pdf.ms} ms`);
  const base = `${SALIDA}/muestra-${nombre}`;
  fs.writeFileSync(`${base}.pdf`, pdf.cuerpo);
  const leido = await leerPdf(pdf.cuerpo);
  const datos = prepararPedidoHoja(muestras[nombre], params);
  comprobarTextos(nombre, leido, datos.elementos.map((e, i) => paginaHoja(e, i, datos.elementos.length, params)));
  await aGrises(leido.doc, base);
  console.log(`OK: ${nombre}, ${leido.paginas.length} hoja(s) en ${pdf.ms} ms`);
}

// ── 2. Errores claros ──
{
  const [lona] = muestras['lona-ventana'];
  const incompleto = await pedirPdf([{ ...lona, input: { ...lona.input, altoDelante: 0 } }]);
  assert.equal(incompleto.status, 400);
  assert.equal(JSON.parse(incompleto.cuerpo.toString('utf8')).error, 'Remolque 1: Introduce el alto delantero.');
  const mezclado = await pedirPdf([lona, { ...muestras.baqueton[0], version: '11' }]);
  assert.equal(mezclado.status, 400);
  assert.equal(JSON.parse(mezclado.cuerpo.toString('utf8')).error, 'Todos los elementos de la hoja tienen que ser del mismo pedido.');
  console.log('OK: errores claros');
}

// ── 3. En la pantalla ──
{
  const { browser, page, errors } = await openApp({ width: 1600, height: 1000 }, { launchArgs: CON_WEBGL });
  page.setDefaultTimeout(20000);
  await page.getByRole('button', { name: /^Remolques/ }).click();
  await page.getByLabel('Pedido', { exact: true }).fill('AR.26.99989');
  await page.getByRole('button', { name: '+ Remolque' }).click();
  await editor(page).waitFor();
  const boton = page.getByRole('button', { name: 'Vista previa del PDF' });
  assert.equal(await boton.isDisabled(), true, 'el botón empieza desactivado');
  assert.match(await page.locator('.rem-pdf-falta').innerText(), /^Para la vista previa del PDF falta: A · Remolque/);
  await teclearCaso(page, fixture.find((c) => c.caso === 'lona-02'));
  await page.locator('.rem-pdf-falta').waitFor({ state: 'detached' });
  assert.equal(await boton.isEnabled(), true, 'con el remolque completo se puede pedir');
  await boton.click();
  await page.locator('.pdf-preview-window').getByText('Página 1 de 1').waitFor({ timeout: 60000 });
  await page.screenshot({ path: `${SALIDA}/pantalla-vista-previa.png` });
  await page.keyboard.press('Escape');
  await page.locator('.pdf-preview-window').waitFor({ state: 'detached' });
  assert.deepEqual(errors, [], 'sin errores de consola');
  await browser.close();
  console.log('OK: botón y visor en la pantalla');
}

// ── 4. El PDF viejo del mismo pedido ──
{
  const VIEJA = process.env.REMOLQUES_VIEJA_URL || 'http://192.168.0.90:4500';
  const sinCabecera = ({ cabecera: _cabecera, ...resto }) => resto;
  let registros = null;
  try {
    const r = await fetch(`${VIEJA}/api/planteamientos`, { signal: AbortSignal.timeout(10000) });
    if (r.ok) registros = await r.json();
  } catch { /* sin red a la web vieja */ }
  if (!registros) {
    console.log(`AVISO: no se pudo leer ${VIEJA}/api/planteamientos: pide a Iván los PDF viejos de los pedidos de lona-02, baqueton-01, baqueton-04 y lona-03.`);
  } else {
    const pedidos = new Map();
    for (const id of ['lona-02', 'baqueton-01', 'baqueton-04', 'lona-03']) {
      const caso = fixture.find((c) => c.caso === id);
      const rec = registros.find((x) => x.tipo === caso.tipo && isDeepStrictEqual(sinCabecera(x.input), sinCabecera(caso.input)));
      if (!rec) { console.log(`AVISO: ${id} no aparece en la web vieja.`); continue; }
      const numero = normalizarNumeroPedido(rec.numeroPedido);
      pedidos.set(numero, [...(pedidos.get(numero) ?? []), id]);
    }
    for (const [numero, ids] of pedidos) {
      const delPedido = remolquesUnicos(registros.filter((x) => normalizarNumeroPedido(x.numeroPedido) === numero));
      const pdf = await pedirPdf(delPedido.map((x) => ({ version: x.version, tipo: x.tipo, input: x.input })));
      const base = `${SALIDA}/pedido-${numero}`;
      if (pdf.status !== 200) { console.log(`AVISO: ${numero} (${ids.join(', ')}): ${pdf.cuerpo.toString('utf8')}`); continue; }
      fs.writeFileSync(`${base}-nuevo.pdf`, pdf.cuerpo);
      await aGrises((await leerPdf(pdf.cuerpo)).doc, `${base}-nuevo`);
      const anio = anioDelPlanteamiento(numero, '');
      const viejoNombre = nombrePdf(numero).replace(/-10\.pdf$/, '.pdf');
      const viejo = process.env.PDF_VIEJOS_DIR ? path.join(process.env.PDF_VIEJOS_DIR, String(anio), viejoNombre) : null;
      if (viejo && fs.existsSync(viejo)) {
        fs.copyFileSync(viejo, `${base}-viejo.pdf`);
        console.log(`OK: ${numero} (${ids.join(', ')}): nuevo y viejo en ${base}-*.pdf`);
      } else {
        console.log(`${numero} (${ids.join(', ')}): nuevo en ${base}-nuevo.pdf; el viejo está en OFICINA TÉCNICA/${anio}/${viejoNombre}`);
      }
    }
  }
}

console.log('Hoja de taller de remolques: todo bien.');
```

- [ ] **Step 2: Ejecutarla**

Arrancar la aislada en segundo plano y, cuando responda `/api/health`:

Run: `node scripts/test-remolques-4-e2e.mjs`
Expected: seis `OK: <muestra>, N hoja(s) en … ms`, `OK: errores claros`, `OK: botón y visor en la pantalla`, las líneas de los pedidos reales (o el AVISO si no hay red a la web vieja) y `Hoja de taller de remolques: todo bien.`

Si se tiene acceso de lectura a la carpeta OFICINA TÉCNICA de la web vieja desde este equipo, repetir con `PDF_VIEJOS_DIR="<esa carpeta>" node scripts/test-remolques-4-e2e.mjs` para copiar al lado los PDF viejos.

- [ ] **Step 3: Mirar las muestras**

Abrir **todos** los PDF y los PNG en grises de `tmp/ui-audit/remolques-4/` (Windows: `Invoke-Item`). Apuntar en el informe, por muestra y por pedido real junto a su PDF viejo: qué dice igual, qué dice de más, y cómo se ve el dibujo en grises (lona, cajón, goma, ollaos, aristas, cotas y números). Cualquier cosa que no se lea bien se arregla en `medidas.ts`/`hoja.css` (Task 4) antes de seguir.

- [ ] **Step 4: Todas las pruebas**

Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`
Expected: todo pasa. Parar la aislada.

- [ ] **Step 5: Commit**

```bash
git add scripts/test-remolques-4-e2e.mjs
git commit -m "test(remolques): prueba de punta a punta de la hoja de taller

Cada muestra (lona con ventana, baquetón, según ganchos, bastilla, los cinco
perfiles y un pedido de tres) sale en PDF con una hoja A4 apaisada por elemento
y los textos esperados, en menos de 30 s; los errores se entienden; el botón de
la pantalla abre el visor. Deja las muestras en PDF y en grises, y el PDF nuevo
de los pedidos reales junto al viejo, para que Iván las compare.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>"
```

---

## Después del plan

- Revisión final de toda la rama con el modelo más capaz (Opus, esfuerzo alto).
- Enseñar a Iván las muestras (`tmp/ui-audit/remolques-4/`) junto a los PDF viejos antes de darlo por bueno; en especial: la fila «BASTILLA ENFUNDAR», las «NOTAS DEL CÁLCULO» y la tabla de ganchos, que la hoja vieja no tenía.
- Carpetas de remolques en el servidor: copiar las de la web vieja al `.env` de toldos. Para verlas sin enseñar nada más: `pm2 describe remolques-tgm | grep 'exec cwd'` y, en esa carpeta, `grep -hE '^RUTA_(PLANTEAMIENTOS|OFICINA_TECNICA)=' .env*`. En `/webs/toldos-testar/.env`: `REMOLQUES_PLANTEAMIENTOS_DIRECTORY=<RUTA_PLANTEAMIENTOS>` y `REMOLQUES_OFICINA_TECNICA_DIRECTORY=<RUTA_OFICINA_TECNICA>/{YYYY}`. Si alguien ya guardó Configuración (existe `/var/lib/toldos-testar/workflow-settings.json`), ponerlas allí desde la pantalla. En la fase 4 todavía no se escribe nada en ellas.
- Despliegue (lleva dependencia nueva y Chromium). Antes, en el servidor: `cd /webs/toldos-testar && git status --short && git log --oneline origin/main..HEAD` (tiene que salir vacío). Después, en una línea: `git pull --ff-only && pnpm install --frozen-lockfile && git checkout -- package.json pnpm-lock.yaml && pnpm exec playwright install chromium && pnpm build && pnpm deploy:check && pnpm deploy:smoke && pnpm pm2:reload && pm2 save`.
