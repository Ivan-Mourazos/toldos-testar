import { describe, expect, it } from 'vitest';
import { hornear, transformarPiezas, tramoPolilinea } from './hornear.ts';
import type { EntidadDxf } from '../tipos.ts';

const e = (type: string, pairs: [number, string][], transformacion?: EntidadDxf['transformacion']): EntidadDxf => ({ type, pairs, transformacion });

describe('tramoPolilinea', () => {
  it('bulge 1 es media vuelta antihoraria con centro en el punto medio', () => {
    const t = tramoPolilinea({ x: 0, y: 0 }, { x: 2, y: 0 }, 1);
    expect(t.tipo).toBe('arco');
    if (t.tipo !== 'arco') return;
    expect(t.c.x).toBeCloseTo(1); expect(t.c.y).toBeCloseTo(0); expect(t.r).toBeCloseTo(1);
    expect(t.desde).toBeCloseTo(180); expect(t.hasta).toBeCloseTo(0);
  });
  it('bulge negativo invierte desde/hasta', () => {
    const t = tramoPolilinea({ x: 0, y: 0 }, { x: 2, y: 0 }, -1);
    if (t.tipo !== 'arco') throw new Error('arco');
    expect(t.desde).toBeCloseTo(0); expect(t.hasta).toBeCloseTo(180);
  });
});

describe('hornear', () => {
  it('descompone una polilínea cerrada en cuatro líneas', () => {
    const r = hornear([e('LWPOLYLINE', [[5, 'A'], [8, 'corte'], [70, '1'], [90, '4'], [10, '0'], [20, '0'], [10, '2'], [20, '0'], [10, '2'], [20, '1'], [10, '0'], [20, '1']])]);
    expect(r.dudas).toEqual([]);
    expect(r.piezas.map(p => p.tipo)).toEqual(['linea', 'linea', 'linea', 'linea']);
    expect(r.piezas.every(p => p.capa === 'corte')).toBe(true);
  });
  it('aplica la transformación de bloque a un arco con giro de 90°', () => {
    const r = hornear([e('ARC', [[5, 'B'], [8, 'corte'], [10, '1'], [20, '0'], [40, '1'], [50, '0'], [51, '90']], [0, 1, -1, 0, 10, 0])]);
    const a = r.piezas[0];
    if (a.tipo !== 'arco') throw new Error('arco');
    expect(a.c.x).toBeCloseTo(10); expect(a.c.y).toBeCloseTo(1);
    expect(a.desde).toBeCloseTo(90); expect(a.hasta).toBeCloseTo(180);
  });
  it('un espejo intercambia desde y hasta', () => {
    const r = hornear([e('ARC', [[5, 'C'], [8, 'corte'], [10, '0'], [20, '0'], [40, '1'], [50, '0'], [51, '90']], [-1, 0, 0, 1, 0, 0])]);
    const a = r.piezas[0];
    if (a.tipo !== 'arco') throw new Error('arco');
    expect(a.desde).toBeCloseTo(90); expect(a.hasta).toBeCloseTo(180);
  });
  it('normal -Z en un círculo refleja el centro en X', () => {
    const r = hornear([e('CIRCLE', [[5, 'D'], [8, 'corte'], [10, '3'], [20, '4'], [40, '1'], [230, '-1']])]);
    const a = r.piezas[0];
    if (a.tipo !== 'arco') throw new Error('arco');
    expect(a.c.x).toBeCloseTo(-3); expect(a.c.y).toBeCloseTo(4); expect(a.circulo).toBe(true);
  });
  it('escala desigual en un arco es duda', () => {
    const r = hornear([e('ARC', [[5, 'E'], [8, 'corte'], [10, '0'], [20, '0'], [40, '1'], [50, '0'], [51, '90']], [2, 0, 0, 1, 0, 0])]);
    expect(r.dudas[0].motivo).toMatch(/escala desigual/);
  });
  it('SPLINE es duda con indicación para ZWCAD', () => {
    const r = hornear([e('SPLINE', [[5, 'F'], [8, 'corte']])]);
    expect(r.dudas[0].motivo).toMatch(/SPLINE en la capa corte.*ZWCAD/);
  });
  it('omite HATCH con aviso', () => {
    const r = hornear([e('HATCH', [[5, 'G'], [8, 'corte']])]);
    expect(r.piezas).toEqual([]); expect(r.dudas).toEqual([]); expect(r.avisos).toHaveLength(1);
  });
});

describe('transformarPiezas', () => {
  it('escala ×1000 líneas, arcos y altura de texto', () => {
    const [l, a, t] = transformarPiezas([
      { tipo: 'linea', capa: 'x', id: '1', a: { x: 0, y: 0 }, b: { x: 1.5, y: 0 } },
      { tipo: 'arco', capa: 'x', id: '2', c: { x: 1, y: 1 }, r: 0.02, desde: 0, hasta: 90, circulo: false },
      { tipo: 'texto', capa: 'x', id: '3', pares: [[10, '1'], [20, '2'], [40, '0.05'], [1, 'A']] },
    ], [1000, 0, 0, 1000, 0, 0]);
    expect(l.tipo === 'linea' && l.b.x).toBeCloseTo(1500);
    expect(a.tipo === 'arco' && a.r).toBeCloseTo(20);
    expect(t.tipo === 'texto' && Number(t.pares.find(p => p[0] === 40)![1])).toBeCloseTo(50);
  });
});
import { leerDxf } from '../dxf.ts';
import { dxfPrueba } from './pruebaDxf.ts';
import { descomponer } from './hornear.ts';

it.each([
  e('LINE', [[10, '1'], [20, '2'], [11, '3']]),
  e('CIRCLE', [[10, '1'], [20, '2'], [40, '0']]),
  e('TEXT', [[1, 'A'], [10, '1'], [20, '2'], [40, '-1']]),
  ...[40, 41, 43].map(c => e('LWPOLYLINE', [[90, '2'], [10, '1'], [20, '2'], [10, '2'], [20, '3'], [c, '1']])),
  e('LWPOLYLINE', [[90, '2'], [10, '1'], [20, '2'], [10, '3'], [42, '1']]),
  e('ELLIPSE', [[8, 'corte']]),
])('bloquea $type sin geometría comprobada', entidad => {
  const r = hornear([entidad]);
  expect(r.piezas).toEqual([]);
  expect(r.dudas[0].motivo).toContain('ZWCAD');
});

it('detecta INSERT con normal negativa antes de descomponer', () => {
  const d = leerDxf(dxfPrueba({ entidades: ['0\nINSERT\n8\ncorte\n230\n-1'] }));
  descomponer(d, []);
  expect(hornear(d.entities).dudas[0].motivo).toMatch(/INSERT.*normal/);
});

it('usa solo la inserción para texto sin justificar y copia los parámetros del estilo', () => {
  const r = hornear([e('TEXT', [[1, 'A'], [7, 'T'], [10, '1'], [20, '2'], [11, '99'], [21, '99'], [40, '1']], [1, 0, 0, 1, 10, 20])], { T: { 3: 'simplex.shx', 41: '0.8', 50: '10' } });
  expect(r.piezas[0]).toMatchObject({ pares: expect.arrayContaining([[10, '11'], [20, '22'], [41, '0.8'], [51, '10']]) });
  expect(r.piezas[0]).not.toMatchObject({ pares: expect.arrayContaining([[11, expect.anything()]]) });
  expect(r.avisos[0].motivo).toContain('.shx');
});

it('exige ancla para texto justificado', () => {
  expect(hornear([e('TEXT', [[1, 'A'], [10, '1'], [20, '2'], [40, '1'], [72, '1']])]).dudas).toHaveLength(1);
});

it('conserva las dimensiones del bloque contrastado con el robot', () => {
  const archivo = readFileSync(new URL('../__fixtures__/corpus-bloque.dxf', import.meta.url), 'utf8');
  const d = leerDxf(archivo);
  descomponer(d, []);
  const { piezas, dudas } = hornear(d.entities);
  expect(dudas).toEqual([]);
  const puntos = piezas.flatMap(p => p.tipo === 'linea' ? [p.a, p.b] : []);
  const xs = puntos.map(p => p.x), ys = puntos.map(p => p.y);
  const resumen = resumirObjetos(dxfACmt(archivo).objetos);
  expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(resumen.anchoMm, 1);
  expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(resumen.altoMm, 1);
});
import { readFileSync } from 'node:fs';
import { dxfACmt } from '../index.ts';
import { resumirObjetos } from '../../cmtHerramientaRoutes.js';
