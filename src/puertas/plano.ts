import { generarCortePuertas } from './corte.ts';
import { escribirPlanoAraujo } from './planoAraujo.ts';
import { escribirPlanoTaller } from './planoTaller.ts';
import { escribirPlanoSystemDock } from './planoSystemDock.ts';
import type { PedidoPuertas } from './tipos.ts';

/** Planos CAD de oficina: cada modelo conserva sus capas; el corte recibe su anidado del bot. */
export function escribirPlanoPuertas({ pedido, cabecera, ofStockSacos }: {
  pedido: PedidoPuertas;
  ofStockSacos?: string;
  cabecera: { cliente: string; tecnico: string; revisor: string; fecha: string };
}): string {
  const { cortes } = generarCortePuertas(pedido, { ofStockSacos });
  if (pedido.elementos.length && pedido.elementos.every(e=>e.input.santapau)) return escribirPlanoAraujo(pedido,cortes,{...cabecera,cliente:cabecera.cliente.toUpperCase()},'MEDIDAS EN CM · SANTA PAU · ENROLLABLE');
  if (pedido.elementos.some(e => e.input.araujo)) return escribirPlanoAraujo(pedido,cortes,cabecera);
  if (pedido.elementos.length && pedido.elementos.every(e => e.input.modelo === 'SYSTEMDOCK')) {
    return escribirPlanoSystemDock(pedido, cortes, cabecera);
  }
  // Enrollables, apilables y autorreparables, con la misma hoja y el mismo corte (Iván, 06/11/2026).
  return escribirPlanoTaller(pedido, cortes, cabecera);
}
