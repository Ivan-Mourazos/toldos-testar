import { describe, expect, it } from 'vitest';
import { dxfACmt } from '../index.ts';
import { leerDxf } from '../dxf.ts';
import { escribirDxfLimpio } from './salida.ts';
import type { Pieza } from './tipos.ts';

const piezas: Pieza[] = [
  { tipo: 'linea', capa: 'DISCO1', id: '1', a: { x: 5000, y: 3000 }, b: { x: 6000, y: 3000 } },
  { tipo: 'arco', capa: 'DISCO1', id: '2', c: { x: 6000, y: 3100 }, r: 100, desde: 270, hasta: 0, circulo: false },
  { tipo: 'arco', capa: 'ROTULADOR', id: '3', c: { x: 5500, y: 3050 }, r: 2.5, desde: 0, hasta: 360, circulo: true },
];

describe('escribirDxfLimpio', () => {
  it('escribe AC1018 en mm, sin leyenda, con el dibujo en el origen y solo capas del bot', () => {
    const texto = escribirDxfLimpio(piezas);
    expect(texto).toContain('AC1018');
    const d = leerDxf(texto);
    expect(d.entities.map(e => e.type).sort()).toEqual(['ARC', 'CIRCLE', 'LINE']);
    const xs = d.entities.filter(e => e.type === 'LINE').flatMap(e => e.pairs.filter(([c]) => c === 10 || c === 11).map(([, v]) => Number(v)));
    expect(Math.min(...xs)).toBeCloseTo(0);
  });
  it('el CMT del DXF limpio sale sin dudas y recolocado', () => {
    const r = dxfACmt(escribirDxfLimpio(piezas), { recolocar: true });
    expect(r.dudas).toEqual([]); expect(r.cmt).not.toBeNull();
  });
});
it('conserva el formato del texto y solo emite ancla para texto justificado', () => {
  const pares: [number, string][] = [[1, 'Corte'], [10, '5000'], [20, '3010'], [11, '5010'], [21, '3011'], [40, '20'], [41, '0.8'], [51, '12']];
  const d = leerDxf(escribirDxfLimpio([...piezas,
    { tipo: 'texto', capa: 'texto', id: 't1', pares },
    { tipo: 'texto', capa: 'texto', id: 't2', pares: [...pares, [72, '1']] },
  ]));
  const [normal, justificado] = d.entities.filter(e => e.type === 'TEXT');
  expect(normal.pairs).not.toContainEqual([11, expect.anything()]);
  expect(normal.pairs).toContainEqual([51, '12']);
  expect(justificado.pairs.some(([c, v]) => c === 11 && Number(v) === 10)).toBe(true);
});
