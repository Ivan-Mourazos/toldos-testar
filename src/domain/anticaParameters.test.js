import { describe, expect, test } from 'vitest';
import { calculateAntica } from './anticaRules.js';
import { getAnticaDiscounts } from './anticaParameters.js';

// Valores previos a extraer las reglas para la ficha de consulta.
// Salida 80, altura soporte 60, frente 284 y bamba 20 salvo SIN BAMBA.
const cases = [
  ['TUBO 50X30 CONTRAPESO', 20, 209.1, 120, [12, 11, 12], [11, 10, 11]],
  ['TUBO 50X30 SIN BAMBA', 0, 183.1, 183.1, [12, 11, 12], [11, 10, 11]],
  ['TUBO 30X10 CON BAMBA', 20, 209.1, 120, [12, 11, 12], [11, 10, 11]],
  ['ENTRADA TUBO Ø33 MM', 20, 158, 138, [7.2, 6.2, 7.2], [11, 10, 11]],
  ['ENTRADA TUBO Ø42 MM', 20, 180, 160, [10.5, 11, 11.5], [11, 10, 11]],
  ['SOPORTE FIJO 3 AGUJEROS', 20, 195, 120, [12, 11, 11], [11, 10, 10]]
];
describe('Antica conserva resultados al compartir reglas con Parámetros', () => {
  for (const [variant, bamba, sameDrop, separateDrop, machineDiscounts, motorDiscounts] of cases) {
    test.each(['MAQUINA', 'MOTOR'])(variant + ' / %s: misma tela y bamba separada', device => {
      const expected = device === 'MOTOR' ? motorDiscounts : machineDiscounts;
      expect(getAnticaDiscounts(variant, device)).toEqual({ fabric: expected[0], roll: expected[1], load: expected[2] });
      for (const separate of [false, true]) {
        const result = calculateAntica({ order: { fabric: 'ACR NEGRO', structureColor: 'BLANCO' }, awning: {
          id: 'a', model: 'ANTICA', of: 'PRUEBA', units: 1, width: 284, projection: 80,
          anticaVariant: variant, anticaSupportHeight: 60, device, crankHeight: 200,
          valanceHeight: bamba, valanceFabric: separate && bamba ? 'ACR GRANATE' : ''
        } }).calculation;
        expect(result.valid).toBe(true);
        expect(result.fabricDrop).toBe(separate ? separateDrop : sameDrop);
        expect(result.fabricWidth).toBeCloseTo(284 - expected[0]);
        expect(result.rollTubeLength).toBeCloseTo(284 - expected[1]);
        expect(result.structureLength).toBeCloseTo(284 - expected[2]);
      }
    });
  }
});
