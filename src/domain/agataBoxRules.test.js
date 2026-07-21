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
      'TURA80HG600C', 'MAQMB9L13BLANBL16', 'MANIVEBL16200C'
    ]));
  });

  it('reproduce el Ágata Cofre 650x200 con motor SUNEA', () => {
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
      'PRCOMODULBL16700C', 'SOTLMODULBL16', 'PRIMODULBL16700C', 'SUNEAIO55//17'
    ]));
  });

  it('normaliza Semiclose y reproduce el Ágata Semi 1145x350', () => {
    const result = calculateAgataBox({
      order: baseOrder,
      awning: { ...baseAwning, width: 1145, projection: 350, submodel: 'SEMICLOSE', armCount: 4 }
    });
    expect(result.calculation).toMatchObject({
      valid: true, submodel: 'SEMI', supportCount: 11, profileSupportCount: 7,
      fabricWidth: 1132, fabricDrop: 420, motorPower: '100/17'
    });
    expect(result.materials.map((line) => line.code)).toContain('PRSCMODULBL16700C');
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

  it('calcula los soportes observados en producción', () => {
    expect(calculateAgataProfileSupportCount(650)).toBe(4);
    expect(calculateAgataProfileSupportCount(1145)).toBe(7);
    expect(calculateAgataSupportCount({ width: 717, minimumLine: 693.9, armCount: 3, parameters: defaultAgataBoxParameters })).toBe(5);
    expect(calculateAgataSupportCount({ width: 1040, minimumLine: 668.6, armCount: 4, parameters: defaultAgataBoxParameters })).toBe(10);
  });
});
