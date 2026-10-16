import { describe, expect, test } from 'vitest';
import { buildFabricSheetPages, buildOrderPlanteamientoPdf, fabricPageNotes } from './planteamientoPdf.js';
import { normalizeOrder } from './validation.js';
import { calculateOrder } from './rules.js';
import { extractReviewPackageFromPdf } from '../workflow.js';

describe('observaciones de tela por página', () => {
  const lineas = [
    { index: 0, awning: { model: 'ARZUA PRO', fabricNotes: 'Primera de A\nSegunda de A' } },
    { index: 1, awning: { model: 'CAMBIO TELA', fabricNotes: 'Solo B' } },
    { index: 2, awning: { model: 'HERA', fabricNotes: 'Solo C' } }
  ];

  test('añade las generales y únicamente las de los toldos de la página', () => {
    expect(fabricPageNotes({ notes: 'General\nOtra general' }, lineas.slice(0, 2)))
      .toBe('General\nOtra general\nA: Primera de A\nA: Segunda de A\nB: Solo B');
  });

  test('con un toldo no imprime la letra aunque sea la tercera hoja', () => {
    expect(fabricPageNotes({ notes: 'General' }, lineas.slice(2)))
      .toBe('General\nSolo C');
  });

  test('cuenta todos los toldos de la página aunque alguno no lleve comentario', () => {
    expect(fabricPageNotes({}, [lineas[1], { index: 2, awning: { model: 'HERA' } }]))
      .toBe('B: Solo B');
  });

  test('dos hojas conservan sus notas y el PDF de revisión guarda ambos niveles', async () => {
    const cambio = { of: '0230194', model: 'CAMBIO TELA', width: 300, projection: 250, units: 1 };
    const order = normalizeOrder({ orderCode: 'AR-NOTAS', notes: 'General', awnings: [
      { ...cambio, id: 'a', fabricNotes: 'Solo A' },
      { ...cambio, id: 'b', fabricNotes: 'Solo B' },
      { id: 'c', of: '0230196', model: 'BAMBALINA', width: 300, valanceHeight: 30, units: 1, fabricNotes: 'Solo C' }
    ] });
    const calculation = calculateOrder(order);
    const hojas = buildFabricSheetPages({ order, calculation });
    expect(hojas.map(({ notes }) => notes)).toEqual(['General\nA: Solo A\nB: Solo B', 'General\nSolo C']);
    const review = { kind: 'toldos-testar-review', orderCode: order.orderCode, order, status: 'PENDING_REVIEW' };
    const pdf = await buildOrderPlanteamientoPdf({ order, calculation, review });
    const reopened = await extractReviewPackageFromPdf(pdf);
    expect(reopened.order.notes).toBe('General');
    expect(reopened.order.awnings.map(({ fabricNotes }) => fabricNotes)).toEqual(['Solo A', 'Solo B', 'Solo C']);
  });
});
