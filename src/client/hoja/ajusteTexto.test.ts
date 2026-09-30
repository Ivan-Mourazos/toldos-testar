import { describe, expect, it } from 'vitest';
import { letraQueCabe } from './ajusteTexto';

// Iván, 30/09/2026: el MATERIAL va en una sola línea; si no cabe, la letra baja hasta 7 pt y, si
// ni así, se corta con «…». `mide` da el ancho del texto con una letra dada (proporcional a ella).
const mide = (anchoA10pt: number) => (pt: number) => (anchoA10pt * pt) / 10;

describe('letraQueCabe', () => {
  it('si cabe con la letra de siempre, se queda con ella', () => {
    expect(letraQueCabe(mide(50), 60, 9, 7)).toEqual({ pt: 9, cabe: true });
  });

  it('si no, baja de cuarto en cuarto de punto hasta la primera que cabe', () => {
    // 80 a 10 pt: a 7,5 pt mide 60 y cabe justo; a 7,75 pt mide 62.
    expect(letraQueCabe(mide(80), 60, 9, 7)).toEqual({ pt: 7.5, cabe: true });
  });

  it('nunca baja del mínimo: si ni así cabe, lo dice (el CSS lo corta con «…»)', () => {
    expect(letraQueCabe(mide(200), 60, 9, 7)).toEqual({ pt: 7, cabe: false });
  });
});
