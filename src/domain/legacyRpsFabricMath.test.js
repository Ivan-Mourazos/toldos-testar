import { describe, expect, test } from 'vitest';
import { calculateLegacyRpsFabricUsage, countLegacyRpsFabricPanels } from './legacyRpsFabricMath.js';

describe('fórmula de reserva de lona del Excel maestro', () => {
  test('reproduce ESTR.01!Q28 en un caso histórico de Cambio Cortina', () => {
    expect(calculateLegacyRpsFabricUsage({
      width: 238.5,
      drop: 297,
      units: 1,
      rollWidth: 120
    })).toEqual({ panels: 3, ml: 8.91 });
  });

  test.each([
    [113, 120],
    [146, 153],
    [193, 200],
    [243, 250]
  ])('con frente %s y rollo %s conserva el borde exacto de RPS', (width, rollWidth) => {
    expect(countLegacyRpsFabricPanels(width, rollWidth)).toBe(2);
  });

  test('escala la cantidad por unidades sin alterar el número de paños', () => {
    expect(calculateLegacyRpsFabricUsage({ width: 238.5, drop: 297, units: 2, rollWidth: 120 }))
      .toEqual({ panels: 3, ml: 17.82 });
  });
});

// La reserva que sube a RPS también anida las piezas estrechas: es la cantidad
// que se pide de verdad, no solo la que se muestra en el planteamiento.
describe('anidado en la reserva heredada', () => {
  test('AR2602302-2: tres enrollables de 60 cm reservan 7,5 ml, no 11,25', () => {
    expect(calculateLegacyRpsFabricUsage({ width: 60, drop: 375, units: 3, rollWidth: 120 }).ml).toBe(7.5);
  });

  test('una pieza que ocupa más de medio rollo sigue gastando una pasada por unidad', () => {
    expect(calculateLegacyRpsFabricUsage({ width: 100, drop: 200, units: 3, rollWidth: 120 }).ml).toBe(6);
  });

  test('el anidado no altera las piezas que necesitan varios paños', () => {
    const usage = calculateLegacyRpsFabricUsage({ width: 419.5, drop: 25, units: 1, rollWidth: 120 });
    expect(usage.panels).toBe(4);
    expect(usage.ml).toBe(1);
  });
});
