import { describe, expect, it } from 'vitest';
import { orderDespieceByLength } from './despieceOrder.js';

// Iván, 05/11/2026: arriba las piezas con longitud, para los montadores.
describe('orden del despiece', () => {
  it('pone arriba las piezas con largo, conserva el orden del modelo y numera sin saltos', () => {
    const despiece = { anchoring: null, rows: [
      { num: 1, name: 'SOPORTE', length: null },
      { num: 2, name: 'TUBO', length: 344.8 },
      { num: 5, name: 'CASQUILLO', length: '' },
      { num: 7, name: 'PERFIL', length: '320,5' },
      { num: 21, name: 'MANDO SITUO 1 IO PURE', length: null },
      { num: 9, name: 'TAPÓN', length: 0 }
    ] };
    const { rows, anchoring } = orderDespieceByLength(despiece);
    expect(rows.map((r) => r.name)).toEqual(['TUBO', 'PERFIL', 'SOPORTE', 'CASQUILLO', 'TAPÓN', 'MANDO SITUO 1 IO PURE']);
    expect(rows.map((r) => r.num)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(anchoring).toBeNull();
  });

  it('sin despiece no hace nada', () => {
    expect(orderDespieceByLength(null)).toBeNull();
  });
});
