import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { numero, registrosDxf, valor } from '../domain/corteLona/dxfTestHelpers.js';
import { base, pedidoDe } from './__fixtures__/ejemplos.ts';
import { puertaPlanoReal } from './__fixtures__/planosReales.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { generarCortePuertas } from './corte.ts';

const cabecera = { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: 'DAVID', fecha: '2026-10-22' };
const plano = (id: string) => registrosDxf(escribirPlanoPuertas({ pedido: pedidoDe(id, puertaPlanoReal(id)), cabecera }));
const alzado = (id: string) => plano(id).filter(r => valor(r, 67) !== '1' && (r.tipo === 'HATCH'
  ? (r.pares as Array<[number, string]>).some(([k, v]) => k === 20 && Number(v) > 90 && Number(v) < 101)
  : numero(r, 10) < 109 && numero(r, 20) > 90));
const horizontal = (rs: ReturnType<typeof registrosDxf>, capa: string, y: number, ancho: number) => rs.some(r => r.tipo === 'LINE' && valor(r, 8) === capa
  && Math.abs(numero(r, 20) - y) < 1e-6 && Math.abs(numero(r, 21) - y) < 1e-6 && Math.abs(Math.abs(numero(r, 11) - numero(r, 10)) - ancho) < 1e-6);

describe('Planos de apilables y autorreparables, según capas de oficina', () => {
  it('AR2605036: cabecera, bajo, entradas y empate con las capas del original', () => {
    const rs = alzado('AR2605036');
    // En el plano, frente terminado 620; el corte ya añade el escuadrado configurado.
    expect(horizontal(rs, 'DISCO1', 100.12, 6.2)).toBe(true);
    expect(horizontal(rs, 'DISCO1', 95.61, 6.2)).toBe(true);
    expect(horizontal(rs, 'DISCO1', 98.38, 6.2)).toBe(true);
    expect(horizontal(rs, 'DISCO1', 98.26, 6.2)).toBe(true);
    expect(horizontal(rs, 'ROTULADOR', 99.88, 6.2)).toBe(true);
    expect(horizontal(rs, 'ejes', 99.3, 6.2)).toBe(true);
    expect(horizontal(rs, 'borrar', 99.36, 6.2)).toBe(true);
    expect(rs.filter(r => r.tipo === 'INSERT' && valor(r, 2) === 'FLECHA2')).toHaveLength(8);
  });

  it.each(['AR2605036', 'AR2604906', 'AR2604526'])('%s: hueco y cristal conservan dos contornos con sus radios y colores', id => {
    const rs = alzado(id), p = puertaPlanoReal(id);
    for (const capa of ['curv', 'corte (vent)']) {
      const curvas = rs.filter(r => r.tipo === 'LWPOLYLINE' && valor(r, 8) === capa);
      expect(curvas).toHaveLength(p.ventanas.length);
      expect(curvas.every(r => (r.pares as Array<[number, string]>).some(([k, v]) => k === 42 && Math.abs(Number(v) - Math.tan(Math.PI / 8)) < 1e-6))).toBe(true);
    }
    expect(rs.filter(r => r.tipo === 'HATCH' && valor(r, 8) === 'referencia-1').length).toBeGreaterThanOrEqual(4);
  });

  it('AR2604904: corte real, espaciadores, empate y tres bloques de flecha', () => {
    const rs = alzado('AR2604904');
    expect(horizontal(rs, 'DISCO1', 100.035, 4.26)).toBe(true);
    expect(horizontal(rs, 'DISCO1', 94.97, 4.26)).toBe(true);
    expect(horizontal(rs, 'referencia-1', 97.97, 4.26)).toBe(true);
    expect(horizontal(rs, 'referencia-1', 97.95, 4.26)).toBe(true);
    expect(rs.filter(r => r.tipo === 'INSERT' && valor(r, 2) === 'FLECHA2')).toHaveLength(3);
    for (const x of [100.1, 102.111, 104.16]) expect(rs.some(r => r.tipo === 'LINE' && valor(r, 8) === 'ROTULADOR'
      && Math.abs(numero(r, 10) - x) < 1e-6 && Math.abs(numero(r, 11) - x) < 1e-6)).toBe(true);
  });

  it.each(['AR2605036', 'AR2604904'])('%s: cantidad, REVÉS y OF una vez en A1; el corte conserva todos los mininúmeros', id => {
    const p = { ...puertaPlanoReal(id), cantidad: 3 }, pedido = pedidoDe(id, p);
    const rs = registrosDxf(escribirPlanoPuertas({ pedido, cabecera }));
    const textos = rs.filter(r => r.tipo === 'MTEXT' && numero(r, 10) < 109 && numero(r, 20) > 90);
    for (const t of ['X3', 'REVÉS', p.of, 'A1', 'A2']) expect(textos.filter(r => valor(r, 1) === t), t).toHaveLength(1);
    expect(new Set(textos.filter(r => ['X3', 'REVÉS', p.of, 'A1'].includes(valor(r, 1) ?? '')).map(r => numero(r, 10))).size).toBe(1);
    const corte = rs.filter(r => r.tipo === 'MTEXT' && numero(r, 10) >= 110 && valor(r, 8) === 'ROTULADOR');
    const minis = generarCortePuertas(pedido).cortes.flatMap(c => {
      const lista = c.entidades.textos.filter(t => t.capa === 'ROTULADOR');
      if (c.colocadas.some(t => !['saco', 'cristal'].includes(t.pieza.clase))) return lista;
      const ids = new Set<string>();
      return c.colocadas.flatMap(t => {
        if (ids.has(t.pieza.id)) return [];
        ids.add(t.pieza.id);
        return lista.filter(m => m.x > t.x && m.y > t.y && m.x < t.x + (t.girada ? t.pieza.alto : t.pieza.ancho) * 10
          && m.y < t.y + (t.girada ? t.pieza.ancho : t.pieza.alto) * 10);
      });
    });
    expect(corte.map(r => valor(r, 1)).sort()).toEqual(minis.map(t => t.valor).sort());
    const cotas = rs.filter(r => r.tipo === 'DIMENSION' && numero(r, 13) >= 110 && numero(r, 13) < 130);
    expect(cotas.length).toBeGreaterThan(0);
    expect(cotas.every(r => valor(r, 3) === 'XERA 20')).toBe(true);
  });

  it('AR2605134 conserva el plano completo de main 0a316e1 byte por byte', () => {
    const p = { ...base('PUERTAENR', 212, 360), of: '0233175', cantidad: 3,
      entradas: [60, 131, 191].map(altura => ({ altura, diametro: 30 as const, largo: 212, alto: 8, huecos: [] })),
      enrollable: { T: 169, D: 60, margen: 6, empates: [] } };
    expect(createHash('sha256').update(escribirPlanoPuertas({ pedido: pedidoDe('AR2605134', p), cabecera })).digest('hex'))
      .toBe('7e501938d3684bcc39691f1de19e3d0fbbc3e780c7d9f26fe3dd0d855e44d2a7');
  });
});
