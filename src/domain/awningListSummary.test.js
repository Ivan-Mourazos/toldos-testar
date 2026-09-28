import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';
import { summarizeAwnings } from './awningListSummary.js';

const base = { orderCode: 'AR-LISTA', fabric: 'ACR NEGRO', sameFabric: true, structureColor: 'BLANCO' };
const cortina = {
  id: 'c', of: '0200001', model: 'CORTINA', units: 1, width: 300, projection: 200, valanceHeight: 0,
  device: 'MAQ. INTERIOR', crankHeight: 170, machineSide: 'M.F.DER', placement: 'FRONTAL', rotFabric: 'NO',
  curtainHasWindow: false, curtainFinish: 'NORMAL'
};

describe('estado de cada toldo para la lista de Pedidos', () => {
  test('un toldo bien sale como ok y uno fuera de estándar con excepción como aviso', () => {
    const order = {
      ...base,
      awnings: [cortina, { ...cortina, id: 'd', of: '0200002', width: 598, reglasModificadas: true, curtainFabricDeductionCm: 18, curtainFabricWidthDiscountCm: 12, curtainRollTubeDiscountCm: 11, curtainLoadProfileDiscountCm: 11 }]
    };
    const list = summarizeAwnings(order, calculateOrder(order));
    expect(list.map(({ letter, state }) => `${letter}${state}`)).toEqual(['Aok', 'Bwarn']);
    expect(list[1]).toMatchObject({ model: 'CORTINA', of: '0200002' });
    expect(list[1].notes[0]).toMatch(/^CORTINA fuera de estándar: 598x200/);
  });

  test('un toldo incompleto sale como error, con lo que le falta', () => {
    const order = { ...base, awnings: [{ ...cortina, crankHeight: null }] };
    const [first] = summarizeAwnings(order, calculateOrder(order));
    expect(first.state).toBe('error');
    expect(first.notes.join(' ')).toMatch(/altura de manivela/);
  });
});
