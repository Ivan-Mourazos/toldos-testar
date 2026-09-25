import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';
import { normalizeXacobeoParameters } from './xacobeoParameters.js';

function awning(patch = {}) {
  return {
    id: 'xac-test',
    of: '0230011',
    model: 'XACOBEO',
    units: 1,
    width: 365,
    projection: 250,
    valanceHeight: 30,
    device: 'MAQ. EXTERIOR',
    crankHeight: 170,
    structureColor: 'BLANCO',
    rotFabric: 'NO',
    rotValance: 'NO',
    valanceCurve: 'RECTA',
    wallType: '',
    ...patch
  };
}

function order(awningPatch = {}, orderPatch = {}) {
  return calculateOrder({
    orderCode: 'AR2603241',
    fabric: 'ACRILI2925P120|||120|||LONA ACRILICA MASACRIL KANSAS 2925',
    sameFabric: true,
    awnings: [awning(awningPatch)],
    ...orderPatch
  });
}

// El perfil EVO 70 blanco solo existe de 700 en RPS (el de 600 no existe): barra y
// tubo de enrolle van a 700 (23/09/2026).
describe('XACOBEO contra hoja XAC y RPS final', () => {
  test('AR2603241: máquina exterior reproduce medidas y reserva completa', () => {
    const result = order();
    const ofBlock = result.ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      model: 'XACOBEO', valid: true, minimumLine: 287,
      // Lona según el manual ART 250 (Q-X01, 25/09/2026): 365 − 11,9. El libro cortaba 352,5.
      fabricWidth: 353.1, fabricDrop: 325, fabricPanels: 4, fabricMl: 13,
      rollTubeLength: 354.1, structureLength: 355.1, stockLength: 700
    });
    expect(ofBlock.materials.map(({ code, quantity }) => ({ code, quantity }))).toEqual([
      { code: 'SOPART250BL16', quantity: 1 },
      { code: 'TURA70HG700C', quantity: 1 },
      { code: 'CASPUNCEJE70MM', quantity: 1 },
      { code: 'PEVO702RBL16700C', quantity: 1 },
      { code: 'BART25BL16250C', quantity: 1 },
      { code: 'TERMINEVOBL16', quantity: 1 },
      { code: 'TAPONEVO7BL16', quantity: 1 },
      { code: 'VARILLAVAINANEG5', quantity: 3.56 },
      { code: 'VARILLAVAINARBLA', quantity: 7.12 },
      { code: 'CASMAQEJE6370MM', quantity: 1 },
      { code: 'MAQMB11L12BLAN', quantity: 1 },
      { code: 'MANIVEBL16170C', quantity: 1 },
      { code: 'ACRILI2925P120', quantity: 13 }
    ]);
  });

  test('AR2501690: motor reproduce el despiece y accesorios RPS', () => {
    const result = order({
      of: '0215523', width: 266, projection: 125, valanceHeight: 12,
      device: 'MOTOR', crankHeight: null, machineSide: 'M.F.DER', sensor: 'SIN SENSOR'
    }, {
      orderCode: 'AR2501690',
      fabric: 'ACRILI2013P120|||120|||LONA ACRILICA MASACRIL TOFFEE 2013'
    });
    const ofBlock = result.ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      valid: true, minimumLine: 157, motorPower: '35/17',
      fabricWidth: 256.1, fabricDrop: 182, fabricMl: 5.46,
      rollTubeLength: 257.1, structureLength: 257.3, stockLength: 700
    });
    expect(ofBlock.materials.map(({ code, quantity }) => ({ code, quantity }))).toEqual([
      { code: 'SOPART250BL16', quantity: 1 },
      { code: 'TURA70HG700C', quantity: 1 },
      { code: 'CASPUNCEJE70MM', quantity: 1 },
      { code: 'PEVO702RBL16700C', quantity: 1 },
      { code: 'BART25BL16125C', quantity: 1 },
      { code: 'TERMINEVOBL16', quantity: 1 },
      { code: 'TAPONEVO7BL16', quantity: 1 },
      { code: 'VARILLAVAINANEG5', quantity: 2.58 },
      { code: 'VARILLAVAINARBLA', quantity: 5.16 },
      { code: 'SOPORTEUNVHIPRO', quantity: 1 },
      { code: 'SUNILUSIO35//17', quantity: 1 },
      { code: 'CORONA LT5070', quantity: 1 },
      { code: 'SITUOIO1PURE', quantity: 1 },
      { code: 'ACRILI2013P120', quantity: 5.46 }
    ]);
    expect(ofBlock.despiece.rows).toContainEqual(expect.objectContaining({ num: 12, reference: 'ADAPTADORESTUBO70', units: 0 }));
  });

  test('máquina interior usa descuentos y casquillo propios', () => {
    const result = order({
      width: 317, projection: 175, valanceHeight: 15,
      device: 'MAQ. INTERIOR', crankHeight: 150
    });
    expect(result.ofs[0].calculation).toMatchObject({
      minimumLine: 207, fabricWidth: 305.4, rollTubeLength: 306.4, structureLength: 307.4
    });
    expect(result.ofs[0].materials).toContainEqual(expect.objectContaining({ code: 'CASMAQEJE5070MM', quantity: 1 }));
  });

  test('los descuentos de lona guardados de antes (12,5 / 12 / 11) pasan a los del manual', () => {
    expect(normalizeXacobeoParameters({ fabricWidthDiscounts: { 'MAQ. EXTERIOR': 12.5, 'MAQ. INTERIOR': 12, MOTOR: 11 } }).fabricWidthDiscounts)
      .toEqual({ 'MAQ. EXTERIOR': 11.9, 'MAQ. INTERIOR': 11.6, MOTOR: 9.9 });
    // Un valor cambiado a mano en Parámetros se respeta.
    expect(normalizeXacobeoParameters({ fabricWidthDiscounts: { 'MAQ. EXTERIOR': 12.2 } }).fabricWidthDiscounts['MAQ. EXTERIOR']).toBe(12.2);
  });

  test('bloquea la línea mínima y permite una excepción técnica explícita', () => {
    const invalid = order({ width: 181, projection: 150, valanceHeight: 0 });
    const overridden = order({
      width: 181, projection: 150, valanceHeight: 0,
      reglasModificadas: true, xacMinimumLineCm: 180
    });

    expect(invalid.ofs[0].calculation).toMatchObject({ valid: false, minimumLine: 187 });
    expect(overridden.ofs[0].calculation).toMatchObject({ valid: true, minimumLine: 180 });
    expect(overridden.diagnostics.some((item) => item.level === 'warn')).toBe(true);
  });
});

describe('XACOBEO · límites del manual ART 250 (22/09/2026)', () => {
  test('con brazo de 2,50 la línea máxima baja a 400 cm', () => {
    const dentro = order({ width: 400, projection: 250 });
    const fuera = order({ width: 430, projection: 250 });
    const conCandado = order({ width: 430, projection: 250, reglasModificadas: true });

    expect(dentro.ofs[0].calculation.valid).toBe(true);
    expect(fuera.ofs[0].calculation.valid).toBe(false);
    expect(fuera.diagnostics.some(({ message }) => message.includes('máximo de 400 cm'))).toBe(true);
    expect(conCandado.ofs[0].calculation.valid).toBe(true);
  });

  test('con brazo de 2,00 sigue llegando a 450 cm', () => {
    expect(order({ width: 450, projection: 200 }).ofs[0].calculation.valid).toBe(true);
  });

  test('la línea mínima es salida + 37 con máquina exterior y + 32 con interior', () => {
    expect(order({ width: 300, projection: 200 }).ofs[0].calculation.minimumLine).toBe(237);
    expect(order({ width: 300, projection: 200, device: 'MAQ. INTERIOR' }).ofs[0].calculation.minimumLine).toBe(232);
  });
});
