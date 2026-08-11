import { describe, expect, test } from 'vitest';
import {
  applyDeploymentFeaturesToCatalog,
  assertDeploymentModelsEnabled,
  assertLegacyExportsEnabled,
  findDisabledModel
} from './deploymentFeatures.js';

describe('funciones habilitadas por entorno', () => {
  const catalog = { models: [{ code: 'ARZUA PRO' }, { code: 'HERA' }] };

  test('desarrollo conserva HERA en el catálogo y en los cálculos', () => {
    const result = applyDeploymentFeaturesToCatalog(catalog, { heraEnabled: true });
    expect(result.models.map((model) => model.code)).toEqual(['ARZUA PRO', 'HERA']);
    expect(result.features).toEqual({ heraEnabled: true });
    expect(() => assertDeploymentModelsEnabled({ awnings: [{ model: 'HERA' }] }, { heraEnabled: true })).not.toThrow();
  });

  test('producción oculta HERA y rechaza también sus alias', () => {
    const result = applyDeploymentFeaturesToCatalog(catalog, { heraEnabled: false });
    expect(result.models.map((model) => model.code)).toEqual(['ARZUA PRO']);
    expect(result.features).toEqual({ heraEnabled: false });
    expect(findDisabledModel({ order: { awnings: [{ model: 'HERA56' }] } }, { heraEnabled: false })).toBe('HERA');
    expect(() => assertDeploymentModelsEnabled(
      { order: { awnings: [{ model: 'ROLL-SYSTEM' }] } },
      { heraEnabled: false }
    )).toThrow(/desactivado temporalmente/);
  });

  test('producción permite el resto de modelos', () => {
    expect(findDisabledModel({ awnings: [{ model: 'ARZUA PRO' }] }, { heraEnabled: false })).toBeNull();
  });

  test('producción cierra las exportaciones antiguas que no contienen el modelo', () => {
    const realReservationShape = { orderCode: 'AR2600001', ofs: [{ of: '0230001', materials: [] }] };
    expect(findDisabledModel(realReservationShape, { heraEnabled: false })).toBeNull();
    expect(() => assertLegacyExportsEnabled({ legacyExportsEnabled: false })).toThrow(/desactivada en producción/);
    expect(() => assertLegacyExportsEnabled({ legacyExportsEnabled: true })).not.toThrow();
  });
});
