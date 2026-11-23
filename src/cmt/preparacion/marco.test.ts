import { describe, expect, it } from 'vitest';
import { buscarMarcos, clasificar, cajaPieza, esBorde } from './marco.ts';
import type { Pieza } from './tipos.ts';

const l = (capa: string, x1: number, y1: number, x2: number, y2: number, id = `${capa}${x1}${y1}${x2}${y2}`): Pieza => ({ tipo: 'linea', capa, id, a: { x: x1, y: y1 }, b: { x: x2, y: y2 } });
const rect = (x0: number, y0: number, x1: number, y1: number) => [l('0', x0, y0, x1, y0), l('0', x1, y1, x1, y0), l('0', x1, y1, x0, y1), l('0', x0, y0, x0, y1)];

describe('buscarMarcos', () => {
  it('encuentra un rectángulo de cuatro líneas sueltas en capa 0 con corte dentro', () => {
    expect(buscarMarcos([...rect(0, 0, 10, 5), l('corte', 1, 1, 2, 2)])).toEqual([{ x0: 0, y0: 0, x1: 10, y1: 5 }]);
  });
  it('ignora un rectángulo vacío y uno en otra capa', () => {
    expect(buscarMarcos([...rect(0, 0, 10, 5), l('corte', 20, 20, 21, 21)])).toEqual([]);
  });
  it('devuelve dos marcos si los hay (marco viejo y nuevo)', () => {
    expect(buscarMarcos([...rect(0, 0, 10, 5), ...rect(20, 0, 30, 5), l('corte', 1, 1, 2, 2), l('corte', 21, 1, 22, 2)])).toHaveLength(2);
  });
});

describe('clasificar', () => {
  const m = { x0: 0, y0: 0, x1: 10, y1: 5 };
  it('dentro, fuera y cruza', () => {
    expect(clasificar(l('c', 1, 1, 2, 2), m, 1e-6)).toBe('dentro');
    expect(clasificar(l('c', 11, 1, 12, 2), m, 1e-6)).toBe('fuera');
    expect(clasificar(l('c', 9, 1, 12, 2), m, 1e-6)).toBe('cruza');
  });
  it('la caja de un arco incluye su punto más alto', () => {
    expect(cajaPieza({ tipo: 'arco', capa: 'c', id: 'a', c: { x: 0, y: 0 }, r: 1, desde: 0, hasta: 180, circulo: false }).y1).toBeCloseTo(1);
  });
});
it('ignora una diagonal y un arco cuyas cajas tocan el marco pero no su geometría', () => {
  const m = { x0: 0, y0: 0, x1: 10, y1: 5 };
  expect(clasificar(l('c', 8, 8, 12, 4), m, 1e-6)).toBe('fuera');
  expect(clasificar({ tipo: 'arco', capa: 'c', id: 'a', c: { x: 0, y: 0 }, r: 20, desde: 0, hasta: 90, circulo: false }, m, 1e-6)).toBe('fuera');
  expect(clasificar({ tipo: 'arco', capa: 'c', id: 'a', c: { x: 0, y: 0 }, r: 7, desde: 0, hasta: 90, circulo: false }, m, 1e-6)).toBe('cruza');
});

it('mide textos justificados por su ancla y arcos de vuelta entera por el radio', () => {
  expect(cajaPieza({ tipo: 'texto', capa: 'c', id: 't', pares: [[72, '1'], [10, '99'], [20, '99'], [11, '2'], [21, '3']] })).toEqual({ x0: 2, x1: 2, y0: 3, y1: 3 });
  expect(cajaPieza({ tipo: 'arco', capa: 'c', id: 'a', c: { x: 1, y: 2 }, r: 2, desde: 30, hasta: 30, circulo: false })).toEqual({ x0: -1, x1: 3, y0: 0, y1: 4 });
});

it('distingue una línea alineada pero fuera del lado', () => {
  expect(esBorde(l('0', 11, 0, 12, 0), { x0: 0, y0: 0, x1: 10, y1: 5 }, 1e-6)).toBe(false);
});

it('una entidad lejana no afecta a la tolerancia del marco', () => {
  expect(buscarMarcos([...rect(0, 0, 10, 5), l('c', 1, 1, 2, 2), l('c', 1e9, 5, 1e9, 10)])).toHaveLength(1);
});
