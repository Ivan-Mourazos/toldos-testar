import { describe, expect, it } from 'vitest';
import { asignarCapas } from './capas.ts';
import type { Pieza } from './tipos.ts';
const l = (capa: string): Pieza => ({ tipo: 'linea', capa, id: capa, a: { x: 0, y: 0 }, b: { x: 1, y: 0 } });
describe('asignarCapas', () => {
  it('usa las fijas, la tabla y las decisiones; lista las desconocidas con su color', () => {
    const r = asignarCapas([l('disco1'), l('corte'), l('LINEAS'), l('cotas'), l('raro')], { CORTE: 'DISCO1', COTAS: 'NO_CORTAR' }, { LINEAS: 'ROTULADOR' }, { raro: { color: 3 } });
    expect(r.piezas.map(p => p.capa)).toEqual(['DISCO1', 'DISCO1', 'ROTULADOR', 'raro']);
    expect(r.desconocidas).toEqual([{ capa: 'raro', color: 3, piezas: 1 }]);
    expect(r.descartadas).toBe(1);
  });
  it('sugiere la herramienta por el color, pero la capa sigue desconocida', () => {
    const r = asignarCapas([l('NUEVA'), l('VERDE')], {}, {}, { NUEVA: { color: 112 }, VERDE: { color: 3 } });
    expect(r.desconocidas).toEqual([{ capa: 'NUEVA', color: 112, piezas: 1, sugerida: 'CUTTER' }, { capa: 'VERDE', color: 3, piezas: 1 }]);
    expect(r.desconocidas[1]).not.toHaveProperty('sugerida');
  });
  it('taladro y texto salen en minúsculas como las capas del bot', () => {
    expect(asignarCapas([l('TALADRO'), l('Texto')], {}, {}, {}).piezas.map(p => p.capa)).toEqual(['taladro', 'texto']);
  });
});
it('normaliza claves y descarta una capa sin nombre', () => {
  const r = asignarCapas([l('b'), l('RaRo'), l('')], { ' b ': 'DISCO2' }, {}, { RARO: { color: 106 } });
  expect(r.piezas.map(p => p.capa)).toEqual(['DISCO2', 'RaRo']);
  expect(r.desconocidas).toEqual([{ capa: 'RaRo', color: 106, piezas: 1, sugerida: 'texto' }]);
  expect(r.descartadas).toBe(1);
});

it('no sugiere herramienta si falta el color de la capa', () => {
  expect(asignarCapas([l('rara')], {}, {}, {}).desconocidas[0]).not.toHaveProperty('sugerida');
});
