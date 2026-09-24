import type { ReviewStatus } from './types';

// Quién puede generar los archivos (revisión Task 6, corrección): CoordinaOT ya aprueba
// y devuelve, así que aquí solo hace falta saber si puede generar. La regla es una sola
// función pura para que la use tanto el botón (ReviewOrderDetail) como el disparo real
// (ReviewsView.generateSelected), y no se puedan desincronizar.
//
// - Ya generado (PRODUCED): nadie, no se regenera desde aquí.
// - Pedido histórico sin autor (order.technician vacío): cualquiera puede generarlo,
//   porque no hay a quién exigírselo.
// - Si tiene autor: solo el autor.
export function canGenerateReview(status: ReviewStatus, technician: string, currentUser: string) {
  if (status === 'PRODUCED') return false;
  if (!technician) return true;
  return currentUser === technician;
}
