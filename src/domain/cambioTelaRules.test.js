import { describe, expect, it } from 'vitest';
import { calculateCambioTela } from './cambioTelaRules.js';

function baseAwning(overrides = {}) {
  return {
    id: 'a1',
    of: '229652',
    model: 'CAMBIO TELA',
    units: 1,
    width: 447.5,
    projection: 250,
    valanceHeight: 30,
    ...overrides
  };
}

describe('calculateCambioTela', () => {
  it('matches the real AR2603017 order (447.5x250, bambalina 30cm)', () => {
    const result = calculateCambioTela({
      order: { fabric: 'ACR GRANATE' },
      awning: baseAwning()
    });

    expect(result.materials).toEqual([
      { code: 'ACRILI2101P120', quantity: 13, description: 'ACR GRANATE' }
    ]);
    expect(result.diagnostics).toEqual([]);
  });

  it('matches the real AR2603051-1 order (337x275, bambalina 25cm)', () => {
    const result = calculateCambioTela({
      order: { fabric: 'ACR NEGRO' },
      awning: baseAwning({ width: 337, projection: 275, valanceHeight: 25 })
    });

    expect(result.materials).toEqual([
      { code: 'ACRILI2170P120', quantity: 10.35, description: 'ACR NEGRO' }
    ]);
  });

  it('adds an extra fabric panel for the seam allowance (real AR2600676 order, 2 units)', () => {
    const result = calculateCambioTela({
      order: { fabric: 'ACR NATURAL' },
      awning: baseAwning({ width: 479.5, projection: 300, valanceHeight: 25, units: 2 })
    });

    expect(result.materials[0].quantity).toBe(37);
  });

  it('uses the fabric roll width from the catalog instead of a fixed 120cm (real AR2601479 order, 250cm roll)', () => {
    const result = calculateCambioTela({
      order: { fabric: 'PVC 580 NARANJA' },
      awning: baseAwning({ width: 329, projection: 300, valanceHeight: 0 })
    });

    // Dos paños con rollo de 250; con 120 harían falta tres y el consumo sería otro.
    expect(result.calculation.fabricRollWidth).toBe(250);
    expect(result.calculation.fabricPanels).toBe(2);
    // El Excel de este pedido da 6,9 porque suma el remate sin haber bamba: su hoja
    // CAM. TELA lleva el +5 en las cuatro columnas. Iván confirma el 14/09/2026 que
    // ese remate es de la bambalina, así que sin bamba la caída es salida + 40.
    expect(result.calculation.fabricDrop).toBe(340);
    expect(result.materials).toEqual([
      { code: 'ALPHANA04P250', quantity: 6.8, description: 'PVC 580 NARANJA' }
    ]);
  });

  it('returns an error diagnostic and no materials when the fabric is not in the catalog', () => {
    const result = calculateCambioTela({
      order: { fabric: 'ACR GENERAT RED' },
      awning: baseAwning()
    });

    expect(result.materials).toEqual([]);
    expect(result.diagnostics).toEqual([
      { level: 'error', awningId: 'a1', message: 'Tela no encontrada en el catálogo: "ACR GENERAT RED".' }
    ]);
  });
});

// Contrastado contra los Excel de OT leídos el 14/09/2026. El remate de bamba solo
// existe si hay bamba: 17 de los 24 desajustes de caída de 2026 eran este +5.
describe('cambio de tela sin bambalina', () => {
  it.each([
    ['AR2600109', '0224173', 577.4, 350, 390, 19.5],
    ['AR2601149', '0226295', 440, 275, 315, 12.6],
    ['AR2601844', '0227517', 399, 225, 265, 10.6],
    ['AR2601854', '0227591', 532, 300, 340, 17]
  ])('%s con BAMBA vacío calcula salida + 40, sin el remate', (orderCode, of, width, projection, drop, ml) => {
    const result = calculateCambioTela({
      order: { orderCode, fabric: 'ACR NEGRO' },
      awning: baseAwning({ of, width, projection, valanceHeight: 0 })
    });
    expect(result.calculation.fabricDrop).toBe(drop);
    expect(result.calculation.fabricMl).toBeCloseTo(ml, 2);
  });

  it('con bambalina sigue sumando el alto y su remate', () => {
    const result = calculateCambioTela({
      order: { fabric: 'ACR NEGRO' },
      awning: baseAwning({ projection: 215, valanceHeight: 25 })
    });
    expect(result.calculation.fabricDrop).toBe(285);
  });
});
