import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { generarCorteRemolques } from './index.js';
import { refuerzosDeStock } from './refuerzos.js';
import { sacosDeStock } from './sacos.js';
import { anchoArial } from '../../domain/corteLona/texto.js';
import { numero, registrosDxf, valor } from '../../domain/corteLona/dxfTestHelpers.js';
import a from './__fixtures__/sacos-stock/AR2605442.json' with { type: 'json' };
import b from './__fixtures__/sacos-stock/AR2605448.json' with { type: 'json' };
import c from './__fixtures__/sacos-stock/AR2605456.json' with { type: 'json' };
import referencia from './__fixtures__/sacos-stock/AR2605467.json' with { type: 'json' };

const stock = { ofStockSacos: '0230811' };
const solapan = (a, b) => a.x < b.x + b.ancho - .001 && b.x < a.x + a.ancho - .001
  && a.y < b.y + b.hueco - .001 && b.y < a.y + a.hueco - .001;

describe('refuerzos de stock después de los sacos', () => {
  it.each([[a, 5015, 3], [b, 5516, 0], [c, 3818, 4]].map(([p, l, n]) => [p.orderCode, p, l, n]))('%s: aprovecha solo el rollo principal', (_codigo, pedido, largo, tiras) => {
    const antes = generarCorteRemolques(pedido);
    const corte = generarCorteRemolques(pedido, stock).cortes[0];
    expect(corte.largo).toBe(largo);
    expect(corte.sacos).toEqual([]);
    expect(corte.refuerzosStock).toHaveLength(tiras);
    expect(corte.ocupadas).toEqual(antes.cortes[0].ocupadas);
    expect(corte.apartes).toEqual(antes.cortes[0].apartes);
    expect(corte.entidades.lineas.filter(l => l.capa === 'ROTULADOR')).toEqual(antes.cortes[0].entidades.lineas.filter(l => l.capa === 'ROTULADOR'));
    expect(corte.entidades.circulos).toEqual(antes.cortes[0].entidades.circulos);
    expect(corte.entidades.arcos).toEqual(antes.cortes[0].entidades.arcos);
    for (const [i, t] of corte.refuerzosStock.entries()) {
      expect([165, 200]).toContain(t.hueco);
      expect(t.ancho).toBeGreaterThanOrEqual(1230);
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.y).toBeGreaterThanOrEqual(0);
      expect(t.x + t.ancho).toBeLessThanOrEqual(largo);
      expect(t.y + t.hueco).toBeLessThanOrEqual(2500);
      expect([...corte.ocupadas, ...corte.sacos, ...corte.refuerzosStock.slice(i + 1)].some(p => solapan(t, p))).toBe(false);
      expect(t.of).toBeUndefined();
      expect(corte.entidades.textos.some(x => x.capa === 'texto' && x.valor === t.nombre)).toBe(true);
    }
    expect(corte.entidades.textos.some(t => /BOLSA/.test(t.valor))).toBe(false);
    expect(corte.entidades.lineas.some(l => l.capa === 'DISCO1' && l.x1 <= largo && l.x2 <= largo && l.y1 === l.y2 && [0, 2500].includes(l.y1))).toBe(false);
  });

  it('mezcla anchos exactos para aprovechar más que con una sola medida', () => {
    const { tiras } = refuerzosDeStock([{ x: 0, y: 0, ancho: 2493, hueco: 1780 }], 2493, 2500);
    expect(tiras.map(t => t.hueco).sort()).toEqual([165, 165, 165, 200]);
    expect(tiras.every(t => t.ancho === 2493)).toBe(true);
    expect(tiras.map(t => t.nombre)).toContain('T.O / REF 20cm STOCK');
    expect(tiras.map(t => t.nombre)).toContain('REF 16.5cm STOCK');
  });

  it('respeta el mínimo medido de 123 cm; permite ajustar ese umbral', () => {
    const ocupadas = ancho => [{ x: 0, y: 0, ancho, hueco: 2300 }];
    expect(refuerzosDeStock(ocupadas(1229), 1229, 2500).tiras).toEqual([]);
    expect(refuerzosDeStock(ocupadas(1230), 1230, 2500).tiras).toHaveLength(1);
    expect(refuerzosDeStock(ocupadas(1229), 1229, 2500, 1000).tiras).toHaveLength(1);
    expect(() => refuerzosDeStock([], 2000, 2500, 0)).toThrow(/mínimo/);
  });

  it('no gira tiras para aprovechar un hueco vertical corto a lo largo del rollo', () => {
    const ocupadas = [{ x: 0, y: 0, ancho: 2000, hueco: 2000 }, { x: 2200, y: 0, ancho: 300, hueco: 2500 }];
    const { tiras } = refuerzosDeStock(ocupadas, 2500, 2500);
    expect(tiras.every(t => t.ancho >= 1230 && [165, 200].includes(t.hueco))).toBe(true);
    expect(tiras.some(t => t.x === 2000 && t.ancho <= 200)).toBe(false);
  });

  it('rotula el nominal del saco y conserva aparte su medida real si necesita tolerancia', () => {
    const r = sacosDeStock([{ x: 0, y: 0, ancho: 1250, hueco: 1730 }], 2500, '0230811');
    expect(r.sacos).toHaveLength(1);
    expect(r.sacos[0]).toMatchObject({ medida: '120X77', medidaCatalogo: '120X80', ancho: 1200, hueco: 770 });
    expect(r.textos.some(t => t.valor === 'SACO 120X80 STOCK')).toBe(true);
  });

  it('la OF y el rótulo de un saco girado quedan dentro de él y separados', () => {
    const r = sacosDeStock([{ x: 0, y: 0, ancho: 800, hueco: 1300 }], 2500, '0230811');
    expect(r.sacos).toHaveLength(1);
    const s = r.sacos[0];
    for (const t of r.textos) {
      const w = t.giro ? t.h : anchoArial(t.valor, t.h), h = t.giro ? anchoArial(t.valor, t.h) : t.h;
      expect(t.x - w / 2).toBeGreaterThanOrEqual(s.x);
      expect(t.y - h / 2).toBeGreaterThanOrEqual(s.y);
      expect(t.x + w / 2).toBeLessThanOrEqual(s.x + s.ancho);
      expect(t.y + h / 2).toBeLessThanOrEqual(s.y + s.hueco);
    }
    expect(r.textos[0].x + r.textos[0].h / 2).toBeLessThan(r.textos[1].x - r.textos[1].h / 2);
  });
});

const muestras = readdirSync(new URL('./__fixtures__/', import.meta.url)).filter(f => /^AR\d+\.json$/.test(f));
it.each(muestras)('%s: conserva todas las piezas y separa sacos y tiras en las muestras anteriores', fichero => {
  const pedido = JSON.parse(readFileSync(new URL(`./__fixtures__/${fichero}`, import.meta.url), 'utf8'));
  const antes = generarCorteRemolques(pedido), despues = generarCorteRemolques(pedido, stock);
  expect(despues.cortes.map(c => c.largo)).toEqual(antes.cortes.map(c => c.largo));
  for (const [i, c] of despues.cortes.entries()) {
    const previo = antes.cortes[i];
    expect(c.ocupadas).toEqual(previo.ocupadas);
    expect(c.apartes).toEqual(previo.apartes);
    expect(c.opcion).toBe(previo.opcion);
    expect(c.entidades.arcos).toEqual(previo.entidades.arcos);
    expect(c.entidades.circulos).toEqual(previo.entidades.circulos);
    expect(c.entidades.textos.filter(t => t.capa === 'ROTULADOR')).toEqual(previo.entidades.textos.filter(t => t.capa === 'ROTULADOR'));
    const extra = [...c.sacos, ...c.refuerzosStock];
    for (const [j, p] of extra.entries()) {
      expect([...c.ocupadas, ...extra.slice(j + 1)].some(q => solapan(p, q))).toBe(false);
      expect(p.x + p.ancho).toBeLessThanOrEqual(c.largo);
      expect(p.y + p.hueco).toBeLessThanOrEqual(2500);
    }
    for (const l of previo.entidades.lineas) {
      const igual = (a, b) => Math.abs(a - b) < .1;
      const entre = (v, a, b) => v >= Math.min(a, b) - .1 && v <= Math.max(a, b) + .1;
      const cubierta = c.entidades.lineas.some(n => n.capa === l.capa && (
        igual(l.y1, l.y2) && igual(n.y1, n.y2) && igual(l.y1, n.y1) && entre(l.x1, n.x1, n.x2) && entre(l.x2, n.x1, n.x2)
        || igual(l.x1, l.x2) && igual(n.x1, n.x2) && igual(l.x1, n.x1) && entre(l.y1, n.y1, n.y2) && entre(l.y2, n.y1, n.y2)
        || igual(l.x1, n.x1) && igual(l.y1, n.y1) && igual(l.x2, n.x2) && igual(l.y2, n.y2)));
      expect(cubierta, `Se conserva el segmento ${JSON.stringify(l)}`).toBe(true);
    }
  }
});

it('AR2605467: dos sacos nominales y el rótulo de la referencia manual, sin adelantar refuerzos', () => {
  const manual = registrosDxf(readFileSync(new URL('./__fixtures__/sacos-stock/AR2605467-manual-entidades.dxf', import.meta.url), 'utf8'));
  expect(manual.some(e => valor(e, 8) === 'texto' && valor(e, 1) === 'SACOS 120X80 STOCK')).toBe(true);
  const lineas = manual.filter(e => e.tipo === 'LINE' && valor(e, 8) === 'DISCO1');
  // El DXF manual lleva la geometría desplazada 1000 mm en ambos ejes.
  expect(lineas.some(e => numero(e, 10) === 3525 && numero(e, 11) === 3525 && numero(e, 21) === 2630)).toBe(true);
  const r = generarCorteRemolques(referencia, stock);
  const corte = r.cortes[0];
  expect(corte.largo).toBe(4210);
  expect(corte.sacos.map(s => [s.x, s.y, s.ancho, s.hueco, s.medida])).toEqual([
    [1325, 1630, 1200, 800, '120X80'], [2525, 1630, 1200, 800, '120X80'],
  ]);
  expect(corte.refuerzosStock).toEqual([]);
  expect(corte.entidades.textos.filter(t => t.valor === 'SACOS 120X80 STOCK' && t.capa === 'texto')).toHaveLength(1);
  expect(corte.entidades.textos.filter(t => t.valor === '0230811')).toHaveLength(2);
  expect(r.archivo.nombre).toBe('AR2605467');
  expect(r.archivo.dxf).toContain('SACOS 120X80 STOCK');
});
