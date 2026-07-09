import { describe, expect, it } from 'vitest';
import { calculateOrder } from './rules.js';

function baseAwning(overrides = {}) {
  return {
    of: '12345',
    model: 'ARZUA PRO',
    units: 1,
    width: 400,
    projection: 250,
    device: 'MOTOR',
    tubeLoad: 'TUBO DE CARGA EVO 80',
    placement: 'FRONTAL',
    wallType: 'DIRECTA A PARED',
    sensor: 'SIN SENSOR',
    ...overrides
  };
}

describe('calculateOrder', () => {
  it('returns materials for a valid ARZUA PRO awning', () => {
    const result = calculateOrder({
      orderCode: 'P26TEST',
      fabric: 'ACR ADMIRAL',
      structureColor: 'BLANCO',
      awnings: [baseAwning()]
    });

    expect(result.ofs[0].calculation.valid).toBe(true);
    expect(result.ofs[0].materials.length).toBeGreaterThan(0);
  });

  it('does not generate material lines for a Frente over the 600cm limit', () => {
    const result = calculateOrder({
      orderCode: 'P26TEST',
      fabric: 'ACR ADMIRAL',
      structureColor: 'BLANCO',
      awnings: [baseAwning({ width: 9999 })]
    });

    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.ofs[0].materials).toEqual([]);
  });
});

describe('calculateOrder — CAMBIO TELA', () => {
  it('calculates CAMBIO TELA materials end-to-end, including valanceHeight passthrough', () => {
    const result = calculateOrder({
      orderCode: 'P26TEST',
      fabric: 'ACR GRANATE',
      awnings: [{
        of: '12345',
        model: 'CAMBIO TELA',
        units: 1,
        width: 447.5,
        projection: 250,
        valanceHeight: 30
      }]
    });

    expect(result.ofs[0].materials).toEqual([
      { code: 'ACRILI2101P120', quantity: 13, description: 'ACR GRANATE' }
    ]);
  });

  it('defaults valanceHeight to 0 when not provided', () => {
    const result = calculateOrder({
      orderCode: 'P26TEST',
      fabric: 'PVC 580 NARANJA',
      awnings: [{
        of: '12345',
        model: 'CAMBIO TELA',
        units: 1,
        width: 329,
        projection: 300
      }]
    });

    expect(result.ofs[0].materials).toEqual([
      { code: 'ALPHANA04P250', quantity: 6.9, description: 'PVC 580 NARANJA' }
    ]);
  });
});
