import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';

function awning(patch = {}) {
  return {
    id: 'maxis-test', of: '0229970', model: 'MAXISCREEM', units: 2,
    width: 323, projection: 272, valanceHeight: 0,
    submodel: 'COFRE CON CABLE', device: 'MOTOR',
    placement: 'TECHO', structureColor: 'LACADO ESPECIAL',
    rotFabric: 'NO', rotValance: '', wallType: 'DIRECTA A PARED',
    sensor: 'SIN SENSOR', ...patch
  };
}

function order(awningPatch = {}, orderPatch = {}) {
  return calculateOrder({
    orderCode: 'AR2603216', sameFabric: true,
    fabric: 'ACRILI1072P120|||120|||LONA ACRILICA MASACRIL HORMIGON 1072',
    awnings: [awning(awningPatch)], ...orderPatch
  });
}

describe('MAXISCREEM / Diana vertical contra Excel y RPS', () => {
  test('AR2603216: cofre con cable, motor y dos unidades', () => {
    const ofBlock = order().ofs[0];
    expect(ofBlock.calculation).toMatchObject({
      valid: true, submodel: 'COFRE CON CABLE', guideType: 'CABLE',
      fabricWidth: 310.4, fabricDrop: 317, fabricPanels: 3, fabricMl: 19.02,
      rollTubeLength: 313.3, structureLength: 311.4, boxProfileLength: 318,
      guideLength: 321, rollStockLength: 600, profileStockLength: 500,
      motorPower: '15/17'
    });
    expect(ofBlock.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SOPMAXSCRBOX', quantity: 2 }),
      expect.objectContaining({ code: 'TURA80HG600C', quantity: 2 }),
      expect.objectContaining({ code: 'PECARMAX', quantity: 2 }),
      expect.objectContaining({ code: 'PERPRLON', quantity: 2 }),
      expect.objectContaining({ code: 'CABLEMAXIS3MM25M', quantity: 2 }),
      expect.objectContaining({ code: 'SUNILUSIO15//17', quantity: 2 }),
      expect.objectContaining({ code: 'ACRILI1072P120', quantity: 19.02 }),
      expect.objectContaining({ code: 'ANCLHSTM12145', quantity: 8 })
    ]));
  });

  test('sin cofre y con máquina aplica los descuentos históricos', () => {
    const ofBlock = order({
      of: '0215897', units: 1, width: 335, projection: 280,
      submodel: 'CON CABLE', device: 'MAQUINA', crankHeight: 170,
      placement: 'FRONTAL', structureColor: 'NEGRO (R-09011)', wallType: ''
    }).ofs[0];
    expect(ofBlock.calculation).toMatchObject({
      valid: true, fabricWidth: 322, fabricDrop: 325,
      rollTubeLength: 324.9, structureLength: 325, boxProfileLength: 0
    });
    expect(ofBlock.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SOPMAXSCRNE11', quantity: 1 }),
      expect.objectContaining({ code: 'PECARMAXNE11500C', quantity: 1 }),
      expect.objectContaining({ code: 'CASMAQEJE6378MM', quantity: 1 }),
      expect.objectContaining({ code: 'MANIVENE11170C', quantity: 1 })
    ]));
    expect(ofBlock.materials.some((line) => line.code.startsWith('PERPRLON'))).toBe(false);
  });

  test('cambia cable por varilla según la variante', () => {
    const ofBlock = order({ submodel: 'COFRE CON VARILLA' }).ofs[0];
    expect(ofBlock.calculation).toMatchObject({ valid: true, guideType: 'VARILLA' });
    expect(ofBlock.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'VARILLAMAXSCR8MM', quantity: 2 })
    ]));
    expect(ofBlock.materials.some((line) => line.code === 'CABLEMAXIS3MM25M')).toBe(false);
  });

  test('la variante solo cofre no reserva guías', () => {
    const ofBlock = order({ submodel: 'COFRE' }).ofs[0];
    expect(ofBlock.calculation).toMatchObject({ valid: true, guideType: '' });
    expect(ofBlock.materials.some((line) => ['CABLEMAXIS3MM25M', 'VARILLAMAXSCR8MM'].includes(line.code))).toBe(false);
  });

  test('rechaza frente superior a 500 salvo excepción técnica', () => {
    const rejected = order({ units: 1, width: 548, projection: 180, submodel: 'CON CABLE' });
    expect(rejected.ofs[0].calculation.valid).toBe(false);
    expect(rejected.ofs[0].materials).toEqual([]);

    const accepted = order({
      units: 1, width: 548, projection: 180, submodel: 'CON CABLE',
      reglasModificadas: true
    });
    expect(accepted.ofs[0].calculation).toMatchObject({ valid: true, profileStockLength: 700 });
    expect(accepted.diagnostics[0]).toMatchObject({ level: 'warn' });
  });

  test('exige elegir una variante', () => {
    const result = order({ submodel: '' });
    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.diagnostics[0].message).toContain('variante');
  });
});
