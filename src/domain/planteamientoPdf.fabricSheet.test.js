import { describe, expect, test } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildFabricSheetPages, buildFabricDiagramBoxPdf, buildOrderPlanteamientoPdf, buildPlanteamientoPlan, FABRIC_SHEET_DIAGRAM_BOX } from './planteamientoPdf.js';
import { normalizeOrder } from './validation.js';
import { calculateOrder } from './rules.js';
import { extractReviewPackageFromPdf } from '../workflow.js';
import { fakeSheets, heraAwning, pageTexts, pageSizes } from './pdfTestHelpers.js';

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

  describe('el OF de arriba se decide en cada hoja', () => {
    const bambalina = (over = {}) => ({ id: 'z', of: '0230999', model: 'BAMBALINA', units: 1, width: 300, projection: 0, valanceHeight: 30, valanceCurve: 'RECTA', rotValance: 'NO', ...over });

    test('si los toldos de la hoja comparten OF, sale arriba aunque el pedido tenga más OF', () => {
      const sheets = pages([cambioTela(), cambioTela({ id: 'b' }), bambalina()]);
      expect(sheets).toHaveLength(2);
      expect(sheets.map(({ header }) => header.of)).toEqual(['0230194', '0230999']);
      expect(sheets.flatMap(({ rows }) => rows.map(({ line }) => line)).join(' ')).not.toMatch(/OF /);
    });

    test('con OF distintos en la misma hoja, «VER EN CADA TOLDO» y el OF en cada fila', () => {
      const [page] = pages([cambioTela(), cambioTela({ id: 'b', of: '0230195' })]);
      expect(page.header.of).toBe('VER EN CADA TOLDO');
      expect(page.rows.map(({ line }) => line.split(' · ')[0])).toEqual(['OF 0230194', 'OF 0230195']);
    });
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

  test('con varias telas el total lleva solo los códigos: los nombres ya salen en las filas', () => {
    const [page] = pages([cambioTela({ fabric: acr }), cambioTela({ id: 'b', of: '0230195', fabric: pvc })], { sameFabric: false, fabric: acr });
    expect(page.total.label).toBe('ACRILI2170P120 · NS86BLANP250');
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

  test('las páginas del HERA salen como las demás y el recuadro del dibujo es el de ahora', () => {
    expect(FABRIC_SHEET_DIAGRAM_BOX).toEqual({ x: 36, y: 149, width: 242, height: 300 });
    const hera = { id: 'h', of: '0231000', model: 'HERA', submodel: 'HERA 56 MAQUINA', heraJoin: 'NINGUNO', heraBottomFinish: 'VARILLA BLANCA', heraInteriorFace: 'DERECHO', heraChainColor: 'BLANCO', units: 1, width: 163.5, projection: 165, height: 230 };
    const [page, ...rest] = pages([hera]);
    expect(rest).toEqual([]);
    expect(page).toMatchObject({ kind: 'telas', planIndex: 0, diagramTitle: 'HERA 56' });
    expect(page.rows.map(({ letter, dropLabel }) => [letter, dropLabel])).toEqual([['A', 'CAÍDA']]);
  });
});

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
      const text = (await page.getTextContent()).items.map((item) => item.str).join(' ');
      expect(text).toMatch(/FRENTE|BASTILLA|VARILLA/);
    } finally { await task.destroy(); }
  });
});

describe('buildOrderPlanteamientoPdf con la hoja de telas en HTML', () => {
  const order = normalizeOrder({ orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', fabric: acr, sameFabric: true, awnings: [cambioTela({ id: 'a' })] });
  const calculation = calculateOrder(order);

  test('la página de telas se sustituye por la impresa, con el dibujo encajado', async () => {
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, htmlStructure: false, renderSheets: fakeSheets() });
    const texts = await pageTexts(pdf);
    expect(texts.at(-1)).toContain('HOJA HTML 1');
    expect(texts.at(-1)).not.toContain('PLANTEAMIENTO DE TELAS');
    // El dibujo de pdfkit va dentro de la misma página.
    expect(texts.at(-1)).toMatch(/FRENTE|BASTILLA|VARILLA/);
  });

  test('las páginas de continuación de la hoja se conservan en su sitio', async () => {
    const texts = await pageTexts(await buildOrderPlanteamientoPdf({ order, calculation, htmlStructure: false, renderSheets: fakeSheets([2]) }));
    expect(texts.slice(-2).map((t) => t.match(/HOJA HTML \d/)?.[0])).toEqual(['HOJA HTML 1', 'HOJA HTML 2']);
  });

  test('si la hoja falla, sale la página de pdfkit y se avisa', async () => {
    const errores = [];
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, htmlStructure: false, renderSheets: async () => { throw new Error('Chromium caído'); }, onSheetError: (error) => errores.push(error.message) });
    expect((await pageTexts(pdf)).at(-1)).toContain('PLANTEAMIENTO DE TELAS');
    expect(errores).toEqual(['Chromium caído']);
  });

  test('con revisión, el PDF unido lleva los datos y se reabre', async () => {
    const review = { kind: 'toldos-testar-review', orderCode: 'AR2603332', order, status: 'PENDING_REVIEW' };
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, review, htmlStructure: false, renderSheets: fakeSheets() });
    // Devuelve la revisión tal cual se guardó (JSON ida y vuelta).
    await expect(extractReviewPackageFromPdf(pdf)).resolves.toEqual(JSON.parse(JSON.stringify(review)));
  });

  test('con un HERA delante, se sustituyen las dos hojas de telas, la del HERA también', async () => {
    const mixed = normalizeOrder({ orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', fabric: acr, sameFabric: true, awnings: [heraAwning, cambioTela({ id: 'a' })] });
    const mixedCalculation = calculateOrder(mixed);
    const plan = buildPlanteamientoPlan(mixed, mixedCalculation);
    expect(plan.fabricPages.map(({ diagram }) => diagram === 'HERA')).toEqual([true, false]);
    const sheets = buildFabricSheetPages({ order: mixed, calculation: mixedCalculation });
    expect(sheets.map(({ planIndex }) => planIndex)).toEqual([0, 1]);

    const pdfkit = await buildOrderPlanteamientoPdf({ order: mixed, calculation: mixedCalculation });
    const merged = await buildOrderPlanteamientoPdf({ order: mixed, calculation: mixedCalculation, htmlStructure: false, renderSheets: fakeSheets() });
    const [before, after] = [await pageTexts(pdfkit), await pageTexts(merged)];
    expect(after).toHaveLength(before.length);
    expect(await pageSizes(merged)).toEqual(['A5', 'A4', 'A4']);
    expect(await pageSizes(merged)).toEqual(await pageSizes(pdfkit));
    // La página de estructura del HERA sigue igual (aquí solo se imprimen las de telas).
    expect(after[0]).toBe(before[0]);
    expect(after[0]).toContain('DESPIECE');
    expect(after.slice(1).map((text) => text.match(/HOJA HTML \d PLAN \d/)?.[0])).toEqual(['HOJA HTML 1 PLAN 0', 'HOJA HTML 1 PLAN 1']);
    // En la del HERA va encajado su dibujo de orientación.
    expect(after[1]).toContain('DERECHO DENTRO');
  });

  test('las páginas de continuación de observaciones de pdfkit no se cuelan junto a la hoja impresa', async () => {
    const notes = Array.from({ length: 35 }, (_, i) => `OBSERVACIÓN LARGA NÚMERO ${i + 1} DEL PEDIDO`).join('\n');
    const long = normalizeOrder({ orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', fabric: acr, sameFabric: true, notes, awnings: [cambioTela({ id: 'a' })] });
    const longCalculation = calculateOrder(long);
    const before = await pageTexts(await buildOrderPlanteamientoPdf({ order: long, calculation: longCalculation }));
    const continuations = before.filter((text) => text.includes('Planteamiento de telas · Observaciones (continuación)')).length;
    expect(continuations).toBeGreaterThan(0);

    const after = await pageTexts(await buildOrderPlanteamientoPdf({ order: long, calculation: longCalculation, htmlStructure: false, renderSheets: fakeSheets() }));
    expect(after).toHaveLength(before.length - continuations);
    expect(after.filter((text) => text.includes('HOJA HTML 1'))).toHaveLength(1);
    expect(after.at(-1)).toContain('HOJA HTML 1');
    expect(after.some((text) => text.includes('Observaciones (continuación)') && !text.includes('Toldo'))).toBe(false);
  });

  describe('con varias hojas de telas', () => {
    const two = normalizeOrder({ orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', fabric: acr, sameFabric: true, awnings: ['a', 'b', 'c', 'd', 'e'].map((id) => cambioTela({ id })) });
    const twoCalculation = calculateOrder(two);

    test('se imprimen todas de una vez y cada una va en su sitio con sus páginas', async () => {
      const sheets = buildFabricSheetPages({ order: two, calculation: twoCalculation });
      expect(sheets).toHaveLength(2);
      const llamadas = [];
      const render = fakeSheets([2, 1]);
      const pdf = await buildOrderPlanteamientoPdf({
        order: two,
        calculation: twoCalculation,
        htmlStructure: false, renderSheets: (pages) => { llamadas.push(pages.map(({ planIndex }) => planIndex)); return render(pages); }
      });
      expect(llamadas).toEqual([sheets.map(({ planIndex }) => planIndex)]);
      const [first, second] = sheets.map(({ planIndex }) => planIndex);
      expect((await pageTexts(pdf)).slice(-3).map((t) => t.match(/HOJA HTML \d PLAN \d+/)?.[0])).toEqual([
        `HOJA HTML 1 PLAN ${first}`, `HOJA HTML 2 PLAN ${first}`, `HOJA HTML 1 PLAN ${second}`
      ]);
    });

    test('si las páginas que dice Chromium no cuadran con el PDF, todo sale con pdfkit y se avisa', async () => {
      const errores = [];
      const pdf = await buildOrderPlanteamientoPdf({
        order: two,
        calculation: twoCalculation,
        htmlStructure: false, renderSheets: async (pages) => ({ ...(await fakeSheets()(pages)), pageCounts: [1, 2] }),
        onSheetError: (error) => errores.push(error.message)
      });
      const texts = await pageTexts(pdf);
      expect(texts.some((t) => t.includes('HOJA HTML'))).toBe(false);
      expect(texts.at(-1)).toContain('PLANTEAMIENTO DE TELAS');
      expect(errores).toHaveLength(1);
      expect(errores[0]).toMatch(/páginas/);
    });
  });

  test('si el aviso de error también falla, el PDF sale igual con pdfkit', async () => {
    const pdf = await buildOrderPlanteamientoPdf({
      order,
      calculation,
      htmlStructure: false, renderSheets: async () => { throw new Error('Chromium caído'); },
      onSheetError: () => { throw new Error('el aviso falla'); }
    });
    expect((await pageTexts(pdf)).at(-1)).toContain('PLANTEAMIENTO DE TELAS');
  });
});
