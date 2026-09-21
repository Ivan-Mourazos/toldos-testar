import { describe, expect, it } from 'vitest';
import { groupProblems, isPrefixOfExisting, referenceStatus } from './rps-references.mjs';

const maestro = new Map([
  ['BONYXNE11250CM', null],
  ['PEVO80NE11600C', new Date('2023-06-22')],
  ['TURA80HG600C', null]
]);

describe('referenceStatus', () => {
  it('distingue inexistente, de baja y vigente', () => {
    expect(referenceStatus('BONYXNE11250C', maestro)).toBe('no existe');
    expect(referenceStatus('PEVO80NE11600C', maestro)).toMatch(/^de baja/);
    expect(referenceStatus('TURA80HG600C', maestro)).toBe('');
  });
});

describe('isPrefixOfExisting', () => {
  it('un literal que solo es el principio de un código compuesto no es una referencia', () => {
    expect(isPrefixOfExisting('TURA80HG', maestro)).toBe(true);
    expect(isPrefixOfExisting('CASPUNCE', maestro)).toBe(false);
  });
});

describe('groupProblems', () => {
  it('agrupa por modelo y solo cuenta como fallo los lacados habituales', () => {
    const found = new Map([
      ['BONYXNE11250C', new Set(['ARZUA PRO/NEGRO (R-09011)', 'PERLA BOX/NEGRO (R-09011)'])],
      ['PEVO80NE11600C', new Set(['ARZUA PRO/NEGRO (R-09011)'])],
      ['SOPAR350BR28', new Set(['ARZUA PRO/BRONCE (R-00028)'])],
      ['TURA80HG600C', new Set(['ARZUA PRO/BLANCO'])]
    ]);
    const { porModelo, fallanHabituales } = groupProblems({ found, maestro, aceptadas: new Map() });
    expect(porModelo['ARZUA PRO'].habituales.map((p) => p.code)).toEqual(['BONYXNE11250C', 'PEVO80NE11600C']);
    expect(porModelo['ARZUA PRO'].otros.map((p) => p.code)).toEqual(['SOPAR350BR28']);
    expect(porModelo['PERLA BOX'].habituales.map((p) => p.code)).toEqual(['BONYXNE11250C']);
    expect(fallanHabituales).toBe(3);
  });

  it('una referencia aceptada con motivo no falla', () => {
    const found = new Map([['BONYXNE11250C', new Set(['ARZUA PRO/NEGRO (R-09011)'])]]);
    const aceptadas = new Map([['BONYXNE11250C', 'motivo']]);
    expect(groupProblems({ found, maestro, aceptadas }).fallanHabituales).toBe(0);
  });
});
