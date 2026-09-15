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

// Criterio confirmado por Iván el 14/09/2026 y contrastado con los 567 trabajos
// de tela de 2026: corrige AR2602302-2 y no altera ningún otro histórico.
describe('piezas estrechas anidadas en el ancho del rollo', () => {
  test('AR2602302-2: tres enrollables de 60 cm caben de dos en dos y son 7,5 ml', () => {
    expect(calculateFabricUsage({ width: 60, drop: 375, units: 3, rollWidth: 120 }))
      .toEqual({ panels: 1, ml: 7.5 });
  });

  test.each([
    [40, 5, 2],
    [60, 2, 1],
    [60, 3, 2],
    [60, 4, 2],
    [61, 2, 2]
  ])('%s cm de frente, %s unidades: %s pasadas de rollo', (width, units, rows) => {
    expect(calculateFabricUsage({ width, drop: 100, units, rollWidth: 120 }).ml).toBe(rows);
  });

  test('una pieza que ocupa más de medio rollo sigue gastando una pasada por unidad', () => {
    expect(calculateFabricUsage({ width: 100, drop: 200, units: 3, rollWidth: 120 }).ml).toBe(6);
  });

  test('el anidado no altera las piezas que necesitan varios paños', () => {
    expect(calculateFabricUsage({ width: 585, drop: 295, units: 2, rollWidth: 120 }).ml).toBe(35.4);
  });
});
