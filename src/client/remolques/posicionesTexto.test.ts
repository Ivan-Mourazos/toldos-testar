import { describe, expect, it } from 'vitest';
import { escribirPosiciones, leerCodigos, leerPosiciones } from './posicionesTexto';

describe('posiciones y códigos como texto', () => {
  it('lee posiciones con coma decimal separadas por «·», «;» o espacios', () => {
    expect(leerPosiciones('2,5 · 10 · 40;70  100 · 108,5')).toEqual([2.5, 10, 40, 70, 100, 108.5]);
    expect(leerPosiciones('')).toEqual([]);
    expect(leerPosiciones('2,5 · x')).toBeNull();
    expect(leerPosiciones('0')).toBeNull();
  });

  it('las escribe como en la hoja', () => {
    expect(escribirPosiciones([2.5, 10, 108.5])).toBe('2,5 · 10 · 108,5');
  });

  it('lee códigos separados por comas o espacios, sin repetir', () => {
    expect(leerCodigos(' 036662, 048286 036662 ')).toEqual(['036662', '048286']);
  });
});
