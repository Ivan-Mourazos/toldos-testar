import { describe, expect, it } from 'vitest';
import type { RuleParameters } from './types';
import {
  defaultRuleParameters,
  PARAMETERS_STORAGE_KEY,
  readStoredParameters,
  serializeParameterOverrides
} from './parameterStorage';

const storage = (items: Record<string, unknown>) => ({
  getItem: (key: string) => (key in items ? JSON.stringify(items[key]) : null)
});

describe('parámetros guardados en el navegador', () => {
  // Así estaban los dos puestos de OT el 21/09/2026: congelados con los valores
  // de fábrica de julio, porque la web los escribía enteros al arrancar.
  const staleV2 = {
    cambioCortina: { fabricDropAllowanceCm: 45, bottomDeductionCm: 18, seamAllowanceCm: 0, seamBaseCm: 0 },
    fabricJobs: { dropAllowanceByModel: { 'CAMBIO TELA': 40, ENROLLABLE: 25, BAMBALINA: 0, 'CAMBIO ANTICA': 25 } },
    drawings: { byModel: { 'ARZUA PRO': [{ id: 'd1', label: 'Dibujo propio', image: 'data:image/png;base64,AAAA', conditions: {} }] } }
  };

  it('descarta los valores viejos de la clave v2 y conserva solo los dibujos', () => {
    const parameters = readStoredParameters(storage({ 'toldos-testar-parameters-v2': staleV2 }));
    expect(parameters.cambioCortina.seamAllowanceCm).toBe(2.2);
    expect(parameters.cambioCortina.seamBaseCm).toBe(7);
    expect(parameters.fabricJobs.dropAllowanceByModel['CAMBIO ANTICA']).toBe(65);
    expect(parameters.drawings).toEqual(defaultRuleParameters({ drawings: staleV2.drawings as unknown as RuleParameters['drawings'] }).drawings);
  });

  it('sin nada guardado usa los valores del código', () => {
    expect(readStoredParameters(storage({}))).toEqual(defaultRuleParameters());
  });

  it('solo guarda las secciones que el usuario ha cambiado', () => {
    expect(serializeParameterOverrides(defaultRuleParameters())).toBe('{}');
    const edited = defaultRuleParameters();
    edited.cortina = { ...edited.cortina, fabricDropAllowanceCm: 50 };
    expect(Object.keys(JSON.parse(serializeParameterOverrides(edited)))).toEqual(['cortina']);
  });

  it('lo no guardado en v3 sigue los valores del código', () => {
    const edited = defaultRuleParameters();
    edited.cortina = { ...edited.cortina, fabricDropAllowanceCm: 50 };
    const saved = JSON.parse(serializeParameterOverrides(edited));
    const parameters = readStoredParameters(storage({ [PARAMETERS_STORAGE_KEY]: saved }));
    expect(parameters.cortina.fabricDropAllowanceCm).toBe(50);
    expect(parameters.cambioCortina).toEqual(defaultRuleParameters().cambioCortina);
  });

  it('un almacenamiento ilegible no rompe la web', () => {
    const broken = { getItem: () => '{no es json' };
    expect(readStoredParameters(broken)).toEqual(defaultRuleParameters());
  });
});
