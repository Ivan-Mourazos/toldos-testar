import { describe, expect, it } from 'vitest';
import { firstWidePage } from './pdfPages';

describe('página inicial del dibujo en el PDF', () => {
  it('la primera página ancha (A4 apaisada), después de las hojas A5 de estructura', () => {
    expect(firstWidePage([595.28, 595.28, 841.89, 841.89])).toBe(3);
    expect(firstWidePage([841.89])).toBe(1);
  });

  it('si no hay ninguna ancha, o no hay páginas, la 1', () => {
    expect(firstWidePage([595.28, 595.28])).toBe(1);
    expect(firstWidePage([])).toBe(1);
  });
});
