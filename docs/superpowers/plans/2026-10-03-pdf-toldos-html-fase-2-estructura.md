# PDF de toldos en HTML · Fase 2: página de estructura — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La página de estructura A5 de cada toldo sale de una página web impresa por Chromium, en la misma pasada que las hojas de telas, con pdfkit como respaldo.

**Architecture:** Una función pura del dominio prepara los datos de cada hoja de estructura. La página web `hoja-telas.html` (ya existente) pasa a pintar todas las hojas del planteamiento en orden: estructura (A5, página con nombre de CSS) y telas (A4). El servidor pide una sola impresión; `buildOrderPlanteamientoPdf` sustituye en el PDF de pdfkit los tramos de páginas de cada hoja por las impresas (el resto, HERA incluido, sigue siendo de pdfkit) y encaja los dibujos de telas.

**Tech Stack:** Node ≥ 22.18, Express 5, React 19, TypeScript, vitest, Playwright (playwright-core, Chromium), pdfkit, pdf-lib, pdfjs-dist (solo en pruebas), pnpm.

**Spec:** `docs/superpowers/specs/2026-10-03-pdf-toldos-html-fase-2-estructura-design.md`

## Global Constraints

- «Si Chromium no está, no responde, tarda de más o la página da error, el PDF entero sale con pdfkit como hasta ahora y se escribe el motivo en el registro. El PDF no se bloquea nunca.»
- «`ESTRUCTURA_HTML=0` en el `.env` (y reiniciar con PM2) vuelve a la página de estructura de pdfkit sin desplegar; por defecto está activa. `TELAS_HTML=0` sigue apagando la hoja de telas. Con las dos apagadas, el PDF es el de pdfkit de siempre.»
- Tamaño: la página de estructura es **A5 apaisado** (595,28 × 419,53 pt); la de telas, A4 apaisado.
- La página de estructura de pdfkit (`drawStructurePage` y lo que usa) **no se toca**: es el respaldo.
- Límite de tiempo: el PDF no debe pasar de **2 s**; si pasa, se para y se pregunta.
- Reglas de `AGENTS.md`: nunca arrancar con el `.env` real (solo `bash .claude/skills/running-toldos-testar/start-isolated.sh`, puertos 4312/4322 o 4314/4324); nada fuera de `tmp/`; `git add` por ruta; finales de línea de cada fichero (varios `.js` del servidor y del dominio son CRLF: compruébalo con `file` antes y después); commits en castellano que expliquen el porqué, acabados en `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`; textos y comentarios en castellano llano; decimales con coma; no citar el Excel; no tocar la paridad de remolques ni `src/remolques/` salvo que la tarea lo diga.
- Antes de cada commit: `pnpm test && pnpm typecheck && pnpm lint`, y `pnpm exec vite build` si se toca el cliente.

## Cambios decididos por Iván (aplican a datos y página)

1. Decimales con coma («327,2»). 2. «—» en todo lo vacío. 3. Nombre del modelo con tilde en la barra («ARZÚA PRO»). 4. Paño con un decimal («9,0 ML»). 5. Palabras enteras donde quepan: «DISPOSITIVO», «POSICIÓN MOTOR» / «COLOCACIÓN MÁQUINA», «COLOCACIÓN TOLDO», «UNIDADES», «LONGITUD». 6. Accesorios y anclaje con la misma letra que el despiece. 7. Accesorios: solo las filas con algo; si no hay, una fila con «—». 8. Anclaje sin dato: «NO INDICADO». 9. Sin observaciones no hay recuadro y las filas del despiece crecen. 10. El dispositivo sigue en la barra y en DETALLES. Además: accesorios y anclaje **sin** los números 21, 22, 23 y 25.

## Ficheros

- `src/domain/planteamientoPdf.js` — datos (`buildStructureSheetPages`), tramos de estructura en pdfkit y unión.
- `src/domain/planteamientoPdf.structureSheet.test.js` — pruebas nuevas de datos y unión de estructura.
- `src/client/hojaTelas/tipos.ts`, `HojaEstructura.tsx` (nuevo), `hojaEstructura.css` (nuevo), `HojaTelas.tsx`, `hojaTelas.css`, `main.tsx`, `muestraDev.ts`, pruebas al lado.
- `src/hojaTelasPdf.js`, `src/config.js`, `src/server.js`, `.env.example` y similares — cableado.
- `scripts/test-hoja-estructura-e2e.mjs` (nuevo) — prueba de punta a punta.

---

### Task 1: Datos de la hoja de estructura

**Files:**
- Modify: `src/domain/planteamientoPdf.js` (añadir; no cambiar `drawStructure*`)
- Create: `src/domain/planteamientoPdf.structureSheet.test.js`

**Interfaces:**
- Consumes (ya existen en `planteamientoPdf.js`): `buildPlanteamientoPlan(order, calculation, { onlyAwningId })` → `{ structureEntries: [{ awning, index, ofBlock }], fabricPages }`; `splitDespiece(rows)` → `{ main, accessories }`; `structureNotes(awning, calc)` (de `./structureNotes.js`); `awningLetter(index)`; `formatDate`; `formatNumber` (de `./math.js`, coma decimal); `formatFabricMeasure`; `isVerticalAwningModel`; `dash(text)`; `generalHeadingNames` (modelo → nombre con tilde); `DESPIECE_ROWS_PER_PAGE` (28).
- Produces: `export function buildStructureSheetPages({ order, calculation, onlyAwningId = null })` → una hoja por entrada de `plan.structureEntries`, en ese orden:

```js
{
  kind: 'estructura',
  structureIndex,          // posición en plan.structureEntries (0, 1, 2…)
  header: { of, orderCode, customer, technician, reviewer, date, letter, model, device },
  despiece: [{ num, name, reference, units, length, bold }],   // split.main, textos ya formateados
  rowsPerPage: 28,          // DESPIECE_ROWS_PER_PAGE
  accessories: [{ name, reference, units }],                    // split.accessories; [] si no hay
  anchoring: { name, reference, units },
  partida: [['FRENTE', '337'], ['SALIDA TOLDO', '225'], ['UNIDADES', '1']],
  valid: true,              // calc?.valid !== false
  detalles: [['LACADO', 'BLANCO'], ['DISPOSITIVO', 'MOTOR'], ['POSICIÓN MOTOR', 'M.F.DER'], ['COLOCACIÓN TOLDO', 'FRONTAL']],
  tela: [['TELA', '326,2'], ['SALIDA PAÑO', '300'], ['PAÑO', '9,0 ML']],
  notes: '',                // structureNotes(...) recortado; '' si no hay
  footer: 'Toldo A · Estructura'
}
```

  Además, `buildFabricSheetPages` añade `kind: 'telas'` a cada hoja que devuelve (primer campo).

Reglas de cada campo (las mismas fuentes que `drawStructureHeader`, `drawDespieceTable`, `drawStructureSide`, `drawAccessories` y `drawAnchoring`):

- `header`: `of: dash(awning.of)`, `orderCode/customer/technician/reviewer: dash(order.…)`, `date: dash(formatDate(order.orderDate))`, `letter: awningLetter(index)`, `device: dash(awning.device)`. `model`: `'ELECTRA / ELIT VERTICAL'` si `awning.model === 'ELECTRA'`; `'DIANA VERTICAL / MAXISCREEN'` si `'MAXISCREEM'`; si no, `generalHeadingNames[MODELO] || MODELO` (MODELO = `String(awning.model).trim().toUpperCase()`), con `dash`.
- `despiece`: por cada fila de `split.main`, `num: String(row.num || posición + 1)`, `name: dash(row.name)`, `reference: dash(row.reference)`, `units: dash(row.units)`, `length`: número → `formatNumber`; texto con forma de número con punto (`/^\d+\.\d+$/`) → con coma; lo demás → `dash`. `bold: /TUBO|BRAZO|MOTOR|MAQUINA/.test(nombre en mayúsculas)`.
- `accessories`: `{ name: dash, reference: dash, units: dash }` de cada fila de `split.accessories`.
- `anchoring`: `{ name: anchoring?.name || 'NO INDICADO', reference: dash(anchoring?.reference), units: dash(anchoring?.units) }` con `anchoring = ofBlock?.despiece?.anchoring`.
- `partida`: `FRENTE` = `formatNumber(awning.width ?? calc?.width)`; `CAÍDA TOLDO` (modelo vertical) o `SALIDA TOLDO` = `formatNumber(awning.projection ?? calc?.projection)`; `UNIDADES` = `formatNumber(awning.units)`. Todos con `dash`.
- `detalles`: `LACADO` = `awning.structureColor || order.structureColor`; `DISPOSITIVO` = `awning.device`; `POSICIÓN MOTOR` si el dispositivo es `MOTOR`, si no `COLOCACIÓN MÁQUINA` = `awning.machineSide`; `COLOCACIÓN TOLDO` = `awning.placement`; con `awning.model === 'ELECTRA'`, además `VARIANTE` = `awning.submodel` y `SOPORTE` = `awning.electraSupport`; con `calc?.dropArmMode === 'VERTICAL_170'`, además `['TRABAJO', 'BAJADA VERTICAL 170°']`. Valores con `dash`.
- `tela`: `TELA` = `formatNumber(calc.fabricWidth)`; `CAÍDA PAÑO` (vertical) o `SALIDA PAÑO` = `formatNumber(calc.fabricDrop)`; `PAÑO` = `` `${formatFabricMeasure(calc.fabricMl)} ML` ``; sin `calc`, «—» en las tres.
- `notes`: `String(structureNotes(awning, calc) ?? '').trim()`.
- Con `onlyAwningId`, el `order` de cabecera es el filtrado, igual que en `buildFabricSheetPages`.

- [ ] **Step 1: Escribir las pruebas que fallan** en `src/domain/planteamientoPdf.structureSheet.test.js` (CRLF no: fichero nuevo, LF). Usa `normalizeOrder` (`./validation.js`) y `calculateOrder` (`./rules.js`) como en `planteamientoPdf.fabricSheet.test.js`, con el Arzúa de referencia:

```js
import { describe, expect, test } from 'vitest';
import { buildFabricSheetPages, buildStructureSheetPages } from './planteamientoPdf.js';
import { normalizeOrder } from './validation.js';
import { calculateOrder } from './rules.js';

const acr = 'ACRILI2018P120|||120|||LONA ACRILICA MASACRIL 300 :AZUL 2018 :120 AN|||ACRÍLICAS';
const arzua = (over = {}) => ({
  id: 'a', of: '0230194', model: 'ARZUA PRO', units: 1, width: 337, projection: 225, valanceHeight: 30, armCount: 2,
  tubeLoad: 'TUBO DE CARGA EVO 80', structureColor: 'BLANCO', device: 'MOTOR', sensor: 'SIN SENSOR',
  machineSide: 'M.F.DER', placement: 'FRONTAL', valanceCurve: 'RECTA', rotFabric: 'NO', rotValance: 'NO', ...over
});
function sheets(awnings, extra = {}) {
  const order = normalizeOrder({ orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', orderDate: '2026-10-02', fabric: acr, sameFabric: true, awnings, ...extra });
  return buildStructureSheetPages({ order, calculation: calculateOrder(order) });
}

describe('buildStructureSheetPages', () => {
  test('una hoja por toldo con estructura, con su cabecera y el modelo con tilde', () => {
    const [sheet, ...rest] = sheets([arzua()]);
    expect(rest).toEqual([]);
    expect(sheet.kind).toBe('estructura');
    expect(sheet.structureIndex).toBe(0);
    expect(sheet.header).toEqual({ of: '0230194', orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', reviewer: '—', date: '02/10/2026', letter: 'A', model: 'ARZÚA PRO', device: 'MOTOR' });
    expect(sheet.footer).toBe('Toldo A · Estructura');
    expect(sheet.rowsPerPage).toBe(28);
  });

  test('despiece con coma decimal, «—» en lo vacío y negrita en tubos, brazos y motor', () => {
    const [{ despiece }] = sheets([arzua()]);
    const tubo = despiece.find(({ name }) => name === 'TUBO DE ENROLLE P801');
    expect(tubo).toMatchObject({ length: '327,2', units: '1', bold: true });
    const soporte = despiece.find(({ name }) => name === 'JUEGO SOPORTE AROND');
    expect(soporte).toMatchObject({ length: '—', bold: false });
    expect(despiece.map(({ num }) => num)).toEqual(despiece.map((_, i) => String(i + 1)));
    expect(JSON.stringify(despiece)).not.toMatch(/\d\.\d/);
  });

  test('el mando va en accesorios, no en el despiece; el anclaje sin dato dice NO INDICADO', () => {
    const [sheet] = sheets([arzua()]);
    expect(sheet.accessories).toEqual([{ name: 'MANDO SITUO 1 IO PURE', reference: 'SITUOIO1PURE', units: '1' }]);
    expect(sheet.despiece.some(({ name }) => /MANDO/.test(name))).toBe(false);
    expect(sheet.anchoring).toEqual({ name: 'NO INDICADO', reference: '—', units: '—' });
  });

  test('columna derecha: partida, válido, detalles con palabras enteras y tela con el paño a un decimal', () => {
    const [sheet] = sheets([arzua()]);
    expect(sheet.partida).toEqual([['FRENTE', '337'], ['SALIDA TOLDO', '225'], ['UNIDADES', '1']]);
    expect(sheet.valid).toBe(true);
    expect(sheet.detalles).toEqual([['LACADO', 'BLANCO'], ['DISPOSITIVO', 'MOTOR'], ['POSICIÓN MOTOR', 'M.F.DER'], ['COLOCACIÓN TOLDO', 'FRONTAL']]);
    expect(sheet.tela).toEqual([['TELA', '326,2'], ['SALIDA PAÑO', '300'], ['PAÑO', '9,0 ML']]);
    expect(sheet.notes).toBe('');
  });

  test('con máquina, la etiqueta es COLOCACIÓN MÁQUINA; un vertical dice CAÍDA', () => {
    const cortina = { id: 'c', of: '0232626', model: 'CORTINA', units: 1, width: 200, projection: 275, valanceHeight: 20, valanceCurve: 'RECTA', remate: 'COMO TELA', structureColor: 'BLANCO', rotFabric: 'NO', rotValance: 'NO', device: 'MAQ. INTERIOR', crankHeight: 170, machineSide: 'M.F.DER', placement: 'TECHO', curtainSupport: 'UNIVERSAL 3 AGUJEROS', curtainHasWindow: false, curtainFinish: 'VELCRO', curtainBottomFinish: 'ET', curtainFabricAdjustment: 'NINGUNO' };
    const [sheet] = sheets([cortina]);
    expect(sheet.detalles.map(([label]) => label)).toEqual(['LACADO', 'DISPOSITIVO', 'COLOCACIÓN MÁQUINA', 'COLOCACIÓN TOLDO']);
    expect(sheet.partida[1][0]).toBe('CAÍDA TOLDO');
    expect(sheet.tela[1][0]).toBe('CAÍDA PAÑO');
  });

  test('varios toldos: una hoja cada uno, con su letra; los de solo tela no tienen hoja de estructura', () => {
    const cambio = { id: 'x', of: '0230300', model: 'CAMBIO TELA', units: 1, width: 337, projection: 225, valanceHeight: 0, rotFabric: 'NO', rotValance: '' };
    const result = sheets([arzua(), cambio, arzua({ id: 'b', of: '0230195' })]);
    expect(result.map(({ header, structureIndex }) => [structureIndex, header.letter, header.of])).toEqual([[0, 'A', '0230194'], [1, 'C', '0230195']]);
  });

  test('con onlyAwningId sale solo ese toldo, con su letra de siempre', () => {
    const order = normalizeOrder({ orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', fabric: acr, sameFabric: true, awnings: [arzua(), arzua({ id: 'b', of: '0230195' })] });
    const result = buildStructureSheetPages({ order, calculation: calculateOrder(order), onlyAwningId: 'b' });
    expect(result.map(({ header }) => header.letter)).toEqual(['B']);
    expect(result[0].structureIndex).toBe(0);
  });

  test('las observaciones de estructura del toldo van en notes', () => {
    const [sheet] = sheets([arzua({ structureNotes: 'COMPROBAR ANCLAJE EN OBRA' })]);
    expect(sheet.notes).toContain('COMPROBAR ANCLAJE EN OBRA');
  });
});

test('las hojas de telas dicen su tipo', () => {
  const order = normalizeOrder({ orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', fabric: acr, sameFabric: true, awnings: [arzua()] });
  expect(buildFabricSheetPages({ order, calculation: calculateOrder(order) }).map(({ kind }) => kind)).toEqual(['telas']);
});
```

  Si algún valor esperado concreto no coincide con lo que da el cálculo real (por ejemplo la referencia del mando o el nombre exacto de una pieza), mira lo que imprime hoy la página de pdfkit para ese pedido y ajusta **el valor esperado de la prueba**, no la regla; anótalo en el informe.

- [ ] **Step 2: Ver que fallan.** `pnpm exec vitest run src/domain/planteamientoPdf.structureSheet.test.js` → FAIL (`buildStructureSheetPages is not a function` / `kind` undefined).
- [ ] **Step 3: Implementar** `buildStructureSheetPages` junto a `buildFabricSheetPages` (comentario de cabecera en castellano que diga que sale de lo mismo que `drawStructurePage`, con los cambios de Iván del 03/10/2026) y añadir `kind: 'telas'` en `buildFabricSheetPages`.
- [ ] **Step 4: Ver que pasan** esas pruebas y `pnpm exec vitest run src/domain/planteamientoPdf` entero (las pruebas de telas existentes que comparan la hoja con `toEqual` pueden necesitar el campo `kind`).
- [ ] **Step 5:** `pnpm test && pnpm typecheck && pnpm lint`; commit `feat(pdf): datos de la hoja de estructura en HTML`.

---

### Task 2: Página web de la hoja de estructura

**Files:**
- Create: `src/client/hojaTelas/HojaEstructura.tsx`, `src/client/hojaTelas/hojaEstructura.css`, `src/client/hojaTelas/HojaEstructura.test.tsx`
- Modify: `src/client/hojaTelas/tipos.ts`, `HojaTelas.tsx` (solo `HojasTelas` y `contarPaginas`), `HojaTelas.test.tsx`, `hojaTelas.css`, `main.tsx`, `muestraDev.ts`

**Interfaces:**
- Consumes: los datos de Task 1 (`kind: 'estructura'`, campos de arriba) y las hojas de telas (`kind: 'telas'`, o sin `kind` → telas). Ayudas existentes: `ajustarUnaLinea` (`src/client/hoja/ajusteTexto.ts`: encoge la letra de `.hoja-una-linea[data-letra-minima]` hasta que cabe), `repartirNotas` (`./repartirNotas.ts`), y en `HojaTelas.tsx` el patrón de `esperarLetra`, `esperarImagenes`, `lineasVisuales`/`repartirObservaciones` y el componente `Notas`. Lo que haga falta compartir se exporta desde `HojaTelas.tsx` o se saca a un fichero común pequeño (`ayudasHoja.ts`); no se duplica.
- Produces:
  - `tipos.ts`: `export interface HojaEstructuraDatos { kind: 'estructura'; structureIndex: number; header: {...}; despiece: FilaDespiece[]; rowsPerPage: number; accessories: FilaAccesorio[]; anchoring: FilaAccesorio; partida: Array<[string, string]>; valid: boolean; detalles: Array<[string, string]>; tela: Array<[string, string]>; notes: string; footer: string }`; `HojaTelasDatos` gana `kind?: 'telas'`; `export type HojaPlanteamiento = HojaEstructuraDatos | HojaTelasDatos`.
  - `HojaEstructura.tsx`: `export function HojaEstructura({ datos, onLista, onError })`, mismo contrato que `HojaTelas`.
  - `HojasTelas` (en `HojaTelas.tsx`) acepta `hojas: HojaPlanteamiento[]` y pinta `HojaEstructura` o `HojaTelas` según `kind`.
  - Marcas en el DOM que usa el recuento: la raíz de cada hoja lleva `data-hoja-telas=""` (se mantiene el nombre, también en estructura) y cada página lleva la clase `telas-pagina` (telas) o `estructura-pagina` (estructura). `contarPaginas` cuenta `.telas-pagina, .estructura-pagina` dentro de cada `[data-hoja-telas]`.
  - CSS: páginas con nombre. En `hojaTelas.css` se cambia `@page { size: A4 landscape; margin: 0; }` por `@page { margin: 0; } @page telas { size: A4 landscape; margin: 0; }` y `.telas-pagina { page: telas; … }`. En `hojaEstructura.css`: `@page estructura { size: A5 landscape; margin: 0; }` y `.estructura-pagina { page: estructura; width: 210mm; height: 148mm; overflow: hidden; position: relative; break-after: page; }`. La última página de la última hoja no salta (`[data-hoja-telas]:last-child .estructura-pagina:last-of-type { break-after: auto; }`, igual que la regla de telas).

**Diseño de la página (A5 apaisado, 595,28 × 419,53 pt; medidas de `drawStructurePage`, en pt desde arriba a la izquierda):**

- Margen 14. Cabecera de 12 a 80: logo (58 de ancho, `/logo-tgm-planteamiento.png`), fila «OF:» (valor amarillo, 92 de ancho, letra 13) y «Nº PEDIDO:» (valor amarillo, 164 de ancho); CLIENTE (32–44), TÉCNICO y REVISOR (44–56), FECHA (56–67); barra oscura (67–80) con «TOLDO A» en amarillo a la izquierda, el modelo centrado y el dispositivo a la derecha (sobre los 164 pt del pedido). Mismos colores y filetes que la cabecera de telas (reutiliza sus clases `telas-celda`, `telas-amarillo`… o tokens de `src/client/coordina/tokens.css`).
- Cuerpo desde y = 86. Columna derecha de 164 pt de ancho (x = 595,28 − 14 − 164); columna izquierda el resto menos 8 de hueco.
- Columna izquierda: rótulo vertical «DESPIECE» (28 de ancho, fondo gris oscuro) y tabla con cabecera oscura de 14 pt: NUM (24), NOMBRE PIEZA (resto), REFERENCIA (91), UNIDADES (34), LONGITUD (38). «UNIDADES» y «LONGITUD» con `hoja-una-linea` para que encojan si no caben. Filas alternas `soft`/blanco; nombre centrado (negrita si `bold`), referencia a la izquierda, resto centrado. Debajo, pegado: barra «ELEMENTOS ACCESORIOS» y sus filas (nombre, referencia, unidades; **sin** columna de número: el nombre ocupa también esos 24 pt); hueco de 9; barra «SISTEMA DE ANCLAJE» y su fila. Accesorios y anclaje con la **misma letra y alto de fila** que el despiece. Sin accesorios: una fila «—», «—», «—».
- Alto de fila del despiece: `export function altoFilaDespiece(filas, conNotas)`: reparte el alto disponible entre las filas (mínimo 6 filas, como hoy), con tope **9,7 pt** si hay observaciones y **13 pt** si no las hay (cambio 9), y sin bajar de lo que quepa. La letra de las filas crece con el alto: `min(8, alto × 0,68)` pt.
- Observaciones (solo si `notes` no está vacío): recuadro amarillo como el de telas, debajo del anclaje a todo el ancho de la columna izquierda hasta `alto − 24`, con un mínimo de 54 pt de alto; si no hay ese alto, va en la columna derecha desde y = 336. Lo que no cabe pasa a páginas de continuación (cabecera + recuadro a página entera + pie «Toldo A · Observaciones (continuación)»), midiendo en el navegador como hace `HojaTelas`.
- Columna derecha: tabla «DATOS DE PARTIDA» (y = 86), recuadro VÁLIDO (verde, `#d9f3df` / texto `#08722c`) o REVISAR (`#fae0dc` / `#9f3328`) en y = 155, alto 43, letra 15 negrita; «DETALLES» en y = 209; «DIMENSIONES TELA» en y = 283. Tablas como `Tabla` de telas (barra de título gris, etiqueta gris en negrita, valor centrado), con las etiquetas en `hoja-una-linea` (mínimo 5,5 pt) para que «COLOCACIÓN MÁQUINA» quepa.
- Despiece largo: si `despiece.length > rowsPerPage`, la hoja ocupa varias páginas con `rowsPerPage` filas cada una; el pie dice «Toldo A · Estructura · 1/2»; accesorios, anclaje y observaciones solo en la última; la columna derecha en todas.
- Pie: `footer`, abajo a la derecha, como en telas.

- [ ] **Step 1: Pruebas que fallan** (`HojaEstructura.test.tsx`, con `renderToStaticMarkup` como `HojaTelas.test.tsx`). Casos mínimos, con un `ejemplo: HojaEstructuraDatos` del Arzúa (11 filas, un accesorio, sin notas):
  - cabecera: el HTML contiene «OF:», «0230194», «Nº PEDIDO:», «AR2603332», «TOLDO A», «ARZÚA PRO» y «MOTOR»;
  - despiece: están «TUBO DE ENROLLE P801» y «327,2»; las cabeceras son «UNIDADES» y «LONGITUD»; **no** aparecen «UNID.» ni «LONGIT.»;
  - accesorios y anclaje sin números: el HTML no contiene `>21<`, `>22<`, `>23<` ni `>25<`; con `accessories: []` hay una fila de accesorios con «—»;
  - sin notas no hay «OBSERVACIONES»; con `notes: 'COMPROBAR ANCLAJE'` sí;
  - `valid: false` pinta «REVISAR» y no «VÁLIDO»;
  - con 30 filas y `rowsPerPage: 28` hay dos elementos `estructura-pagina`, la primera con «Estructura · 1/2» y los accesorios solo en la segunda;
  - `altoFilaDespiece(11, true)` es 9,7; `altoFilaDespiece(11, false)` es 13; `altoFilaDespiece(28, true)` es menor que 9,7 y mayor que 6;
  - `HojasTelas` con `[estructura, telas]` pinta las dos, en ese orden, cada una con `data-hoja-telas`; `contarPaginas` cuenta páginas de los dos tipos (prueba con un `ParentNode` de mentira, como la que ya hay).
- [ ] **Step 2: Ver que fallan.** `pnpm exec vitest run src/client/hojaTelas`.
- [ ] **Step 3: Implementar** componente, CSS, tipos, `HojasTelas`, `contarPaginas`, y en `muestraDev.ts` las muestras `estructura`, `estructura-cortina`, `estructura-larga` (30 filas), `estructura-notas` (observaciones de 40 líneas) y `estructura-revisar` (`?muestra=estructura,cortina` debe pintar una hoja de estructura y una de telas seguidas).
- [ ] **Step 4: Ver que pasan** y `pnpm typecheck && pnpm lint && pnpm exec vite build`.
- [ ] **Step 5: Mirarla.** Con `pnpm exec vite --port 5199` (solo el servidor de desarrollo de vite, sin la aplicación ni `.env`), abrir con Playwright `http://127.0.0.1:5199/hoja-telas.html?muestra=<nombre>` para cada muestra de estructura y para `estructura,cortina`; esperar `window.hojaLista === true`; `page.pdf({ preferCSSPageSize: true, printBackground: true })` y comprobar con pdf-lib que las páginas de estructura miden 595 × 420 pt y las de telas 842 × 595; capturas en `tmp/ui-audit/estructura-html/muestra-<nombre>.png` (viewport 1280×720, `page.emulateMedia({ media: 'print' })` o captura del elemento). **Mira cada captura** y corrige lo que se vea mal (texto cortado, casillas descuadradas, filetes dobles). Compara con `tmp/ui-audit/estructura-html/antes-arzua.png` y `antes-cortina.png` (la página de pdfkit de hoy). Para el servidor de vite al acabar.
- [ ] **Step 6:** `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`; commit `feat(pdf): página web de la hoja de estructura`.

---

### Task 3: Unión en el PDF y cableado del servidor

**Files:**
- Modify: `src/domain/planteamientoPdf.js` (`buildOrderPlanteamientoPdf`, `mergeFabricSheets`, `buildPdfkitPlanteamiento`), `src/domain/planteamientoPdf.fabricSheet.test.js`, `src/domain/planteamientoPdf.structureSheet.test.js`
- Modify: `src/hojaTelasPdf.js`, `src/hojaTelasPdf.test.js`, `src/config.js`, `src/config.test.js`, `src/server.js`, `.env.example` (y los demás ejemplos de `.env` que citen `TELAS_HTML`)

**Interfaces:**
- Consumes: `buildStructureSheetPages` (Task 1); la página que pinta hojas de los dos tipos y deja `telas-paginas:n,n,…` en el título (Task 2); `paginasDeCadaHoja(pdf)` y `crearImpresoraHojaTelas` (`src/hojaTelasPdf.js`).
- Produces (contrato nuevo de `buildOrderPlanteamientoPdf`, que **sustituye** a `renderFabricSheets` / `onFabricSheetError`):

```js
buildOrderPlanteamientoPdf({
  order, calculation, review = null, onlyAwningId = null,
  renderSheets = null,      // async (hojas) => ({ pdf, pageCounts }); hojas = [...estructura, ...telas]
  htmlStructure = true,     // false: las páginas de estructura se quedan con pdfkit
  htmlFabric = true,        // false: las de telas se quedan con pdfkit
  onSheetError = null       // (error, hoja | null) => void
})
```

  - Sin `renderSheets`, o con `htmlStructure` y `htmlFabric` en falso, el resultado es **byte a byte el de antes** (camino de pdfkit con `attachReview: true`).
  - Hojas que se mandan a imprimir, en este orden: `htmlStructure ? buildStructureSheetPages(...) : []` y luego `htmlFabric ? buildFabricSheetPages(...) : []`. Si la lista queda vacía, camino de pdfkit.
  - `buildPdfkitPlanteamiento` devuelve además `structureRanges[structureIndex] = { start, end }` (páginas de pdfkit de ese toldo: todas sus páginas de despiece y sus continuaciones de observaciones; `end` exclusivo), igual que ya hace `fabricRanges`.
  - La unión (`mergeFabricSheets`, que pasa a llamarse `mergeSheets`) recorre las páginas de pdfkit y, donde empieza un tramo sustituido, copia las páginas impresas de esa hoja y salta el tramo. En las hojas de telas, además, encaja el dibujo en la primera página como hasta ahora. Las de estructura no llevan dibujo.
  - Fallos: si `renderSheets` falla o las páginas no cuadran → `onSheetError(error, null)` y todo pdfkit. Si falla el dibujo de una hoja de telas → `onSheetError(error, hoja)` y solo esa hoja se queda con pdfkit. Si falla la unión → `onSheetError(error, null)` y todo pdfkit con `attachReview: true`. Un `onSheetError` que lanza no rompe nada.
- `src/config.js`: `estructuraHtml: process.env.ESTRUCTURA_HTML !== '0'` junto a `telasHtml`, con su comentario.
- `src/hojaTelasPdf.js`: `crearImpresoraHojaTelas({ telas, estructura, fichas, servicio, url, … })` (sustituye a `activa`); `opciones(...)` devuelve `{}` si las dos están apagadas y, si no, `{ renderSheets, onSheetError, htmlStructure: estructura, htmlFabric: telas }`. `renderSheets` es el `renderFabricSheets` de hoy con otro nombre. El registro dice «Hoja en HTML del pedido X (estructura del toldo A | hoja de telas N | hojas del planteamiento): sale la de pdfkit. motivo», según `hoja?.kind`.
- `src/server.js`: pasar `telas: config.telasHtml, estructura: config.estructuraHtml` al crear la impresora. Las tres llamadas a `buildOrderPlanteamientoPdf` ya hacen `...opcionesHojaTelas(...)`: no cambian.
- `.env.example`: una línea para `ESTRUCTURA_HTML` debajo de `TELAS_HTML`, con el mismo estilo de comentario.

- [ ] **Step 1: Pruebas que fallan.**
  - En `planteamientoPdf.fabricSheet.test.js`: renombrar `renderFabricSheets` → `renderSheets` y `onFabricSheetError` → `onSheetError`, y añadir `htmlStructure: false` en las pruebas existentes de la unión (siguen probando solo telas). El ayudante `fakeSheets` debe etiquetar según el tipo: `HOJA HTML n PLAN i` para telas (como ahora) y `HOJA ESTRUCTURA n TOLDO i` para estructura (`i` = `structureIndex`), y sus páginas de estructura medir 595,28 × 419,53.
  - En `planteamientoPdf.structureSheet.test.js`, bloque nuevo «buildOrderPlanteamientoPdf con la hoja de estructura en HTML» (pedido: dos Arzúa con OF distintos; usa `pageTexts` y `pageSizes` copiados de la prueba de telas a un fichero de ayudas común `src/domain/pdfTestHelpers.js` para no duplicarlos):
    - con `renderSheets` y los dos tipos activos: una sola llamada, con las hojas `[estructura 0, estructura 1, telas…]`; el PDF tiene las mismas páginas y tamaños (`A5`, `A5`, `A4`…) que el de pdfkit; las dos primeras contienen «HOJA ESTRUCTURA 1 TOLDO 0» y «HOJA ESTRUCTURA 1 TOLDO 1» y **no** «DESPIECE»; la de telas contiene «HOJA HTML 1»;
    - una hoja de estructura que ocupa 2 páginas (`fakeSheets` con `[2, 1, 1]`) deja sus dos páginas seguidas y el resto en su sitio;
    - `htmlFabric: false`: a `renderSheets` solo llegan hojas de estructura y la página de telas sigue siendo la de pdfkit («PLANTEAMIENTO DE TELAS»);
    - `htmlStructure: false`: solo llegan las de telas y la de estructura sigue con «DESPIECE»;
    - las dos en falso: `renderSheets` no se llama y el PDF es igual (mismos textos y tamaños por página) que sin opciones;
    - con un HERA en el pedido (`heraAwning` de la prueba de telas) la página del HERA sigue siendo de pdfkit y está en el mismo sitio;
    - con observaciones de estructura largas (40 líneas), las páginas de continuación de pdfkit de ese toldo no se cuelan junto a la hoja impresa;
    - `renderSheets` que lanza → todo pdfkit y `onSheetError` recibe el error con hoja `null`;
    - con `review`, `extractReviewPackageFromPdf(pdf)` (de `../workflow.js`) devuelve la revisión.
  - En `hojaTelasPdf.test.js`: adaptar a `telas`/`estructura`, `renderSheets`, `onSheetError`; añadir: las dos apagadas → `{}`; solo estructura apagada → `htmlStructure: false, htmlFabric: true`; el registro nombra «estructura del toldo B» con `{ kind: 'estructura', header: { letter: 'B' } }` y «hoja de telas 2» con `{ kind: 'telas', planIndex: 2 }`.
  - En `config.test.js`: `estructuraHtml` activa por defecto, con `1` activa, con `0` apagada (copia del caso de `TELAS_HTML`).
- [ ] **Step 2: Ver que fallan.** `pnpm exec vitest run src/domain/planteamientoPdf src/hojaTelasPdf.test.js src/config.test.js`.
- [ ] **Step 3: Implementar** dominio, impresora, configuración, servidor y `.env.example`. Mantén los finales de línea (CRLF en `planteamientoPdf.js`, `hojaTelasPdf.js` y sus pruebas).
- [ ] **Step 4: Ver que pasan** y `grep -rn "renderFabricSheets\|onFabricSheetError" src scripts` no devuelve nada.
- [ ] **Step 5: Prueba de humo** en la instancia aislada (`PORT=4312 FAKE_COORDINA_PORT=4322 bash .claude/skills/running-toldos-testar/start-isolated.sh`, comprobar `/api/health`): `TOLDOS_ISOLATED_URL=http://127.0.0.1:4312 CASOS=arzua,cuatro REPETICIONES=2 node scripts/test-hoja-telas-e2e.mjs` sigue en verde y el registro de la instancia no tiene ningún «sale la de pdfkit». Para la instancia y comprueba que no queda nada escuchando en 4312/4322.
- [ ] **Step 6:** `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`; commit `feat(pdf): la página de estructura sale de la hoja en HTML, con ESTRUCTURA_HTML`.

---

### Task 4: Prueba de punta a punta, capturas y tiempos

**Files:**
- Create: `scripts/test-hoja-estructura-e2e.mjs`
- Modify: `scripts/check-deployment.mjs` solo si hace falta (la página sigue siendo `dist/hoja-telas.html`)

**Interfaces:**
- Consumes: la instancia aislada; `scripts/test-hoja-telas-e2e.mjs` como modelo (mismas variables: `TOLDOS_ISOLATED_URL`, `HOJA_ESPERADA=html|pdfkit`, `PREFIJO`, `CASOS`, `REPETICIONES`); `openApp` de `.claude/skills/running-toldos-testar/drive.mjs`.
- Produces: el script, las capturas en `tmp/ui-audit/estructura-html/` (`<caso>.png` y `antes-<caso>.png`) y el informe con tiempos.

Casos (pedidos completos y válidos salvo el de REVISAR; toma los campos de cada modelo de `scripts/test-hoja-telas-e2e.mjs`, de las pruebas de `src/domain/` y de `docs/modelos/`):

| Caso | Pedido |
|---|---|
| `arzua` | Arzúa Pro de referencia (AR2603332) |
| `cortina` | Cortina con ventana, máquina interior |
| `agata` | Ágata Box con cofre, motor y colocación a techo (el despiece más largo) |
| `electra` | Electra (filas VARIANTE y SOPORTE en DETALLES) |
| `iris` | Iris |
| `notas` | Arzúa con 40 líneas de observaciones de estructura |
| `revisar` | un toldo cuyo cálculo no es válido (recuadro REVISAR) |
| `cuatro` | cuatro toldos de modelos distintos (el de la prueba de telas) |

Comprobaciones por caso: salud de la instancia (`simulationMode` true, `fileWritesEnabled` false, puerto ≠ 4400); `POST /api/planteamiento` da 200 y un PDF; con pdfjs, las páginas de estructura (las A5 que no son del HERA) llevan letra Geist si se espera `html` o Segoe/Helvetica si `pdfkit`; el texto contiene el OF, el pedido, «DESPIECE», y con `html` no contiene «LONGIT.» ni «UNID.»; el número de páginas y sus tamaños coinciden entre `html` y `pdfkit` salvo en `notas` (las continuaciones pueden variar); captura de cada página de estructura desde la vista previa de Nuevo pedido.

- [ ] **Step 1:** Escribir el script y pasarlo con la hoja en HTML (`PORT=4312`).
- [ ] **Step 2:** Pasarlo con `ESTRUCTURA_HTML=0` en otra instancia (`PORT=4314 FAKE_COORDINA_PORT=4324`, `HOJA_ESPERADA=pdfkit`, capturas `antes-`): la página de estructura es la de pdfkit y la de telas sigue saliendo en HTML.
- [ ] **Step 3: Respaldo.** Con Chromium inutilizado (`PLAYWRIGHT_BROWSERS_PATH` a una carpeta vacía de `tmp/`), todos los PDF salen con pdfkit, dan 200 y el registro dice el motivo.
- [ ] **Step 4: Tiempos.** Mediana de `POST /api/planteamiento` con 5 repeticiones para `arzua` y `cuatro`, sin contar la primera petición. Si alguna mediana pasa de **2000 ms**, **para y dilo en el informe**: no intentes optimizar.
- [ ] **Step 5: Mirar las capturas**, una a una, comparando cada caso con su `antes-`: los datos son los mismos, nada se corta ni se solapa, y los diez cambios de Iván se ven. Lo que esté mal de la página se anota en el informe con el caso y la captura (no se arregla en esta tarea salvo que sea de una línea).
- [ ] **Step 6:** Parar todas las instancias (y comprobar que no queda nada en los puertos). `pnpm test && pnpm typecheck && pnpm lint`; commit `test(pdf): prueba de punta a punta de la hoja de estructura en HTML` con solo el script.
