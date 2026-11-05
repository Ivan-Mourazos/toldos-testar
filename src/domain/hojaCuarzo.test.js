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
