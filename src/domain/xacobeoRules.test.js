import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';

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

describe('XACOBEO contra hoja XAC y RPS final', () => {
  test('AR2603241: máquina exterior reproduce medidas y reserva completa', () => {
    const result = order();
    const ofBlock = result.ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      model: 'XACOBEO', valid: true, minimumLine: 282,
      fabricWidth: 352.5, fabricDrop: 325, fabricPanels: 4, fabricMl: 13,
      rollTubeLength: 354.1, structureLength: 355.1, stockLength: 600
    });
    expect(ofBlock.materials.map(({ code, quantity }) => ({ code, quantity }))).toEqual([
      { code: 'SOPART250BL16', quantity: 1 },
      { code: 'TURA70HG600C', quantity: 1 },
      { code: 'CASPUNCE', quantity: 1 },
      { code: 'PEVO702RBL16600C', quantity: 1 },
      { code: 'BART25BL16250C', quantity: 1 },
      { code: 'CASMAQEJE6370MM', quantity: 1 },
      { code: 'MAQMB9L13BLANBL16', quantity: 1 },
      { code: 'MANIVEBL16170C', quantity: 1 },
      { code: 'ACRILI2925P120', quantity: 13 }
    ]);
  });

  test('AR2501690: motor reproduce el despiece y accesorios RPS', () => {
    const result = order({
      of: '0215523', width: 266, projection: 125, valanceHeight: 12,
      device: 'MOTOR', crankHeight: null, sensor: 'SIN SENSOR'
    }, {
      orderCode: 'AR2501690',
      fabric: 'ACRILI2013P120|||120|||LONA ACRILICA MASACRIL TOFFEE 2013'
    });
    const ofBlock = result.ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      valid: true, minimumLine: 157, motorPower: '35/17',
      fabricWidth: 255, fabricDrop: 182, fabricMl: 5.46,
      rollTubeLength: 257.1, structureLength: 257.3, stockLength: 600
    });
    expect(ofBlock.materials.map(({ code, quantity }) => ({ code, quantity }))).toEqual([
      { code: 'SOPART250BL16', quantity: 1 },
      { code: 'TURA70HG600C', quantity: 1 },
      { code: 'CASPUNCE', quantity: 1 },
      { code: 'PEVO702RBL16600C', quantity: 1 },
      { code: 'BART25BL16125C', quantity: 1 },
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
      minimumLine: 212, fabricWidth: 305, rollTubeLength: 306.4, structureLength: 307.4
    });
    expect(result.ofs[0].materials).toContainEqual(expect.objectContaining({ code: 'CASMAQEJE5070MM', quantity: 1 }));
  });

  test('bloquea la línea mínima y permite una excepción técnica explícita', () => {
    const invalid = order({ width: 181, projection: 150, valanceHeight: 0 });
    const overridden = order({
      width: 181, projection: 150, valanceHeight: 0,
      reglasModificadas: true, xacMinimumLineCm: 180
    });

    expect(invalid.ofs[0].calculation).toMatchObject({ valid: false, minimumLine: 182 });
    expect(overridden.ofs[0].calculation).toMatchObject({ valid: true, minimumLine: 180 });
    expect(overridden.diagnostics.some((item) => item.level === 'warn')).toBe(true);
  });
});
