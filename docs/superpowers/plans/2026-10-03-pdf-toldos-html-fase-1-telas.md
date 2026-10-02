# PDF de toldos en HTML · Fase 1: página de telas · Plan de trabajo

> **Para agentes:** SUB-SKILL OBLIGATORIA: usa superpowers:subagent-driven-development (recomendada) o superpowers:executing-plans para hacer este plan tarea a tarea. Los pasos usan casillas (`- [ ]`).

**Objetivo:** la página de telas A4 del planteamiento de toldos sale de una página web (React y CSS) impresa con el Chromium del servidor, igual que ahora más seis cambios que decidió Iván, y con respaldo a la página actual si algo falla.

**Arquitectura:** una función pura del dominio prepara los datos de cada página de telas. Una página web interna (`hoja-telas.html`) los pinta. El servicio de Chromium de remolques la imprime. El dibujo de confección sigue pintándose con pdfkit en un PDF del tamaño de su recuadro y se encaja con pdf-lib. `buildOrderPlanteamientoPdf` junta las páginas de pdfkit (estructura y HERA) con las impresas y vuelve a adjuntar el JSON del pedido.

**Tecnología:** Node 22, Express 5, pdfkit, pdf-lib 1.17, playwright-core (Chromium), React 19, Vite (entrada múltiple), vitest, pdfjs-dist.

**Especificación:** `docs/superpowers/specs/2026-10-03-pdf-toldos-html-fase-1-telas-design.md`.

## Restricciones globales

- Solo cambia la página de telas A4 de toldos. Las páginas de estructura (A5) y la de telas del HERA (A5) no se tocan.
- Igual que ahora salvo los seis cambios decididos: cabecera como la de estructura («OF:» y «Nº PEDIDO:» arriba); «—» en todo lo que no aplica; la segunda línea de cada fila lleva la instrucción a todo el ancho y el nombre del trabajo solo si hay trabajos distintos en la página; filas que crecen con pocas, hasta un máximo, y total abajo; total con código y nombre corto de la tela.
- Si Chromium falla, tarda o la página da error, esa página sale con pdfkit como hoy y se escribe el motivo en el registro. El PDF no se bloquea nunca.
- `TELAS_HTML=0` en el `.env` vuelve a pdfkit; por defecto está activa.
- El PDF generado sigue llevando `CODIGO.toldos.json` y se reabre con `extractReviewPackageFromPdf` (`src/workflow.js`).
- No se toca la paridad de remolques (`src/remolques/paridad-produccion.test.ts`, `src/client/remolques/resultados-paridad.test.tsx`) ni su comportamiento: la hoja de remolques se sigue imprimiendo igual.
- Textos y comentarios en castellano llano; decimales con coma. Finales de línea de cada fichero como estén. Commits en castellano que expliquen el porqué, con `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Antes de cada commit: `pnpm test && pnpm typecheck && pnpm lint`, y `pnpm exec vite build` si se toca el cliente.

## Ficheros

| Fichero | Qué hace |
| --- | --- |
| `src/domain/planteamientoPdf.js` (modificar) | `buildFabricSheetPages`, `FABRIC_SHEET_DIAGRAM_BOX`, `buildFabricDiagramBoxPdf` y la unión con pdf-lib en `buildOrderPlanteamientoPdf`. Se queda en este fichero porque usa sus funciones internas (resúmenes, instrucción, notas): así no hay dos lógicas. |
| `src/domain/planteamientoPdf.fabricSheet.test.js` (crear) | Pruebas de los datos de la página y de la unión. |
| `src/remolques/salida/navegador.ts` (modificar) | `TrabajoPdf.url` opcional: cada trabajo puede decir qué página imprimir. |
| `src/remolques/salida/__tests__/navegador.test.ts` (modificar) | Prueba de `url` por trabajo. |
| `hoja-telas.html` (crear), `vite.config.ts` (modificar) | La página interna y su entrada en el build. |
| `src/client/hojaTelas/tipos.ts` | Tipos de los datos de la página. |
| `src/client/hojaTelas/repartirNotas.ts` (+ `.test.ts`) | Reparte las líneas de observaciones entre la página y las de continuación. |
| `src/client/hojaTelas/HojaTelas.tsx` (+ `.test.tsx`), `hojaTelas.css` | La página. |
| `src/client/hojaTelas/cargarHojaTelas.ts`, `main.tsx` | Carga de datos y aviso a Chromium. |
| `src/config.js`, `src/server.js`, `.env.example`, `.env.production.example` (modificar) | `TELAS_HTML`, ruta de datos, dirección de la página y paso de la impresora a `buildOrderPlanteamientoPdf`. |
| `scripts/test-hoja-telas-e2e.mjs` (crear) | Capturas, comparación y tiempos en la instancia aislada. |

---

### Tarea 1: datos de la página de telas

**Ficheros:**
- Modificar: `src/domain/planteamientoPdf.js`
- Crear: `src/domain/planteamientoPdf.fabricSheet.test.js`

**Interfaces:**
- Produce:
  - `export const FABRIC_SHEET_DIAGRAM_BOX = { x: 36, y: 149, width: 242, height: 300 }` (puntos PDF desde la esquina superior izquierda de la página A4 apaisada; es donde hoy se pinta el dibujo).
  - `export function buildFabricSheetPages({ order, calculation, onlyAwningId = null })` → `FabricSheetPage[]`, una por cada entrada de `buildPlanteamientoPlan(...).fabricPages` cuyo `diagram !== 'HERA'`, en el mismo orden. Cada una:

```js
{
  planIndex: 0,                 // índice en plan.fabricPages (para sustituir la página buena)
  header: { of: '0230194', orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', reviewer: '—', date: '02/10/2026', title: 'PLANTEAMIENTO DE TELAS' },
  diagramTitle: 'CAMBIO DE TELA',
  rotulacion: { tela: 'NO', bamba: '—' },
  datos: { material: 'LONA PVC 580 BLANCO :250 AN', curva: 'SIN BAMBA', remate: '—' },
  rows: [{ letter: 'A', fabricWidth: '337,0', dropLabel: 'SALIDA', fabricDrop: '265,0', units: '1', line: 'BAMBALINA INCLUIDA DE 25CM…' }],
  total: { label: 'NS86BLANP250 · LONA PVC 580 BLANCO :250 AN', amount: '5,3 ML' },
  notes: 'texto con saltos de línea',
  footer: 'Planteamiento de telas'
}
```

- [ ] **Paso 1: escribir las pruebas que fallan**

Crear `src/domain/planteamientoPdf.fabricSheet.test.js`. Reutiliza los ayudantes de pedidos que ya usan las pruebas del PDF: copia de `src/domain/planteamientoPdf.cortina-layout.test.js` la forma de montar el pedido con `normalizeOrder` y `calculateOrder`.

```js
import { describe, expect, test } from 'vitest';
import { buildFabricSheetPages, FABRIC_SHEET_DIAGRAM_BOX } from './planteamientoPdf.js';
import { normalizeOrder } from './validation.js';
import { calculateOrder } from './rules.js';

const pvc = 'NS86BLANP250|||250|||LONA NS86 2L 630 g/m² :BLANCO :250 AN (580)|||PLASTICA (LONA)';
const acr = 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL 300 :NEGRO 2170 :120 AN|||ACRÍLICAS';

function pages(awnings, extra = {}) {
  const order = normalizeOrder({ orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', orderDate: '2026-10-02', fabric: pvc, sameFabric: true, awnings, ...extra });
  return buildFabricSheetPages({ order, calculation: calculateOrder(order) });
}
const cambioTela = (over = {}) => ({ id: 'a', of: '0230194', model: 'CAMBIO TELA', units: 1, width: 337, projection: 225, valanceHeight: 0, rotFabric: 'NO', rotValance: '', ...over });

describe('buildFabricSheetPages', () => {
  test('cabecera como la de estructura: OF arriba, pedido, cliente, técnico, «—» sin revisor y fecha', () => {
    const [page] = pages([cambioTela()]);
    expect(page.header).toEqual({ of: '0230194', orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', reviewer: '—', date: '02/10/2026', title: 'PLANTEAMIENTO DE TELAS' });
  });

  test('«—» en lo que no aplica: bamba de rotulación y remate', () => {
    const [page] = pages([cambioTela()]);
    expect(page.rotulacion).toEqual({ tela: 'NO', bamba: '—' });
    expect(page.datos.remate).toBe('—');
  });

  test('material y total con nombre corto; el total también con el código', () => {
    const [page] = pages([cambioTela()]);
    expect(page.datos.material).toBe('LONA PVC 580 BLANCO :250 AN');
    expect(page.total.label).toBe('NS86BLANP250 · LONA PVC 580 BLANCO :250 AN');
    expect(page.total.amount).toMatch(/^\d+,\d ML$/);
  });

  test('la fila lleva la instrucción, sin repetir el trabajo cuando todos son iguales', () => {
    const [page] = pages([cambioTela(), cambioTela({ id: 'b' })]);
    expect(page.rows.map((row) => row.letter)).toEqual(['A', 'B']);
    expect(page.rows[0].line).not.toMatch(/CAMB\. TELA/);
    expect(page.rows[0]).toMatchObject({ dropLabel: 'SALIDA', units: '1' });
  });

  test('con trabajos distintos en la misma página, el trabajo va delante de la instrucción', () => {
    // Arzúa y Galicia comparten el dibujo GENERAL: misma página, trabajos distintos.
    const toldo = (id, model) => ({ id, of: '0230194', model, units: 1, width: 337, projection: 225, valanceHeight: 30, armCount: 2, tubeLoad: 'TUBO DE CARGA EVO 80', structureColor: 'BLANCO', device: 'MOTOR', sensor: 'SIN SENSOR', machineSide: 'M.F.DER', placement: 'FRONTAL', valanceCurve: 'RECTA', rotFabric: 'NO', rotValance: 'NO' });
    const [page] = pages([toldo('a', 'ARZUA PRO'), toldo('b', 'GALICIA')], { fabric: acr });
    expect(page.rows[0].line).toMatch(/^ARZUA PRO · /);
    expect(page.rows[1].line).toMatch(/^GALICIA · /);
  });

  test('las páginas del HERA no salen (siguen con pdfkit) y el recuadro del dibujo es el de ahora', () => {
    expect(FABRIC_SHEET_DIAGRAM_BOX).toEqual({ x: 36, y: 149, width: 242, height: 300 });
    const hera = { id: 'h', of: '0231000', model: 'HERA', submodel: 'HERA 56 MAQUINA', heraJoin: 'NINGUNO', heraBottomFinish: 'VARILLA BLANCA', heraInteriorFace: 'DERECHO', heraChainColor: 'BLANCO', units: 1, width: 163.5, projection: 165, height: 230 };
    expect(pages([hera])).toEqual([]);
  });
});
```

Si el ARZUA PRO y el GALICIA del caso «trabajos distintos» no caen en la misma página (porque su clave de grupo difiere), cambia el caso por dos modelos que sí la compartan según `fabricDiagramGroupKey`: lo que se prueba es la regla, no el par concreto.

- [ ] **Paso 2: ver que fallan**

Run: `pnpm exec vitest run src/domain/planteamientoPdf.fabricSheet.test.js`
Esperado: FAIL, `buildFabricSheetPages is not a function`.

- [ ] **Paso 3: implementar**

En `src/domain/planteamientoPdf.js`, junto a `drawFabricPage`, añade:

```js
// Recuadro del dibujo de confección en la página de telas A4 apaisada (puntos desde arriba a la
// izquierda). La página HTML lo deja libre y el servidor encaja ahí el dibujo de pdfkit.
export const FABRIC_SHEET_DIAGRAM_BOX = Object.freeze({ x: 36, y: 149, width: 242, height: 300 });

// «—» en lo que no aplica (Iván, 03/10/2026): vacío o el «-» de siempre.
function dash(text) {
  const clean = String(text ?? '').trim();
  return clean && clean !== '-' ? clean : '—';
}

// Datos de cada página de telas A4 para la hoja en HTML (fase 1). Salen de las mismas funciones
// que la página de pdfkit, con los cambios que decidió Iván el 03/10/2026.
export function buildFabricSheetPages({ order: fullOrder, calculation, onlyAwningId = null }) {
  const plan = buildPlanteamientoPlan(fullOrder, calculation, { onlyAwningId });
  const order = onlyAwningId
    ? { ...fullOrder, awnings: fullOrder.awnings.filter((awning) => awning.id === onlyAwningId) }
    : fullOrder;
  const fabricTotals = summarizeFabricPage(plan.fabricPages.flatMap(({ entries }) => entries.map(toFabricLine)));
  const orderOfs = distinctOrderOfs(order);
  const header = {
    of: orderOfs.length === 1 ? orderOfs[0] : orderOfs.length > 1 ? 'VER EN CADA TOLDO' : '—',
    orderCode: dash(order.orderCode),
    customer: dash(order.customer),
    technician: dash(order.technician),
    reviewer: dash(order.reviewer),
    date: dash(formatDate(order.orderDate)),
    title: 'PLANTEAMIENTO DE TELAS'
  };
  return plan.fabricPages.flatMap(({ entries, diagram }, planIndex) => {
    if (diagram === 'HERA') return [];
    const lines = entries.map(toFabricLine);
    const works = new Set(lines.map(({ awning }) => fabricWorkLabel(String(awning.model || '').trim().toUpperCase())));
    const showOfInRows = orderOfs.length > 1;
    const pageCodes = new Set(lines.flatMap(({ calc }) => [calc?.fabricCode, calc?.valanceFabricCode]).filter(Boolean));
    const visible = fabricTotals.filter(({ code }) => pageCodes.has(code));
    const totals = visible.length > 0 ? visible : fabricTotals;
    const totalLabel = totals.map(({ code, description }) => {
      const name = shortFabricName(fabricDescription(code, description));
      return name && name !== code ? `${code} · ${name}` : code;
    }).join(' · ');
    return [{
      planIndex,
      header,
      diagramTitle: fabricDiagramHeading(diagram, lines.map(({ awning }) => awning)),
      rotulacion: {
        tela: dash(summarizeAwningValue(lines, 'rotFabric', order.rotTela)),
        bamba: dash(summarizeAwningValue(lines, 'rotValance', order.rotBamba))
      },
      datos: {
        material: dash(summarizeFabricMaterial(lines)),
        curva: dash(summarizeValanceCurve(lines)),
        remate: dash(summarizeRemate(lines, order))
      },
      rows: lines.map((line) => {
        const detail = buildFabricLineDetail(line.awning, line.calc, order);
        const work = works.size > 1 ? detail.workLabel : '';
        return {
          letter: awningLetter(line.index),
          fabricWidth: dash(detail.fabricWidth),
          dropLabel: isVerticalAwningModel(line.awning.model) ? 'CAÍDA' : 'SALIDA',
          fabricDrop: dash(detail.fabricDrop),
          units: dash(detail.units),
          line: [work, showOfInRows ? `OF ${value(line.awning.of)}` : '', buildFabricRowInstruction(line, lines, order)]
            .filter(Boolean).join(' · ')
        };
      }),
      total: {
        label: totalLabel || 'TELA SIN DEFINIR',
        amount: `${formatFabricMeasure(totals.reduce((sum, { amount }) => sum + (Number(amount) || 0), 0))} ML`
      },
      notes: fabricPageNotes(order, lines),
      footer: 'Planteamiento de telas'
    }];
  });
}
```

Antes de escribirlo, comprueba en el propio fichero:
- que `summarizeFabricPage` devuelve elementos con `code`, `amount` y, si lo tiene, `description` (si no tiene `description`, quítala del destructurado: `fabricDescription(code)` busca el nombre por código);
- que `buildFabricLineDetail` devuelve `fabricWidth`, `fabricDrop`, `units` y `workLabel` ya como texto.

Ajusta los nombres a lo que haya; no cambies esas funciones.

- [ ] **Paso 4: ver que pasan**

Run: `pnpm exec vitest run src/domain/planteamientoPdf.fabricSheet.test.js src/domain/planteamientoPdf.test.js`
Esperado: PASS.

- [ ] **Paso 5: commit**

```bash
git add src/domain/planteamientoPdf.js src/domain/planteamientoPdf.fabricSheet.test.js
git commit -m "feat(pdf): datos de la página de telas para la hoja en HTML"
```

---

### Tarea 2: el dibujo de confección en un PDF de su recuadro

**Ficheros:**
- Modificar: `src/domain/planteamientoPdf.js`
- Modificar: `src/domain/planteamientoPdf.fabricSheet.test.js`

**Interfaces:**
- Consume: `FABRIC_SHEET_DIAGRAM_BOX` (Tarea 1).
- Produce: `export async function buildFabricDiagramBoxPdf({ diagram, awning, calculation })` → `Buffer` con una página de exactamente 242 × 300 pt y el dibujo de `drawFabricDiagram` en (0, 0).

- [ ] **Paso 1: prueba que falla**

```js
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildFabricDiagramBoxPdf } from './planteamientoPdf.js';

describe('buildFabricDiagramBoxPdf', () => {
  test('una página del tamaño del recuadro con el dibujo', async () => {
    const pdf = await buildFabricDiagramBoxPdf({ diagram: 'GENERAL', awning: { model: 'CAMBIO TELA', width: 337, projection: 225 }, calculation: {} });
    const task = getDocument({ data: new Uint8Array(pdf) });
    const doc = await task.promise;
    try {
      expect(doc.numPages).toBe(1);
      const page = await doc.getPage(1);
      expect(page.view).toEqual([0, 0, FABRIC_SHEET_DIAGRAM_BOX.width, FABRIC_SHEET_DIAGRAM_BOX.height]);
      expect((await page.getOperatorList()).fnArray.length).toBeGreaterThan(20);
    } finally { await task.destroy(); }
  });
});
```

- [ ] **Paso 2: ver que falla**

Run: `pnpm exec vitest run src/domain/planteamientoPdf.fabricSheet.test.js -t buildFabricDiagramBoxPdf`
Esperado: FAIL.

- [ ] **Paso 3: implementar**, junto a `buildFabricDiagramPreviewPdf`:

```js
// El dibujo de confección solo, del tamaño exacto de su recuadro: el servidor lo encaja en la
// página de telas impresa desde HTML (fase 1). Mismo código de dibujo que la página de pdfkit.
export async function buildFabricDiagramBoxPdf({ diagram, awning, calculation }) {
  const { width, height } = FABRIC_SHEET_DIAGRAM_BOX;
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ autoFirstPage: false, margin: 0, info: { Title: 'Dibujo de confección', Creator: 'toldos-testar' } });
    registerFonts(doc);
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.addPage({ size: [width, height], margin: 0 });
    drawFabricDiagram(doc, 0, 0, width, height, diagram, awning, calculation);
    doc.end();
  });
}
```

- [ ] **Paso 4: ver que pasa.** Mismo comando. Esperado: PASS.

- [ ] **Paso 5: commit**

```bash
git add src/domain/planteamientoPdf.js src/domain/planteamientoPdf.fabricSheet.test.js
git commit -m "feat(pdf): el dibujo de confección en un PDF del tamaño de su recuadro"
```

---

### Tarea 3: el servicio de Chromium imprime la página que diga cada trabajo

**Ficheros:**
- Modificar: `src/remolques/salida/navegador.ts`
- Modificar: `src/remolques/salida/__tests__/navegador.test.ts`

**Interfaces:**
- Produce: `TrabajoPdf.url?: (id: string) => string`. Si un trabajo la trae, se imprime esa dirección; si no, la `urlHoja` del servicio (como ahora, para remolques).

- [ ] **Paso 1: prueba que falla.** En `navegador.test.ts`, con el navegador falso que ya usan las demás pruebas del fichero (busca cómo se crea `crearServicioPdf` con `lanzar` falso y qué URL recibe `ir`), añade:

```ts
it("un trabajo puede decir qué página imprimir; sin ella, la del servicio", async () => {
  const visitadas: string[] = [];
  // navegadorFalso: el mismo ayudante del fichero, que guarda en `visitadas` cada url de ir().
  const servicio = crearServicioPdf({ urlHoja: (id) => `http://127.0.0.1:1/hoja-remolques.html?id=${id}`, lanzar: async () => navegadorFalso({ visitadas }) });
  await servicio.generar({ preparar: () => "uno", url: (id) => `http://127.0.0.1:1/hoja-telas.html?id=${id}` });
  await servicio.generar("dos");
  expect(visitadas).toEqual(["http://127.0.0.1:1/hoja-telas.html?id=uno", "http://127.0.0.1:1/hoja-remolques.html?id=dos"]);
  await servicio.cerrar();
});
```

Si el fichero no tiene un ayudante que guarde las direcciones visitadas, añádelo a partir del navegador falso que ya exista, sin cambiar las demás pruebas.

- [ ] **Paso 2: ver que falla.** Run: `pnpm exec vitest run src/remolques/salida/__tests__/navegador.test.ts`. Esperado: FAIL (se visita la hoja de remolques en los dos).

- [ ] **Paso 3: implementar.** En `navegador.ts`:

```ts
export interface TrabajoPdf {
  /** Se llama cuando el trabajo sale de la cola: guarda los datos de la hoja y devuelve su identificador. */
  preparar(): string;
  /** Falso si quien pidió el PDF ya no espera (cerró la conexión): entonces el trabajo se salta. */
  sigueEsperando?(): boolean;
  /** Qué página imprimir; sin ella, la `urlHoja` del servicio (la hoja de remolques). */
  url?(id: string): string;
}
```

y en `hacer`: `const url = (trabajo.url ?? urlHoja)(trabajo.preparar());`.

- [ ] **Paso 4: ver que pasa.** Run: `pnpm exec vitest run src/remolques` (incluye la paridad, que no cambia). Esperado: PASS.

- [ ] **Paso 5: commit**

```bash
git add src/remolques/salida/navegador.ts src/remolques/salida/__tests__/navegador.test.ts
git commit -m "feat(pdf): el servicio de Chromium imprime la página que diga cada trabajo"
```

---

### Tarea 4: juntar páginas de pdfkit y de HTML en un PDF, con respaldo

**Ficheros:**
- Modificar: `src/domain/planteamientoPdf.js`
- Modificar: `src/domain/planteamientoPdf.fabricSheet.test.js`

**Interfaces:**
- Consume: `buildFabricSheetPages`, `buildFabricDiagramBoxPdf`, `FABRIC_SHEET_DIAGRAM_BOX`.
- Produce: `buildOrderPlanteamientoPdf({ order, calculation, review = null, onlyAwningId = null, renderFabricSheet = null, onFabricSheetError = null })`.
  - `renderFabricSheet(page: FabricSheetPage) → Promise<Buffer>`: PDF de la hoja de esa página, con su primera página A4 apaisada y, si hace falta, páginas de continuación.
  - `onFabricSheetError(error, page)`: se llama si `renderFabricSheet` falla; esa página sale con pdfkit.
  - Sin `renderFabricSheet`, todo igual que hoy (mismo PDF de pdfkit con `doc.file`).

- [ ] **Paso 1: pruebas que fallan**

```js
import pdfLib from 'pdf-lib';
import { buildOrderPlanteamientoPdf } from './planteamientoPdf.js';
import { extractReviewPackageFromPdf } from '../workflow.js';

const { PDFDocument } = pdfLib;
async function fakeSheet(pages = 1) {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) doc.addPage([841.89, 595.28]).drawText(`HOJA HTML ${i + 1}`, { x: 400, y: 300, size: 10 });
  return Buffer.from(await doc.save());
}
async function pageTexts(pdf) {
  const task = getDocument({ data: new Uint8Array(pdf) });
  const doc = await task.promise;
  try {
    const texts = [];
    for (let n = 1; n <= doc.numPages; n += 1) texts.push((await (await doc.getPage(n)).getTextContent()).items.map((item) => item.str).join(' '));
    return texts;
  } finally { await task.destroy(); }
}

describe('buildOrderPlanteamientoPdf con la hoja de telas en HTML', () => {
  // Un Arzúa (estructura + telas) y un Cambio de tela: páginas estructura, telas.
  const order = normalizeOrder({ orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', fabric: acr, sameFabric: true, awnings: [cambioTela({ id: 'a' })] });
  const calculation = calculateOrder(order);

  test('la página de telas se sustituye por la impresa, con el dibujo encajado', async () => {
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, renderFabricSheet: () => fakeSheet() });
    const texts = await pageTexts(pdf);
    expect(texts.at(-1)).toContain('HOJA HTML 1');
    // El dibujo de pdfkit va dentro de la misma página (su texto «FRENTE TELA» u otro rótulo del dibujo).
    expect(texts.at(-1)).toMatch(/FRENTE TELA|BASTILLA|VARILLA/);
  });

  test('las páginas de continuación de la hoja se conservan en su sitio', async () => {
    const texts = await pageTexts(await buildOrderPlanteamientoPdf({ order, calculation, renderFabricSheet: () => fakeSheet(2) }));
    expect(texts.slice(-2).map((t) => t.match(/HOJA HTML \d/)?.[0])).toEqual(['HOJA HTML 1', 'HOJA HTML 2']);
  });

  test('si la hoja falla, sale la página de pdfkit y se avisa', async () => {
    const errores = [];
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, renderFabricSheet: async () => { throw new Error('Chromium caído'); }, onFabricSheetError: (error) => errores.push(error.message) });
    expect((await pageTexts(pdf)).at(-1)).toContain('PLANTEAMIENTO DE TELAS');
    expect(errores).toEqual(['Chromium caído']);
  });

  test('con revisión, el PDF unido lleva los datos y se reabre', async () => {
    const review = { orderCode: 'AR2603332', order, status: 'PENDING_REVIEW' };
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, review, renderFabricSheet: () => fakeSheet() });
    const pkg = await extractReviewPackageFromPdf(pdf);
    expect(pkg?.orderCode ?? pkg?.review?.orderCode).toBe('AR2603332');
  });
});
```

Revisa qué devuelve `extractReviewPackageFromPdf` (`src/workflow.js`, línea ~408) y ajusta la última comprobación a su forma real.

- [ ] **Paso 2: ver que fallan.** Run: `pnpm exec vitest run src/domain/planteamientoPdf.fabricSheet.test.js -t "hoja de telas en HTML"`. Esperado: FAIL.

- [ ] **Paso 3: implementar** en `src/domain/planteamientoPdf.js`:

1. Importa pdf-lib como en `src/remolques/flujo/adjunto.ts`: `import pdfLib from 'pdf-lib';` y `const { PDFDocument } = pdfLib;`.
2. Renombra el cuerpo actual de `buildOrderPlanteamientoPdf` a `function buildPdfkitPlanteamiento({ order, calculation, review, onlyAwningId, attachReview })`. Dentro:
   - lleva un contador `pageCount` que sube en cada `doc.addPage(...)`;
   - guarda en `fabricRanges[planIndex] = { start, end }` las páginas (de 0 en adelante) que ocupa cada página de telas A4 con sus continuaciones (no las del HERA);
   - solo hace `doc.file(...)` si `attachReview` es verdadero;
   - resuelve `{ pdf: Buffer, fabricRanges }`.
3. Nuevo `buildOrderPlanteamientoPdf`:

```js
export async function buildOrderPlanteamientoPdf({ order, calculation, review = null, onlyAwningId = null, renderFabricSheet = null, onFabricSheetError = null }) {
  if (!renderFabricSheet) {
    return (await buildPdfkitPlanteamiento({ order, calculation, review, onlyAwningId, attachReview: true })).pdf;
  }
  const { pdf: base, fabricRanges } = await buildPdfkitPlanteamiento({ order, calculation, review, onlyAwningId, attachReview: false });
  const plan = buildPlanteamientoPlan(order, calculation, { onlyAwningId });
  // Una a una (Chromium imprime de una en una): la que falle se queda con pdfkit.
  const sheets = new Map();
  for (const page of buildFabricSheetPages({ order, calculation, onlyAwningId })) {
    try {
      const { diagram, diagramAwning, diagramCalculation } = plan.fabricPages[page.planIndex];
      const [html, drawing] = await Promise.all([
        renderFabricSheet(page),
        buildFabricDiagramBoxPdf({ diagram, awning: diagramAwning, calculation: diagramCalculation })
      ]);
      sheets.set(page.planIndex, { html, drawing });
    } catch (error) {
      onFabricSheetError?.(error, page);
    }
  }
  const out = await PDFDocument.create();
  out.setTitle(`${order.orderCode || 'Pedido'}-1`);
  out.setSubject('Planteamiento de estructuras y telas');
  out.setCreator('toldos-testar');
  const source = await PDFDocument.load(base);
  const replaced = new Map([...sheets.keys()].map((planIndex) => [fabricRanges[planIndex].start, planIndex]));
  for (let index = 0; index < source.getPageCount(); index += 1) {
    if (replaced.has(index)) {
      const planIndex = replaced.get(index);
      const { html, drawing } = sheets.get(planIndex);
      const sheet = await PDFDocument.load(html);
      const pages = await out.copyPages(sheet, sheet.getPageIndices());
      pages.forEach((p) => out.addPage(p));
      const [embedded] = await out.embedPdf(drawing);
      const first = pages[0];
      const box = FABRIC_SHEET_DIAGRAM_BOX;
      first.drawPage(embedded, { x: box.x, y: first.getHeight() - box.y - box.height, width: box.width, height: box.height });
      index = fabricRanges[planIndex].end - 1;
      continue;
    }
    const [page] = await out.copyPages(source, [index]);
    out.addPage(page);
  }
  if (review) {
    const code = String(review.orderCode || order.orderCode || 'PEDIDO').replace(/[^A-Z0-9_-]+/gi, '') || 'PEDIDO';
    await out.attach(Buffer.from(`${JSON.stringify(review, null, 2)}\n`, 'utf8'), `${code}.toldos.json`, {
      mimeType: 'application/json',
      description: 'Datos editables del pedido para toldos-testar'
    });
  }
  return Buffer.from(await out.save());
}
```

`fabricRanges[planIndex].end` es exclusivo (la primera página que ya no es de esa hoja de telas).

- [ ] **Paso 4: ver que pasan.** Run: `pnpm exec vitest run src/domain`. Esperado: PASS, también las pruebas que ya había del PDF (sin `renderFabricSheet` todo sale igual).

- [ ] **Paso 5: commit**

```bash
git add src/domain/planteamientoPdf.js src/domain/planteamientoPdf.fabricSheet.test.js
git commit -m "feat(pdf): juntar la hoja de telas impresa con las páginas de pdfkit, con respaldo"
```

---

### Tarea 5: la página web de la hoja de telas

**Ficheros:**
- Crear: `hoja-telas.html`, `src/client/hojaTelas/tipos.ts`, `repartirNotas.ts`, `repartirNotas.test.ts`, `HojaTelas.tsx`, `HojaTelas.test.tsx`, `hojaTelas.css`, `cargarHojaTelas.ts`, `main.tsx`
- Modificar: `vite.config.ts` (entrada `telas`)

**Interfaces:**
- Consume: la forma de `FabricSheetPage` (Tarea 1); la ruta `GET /api/hoja-telas/:id` (Tarea 6) que devuelve una `FabricSheetPage`.
- Produce: `hoja-telas.html?id=…` que pinta la hoja y pone `window.hojaLista = true` o `window.hojaError`.

- [ ] **Paso 1: tipos.** `src/client/hojaTelas/tipos.ts`:

```ts
export interface FilaHojaTelas { letter: string; fabricWidth: string; dropLabel: 'SALIDA' | 'CAÍDA'; fabricDrop: string; units: string; line: string }
export interface HojaTelasDatos {
  planIndex: number;
  header: { of: string; orderCode: string; customer: string; technician: string; reviewer: string; date: string; title: string };
  diagramTitle: string;
  rotulacion: { tela: string; bamba: string };
  datos: { material: string; curva: string; remate: string };
  rows: FilaHojaTelas[];
  total: { label: string; amount: string };
  notes: string;
  footer: string;
}
```

- [ ] **Paso 2: reparto de observaciones, con pruebas.** `repartirNotas.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { repartirNotas } from './repartirNotas';

describe('repartirNotas', () => {
  it('todo en la primera si cabe', () => {
    expect(repartirNotas([10, 10, 10], 40, 100)).toEqual([[0, 1, 2]]);
  });
  it('lo que no cabe pasa a continuación, y a otra si hace falta', () => {
    expect(repartirNotas([30, 30, 30, 30, 30], 70, 70)).toEqual([[0, 1], [2, 3], [4]]);
  });
  it('una línea más alta que la caja va sola en su página', () => {
    expect(repartirNotas([10, 200, 10], 50, 100)).toEqual([[0], [1], [2]]);
  });
  it('sin líneas, nada', () => {
    expect(repartirNotas([], 50, 100)).toEqual([]);
  });
});
```

`repartirNotas.ts`:

```ts
/** Reparte líneas (por su alto) entre la caja de la primera página y las de continuación.
 *  Devuelve los índices de cada página. Una línea que no cabe en ninguna caja va sola. */
export function repartirNotas(altos: number[], primera: number, siguiente: number): number[][] {
  const paginas: number[][] = [];
  let actual: number[] = [];
  let libre = primera;
  altos.forEach((alto, indice) => {
    if (actual.length > 0 && alto > libre) {
      paginas.push(actual);
      actual = [];
      libre = siguiente;
    }
    actual.push(indice);
    libre -= alto;
  });
  if (actual.length > 0) paginas.push(actual);
  return paginas;
}
```

Run: `pnpm exec vitest run src/client/hojaTelas/repartirNotas.test.ts`. Primero FAIL (sin fichero) y luego PASS.

- [ ] **Paso 3: la página.** `HojaTelas.tsx` pinta, por cada página de la hoja (la primera y las de continuación de observaciones), un `<section className="telas-pagina">` de 297 × 210 mm. Medidas en `pt` para que coincidan 1:1 con el PDF (A4 = 841,89 × 595,28 pt):
  - **Cabecera** (18–106 pt de alto, como ahora), con la estructura de la de estructura: logo a la izquierda (`/tgm-logo.png` u otro logo que use hoy el cliente; búscalo en `public/`). Fila 1: «OF:» y el OF en amarillo, «Nº PEDIDO:» y el pedido en amarillo. Debajo, CLIENTE, TÉCNICO y REVISOR, y FECHA. Abajo, la barra oscura con el título.
  - **Recuadro exterior** desde 114 pt hasta 32 pt del pie.
  - **Columna izquierda:** título del dibujo (`diagramTitle`, 123 pt, 242 × 21 pt). **Recuadro del dibujo vacío** en exactamente `left: 36pt; top: 149pt; width: 242pt; height: 300pt`, sin borde ni fondo: ahí encaja el servidor el dibujo. OBSERVACIONES desde 456 pt hasta 10 pt sobre el pie del recuadro exterior (solo si hay notas).
  - **Columna derecha** desde x = 294 pt: ROTULACIÓN (170 pt de ancho) y DATOS BÁSICOS (el resto), como ahora; MATERIAL en una línea con `.hoja-una-linea` y `data-letra-minima="7"`.
  - **Filas:** letra en amarillo; TELA, SALIDA o CAÍDA y UN.; la segunda línea (`row.line`) a todo el ancho de la derecha de la letra, en `.hoja-una-linea` con `data-letra-minima="7"`. El alto de fila crece con pocas filas: `min(90pt, max(62pt, (espacio entre 214 pt y el total) / filas − 9pt))`.
  - **Total** abajo como ahora: a la izquierda `total.label` (una línea, ajustable) y «PAÑO TOTAL NECESARIO»; a la derecha `total.amount` en grande sobre gris.
  - **Pie:** `footer` abajo a la derecha, y en las continuaciones «Planteamiento de telas · Observaciones (continuación)».
  - **Colores:** los de la hoja actual (`#10282d` tinta, `#f7bd19` amarillo, `#dce4e2` gris, `#9aaba8` líneas). Fuente Geist, como la hoja de remolques.
  - **Al montar:** espera a `document.fonts.ready`, llama a `ajustarUnaLinea` (`src/client/hoja/ajusteTexto.ts`), mide el alto de cada línea de observaciones, reparte con `repartirNotas` (caja de la primera = alto del recuadro de observaciones; continuación = página entera menos cabecera y pie) y, ya pintado, llama a `onLista()`.

Pruebas `HojaTelas.test.tsx` (render estático con `renderToStaticMarkup`, con unos datos de ejemplo):

```tsx
it('cabecera con OF y pedido arriba, «—» y el recuadro del dibujo vacío en su sitio', () => {
  const html = renderToStaticMarkup(<HojaTelas datos={ejemplo} onLista={() => {}} onError={() => {}} />);
  expect(html).toMatch(/OF:.*0230194.*Nº PEDIDO:.*AR2603332/s);
  expect(html).toContain('telas-dibujo');
  expect(html).toMatch(/left:\s*36pt.*top:\s*149pt.*width:\s*242pt.*height:\s*300pt/s);
  expect(html).toContain('NS86BLANP250 · LONA PVC 580 BLANCO :250 AN');
  expect(html).toContain('PAÑO TOTAL NECESARIO');
});
it('la segunda línea de cada fila es la instrucción', () => {
  const html = renderToStaticMarkup(<HojaTelas datos={{ ...ejemplo, rows: [{ ...ejemplo.rows[0], line: 'BAMBALINA INCLUIDA DE 25CM' }] }} onLista={() => {}} onError={() => {}} />);
  expect(html).toContain('BAMBALINA INCLUIDA DE 25CM');
  expect(html).not.toContain('CAMB. TELA');
});
```

- [ ] **Paso 4: carga y arranque.** `cargarHojaTelas.ts`, igual que `src/client/hoja/cargarHoja.ts` pero con `/api/hoja-telas/${id}` y el tipo `HojaTelasDatos`. `main.tsx`, igual que `src/client/hoja/main.tsx` (mismos avisos `window.hojaLista` y `window.hojaError`; reutiliza el `ventana-hoja.d.ts` de `src/client/hoja/`), sin la muestra de desarrollo ni el capturador 3D. `hoja-telas.html`, copia de `hoja-remolques.html` con su título y `src="/src/client/hojaTelas/main.tsx"`. En `vite.config.ts`, añade la entrada `telas: fileURLToPath(new URL('./hoja-telas.html', import.meta.url))` junto a `hoja`.

- [ ] **Paso 5: comprobar.** Run: `pnpm exec vitest run src/client/hojaTelas && pnpm typecheck && pnpm lint && pnpm exec vite build`. Esperado: todo pasa y `dist/hoja-telas.html` existe.

- [ ] **Paso 6: commit**

```bash
git add hoja-telas.html vite.config.ts src/client/hojaTelas
git commit -m "feat(pdf): página web de la hoja de telas"
```

---

### Tarea 6: el servidor imprime la hoja de telas

**Ficheros:**
- Modificar: `src/config.js`, `src/server.js`, `.env.example`, `.env.production.example`

**Interfaces:**
- Consume: `buildOrderPlanteamientoPdf({ …, renderFabricSheet, onFabricSheetError })` (Tarea 4), `TrabajoPdf.url` (Tarea 3), `hoja-telas.html` (Tarea 5).
- Produce: `GET /api/hoja-telas/:id` (un solo uso, 404 si ya no está) y la hoja de telas en HTML en las tres llamadas a `buildOrderPlanteamientoPdf` de `src/server.js` (vista previa y panel, generar archivos y reserva).

- [ ] **Paso 1: configuración.** En `src/config.js`: `telasHtml: process.env.TELAS_HTML !== '0',`. En los dos `.env.*.example`:

```
# Página de telas del planteamiento en HTML, impresa con el Chromium de la hoja de remolques.
# 0 vuelve a la página de pdfkit sin desplegar (reiniciando con PM2). Por defecto, activa.
TELAS_HTML=1
```

- [ ] **Paso 2: almacén, ruta y dirección.** En `src/server.js`, junto a `fichasHojaRemolques`:

```js
// Hoja de telas de toldos en HTML (fase 1): mismos datos de un solo uso y el mismo Chromium.
const fichasHojaTelas = crearAlmacenFichas({ duracionMs: 60_000 });
```

Junto a `GET /api/remolques/hoja/:id`:

```js
app.get('/api/hoja-telas/:id', (req, res) => {
  const datos = fichasHojaTelas.tomar(req.params.id);
  if (!datos) {
    res.status(404).json({ error: 'Los datos de esta hoja de telas ya no están disponibles: vuelve a pedir el PDF.' });
    return;
  }
  res.set('Cache-Control', 'no-store').json(datos);
});
```

Junto a `urlHojaRemolques`, saca la parte común a `urlPaginaInterna(pagina, id)` y define `urlHojaTelas = (id) => urlPaginaInterna('hoja-telas.html', id)`; `urlHojaRemolques` pasa a usarla también.

- [ ] **Paso 3: impresora y uso.** Junto a `hojaRemolquesPdf`:

```js
/** Opciones para buildOrderPlanteamientoPdf: la página de telas en HTML, o nada si está apagada. */
function opcionesHojaTelas() {
  if (!config.telasHtml) return {};
  return {
    renderFabricSheet: async (datos) => {
      const id = fichasHojaTelas.guardar(datos);
      try {
        return await servicioPdfRemolques.generar({ preparar: () => id, url: urlHojaTelas });
      } finally {
        fichasHojaTelas.borrar(id);
      }
    },
    onFabricSheetError: (error) => console.error(`Hoja de telas en HTML: sale la de pdfkit. ${error?.message || error}`)
  };
}
```

En las tres llamadas (`/api/planteamiento`, generar archivos y reserva; búscalas con `git grep -n buildOrderPlanteamientoPdf src/server.js`), añade `...opcionesHojaTelas()` a los argumentos.

- [ ] **Paso 4: comprobar.** Run: `pnpm test && pnpm typecheck && pnpm lint && pnpm exec vite build`. Esperado: PASS.

- [ ] **Paso 5: commit**

```bash
git add src/config.js src/server.js .env.example .env.production.example
git commit -m "feat(pdf): el servidor imprime la hoja de telas en HTML, con TELAS_HTML para apagarla"
```

---

### Tarea 7: comprobación en la instancia aislada, capturas y tiempos

**Ficheros:**
- Crear: `scripts/test-hoja-telas-e2e.mjs`

- [ ] **Paso 1: guion.** Toma como base `tmp/pdf-telas.mjs` y `scripts/test-cortina-pdf-layout-e2e.mjs`. Contra la instancia aislada (`BASE_URL` de `drive.mjs`; comprueba `/api/health` con `simulationMode: true` y `fileWritesEnabled: false`), para estos casos:
  - Cortina con ventana, velcro y ET;
  - Arzúa Pro (caso AR2603332);
  - Cambio de tela con NS86;
  - Bambalina;
  - Antica;
  - dos Cambios de tela con telas distintas;
  - un pedido con observaciones largas (35 líneas).

  Para cada caso:
  1. Pide `POST /api/planteamiento` y mide el tiempo.
  2. Comprueba con pdfjs que la última página contiene «PLANTEAMIENTO DE TELAS», el pedido, «PAÑO TOTAL NECESARIO» y algún rótulo del dibujo.
  3. Abre la vista previa de Nuevo pedido y captura la página de telas a 1600 × 1000 en `tmp/ui-audit/pdf-telas-html/<caso>.png`.

  Imprime los tiempos.

- [ ] **Paso 2: comparar con la de ahora.**
  1. Arranca otra instancia aislada en otro puerto con `TELAS_HTML=0`.
  2. Repite las capturas en `tmp/ui-audit/pdf-telas-html/antes-<caso>.png`.
  3. Míralas una a una.

  Todo debe estar igual salvo los seis cambios decididos. Anota cualquier otra diferencia o mejora para comentarla con Iván.

- [ ] **Paso 3: tiempos.** Si la mediana pasa de 2 s, para y avisa (ver «Velocidad» en la especificación).

- [ ] **Paso 4: respaldo.**
  1. Para el Chromium a mitad de prueba: mata su proceso, o arranca con `PLAYWRIGHT_BROWSERS_PATH` apuntando a una carpeta vacía.
  2. Comprueba que el PDF sigue saliendo, con la página de pdfkit, y que el registro dice «Hoja de telas en HTML: sale la de pdfkit».

- [ ] **Paso 5: commit**

```bash
git add scripts/test-hoja-telas-e2e.mjs
git commit -m "test(pdf): comprobación de la hoja de telas en HTML en la instancia aislada"
```
