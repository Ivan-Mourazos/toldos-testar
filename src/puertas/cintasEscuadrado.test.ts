import { describe, expect, it } from 'vitest';
import puerta from './__fixtures__/AR2605391-puerta1.json';
import { calcularPuerta } from './calcular.ts';
import type { Puerta } from './tipos.ts';

// AR2605391, primera puerta (Iván, 04/11/2026): apilable de 864 con E.T. de 866 (1 cm por lado para escuadrar).
// Las cintas se escriben desde el borde de la puerta (29, 228, 426, 624, 823). En el corte la de la izquierda
// quedaba a 29 del borde de la E.T. y la de la derecha a 31; en el plano la muesca del extremo derecho salía
// 1 cm fuera y la cadena daba 25 y 4 a la derecha frente a 23 y 6 a la izquierda.
describe('cintas de una apilable de más de 6 m (E.T. 2 cm más larga que el frente)', () => {
  const p = puerta as unknown as Puerta;

  it('en el corte, las cintas quedan simétricas en la E.T.', () => {
    const entradas = calcularPuerta(p).piezas.filter(x => x.clase === 'entrada' && x.huecos.some(h => h.ancho === 12));
    expect(entradas.length).toBeGreaterThan(0);
    for (const e of entradas) {
      const cintas = e.huecos.filter(h => h.ancho === 12).sort((a, b) => a.x - b.x);
      const izquierda = cintas[0].x, derecha = e.ancho - (cintas.at(-1)!.x + cintas.at(-1)!.ancho);
      expect(izquierda).toBeCloseTo(30, 6);
      expect(derecha).toBeCloseTo(30, 6);
    }
  });
});
