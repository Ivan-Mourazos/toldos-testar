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
  for (let n = 1; n <= document.numPages; n += 1) {
    const page = await document.getPage(n);
    texts.push((await page.getTextContent()).items.map((item) => item.str).join(' '));
  }
  await loading.destroy();
  return { text: texts.join(' '), pages: texts, calculation: calculation.ofs[0].calculation };
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

  test('si falla HTML, la estructura de reserva conserva el dibujo y pasa las notas a continuación', async () => {
    const { pages } = await pdfText({ ...base, irisAssumeSquare: true, irisFrontTop: 253.5, irisExitLeft: 220,
      irisGlassCurtain: true, motorPower: 'SOLAR 15/12', structureNotes: 'COMPROBAR ANCLAJE EN OBRA' }, {
      htmlStructure: true, htmlFabric: true,
      renderSheets: async () => { throw new Error('Impresora no disponible'); }
    });
    expect(pages[0]).toContain('TOLDO 253,5 × 220');
    expect(pages[0]).not.toContain('COMPROBAR ANCLAJE EN OBRA');
    expect(pages[1]).toContain('Toldo A · Observaciones (continuación)');
    expect(pages[1]).toContain('COMPROBAR ANCLAJE EN OBRA');
    expect(pages[1]).not.toContain('FRENTE SUPERIOR');
    expect(pages[2]).toContain('PLANTEAMIENTO DE TELAS');
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
