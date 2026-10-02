import { describe, expect, it } from 'vitest';
import { PARAMETER_LABELS, scopeChangeSummary } from './parameterChanges.js';
import { COMMON_FABRIC_SCOPE } from './parameterScopes.js';
import { normalizeRuleParameters } from './ruleParameters.js';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const image2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nVQAAAAASUVORK5CYII=';
const p = normalizeRuleParameters();

describe('resumen de lo que cambió en un modelo', () => {
  it('valores sueltos: antes → después, con coma decimal', () => {
    expect(scopeChangeSummary(p, { ...p, cortina: { ...p.cortina, fabricDropAllowanceCm: 50.5 } }, 'CORTINA')).toEqual(['Margen de caída: 45 → 50,5']);
    expect(scopeChangeSummary(p, { ...p, fabricJobs: { ...p.fabricJobs, dropAllowanceByModel: { ...p.fabricJobs.dropAllowanceByModel, ENROLLABLE: 30 } } }, 'ENROLLABLE')).toEqual(['Margen de caída: 25 → 30']);
    expect(scopeChangeSummary(p, { ...p, fabricJobs: { ...p.fabricJobs, valanceExtraCm: 8 } }, COMMON_FABRIC_SCOPE)).toEqual(['Remate de bambalina: 5 → 8']);
    expect(scopeChangeSummary(p, { ...p, cortina: { ...p.cortina, stockLengths: [500] } }, 'CORTINA')[0]).toMatch(/^Largos de barra: .+ → 500$/);
  });

  it('tablas: solo que cambiaron', () => {
    const widthDiscounts = Object.fromEntries(Object.entries(p.galicia.widthDiscounts).map(([key, value]) => [
      key,
      typeof value === 'object' && value !== null ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, typeof v === 'number' ? v + 1 : v])) : (typeof value === 'number' ? value + 1 : value)
    ]));
    expect(scopeChangeSummary(p, { ...p, galicia: { ...p.galicia, widthDiscounts } }, 'GALICIA')).toEqual(['Descuentos del tubo de carga: cambiados']);
  });

  it('dibujos: añadidos, quitados, cambiados y de orden', () => {
    const d = { id: 'g', name: 'General', usage: 'auto', enabled: true, image, conditions: [] };
    const con = (list) => ({ ...p, drawings: { byModel: { ENROLLABLE: list } } });
    expect(scopeChangeSummary(p, con([d]), 'ENROLLABLE')).toEqual(['Dibujo «General» añadido']);
    expect(scopeChangeSummary(con([d]), p, 'ENROLLABLE')).toEqual(['Dibujo «General» quitado']);
    expect(scopeChangeSummary(con([d]), con([{ ...d, name: 'Plano', usage: 'manual', image: image2, enabled: false }]), 'ENROLLABLE')).toEqual([
      'Dibujo «Plano»: nombre «General» → «Plano»; imagen cambiada; desactivado; Automático (siempre) → Solo a mano'
    ]);
    expect(scopeChangeSummary(con([d]), con([{ ...d, conditions: [{ field: 'fabricDiagramOverride', value: 'CAMBIO ENROLLABLE' }] }]), 'ENROLLABLE')).toEqual([
      'Dibujo «General»: Automático (siempre) → Automático cuando Trabajo especial = Cambio enrollable'
    ]);
    const e = { ...d, id: 'e', name: 'Otro' };
    expect(scopeChangeSummary(con([d, e]), con([e, d]), 'ENROLLABLE')).toEqual(['Orden de los dibujos cambiado']);
  });

  it('cada valor de las fichas tiene su nombre en castellano', () => {
    const missing = [];
    for (const [section, values] of Object.entries(p)) {
      if (section === 'drawings') continue;
      for (const key of Object.keys(values)) if (!PARAMETER_LABELS[key]) missing.push(`${section}.${key}`);
    }
    expect(missing).toEqual([]);
  });
});
