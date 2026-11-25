import { describe, expect, it } from 'vitest';
import type { EntidadDxf } from '../tipos.ts';
import { cotasDelPlano, textoLimpio, tramosDelCorte } from './lonasCorte.ts';
import type { Pieza } from './tipos.ts';

const l = (x1: number, y1: number, x2: number, y2: number): Pieza => ({ tipo: 'linea', capa: 'DISCO1', id: `${x1},${y1},${x2},${y2}`, a: { x: x1, y: y1 }, b: { x: x2, y: y2 } });
const rect = (x0: number, y0: number, x1: number, y1: number) => [l(x0, y0, x1, y0), l(x1, y0, x1, y1), l(x1, y1, x0, y1), l(x0, y1, x0, y0)];
const cota = (x1: number, y1: number, x2: number, y2: number, { tipo = 0, giro = 0 } = {}): EntidadDxf => ({
  type: 'DIMENSION',
  pairs: [[70, String(32 + tipo)], [13, String(x1)], [23, String(y1)], [14, String(x2)], [24, String(y2)], [50, String(giro)]],
});

describe('cotasDelPlano', () => {
  it('lee las cotas rectas en mm y descarta las inclinadas y las de espacio papel', () => {
    const cotas = cotasDelPlano([
      cota(0, 0, 1209.3, 0),
      cota(0, 0, 0, 293, { giro: 90 }),
      cota(0, 0, 100, 0.5, { tipo: 1 }),
      cota(0, 0, 100, 100, { tipo: 1 }),
      cota(0, 0, 100, 0, { giro: 30 }),
      { type: 'DIMENSION', pairs: [[67, '1'], [70, '32'], [13, '0'], [23, '0'], [14, '50'], [24, '0']] },
    ], 10);
    expect(cotas.map(c => [c.eje, Math.round(c.largo)])).toEqual([['x', 12093], ['y', 2930], ['x', 1000]]);
  });
});

describe('textoLimpio', () => {
  it('quita los códigos de formato del MTEXT', () => {
    expect(textoLimpio([[1, '{\\fArial|b1;G650 VERDE}\\P6026 %%C12']])).toBe('G650 VERDE 6026 Ø12');
  });
});

describe('tramosDelCorte', () => {
  it('separa los trozos del corte, mide cada uno por su cota y le asigna su texto', () => {
    // Como AR2605626: dos trozos de 12,09 m (lona de 2,93 m y rejilla de 1,75 m) separados 1 m.
    const piezas = [...rect(0, 3000, 12093, 5930), l(6000, 3000, 6000, 5930), ...rect(0, 0, 12093, 1750)];
    const textos = [
      { x: 6000, y: 6300, texto: 'G650 VERDE 6026' },
      { x: 3000, y: 2200, texto: 'REJILLA 1ª VERDE' },
      { x: 50000, y: 0, texto: 'LEYENDA LEJOS' },
    ];
    const tramos = tramosDelCorte(piezas, textos, [
      { eje: 'x', a: { x: 0, y: 6100 }, b: { x: 12093, y: 6100 }, largo: 12093 },
      { eje: 'x', a: { x: 0, y: 6100 }, b: { x: 6000, y: 6100 }, largo: 6000 },
    ]);
    expect(tramos).toEqual([
      { anchoMm: 12093, altoMm: 2930, largoMm: 12093, porCota: true, textos: ['G650 VERDE 6026'] },
      { anchoMm: 12093, altoMm: 1750, largoMm: 12093, porCota: false, textos: ['REJILLA 1ª VERDE'] },
    ]);
  });

  it('sin cota usa el lado largo del trozo y no toma cotas que no le corresponden', () => {
    const tramos = tramosDelCorte(rect(0, 0, 4000, 1500), [], [{ eje: 'x', a: { x: 0, y: 0 }, b: { x: 20000, y: 0 }, largo: 20000 }]);
    expect(tramos).toEqual([{ anchoMm: 4000, altoMm: 1500, largoMm: 4000, porCota: false, textos: [] }]);
  });
});
