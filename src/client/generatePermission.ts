import { coordinaGroup, isCurrentAuthor, isPendingGeneration, normalizeOf } from '../reviewRules.js';
import { awningLetter } from '../domain/awningCompleteness.js';
import type { CoordinaStatus, ReviewPackage } from './types';
import { generarToldosPermitido } from '../toldosEditable.js';

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
  const awnings = (review.order.awnings || []).map((awning, index) => ({ letter: awningLetter(index), of: String(awning.of || '') }));
  if (!status) return { allowed: false, note: 'Comprobando la aprobación en CoordinaOT…' };
  const block = generarToldosPermitido(awnings, status);
  return block ? { allowed: false, note: block } : { allowed: true, note: '' };
}

const SIN_EMPEZAR_A_REVISAR = new Set(['sin_estado', 'pendiente', 'en_curso', 'por_revisar']);

/**
 * Puertas y remolques mantienen su permiso anterior; toldos activa la edición libre.
 * Permiso anterior: sincronizado con CoordinaOT y solo para el autor, que es quien lo lleva en CoordinaOT
 * si un compañero lo ha cogido (23/10/2026): si CoordinaOT lo ha devuelto,
 * o si todavía nadie lo ha empezado a revisar (sin tarea, «pendiente», «en curso» o «por revisar»). «Pendiente» y
 * «en curso» son el autor trabajando todavía en ella: Tamara no podía seguir con AR2605346 (Iván, 02/11/2026).
 * Con el revisor ya en ello, aprobado o generado, no: para mirarlo están el detalle y la vista previa.
 */
export function puedeCorregir(status: string, elementos: { letter: string; of: string }[], autor: string, usuario: string, coordina: CoordinaStatus | null, toldosEditable = false) {
  if (toldosEditable) return status !== 'PRODUCED' && Boolean(usuario.trim());
  if (status === 'PRODUCED' || !coordina?.disponible) return false;
  if (!isCurrentAuthor(usuario, autor, elementos, coordina)) return false;
  if (coordinaGroup(elementos, coordina) === 'devuelto') return true;
  const estados = elementos.map((e) => coordina.ofs?.[normalizeOf(e.of)]?.estado || 'sin_estado');
  return estados.length > 0 && estados.every((estado) => SIN_EMPEZAR_A_REVISAR.has(estado));
}
