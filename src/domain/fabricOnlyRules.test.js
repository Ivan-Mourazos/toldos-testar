import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';

const base = {
  orderCode: 'AR26TEXTIL',
  fabric: 'ACR NEGRO',
  awnings: []
};

function calculate(model, overrides = {}) {
  return calculateOrder({
    ...base,
    awnings: [{
      id: model,
      of: '3300001',
      model,
      units: 1,
      width: 300,
      projection: 250,
      valanceHeight: 30,
      ...overrides
    }]
  });
}

describe('trabajos solo de tela', () => {
  test.each([
    ['CAMBIO TELA', 325],
    ['CAMBIO CORTINA', 307],
    ['ENROLLABLE', 275],
    ['CAMBIO ANTICA', 350]
  ])('%s aplica su fórmula del Excel y no genera estructura', (model, expectedDrop) => {
    const result = calculate(model);
    expect(result.ofs[0].calculation.fabricDrop).toBe(expectedDrop);
    expect(result.ofs[0].calculation.structureLength).toBe(0);
    expect(result.ofs[0].despiece).toBeNull();
  });

  test('BAMBALINA usa frente y alto; no necesita salida', () => {
    const result = calculate('BAMBALINA', { projection: 0, valanceHeight: 30 });
    expect(result.ofs).toHaveLength(1);
    expect(result.ofs[0].calculation.fabricDrop).toBe(35);
    expect(result.ofs[0].despiece).toBeNull();
  });

  test('CAMBIO CORTINA con ventana exige las cuatro medidas del Excel', () => {
    const incomplete = calculate('CAMBIO CORTINA', { curtainHasWindow: true });
    expect(incomplete.ofs[0].materials).toEqual([]);
    expect(incomplete.diagnostics[0].message).toContain('faltan medidas de ventana');

    const complete = calculate('CAMBIO CORTINA', {
      curtainHasWindow: true,
      curtainWindowExit: 240,
      curtainWindowCorner: 35,
      curtainWindowFloorHeight: 95,
      curtainWindowHeight: 120
    });
    expect(complete.ofs[0].materials).toHaveLength(1);
    expect(complete.ofs[0].calculation.valid).toBe(true);
  });
});
