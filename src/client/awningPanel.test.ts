import { describe, expect, it } from 'vitest';
import { awningReservationRows, formatSummary, groupMaterialRows, planningSummary } from './awningPanel';

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

describe('resumen de la línea plegada de Planteamientos', () => {
  it('formatea con coma decimal y singulares', () => {
    expect(formatSummary({ structures: 2, fabrics: 3, rpsLines: 21, fabricMeters: 12.5 })).toBe('2 estructuras · 3 telas · 21 líneas RPS · 12,5 ml');
    expect(formatSummary({ structures: 1, fabrics: 1, rpsLines: 1, fabricMeters: 9 })).toBe('1 estructura · 1 tela · 1 línea RPS · 9 ml');
  });

  it('cuenta estructuras, telas, líneas RPS y suma los metros de tela de dos OF', () => {
    const calculation = {
      ofs: [
        {
          awningId: 'a', of: '0230194', despiece: { rows: [], anchoring: null },
          calculation: { fabricMl: 5, valanceFabricCode: 'BAMBA1', valanceFabricMl: 2 },
          materials: [{ code: 'X', description: 'Pieza X', quantity: 1 }]
        },
        {
          awningId: 'b', of: '0230195', despiece: null,
          calculation: { fabricMl: 4 },
          materials: [{ code: 'Y', description: 'Pieza Y', quantity: 1 }]
        }
      ],
      diagnostics: []
    } as never;
    expect(planningSummary(calculation)).toEqual({ structures: 1, fabrics: 2, rpsLines: 2, fabricMeters: 11 });
  });

  it('sin cálculo, todo a cero', () => {
    expect(planningSummary(null)).toEqual({ structures: 0, fabrics: 0, rpsLines: 0, fabricMeters: 0 });
  });
});
