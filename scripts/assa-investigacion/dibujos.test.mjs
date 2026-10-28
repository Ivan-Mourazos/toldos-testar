import test from 'node:test';
import assert from 'node:assert/strict';
import { cotaDePieza, textoDeReferencia, firmaEntidades } from './dibujos.mjs';
const l = { tipo: 'raya', a: [0, 0], b: [10, 0], capa: 'referencias' };
test('una cota vecina no entra por estar en la misma franja', () => {
  assert.equal(cotaDePieza({ a: [0, 0], b: [10, 0] }, [l]), true);
  assert.equal(cotaDePieza({ a: [0, 4], b: [10, 4] }, [l]), false);
});
test('el dibujo conserva textos de confección y excluye cantidades y notas grandes', () => {
  assert.equal(textoDeReferencia({ valor: 'HOK420150-0090', h: .2 }), true);
  assert.equal(textoDeReferencia({ valor: 'SOLDAR', h: .2 }), true);
  assert.equal(textoDeReferencia({ valor: 'x90', h: .2 }), false);
  assert.equal(textoDeReferencia({ valor: 'EN LA NUMERO 90', h: 3 }), false);
});
test('la firma no cambia al trasladar el dibujo ni invertir el sentido de una raya', () => {
  assert.equal(firmaEntidades([{ ...l }]), firmaEntidades([{ ...l, a: [110, 20], b: [100, 20] }]));
  assert.notEqual(firmaEntidades([l]), firmaEntidades([{ ...l, b: [11, 0] }]));
});
