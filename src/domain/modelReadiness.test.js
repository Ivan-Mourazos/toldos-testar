import { describe, expect, test } from 'vitest';
import { fabricOnlyModelNames, fullAwningModelNames } from './modelBehavior.js';
import { modelReadiness, modelReadinessText, modelsWithPendingNotes } from './modelReadiness.js';

describe('estado de cada modelo en los selectores', () => {
  test('lo pendiente solo nombra modelos del catálogo', () => {
    const catalog = [...fullAwningModelNames, ...fabricOnlyModelNames];
    for (const model of modelsWithPendingNotes) expect(catalog).toContain(model);
  });

  test('Arzúa y los trabajos de tela están completos; Antica no', () => {
    for (const model of ['ARZUA PRO', 'XACOBEO', 'CAMBIO TELA', 'BAMBALINA', 'CAMBIO ANTICA']) expect(modelReadiness(model).ready).toBe(true);
    expect(modelReadiness('ANTICA').ready).toBe(false);
  });

  // Taller, 30/09/2026: con sus respuestas ya aplicadas, estos modelos no tienen dudas propias.
  test('Galicia, Electra, Diana, Monoblock 350 y Punto Recto quedan completos', () => {
    for (const model of ['GALICIA', 'ELECTRA', 'MAXISCREEM', 'MONOBLOCK 350', 'PUNTO RECTO']) expect(modelReadiness(model).ready).toBe(true);
  });

  // Iván, 02/10/2026: el motor del Ágata (siempre Sunea, Q-AG02) y el de Iris y HERA ya están hechos.
  test('Ágata, Iris, HERA y Cortina quedan completos', () => {
    for (const model of ['AGATA BOX', 'IRIS', 'HERA', 'CORTINA']) expect(modelReadiness(model).ready).toBe(true);
  });

  test('la explicación dice qué falta', () => {
    expect(modelReadinessText('SELENA')).toContain('motor');
    expect(modelReadinessText('XACOBEO')).toMatch(/^Completo/);
  });
});
