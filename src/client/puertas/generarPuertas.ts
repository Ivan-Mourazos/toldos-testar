import { generationBlock, isPendingGeneration } from '../../reviewRules.js';
import { elementosAprobacion, PUERTA_NOUNS } from '../../puertas/flujo/pedido.ts';
import type { PedidoPuertasGuardado } from '../../puertas/flujo/tipos.ts';
import { controlLabel } from '../components/controlLabels';
import type { CoordinaStatus } from '../types';

/** Si se puede «Generar archivos» (o mandar el corte): el autor, con todo aprobado en CoordinaOT. */
export function estadoGenerarPuertas(
  pedido: Pick<PedidoPuertasGuardado, 'status' | 'summary' | 'elementos'>,
  usuario: string,
  estado: CoordinaStatus | null,
): { allowed: boolean; note: string } {
  if (!isPendingGeneration(pedido.status)) return { allowed: false, note: '' };
  const autor = pedido.summary.technician;
  if (autor && autor !== usuario) return { allowed: false, note: `Lo genera el autor (${controlLabel(autor)})` };
  if (!estado) return { allowed: false, note: 'Comprobando la aprobación en CoordinaOT…' };
  const bloqueo = generationBlock(elementosAprobacion(pedido), estado, PUERTA_NOUNS);
  return bloqueo ? { allowed: false, note: bloqueo } : { allowed: true, note: '' };
}
