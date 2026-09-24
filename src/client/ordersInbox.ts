import type { ReviewSummary } from './types';

// Bandeja de Pedidos (diseño 24/09/2026, apartado 4): pendientes de generar (todo lo
// guardado y no generado, venga del estado que venga) e historial (generados).
const pendingStatuses = new Set(['PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED']);

function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function matches(review: ReviewSummary, query: string) {
  const term = normalize(query.trim());
  if (!term) return true;
  const haystack = [review.orderCode, review.summary.customer, ...(review.summary.ofs || []), ...(review.summary.models || [])].join(' ');
  return normalize(haystack).includes(term);
}

export function inboxSections(reviews: ReviewSummary[], { me, scope, query }: { me: string; scope: 'mine' | 'all'; query: string }) {
  const pendingAllList = reviews.filter((review) => pendingStatuses.has(review.status));
  const pendingMineList = pendingAllList.filter((review) => review.summary.technician === me);
  const pending = (scope === 'mine' ? pendingMineList : pendingAllList).filter((review) => matches(review, query));
  const history = reviews.filter((review) => review.status === 'PRODUCED' && matches(review, query));
  return { pending, history, pendingMine: pendingMineList.length, pendingAll: pendingAllList.length };
}
