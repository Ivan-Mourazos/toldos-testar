import { describe, expect, test } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildFabricSheetPages, buildFabricDiagramBoxPdf, FABRIC_SHEET_DIAGRAM_BOX } from './planteamientoPdf.js';
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
