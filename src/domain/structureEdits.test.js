import { expect, test } from 'vitest';
import { applyStructureEdit, verifyStructureArticles } from './structureEdits.js';
import { calculateOrder } from './rules.js';
import { normalizeReservation } from './validation.js';
import { buildOrderPlanteamientoPdf } from './planteamientoPdf.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

function fixture() {
  return { orderCode: 'AR2609900', customer: 'PRUEBA', technician: 'IVAN', reviewer: 'JAIME', fabric: 'ACR NEGRO', structureColor: 'BLANCO', sameFabric: true, awnings: [{ id: 'a', of: '0230000', model: 'ANTICA', units: 1, width: 450, projection: 80, valanceHeight: 20, anticaVariant: 'TUBO 50X30 CONTRAPESO', device: 'MAQUINA', crankHeight: 200, machineSide: 'M.F.DER', placement: 'FRONTAL' }] };
}
function edit(order, change) {
  const block = calculateOrder(order).ofs[0];
  const rows = structuredClone(block.structureEditor.rows);
  change(rows);
  order.awnings[0].structureEdit = { signature: block.structureEditor.signature, rows };
  return calculateOrder(order);
}

test('sustituye artículo y cantidad sin duplicar la reserva; mantiene la tela', () => {
  const order = fixture();
  const original = calculateOrder(order).ofs[0];
  const old = original.despiece.rows[0].reference;
  const calc = edit(order, (rows) => { Object.assign(rows[0], { reference: 'NUEVO', name: 'SOPORTE NUEVO', units: 2, reservationQuantity: 2 }); });
  expect(calc.ofs[0].materials.some((row) => row.code === old)).toBe(false);
  expect(calc.ofs[0].materials.find((row) => row.code === 'NUEVO').quantity).toBe(2);
  expect(calc.ofs[0].materials.find((row) => row.code === original.calculation.fabricCode)).toEqual(original.materials.find((row) => row.code === original.calculation.fabricCode));
  expect(normalizeReservation({ orderCode: order.orderCode, ofs: calc.ofs }).ofs[0].materials.find((row) => row.code === 'NUEVO').quantity).toBe(2);
});

test('corte, borrado y piezas añadidas llegan al PDF y a la reserva', async () => {
  const order = fixture();
  const original = calculateOrder(order).ofs[0];
  const removed = original.despiece.rows[0].reference;
  const calc = edit(order, (rows) => {
    rows.shift(); rows[0].length = 333;
    for (let i = 0; i < 25; i++) rows.push({ id: 'added:' + i, num: 30 + i, name: 'PIEZA EXTRA ' + i, reference: 'EXTRA' + i, units: 1, length: null, reservationQuantity: 1, unitCode: 'UD', kind: 'piece' });
  });
  expect(calc.ofs[0].materials.some((row) => row.code === removed)).toBe(false);
  expect(calc.ofs[0].materials.find((row) => row.code === original.despiece.rows[1].reference).quantity).toBe(1);
  const pdf = await buildOrderPlanteamientoPdf({ order, calculation: calc });
  const doc = await getDocument({ data: new Uint8Array(pdf) }).promise;
  expect(doc.numPages).toBeGreaterThan(2);
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) text += (await (await doc.getPage(i)).getTextContent()).items.map((item) => item.str).join(' ');
  expect(text).toContain('PIEZA EXTRA 24');
  expect(text).toContain('333');

});

test('Antica admite cuatro brazos y permite reservar brazos y manivela de otro color', () => {
  const order = fixture(); order.awnings[0].structureArmCount = 4;
  const pending = calculateOrder(order);
  expect(pending.ofs[0].calculation.armCount).toBe(4);
  expect(pending.diagnostics.some((item) => item.message.includes('referencia de RPS'))).toBe(true);
  const calc = edit(order, (rows) => {
    Object.assign(rows.find((row) => row.name === 'BRAZO ANTICA'), { reference: 'BRAZO-RPS', reservationQuantity: 4 });
    Object.assign(rows.find((row) => row.name.startsWith('MANIVELA')), { reference: 'MANIVELA-NEGRA', name: 'MANIVELA NEGRA', reservationQuantity: 1 });
  });
  expect(calc.ofs[0].calculation.valid).toBe(true);
  expect(calc.ofs[0].materials.find((row) => row.code === 'BRAZO-RPS').quantity).toBe(4);
  expect(calc.ofs[0].materials.find((row) => row.code === 'MANIVELA-NEGRA').quantity).toBe(1);
  expect(calc.ofs[0].despiece.rows.find((row) => row.reference === 'BRAZO-RPS').units).toBe(4);
});

test('guardar/reabrir conserva cambios y cambiar medidas exige revisión', () => {
  const order = fixture(); edit(order, (rows) => { rows[0].name = 'SOPORTE ESPECIAL'; });
  const reloaded = JSON.parse(JSON.stringify(order));
  expect(calculateOrder(reloaded).ofs[0].despiece.rows[0].name).toBe('SOPORTE ESPECIAL');
  reloaded.awnings[0].width = 460;
  const stale = calculateOrder(reloaded);
  expect(stale.ofs[0].structureEditor.stale).toBe(true);
  expect(stale.ofs[0].calculation.valid).toBe(false);
  expect(stale.ofs[0].materials).toEqual([]);
  expect(stale.ofs[0].structureEditor.rows[0].name).toBe('SOPORTE ESPECIAL');
  reloaded.awnings[0].structureEdit = null;
  expect(calculateOrder(reloaded).ofs[0].calculation.valid).toBe(true);
});

test.each([null, 'offline'])('referencia inexistente o RPS caído bloquea producción: %s', async (outcome) => {
  const order = fixture(); const calc = edit(order, (rows) => { rows[0].reference = 'DESCONOCIDA'; });
  await verifyStructureArticles(calc, async () => { if (outcome === 'offline') throw Error('offline'); return null; });
  expect(calc.ofs[0].calculation.valid).toBe(false);
  expect(calc.ofs[0].materials).toEqual([]);
  expect(calc.diagnostics.some((row) => row.level === 'error')).toBe(true);
});

test('valida una referencia nueva una sola vez para todo el pedido', async () => {
  const order = fixture(); const calc = edit(order, (rows) => { rows[0].reference = 'VALIDA'; });
  let calls = 0;
  await verifyStructureArticles(calc, async () => { calls++; return { code: 'VALIDA' }; });
  expect(calls).toBe(1); expect(calc.ofs[0].calculation.valid).toBe(true);
});

test('conserva cantidades compartidas, anclajes y agregación max', () => {
  const awning = { id: 'a', model: 'PRUEBA', units: 2 };
  const result = { calculation: { valid: true }, materials: [{ code: 'KIT', quantity: 2 }, { code: 'MANDO', quantity: 1, aggregation: 'max' }], despiece: { rows: [{ num: 1, name: 'IZQ', reference: 'KIT', units: 2, length: null }, { num: 2, name: 'DER', reference: 'KIT', units: 2, length: null }, { num: 3, name: 'MANDO', reference: 'MANDO', units: 1, length: null }], anchoring: null } };
  const base = applyStructureEdit(awning, result);
  const rows = structuredClone(base.structureEditor.rows); rows[0].name = 'IZQUIERDO';
  const edited = applyStructureEdit({ ...awning, structureEdit: { signature: base.structureEditor.signature, rows } }, result);
  expect(edited.materials.find((row) => row.code === 'KIT').quantity).toBe(2);
  expect(edited.materials.find((row) => row.code === 'MANDO').aggregation).toBe('max');
});
