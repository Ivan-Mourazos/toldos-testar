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
