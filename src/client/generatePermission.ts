import { generationBlock, isPendingGeneration } from '../reviewRules.js';
import { awningLetter } from '../domain/awningCompleteness.js';
import { controlLabel } from './components/controlLabels';
import type { CoordinaStatus, ReviewPackage } from './types';

// Quién puede generar los archivos (revisión Task 6, corrección): CoordinaOT ya aprueba
// y devuelve, así que aquí solo hace falta saber si puede generar. La regla es una sola
// función pura para que la use tanto el botón (ReviewOrderDetail) como el disparo real
// (ReviewsView.generateSelected), y no se puedan desincronizar.
//
// - Ya generado (PRODUCED) o en un estado que el servidor no genera: nadie. Usa la
//   misma regla que el servidor (isPendingGeneration, src/reviewRules.js).
// - Pedido histórico sin autor (order.technician vacío): cualquiera puede generarlo,
//   porque no hay a quién exigírselo.
// - Si tiene autor: solo el autor.
export function canGenerateReview(status: string, technician: string, currentUser: string) {
  if (!isPendingGeneration(status)) return false;
  if (!technician) return true;
  return currentUser === technician;
}

// Botón «Generar archivos» del pedido abierto (diseño 29/09/2026): además de ser el
// autor, CoordinaOT tiene que haber aprobado todas las OF. La nota dice por qué no, para
// que el autor no tenga que adivinar ni confirmar a mano que está aprobado.
export function generateState(review: Pick<ReviewPackage, 'status' | 'order'>, currentUser: string, status: CoordinaStatus | null) {
  if (review.status === 'PRODUCED' || !isPendingGeneration(review.status)) return { allowed: false, note: '' };
  if (review.order.technician && review.order.technician !== currentUser) {
    return { allowed: false, note: `Lo genera el autor (${controlLabel(review.order.technician)})` };
  }
  if (!status) return { allowed: false, note: 'Comprobando la aprobación en CoordinaOT…' };
  const awnings = (review.order.awnings || []).map((awning, index) => ({ letter: awningLetter(index), of: String(awning.of || '') }));
  const block = generationBlock(awnings, status);
  return block ? { allowed: false, note: block } : { allowed: true, note: '' };
}
