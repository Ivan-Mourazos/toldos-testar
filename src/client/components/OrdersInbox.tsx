import React, { useState } from 'react';
import { FileSearch, Search } from 'lucide-react';
import type { ReviewSummary } from '../types';
import { inboxSections } from '../ordersInbox';
import { controlLabel } from './controlLabels';

export function OrdersInbox({ reviews, currentUser, loading, year, onYear, onOpen }: {
  reviews: ReviewSummary[];
  currentUser: string;
  loading: boolean;
  year: number;
  onYear: (year: number) => void;
  onOpen: (orderCode: string) => void;
}) {
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [query, setQuery] = useState('');
  const sections = inboxSections(reviews, { me: currentUser, scope, query });
  const row = (review: ReviewSummary, action: string) => (
    <li key={review.orderCode} className={`orders-row${review.summary.technician === currentUser ? ' is-mine' : ''}`}>
      <strong>{review.orderCode}</strong>
      <span>{review.summary.customer || 'Sin cliente'} · {(review.summary.models || []).map(controlLabel).join(' + ')}</span>
      <small>Autor: {review.summary.technician ? controlLabel(review.summary.technician) : '—'} · {new Date(review.updatedAt).toLocaleDateString('es-ES')}</small>
      <button type="button" className={action === 'Abrir' ? 'primary-button' : 'ghost-button'} onClick={() => onOpen(review.orderCode)}>{action}</button>
    </li>
  );
  return (
    <section className="orders-inbox panel" aria-label="Pedidos">
      <header className="orders-inbox-bar">
        <h2>Pendientes de generar</h2>
        <div className="orders-scope" role="group" aria-label="Qué pedidos">
          <button type="button" aria-pressed={scope === 'mine'} onClick={() => setScope('mine')}>Míos {sections.pendingMine}</button>
          <button type="button" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>Todos {sections.pendingAll}</button>
        </div>
        <label className="orders-search"><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pedido, cliente, OF o modelo…" aria-label="Buscar pedidos" /></label>
      </header>
      {loading ? <p className="review-empty">Cargando pedidos…</p>
        : sections.pending.length === 0 ? <p className="review-empty"><FileSearch aria-hidden="true" />{scope === 'mine' ? 'No tienes pedidos pendientes de generar.' : 'No hay pedidos pendientes de generar.'}</p>
          : <ul className="orders-list">{sections.pending.map((review) => row(review, 'Abrir'))}</ul>}
      <header className="orders-inbox-bar">
        <h2>Historial</h2>
        <input className="review-year" type="number" min="2000" max="2100" value={year} onChange={(event) => onYear(Number(event.target.value))} aria-label="Año" />
      </header>
      {sections.history.length === 0 ? <p className="review-empty">No hay pedidos generados en {year}.</p>
        : <ul className="orders-list">{sections.history.map((review) => row(review, 'Ver'))}</ul>}
    </section>
  );
}
