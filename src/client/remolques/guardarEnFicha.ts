import type { BaquetonInput } from '../../remolques/calc/baqueton.ts';
import type { LonaInput } from '../../remolques/calc/lona.ts';
import type { ElementoFicha } from '../../remolques/clientes/diferencias.ts';
import { normalizarNumeroPedidoRps } from '../../remolques/rps/numero-pedido.ts';
import type { ClienteRps, PedidoRps } from '../../remolques/rps/types.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';

// «Guardar en la ficha del cliente» (fase 3): solo con un cliente de RPS, el que el elemento guardó al
// importarse o, si no lo tiene (un elemento tecleado a mano), el del pedido de RPS de esta pantalla.

export function clienteDeLinea(linea: LineaPedido, numeroPedido: string, pedidoRps: PedidoRps | null): ClienteRps | null {
  if (linea.origenRps?.cliente?.codigo) return linea.origenRps.cliente;
  if (pedidoRps?.cliente.codigo && normalizarNumeroPedidoRps(pedidoRps.numero) === normalizarNumeroPedidoRps(numeroPedido)) {
    return pedidoRps.cliente;
  }
  return null;
}

export const elementoDeLinea = (linea: LineaPedido): ElementoFicha => (linea.tipo === 'lona'
  ? { tipo: 'lona', input: linea.input as LonaInput }
  : { tipo: 'baqueton', input: linea.input as BaquetonInput });
