import { generationBlock, isPendingGeneration } from '../../reviewRules.js';
import { aprobacionToldos } from '../../toldosEditable.js';
import { elementosAprobacion, nombresElementosPuertas } from '../../puertas/flujo/pedido.ts';
import type { PedidoPuertasGuardado } from '../../puertas/flujo/tipos.ts';
import type { CoordinaStatus } from '../types';

/** Generar archivos solo depende del estado del pedido y de todas sus OF en CoordinaOT. */
export function estadoGenerarPuertas(
  pedido: Pick<PedidoPuertasGuardado, 'status' | 'summary' | 'elementos'>,
  _usuario: string,
  estado: CoordinaStatus | null,
): { allowed: boolean; note: string } {
  if (!isPendingGeneration(pedido.status)) return { allowed: false, note: '' };
  if (!estado) return { allowed: false, note: 'Comprobando la aprobación en CoordinaOT…' };
  const bloqueo = generationBlock(elementosAprobacion(pedido), aprobacionToldos(estado), nombresElementosPuertas(pedido));
  return bloqueo ? { allowed: false, note: bloqueo } : { allowed: true, note: '' };
}
