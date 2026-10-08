import { describe, expect, test } from 'vitest';
import { resolveLacadoCode } from './lacadoFallback.js';
import { sampleAwnings } from '../../scripts/lib/model-samples.mjs';
import { onyxArmExists } from './arzuaAvailability.js';
import { galiciaSingleArmExists } from './galiciaSupportPieces.js';
import { normalizeOrder } from './validation.js';
import { calculateOrder } from './rules.js';

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
    expect(warning?.level).toBe('warn');
    expect(warning.message).toContain('SOPAR350BL16');
  });

  // Iván, 08/10/2026 (AR2604964): un brazo Onyx que no existe en el lacado no bloquea el toldo:
  // va en blanco y se manda a lacar, como el resto de piezas (Q-A02).
  test('el brazo que no existe en el color se reserva en blanco; si tampoco existe en blanco, bloquea', () => {
    expect(onyxArmExists('GT16', 200)).toBe(true);
    expect(galiciaSingleArmExists('GT16', 200)).toBe(true);
    expect(onyxArmExists('GT16', 425)).toBe(false);
  });

  test('AR2604964: Perla Box en gris 7016 texturado con brazo de 200, el brazo en blanco para mandar a lacar', () => {
    const order = normalizeOrder({
      orderCode: 'AR2604964', customer: 'PRUEBA', technician: 'IVÁN', sameFabric: true,
      fabric: 'ACRILI2018P120|||120|||LONA ACRILICA MASACRIL 300 :AZUL 2018 :120 AN|||ACRÍLICAS',
      awnings: [{
        id: 'a', of: '0232902', model: 'PERLA BOX', units: 1, width: 259, projection: 200, armCount: 2,
        structureColor: 'GRIS 7016 MATE TEXT.', device: 'MAQUINA', machineSide: 'M.F.DER', crankHeight: 150,
        placement: 'FRONTAL', rotFabric: 'NO', hasValance: false, valanceHeight: 0
      }]
    });
    const result = calculateOrder(order);
    const [of] = result.ofs;
    expect(of.calculation.valid).toBe(true);
    const codes = of.materials.map((line) => line.code);
    expect(codes).toContain('BONYXBL16200C');
    expect(codes).not.toContain('BONYXGT16200C');
    expect(codes.some((code) => code.includes('GT16'))).toBe(true);
    const arm = of.despiece.rows.find((row) => row.reference === 'BONYXBL16200C');
    expect(arm.name).toContain('MANDAR A LACAR');
    const warning = result.diagnostics.find((item) => /lacar fuera/.test(item.message));
    expect(warning.message).toContain('BONYXBL16200C');
  });

  test('AR2604956: Diana vertical en gris 7016 texturado, perfiles de carga y de cofre en blanco para lacar', () => {
    const order = normalizeOrder({
      orderCode: 'AR2604956', customer: 'PRUEBA', technician: 'IVÁN', sameFabric: true,
      fabric: 'ACRILI2018P120|||120|||LONA ACRILICA MASACRIL 300 :AZUL 2018 :120 AN|||ACRÍLICAS',
      awnings: [{
        id: 'a', of: '0232867', model: 'MAXISCREEM', units: 1, width: 184, projection: 255, submodel: 'COFRE CON CABLE',
        structureColor: 'GRIS 7016 MATE TEXT.', device: 'MOTOR', machineSide: 'M.F.DER', sensor: 'SIN SENSOR',
        placement: 'FRONTAL', rotFabric: 'NO', hasValance: false, valanceHeight: 0
      }]
    });
    const result = calculateOrder(order);
    const [of] = result.ofs;
    expect(of.calculation.valid).toBe(true);
    const codes = of.materials.map((line) => line.code);
    expect(codes.some((code) => /^PECARMAXBL16\d+C$/.test(code))).toBe(true);
    expect(codes.some((code) => /^PERPRLONBL16\d+C$/.test(code))).toBe(true);
    expect(codes.some((code) => /^(PECARMAX|PERPRLON)GT16/.test(code))).toBe(false);
    expect(of.despiece.rows.filter((row) => /^(PECARMAX|PERPRLON)BL16/.test(row.reference || '')).every((row) => row.name.includes('MANDAR A LACAR'))).toBe(true);
  });

  test('en blanco y en negro el Arzúa no lleva aviso de lacado', () => {
    for (const lacado of ['BLANCO', 'NEGRO (R-09011)']) {
      const [{ result }] = sampleAwnings('ARZUA PRO', lacado);
      expect(result.diagnostics.some((item) => /lacar fuera/.test(item.message))).toBe(false);
    }
  });
});
