import { ELEMENT_NOUNS, generationBlock, isPendingGeneration } from '../../reviewRules.js';
import { pedidoEntrega } from '../../entregas.js';
import { codigoEntrega } from '../../entregas.js';
import { aprobacionToldos } from '../../toldosEditable.js';
import { anioPedido, elementosAprobacion } from '../../remolques/flujo/pedido.ts';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import { nombrePdf } from '../../remolques/salida/nombre-pdf.ts';
import type { CoordinaStatus } from '../types';
import { estadoLinea } from '../../remolques/workspace/lineas.ts';
import { elementosSinOf } from '../../remolques/corte/of.js';
import { faltaParaPdf } from './vistaPrevia';

/** Usa las comprobaciones y el corte propios del tipo, incluidos baquetones y los elementos que van a mano. */
export function opcionesCorteRemolques(pedido: PedidoRemolques, vista?: { cortes: unknown[] }) {
  const sinOf = elementosSinOf(pedido).length > 0;
  const falta = sinOf ? 'Falta la OF de algún elemento' : faltaParaPdf(pedido.elementos,
    Object.fromEntries(pedido.elementos.map(e => [e.version, estadoLinea(e)])));
  const aplica = Boolean(pedido.corteConfirmado || pedido.corteSimulado ||
    (vista ? vista.cortes.length : pedido.elementos.length));
  return { falta, aplica };
}

// «Generar archivos» de un pedido de remolques: las mismas reglas que el de toldos
// (generatePermission.ts): cualquier técnico, con todas las OF aprobadas o pasadas
// en CoordinaOT. El servidor vuelve a preguntar a CoordinaOT en fresco al generar.
export function estadoGenerarRemolques(
  pedido: Pick<PedidoRemolques, 'status' | 'summary' | 'elementos'>,
  _usuario: string,
  estado: CoordinaStatus | null,
): { allowed: boolean; note: string } {
  if (!isPendingGeneration(pedido.status)) return { allowed: false, note: '' };
  if (!estado) return { allowed: false, note: 'Comprobando la aprobación en CoordinaOT…' };
  const bloqueo = generationBlock(elementosAprobacion(pedidoEntrega(pedido)), aprobacionToldos(estado), ELEMENT_NOUNS);
  return bloqueo ? { allowed: false, note: bloqueo } : { allowed: true, note: '' };
}

/** Los dos PDF que deja «Generar archivos», para la pregunta de antes. */
export function ficherosPrevistos(pedido: Pick<PedidoRemolques, 'numeroPedido' | 'summary' | 'createdAt'>): string[] {
  if ('entregaActual' in pedido && pedido.entregaActual) {
    const nombre = `${codigoEntrega(pedido)}.pdf`;
    return [`Planteamientos: ${nombre}`, `Oficina técnica: ${anioPedido(pedido)}/${nombre}`];
  }
  const nombre = nombrePdf(pedido.numeroPedido);
  return [`Planteamientos: ${nombre}`, `Oficina técnica: ${anioPedido(pedido)}/${nombre.replace(/-10\.pdf$/, '.pdf')}`];
}
