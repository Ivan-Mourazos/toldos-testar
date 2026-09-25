import { describe, expect, test } from 'vitest';
import { fabricOnlyModelNames, fullAwningModelNames } from './modelBehavior.js';
import { modelReadiness, modelReadinessText, modelsWithPendingNotes } from './modelReadiness.js';

describe('estado de cada modelo en los selectores', () => {
  test('lo pendiente solo nombra modelos del catálogo', () => {
    const catalog = [...fullAwningModelNames, ...fabricOnlyModelNames];
    for (const model of modelsWithPendingNotes) expect(catalog).toContain(model);
  });

  test('Arzúa y los trabajos de tela están completos; Antica y Galicia no', () => {
    for (const model of ['ARZUA PRO', 'XACOBEO', 'CAMBIO TELA', 'BAMBALINA', 'CAMBIO ANTICA']) expect(modelReadiness(model).ready).toBe(true);
    for (const model of ['ANTICA', 'GALICIA']) expect(modelReadiness(model).ready).toBe(false);
  });

  test('la explicación dice qué falta', () => {
    expect(modelReadinessText('GALICIA')).toContain('MB-11 o Geiger');
    expect(modelReadinessText('XACOBEO')).toMatch(/^Completo/);
  });
});
