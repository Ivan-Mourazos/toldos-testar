import { describe, expect, it } from 'vitest';
import { calcularMedidasCal, MEDIDAS_CAL_5319 } from './medidas.ts';

describe('Posición exacta de los ollaos en las diagonales del morro', () => {
  it.each([4, 5, 12, 32])('con %i divisiones mantiene 10 mm de retranqueo y reparto exacto', divisionesCurva => {
    const m = calcularMedidasCal({ ...MEDIDAS_CAL_5319, divisionesCurva }).piezas[1];
    const k = m.terminado!.length / 2;
    for (const [lado, i] of [0, k - 1].entries()) {
      const a = m.terminado![i], b = m.terminado![2 * k - 1 - i];
      const longitud = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const u = b.map((x, n) => (x - a[n]) / longitud);
      m.ollaos.slice(lado * 4, lado * 4 + 4).forEach((o, n) => {
        const v = o.c.map((x, j) => x - a[j]);
        const desde = v[0] * u[0] + v[1] * u[1];
        const dentro = Math.abs(-v[0] * u[1] + v[1] * u[0]);
        expect(desde).toBeCloseTo(25 + n * 980 / 3, 8);
        expect(dentro).toBeCloseTo(10, 8);
      });
    }
  });
});
