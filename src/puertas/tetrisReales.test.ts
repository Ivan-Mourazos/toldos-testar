import { describe, expect, it } from 'vitest';
import antes from './__fixtures__/cortesAntesTetris.json';
import revision from './__fixtures__/cortesAntesAnchoTotal.json';
import { pedidosTetris } from './__fixtures__/cortesTetris.ts';
import { generarCortePuertas } from './corte.ts';

describe('Tetris contra todos los pedidos configurables de las fixtures', () => {
  for (const p of pedidosTetris()) it(`${p.orderCode}: ningún rollo crece, determinismo y piezas sin solapes`, () => {
    const original = structuredClone(p);
    const r = generarCortePuertas(p, { ofStockSacos: '0230811' });
    const previo = antes.pedidos.find(f => f.pedido === p.orderCode)!;
    const rebasado = revision.pedidos.find(f => f.pedido === p.orderCode)!;
    expect(r.cortes).toHaveLength(previo.largos.length);
    r.cortes.forEach((c, i) => {
      expect(c.largo / 10).toBeLessThanOrEqual(previo.largos[i]);
      expect(c.largo / 10).toBeLessThanOrEqual(rebasado.largos[i]);
      const rects = c.colocadas.map(s => ({ x: s.x, y: s.y, w: 10 * (s.girada ? s.pieza.alto : s.pieza.ancho), h: 10 * (s.girada ? s.pieza.ancho : s.pieza.alto) }));
      rects.forEach((a, j) => {
        expect(a.x).toBeGreaterThanOrEqual(0);
        expect(a.y).toBeGreaterThanOrEqual(0);
        expect(a.x + a.w).toBeLessThanOrEqual(c.largo + .001);
        expect(a.y + a.h).toBeLessThanOrEqual(c.anchoRollo + .001);
        rects.slice(j + 1).forEach(b => {
          const cruza = a.x < b.x + b.w - .001 && b.x < a.x + a.w - .001 && a.y < b.y + b.h - .001 && b.y < a.y + a.h - .001;
          expect(cruza, `${c.material}: ${j} invade otra pieza o un saco`).toBe(false);
        });
      });
      const piezasPedido = c.colocadas.filter(s => !s.pieza.id.startsWith('stock-'));
      const originales = r.resultados.flatMap(r => c.opcion === 'principal' ? r.piezas : c.opcion === 'saco-entero' ? r.alternativasSaco?.entero ?? [] : r.alternativasSaco?.partido ?? [])
        .filter(p => p.material === c.material && p.rollo * 10 === c.anchoRollo);
      for (const pieza of originales.filter(p => p.clase !== 'cristal')) {
        expect(piezasPedido.filter(s => s.pieza.id === pieza.id)).toHaveLength(pieza.cantidad);
      }
      // Con el mismo largo y área, manda el ancho total que se acota, contando stock.
      if (originales.some(p => p.clase === 'pano')) {
        const stock = c.colocadas.filter(s => s.pieza.id.startsWith('stock-'));
        const areaStock = stock.reduce((area, s) => area + s.pieza.ancho * s.pieza.alto, 0);
        const anchoTotal = Math.max(...c.colocadas.map(s => s.y / 10 + (s.girada ? s.pieza.ancho : s.pieza.alto)));
        if (c.largo / 10 === previo.largos[i]) {
          expect(stock.length).toBeGreaterThanOrEqual(previo.sacos);
          expect(areaStock).toBeGreaterThanOrEqual(previo.areaStock);
          if (areaStock === previo.areaStock) expect(anchoTotal).toBeLessThanOrEqual(previo.anchoStock);
        }
        if (c.largo / 10 === rebasado.largos[i]) {
          expect(areaStock).toBeGreaterThanOrEqual(rebasado.areaStock);
          if (areaStock === rebasado.areaStock) expect(anchoTotal).toBeLessThanOrEqual(rebasado.anchoStock);
        }
      }
    });
    expect(generarCortePuertas(p, { ofStockSacos: '0230811' })).toEqual(r);
    expect(p).toEqual(original);
  });

  it('de una a cinco puertas se calcula el mismo corte completo durante la edición', () => {
    const p = pedidosTetris().find(p => p.orderCode === 'AR2605220')!;
    for (let n = 1; n <= 5; n++) {
      const pedido = { ...p, elementos: Array.from({ length: n }, (_, i) => ({ id: `puerta-${i}`, input: structuredClone(p.elementos[0].input) })) };
      const r = generarCortePuertas(pedido);
      expect(r.cortes.flatMap(c => c.colocadas).filter(s => s.pieza.clase === 'pano')).toHaveLength(n * 2);
      expect(r.archivo).not.toBeNull();
      expect(generarCortePuertas(pedido).cortes).toEqual(r.cortes);
    }
  });
});
