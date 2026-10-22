import { generarCortePuertas } from './corte.ts';
import { escribirPlanoEnrollables } from './planoEnrollable.ts';
import { escribirPlanoTaller } from './planoTaller.ts';
import type { PedidoPuertas } from './tipos.ts';

/** Planos CAD de oficina: cada modelo conserva sus capas; el corte recibe su anidado del bot. */
export function escribirPlanoPuertas({ pedido, cabecera, ofStockSacos }: {
  pedido: PedidoPuertas;
  ofStockSacos?: string;
  cabecera: { cliente: string; tecnico: string; revisor: string; fecha: string };
}): string {
  const { cortes } = generarCortePuertas(pedido, { ofStockSacos });
  if (pedido.elementos.length && pedido.elementos.every(e => e.input.modelo === 'PUERTAENR')) {
    return escribirPlanoEnrollables(pedido, cortes, cabecera);
  }
  return escribirPlanoTaller(pedido, cortes, cabecera);
}
