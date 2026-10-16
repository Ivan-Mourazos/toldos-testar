import { describe, expect, it } from 'vitest';
import { repartirFilas } from './awningFormLayout';

describe('filas de las tarjetas de toldo', () => {
  it('reparte las doce columnas sin cambiar el orden de los campos', () => {
    expect(repartirFilas([3, 3, 3, 3, 6, 3, 3])).toEqual([3, 3, 3, 3, 6, 3, 3]);
    expect(repartirFilas([6, 3])).toEqual([8, 4]);
    expect(repartirFilas([6, 6, 6])).toEqual([6, 6, 12]);
  });

  it('absorbe el hueco del campo opcional sin adelantar el siguiente', () => {
    expect(repartirFilas([4, 4, 4])).toEqual([4, 4, 4]);
    expect(repartirFilas([4, 4])).toEqual([6, 6]);
    expect(repartirFilas([6, 4, 6, 3])).toEqual([7, 5, 8, 4]);
    expect(repartirFilas([3, 3, 6, 3])).toEqual([6, 6, 8, 4]);
  });

  it('conserva todos los campos, sus mínimos y filas completas en cualquier combinación', () => {
    for (let caso = 0; caso < 512; caso++) {
      const anchos = Array.from({ length: caso % 9 }, (_, i) => [2, 3, 4, 6, 12][(caso >> i) % 5]);
      const spans = repartirFilas(anchos);
      expect(spans).toHaveLength(anchos.length);
      let usado = 0;
      for (let i = 0; i < spans.length; i++) {
        expect(spans[i]).toBeGreaterThanOrEqual(anchos[i]);
        usado += spans[i];
        expect(usado).toBeLessThanOrEqual(12);
        if (usado === 12) usado = 0;
      }
      expect(usado).toBe(0);
    }
  });
});
