import { describe, expect, test } from 'vitest';
import { normalizeOrder } from './validation.js';
import { calculateOrder } from './rules.js';
import { sampleAwnings, SAMPLE_FABRIC } from '../../scripts/lib/model-samples.mjs';

// Iván, 22/09/2026 (Cambio de tela y Cortina) y 08/10/2026 (el resto): los 5 cm de remate solo
// se suman cuando la bamba va en la misma tela. Sin bamba, la caída de tela no los lleva. Entre
// bamba 0 y bamba de 10 cm la caída sube 15: los 10 de la bamba y los 5 del remate.
// El Antica sigue su propio libro y el modo de brazo vertical, su fórmula: quedan fuera.
const fabricDrop = (awning, valanceHeight) => {
  const order = normalizeOrder({
    orderCode: 'X', customer: 'X', technician: 'IVÁN', fabric: SAMPLE_FABRIC, sameFabric: true, structureColor: 'BLANCO',
    awnings: [{ ...awning, valanceHeight, hasValance: valanceHeight > 0, valanceCurve: valanceHeight > 0 ? 'RECTA' : '', rotValance: 'NO', valanceFabric: '' }]
  });
  const calculation = calculateOrder(order).ofs[0].calculation;
  return Number(calculation.fabricUsageDrop ?? calculation.fabricDrop);
};

describe('sin bamba no se suman los 5 cm de remate', () => {
  test.each([
    'ARZUA PRO', 'GALICIA', 'XACOBEO', 'PUNTO RECTO', 'MONOBLOCK 350', 'PERLA BOX', 'CORAL BOX', 'CUARZO BOX',
    'AMBAR BOX', 'AGATA BOX', 'MAXISCREEM', 'ELECTRA', 'CORTINA', 'SELENA', 'CAMBIO TELA'
  ])('%s', (model) => {
    const [{ awning }] = sampleAwnings(model);
    const withValance = fabricDrop(awning, 10);
    const without = fabricDrop(awning, 0);
    expect(Math.round((withValance - without) * 10) / 10).toBe(15);
  });

  test('Arzúa de 300 de salida sin bamba: salida + 40', () => {
    const [{ awning }] = sampleAwnings('ARZUA PRO').filter(({ awning: a }) => a.projection === 300);
    expect(fabricDrop(awning, 0)).toBe(340);
  });
});
