import { awningLetter } from '../domain/awningCompleteness.js';

// Toldos por bloques (rediseño 24/09/2026, §6): una fila de tarjetas que pasa de
// bloque en bloque. Caben tantas como admita el ancho a 420 px cada una, con un
// máximo de 3: 2 a 1280 y 3 a 1600.
export const BLOCK_GAP = 12;

export type AwningStatus = { kind: 'ok' | 'warn' | 'error' | 'missing'; label: string };

export function cardsPerPage(width: number, minCard = 420, gap = BLOCK_GAP, max = 3) {
  return Math.max(1, Math.min(max, Math.floor((width + gap) / (minCard + gap))));
}

export function pageCount(count: number, perPage: number) {
  return Math.max(1, Math.ceil(count / perPage));
}

export function pageOfIndex(index: number, perPage: number) {
  return Math.floor(index / perPage);
}

export function pageLabel(page: number, perPage: number, count: number) {
  const first = page * perPage;
  const last = Math.min(first + perPage, count) - 1;
  return first === last
    ? `${awningLetter(first)} de ${count}`
    : `${awningLetter(first)} – ${awningLetter(last)} de ${count}`;
}

// El índice dice primero lo que falta, luego los errores y por último los avisos.
export function awningStatus(missing: unknown[], diagnostics: Array<{ level: string }>): AwningStatus {
  if (missing.length) return { kind: 'missing', label: `falta ${missing.length}` };
  const errors = diagnostics.filter((item) => item.level === 'error' || item.level === 'pending').length;
  if (errors) return { kind: 'error', label: `${errors} ${errors === 1 ? 'error' : 'errores'}` };
  const warnings = diagnostics.filter((item) => item.level === 'warn').length;
  if (warnings) return { kind: 'warn', label: `${warnings} ${warnings === 1 ? 'aviso' : 'avisos'}` };
  return { kind: 'ok', label: '✓' };
}
