import React, { useState } from 'react';
import { FileSearch, Search } from 'lucide-react';
import type { ReviewSummary } from '../types';
import { inboxSections } from '../ordersInbox';
import { controlLabel } from './controlLabels';

// Pendientes (año actual y anterior, vienen de App) e Historial (año elegido aquí): el
// campo Año solo afecta al Historial.
export function OrdersInbox({ pending, history, currentUser, pendingLoading, historyLoading, year, onYear, onOpen }: {
  pending: ReviewSummary[];
  history: ReviewSummary[];
  currentUser: string;
  pendingLoading: boolean;
  historyLoading: boolean;
  year: number;
  onYear: (year: number) => void;
  onOpen: (orderCode: string) => void;
}) {
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [query, setQuery] = useState('');
  const sections = inboxSections({ pending, history }, { me: currentUser, scope, query });
  const row = (review: ReviewSummary, action: string) => (
    <li key={review.orderCode} className={`orders-row pieza-3d${review.summary.technician === currentUser ? ' is-mine' : ''}`}>
      <strong>{review.orderCode}</strong>
      <span>{review.summary.customer || 'Sin cliente'} · {(review.summary.models || []).map(controlLabel).join(' + ')}</span>
      <small>Autor: {review.summary.technician ? controlLabel(review.summary.technician) : '—'} · {new Date(review.updatedAt).toLocaleDateString('es-ES')}</small>
      <button type="button" className={action === 'Abrir' ? 'primary-button boton-3d' : 'ghost-button boton-3d'} onClick={() => onOpen(review.orderCode)}>{action}</button>
    </li>
  );
  return (
    <section className="orders-inbox panel panel-3d" aria-label="Pedidos">
      <header className="orders-inbox-bar">
        <h2>Pendientes de generar</h2>
        <div className="orders-scope" role="group" aria-label="Qué pedidos">
          <button type="button" className="tecla-3d" aria-pressed={scope === 'mine'} onClick={() => setScope('mine')}>Míos {sections.pendingMine}</button>
          <button type="button" className="tecla-3d" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>Todos {sections.pendingAll}</button>
        </div>
        <label className="orders-search"><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pedido, cliente, OF o modelo…" aria-label="Buscar pedidos" /></label>
      </header>
      {pendingLoading ? <p className="review-empty">Cargando pedidos…</p>
        : sections.pending.length === 0 ? <p className="review-empty"><FileSearch aria-hidden="true" />{scope === 'mine' ? 'No tienes pedidos pendientes de generar.' : 'No hay pedidos pendientes de generar.'}</p>
          : <ul className="orders-list">{sections.pending.map((review) => row(review, 'Abrir'))}</ul>}
      <header className="orders-inbox-bar">
        <h2>Historial</h2>
        <input className="review-year" type="number" min="2000" max="2100" value={year} onChange={(event) => onYear(Number(event.target.value))} aria-label="Año" />
      </header>
      {historyLoading ? <p className="review-empty">Cargando historial…</p>
        : sections.history.length === 0 ? <p className="review-empty">No hay pedidos generados en {year}.</p>
        : <ul className="orders-list">{sections.history.map((review) => row(review, 'Ver'))}</ul>}
    </section>
  );
}
