import { describe, expect, it } from 'vitest';
import { summarizeFabricStock } from './fabricStock.js';

// PLAST880NEGRP204 en RPS el 30/09/2026 (tmp/tela-0930/stock-all.json): 21 bobinas en
// el almacén 5, 1.257,8 m, 860 m reservados por OF.
const PLAST_ROLLS = [
  ['1972920227', 65, 0],
  ['1971880211', 65, 63],
  ['1966500305', 65, 38],
  ['1971880131', 65, 65],
  ['1972920305', 65, 0],
  ['1972920224', 65, 0],
  ['1971880214', 65, 0],
  ['1971880208', 65, 65],
  ['1971880205', 65, 65],
  ['1971880130', 65, 65],
  ['1971880213', 65, 28],
  ['1966500307', 65, 65],
  ['1971880215', 65, 65],
  ['1971880209', 65, 65],
  ['1971880206', 65, 65],
  ['1971880203', 65, 65],
  ['1972900331', 65, 0],
  ['1966500306', 65, 65],
  ['1971880129', 65, 65],
  ['1972920304', 13.59, 7],
  ['1972920210', 9.17, 9]
];
const row = (code, warehouseCode, warehouseName, roll, meters, reserved = 0) => ({ code, warehouseCode, warehouseName, roll, meters, reserved });
const plastRows = PLAST_ROLLS.map(([roll, meters, reserved]) => row('PLAST880NEGRP204', '5', 'NUEVA SEDE ARZÚA', roll, meters, reserved));

describe('summarizeFabricStock · stock de una lona según RPS (informe tela-0930)', () => {
  it('PLAST880NEGRP204: 397,8 m disponibles en 10 bobinas, la mayor de 65 m, 860 m reservados', () => {
    const stock = summarizeFabricStock(plastRows, 'PLAST880NEGRP204');
    expect(stock).toMatchObject({
      code: 'PLAST880NEGRP204',
      metros: 1257.8,
      reservado: 860,
      disponible: 397.8,
      bobinasConDisponible: 10,
      mayorBobinaDisponible: 65,
      consignacion: 0
    });
    expect(stock.almacenes).toEqual([{ codigo: '5', nombre: 'NUEVA SEDE ARZÚA', disponible: 397.8, bobinas: 10 }]);
  });

  it('no cuenta No_Usar, PROVEEDORES ni filas negativas; la consignación va aparte', () => {
    const stock = summarizeFabricStock([
      row('ACRILI2170P120', '1', 'ARZÚA', 'A1', 40, 10),
      row('ACRILI2170P120', 'No_Usar', 'No_Usar', 'X1', 50),
      row('ACRILI2170P120', '17', 'PROVEEDORES', 'X2', 50),
      row('ACRILI2170P120', '8', 'EXPEDICIONES ARZÚA', 'X3', -12),
      row('ACRILI2170P120', '10', 'CONSIGNACION ARZUA', 'C1', 30, 5),
      row('OTRA', '1', 'ARZÚA', 'O1', 99)
    ], 'acrili2170p120');
    expect(stock).toMatchObject({ metros: 40, reservado: 10, disponible: 30, bobinasConDisponible: 1, mayorBobinaDisponible: 30, consignacion: 25 });
  });

  it('una bobina con más reservado que metros no resta de las demás', () => {
    const stock = summarizeFabricStock([row('X', '1', 'ARZÚA', 'A', 10, 15), row('X', '1', 'ARZÚA', 'B', 20, 0)], 'X');
    expect(stock).toMatchObject({ disponible: 20, bobinasConDisponible: 1, mayorBobinaDisponible: 20 });
  });

  it('sin filas, todo a cero', () => {
    expect(summarizeFabricStock([], 'X')).toMatchObject({ metros: 0, disponible: 0, bobinasConDisponible: 0, mayorBobinaDisponible: 0, almacenes: [] });
  });
});
