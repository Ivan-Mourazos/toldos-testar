import test from 'node:test';
import assert from 'node:assert/strict';
import { caras, filasPanos, pedidoDe, candidatoUnico } from './geometria.mjs';

const raya = (a, b) => ({ tipo: 'raya', capa: 'DISCO1', a, b });
test('reconstruye dos caras con una unión en T y no duplica el borde compartido', () => {
  const m = [raya([0, 0], [10, 0]), raya([10, 0], [10, 10]), raya([10, 10], [0, 10]),
    raya([0, 10], [0, 0]), raya([0, 5], [10, 5]), raya([10, 5], [0, 5])];
  assert.deepEqual(caras(m).map(c => c.area).sort(), [50, 50]);
});
test('un contorno abierto no cuenta como pieza cerrada', () => {
  assert.equal(caras([raya([0, 0], [10, 0]), raya([10, 0], [10, 10])]).length, 0);
});
test('agrupa referencias distintas que comparten la misma franja de rollo', () => {
  const p = (codigo, x0, y0, y1) => ({ codigo, caja: { x0, x1: x0 + 5000, y0, y1 } });
  const filas = filasPanos([p('A', 0, 0, 666), p('B', 0, 666, 1332), p('C', 0, 1332, 1998), p('D', 0, 4000, 4666)]);
  assert.deepEqual(filas.map(f => f.codigos), [['A', 'B', 'C'], ['D']]);
});
test('no mezcla dos filas lejanas aunque coincida la altura', () => {
  const p = x => ({ codigo: 'A', caja: { x0: x, x1: x + 100, y0: 0, y1: 666 } });
  assert.equal(filasPanos([p(0), p(500)]).length, 2);
});
test('normaliza pedidos sin cambiar la numeración', () => {
  assert.equal(pedidoDe('AR2605047'), 'AR.26.05047');
  assert.equal(pedidoDe('AR.25.00103'), 'AR.25.00103');
  assert.equal(pedidoDe('AR26050470'), null);
});
test('una línea repetida por referencia queda ambigua', () => {
  assert.equal(candidatoUnico([{ IDOrderLine: 'a' }, { IDOrderLine: 'b' }]), null);
  assert.equal(candidatoUnico([{ IDOrderLine: 'a' }]).IDOrderLine, 'a');
});
