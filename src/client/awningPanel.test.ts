import { describe, expect, it } from 'vitest';
import { awningReservationRows, groupMaterialRows } from './awningPanel';

describe('reserva de un toldo en el panel', () => {
  it('solo las líneas de la OF de ese toldo, agrupadas por artículo', () => {
    const calculation = { ofs: [
      { awningId: 'a', of: '0230194', materials: [{ code: 'X', description: 'Pieza X', quantity: 1 }, { code: 'X', description: 'Pieza X', quantity: 2 }] },
      { awningId: 'b', of: '0230195', materials: [{ code: 'Y', description: 'Pieza Y', quantity: 1 }] }
    ], diagnostics: [] } as never;
    expect(awningReservationRows(calculation, 'a')).toEqual([{ of: '0230194', code: 'X', description: 'Pieza X', quantity: 3 }]);
    expect(awningReservationRows(calculation, 'z')).toEqual([]);
  });

  it('redondea los metros de tela como la reserva del pedido', () => {
    const ofs = [
      { awningId: 'a', of: '0230194', calculation: { fabricCode: 'TELA1' }, materials: [{ code: 'TELA1', description: 'Tela', quantity: 3.2 }] }
    ] as never;
    expect(groupMaterialRows(ofs)).toEqual([{ of: '0230194', code: 'TELA1', description: 'Tela', quantity: 3.5 }]);
    expect(awningReservationRows({ ofs, diagnostics: [] } as never, 'a')[0].quantity).toBe(3.5);
  });
});
