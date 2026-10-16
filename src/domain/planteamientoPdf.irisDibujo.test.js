import { describe, expect, test } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildOrderPlanteamientoPdf, buildStructureSheetPages } from './planteamientoPdf.js';
import { normalizeOrder } from './validation.js';
import { calculateOrder } from './rules.js';
import { fakeSheets, pageTexts } from './pdfTestHelpers.js';

// Iván, 08/10/2026: el dibujo del escuadrado de la tarjeta es el del planteamiento, para que el
// taller vea cómo queda el toldo en el hueco sin dibujarlo en CAD.
async function pdfText(awning, options = {}) {
  const order = normalizeOrder({
    orderCode: 'AR2609999', customer: 'PRUEBA', technician: 'IVÁN', sameFabric: true, structureColor: 'BLANCO',
    fabric: 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA|||ACR', awnings: [awning]
  });
  const calculation = calculateOrder(order);
  const buffer = await buildOrderPlanteamientoPdf({ order, calculation, htmlStructure: false, htmlFabric: false, ...options });
  const loading = getDocument({ data: new Uint8Array(buffer) });
  const document = await loading.promise;
  const texts = [];
  let structureItems = [];
  for (let n = 1; n <= document.numPages; n += 1) {
    const page = await document.getPage(n);
    const { items } = await page.getTextContent();
    if (n === 1) structureItems = items;
    texts.push(items.map((item) => item.str).join(' '));
  }
  await loading.destroy();
  return { text: texts.join(' '), pages: texts, structureItems, calculation: calculation.ofs[0].calculation };
}

const base = {
  id: 'a', of: '0239999', model: 'IRIS', units: 1, submodel: 'IRIS 130 CON COFRE', irisGuideType: 'ESTÁNDAR',
  irisGuideFixing: 'PARED', irisBoxShape: 'REDONDO', device: 'MOTOR', machineSide: 'M.F.DER', placement: 'FRONTAL',
  structureColor: 'BLANCO', curtainHasWindow: false, rotFabric: 'NO'
};

describe('dibujo del escuadrado del Iris en el planteamiento', () => {
  test('el escuadrado también sale en la misma página de estructura, sin añadir páginas', async () => {
    const { pages } = await pdfText({ ...base, irisAssumeSquare: true, irisFrontTop: 300, irisExitLeft: 250 });
    expect(pages).toHaveLength(2);
    for (const page of pages) {
      expect(page).toContain('TOLDO 300 × 250');
      expect(page).toContain('COMPROBAR DIAGONALES · CREMALLERA XL');
    }
    expect(pages[0]).toContain('Toldo A · Estructura');
  });

  test('solo IRIS reserva el recuadro en los datos de la estructura HTML, también al filtrar por toldo', () => {
    const order = normalizeOrder({ awnings: [
      { ...base, id: 'otro', model: 'ARZUA PRO', width: 300, projection: 250 },
      { ...base, irisAssumeSquare: true, irisFrontTop: 300, irisExitLeft: 250 }
    ] });
    const calculation = calculateOrder(order);
    const sheets = buildStructureSheetPages({ order, calculation });
    expect(sheets[0].diagramBox).toBeUndefined();
    expect(sheets[1].diagramBox).toEqual({ x: 417.28, y: 245, width: 164, height: 150.53 });
    expect(buildStructureSheetPages({ order, calculation, onlyAwningId: 'a' })).toEqual([{ ...sheets[1], structureIndex: 0 }]);
  });

  test('el servidor encaja el escuadrado sobre la estructura HTML del toldo seleccionado', async () => {
    const order = normalizeOrder({ awnings: [
      { ...base, id: 'otro', model: 'ARZUA PRO', width: 300, projection: 250 },
      { ...base, irisAssumeSquare: true, irisFrontTop: 300, irisExitLeft: 250 }
    ] });
    const calculation = calculateOrder(order);
    const pages = await pageTexts(await buildOrderPlanteamientoPdf({ order, calculation, onlyAwningId: 'a', renderSheets: fakeSheets() }));
    expect(pages).toHaveLength(2);
    expect(pages[0]).toContain('HOJA ESTRUCTURA');
    expect(pages[0]).toContain('TOLDO 300 × 250');
    expect(pages[1]).toContain('TOLDO 300 × 250');
  });

  test('si falla HTML, la estructura de reserva conserva el dibujo y las notas cortas en la misma hoja', async () => {
    const { pages } = await pdfText({ ...base, irisAssumeSquare: true, irisFrontTop: 253.5, irisExitLeft: 220,
      irisGlassCurtain: true, motorPower: 'SOLAR 15/12', structureNotes: 'COMPROBAR ANCLAJE EN OBRA' }, {
      htmlStructure: true, htmlFabric: true,
      renderSheets: async () => { throw new Error('Impresora no disponible'); }
    });
    expect(pages[0]).toContain('TOLDO 253,5 × 220');
    expect(pages[0]).toContain('COMPROBAR ANCLAJE EN OBRA');
    expect(pages).toHaveLength(2);
    expect(pages[1]).toContain('PLANTEAMIENTO DE TELAS');
  });

  test.each([2, 3, 5, 10])('la reserva reparte %i líneas de notas del pedido AR2604748', async (lineas) => {
    const notas = Array.from({ length: lineas }, (_, i) => `NOTA DE TALLER ${i + 1}`).join('\n');
    const { pages, structureItems } = await pdfText({ ...base, submodel: 'IRIS 110 CON COFRE', irisAssumeSquare: true,
      irisFrontTop: 253.5, irisExitLeft: 220, irisGlassCurtain: true, motorPower: 'SOLAR 15/12', structureNotes: notas });
    expect(pages[0]).not.toContain('SISTEMA DE ANCLAJE');
    expect(pages[0]).toContain('NOTA DE TALLER 1');
    const superior = structureItems.find(item => item.str === 'PERFIL COFRE SUPERIOR');
    const inferior = structureItems.find(item => item.str === 'PERFIL COFRE INFERIOR');
    expect(superior.transform[5] - inferior.transform[5]).toBeGreaterThanOrEqual(7.99);
    expect(superior.height).toBeGreaterThanOrEqual(5.4);
    for (let i = 1; i <= lineas; i++) expect(pages.join(' ')).toContain(`NOTA DE TALLER ${i}`);
    // Los comentarios de 9 pt con filetes ocupan más que el antiguo texto corrido de 6,5 pt.
    if (lineas <= 3) {
      expect(pages).toHaveLength(2);
      expect(pages[0]).toContain(`NOTA DE TALLER ${lineas}`);
    } else {
      expect(pages).toHaveLength(3);
      expect(pages[1]).toContain('Observaciones (continuación)');
      expect(pages[1]).toContain(`NOTA DE TALLER ${lineas}`);
    }
  });

  test.each(['IRIS', 'ARZUA PRO'])('%s omite solo los anclajes sin indicar en HTML y reserva', async (model) => {
    for (const anchoring of [null, { name: 'NO INDICADO', reference: 'ANCLA', units: 1 }, { name: 'QUÍMICO', reference: '', units: 1 }, { name: 'QUÍMICO', reference: 'ANCLA', units: 1 }]) {
      const order = normalizeOrder({ structureColor: 'BLANCO', sameFabric: true, fabric: 'ACRILI2170P120|||120|||LONA NEGRA|||ACR',
        awnings: [{ ...base, model, width: 300, projection: 250, armCount: 2, tubeLoad: 'TUBO DE CARGA EVO 80', sensor: 'SIN SENSOR', valanceHeight: 0, valanceCurve: 'RECTA', rotValance: 'NO', irisAssumeSquare: true, irisFrontTop: 300, irisExitLeft: 250 }] });
      const calculation = calculateOrder(order);
      calculation.ofs[0].despiece.anchoring = anchoring;
      const indicado = anchoring?.name === 'QUÍMICO' && Boolean(anchoring.reference);
      expect(Boolean(buildStructureSheetPages({ order, calculation })[0].anchoring)).toBe(indicado);
      const pages = await pageTexts(await buildOrderPlanteamientoPdf({ order, calculation, htmlStructure: false, htmlFabric: false }));
      expect(pages[0].includes('SISTEMA DE ANCLAJE')).toBe(indicado);
    }
  });

  test('el dibujo acompaña las páginas de despiece HTML y respeta las de continuación', async () => {
    const order = normalizeOrder({ awnings: [{ ...base, irisGlassCurtain: true, irisAssumeSquare: true, irisFrontTop: 300, irisExitLeft: 250 }] });
    const calculation = calculateOrder(order);
    const row = calculation.ofs[0].despiece.rows[0];
    calculation.ofs[0].despiece.rows = Array.from({ length: 30 }, (_, i) => ({ ...row, num: i + 1 }));
    const pages = await pageTexts(await buildOrderPlanteamientoPdf({ order, calculation, renderSheets: fakeSheets([3, 1]) }));
    expect(pages).toHaveLength(4);
    expect(pages[0]).toContain('TOLDO 300 × 250');
    expect(pages[1]).toContain('TOLDO 300 × 250');
    expect(pages[2]).not.toContain('FRENTE SUPERIOR');
    expect(pages[3]).toContain('TOLDO 300 × 250');
  });

  test('el CAD de referencia: toldo, corte de cada guía con su hueco, desfases y exagerado', async () => {
    const { text, calculation } = await pdfText({
      ...base, irisAssumeSquare: false, reglasModificadas: true,
      irisFrontTop: 355, irisFrontBottom: 350, irisExitLeft: 400, irisExitRight: 405, irisDiagonal1: 533.1, irisDiagonal2: 537
    });
    expect(text).toContain('TOLDO 350,1 × 400');
    expect(text).toContain(`MFI: CORTE ${String(calculation.guideLeftLength).replace('.', ',')} · HUECO 400`);
    expect(text).toContain(`MFD: CORTE ${String(calculation.guideRightLength).replace('.', ',')} · HUECO 405`);
    expect(text).toContain('D1 533,1');
    expect(text).toContain('2,6 CM');
    expect(text).toMatch(/DESFASES EXAGERADOS ×\d+/);
    expect(text).toContain('COMPROBAR DIAGONALES · CREMALLERA XL');
  });

  test('escuadrado: el rectángulo, sin desfases ni exagerado', async () => {
    const { text } = await pdfText({ ...base, irisAssumeSquare: true, irisFrontTop: 300, irisExitLeft: 250 });
    expect(text).toContain('TOLDO 300 × 250');
    expect(text).not.toMatch(/DESFASES EXAGERADOS/);
  });
});
