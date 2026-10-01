import { fichaPorCodigo, sugerirFicha } from '../../remolques/clientes/reglas.ts';
import type { FichaCliente } from '../../remolques/clientes/tipos.ts';
import type { ClienteRps, PedidoRps } from '../../remolques/rps/types.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import type { ConfirmOptions } from '../components/NotificationCenter';
import { nombreClienteRps } from './fichasClientes';

// La ficha del cliente al obtener un pedido de RPS (fase 3): por su código; si no está en ninguna y el
// nombre se parece al de una, se pregunta. Sin código de cliente no se busca nada.

export function decidirFicha(fichas: readonly FichaCliente[], cliente: ClienteRps): { ficha: FichaCliente | null; sugerida: FichaCliente | null } {
  if (!cliente.codigo.trim()) return { ficha: null, sugerida: null };
  const ficha = fichaPorCodigo(fichas, cliente.codigo);
  return ficha ? { ficha, sugerida: null } : { ficha: null, sugerida: sugerirFicha(fichas, cliente) };
}

// «TALLERES CAL, C. B.» ya acaba en punto: no se le añade otro.
const conPunto = (texto: string) => (/[.!?]$/.test(texto.trim()) ? texto.trim() : `${texto.trim()}.`);

export function preguntaSugerencia(ficha: FichaCliente, pedido: PedidoRps): ConfirmOptions {
  return {
    title: `¿Es de la ficha ${ficha.nombre}?`,
    message: `El cliente de ${pedido.numero} en RPS, ${nombreClienteRps(pedido.cliente)} (código ${pedido.cliente.codigo}), no está en ninguna ficha, pero su nombre se parece al de ${conPunto(ficha.nombre)} Si añades el código, sus pedidos tomarán la ficha solos.`,
    confirmLabel: 'Añadir el código y aplicar',
    cancelLabel: 'No',
  };
}

/** Lo que se añade al aviso de «elementos creados» si la ficha puso algo. */
export function notaFicha(ficha: FichaCliente | null, lineas: readonly LineaPedido[]): string {
  return ficha && lineas.some((linea) => linea.delCliente)
    ? ` Con la ficha de ${ficha.nombre}: lo marcado «del cliente» viene de ella.`
    : '';
}
