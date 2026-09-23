import { describe, expect, it } from 'vitest';
import { withoutAwningPrefix } from './diagnosticText';

describe('withoutAwningPrefix', () => {
  it('quita quién da el aviso dentro de su propia tarjeta', () => {
    expect(withoutAwningPrefix('HERA en OF 0230194: requiere completar el planteamiento en CAD.')).toBe('Requiere completar el planteamiento en CAD.');
    expect(withoutAwningPrefix('Toldo A (ARZUA PRO, OF 0230194): falta curva bamba.')).toBe('Falta curva bamba.');
    expect(withoutAwningPrefix('Excepción técnica en OF 0230194: reglas de IRIS modificadas.')).toBe('Reglas de IRIS modificadas.');
  });

  it('deja igual lo que no lleva prefijo', () => {
    expect(withoutAwningPrefix('La OF no pertenece al pedido.')).toBe('La OF no pertenece al pedido.');
    expect(withoutAwningPrefix('Tela no encontrada en el catálogo: "ACR".')).toBe('Tela no encontrada en el catálogo: "ACR".');
  });
});
