import { describe, expect, it } from 'vitest';
import { emptyLona } from '../../remolques/entradas-vacias.ts';
import { rotuloElemento } from './rotulo';

describe('rotuloElemento', () => {
  it('escribe las medidas con coma decimal, como el resto de la pantalla', () => {
    const lona = { ...emptyLona(), largo: 250.5, ancho: 143 };
    expect(rotuloElemento({ version: '10', tipo: 'lona', input: lona }, 0)).toBe('A · Remolque 250,5×143');
  });
  it('sin medidas solo lleva la letra y el tipo', () => {
    expect(rotuloElemento({ version: '10', tipo: 'lona', input: emptyLona() }, 1)).toBe('B · Remolque');
  });
});
