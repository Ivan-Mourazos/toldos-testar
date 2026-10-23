import type { PedidoPuertas } from './tipos.ts';

export const CODIGO_PORTANOVA = '001336';
/** Rollos de Portanova por defecto (Iván, 23/10/2026: «las lonas son 300 y cristal 140»); el saco también es lona. */
export const ROLLOS_PORTANOVA = { rollo: 300, rolloCristal: 140, rolloSaco: 300 } as const;

/** El código RPS manda; el nombre solo sirve cuando el pedido no conserva ese código. */
export function esClientePortanova(pedido: PedidoPuertas, nombre: string): boolean {
  const codigo = pedido.cabecera?.clienteRps?.codigo?.trim();
  return codigo ? codigo === CODIGO_PORTANOVA : /PORTANOVA/i.test(nombre || pedido.cabecera?.cliente || '');
}
