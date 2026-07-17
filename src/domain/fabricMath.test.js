import { describe, expect, test } from 'vitest';
import { calculateFabricMl, calculateFabricUsage, countFabricPanels } from './fabricMath.js';

describe('cálculo común de paños de tela', () => {
  test.each([
    [326, 120, 3],
    [417, 120, 4],
    [585, 120, 6],
    [637, 120, 6]
  ])('%s cm en rollo de %s cm necesita %s paños', (width, rollWidth, expected) => {
    expect(countFabricPanels(width, rollWidth)).toBe(expected);
  });

  test('AR2603315: 585 x 295 con seis paños son 17,7 ml', () => {
    expect(calculateFabricMl({ width: 585, drop: 295, units: 1, rollWidth: 120 })).toBe(17.7);
  });

  test('permite ajustar costura y margen base desde parámetros', () => {
    expect(countFabricPanels(585, 120, { seamAllowanceCm: 0, seamBaseCm: 0 })).toBe(5);
    expect(countFabricPanels(585, 120, { seamAllowanceCm: 2.5, seamBaseCm: 6.5 })).toBe(6);
  });
});

describe('caso real AR2600000', () => {
  test('550 y 548,5 tienen distinto ancho pero el mismo consumo al requerir cinco paños', () => {
    expect(calculateFabricUsage({ width: 537, drop: 270, units: 1, rollWidth: 120 })).toEqual({ panels: 5, ml: 13.5 });
    expect(calculateFabricUsage({ width: 535.5, drop: 270, units: 1, rollWidth: 120 })).toEqual({ panels: 5, ml: 13.5 });
  });
});
