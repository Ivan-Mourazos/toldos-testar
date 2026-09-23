import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';

function awning(patch = {}) {
  return {
    id: 'mono-test', of: '0230266', model: 'MONOBLOCK 350', units: 1,
    width: 695, projection: 275, valanceHeight: 25,
    device: 'MAQUINA', armCount: 3, crankHeight: 200,
    placement: 'TECHO', structureColor: 'BLANCO', tubeLoad: 'TUBO DE CARGA EVO 80',
    rotFabric: 'NO', rotValance: 'NO', valanceCurve: 'RECTA', wallType: '', ...patch
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
    // OF 0230266, consumo real (23/09/2026): las mismas piezas, salvo el casquillo de
    // máquina (eje 63, Q-PR02) y el apoyo del currón, que no se imputó.
    expect(ofBlock.materials.map(({ code, quantity }) => `${code} x${quantity}`)).toEqual([
      'SOPBRAMONOBBL16 x1', 'SOPBRAMONOBDBL16 x1', 'TURA80HG700C x1', 'CASPUNCEJE78MM x1',
      'PEVO80BL16700C x1', 'TAPONEVO8BL16 x1', 'BONYXBL16275C x1', 'BONYXDBL16275C x1',
      'TERMINEVOBL16 x1', 'TERMINEVOUNDBL16 x1', 'VARILLAVAINANEG5 x6.8', 'VARILLAVAINARBLA x13.7',
      'TA3BLAN4X4700C x1', 'TAPTUBO40BL16 x2', 'SOPFTECMONOBBL16 x4', 'SOPMAPUMONOBL16 x1',
      'APOIN40BL16 x1', 'CASMAQEJE5078MM x1', 'MAQMB11L12BLAN x1', 'MANIVEBL16200C x1',
      'ACRILI2245P120 x20.7'
    ]);
    expect(ofBlock.despiece.rows.map((row) => row.num)).toEqual(ofBlock.despiece.rows.map((_, index) => index + 1));
  });

  // OF 0229011: se fabricó con Univers 280 y motor 55/17 con el kit del Arzúa.
  test('AR2602642: motor, dos brazos, Univers y P801 de 600', () => {
    const ofBlock = order({
      of: '0229011', width: 488, projection: 300, valanceHeight: 25,
      device: 'MOTOR', armCount: 2, crankHeight: null, machineSide: 'M.F.DER',
      placement: 'FRONTAL', structureColor: 'NEGRO (R-09011)', tubeLoad: 'TUBO DE CARGA UNIVERS 280'
    }, { fabric: 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL NEGRO 2170' }).ofs[0];
    expect(ofBlock.calculation).toMatchObject({
      valid: true, minimumLine: 362, maximumLine: 600,
      supportCount: 6, motorPower: '55/17',
      fabricWidth: 475, fabricDrop: 370, fabricMl: 18.5,
      rollTubeLength: 476, structureLength: 476.5, stockLength: 600
    });
    expect(ofBlock.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SOPBRAMONOBNE11', quantity: 1 }),
      expect.objectContaining({ code: 'BONYXNE11300C', quantity: 1 }),
      expect.objectContaining({ code: 'PUNI280NE05600C', quantity: 1 }),
      expect.objectContaining({ code: 'TAPOPLUN280NE11', quantity: 1 }),
      expect.objectContaining({ code: 'TAPTUBO40NE05', quantity: 2 }),
      expect.objectContaining({ code: 'SOPFROMONOBLNE11', quantity: 3 }),
      expect.objectContaining({ code: 'RUEDAMOT801MEC', quantity: 1 }),
      expect.objectContaining({ code: 'SUNILUSIO55//17', quantity: 1 }),
      expect.objectContaining({ code: 'CORONALT60', quantity: 1 }),
      expect.objectContaining({ code: 'SITUOIO1PURE', quantity: 1 })
    ]));
    expect(ofBlock.materials.some((m) => /^BONYXD|^SOPBRAMONOBD|^TERMINEVOUND/.test(m.code))).toBe(false);
  });

  // Por encima de 725 se empalma: tubo de 800 y dos barras de carga y de 40×40.
  test('4 brazos y 972 de frente: dos juegos de brazos y barras empalmadas', () => {
    const ofBlock = order({ width: 972, projection: 250, armCount: 4, placement: 'FRONTAL' }).ofs[0];
    const lines = ofBlock.materials.map(({ code, quantity }) => `${code} x${quantity}`);
    expect(ofBlock.calculation.valid).toBe(true);
    expect(lines).toEqual(expect.arrayContaining([
      'BONYXBL16250C x2', 'SOPBRAMONOBBL16 x2', 'TERMINEVOBL16 x2',
      'TURA80HG500C x2', 'PEVO80BL16500C x2', 'TA3BLAN4X4500C x2', 'SOPFROMONOBLBL16 x5', 'APOIN40BL16 x2'
    ]));
    expect(ofBlock.calculation.motorPower).toBe('');
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

  test('con la barra justo por encima de 700 (frente 720) se usa una de 700, como se consumió', () => {
    const lines = order({ width: 720, projection: 350, armCount: 3, placement: 'FRONTAL' }).ofs[0].materials.map((m) => m.code);
    expect(lines).toEqual(expect.arrayContaining(['TURA80HG800C', 'PEVO80BL16700C', 'TA3BLAN4X4700C']));
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
