import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';

function awning(patch = {}) {
  return {
    id: 'point-test', of: '0227745', model: 'PUNTO RECTO', units: 1,
    width: 256, projection: 100, valanceHeight: 25,
    device: 'MAQUINA', armCount: 2, crankHeight: 150,
    structureColor: 'BLANCO', rotFabric: 'NO', rotValance: 'NO', valanceCurve: 'RECTA',
    wallType: '', ...patch
  };
}

function order(awningPatch = {}, orderPatch = {}) {
  return calculateOrder({
    orderCode: 'AR2601952', sameFabric: true,
    fabric: 'ACRILI1533P120|||120|||LONA ACRILICA MASACRIL SIROCO 1533',
    awnings: [awning(awningPatch)], ...orderPatch
  });
}

describe('PUNTO RECTO contra hoja y reservas reales', () => {
  test('máquina P701 reproduce medidas, piezas y cantidades', () => {
    const ofBlock = order().ofs[0];
    expect(ofBlock.calculation).toMatchObject({
      model: 'PUNTO RECTO', valid: true, rollSystem: 'P701',
      armCount: 2, requiredArmCount: 2,
      fabricWidth: 244, fabricDrop: 226.4, fabricPanels: 3, fabricMl: 6.792641,
      rollTubeLength: 245, structureLength: 245, stockLength: 500
    });
    expect(ofBlock.materials.map(({ code, quantity }) => ({ code, quantity }))).toEqual([
      { code: 'SOPUNI3AGUBL16', quantity: 1 },
      { code: 'TURA70HG500C', quantity: 1 },
      { code: 'CASPUNCEJE70MM', quantity: 1 },
      // El Univers 270 casi no existe en RPS; lo que se consume es el 280.
      { code: 'PUNI280BL10400C', quantity: 1 },
      { code: 'TAPOPLUN280BL16', quantity: 1 },
      { code: 'BPRT07BL16100C', quantity: 2 },
      { code: 'CASMAQEJE5070MM', quantity: 1 },
      { code: 'MAQMB11L12BLAN', quantity: 1 },
      { code: 'MANIVEBL16150C', quantity: 1 },
      { code: 'VARILLAVAINANEG5', quantity: 2.44 },
      { code: 'VARILLAVAINARBLA', quantity: 4.88 },
      { code: 'ACRILI1533P120', quantity: 6.792641 }
    ]);
    expect(ofBlock.despiece.rows).toContainEqual(expect.objectContaining({ name: 'MANIVELA LUXE BLANCA 150', reference: 'MANIVEBL16150C' }));
    expect(ofBlock.despiece.rows).toContainEqual(expect.objectContaining({ name: 'JGO BRAZOS PRT 07', reference: 'BPRT07BL16100C' }));
    expect(ofBlock.despiece.rows.map((row) => row.num)).toEqual(ofBlock.despiece.rows.map((_, index) => index + 1));
  });

  test('motor P801 usa tres brazos, motor 35/17 y accesorios Ø78', () => {
    const ofBlock = order({
      of: '0219000', width: 600, armCount: 3, device: 'MOTOR',
      crankHeight: null, machineSide: 'M.F.DER', sensor: 'MOVIMIENTO', valanceHeight: 0
    }).ofs[0];
    expect(ofBlock.calculation).toMatchObject({
      valid: true, rollSystem: 'P801', armCount: 3, requiredArmCount: 3,
      motorPower: '35/17', fabricWidth: 589,
      rollTubeLength: 590, structureLength: 590, stockLength: 600
    });
    expect(ofBlock.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'TURA80HG600C', quantity: 1 }),
      expect.objectContaining({ code: 'BPRT07BL16100C', quantity: 3 }),
      expect.objectContaining({ code: 'RUEDAMOT801MEC', quantity: 1 }),
      expect.objectContaining({ code: 'CORONALT5078', quantity: 1 }),
      expect.objectContaining({ code: 'SUNILUSIO35//17', quantity: 1 }),
      expect.objectContaining({ code: 'SOPORTEUNVHIPRO', quantity: 1 }),
      expect.objectContaining({ code: 'SITUOIO1PURE', quantity: 1 }),
      expect.objectContaining({ code: 'EOLIS3DIO', quantity: 1 })
    ]));
  });

  test('más de 400 cm no admite solo dos brazos', () => {
    const result = order({ width: 524, projection: 80, armCount: 2 });
    expect(result.ofs[0].calculation).toMatchObject({ valid: false, requiredArmCount: 3 });
    expect(result.ofs[0].materials).toEqual([]);
    expect(result.diagnostics[0].message).toContain('al menos 3 brazos');
  });

  test('la excepción técnica permite reproducir una caída modificada', () => {
    const result = order({
      width: 292.3, projection: 120, valanceHeight: 0,
      reglasModificadas: true,
      pointFabricDropMultiplier: 2,
      pointFabricDropAllowanceCm: 40
    });
    const ofBlock = result.ofs[0];
    expect(ofBlock.calculation).toMatchObject({ valid: true, fabricWidth: 280.3, fabricDrop: 280, fabricMl: 8.4 });
    expect(result.diagnostics[0]).toMatchObject({ level: 'warn' });
  });

  test('calcula la bajada vertical 170° con salida por dos y margen 40', () => {
    const result = order({
      projection: 120,
      valanceHeight: 0,
      dropArmMode: 'VERTICAL_170'
    });
    const ofBlock = result.ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      valid: true,
      fabricDrop: 280,
      fabricUsageDrop: 280,
      dropArmMode: 'VERTICAL_170',
      dropArmAngle: 170,
      dropArmVerticalAllowanceCm: 40,
      pointFabricDropMultiplier: 2,
      pointFabricDropAllowanceCm: 40
    });
    expect(ofBlock.description).toContain('BAJADA VERTICAL 170°');
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      level: 'warn',
      message: expect.stringContaining('corte de paño 280 cm')
    }));
  });

  test('aplica el margen vertical configurado en parámetros', () => {
    const ofBlock = order(
      { projection: 120, valanceHeight: 0, dropArmMode: 'VERTICAL_170' },
      { parameters: { puntoRecto: { verticalFabricDropAllowanceCm: 45 } } }
    ).ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      fabricDrop: 285,
      dropArmVerticalAllowanceCm: 45
    });
  });

  test('en vertical suma la bambalina integrada', () => {
    const ofBlock = order({
      projection: 120,
      valanceHeight: 25,
      dropArmMode: 'VERTICAL_170'
    }).ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      fabricDrop: 305,
      fabricPanels: 3,
      fabricMl: 9.15,
      reservedFabricMl: 9.15
    });
    expect(ofBlock.materials).toContainEqual(expect.objectContaining({
      code: 'ACRILI1533P120', quantity: 9.15
    }));
  });

  test('en vertical no suma la bambalina cuando se corta en otro tejido', () => {
    const ofBlock = order({
      projection: 120,
      valanceHeight: 25,
      valanceFabric: 'ACRILI2143P120',
      dropArmMode: 'VERTICAL_170'
    }).ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      fabricDrop: 280,
      fabricMl: 8.4,
      reservedFabricMl: 8.4,
      valanceDrop: 30,
      valanceFabricMl: 0.9,
      reservedValanceFabricMl: 0.9,
      totalReservedFabricMl: 9.3
    });
    expect(ofBlock.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'ACRILI1533P120', quantity: 8.4 }),
      expect.objectContaining({ code: 'ACRILI2143P120', quantity: 0.9, description: expect.stringContaining('BAMBA') })
    ]));
    expect(ofBlock.description).toContain('bambalina separada de 30 cm');
    expect(ofBlock.description).not.toContain('bambalina incluida');
  });

  test('la bajada vertical no permite omitir el tercer brazo', () => {
    const result = order({
      width: 524,
      projection: 120,
      armCount: 2,
      dropArmMode: 'VERTICAL_170'
    });

    expect(result.ofs[0].calculation).toMatchObject({ valid: false, requiredArmCount: 3 });
    expect(result.ofs[0].materials).toEqual([]);
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      level: 'error',
      message: expect.stringContaining('al menos 3 brazos')
    }));
  });
});

describe('PUNTO RECTO · brazos que existen en RPS (22/09/2026)', () => {
  test('en negro no hay brazo de 100: el toldo avisa en vez de reservarlo', () => {
    const negro = order({ projection: 100, structureColor: 'NEGRO (R-09011)' });
    expect(negro.ofs[0].calculation.valid).toBe(false);
    expect(negro.ofs[0].materials).toEqual([]);
    expect(negro.diagnostics.some(({ message }) => /brazo/i.test(message))).toBe(true);
  });

  test('en negro sí hay de 90, y el código lleva el sufijo CM de RPS', () => {
    const negro = order({ projection: 90, structureColor: 'NEGRO (R-09011)' });
    expect(negro.ofs[0].calculation.valid).toBe(true);
    expect(negro.ofs[0].materials.map(({ code }) => code)).toContain('BPRT07NE1190CM');
  });

  test('en blanco están todas las salidas de la tarifa', () => {
    for (const projection of [70, 80, 90, 100, 120, 140, 160]) {
      const result = order({ projection, width: 256, armCount: 2 });
      expect(result.ofs[0].calculation.valid).toBe(true);
    }
  });
});
