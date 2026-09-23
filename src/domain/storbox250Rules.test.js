import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';

function awning(patch = {}) {
  return {
    id: 'cuarzo-test',
    of: '0229835',
    model: 'CUARZO BOX',
    units: 1,
    width: 254,
    projection: 125,
    valanceHeight: 0,
    device: 'MAQUINA',
    crankHeight: 100,
    structureColor: 'BLANCO',
    rotFabric: 'NO',
    wallType: '',
    ...patch
  };
}

function order(awningPatch = {}, orderPatch = {}) {
  return calculateOrder({
    orderCode: 'AR2603104',
    fabric: 'ACRILI2817P120|||120|||LONA ACRILICA MASACRIL 300 HELSINKI 2817',
    sameFabric: true,
    awnings: [awning(awningPatch)],
    ...orderPatch
  });
}

describe('CUARZO BOX contra ST250 y RPS final', () => {
  test('AR2603104: máquina 254x125 reproduce estructura, tela y reserva', () => {
    const result = order({ wallType: 'DIRECTA A PARED' });
    const ofBlock = result.ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      model: 'CUARZO BOX', valid: true, minimumLine: 159,
      fabricWidth: 235.5, fabricDrop: 170, fabricMl: 5.1,
      rollTubeLength: 236.5, structureLength: 238.4,
      stockLength: 450, boxProtectorDiscountCm: 16.6
    });
    // OF 0229835, consumo real (23/09/2026): soporte, casquillo de eje 50 Ø70, máquina y
    // manivela, sin CASPLAS.
    expect(ofBlock.materials.map(({ code, quantity }) => ({ code, quantity }))).toEqual([
      { code: 'SOSTORBOX25BL16', quantity: 1 },
      { code: 'TURA70HG600C', quantity: 1 },
      { code: 'CASPUNCEJE70MM', quantity: 1 },
      { code: 'PSBOX250BL16450C', quantity: 1 },
      { code: 'BART25BL16125C', quantity: 1 },
      { code: 'VARILLAVAINARBLA', quantity: 2.4 },
      { code: 'CASMAQEJE5070MM', quantity: 1 },
      { code: 'MAQMB11L12BLAN', quantity: 1 },
      { code: 'MANIVEBL16100C', quantity: 1 },
      { code: 'ACRILI2817P120', quantity: 5.1 },
      { code: 'ANCLHSTM12145', quantity: 4 }
    ]);
    expect(ofBlock.despiece.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ reference: 'TURA70HG600C', length: 236.5 }),
      expect.objectContaining({ reference: 'PSBOX250BL16450C', length: 238.4 }),
      expect.objectContaining({ name: 'BARRA DE CARGA STORBOX 250', length: 237.4 })
    ]));
    expect(ofBlock.despiece.rows.map((row) => row.num)).toEqual(ofBlock.despiece.rows.map((_, index) => index + 1));
  });

  test('AR2602264: motor 261x200 reproduce descuentos y accesorios RPS', () => {
    const result = order({
      of: '0228312', width: 261, projection: 200,
      device: 'MOTOR', crankHeight: null, machineSide: 'M.F.DER', sensor: 'SIN SENSOR'
    }, {
      orderCode: 'AR2602264',
      fabric: 'ACRILI2143P120|||120|||LONA ACRILICA MASACRIL 300 MARFIL 2143'
    });
    const ofBlock = result.ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      valid: true, minimumLine: 234, motorPower: '35/17',
      fabricWidth: 240.8, fabricDrop: 245, fabricMl: 7.35,
      rollTubeLength: 241.8, structureLength: 245.4,
      boxProtectorDiscountCm: 16.6
    });
    // OF 0228312, consumo real: motor Sunea 35/17 con rueda Hi68 y corona centrada Ø70.
    expect(ofBlock.materials.map(({ code, quantity }) => ({ code, quantity }))).toEqual([
      { code: 'SOSTORBOX25BL16', quantity: 1 },
      { code: 'TURA70HG600C', quantity: 1 },
      { code: 'CASPUNCEJE70MM', quantity: 1 },
      { code: 'PSBOX250BL16450C', quantity: 1 },
      { code: 'BART25BL16200C', quantity: 1 },
      { code: 'VARILLAVAINARBLA', quantity: 2.5 },
      { code: 'RUEDAMOTHI68', quantity: 1 },
      { code: 'SUNEAIO35//17', quantity: 1 },
      { code: 'CORONACENMEC70', quantity: 1 },
      { code: 'SOPORTEUNVHIPRO', quantity: 1 },
      { code: 'SITUOIO1PURE', quantity: 1 },
      { code: 'ACRILI2143P120', quantity: 7.35 }
    ]);
  });

  test('aplica la línea mínima del ST250 y permite excepción técnica', () => {
    const invalid = order({ width: 233, projection: 200 });
    const overridden = order({
      width: 233, projection: 200, reglasModificadas: true,
      boxMinimumLineCm: 230
    });

    expect(invalid.ofs[0].calculation).toMatchObject({ valid: false, minimumLine: 234 });
    expect(overridden.ofs[0].calculation).toMatchObject({ valid: true, minimumLine: 230 });
    expect(overridden.diagnostics.some((item) => item.level === 'warn')).toBe(true);
  });
});
