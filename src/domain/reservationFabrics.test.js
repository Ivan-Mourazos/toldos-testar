import { describe, expect, test } from 'vitest';
import {
  collectFabricMaterialKeys,
  excludeFabricCodes,
  findNonAcrylicReservationFabrics,
  roundFabricMeters
} from './reservationFabrics.js';
import { calculateOrder } from './rules.js';

describe('tratamiento de telas en la reserva', () => {
  test.each([
    [6.32222, 6.5],
    [6.5, 6.5],
    [6.500001, 7],
    [17.7, 18],
    [0.01, 0.5]
  ])('redondea %s ml hacia arriba en tramos de medio metro', (input, expected) => {
    expect(roundFabricMeters(input)).toBe(expected);
  });

  test('reconoce la tela por los códigos calculados sin confundir otros materiales', () => {
    const ofs = [{
      of: '0230126',
      calculation: { fabricCode: 'TELA-RPS-NUEVA' },
      materials: [
        { code: 'TELA-RPS-NUEVA', quantity: 6.32222 },
        { code: 'PERFIL-ESPECIAL', quantity: 6.32222 }
      ]
    }];
    expect(collectFabricMaterialKeys(ofs)).toEqual(new Set(['0230126||TELA-RPS-NUEVA']));
  });

  test('detecta PVC de RPSNext y no avisa por una acrílica', () => {
    const order = {
      sameFabric: false,
      awnings: [
        { id: 'a', of: '1', fabric: 'ALPHAAM03P250|||250|||LONA PVC|||PLASTICA (LONA)', valanceFabric: '' },
        { id: 'b', of: '2', fabric: 'ACRILI2170P120|||120|||LONA ACRILICA|||ACRÍLICAS', valanceFabric: '' }
      ]
    };
    const calculation = { ofs: [
      { awningId: 'a', of: '1', calculation: { fabricCode: 'ALPHAAM03P250', fabricDescription: 'LONA PVC' } },
      { awningId: 'b', of: '2', calculation: { fabricCode: 'ACRILI2170P120', fabricDescription: 'LONA ACRILICA' } }
    ] };

    expect(findNonAcrylicReservationFabrics(order, calculation)).toEqual([{
      code: 'ALPHAAM03P250', description: 'LONA PVC', material: 'PLASTICA (LONA)', ofs: ['1']
    }]);
  });

  test('al rechazar la tela conserva la estructura y elimina OFs que solo contenían tela', () => {
    const reservation = {
      orderCode: 'AR2600000',
      ofs: [
        { of: '1', materials: [{ code: 'ALPHAAM03P250', quantity: 6.5 }, { code: 'SOPORTE', quantity: 2 }] },
        { of: '2', materials: [{ code: 'ALPHAAM03P250', quantity: 3 }] }
      ]
    };
    expect(excludeFabricCodes(reservation, [{ code: 'ALPHAAM03P250' }]).ofs).toEqual([
      { of: '1', materials: [{ code: 'SOPORTE', quantity: 2 }] }
    ]);
  });

  test('cambio de tela con bamba de PVC: solo se pregunta por la bamba y la lona acrílica se reserva (Q-C06)', () => {
    const order = {
      orderCode: 'AR26QC06',
      sameFabric: true,
      fabric: 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL NEGRO 2170|||ACRILICA (LONA)',
      awnings: [{
        id: 'a', of: '0224622', model: 'CAMBIO TELA', units: 1,
        width: 300, projection: 250, valanceHeight: 25,
        rotFabric: 'NO', rotValance: 'NO', valanceCurve: 'RECTA',
        valanceFabric: 'ALPHANA04P250|||250|||PVC 580 NARANJA|||PLASTICA (LONA)'
      }]
    };
    const calculation = calculateOrder(order);
    expect(calculation.diagnostics.filter((item) => item.level === 'error')).toEqual([]);

    const fabrics = findNonAcrylicReservationFabrics(order, calculation);
    expect(fabrics.map((fabric) => fabric.code)).toEqual(['ALPHANA04P250']);

    const kept = excludeFabricCodes({ orderCode: order.orderCode, ofs: calculation.ofs }, fabrics);
    expect(kept.ofs[0].materials.map((line) => line.code)).toEqual(['ACRILI2170P120']);
  });
});
