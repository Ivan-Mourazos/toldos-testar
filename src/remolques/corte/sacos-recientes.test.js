import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { generarCorteRemolques } from './index.js';
import { sacosDeStock } from './sacos.js';
import { SACOS, sacosEnRetales } from '../../domain/corteLona/colocacion.js';
import a from './__fixtures__/sacos-stock/AR2605442.json' with { type: 'json' };
import b from './__fixtures__/sacos-stock/AR2605448.json' with { type: 'json' };
import c from './__fixtures__/sacos-stock/AR2605456.json' with { type: 'json' };

const stock = { ofStockSacos: '0230811' };
const sha = dxf => createHash('sha256').update(dxf, 'latin1').digest('hex');

describe('lona libre real de los tres pedidos recientes', () => {
  it.each([
    [a, 5015, 'c2753035f7964b0b53bd6cd222d6d7579e7c591421fbef967c534ec3711629a1'],
    [b, 5516, '844e93bda2f03163b45fc9be35bcc4004963ff6a6bb3c8c610fcabbc4f5f868a'],
    [c, 3818, '8e733549a0f412c750558adfa9f68764f618fb3deed8431b50834166ab74bca7'],
  ].map(([p, l, sha]) => [p.orderCode, p, l, sha]))('%s: no fuerza sacos fuera de tolerancia ni aumenta el consumo', (_codigo, pedido, largo, esperado) => {
    const copia = structuredClone(pedido);
    const antes = generarCorteRemolques(pedido);
    const despues = generarCorteRemolques(pedido, stock);
    expect(pedido).toEqual(copia);
    expect(despues.cortes).toHaveLength(1);
    expect(despues.cortes[0].largo).toBe(largo);
    expect(despues.cortes[0].sacos).toEqual([]);
    expect(despues.cortes[0].ocupadas).toEqual(antes.cortes[0].ocupadas);
    expect(despues.cortes[0].apartes).toEqual(antes.cortes[0].apartes);
    expect(sha(antes.archivo.dxf)).toBe(esperado);
  });

  it('AR2605448: la tira y la tapa son de restos; su separación no da largo para stock', () => {
    const corte = generarCorteRemolques(b, stock).cortes[0];
    expect(corte.apartes.map(p => [p.x, p.w, p.h])).toEqual([[7016, 3816, 350], [12332, 380, 530]]);
    expect(corte.apartes.every(p => p.x > corte.largo)).toBe(true);
    expect(corte.ocupadas.every(p => p.x + p.ancho <= corte.largo)).toBe(true);
    expect(corte.entidades.textos.filter(t => t.valor === 'CORTAR DE RESTOS')).toHaveLength(2);
  });
});

describe('aprovechamiento sin descartar lona que aún puede dar un saco', () => {
  it('no deja que una franja demasiado estrecha fragmente un retal válido', () => {
    const ocupadas = [{ x: 0, y: 0, ancho: 4000, hueco: 1800 },
      { x: 4000, y: 0, ancho: 800, hueco: 1200 }, { x: 4800, y: 0, ancho: 200, hueco: 2500 }];
    // El hueco horizontal de 4800 × 700 se cruza con el vertical de 800 × 1300.
    // Solo se reserva lo que ocupan los sacos, nunca todo el hueco candidato.
    const { sacos } = sacosDeStock(ocupadas, 2500, '0230811');
    expect(sacosEnRetales(ocupadas, 2500, '0230811')).toEqual([]);
    expect(sacos).toHaveLength(1);
    expect(sacos[0]).toMatchObject({ x: 4000, y: 1200, ancho: 800, hueco: 1200, medida: '120X80' });
  });

  it('combina distintas medidas del catálogo en el mismo retal', () => {
    const ocupadas = [{ x: 0, y: 0, ancho: 2850, hueco: 1300 }];
    const { sacos } = sacosDeStock(ocupadas, 2500, '0230811');
    expect(new Set(sacos.map(s => s.medida)).size).toBeGreaterThan(1);
    expect(sacos.map(s => s.medida)).toEqual(['120X110', '120X160']);
    expect(sacos.reduce((area, s) => area + s.ancho * s.hueco, 0)).toBeGreaterThan(3060000);
    for (const s of sacos) {
      expect(s.x + s.ancho).toBeLessThanOrEqual(2850);
      expect(s.y).toBeGreaterThanOrEqual(1300);
      expect(s.y + s.hueco).toBeLessThanOrEqual(2500);
    }
  });

  it('el largo consumido limita también el resultado del colocador anterior', () => {
    const { sacos } = sacosDeStock([{ x: 0, y: 0, ancho: 5000, hueco: 1000 }], 2500, '0230811', 2000);
    expect(sacos.length).toBeGreaterThan(0);
    expect(sacos.every(s => s.x + s.ancho <= 2000)).toBe(true);
  });

  it('no cruza piezas ni sacos y conserva el catálogo en distintas distribuciones de retales', () => {
    const solapan = (a, b) => a.x < b.x + b.ancho - 0.001 && b.x < a.x + a.ancho - 0.001
      && a.y < b.y + b.hueco - 0.001 && b.y < a.y + a.hueco - 0.001;
    for (const largo of [2000, 2850, 3800, 5000]) for (const alto of [700, 1200, 1800]) {
      const ocupadas = [{ x: 0, y: 0, ancho: largo - 800, hueco: alto }, { x: largo - 800, y: 0, ancho: 800, hueco: 500 }];
      const copia = structuredClone(ocupadas);
      const { sacos } = sacosDeStock(ocupadas, 2500, '0230811', largo);
      expect(ocupadas).toEqual(copia);
      for (const [i, s] of sacos.entries()) {
        expect([...ocupadas, ...sacos.slice(i + 1)].some(p => solapan(s, p))).toBe(false);
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.y).toBeGreaterThanOrEqual(0);
        expect(s.x + s.ancho).toBeLessThanOrEqual(largo);
        expect(s.y + s.hueco).toBeLessThanOrEqual(2500);
        const [alto, ancho] = s.medida.split('X').map(Number);
        expect(SACOS.some(([h, w]) => Math.abs(h - alto) <= 5 && Math.abs(w - ancho) <= 5)).toBe(true);
        expect(alto * ancho * 100).toBe(s.ancho * s.hueco);
      }
      expect(sacos.every(s => SACOS.some(([h, w]) => s.medidaCatalogo === `${h}X${w}`))).toBe(true);
    }
  });
});
