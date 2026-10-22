import { describe, expect, test } from 'vitest';
import {
  applyDeploymentFeaturesToCatalog,
  assertDeploymentModelsEnabled,
  assertLegacyExportsEnabled,
  findDisabledModel,
  PUERTAS_EN_PAUSA,
  respuestaPuertasEnPausa
} from './deploymentFeatures.js';

describe('funciones habilitadas por entorno', () => {
  const catalog = { models: [{ code: 'ARZUA PRO' }, { code: 'HERA' }] };

  test('desarrollo conserva HERA en el catálogo y en los cálculos', () => {
    const result = applyDeploymentFeaturesToCatalog(catalog, { heraEnabled: true });
    expect(result.models.map((model) => model.code)).toEqual(['ARZUA PRO', 'HERA']);
    expect(result.features).toEqual({ heraEnabled: true, puertasEnabled: false });
    expect(() => assertDeploymentModelsEnabled({ awnings: [{ model: 'HERA' }] }, { heraEnabled: true })).not.toThrow();
  });

  test('producción oculta HERA y rechaza también sus alias', () => {
    const result = applyDeploymentFeaturesToCatalog(catalog, { heraEnabled: false });
    expect(result.models.map((model) => model.code)).toEqual(['ARZUA PRO']);
    expect(result.features).toEqual({ heraEnabled: false, puertasEnabled: false });
    expect(findDisabledModel({ order: { awnings: [{ model: 'HERA56' }] } }, { heraEnabled: false })).toBe('HERA');
    expect(() => assertDeploymentModelsEnabled(
      { order: { awnings: [{ model: 'ROLL-SYSTEM' }] } },
      { heraEnabled: false }
    )).toThrow(/desactivado temporalmente/);
  });

  test('puertas en pausa: el catálogo lo dice, la lista sale vacía y lo demás no se atiende', () => {
    expect(applyDeploymentFeaturesToCatalog(catalog, { heraEnabled: true, puertasEnabled: true }).features).toEqual({ heraEnabled: true, puertasEnabled: true });
    expect(respuestaPuertasEnPausa({ puertasEnabled: true }, { method: 'POST', path: '/pedidos' })).toBeNull();
    expect(respuestaPuertasEnPausa({ puertasEnabled: false }, { method: 'GET', path: '/pedidos' })).toEqual({ status: 200, body: { reviews: [] } });
    for (const [method, path] of [['POST', '/pedidos'], ['GET', '/pedidos/AR2699601'], ['GET', '/rps-pedido'], ['POST', '/corte/vista-previa']]) {
      expect(respuestaPuertasEnPausa({ puertasEnabled: false }, { method, path })).toEqual({ status: 404, body: { error: PUERTAS_EN_PAUSA } });
    }
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
