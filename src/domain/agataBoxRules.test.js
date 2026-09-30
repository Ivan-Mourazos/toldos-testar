import { describe, expect, it } from 'vitest';
import { calculateAgataBox, calculateAgataProfileSupportCount, calculateAgataSupportCount } from './agataBoxRules.js';
import { defaultAgataBoxParameters } from './agataBoxParameters.js';

const baseOrder = {
  sameFabric: true,
  fabric: 'ACRILI2143P120',
  structureColor: 'BLANCO',
  parameters: { agataBox: defaultAgataBoxParameters }
};

const baseAwning = {
  id: 'agata-1', of: '0229035', model: 'AGATA BOX', units: 1,
  width: 717, projection: 400, valanceHeight: 25,
  structureColor: 'BLANCO', device: 'MOTOR', placement: 'FRONTAL',
  submodel: 'OPEN', armCount: 3, sensor: 'SIN SENSOR', wallType: '',
  reglasModificadas: false
};

describe('Ágata Box', () => {
  it('reproduce el Ágata Open 717x400 de producción', () => {
    const result = calculateAgataBox({ order: baseOrder, awning: baseAwning });
    expect(result.calculation).toMatchObject({
      valid: true, submodel: 'OPEN', armCount: 3, supportCount: 5,
      fabricWidth: 704, fabricDrop: 470, fabricMl: 32.9,
      rollTubeLength: 705, squareBarLength: 713.2, loadBarLength: 706,
      diffuserLength: 702.8, liraLength: 709.1, motorPower: '85/17'
    });
    expect(result.materials.map((line) => line.code)).toEqual(expect.arrayContaining([
      'SOBMODULBL16', 'TURA80HG700C', 'PRROMODULBL16700C',
      'BONYXBL16400C', 'SUNILUSIO85//17', 'ACRILI2143P120'
    ]));
  });

  it('reproduce el Ágata Open de máquina 575x400', () => {
    const result = calculateAgataBox({
      order: baseOrder,
      awning: { ...baseAwning, width: 575, device: 'MAQUINA', armCount: 2, crankHeight: 200 }
    });
    expect(result.calculation).toMatchObject({
      valid: true, supportCount: 4, fabricWidth: 560.8, fabricDrop: 470,
      rollTubeLength: 561.8, squareBarLength: 571.2, loadBarLength: 564,
      diffuserLength: 560.8, liraLength: 562.5, motorPower: ''
    });
    expect(result.materials.map((line) => line.code)).toEqual(expect.arrayContaining([
      'TURA80HG600C', 'MAQMB11L12BLAN', 'MANIVEBL16200C'
    ]));
  });

  // Con cofre se consume Sunilus (no Sunea) y la barra es el perfil frontal PRMODUL.
  it('reproduce el Ágata Cofre 650x200 con motor Sunilus', () => {
    const result = calculateAgataBox({
      order: baseOrder,
      awning: { ...baseAwning, width: 650, projection: 200, valanceHeight: 0, submodel: 'COFRE' }
    });
    expect(result.calculation).toMatchObject({
      valid: true, submodel: 'COFRE', supportCount: 6, profileSupportCount: 4,
      fabricWidth: 637, fabricDrop: 245, rollTubeLength: 638,
      enclosureLength: 642.1, motorPower: '55/17'
    });
    expect(result.materials.map((line) => line.code)).toEqual(expect.arrayContaining([
      'PRMODULBL16700C', 'TAPAPFMODULBL16', 'TAPAMODULBL16', 'SOTLMODULBL16', 'PRIMODULBL16700C', 'SUNILUSIO55//17'
    ]));
  });

  it('normaliza Semiclose y reproduce el Ágata Semi 1145x350', () => {
    const result = calculateAgataBox({
      order: baseOrder,
      awning: { ...baseAwning, width: 1145, projection: 350, submodel: 'SEMICLOSE', armCount: 4 }
    });
    expect(result.calculation).toMatchObject({
      valid: true, submodel: 'SEMI', supportCount: 11, profileSupportCount: 7,
      fabricWidth: 1132, fabricDrop: 420, motorPower: '100/12'
    });
    // El semicofre lleva la barra redonda ROND-80 y sus tapas (PRSCMODUL no se consume).
    expect(result.materials.map((line) => line.code)).toEqual(expect.arrayContaining(['PRROMODULBL16700C', 'TARONDMODBL16', 'TAPSMODULBL16']));
    // 4 brazos = 2 juegos de brazos y de soportes de brazo.
    expect(result.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'BONYXBL16350C', quantity: 2 }),
      expect.objectContaining({ code: 'SOBMODULBL16', quantity: 2 })
    ]));
    expect(result.despiece.rows.map((row) => row.num)).toEqual(result.despiece.rows.map((_, index) => index + 1));
  });

  it('bloquea la máquina en Cofre', () => {
    const result = calculateAgataBox({
      order: baseOrder,
      awning: { ...baseAwning, submodel: 'COFRE', device: 'MAQUINA', crankHeight: 200 }
    });
    expect(result.calculation.valid).toBe(false);
    expect(result.diagnostics[0].message).toContain('solo admite accionamiento por motor');
  });

  it('aplica excepciones técnicas individuales', () => {
    const result = calculateAgataBox({
      order: baseOrder,
      awning: {
        ...baseAwning, reglasModificadas: true,
        agataMinimumLineCm: 700, agataSupportCount: 8,
        agataFabricWidthDiscountCm: 10, agataRollDiscountCm: 9,
        agataFabricDropAllowanceCm: 50
      }
    });
    expect(result.calculation).toMatchObject({
      minimumLine: 700, supportCount: 8, fabricWidth: 707,
      rollTubeLength: 708, fabricDrop: 475
    });
    expect(result.diagnostics[0].level).toBe('warn');
  });

  // Taller, 30/09/2026 (Q-AG01): patines siempre, de codo y de horquilla; el kit de unión
  // (regleta y pasadores), con más de 7 m de frente.
  it('reserva siempre los patines de codo y de horquilla', () => {
    const white = calculateAgataBox({ order: baseOrder, awning: { ...baseAwning, width: 650, projection: 200, submodel: 'COFRE' } });
    expect(white.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PABMODULBL16', quantity: 2 }),
      expect.objectContaining({ code: 'PASBMODULBL16', quantity: 2 })
    ]));
    const black = calculateAgataBox({
      order: { ...baseOrder, structureColor: 'NEGRO (R-09011)' },
      awning: { ...baseAwning, structureColor: 'NEGRO (R-09011)', units: 2 }
    });
    expect(black.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PABMODULNEGR', quantity: 4 }),
      expect.objectContaining({ code: 'PASBMODULNE11', quantity: 4 })
    ]));
  });

  it('reserva el kit de unión solo con más de 7 m de frente', () => {
    const codes = (width) => calculateAgataBox({ order: baseOrder, awning: { ...baseAwning, width } }).materials.map((line) => line.code);
    expect(codes(700)).not.toContain('KUNIONMODUL');
    expect(codes(700)).not.toContain('PASADORMODUL');
    const over = calculateAgataBox({ order: baseOrder, awning: { ...baseAwning, width: 717 } });
    expect(over.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'KUNIONMODUL', quantity: 1 }),
      expect.objectContaining({ code: 'PASADORMODUL', quantity: 1 })
    ]));
  });

  // RPS: el Sunilus de 100 solo existe a 12 rpm (SUNILUSIO100//12); el //17 no existe.
  it('con motor de 100 pide el Sunilus 100/12', () => {
    const result = calculateAgataBox({
      order: baseOrder,
      awning: { ...baseAwning, width: 1005, projection: 350, armCount: 4, submodel: 'COFRE' }
    });
    expect(result.calculation.motorPower).toBe('100/12');
    const codes = result.materials.map((line) => line.code);
    expect(codes).toContain('SUNILUSIO100//12');
    expect(codes).not.toContain('SUNILUSIO100//17');
    expect(result.despiece.rows.map((row) => row.reference)).toContain('SUNILUSIO100//12');
    const forced = calculateAgataBox({ order: baseOrder, awning: { ...baseAwning, motorPower: '100/17' } });
    expect(forced.materials.map((line) => line.code)).toContain('SUNILUSIO100//12');
  });

  it('calcula los soportes observados en producción', () => {
    expect(calculateAgataProfileSupportCount(650)).toBe(4);
    expect(calculateAgataProfileSupportCount(1145)).toBe(7);
    expect(calculateAgataSupportCount({ width: 717, minimumLine: 693.9, armCount: 3, parameters: defaultAgataBoxParameters })).toBe(5);
    expect(calculateAgataSupportCount({ width: 1040, minimumLine: 668.6, armCount: 4, parameters: defaultAgataBoxParameters })).toBe(10);
  });
});
