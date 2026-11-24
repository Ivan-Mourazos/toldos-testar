import { describe, expect, it } from 'vitest';
import { colorAci, colorVerdadero, legible } from './colorAci.ts';

describe('colores ACI como en ZWCAD (Iván, 24/11/2026)', () => {
  it('da los colores de la tabla de CAD', () => {
    expect([1, 2, 3, 5, 6, 8, 9].map(colorAci)).toEqual(['#ff0000', '#ffff00', '#00ff00', '#0000ff', '#ff00ff', '#808080', '#c0c0c0']);
    expect([10, 11, 13, 23, 30, 40, 106, 112, 160].map(colorAci))
      .toEqual(['#ff0000', '#ff7f7f', '#a55252', '#a56752', '#ff7f00', '#ffbf00', '#004c13', '#00a552', '#003fff']);
    expect([250, 255].map(colorAci)).toEqual(['#333333', '#ffffff']);
  });
  it('el 7, el 0 y lo que no es color se quedan sin color: se pintan con la tinta', () => {
    expect([7, 0, 256, NaN].map(colorAci)).toEqual([undefined, undefined, undefined, undefined]);
    expect(colorAci(-1)).toBe('#ff0000');
  });
  it('lee el color verdadero', () => expect(colorVerdadero(0x12ab3c)).toBe('#12ab3c'));
});

describe('color legible en la vista previa', () => {
  it('deja igual el color que ya se lee en ese fondo', () => {
    expect(legible('#ff0000', 'claro')).toBe('#ff0000');
    expect(legible('#ff0000', 'oscuro')).toBe('#ff0000');
    expect(legible('#004c13', 'claro')).toBe('#004c13');
    expect(legible('#00a552', 'oscuro')).toBe('#00a552');
  });
  it('aclara en modo oscuro el verde de la capa texto (106) sin perder el tono', () => {
    const c = legible('#004c13', 'oscuro');
    expect(c).not.toBe('#004c13');
    const [r, g, b] = [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    expect(g).toBeGreaterThan(r); expect(g).toBeGreaterThan(b);
  });
  it('oscurece en modo claro el amarillo y el blanco del CAD', () => {
    expect(legible('#ffff00', 'claro')).not.toBe('#ffff00');
    expect(legible('#ffffff', 'claro')).not.toBe('#ffffff');
    expect(legible('#0000ff', 'oscuro')).not.toBe('#0000ff');
  });
});
