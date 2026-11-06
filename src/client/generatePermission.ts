import { isPendingGeneration } from '../reviewRules.js';
import { awningLetter } from '../domain/awningCompleteness.js';
import type { CoordinaStatus, ReviewPackage } from './types';
import { generarToldosPermitido } from '../toldosEditable.js';
import { pedidoEntrega } from '../entregas.js';

// Quién puede generar los archivos (revisión Task 6, corrección): CoordinaOT ya aprueba
// y devuelve, así que aquí solo hace falta saber si puede generar. La regla es una sola
// función pura para que la use tanto el botón (ReviewOrderDetail) como el disparo real
// (ReviewsView.generateSelected), y no se puedan desincronizar.
//
// - Ya generado (PRODUCED) o en un estado que el servidor no genera: nadie. Usa la
//   misma regla que el servidor (isPendingGeneration, src/reviewRules.js).
// - Pedido histórico sin autor (order.technician vacío): cualquiera puede generarlo,
//   porque no hay a quién exigírselo.
// El autor queda en el historial; generar ya no depende de quién lo guardó.
export function canGenerateReview(status: string, _technician: string, _currentUser: string) {
  return isPendingGeneration(status);
}

// Toldos: cualquiera genera cuando todas las OF están aprobadas o pasadas en CoordinaOT.
export function generateState(review: Pick<ReviewPackage, 'status' | 'order'>, _currentUser: string, status: CoordinaStatus | null) {
  if (review.status === 'PRODUCED' || !isPendingGeneration(review.status)) return { allowed: false, note: '' };
  const awnings = (pedidoEntrega(review).order.awnings || []).map((awning, index) => ({ letter: awningLetter(index), of: String(awning.of || '') }));
  if (!status) return { allowed: false, note: 'Comprobando la aprobación en CoordinaOT…' };
  const block = generarToldosPermitido(awnings, status);
  return block ? { allowed: false, note: block } : { allowed: true, note: '' };
}

/** Cualquier técnico de oficina edita; CoordinaOT solo decide si se puede generar. */
export function puedeCorregir(_status: string, _elementos: { letter: string; of: string }[], _autor: string, usuario: string, _coordina: CoordinaStatus | null, _editable = true) {
  return Boolean(usuario.trim());
}
