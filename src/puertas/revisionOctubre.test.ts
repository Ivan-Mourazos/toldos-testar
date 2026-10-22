import { describe, expect, it } from 'vitest';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { dibujarAlzadoTaller } from './planoTaller.ts';
import { base, pedidoDe } from './__fixtures__/ejemplos.ts';
import { puertaPlanoReal } from './__fixtures__/planosReales.ts';
import { anclarCotas } from './cotasPuertas.ts';
import { dibujarAlzadoEnrollable } from './planoEnrollable.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { numero, registrosDxf, valor } from '../domain/corteLona/dxfTestHelpers.js';

describe('Correcciones de taller del 22 de octubre por la noche', () => {
  it.each(['AR2605036', 'AR2604904'])('%s: entradas y sacos sin raya central de rotulador', id => {
    const r = calcularPuerta(puertaPlanoReal(id));
    const piezas = [...r.piezas, ...r.alternativasSaco?.entero ?? [], ...r.alternativasSaco?.partido ?? []];
    expect(piezas.filter(p => ['entrada', 'saco'].includes(p.clase)).every(p => p.marcas.length === 0)).toBe(true);
  });

  it('autorreparable: las tres marcas superiores se miden desde la cabecera terminada', () => {
    const p = puertaPlanoReal('AR2604904'), r = calcularPuerta(p);
    const superior = r.piezas.filter(p => p.clase === 'pano').at(-1)!;
    for (const distancia of [3.5, 20, 30]) expect(superior.marcas.some(m => Math.abs(m[1] - (superior.alto - 3.5 - distancia)) < .001
      && m[1] === m[3] && Math.abs(m[2] - m[0]) > p.frente / 2)).toBe(true);
  });

  it('el bot abre los dos huecos laterales de cada entrada y conserva cerrados los de cintas', () => {
    const r = generarCortePuertas(pedidoDe('AR2605036', puertaPlanoReal('AR2605036')));
    const c = r.cortes.find(c => c.colocadas.some(t => t.pieza.clase === 'entrada'))!;
    const t = c.colocadas.find(t => t.pieza.clase === 'entrada')!;
    expect(t.girada).toBe(false);
    const x = t.x + 10, h = t.pieza.huecos[0];
    expect(c.entidades.lineas.some(l => l.capa === 'CUTTER' && l.x1 === x && l.x2 === x
      && l.y1 >= t.y + h.y * 10 && l.y1 <= t.y + (h.y + h.alto) * 10)).toBe(false);
    const alzado = dibujarAlzadoTaller(puertaPlanoReal('AR2605036'), 'A').lienzo;
    expect(alzado.polilineas.filter(p => p.capa === 'CUTTER').length).toBeGreaterThan(0);
  });

  it('el saco partido conserva las dos mitades pegadas y compartiendo corte', () => {
    const r = generarCortePuertas(pedidoDe('AR2605036', puertaPlanoReal('AR2605036')));
    const c = r.cortes.find(c => c.opcion === 'saco-partido')!;
    expect(c.colocadas).toHaveLength(2);
    const [a, b] = c.colocadas;
    expect(a.girada).toBe(false); expect(b.girada).toBe(false);
    expect(b.x).toBe(a.x); expect(b.y).toBe(a.y + a.pieza.alto * 10);
  });

  it('autorreparable: conserva el frente a lo largo si girar no evita un empate', () => {
    const p = base('PUERTAUTO', 200, 210);
    const c = generarCortePuertas(pedidoDe('AR2600001', p)).cortes.find(c => c.colocadas.some(t => t.pieza.clase === 'pano'))!;
    expect(c.colocadas.find(t => t.pieza.clase === 'pano')!.girada).toBe(false);
  });

  it('las piezas que llenan el ancho del rollo preceden a las demás', () => {
    const p = base('PUERTAUTO', 426, 515);
    const c = generarCortePuertas(pedidoDe('AR2600001', p)).cortes.find(c => c.colocadas.some(t => t.pieza.clase === 'pano'))!;
    const completas = c.colocadas.filter(t => (t.girada ? t.pieza.ancho : t.pieza.alto) === p.rollo);
    const otras = c.colocadas.filter(t => !completas.includes(t));
    expect(completas.length).toBeGreaterThan(0);
    expect(Math.max(...completas.map(t => t.x))).toBeLessThan(Math.min(...otras.map(t => t.x)));
  });

  it('las entradas iguales de autorreparable llevan el mismo nombre', () => {
    const r = calcularPuerta(puertaPlanoReal('AR2604904'));
    expect(new Set(r.piezas.filter(p => p.clase === 'entrada').map(p => p.nombre)).size).toBe(1);
  });

  it('apilable: OF, código y REVÉS comparten fila en tres columnas', () => {
    const p = puertaPlanoReal('AR2605036'), l = dibujarAlzadoTaller(p, 'A').lienzo;
    const textos = [p.of, 'A1', 'REVÉS'].map(v => l.textos.find(t => t.valor === v)!);
    expect(new Set(textos.map(t => t.y)).size).toBe(1);
    expect(new Set(textos.map(t => t.x)).size).toBe(3);
  });

  it.each(['AR2605036', 'AR2604904', 'AR2605065'])('%s: los mininúmeros conservan texto, tamaño y posición dentro de cada pieza en el alzado', id => {
    const p = puertaPlanoReal(id), r = calcularPuerta(p);
    const l = p.modelo === 'PUERTAENR' ? dibujarAlzadoEnrollable(p, 'C').lienzo : dibujarAlzadoTaller(p, 'C').lienzo;
    for (const pieza of r.piezas.filter(p => p.origenAlzado)) {
      for (const m of pieza.unionesCorte ?? []) expect(l.textos.some(t => t.capa === 'ROTULADOR' && t.valor === `c${m.numero}`
        && t.h === 1 && Math.abs(t.x - pieza.origenAlzado![0] - m.x) < .001
        && Math.abs(t.y + p.alto - pieza.origenAlzado![1] - m.y) < .001 && t.giro === (m.giro ?? 0))).toBe(true);
    }
  });

  it.each(['AR2605036', 'AR2604904', 'AR2604638'])('%s: los puntos medidos están sobre la geometría y conservan la medida', id => {
    const p = puertaPlanoReal(id), l = dibujarAlzadoTaller(p, 'A').lienzo;
    const segmentos = [...l.lineas.filter(v => v.capa !== 'texto').map(v => [v.x1, v.y1, v.x2, v.y2]),
      ...l.polilineas.flatMap(p => p.puntos.slice(0, p.cerrada ? undefined : -1).flatMap((a, i) => p.curvas?.[i] ? [] : [[...a, ...p.puntos[(i + 1) % p.puntos.length]]]))];
    const sobre = (x: number, y: number) => segmentos.some(([a, b, c, d]) => {
      const dx = c - a, dy = d - b, largo = dx * dx + dy * dy;
      const u = largo ? ((x - a) * dx + (y - b) * dy) / largo : 0;
      return u >= -.00001 && u <= 1.00001 && Math.hypot(x - a - u * dx, y - b - u * dy) < .001;
    });
    const cotas = anclarCotas(l);
    cotas.forEach((c, i) => {
      expect(sobre(c.x1, c.y1), `inicio ${i}`).toBe(true);
      expect(sobre(c.x2, c.y2), `fin ${i}`).toBe(true);
      expect(c.valor).toBe(l.cotas[i].valor);
      expect(c.d).toBe(l.cotas[i].d);
    });
  });

  it('las líneas auxiliares DIMENSION llegan a sus puntos y no quedan de largo fijo junto a la cota', () => {
    const dxf = escribirPlanoPuertas({ pedido: pedidoDe('AR2604904', puertaPlanoReal('AR2604904')),
      cabecera: { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: 'DAVID', fecha: '2026-10-22' } });
    const bloques = registrosDxf(dxf, 'BLOCKS');
    const cotas = registrosDxf(dxf).filter(r => r.tipo === 'DIMENSION' && numero(r, 13) >= 100 && numero(r, 13) < 109 && valor(r, 67) !== '1');
    expect(cotas.length).toBeGreaterThan(0);
    for (const c of cotas) {
      const inicio = bloques.findIndex(b => b.tipo === 'BLOCK' && valor(b, 2) === valor(c, 2));
      const fin = bloques.findIndex((b, i) => i > inicio && b.tipo === 'ENDBLK');
      const lineas = bloques.slice(inicio, fin).filter(b => b.tipo === 'LINE');
      for (const [sx, sy] of [[13, 23], [14, 24]]) {
        const x = numero(c, sx), y = numero(c, sy), vertical = numero(c, 50) === 90;
        if (Math.abs((vertical ? numero(c, 10) - x : numero(c, 20) - y)) <= .05) continue;
        expect(lineas.some(l => Math.min(Math.hypot(numero(l, 10) - x, numero(l, 20) - y), Math.hypot(numero(l, 11) - x, numero(l, 21) - y)) <= .05001)).toBe(true);
      }
    }
  });

  it.each(['AR2605036', 'AR2604904', 'AR2604638'])('%s: todas las cotas de alzado y corte resumido tienen ambos puntos sobre geometría', id => {
    const rs = registrosDxf(escribirPlanoPuertas({ pedido: pedidoDe(id, puertaPlanoReal(id)),
      cabecera: { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: 'DAVID', fecha: '2026-10-22' } })).filter(r => valor(r, 67) !== '1');
    const segmentos = rs.filter(r => r.tipo === 'LINE' && valor(r, 8) !== 'texto')
      .map(r => [numero(r, 10), numero(r, 20), numero(r, 11), numero(r, 21)]);
    for (const r of rs.filter(r => r.tipo === 'LWPOLYLINE')) {
      const puntos: number[][] = [];
      for (const [k, v] of r.pares as Array<[number, string]>) {
        if (k === 10) puntos.push([Number(v), 0]);
        if (k === 20 && puntos.length) puntos.at(-1)![1] = Number(v);
      }
      for (let i = 1; i < puntos.length; i++) segmentos.push([...puntos[i - 1], ...puntos[i]]);
      if (numero(r, 70) & 1) segmentos.push([...puntos.at(-1)!, ...puntos[0]]);
    }
    for (const r of rs.filter(r => r.tipo === 'DIMENSION' && numero(r, 13) >= 99 && numero(r, 13) < 130 && numero(r, 23) > 50)) {
      for (const [kx, ky] of [[13, 23], [14, 24]]) {
        const x = numero(r, kx), y = numero(r, ky);
        const distancia = Math.min(...segmentos.map(([a, b, c, d]) => {
          const dx = c - a, dy = d - b;
          const u = Math.max(0, Math.min(1, ((x - a) * dx + (y - b) * dy) / (dx * dx + dy * dy || 1)));
          return Math.hypot(x - a - u * dx, y - b - u * dy);
        }));
        expect(distancia, `cota ${numero(r, 42)} en (${x}, ${y})`).toBeLessThan(.00002);
      }
    }
  });
});
