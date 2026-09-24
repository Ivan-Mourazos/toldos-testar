import { isPendingGeneration } from '../reviewRules.js';

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
