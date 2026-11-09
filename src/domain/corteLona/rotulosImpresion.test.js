import { expect, it } from 'vitest';
import { colocar } from './rotulosImpresion.js';
import { cajasRotulos } from './auditoriaRotulos.ts';

function rotular(w, h, textos, giro = 0) {
  const puntos = [[0, 0], [w, 0], [w, h], [0, h]];
  const lineas = puntos.map((a, i) => ({ tipo: 'raya', capa: 'DISCO1', a, b: puntos[(i + 1) % 4] }));
  const entidades = { textos, cotas: [], polilineas: [], arcos: [], circulos: [],
    lineas: lineas.map(l => ({ x1: l.a[0], y1: l.a[1], x2: l.b[0], y2: l.b[1] })) };
  const plano = { lineas: [] };
  colocar({ nombre: 'CORTE', corte: true, giro, cotasFijas: true, interioresObligatorios: true, escala: 10,
    zona: { x0: -.4, x1: w + .4, y0: -.4, y1: h + .4 }, entidades,
    origenes: new Map(textos.map(t => [t, { x: t.x, y: t.y, giro: t.giro }])) }, lineas, plano);
  return plano;
}
const texto = (valor, x, y) => ({ capa: 'texto', valor, x, y, h: .22, ancho: 2.2, giro: 0, ancla: 5 });
const caja = t => cajasRotulos([{ tipo: 'texto', valor: t.valor, punto: [t.x, t.y], h: t.h, ancho: t.ancho, giro: t.giro, ancla: t.ancla }])[0];

it('reparte el hueco de una tira entre su número y OF, sin sacarlos con referencias', () => {
  const ts = [texto('A · ET 1', 5, .03), texto('0233015', 5, .09)];
  expect(rotular(10, .12, ts).lineas).toEqual([]);
  for (const t of ts) {
    const b = caja(t);
    expect(b.x0).toBeGreaterThan(0); expect(b.x1).toBeLessThan(10);
    expect(b.y0).toBeGreaterThan(0); expect(b.y1).toBeLessThan(.12);
    expect(t.h * 10).toBeGreaterThan(.25);
  }
});
it('gira los identificadores dentro de una pieza estrecha para aprovechar su largo', () => {
  const t = texto('A · CACHO', .06, 5);
  expect(rotular(.12, 10, [t]).lineas).toEqual([]);
  expect(t.giro).toBe(90);
  expect(t.h * 10).toBeGreaterThan(.8);
  expect(caja(t).x0).toBeGreaterThan(0); expect(caja(t).x1).toBeLessThan(.12);
});
it('mantiene el identificador derecho cuando también gira su ventana', () => {
  const t = texto('A · CACHO', .06, 5);
  rotular(.12, 10, [t], 90);
  expect((t.giro + 90) % 360).toBe(0);
});
