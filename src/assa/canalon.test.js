import { describe, expect, it } from 'vitest';
import { ALTO_BLOQUE_MM, CANALONES_POR_BLOQUE, bloqueCanalon, canalonDe, juegosCanalon, pilaCanalon } from './canalon.js';

const tiene = (lineas, capa, x1, y1, x2, y2) => lineas.some(l => l.capa === capa &&
  [[l.x1, l.y1, l.x2, l.y2], [l.x2, l.y2, l.x1, l.y1]].some(v => v.every((n, i) => Math.abs(n - [x1, y1, x2, y2][i]) < 0.05)));

// Medidas del LOTE 31-10 (0090 / 0092, mitad de 1805, pestaña de 84).
describe('canalón de la 420150 como en el lote de la oficina', () => {
  const juego = canalonDe('420150-0090', 3450);
  it('la plantilla manda: largo por referencia y NB', () => {
    expect(juego).toEqual({ mitad: 1805, pestana: 84 });
    expect(canalonDe('420150-0002', 3450)).toEqual({ mitad: 1800, pestana: 79 });
    expect(canalonDe('420150-0090', 2700)).toBeNull();
    expect(canalonDe('420150-9999', 3450)).toBeNull();
  });
  it('combinado: 8 enteros en V, 7 parejas de mitades, costados DISCO2 y pestañas a 20', () => {
    const { largoMm, lineas } = bloqueCanalon(juego, 'combinado');
    expect([largoMm, ALTO_BLOQUE_MM, CANALONES_POR_BLOQUE.combinado]).toEqual([3610, 2000, 15]);
    expect(tiene(lineas, 'DISCO1', 0, 0, 1805, 50)).toBe(true);
    expect(tiene(lineas, 'DISCO1', 1805, 1950, 3610, 2000)).toBe(true);
    expect(tiene(lineas, 'DISCO2', 1805, 130, 1805, 310)).toBe(true);
    expect(tiene(lineas, 'DISCO1', 0, 20, 84, 22.33)).toBe(true);
    expect(tiene(lineas, 'DISCO1', 1805, 150, 1889, 152.33)).toBe(true);
    expect(tiene(lineas, 'DISCO2', 1805, 50, 1805, 130)).toBe(false);
  });
  it('mitades: la mitad izquierda, con el entero cortado por el centro', () => {
    const { largoMm, lineas } = bloqueCanalon(juego, 'mitades');
    expect([largoMm, CANALONES_POR_BLOQUE.mitades]).toEqual([1805, 7.5]);
    expect(tiene(lineas, 'DISCO2', 1805, 50, 1805, 130)).toBe(true);
    expect(lineas.every(l => Math.max(l.x1, l.x2) <= 1805 + 1e-9)).toBe(true);
  });
  // Iván, 28/10/2026: «podemos ajustar para cortar justo lo que se pide».
  it('corta justo lo pedido: combinados completos y una pila con el resto', () => {
    expect(juegosCanalon(2)).toEqual({ completos: 0, resto: { enteros: 1, parejas: 1 } });
    expect(juegosCanalon(15)).toEqual({ completos: 1, resto: null });
    expect(juegosCanalon(22)).toEqual({ completos: 1, resto: { enteros: 4, parejas: 3 } });
    for (const n of [1, 2, 7, 14, 15, 16, 46]) {
      const { completos, resto } = juegosCanalon(n);
      expect(completos * 15 + (resto ? pilaCanalon(juego, resto.enteros, resto.parejas).canalones : 0)).toBe(n);
    }
    // 1 entero y 1 pareja: 31 cm de alto, con la raya de arriba de la pareja.
    const p = pilaCanalon(juego, 1, 1);
    expect([p.altoMm, p.canalones]).toEqual([310, 2]);
    expect(tiene(p.lineas, 'DISCO1', 0, 260, 1805, 310)).toBe(true);
  });
});
