import { expect, it } from 'vitest';
import { prepararLote, CANALON_SIN_PLANTILLA } from './lote.js';
import { CANALONES_POR_BLOQUE } from './canalon.js';

const l = { IDOrderLine: 'a', CodOrder: 'AR.26.04704', NumLine: 1, CodArticle: 'H0K420102-0034', descripcion: 'NH3200 NT600', cantidad: 8, of_: '0232434', entregaSolicitada: '2026-10-31' };
const certificado = { referencias: { '420102-0034': { descripciones: [{ descripcion: l.descripcion, corteMm: [3010, 666], cuadran: 2, geometria: 2, ultimaGeometria: true }] } } };

it('la falta de validación retiene la línea a mano aunque la fórmula sea evaluable', () => {
  const lote = prepararLote('2026-10-31', [l], {}, { referencias: {} });
  expect(lote.lineas[0].estado).toBe('a-mano');
  expect(lote.programas).toEqual([]);
});

it('conserva reparto por pedido y OF, agrupa referencias y corta exactamente juegos más sueltas', () => {
  const lote = prepararLote('2026-10-31', [l, { ...l, IDOrderLine: 'b', of_: '0232444', cantidad: 2 }], {}, certificado);
  expect(lote.nombre).toBe('LOTE 31-10');
  expect(lote.programas.reduce((n, p) => n + p.panos * p.repeticiones, 0)).toBe(10);
  expect(lote.reparto).toHaveLength(2);
  expect(lote.reparto.map(r => r.of)).toEqual(['0232434', '0232444']);
  // Los 420102 van de dos en dos: la unión es de rotulador; el resto, disco.
  expect(lote.entidades.lineas.every(l => l.capa === 'DISCO1' || (l.capa === 'ROTULADOR' && l.x1 === l.x2))).toBe(true);
  expect(lote.programas.every(p => p.y === 0)).toBe(true);
});

it('la opción por referencia cambia a sueltas y no altera la cantidad', () => {
  const lote = prepararLote('2026-10-31', [l], { '420102-0034': true }, certificado);
  expect(lote.programas).toHaveLength(1);
  expect(lote.programas[0]).toMatchObject({ filas: 1, panos: 2, repeticiones: 4 });
});

it('no permite enviar líneas que difieran de su certificado o correspondan a otra fecha', () => {
  expect(prepararLote('2026-10-31', [{ ...l, descripcion: 'NH3600 NT600' }], {}, certificado).programas).toEqual([]);
  expect(() => prepararLote('2026-10-31', [{ ...l, entregaSolicitada: '2026-11-07' }], {}, certificado)).toThrow(/fecha/);
  expect(() => prepararLote('2026-10-31', [l, l], {}, certificado)).toThrow(/duplicadas/);
});

// Taller, 28/10/2026: un canalón por unidad, en los bloques de la plantilla repetidos con su «x»; se mezclan referencias
// con el mismo juego. La 0090 y la 0092 (NB 3450) llevan el de 361; la 0002, el de 360.
it('420150: canalones en bloques de la plantilla, juntando las referencias del mismo juego', () => {
  const linea = (id, codigo, descripcion, cantidad) => ({ ...l, IDOrderLine: id, CodArticle: `H0K420150-${codigo}`, descripcion, cantidad });
  const ls = [linea('a', '0090', 'NT600 NB3450 NH3480', 20), linea('b', '0092', 'NT600 NB3450 NH3280', 2), linea('c', '0002', 'NT600 NB3450 NH3600', 15)];
  const cert = { referencias: Object.fromEntries(ls.map(x => [x.CodArticle.slice(3), { descripciones: [{ descripcion: x.descripcion,
    corteMm: [3450 + 2 * Number(x.descripcion.match(/NH(\d+)/)[1]) + 2, 666], geometria: 1, ultimaGeometria: true }] }])) };
  const lote = prepararLote('2026-10-31', ls, {}, cert);
  expect(lote.lineas.map(x => x.estado)).toEqual(['validado', 'validado', 'validado']);
  const canalones = lote.programas.filter(p => p.tipo === 'canalon');
  expect(canalones.map(p => [p.codigo, p.largoMm, p.repeticiones, p.referencias.length])).toEqual([
    ['CANALÓN 361', 3610, 1, 2], ['CANALÓN 361', 1805, 1, 2], ['CANALÓN 360', 3600, 1, 1]]);
  const hechos = codigo => canalones.filter(p => p.codigo === codigo).reduce((s, p) => s + p.canalones * p.repeticiones, 0);
  expect(hechos('CANALÓN 361')).toBeGreaterThanOrEqual(22);
  expect(hechos('CANALÓN 360')).toBe(CANALONES_POR_BLOQUE.combinado);
  expect(lote.programas.every(p => p.y === 0)).toBe(true);
});

it('420150 sin juego de canalones para su NB en la plantilla: a mano', () => {
  const lote = prepararLote('2026-10-31', [{ ...l, CodArticle: 'H0K420150-0090', descripcion: 'NT600 NB2700 NH3554' }]);
  expect(lote.lineas[0].motivos).toContain(CANALON_SIN_PLANTILLA);
  expect(lote.programas).toEqual([]);
});

// Iván, 26/10/2026 (Q-AS03): el stock se pone en corte, así que el lote real puede llevar menos que RPS. Basta con que la
// forma coincida con los cortes reales; se corta lo que pide RPS.
it('habilita la forma contrastada aunque ningún lote real cuadrara en cantidad, con la cantidad de RPS', () => {
  const l = { IDOrderLine: 'x', CodOrder: 'AR.26.05047', NumLine: 1, CodArticle: 'H0K420102-0034', descripcion: 'NH4200-200 NT600',
    cantidad: 41, of_: '0233001', entregaSolicitada: '2026-10-31' };
  const certificados = { referencias: { '420102-0034': { descripciones: [{ descripcion: l.descripcion, corteMm: [4010, 666], cuadran: 0, geometria: 3, ultimaGeometria: true }] } } };
  const lote = prepararLote('2026-10-31', [l], {}, certificados);
  expect(lote.lineas[0].estado).toBe('validado');
  expect(lote.programas.reduce((n, p) => n + p.panos * p.repeticiones, 0)).toBe(41);
});
