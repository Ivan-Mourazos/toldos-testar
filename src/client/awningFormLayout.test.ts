import { describe, expect, it } from 'vitest';
import { repartirFilas } from './awningFormLayout';

describe('filas de las tarjetas de toldo', () => {
  it('reparte las doce columnas sin cambiar el orden de los campos', () => {
    expect(repartirFilas([3, 3, 3, 3, 6, 3, 3])).toEqual([3, 3, 3, 3, 6, 3, 3]);
    expect(repartirFilas([6, 3])).toEqual([6, 6]);
    expect(repartirFilas([6, 6, 6])).toEqual([6, 6, 12]);
  });

  it('absorbe el hueco del campo opcional sin adelantar el siguiente', () => {
    expect(repartirFilas([4, 4, 4])).toEqual([4, 4, 4]);
    expect(repartirFilas([4, 4])).toEqual([4, 8]);
    expect(repartirFilas([6, 4, 6, 3])).toEqual([6, 6, 6, 6]);
    expect(repartirFilas([3, 3, 6, 3])).toEqual([3, 3, 6, 12]);
  });

  it('añadir un campo no mueve los anteriores ni reequilibra otra fila', () => {
    expect(repartirFilas([3, 3, 6, 3, 3])).toEqual([3, 3, 6, 3, 9]);
    expect(repartirFilas([3, 3, 6, 3, 3, 3])).toEqual([3, 3, 6, 3, 3, 6]);
    const inicios = (anchos: number[]) => {
      let columna = 0;
      return repartirFilas(anchos).map(ancho => {
        const inicio = columna;
        columna = (columna + ancho) % 12;
        return inicio;
      });
    };
    expect(inicios([3, 3, 6, 3, 3, 3]).slice(0, 5)).toEqual(inicios([3, 3, 6, 3, 3]));
  });

  it('abre los detalles en otra fila sin estrechar el control que los muestra', () => {
    expect(repartirFilas([3, 6], [false, false])).toEqual([3, 9]);
    expect(repartirFilas([3, 6, 3, 3], [false, false, true, false])).toEqual([3, 9, 3, 9]);
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
