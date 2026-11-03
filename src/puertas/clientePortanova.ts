import type { PedidoPuertas } from './tipos.ts';
import { fichaPorId, fichaPorCodigo } from './clientes.ts';

export const CODIGO_PORTANOVA = fichaPorId('portanova')!.codigoRps;
/** Rollos de Portanova por defecto (Iván, 23/10/2026: «las lonas son 300 y cristal 140»); el saco también es lona. */
export const ROLLOS_PORTANOVA = fichaPorId('portanova')!.rollos;

/** El código RPS manda; el nombre solo sirve cuando el pedido no conserva ese código. */
export function esClientePortanova(pedido: PedidoPuertas, nombre: string): boolean {
  const codigo = pedido.cabecera?.clienteRps?.codigo?.trim();
  return codigo ? fichaPorCodigo(codigo).rotulos.plantilla === 'portanova' : /PORTANOVA/i.test(nombre || pedido.cabecera?.cliente || '');
}
