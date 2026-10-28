import { expect, it } from 'vitest';
import { bloqueCanalon, canalonDe } from './canalon.js';
import { contrastarCanalon } from './contrastarCanalon.js';

const juego = canalonDe('430172-0030', 3250);
const modelo = bloqueCanalon(juego, 'combinado').lineas.map(l => ({ tipo: 'raya', capa: l.capa,
  a: [l.x1 + 10000, l.y1 + 20000], b: [l.x2 + 10000, l.y2 + 20000] }));

it('encuentra el combinado por geometría, sin rótulo ni una cantidad supuesta', () => {
  expect(contrastarCanalon(modelo, juego).coincide).toBe(true);
});

it('una pendiente parecida no basta si falta la pestaña o cambia la herramienta de un costado', () => {
  const pestaña = modelo.find(p => p.capa === 'DISCO1' && Math.abs(p.a[0] - p.b[0]) > 10 && Math.abs(p.a[0] - p.b[0]) < 110);
  expect(contrastarCanalon(modelo.filter(p => p !== pestaña), juego).coincide).toBe(false);
  const costado = modelo.find(p => p.capa === 'DISCO2');
  expect(contrastarCanalon(modelo.map(p => p === costado ? { ...p, capa: 'DISCO1' } : p), juego).coincide).toBe(false);
});

it('no certifica un bloque que contiene un recorrido repetido', () => {
  expect(contrastarCanalon([...modelo, modelo[0]], juego).coincide).toBe(false);
});
