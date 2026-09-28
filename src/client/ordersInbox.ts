import type { ReviewSummary } from './types';
import { isPendingGeneration } from '../reviewRules.js';

// Bandeja de Pedidos (diseño 24/09/2026, apartado 4): pendientes de generar (todo lo
// guardado y no generado, venga del estado que venga) e historial (generados).
//
// Las dos listas salen de fuentes distintas: los pendientes, del año actual y el
// anterior (un pedido de diciembre puede seguir pendiente en enero) y sin mirar el año
// del Historial; el historial, del año elegido en su propio campo.

// Años de los que se leen los pendientes: el actual y el anterior.
export function pendingYears(now = new Date()) {
  const year = now.getFullYear();
  return [year, year - 1];
}

// Junta las listas de varios años por número de pedido (si la carpeta no depende del
// año, las dos lecturas traen los mismos pedidos) y deja solo los pendientes de generar,
// del más reciente al más antiguo.
export function mergePendingReviews(lists: ReviewSummary[][]) {
  const byCode = new Map<string, ReviewSummary>();
  for (const review of lists.flat()) {
    const current = byCode.get(review.orderCode);
    if (!current || (review.updatedAt || '') > (current.updatedAt || '')) byCode.set(review.orderCode, review);
  }
  return [...byCode.values()]
    .filter((review) => isPendingGeneration(review.status))
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function matches(review: ReviewSummary, query: string) {
  const term = normalize(query.trim());
  if (!term) return true;
  const haystack = [review.orderCode, review.summary.customer, ...(review.summary.ofs || []), ...(review.summary.models || [])].join(' ');
  return normalize(haystack).includes(term);
}

export function inboxSections(
  { pending: pendingSource, history: historySource }: { pending: ReviewSummary[]; history: ReviewSummary[] },
  { me, scope, query }: { me: string; scope: 'mine' | 'all'; query: string }
) {
  const pendingAllList = pendingSource.filter((review) => isPendingGeneration(review.status));
  const pendingMineList = pendingAllList.filter((review) => review.summary.technician === me);
  const pending = (scope === 'mine' ? pendingMineList : pendingAllList).filter((review) => matches(review, query));
  const history = historySource.filter((review) => review.status === 'PRODUCED' && matches(review, query));
  return { pending, history, pendingMine: pendingMineList.length, pendingAll: pendingAllList.length };
}

// Bloques de la bandeja por estado, como las Revisiones de CoordinaOT (Iván, 28/09/2026):
// arriba lo que nadie ha revisado todavía, después lo devuelto y lo aprobado que falta generar.
export const pendingGroupOrder = [
  { status: 'PENDING_REVIEW', label: 'Por revisar', tone: 'review' },
  { status: 'CHANGES_REQUESTED', label: 'Devueltos con cambios', tone: 'returned' },
  { status: 'APPROVED', label: 'Aprobados · falta generar', tone: 'approved' }
] as const;

export function pendingGroups(pending: ReviewSummary[]) {
  return pendingGroupOrder
    .map((group) => ({ ...group, reviews: pending.filter((review) => review.status === group.status) }))
    .filter((group) => group.reviews.length > 0);
}

// Fecha con dos cifras en día y mes, como en el resto de la web: 24/09/2026.
export function formatListDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
