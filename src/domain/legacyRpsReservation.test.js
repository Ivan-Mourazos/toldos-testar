import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';
import { normalizeReservation } from './validation.js';

const FABRIC_120 = 'ACRILI2170P120|||120|||LONA ACRILICA MASACRIL NEGRO 2170|||ACRILICA (LONA)';
const FABRIC_250 = 'ALPHANA04P250|||250|||PVC 580 NARANJA|||PLASTICA (LONA)';

describe('reserva RPS separada del planteamiento visible', () => {
  test.each([
    { width: 113, units: 1, main: FABRIC_120, valance: FABRIC_250, mainReserved: 2.8, valanceReserved: 0.3 },
    { width: 113, units: 2, main: FABRIC_250, valance: FABRIC_120, mainReserved: 2.8, valanceReserved: 1.2 },
    { width: 243, units: 2, main: FABRIC_250, valance: FABRIC_120, mainReserved: 5.6, valanceReserved: 1.8 }
  ])('usa por separado los rollos del cuerpo y la bamba: $width cm, $units unidad(es)', ({
    width, units, main, valance, mainReserved, valanceReserved
  }) => {
    const ofBlock = calculateOrder(order({ width, units, main, valance })).ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      mainFabricPanels: 1,
      reservedFabricMl: mainReserved,
      reservedValanceFabricMl: valanceReserved
    });
    expect(material(ofBlock, fabricCode(main), false)?.quantity).toBe(mainReserved);
    expect(material(ofBlock, fabricCode(valance), true)?.quantity).toBe(valanceReserved);
  });

  test('si cuerpo y bamba usan la misma referencia suma primero y redondea una sola vez', () => {
    const calculation = calculateOrder(order({ width: 113, units: 1, main: FABRIC_120, valance: FABRIC_120 }));
    const sourceMaterials = calculation.ofs[0].materials;

    expect(sourceMaterials.map(({ quantity }) => quantity)).toEqual([2.8, 0.6]);
    const reservation = normalizeReservation({ orderCode: 'AR-RPS-BORDE', ofs: calculation.ofs });
    expect(reservation.ofs[0].materials).toEqual([
      expect.objectContaining({ code: 'ACRILI2170P120', quantity: 3.5 })
    ]);
  });
});

function order({ width, units, main, valance }) {
  return {
    orderCode: 'AR-RPS-BORDE',
    sameFabric: false,
    awnings: [{
      id: 'rps-edge', of: '0399998', model: 'CAMBIO TELA', units,
      width, projection: 100, valanceHeight: 25,
      fabric: main, valanceFabric: valance
    }]
  };
}

function fabricCode(selection) {
  return selection.split('|||')[0];
}

function material(ofBlock, code, valance) {
  return ofBlock.materials.find((line) => line.code === code
    && String(line.description || '').trim().endsWith('· BAMBA') === valance);
}
