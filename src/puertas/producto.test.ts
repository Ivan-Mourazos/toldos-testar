import { describe, expect, it } from 'vitest';
import { esPedidoMixto, productoDeElementos, productoDeModelos } from './producto.ts';

describe('producto de los pedidos de puertas existentes', () => {
  it('abre las lonas heredadas en System Dock sin cambiar su formato', () => {
    expect(productoDeElementos([{ input: { modelo: 'SYSTEMDOCK' } }])).toBe('systemdock');
    expect(productoDeModelos(['System Dock'])).toBe('systemdock');
  });
  it('conserva las puertas y no clasifica un pedido vacío como System Dock', () => {
    expect(productoDeElementos([])).toBe('puertas');
    expect(productoDeElementos([{ input: { modelo: 'PUERTAENR' } }])).toBe('puertas');
    expect(productoDeModelos(['Enrollable'])).toBe('puertas');
  });
  it('detecta una respuesta mixta de RPS para impedir su importación', () => {
    expect(esPedidoMixto([{ input: { modelo: 'SYSTEMDOCK' } }, { input: { modelo: 'PUERTAPLE' } }])).toBe(true);
    expect(esPedidoMixto([{ input: { modelo: 'SYSTEMDOCK' } }])).toBe(false);
    expect(esPedidoMixto([])).toBe(false);
  });
});
