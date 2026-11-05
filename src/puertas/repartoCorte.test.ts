import { describe, expect, it } from 'vitest';
import { repartirCorte, type FilaCorte } from './repartoCorte.ts';

// Iván, 05/11/2026 (AR2605391): un rollo de 41 m en la ventana casi cuadrada de Portanova dejaba un hueco grande.
describe('corte repartido en tramos en la hoja', () => {
  const ventana = { x0: 161.65, x1: 289.07, y0: 80, y1: 201.88 };
  // Como el 5391: sacos y cristales cortos arriba, el rollo azul de 4118 y el amarillo corto debajo.
  const filas: FilaCorte[] = [
    { y0: -200, y1: 40, piezas: [[-40, 1800]] },
    { y0: -580, y1: -300, piezas: [[0, 420], [420, 840], [840, 1706], [1706, 2046], [2046, 2912], [2912, 3252], [3252, 4118]], evitar: [2059] },
    { y0: -1050, y1: -700, piezas: [[0, 413]] },
  ];
  const zona = { x0: -70, x1: 4153, y0: -1050, y1: 45 };

  it('parte el rollo largo por donde no hay pieza y lo enseña más grande', () => {
    const tramos = repartirCorte(zona, filas, ventana);
    expect(tramos.length).toBeGreaterThan(1);
    const escala = (t: (typeof tramos)[number]) => (t.papel.x1 - t.papel.x0) / (t.zona.x1 - t.zona.x0);
    const una = Math.min(127.42 / (zona.x1 - zona.x0), 121.88 / (zona.y1 - zona.y0));
    expect(escala(tramos[0])).toBeGreaterThan(una * 1.5);
    // Todos a la misma escala, dentro del sitio del corte y uno debajo de otro.
    for (const t of tramos) {
      expect(escala(t)).toBeCloseTo(escala(tramos[0]), 6);
      expect(t.papel.x0).toBeGreaterThanOrEqual(ventana.x0 - 1e-6); expect(t.papel.x1).toBeLessThanOrEqual(ventana.x1 + 1e-6);
      expect(t.papel.y0).toBeGreaterThanOrEqual(ventana.y0 - 1e-6);
    }
    for (let i = 1; i < tramos.length; i++) expect(tramos[i].papel.y1).toBeLessThan(tramos[i - 1].papel.y0);
    // Ninguna pieza partida: cada corte cae en un borde, y los tramos siguientes solo enseñan el rollo largo.
    const bordes = filas[1].piezas.flat();
    for (const t of tramos.slice(1)) {
      expect(t.zona.y0).toBe(-580); expect(t.zona.y1).toBe(-300);
      expect(bordes.some(b => t.zona.x0 <= b && b - t.zona.x0 <= 45 + 10)).toBe(true);
    }
    // El texto de la cota del largo (en 2059) entero en un tramo.
    expect(tramos.some(t => t.zona.x0 <= 2059 - 45 && t.zona.x1 >= 2059 + 45)).toBe(true);
  });

  it('un corte que ya cabe bien se queda en una ventana', () => {
    const corto = [{ y0: -400, y1: 40, piezas: [[0, 420], [420, 840]] as Array<[number, number]> }];
    expect(repartirCorte({ x0: -70, x1: 875, y0: -400, y1: 45 }, corto, ventana)).toHaveLength(1);
  });
});
