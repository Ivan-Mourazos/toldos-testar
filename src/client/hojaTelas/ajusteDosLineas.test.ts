import { describe, expect, it } from 'vitest';
import { NOTA_COMPLETA, textoEnDosLineas } from './ajusteDosLineas';

// Medida de mentira: a `pt` puntos caben `200 / pt` letras por línea, y hay dos líneas.
const cabe = (texto: string, pt: number) => texto.length <= Math.floor(200 / pt) * 2;

describe('textoEnDosLineas', () => {
  it('si cabe con la letra de partida, se queda igual', () => {
    expect(textoEnDosLineas('CORTO', cabe, 11.5, 7)).toEqual({ pt: 11.5, texto: 'CORTO' });
  });

  it('si no cabe, baja la letra de cuarto en cuarto hasta que quepa entero', () => {
    const texto = 'X'.repeat(40); // a 10 pt caben 40
    expect(textoEnDosLineas(texto, cabe, 11.5, 7)).toEqual({ pt: 10, texto });
  });

  it('ni con la mínima: lo corta con «…» y avisa de que la nota completa está en el pedido', () => {
    const texto = 'PALABRA '.repeat(20).trim(); // 159 letras; a 7 pt caben 56
    const { pt, texto: final } = textoEnDosLineas(texto, cabe, 11.5, 7);
    expect(pt).toBe(7);
    expect(final.endsWith(`… ${NOTA_COMPLETA}`)).toBe(true);
    expect(final.length).toBeLessThanOrEqual(56);
    expect(cabe(final, 7)).toBe(true);
    expect(texto.startsWith(final.slice(0, final.indexOf('…')))).toBe(true);
  });

  it('al cortar, mejor en el último espacio que a media palabra', () => {
    const texto = 'PALABRA '.repeat(20).trim();
    const { texto: final } = textoEnDosLineas(texto, cabe, 11.5, 7);
    expect(final).toMatch(/^(PALABRA )*PALABRA… \[NOTA COMPLETA EN EL PEDIDO\]$/);
  });

  it('si el último espacio queda lejos (más de 15 letras), corta donde llega', () => {
    const texto = `A ${'X'.repeat(200)}`;
    const { texto: final } = textoEnDosLineas(texto, cabe, 11.5, 7);
    expect(final).toMatch(/^A X+… /);
    expect(cabe(final, 7)).toBe(true);
  });
});
