import { describe, expect, it } from 'vitest';
import { formOptions } from '../domain/modelBehavior.js';
import { personaDe, tintaSobre } from './personas';

describe('personas', () => {
  it('todos los técnicos tienen iniciales y color, como en CoordinaOT', () => {
    const iniciales = (formOptions.tecnicos as string[]).map((nombre) => personaDe(nombre));
    expect(iniciales.map((p) => p.iniciales)).toEqual(['AN', 'JA', 'AL', 'AD', 'TA', 'IV']);
    expect(iniciales.every((p) => p.color)).toBe(true);
    expect(personaDe('IVÁN').color).toBe('#d39a1c');
  });

  it('un nombre desconocido sale con sus dos primeras letras y sin color', () => {
    expect(personaDe('Óscar')).toEqual({ iniciales: 'OS', color: null });
  });

  it('elige la tinta que más contrasta con el color de la persona', () => {
    expect(tintaSobre('#d39a1c')).toBe('#1a1206');
    expect(tintaSobre('#5a6472')).toBe('#ffffff');
  });
});
