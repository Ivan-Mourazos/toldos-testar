import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aceptarGemeloCal } from './aceptacion-cal.mjs';

const contraste = max => ({ ida: { max, total: 4 }, vuelta: { max, total: 4 } });
const morro = (ollao = 1.044907723) => ({ nombre: 'Morro', cuadra: false, contraste: {
  tramos: contraste(1.4935896), arcos: contraste(0), ollaos: contraste(ollao), marcas: contraste(0.6063768),
} });
test('Q-GAN07 acepta el contraste histórico concreto y conserva la tolerancia nominal', () => {
  const p = morro(), r = aceptarGemeloCal([p]);
  assert.equal(r.aceptado, true);
  assert.deepEqual(r.toleranciasMm, { contorno: 1.5, ollaos: 1 });
  assert.match(r.excepcionHistorica, /1,045/);
  assert.equal(p.contraste.ollaos.ida.max, 1.044907723);
});
test('la aprobación histórica no acepta errores nuevos ni piezas ausentes', () => {
  assert.equal(aceptarGemeloCal([morro(1.046)]).aceptado, false);
  const p = morro(); p.contraste.tramos.vuelta.total = 3;
  assert.equal(aceptarGemeloCal([p]).aceptado, false);
  assert.equal(aceptarGemeloCal([]).aceptado, false);
});
