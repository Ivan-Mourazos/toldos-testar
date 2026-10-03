import { describe, expect, it } from 'vitest';
import { repartirNotas } from './repartirNotas';

describe('repartirNotas', () => {
  it('todo en la primera si cabe', () => {
    expect(repartirNotas([10, 10, 10], 40, 100)).toEqual([[0, 1, 2]]);
  });
  it('lo que no cabe pasa a continuación, y a otra si hace falta', () => {
    expect(repartirNotas([30, 30, 30, 30, 30], 70, 70)).toEqual([[0, 1], [2, 3], [4]]);
  });
  it('una línea más alta que la caja va sola en su página', () => {
    expect(repartirNotas([10, 200, 10], 50, 100)).toEqual([[0], [1], [2]]);
  });
  it('sin líneas, nada', () => {
    expect(repartirNotas([], 50, 100)).toEqual([]);
  });
});
