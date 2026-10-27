import { describe, expect, it } from 'vitest';
import { piezasSolapas } from './solapas.js';
import { calculateSolapas, formatSolapaVelcroLabels, normalizeSolapas } from '../solapasRules.js';

const ar2604205Solapas = [
  { nombre: 'A', largo: 275, ancho: 51 },
  { nombre: 'B', largo: 275, ancho: 25.5 },
  { nombre: 'C', largo: 275, ancho: 35.5 },
  { nombre: 'D', largo: 275, ancho: 40, oblicua: true, ancho2: 85 },
  { nombre: 'E', largo: 275, ancho: 37 },
  { nombre: 'F', largo: 275, ancho: 26.5 },
  { nombre: 'G', largo: 275, ancho: 35.5 }
];

const ar2604890Solapas = [
  { nombre: 'AB', largo: 390, ancho: 28, velcroTipo: 'BRAVO', velcroColor: 'NEGRO', velcroLado: 'POR DERECHO' },
  { nombre: 'BC', largo: 390, ancho: 38, velcroTipo: 'BRAVO', velcroColor: 'NEGRO', velcroLado: 'POR DERECHO' },
  { nombre: 'CD', largo: 390, ancho: 28, velcroTipo: 'BRAVO', velcroColor: 'NEGRO', velcroLado: 'POR DERECHO' },
  { nombre: 'JK', largo: 411, ancho: 28, velcroTipo: 'BRAVO', velcroColor: 'NEGRO', velcroLado: 'POR DERECHO' },
  { nombre: 'KL', largo: 411, ancho: 38, velcroTipo: 'BRAVO', velcroColor: 'NEGRO', velcroLado: 'POR DERECHO' },
  { nombre: 'LM', largo: 422, ancho: 28, velcroTipo: 'BRAVO', velcroColor: 'NEGRO', velcroLado: 'POR DERECHO' }
];

describe('Solapas con velcro (SOLAPACONVELCROS)', () => {
  it('AR2604205: siete solapas A–G al corte, con la D oblicua partida a 250 con 2 cm de empate (D1 250 × 85..44,1 y D2 27 × 44,4..40)', () => {
    const piezas = piezasSolapas({ solapas: ar2604205Solapas, anchoRollo: 250 });
    expect(piezas.map((p) => [p.nombre, p.largo / 10, p.alto / 10, ...(p.oblicua ? [p.ancho0 / 10, p.ancho1 / 10] : [])])).toEqual([
      ['A', 275, 51],
      ['B', 275, 25.5],
      ['C', 275, 35.5],
      ['D1', 250, 85, 85, 44.1],
      ['D2', 27, 44.4, 44.4, 40],
      ['E', 275, 37],
      ['F', 275, 26.5],
      ['G', 275, 35.5]
    ]);
    const [d1, d2] = piezas.filter((p) => p.solapaNombre === 'D');
    expect(d1.uniones).toEqual([{ valor: 'D1', u: 2490, v: 10 }]);
    expect(d2.uniones).toEqual([{ valor: 'D1', u: 10, v: 10 }]);
  });

  it('AR2604890: seis solapas rectas al corte en rollo de 250', () => {
    const piezas = piezasSolapas({ solapas: ar2604890Solapas, anchoRollo: 250 });
    expect(piezas.map((p) => [p.nombre, p.largo / 10, p.alto / 10])).toEqual([
      ['AB', 390, 28], ['BC', 390, 38], ['CD', 390, 28],
      ['JK', 411, 28], ['KL', 411, 38], ['LM', 422, 28]
    ]);
    expect(formatSolapaVelcroLabels(ar2604890Solapas[0])).toEqual([
      'VELCRO BRAVO (5) NEGRO AL CORTE DERECHO',
      'VELCRO BRAVO (5) NEGRO AL CORTE DERECHO'
    ]);
  });

  it('calcula los metros del corte colocado (3,6 m en AR2604205), reserva solo la lona y avisa del velcro sin reserva automática', () => {
    const res = calculateSolapas({
      order: { sameFabric: true, fabric: 'PVC580MAR|||250|||LONA PVC 580 MARFIL :250 AN|||PLASTICA (LONA)' },
      awning: { id: 's1', of: '0231643', model: 'SOLAPAS', units: 1, solapas: ar2604205Solapas }
    });
    expect(res.calculation.valid).toBe(true);
    expect(res.calculation.fabricMl).toBe(3.6);
    expect(res.materials).toEqual([
      { code: 'PVC580MAR', quantity: 3.6, description: 'LONA PVC 580 MARFIL :250 AN' }
    ]);
    expect(res.diagnostics).toEqual([
      expect.objectContaining({ level: 'warn', message: expect.stringContaining('velcro sin reserva automática') })
    ]);
  });

  it('si una solapa lleva bastilla avisa que está pendiente de Oficina Técnica y bloquea el corte', () => {
    const conBastilla = normalizeSolapas([{ nombre: 'A', largo: 275, ancho: 51, bastilla: true }]);
    expect(() => piezasSolapas({ solapas: conBastilla, anchoRollo: 250 })).toThrow(/pendiente de Oficina Técnica/);
    const res = calculateSolapas({
      order: { sameFabric: true, fabric: 'PVC580MAR|||250|||LONA PVC 580 MARFIL :250 AN|||PLASTICA (LONA)' },
      awning: { id: 's1', of: '0231643', model: 'SOLAPAS', units: 1, solapas: conBastilla }
    });
    expect(res.diagnostics.some((d) => d.message.includes('pendiente de Oficina Técnica'))).toBe(true);
  });
});

describe('solapa oblicua en el corte (AR2604205, D de 275 con 85 y 40)', () => {
  it('lleva el alto de cada punta para dibujoCorte, con el corte inclinado de 253,5 y 27,5', () => {
    const piezas = piezasSolapas({ solapas: [{ nombre: 'D', largo: 275, ancho: 85, oblicua: true, ancho2: 40 }], anchoRollo: 250 });
    expect(piezas.map((p) => [p.nombre, p.largo, p.oblicua])).toEqual([
      ['D1', 2500, { altoIzq: 850, altoDer: 441 }],
      ['D2', 270, { altoIzq: 444, altoDer: 400 }],
    ]);
    const inclinados = piezas.map((p) => Math.hypot(p.largo, p.oblicua.altoIzq - p.oblicua.altoDer) / 10);
    expect(inclinados.map((v) => Math.round(v * 2) / 2)).toEqual([253.5, 27.5]);
  });
});
