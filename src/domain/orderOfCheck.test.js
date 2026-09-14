import { describe, expect, test } from 'vitest';
import { normalizeOfCode, isOfOutsideOrder } from './orderOfCheck.js';

describe('normalización de OF para comparar', () => {
  test.each([
    ['0231486', '231486'],
    ['231486', '231486'],
    ['231486.0', '231486'],
    [' 0231486 ', '231486'],
    [231486, '231486'],
    ['', ''],
    [null, ''],
    [undefined, '']
  ])('%s se normaliza a %s', (value, expected) => {
    expect(normalizeOfCode(value)).toBe(expected);
  });
});

describe('una OF pertenece al pedido', () => {
  // Caso real del 4111: 0231486 existe, 0234186 es esa misma con dos dígitos transpuestos.
  const delPedido = ['0231486'];

  test('la OF del pedido no avisa', () => {
    expect(isOfOutsideOrder('0231486', delPedido)).toBe(false);
  });

  test('la OF transpuesta del 4111 sí avisa', () => {
    expect(isOfOutsideOrder('0234186', delPedido)).toBe(true);
  });

  test('los ceros a la izquierda no cuentan como diferencia', () => {
    expect(isOfOutsideOrder('231486', delPedido)).toBe(false);
    expect(isOfOutsideOrder('0231486', ['231486'])).toBe(false);
  });

  test('una OF de otro pedido avisa aunque exista en RPS', () => {
    expect(isOfOutsideOrder('0231679', delPedido)).toBe(true);
  });
});

describe('silencio cuando no se conoce la respuesta', () => {
  test('sin lista de OF no se avisa nunca', () => {
    expect(isOfOutsideOrder('0234186', null)).toBe(false);
    expect(isOfOutsideOrder('0234186', undefined)).toBe(false);
  });

  test('un pedido sin OF creadas todavía tampoco avisa', () => {
    expect(isOfOutsideOrder('0234186', [])).toBe(false);
  });

  test('el campo vacío no avisa: de eso avisan las validaciones existentes', () => {
    expect(isOfOutsideOrder('', ['0231486'])).toBe(false);
    expect(isOfOutsideOrder(null, ['0231486'])).toBe(false);
  });
});
