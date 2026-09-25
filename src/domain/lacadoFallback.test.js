import { describe, expect, test } from 'vitest';
import { resolveLacadoCode } from './lacadoFallback.js';
import { sampleAwnings } from '../../scripts/lib/model-samples.mjs';

describe('lacados poco habituales: la pieza que no existe en su color va en blanco para lacar', () => {
  test.each([
    ['SOPAR350GR22', 'GR22', 'SOPAR350BL16'],
    ['TERMINEVOBR28', 'BR28', 'TERMINEVOBL16'],
    ['SOPARTGLBR28', 'BR28', 'SOPARTGLBL16'],
    // El Univers 280 blanco vigente es BL10, no BL16.
    ['PUNI280BR28600C', 'BR28', 'PUNI280BL10600C']
  ])('%s en %s se reserva como %s', (code, suffix, white) => {
    expect(resolveLacadoCode(code, suffix)).toEqual({ code: white, painted: true });
  });

  test.each([['BONYX150C', 'BONYXBL16150C'], ['BONYXD150C', 'BONYXDBL16150C'], ['PEVO80600C', 'PEVO80BL16600C']])(
    'con lacado especial, %s se reserva como %s',
    (code, white) => expect(resolveLacadoCode(code, '')).toEqual({ code: white, painted: true })
  );

  test('una pieza que existe en su color no se toca', () => {
    expect(resolveLacadoCode('SOPAR350NE11', 'NE11')).toEqual({ code: 'SOPAR350NE11', painted: false });
  });

  test('en blanco o con piezas de otra familia no cambia nada', () => {
    expect(resolveLacadoCode('SOPAR350GR22', 'BL16').painted).toBe(false);
    expect(resolveLacadoCode('ACRILI2170P120', 'GR22')).toEqual({ code: 'ACRILI2170P120', painted: false });
  });

  test('si tampoco existe en blanco, se deja como está', () => {
    expect(resolveLacadoCode('PEVO80BR28400C', 'BR28')).toEqual({ code: 'PEVO80BR28400C', painted: false });
  });

  test('un Arzúa en gris 7022 reserva soportes y terminales en blanco y lo avisa', () => {
    const [{ result }] = sampleAwnings('ARZUA PRO', 'GRIS (R-07022)');
    const codes = result.ofs[0].materials.map((line) => line.code);
    expect(codes).toContain('SOPAR350BL16');
    expect(codes).not.toContain('SOPAR350GR22');
    expect(result.ofs[0].despiece.rows.map((row) => row.reference)).not.toContain('SOPAR350GR22');
    const warning = result.diagnostics.find((item) => /lacar fuera/.test(item.message));
    expect(warning?.level).toBe('warning');
    expect(warning.message).toContain('SOPAR350BL16');
  });

  test('en blanco y en negro el Arzúa no lleva aviso de lacado', () => {
    for (const lacado of ['BLANCO', 'NEGRO (R-09011)']) {
      const [{ result }] = sampleAwnings('ARZUA PRO', lacado);
      expect(result.diagnostics.some((item) => /lacar fuera/.test(item.message))).toBe(false);
    }
  });
});
