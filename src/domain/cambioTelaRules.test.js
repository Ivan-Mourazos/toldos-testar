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

    expect(result.materials).toEqual([
      { code: 'ALPHANA04P250', quantity: 6.9, description: 'PVC 580 NARANJA' }
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
