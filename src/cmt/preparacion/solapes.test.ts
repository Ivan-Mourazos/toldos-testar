import { describe, expect, it } from 'vitest';
import { aplicarSolapes, buscarSolapes, longitud, quitarRepetidos, restar } from './solapes.ts';
import type { Pieza } from './tipos.ts';
const l = (capa: string, x1: number, y1: number, x2: number, y2: number, id = 'l'): Pieza => ({ tipo: 'linea', capa, id, a: { x: x1, y: y1 }, b: { x: x2, y: y2 } });
const arco = (capa: string, desde: number, hasta: number, circulo = false): Pieza => ({ tipo: 'arco', capa, id: 'a', c: { x: 0, y: 0 }, r: 100, desde, hasta, circulo });
const total = (ps: Pieza[]) => ps.reduce((s, p) => s + longitud(p), 0);

describe('restar', () => {
  it('quita el tramo central de una línea y deja dos', () => {
    const r = restar(l('D', 0, 0, 100, 0), l('D', 30, 0, 60, 0));
    expect(r).toHaveLength(2); expect(total(r)).toBeCloseTo(70);
  });
  it('líneas paralelas a 0,02 mm no se tocan', () => expect(restar(l('D', 0, 0, 100, 0), l('D', 0, 0.02, 100, 0.02))).toHaveLength(1));
  it('línea idéntica en sentido contrario desaparece', () => expect(restar(l('D', 0, 0, 100, 0), l('D', 100, 0, 0, 0))).toEqual([]));
  it('arco pisado por la mitad', () => expect(total(restar(arco('D', 0, 180), arco('D', 90, 270)))).toBeCloseTo(100 * Math.PI / 2));
  it('círculo menos un arco queda en un solo arco', () => {
    const r = restar(arco('D', 0, 360, true), arco('D', 350, 10));
    expect(r).toHaveLength(1); expect(total(r)).toBeCloseTo(100 * Math.PI * 2 * 340 / 360);
  });
});

describe('quitarRepetidos', () => {
  it('quita duplicados de la misma capa y respeta las de otra', () => {
    const r = quitarRepetidos([l('D', 0, 0, 100, 0, '1'), l('D', 0, 0, 100, 0, '2'), l('R', 0, 0, 100, 0, '3')]);
    expect(r.piezas.map(p => p.id)).toEqual(['1', '3']); expect(r.mm).toBeCloseTo(100);
  });
});

describe('solapes entre capas', () => {
  it('agrupa por pareja y aplica la decisión', () => {
    const ps = [l('DISCO1', 0, 0, 100, 0, '1'), l('ROTULADOR', 50, 0, 150, 0, '2')];
    const g = buscarSolapes(ps);
    expect(g).toHaveLength(1); expect(g[0].clave).toBe('DISCO1|ROTULADOR'); expect(g[0].mm).toBeCloseTo(50);
    const r = aplicarSolapes(ps, { 'DISCO1|ROTULADOR': 'DISCO1' });
    expect(total(r.filter(p => p.capa === 'ROTULADOR'))).toBeCloseTo(50);
    expect(total(r.filter(p => p.capa === 'DISCO1'))).toBeCloseTo(100);
  });
});
it('detecta simétricamente un tramo corto ligeramente inclinado', () => {
  const largo = l('A', 0, 0, 3000, 0), corto = l('B', 100, 0, 110, 0.005);
  expect(total(restar(largo, corto))).toBeCloseTo(2990);
  expect(restar(corto, largo)).toEqual([]);
});

it('marca solo el tramo pisado, ni la primera ni la segunda pieza entera', () => {
  expect(buscarSolapes([l('A', 0, 0, 100, 0), l('B', 70, 0, 140, 0)])[0].zonas).toEqual([{ x0: 70, y0: 0, x1: 100, y1: 0 }]);
});

it('rechaza una capa que no pertenece al grupo', () => {
  expect(() => aplicarSolapes([l('A', 0, 0, 100, 0), l('B', 0, 0, 100, 0)], { 'A|B': 'C' })).toThrow();
});
