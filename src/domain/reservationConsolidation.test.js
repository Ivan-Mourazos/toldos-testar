import { describe, expect, test } from 'vitest';
import { normalizeReservation } from './validation.js';

describe('reservas por OF', () => {
  test('suma artículos iguales de varios toldos que comparten OF', () => {
    const reservation = normalizeReservation({
      orderCode: 'AR2600000',
      ofs: [
        { of: '3303333', description: 'Toldo A', materials: [
          { code: 'ACRILI2170P120', quantity: 13.5 },
          { code: 'CASPUNCE', quantity: 1 }
        ] },
        { of: '3303333', description: 'Toldo B', materials: [
          { code: 'ACRILI2170P120', quantity: 13.5 },
          { code: 'CASPUNCE', quantity: 1 }
        ] }
      ]
    });

    expect(reservation.ofs).toHaveLength(1);
    expect(reservation.ofs[0].materials).toEqual([
      { code: 'ACRILI2170P120', description: '', quantity: 27 },
      { code: 'CASPUNCE', description: '', quantity: 2 }
    ]);
  });
});
