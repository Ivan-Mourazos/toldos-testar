import type { PedidoPuertas } from './tipos.ts';

/** El código RPS manda; el nombre solo sirve cuando el pedido no conserva ese código. */
export function esClientePortanova(pedido: PedidoPuertas, nombre: string): boolean {
  const codigo = pedido.cabecera?.clienteRps?.codigo?.trim();
  return codigo ? codigo === '001336' : /PORTANOVA/i.test(nombre || pedido.cabecera?.cliente || '');
}
