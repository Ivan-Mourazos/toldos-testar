import { describe, expect, it } from 'vitest';
import { emptyLona } from '../entradas-vacias.ts';
import { calcLona } from '../calc/lona.ts';
import { DEFAULT_PARAMS } from '../calc/params.ts';
import { cortarLonasAltas, piezasLona } from './lonaAlta.js';
import { generarCorteRemolques } from './index.js';
import { registrosDxf, valor, numero } from '../../domain/corteLona/dxfTestHelpers.js';

const elemento = (extra = {}) => {
  const input = { ...emptyLona(), largo: 244, ancho: 143, altoDelante: 96, aguas: 16,
    tipoPerfil: 'TIPO 02', direccionAguas: 'delante-atras', recogeDelante: 'NO', recogeAtras: 'NO',
    bastillaEnfundar: false, ventana: false, modoOllaos: 'REPARTIDOS', pasoOllaos: 35, ...extra };
  return { input, result: calcLona(input, DEFAULT_PARAMS), paramsSnapshot: DEFAULT_PARAMS, of: '0239999' };
};

describe('corte del contorno con soldaduras en los laterales', () => {
  it('conserva las cabezas rectangulares y produce techo y dos laterales enteros', () => {
    const p = piezasLona(elemento());
    expect(p.f.tipo).toBe('TIPO 01');
    expect(p.soldado.techo.lineas).toHaveLength(4);
    expect(p.soldado.laterales).toHaveLength(2);
    expect(p.soldado.laterales[0].lineas).toHaveLength(5);
    expect(p.soldado.laterales[0].arcos).toHaveLength(0);
    expect(p.soldado.laterales[0].ollaos.length).toBeGreaterThan(0);
  });

  it('el lateral del otro lado es el reflejo del primero: ollaos, marcas y números en el extremo contrario', () => {
    const [uno, otro] = piezasLona(elemento({ recogeAtras: 'GOMA', modoOllaos: 'MEDIDOS', pasoOllaos: 40 })).soldado.laterales;
    const xs = (p, k) => p[k].map(v => Math.round(v[0] * 100) / 100).sort((a, b) => a - b);
    expect(xs(otro, 'ollaos')).toEqual(uno.ollaos.map(([x]) => Math.round((uno.w - x) * 100) / 100).sort((a, b) => a - b));
    const r = (v) => Math.round(v * 1000) / 1000;
    expect(otro.lineas.map(([a, b, c, d]) => [r(uno.w - a), r(b), r(uno.w - c), r(d)])).toEqual(uno.lineas.map(l => l.map(r)));
    expect(otro.numeros.map(([x, y, , g]) => [r(uno.w - x), r(y), r(-g)])).toEqual(uno.numeros.map(([x, y, , g]) => [r(x), r(y), r(g)]));
  });

  // Iván, 06/11/2026: el techo monta encima del lateral, por el agua; la raya va en los laterales.
  // Va por el derecho: tres trozos de 2 cm por borde (principio, centro y final), como las marcas de los puentes.
  it('marca el límite a 2 cm en los laterales con tres trozos de 2 cm por borde inclinado', () => {
    const el = elemento(), p = piezasLona(el), techo = p.soldado.techo;
    expect(techo.rot.some(([x1, y1, x2, y2]) => Math.hypot(x2 - x1, y2 - y1) > techo.w / 2)).toBe(false);
    const [, , der, pico, izq] = el.result.contornoSoldado.desarrollo.lateral.corte.map(([x, y]) => [x * 10, y * 10]);
    for (const lateral of p.soldado.laterales) {

      // Distancia de un punto a la recta de un borde inclinado (en el reflejo, los bordes van al revés).
      const aBorde = ([x, y], [a, b], [c, d]) => Math.abs((c - a) * (b - y) - (a - x) * (d - b)) / Math.hypot(c - a, d - b);
      const bordes = lateral === p.soldado.laterales[0] ? [[izq, pico], [pico, der]]
        : [[izq, pico], [pico, der]].map(par => par.map(([x, y]) => [lateral.w - x, y]));
      const trozos = lateral.rot.filter(([x1, y1, x2, y2]) => bordes.some(([a, b]) => Math.abs(aBorde([x1, y1], a, b) - 20) < 1e-6 && Math.abs(aBorde([x2, y2], a, b) - 20) < 1e-6));
      expect(trozos).toHaveLength(6);
      for (const [x1, y1, x2, y2] of trozos) expect(Math.hypot(x2 - x1, y2 - y1)).toBeCloseTo(20, 6);
    }
  });

  it('genera las cinco piezas con el mismo reparto sin exceder el rollo', () => {
    const c = cortarLonasAltas([elemento()]);
    expect(c.lineas.length).toBeGreaterThanOrEqual(22);
    expect(c.avisos.some(a => a.includes('a mano'))).toBe(false);
    for (const [, y1, , y2] of c.lineas) {
      expect(Math.min(y1, y2)).toBeGreaterThanOrEqual(-.01);
      expect(Math.max(y1, y2)).toBeLessThanOrEqual(2500.01);
    }
  });

  it('numera las dos uniones por parejas dentro del solape, como los empates habituales', () => {
    const p = piezasLona(elemento());
    expect(p.soldado.techo.numeros.map(n => n[2])).toEqual(['1', '1', '2', '2']);
    expect(p.soldado.laterales.map(l => l.numeros.map(n => n[2]))).toEqual([['1', '1'], ['2', '2']]);
    for (const [, y] of p.soldado.techo.numeros) expect([10, p.soldado.techo.h - 10]).toContain(y);
    const c = cortarLonasAltas([elemento()]);
    expect(c.textos.filter(t => t.capa === 'ROTULADOR' && t.literal).map(t => t.valor).sort())
      .toEqual(['1', '1', '1', '1', '2', '2', '2', '2']);
  });

  it('conserva los rótulos a 1,5 cm y distingue las uniones cuando hay varios remolques', () => {
    const el = elemento({cantidad:2});
    const c = cortarLonasAltas([el],0,new Map([[el,['A','B']]]));
    const rot = c.textos.filter(t => t.capa === 'ROTULADOR');
    for (const n of ['a1','a2','b1','b2']) expect(rot.filter(t => t.valor === n)).toHaveLength(4);
    for (const n of ['A1','A2','A3','A4','A5','B1','B2','B3','B4','B5']) expect(rot.some(t => t.valor === n && !t.literal)).toBe(true);
    expect(rot.every(t => t.h === 10)).toBe(true);
  });

  it('marca el centro del techo y la altura de las orejas, como el contorno habitual', () => {
    const p = piezasLona(elemento({recogeAtras:'GOMA'}));
    expect(p.soldado.techo.rot).toContainEqual([10, p.soldado.techo.h / 2, 25, p.soldado.techo.h / 2]);
    // Cortados los dos con la cara buena arriba, el lateral del otro lado lleva detrás en el extremo contrario.
    const [uno, otro] = p.soldado.laterales;
    expect(uno.rot).toContainEqual([uno.w - 10, p.marcasAtras, uno.w - 25, p.marcasAtras]);
    expect(otro.rot).toContainEqual([10, p.marcasAtras, 25, p.marcasAtras]);
  });

  it('exporta al corte y al plano dos límites rojos de soldadura, sin duplicarlos en los laterales', () => {
    const el = { ...elemento(), tipo: 'lona' };
    const c = generarCorteRemolques({ orderCode: 'PRUEBA', params: DEFAULT_PARAMS, elementos: [el] });
    expect(c.aMano).toEqual([]);
    expect(c.archivo).not.toBeNull();
    const lineasLargas = (src, largo) => registrosDxf(src).filter(r => r.tipo === 'LINE' && valor(r, 8) === 'ROTULADOR'
      && Math.abs(Math.hypot(numero(r, 11) - numero(r, 10), numero(r, 21) - numero(r, 20)) - largo) < .001);
    // Seis trozos de 2 cm en cada lateral (dos laterales), ninguno en el techo.
    expect(lineasLargas(c.archivo.dxf, 20)).toHaveLength(12);
    // El plano los lleva en la confección y en la vista del corte.
    expect(lineasLargas(c.archivo.plano.dxf, .02)).toHaveLength(24);
    const regs = registrosDxf(c.archivo.plano.dxf);
    expect(regs.some(r => valor(r, 1)?.includes('EL TECHO MONTA ENCIMA'))).toBe(true);
  });
});
