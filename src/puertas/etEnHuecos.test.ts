import { describe, expect, it } from 'vitest';
import pedido5669 from './__fixtures__/AR2605669.json';
import { generarCortePuertas } from './corte.ts';
import { leerPedidoPuertas } from './pedido.ts';

// Iván, 20/11/2026, AR2605669: enrollable negra 9005 con el saco en la lona. Las tres E.T. cabían de pie al lado de los
// cachos sin alargar el corte y la web las mandaba a «CORTAR DE RESTOS».
describe('E.T. en los huecos del corte antes de apartarlas', () => {
  it('AR2605669: saco y las tres E.T. de pie dentro de 1,76 m, sin cortar de restos', () => {
    const { cortes } = generarCortePuertas(leerPedidoPuertas(pedido5669));
    const lona = cortes.find(c => c.material === 'LAC900 NEGRO 9005')!;
    expect(lona.largo).toBe(1760);
    expect(lona.extensionDibujo).toBeUndefined();
    expect(lona.colocadas.some(t => t.aparte)).toBe(false);
    expect(lona.entidades.textos.some(t => t.valor === 'CORTAR DE RESTOS')).toBe(false);
    expect(lona.colocadas.filter(t => t.pieza.clase === 'saco')).toHaveLength(1);
    const et = lona.colocadas.filter(t => t.pieza.clase === 'entrada');
    expect(et).toHaveLength(3);
    expect(et.every(t => t.girada)).toBe(true);
    // Sin pisar nada: ningún par de piezas se solapa y todas dentro del rollo y del largo.
    const caja = lona.colocadas.map(t => ({ x: t.x, y: t.y, w: (t.girada ? t.pieza.alto : t.pieza.ancho) * 10, h: (t.girada ? t.pieza.ancho : t.pieza.alto) * 10 }));
    for (const [i, a] of caja.entries()) {
      expect(a.x + a.w).toBeLessThanOrEqual(lona.largo + .001);
      expect(a.y + a.h).toBeLessThanOrEqual(lona.anchoRollo + .001);
      for (const b of caja.slice(i + 1))
        expect(a.x < b.x + b.w - .001 && b.x < a.x + a.w - .001 && a.y < b.y + b.h - .001 && b.y < a.y + a.h - .001).toBe(false);
    }
    expect(cortes.some(c => c.opcion !== 'principal')).toBe(false);
  });
});
