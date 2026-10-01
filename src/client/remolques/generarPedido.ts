import { ELEMENT_NOUNS, generationBlock, isPendingGeneration } from '../../reviewRules.js';
import { anioPedido, elementosAprobacion } from '../../remolques/flujo/pedido.ts';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import { nombrePdf } from '../../remolques/salida/nombre-pdf.ts';
import { controlLabel } from '../components/controlLabels';
import type { CoordinaStatus } from '../types';

// «Generar archivos» de un pedido de remolques: las mismas reglas que el de toldos
// (generatePermission.ts): solo el autor (si no tiene, cualquiera) y con todas las OF aprobadas
// en CoordinaOT. El servidor vuelve a preguntar a CoordinaOT en fresco al generar.
export function estadoGenerarRemolques(
  pedido: Pick<PedidoRemolques, 'status' | 'summary' | 'elementos'>,
  usuario: string,
  estado: CoordinaStatus | null,
): { allowed: boolean; note: string } {
  if (!isPendingGeneration(pedido.status)) return { allowed: false, note: '' };
  const autor = pedido.summary.technician;
  if (autor && autor !== usuario) return { allowed: false, note: `Lo genera el autor (${controlLabel(autor)})` };
  if (!estado) return { allowed: false, note: 'Comprobando la aprobación en CoordinaOT…' };
  const bloqueo = generationBlock(elementosAprobacion(pedido), estado, ELEMENT_NOUNS);
  return bloqueo ? { allowed: false, note: bloqueo } : { allowed: true, note: '' };
}

/** Los dos PDF que deja «Generar archivos», para la pregunta de antes. */
export function ficherosPrevistos(pedido: Pick<PedidoRemolques, 'numeroPedido' | 'summary' | 'createdAt'>): string[] {
  const nombre = nombrePdf(pedido.numeroPedido);
  return [`Planteamientos: ${nombre}`, `Oficina técnica: ${anioPedido(pedido)}/${nombre.replace(/-10\.pdf$/, '.pdf')}`];
}
