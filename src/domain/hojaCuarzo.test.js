import { describe, expect, test } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { calculateOrder } from './rules.js';
import { buildOrderPlanteamientoPdf } from './planteamientoPdf.js';

// Iván, 05/11/2026: con un Cuarzo Box, la hoja «Recorte tapas con piezas especiales» va siempre en el PDF del pedido,
// en A5 y detrás del despiece, también cuando el despiece ocupa varias hojas.
const cuarzo = (patch = {}) => ({
  id: 'cuarzo-test', of: '0229835', model: 'CUARZO BOX', units: 1, width: 254, projection: 125, valanceHeight: 0,
  device: 'MAQUINA', crankHeight: 100, structureColor: 'BLANCO', rotFabric: 'NO', wallType: '', ...patch
});
const pedido = (awnings) => ({
  orderCode: 'AR2603104', customer: 'PRUEBA', technician: 'IVAN', reviewer: '', sameFabric: true,
  fabric: 'ACRILI2817P120|||120|||LONA ACRILICA MASACRIL 300 HELSINKI 2817', awnings
});

async function paginas(order, calculation = calculateOrder(order)) {
  const pdf = await buildOrderPlanteamientoPdf({ order, calculation });
  const doc = await getDocument({ data: new Uint8Array(pdf) }).promise;
  const out = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const [, , w, h] = page.view;
    out.push({ w: Math.round(w), h: Math.round(h), texto: (await page.getTextContent()).items.map((i) => i.str).join(' ') });
  }
  return out;
}
const esHoja = (p) => /Tapas aluminio/.test(p.texto);

describe('hoja de las tapas del Cuarzo Box', () => {
  test('va en A5 vertical justo detrás del despiece del Cuarzo Box', async () => {
    const hojas = await paginas(pedido([cuarzo()]));
    const i = hojas.findIndex(esHoja);
    expect(i).toBeGreaterThan(0);
    expect(hojas[i]).toMatchObject({ w: 420, h: 595 });
    expect(hojas[i - 1].texto).toMatch(/DESPIECE|Estructura/i);
    expect(hojas.filter(esHoja)).toHaveLength(1);
  });

  test('con el despiece en dos hojas, va detrás de la segunda', async () => {
    const order = pedido([cuarzo()]);
    const calculation = calculateOrder(order);
    const rows = calculation.ofs[0].despiece.rows;
    for (let i = 0; i < 30; i++) rows.push({ num: rows.length + 1, name: `PIEZA EXTRA ${i}`, reference: `EXTRA${i}`, units: 1, length: null });
    const hojas = await paginas(order, calculation);
    const i = hojas.findIndex(esHoja);
    expect(hojas.slice(0, i).filter((p) => /PIEZA EXTRA/.test(p.texto)).length).toBe(2);
    expect(hojas.slice(i + 1).some((p) => /PIEZA EXTRA/.test(p.texto))).toBe(false);
  });

  test('otros modelos no la llevan', async () => {
    const order = pedido([{ ...cuarzo(), model: 'XACOBEO' }]);
    expect((await paginas(order)).some(esHoja)).toBe(false);
  });
});

// En producción la estructura y las telas se imprimen con Chromium y se unen con las páginas de pdfkit: la hoja de las
// tapas tiene que seguir detrás de la estructura impresa.
describe('hoja de las tapas con las hojas impresas en HTML', () => {
  test('va detrás de la estructura impresa', async () => {
    const pdfLib = await import('pdf-lib');
    const renderSheets = async (hojas) => {
      const doc = await pdfLib.PDFDocument.create();
      const font = await doc.embedFont(pdfLib.StandardFonts.Helvetica);
      for (const hoja of hojas) {
        const page = doc.addPage(hoja.kind === 'estructura' ? [595, 420] : [842, 595]);
        page.drawText(hoja.kind === 'estructura' ? 'ESTRUCTURA IMPRESA' : 'TELAS IMPRESAS', { x: 40, y: 200, size: 20, font });
      }
      return { pdf: Buffer.from(await doc.save()), pageCounts: hojas.map(() => 1) };
    };
    const order = pedido([cuarzo()]);
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation: calculateOrder(order), renderSheets, htmlStructure: true, htmlFabric: true });
    const doc = await getDocument({ data: new Uint8Array(pdf) }).promise;
    const textos = [];
    for (let n = 1; n <= doc.numPages; n++) textos.push((await (await doc.getPage(n)).getTextContent()).items.map((i) => i.str).join(' '));
    const i = textos.findIndex((t) => /Tapas aluminio/.test(t));
    expect(textos[i - 1]).toContain('ESTRUCTURA IMPRESA');
    expect(textos.filter((t) => /Tapas aluminio/.test(t))).toHaveLength(1);
  });
});
