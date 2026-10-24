import { describe, expect, it } from 'vitest';
import { apilable, pedidoDe, puerta4638 } from '../puertas/__fixtures__/ejemplos.ts';
import { escribirPlanoPuertas } from '../puertas/plano.ts';
import { corteDelPlano, entidadesModelo, huellaCorte } from './corteDwg.js';

const cabecera = { cliente: 'OTRO', tecnico: 'IVÁN', revisor: '', fecha: '2026-10-24' };
const plano = () => escribirPlanoPuertas({ pedido: pedidoDe('AR2600001', puerta4638(), { ...apilable(), of: '0239999' }), cabecera });
const linea = (capa, x1, y1, x2, y2) => ({ tipo: 'LINE', capa, segmentos: [[[x1, y1], [x2, y2]]], puntos: [[x1, y1], [x2, y2]] });
const polilinea = (capa, puntos) => ({ tipo: 'LWPOLYLINE', capa, puntos,
  segmentos: puntos.map((p, i) => [p, puntos[(i + 1) % puntos.length]]), arcos: [] });

describe('corte del plano (flujo del DWG)', () => {
  it('saca lo de dentro del recuadro CORTE, sin cotas ni el recuadro, y sin nada fuera', () => {
    const corte = corteDelPlano(plano());
    expect(corte.error).toBeNull();
    expect(corte.fuera).toEqual([]);
    expect(corte.entidades.length).toBeGreaterThan(20);
    expect(corte.entidades.some((e) => e.cota || e.capa === 'RECUADROS')).toBe(false);
    expect(corte.entidades.some((e) => e.capa === 'DISCO1')).toBe(true);
    // El dibujo de las puertas, a la izquierda, no entra en el corte.
    expect(Math.min(...corte.entidades.flatMap((e) => e.puntos.map((p) => p[0])))).toBeGreaterThanOrEqual(corte.recuadro.x0);
    expect(corte.huella).toMatch(/^[0-9a-f]{64}$/);
    expect(corteDelPlano(plano()).huella).toBe(corte.huella);
  });

  it('avisa si una línea de corte queda fuera de los recuadros', () => {
    const dxf = plano().replace(/\r\n/g, '\n');
    const { recuadro } = corteDelPlano(dxf);
    // Una línea de DISCO1 sacada a la derecha de todo, fuera de los dos recuadros.
    const x = recuadro.x1 + 50, fin = dxf.indexOf('  0\nENDSEC\n', dxf.indexOf('\nENTITIES\n'));
    const conLineaFuera = `${dxf.slice(0, fin)}  0\nLINE\n  8\nDISCO1\n 10\n${x}\n 20\n${recuadro.y0}\n 11\n${x + 1}\n 21\n${recuadro.y0}\n${dxf.slice(fin)}`;
    expect(entidadesModelo(conLineaFuera).filter((e) => e.capa === 'DISCO1' && e.puntos.some(([px]) => px === x))).toHaveLength(1);
    const corte = corteDelPlano(conLineaFuera);
    expect(corte.fuera).toHaveLength(1);
    expect(corte.error).toContain('fuera de los recuadros');
  });

  it('sin recuadro CORTE no hay corte', () => {
    expect(corteDelPlano(plano().replace(/\r?\nCORTE\r?\n/g, '\nOTRA COSA\n')).error).toContain('recuadro CORTE');
  });
});

describe('huella del corte', () => {
  const pieza = [linea('DISCO1', 0, 0, 2, 0), linea('DISCO1', 2, 0, 2, 1), linea('DISCO1', 2, 1, 0, 1), linea('DISCO1', 0, 1, 0, 0), linea('ROTULADOR', 0.1, 0.5, 1.9, 0.5)];
  const huella = huellaCorte(pieza);
  it('no depende del orden, del sentido ni de que sea una polilínea o líneas sueltas', () => {
    expect(huellaCorte([...pieza].reverse())).toBe(huella);
    expect(huellaCorte(pieza.map((e) => ({ ...e, segmentos: e.segmentos.map(([p, q]) => [q, p]) })))).toBe(huella);
    expect(huellaCorte([polilinea('DISCO1', [[0, 0], [2, 0], [2, 1], [0, 1]]), pieza[4]])).toBe(huella);
    // Una línea partida en dos tramos seguidos es la misma raya.
    expect(huellaCorte([...pieza.slice(0, 4), linea('ROTULADOR', 0.1, 0.5, 1, 0.5), linea('ROTULADOR', 1, 0.5, 1.9, 0.5)])).toBe(huella);
  });
  it('no cambia si se mueve el corte entero', () => {
    const mover = (e) => ({ ...e, segmentos: e.segmentos.map((s) => s.map(([x, y]) => [x + 30, y - 4])), puntos: e.puntos.map(([x, y]) => [x + 30, y - 4]) });
    expect(huellaCorte(pieza.map(mover))).toBe(huella);
  });
  it('cambia si cambia una pieza, una raya o su capa', () => {
    expect(huellaCorte([...pieza.slice(0, 4), linea('ROTULADOR', 0.1, 0.6, 1.9, 0.6)])).not.toBe(huella);
    expect(huellaCorte([linea('DISCO1', 0, 0, 2.01, 0), ...pieza.slice(1)])).not.toBe(huella);
    expect(huellaCorte([...pieza.slice(0, 4), linea('DISCO1', 0.1, 0.5, 1.9, 0.5)])).not.toBe(huella);
  });
});
