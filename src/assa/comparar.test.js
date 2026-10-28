import { describe, expect, it } from 'vitest';
import { compararOperaciones, operacionesEnPano } from './comparar.js';

const raya = (a, b, capa = 'ROTULADOR') => ({ tipo: 'raya', a, b, capa, curva: 0 });
const circulo = (x, y, r = 7) => ({ tipo: 'arco', punto: [x, y], r, desde: 0, hasta: 360, capa: 'CUTTER' });

describe('contraste de formas y herramientas, tolerancia de 1 mm', () => {
  const esperado = [raya([10, 20], [100, 20]), circulo(40, 50)];

  it('tolera desplazamientos de 0,9 mm y detecta los de 1,1 mm', () => {
    expect(compararOperaciones(esperado, [raya([10.9, 20], [100.9, 20]), circulo(40.9, 50)]).coincide).toBe(true);
    expect(compararOperaciones(esperado, [raya([11.1, 20], [101.1, 20]), circulo(41.1, 50)]).coincide).toBe(false);
  });

  it('detecta un agujero ausente, un radio distinto, una capa cambiada y un corte duplicado', () => {
    for (const real of [[esperado[0]], [esperado[0], circulo(40, 50, 9)], [raya([10, 20], [100, 20], 'CUTTER'), esperado[1]], [...esperado, esperado[1]]]) {
      expect(compararOperaciones(esperado, real).coincide).toBe(false);
    }
  });

  it('acepta un círculo representado con dos semicírculos de polilínea', () => {
    const dosMitades = [raya([47, 50], [33, 50], 'CUTTER'), raya([33, 50], [47, 50], 'CUTTER')].map(p => ({ ...p, curva: 1 }));
    expect(compararOperaciones([circulo(40, 50)], dosMitades).coincide).toBe(true);
  });

  it('aplica ±1 mm al radio, sin confundir su perímetro mayor con un corte duplicado', () => {
    expect(compararOperaciones([circulo(40, 50)], [circulo(40, 50, 7.9)]).coincide).toBe(true);
  });

  it('conserva un corte que atraviesa el borde y entra en el paño', () => {
    const ops = operacionesEnPano([raya([50, 180], [50, 300], 'DISCO1')], { x0: 0, x1: 200, y0: 0, y1: 200 });
    expect(ops).toHaveLength(1);
    expect(ops[0].b).toEqual([50, 200]);
    expect(compararOperaciones([], ops).coincide).toBe(false);
  });

  it('detecta una interrupción de 2,2 mm entre dos marcas aunque caiga entre muestras regulares', () => {
    const real = [raya([0, 0], [44.2, 0]), raya([46.4, 0], [100, 0])];
    expect(compararOperaciones([raya([0, 0], [100, 0])], real).coincide).toBe(false);
  });

  it('normaliza solo por traslación, sin giro y sin perder cortes interiores', () => {
    const caja = { x0: 1000, y0: 2000, x1: 1200, y1: 2200 };
    const ops = operacionesEnPano([
      raya([1010, 2020], [1100, 2020]), circulo(1040, 2050),
      raya([1000, 2000], [1000, 2200], 'DISCO1'),
      raya([1050, 2080], [1060, 2090], 'DISCO1'),
    ], caja);
    expect(ops).toHaveLength(3);
    expect(compararOperaciones(esperado, ops).coincide).toBe(false);
    expect(compararOperaciones(esperado, ops.slice(0, 2)).coincide).toBe(true);
  });
});
