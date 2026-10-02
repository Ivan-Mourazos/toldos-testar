import { describe, expect, it } from 'vitest';
import { scopeHistory, scopeVersions } from './parameterHistory.js';
import { normalizeRuleParameters, ruleParameterOverrides } from './ruleParameters.js';

const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const ov = (saved) => ruleParameterOverrides(normalizeRuleParameters(saved));
const dibujo = { id: 'general', name: 'General', enabled: true, image, conditions: [] };
// El historial de antes: un renglón por guardado, con todos los valores tras el cambio.
const antiguo = [
  { version: 1, updatedAt: '2026-09-25T08:00:00.000Z', updatedBy: 'IVÁN', reason: 'Cortina a 50', changedSections: ['cortina'], overrides: ov({ cortina: { fabricDropAllowanceCm: 50 } }) },
  { version: 2, updatedAt: '2026-09-26T08:00:00.000Z', updatedBy: 'ALBERTO', reason: 'Dibujo del enrollable y cortina a 55', changedSections: ['cortina', 'drawings'], overrides: ov({ cortina: { fabricDropAllowanceCm: 55 }, drawings: { byModel: { ENROLLABLE: [dibujo] } } }) }
];

describe('historial por modelo', () => {
  it('reparte el historial de antes por modelo según lo que cambió', () => {
    expect(scopeHistory(antiguo, 'CORTINA').map((e) => [e.versionAmbito, e.motivo, e.resumen])).toEqual([
      [2, 'Dibujo del enrollable y cortina a 55', ['Margen de caída: 50 → 55']],
      [1, 'Cortina a 50', ['Margen de caída: 45 → 50']]
    ]);
    expect(scopeHistory(antiguo, 'ENROLLABLE')).toEqual([expect.objectContaining({
      ambito: 'ENROLLABLE', versionAmbito: 1, version: 2, updatedBy: 'ALBERTO', resumen: ['Dibujo «General» añadido'], anterior: true
    })]);
    expect(scopeHistory(antiguo, 'ARZUA PRO')).toEqual([]);
  });

  it('la versión de cada modelo sale del historial de antes', () => {
    expect(scopeVersions(antiguo)).toEqual({
      CORTINA: { version: 2, updatedAt: '2026-09-26T08:00:00.000Z', updatedBy: 'ALBERTO', motivo: 'Dibujo del enrollable y cortina a 55' },
      ENROLLABLE: { version: 1, updatedAt: '2026-09-26T08:00:00.000Z', updatedBy: 'ALBERTO', motivo: 'Dibujo del enrollable y cortina a 55' }
    });
  });

  it('los renglones de ahora traen su modelo, versión y resumen, y se mezclan con los de antes', () => {
    const nuevo = {
      ambito: 'ENROLLABLE', versionAmbito: 2, version: 3, updatedAt: '2026-10-02T08:00:00.000Z', updatedBy: 'IVÁN', motivo: '',
      resumen: ['Dibujo «General» quitado'], reason: '', changedSections: ['drawings'], overrides: ov({ cortina: { fabricDropAllowanceCm: 55 } })
    };
    const lineas = [...antiguo, nuevo, null, 'roto'];
    expect(scopeHistory(lineas, 'ENROLLABLE').map((e) => e.versionAmbito)).toEqual([2, 1]);
    expect(scopeHistory(lineas, 'ENROLLABLE', 1)).toEqual([expect.objectContaining({ motivo: '', resumen: ['Dibujo «General» quitado'] })]);
    expect(scopeVersions(lineas).ENROLLABLE.version).toBe(2);
    expect(scopeHistory(lineas, 'CORTINA')).toHaveLength(2);
  });
});
