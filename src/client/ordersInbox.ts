import type { CoordinaStatus, PedidoBandeja } from './types';
import { coordinaGroup, isPendingGeneration } from '../reviewRules.js';

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

// Toldos y remolques en la misma bandeja (fase 5): cada fila dice de qué es y un filtro deja ver
// solo unos. Un número es de toldos o de remolques; aun así la clave lleva el tipo para no confundirlos.
export type FiltroProducto = 'todos' | 'toldos' | 'remolques';
export const filtrosProducto = [
  { key: 'todos', label: 'Todos' },
  { key: 'toldos', label: 'Toldos' },
  { key: 'remolques', label: 'Remolques' },
] as const;

export function productoDe(review: Pick<PedidoBandeja, 'kind'>): 'toldos' | 'remolques' {
  return review.kind === 'remolques' ? 'remolques' : 'toldos';
}

export function claveBandeja(review: Pick<PedidoBandeja, 'kind' | 'orderCode'>) {
  return `${productoDe(review)}:${review.orderCode}`;
}

// Junta las listas de varios años por número de pedido (si la carpeta no depende del
// año, las dos lecturas traen los mismos pedidos) y deja solo los pendientes de generar,
// del más reciente al más antiguo.
export function mergePendingReviews<T extends PedidoBandeja>(lists: T[][]) {
  const byCode = new Map<string, T>();
  for (const review of lists.flat()) {
    const key = claveBandeja(review);
    const current = byCode.get(key);
    if (!current || (review.updatedAt || '') > (current.updatedAt || '')) byCode.set(key, review);
  }
  return [...byCode.values()]
    .filter((review) => isPendingGeneration(review.status))
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function matches(review: PedidoBandeja, query: string) {
  const term = normalize(query.trim());
  if (!term) return true;
  // En remolques, el número también como se escribió (AR.26.04286) y el perfil como modelo.
  const typed = 'numeroPedido' in review ? review.numeroPedido : '';
  const haystack = [review.orderCode, typed, review.summary.customer, ...(review.summary.ofs || []), ...(review.summary.models || [])].join(' ');
  return normalize(haystack).includes(term);
}

export function inboxSections<T extends PedidoBandeja>(
  { pending: pendingSource, history: historySource }: { pending: T[]; history: T[] },
  { me, scope, query, producto = 'todos' }: { me: string; scope: 'mine' | 'all'; query: string; producto?: FiltroProducto }
) {
  const ofProduct = (review: T) => producto === 'todos' || productoDe(review) === producto;
  const pendingAllList = pendingSource.filter((review) => isPendingGeneration(review.status) && ofProduct(review));
  const pendingMineList = pendingAllList.filter((review) => review.summary.technician === me);
  const pending = (scope === 'mine' ? pendingMineList : pendingAllList).filter((review) => matches(review, query));
  const history = historySource.filter((review) => review.status === 'PRODUCED' && ofProduct(review) && matches(review, query));
  return { pending, history, pendingMine: pendingMineList.length, pendingAll: pendingAllList.length };
}

// Bloques de la bandeja según CoordinaOT (diseño 29/09/2026): el grupo sale de cómo
// están sus OF allí, no del estado guardado aquí. Sin respuesta, todo por revisar.
export const pendingGroupOrder = [
  { key: 'por_revisar', label: 'Por revisar', tone: 'review' },
  { key: 'devuelto', label: 'Devueltos', tone: 'returned' },
  { key: 'aprobado', label: 'Aprobados · falta generar', tone: 'approved' }
] as const;

export function reviewAwnings(review: PedidoBandeja) {
  return (review.summary.awningList || []).map((item) => ({ letter: item.letter, of: item.of }));
}

export function pendingGroups<T extends PedidoBandeja>(pending: T[], status: CoordinaStatus | null) {
  return pendingGroupOrder
    .map((group) => ({ ...group, reviews: pending.filter((review) => coordinaGroup(reviewAwnings(review), status) === group.key) }))
    .filter((group) => group.reviews.length > 0);
}

// Fecha con dos cifras en día y mes, como en el resto de la web: 24/09/2026.
export function formatListDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Historial por días, como CoordinaOT: «Jueves 24/09/26 · 15 pedidos» (Iván, 28/09/2026).
export function groupByDay<T extends PedidoBandeja>(reviews: T[]) {
  const groups: { key: string; label: string; reviews: T[] }[] = [];
  for (const review of reviews) {
    const date = new Date(review.updatedAt);
    // Día local, no UTC: un pedido guardado de noche no salta al día siguiente.
    const key = Number.isNaN(date.getTime()) ? 'sin-fecha' : `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    let group = groups.find((item) => item.key === key);
    if (!group) {
      const weekday = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-ES', { weekday: 'long' });
      const day = Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
      group = { key, label: weekday ? `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day}` : day, reviews: [] };
      groups.push(group);
    }
    group.reviews.push(review);
  }
  return groups;
}

// Etiquetas de toldos de una fila (Iván, 01/10/2026: «no caben si hay varios toldos»).
// Hasta `limit` toldos se enseña una etiqueta por toldo; con más, los toldos vecinos que
// tienen el mismo estado se juntan en una sola («A–C»), y el detalle va en el título.
export function collapseAwnings<T extends { letter: string }>(items: T[], keyOf: (item: T) => string, limit = 6) {
  const groups: { label: string; items: T[] }[] = [];
  const crowded = items.length > limit;
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (crowded && last && keyOf(last.items[0]) === keyOf(item)) last.items.push(item);
    else groups.push({ label: item.letter, items: [item] });
    const group = groups[groups.length - 1];
    if (group.items.length > 1) group.label = `${group.items[0].letter}–${item.letter}`;
  }
  return groups;
}

// Etiquetas de modelos de una fila (Iván, 01/10/2026: «no caben si el pedido lleva varios»).
// Una por modelo distinto; con más de `max` se enseñan los `shown` primeros y el resto
// queda para una etiqueta «+N» cuyo título los lista todos.
export function limitModels(models: string[] | undefined, max = 4, shown = 3) {
  const distinct = Array.from(new Set(models || []));
  if (distinct.length <= max) return { visible: distinct, hidden: [] as string[] };
  return { visible: distinct.slice(0, shown), hidden: distinct.slice(shown) };
}
