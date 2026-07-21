import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';

function awning(patch = {}) {
  return {
    id: 'mono-test', of: '0230266', model: 'MONOBLOCK 350', units: 1,
    width: 695, projection: 275, valanceHeight: 25,
    device: 'MAQUINA', armCount: 3, crankHeight: 200,
    placement: 'TECHO', structureColor: 'BLANCO',
    rotFabric: 'NO', rotValance: 'NO', wallType: '', ...patch
  };
}

function order(awningPatch = {}, orderPatch = {}) {
  return calculateOrder({
    orderCode: 'AR2603393', sameFabric: true,
    fabric: 'ACRILI2245P120|||120|||LONA ACRILICA MASACRIL BOTELLA 2245',
    awnings: [awning(awningPatch)], ...orderPatch
  });
}

describe('MONOBLOCK 350 contra hoja MON.350 y RPS', () => {
  test('AR2603393: máquina, tres brazos y colocación a techo', () => {
    const ofBlock = order().ofs[0];
    expect(ofBlock.calculation).toMatchObject({
      valid: true, minimumLine: 495, maximumLine: 900,
      armCount: 3, requiredArmCount: 3, supportCount: 8, curronCount: 1,
      fabricWidth: 680.8, fabricDrop: 345, fabricPanels: 6, fabricMl: 20.7,
      rollTubeLength: 681.8, structureLength: 682.8, squareBarLength: 694, stockLength: 700
    });
    expect(ofBlock.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SOPBRAMONOBBL16', quantity: 3 }),
      expect.objectContaining({ code: 'TURA80HG700C', quantity: 1 }),
      expect.objectContaining({ code: 'PEVO80BL16700C', quantity: 1 }),
      expect.objectContaining({ code: 'BONYXBL16275C', quantity: 3 }),
      expect.objectContaining({ code: 'TA3BLAN4X4700C', quantity: 1 }),
      expect.objectContaining({ code: 'SOPFTEMONUNDBL16', quantity: 8 }),
      expect.objectContaining({ code: 'MANIVEBL16200C', quantity: 1 }),
      expect.objectContaining({ code: 'ACRILI2245P120', quantity: 20.7 }),
      expect.objectContaining({ code: 'CURRONMOPLBLAN', quantity: 1 })
    ]));
  });

  test('AR2602642: motor, dos brazos y P801 de 600', () => {
    const ofBlock = order({
      of: '0229011', width: 488, projection: 300, valanceHeight: 25,
      device: 'MOTOR', armCount: 2, crankHeight: null,
      placement: 'FRONTAL', structureColor: 'NEGRO (R-09011)'
    }, { fabric: 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL NEGRO 2170' }).ofs[0];
    expect(ofBlock.calculation).toMatchObject({
      valid: true, minimumLine: 362, maximumLine: 600,
      supportCount: 6, motorPower: '50/12',
      fabricWidth: 475, fabricDrop: 370, fabricMl: 18.5,
      rollTubeLength: 476, structureLength: 476.5, stockLength: 600
    });
    expect(ofBlock.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SOPBRAMONOBNE11', quantity: 2 }),
      expect.objectContaining({ code: 'RUEDAMOT78', quantity: 1 }),
      expect.objectContaining({ code: 'SUNILUSIO50//12', quantity: 1 }),
      expect.objectContaining({ code: 'CORONALT6078', quantity: 1 }),
      expect.objectContaining({ code: 'SITUOIO1PURE', quantity: 1 })
    ]));
  });

  test('rechaza un frente fuera del rango del número de brazos', () => {
    const result = order({ width: 695, armCount: 2 });
    expect(result.ofs[0].calculation).toMatchObject({ valid: false, maximumLine: 600 });
    expect(result.ofs[0].materials).toEqual([]);
    expect(result.diagnostics[0].message).toContain('entre 337 y 600');
  });

  test('permite ajustar reglas y soportes como excepción técnica', () => {
    const result = order({
      width: 695, armCount: 2, reglasModificadas: true,
      monoblockMaximumLineCm: 700,
      monoblockSupportCount: 7,
      monoblockFabricWidthDiscountCm: 10
    });
    expect(result.ofs[0].calculation).toMatchObject({
      valid: true, maximumLine: 700, supportCount: 7, fabricWidth: 685
    });
    expect(result.diagnostics[0]).toMatchObject({ level: 'warn' });
  });

  test('sin bamba conserva los 5 cm de remate de la fórmula MON.350', () => {
    const ofBlock = order({ width: 520, projection: 150, valanceHeight: 0, armCount: 2, placement: 'FRONTAL' }).ofs[0];
    expect(ofBlock.calculation).toMatchObject({ valid: true, fabricDrop: 195 });
  });

  test('una bamba de tela distinta se reserva como material separado', () => {
    const ofBlock = order({
      width: 520, projection: 150, valanceHeight: 25, armCount: 2, placement: 'FRONTAL',
      valanceFabric: 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL NEGRO 2170'
    }).ofs[0];
    expect(ofBlock.calculation).toMatchObject({
      fabricDrop: 190, mainFabricMl: 9.5,
      valanceFabricCode: 'ACRILI2170P120', valanceFabricMl: 1.5, valanceDrop: 30
    });
    expect(ofBlock.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ACRILI2245P120', quantity: 9.5 }),
      expect.objectContaining({ code: 'ACRILI2170P120', quantity: 1.5 })
    ]));
  });
});
