import { describe, expect, it } from 'vitest';
import { changedRuleSections, normalizeRuleParameters, ruleParameterOverrides } from './ruleParameters.js';

describe('parámetros de reglas', () => {
  it('sin nada guardado son los del código', () => {
    expect(normalizeRuleParameters().fabricJobs.dropAllowanceByModel['CAMBIO ANTICA']).toBe(65);
    expect(ruleParameterOverrides(normalizeRuleParameters())).toEqual({});
  });

  it('solo guarda las secciones que difieren del código', () => {
    const edited = normalizeRuleParameters({ cortina: { fabricDropAllowanceCm: 50 } });
    expect(Object.keys(ruleParameterOverrides(edited))).toEqual(['cortina']);
  });

  it('dice qué secciones cambian', () => {
    const before = normalizeRuleParameters();
    const after = normalizeRuleParameters({ cortina: { fabricDropAllowanceCm: 50 } });
    expect(changedRuleSections(before, after)).toEqual(['cortina']);
  });

  it('acepta el alias antiguo storbox400 para Perla Box', () => {
    const edited = normalizeRuleParameters({ storbox400: { standardMaxWidth: 590 } });
    expect(edited.perlaBox.standardMaxWidth).toBe(590);
  });
});
