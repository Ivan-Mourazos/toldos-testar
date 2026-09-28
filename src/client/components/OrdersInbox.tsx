import React, { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, CircleAlert, FileSearch, FolderOpen, Search } from 'lucide-react';
import type { ReviewSummary } from '../types';
import { formatListDate, groupByDay, inboxSections, pendingGroups } from '../ordersInbox';
import { controlLabel } from './controlLabels';

type AwningItem = NonNullable<ReviewSummary['summary']['awningList']>[number];

// Iván, 28/09/2026: listas como las de CoordinaOT. Bloques por estado con su rótulo
// (punto de color, nombre y cuántos), columnas juntas y filas densas; toda la fila se
// pulsa y se despliega dentro, con cada toldo y lo que le pasa. Los toldos se ven ya en la
// fila (A ✓, D aviso) para saber qué hay que revisar sin abrir nada.
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
  // Iván, 28/09/2026: al entrar se ve todo, porque lo que toca revisar es de otros.
  const [scope, setScope] = useState<'mine' | 'all'>('all');
  const [query, setQuery] = useState('');
  const [openCode, setOpenCode] = useState<string | null>(null);
  const sections = inboxSections({ pending, history }, { me: currentUser, scope, query });
  const groups = pendingGroups(sections.pending);

  const columns = (
    <div className="orders-columns" aria-hidden="true">
      <span />
      <span>Pedido</span><span>Cliente</span><span>Modelos</span><span>Autor</span><span>Fecha</span><span className="is-end">Toldos</span>
    </div>
  );
  const block = (reviews: ReviewSummary[]) => (
    <div className="orders-block">
      <ul className="orders-list">
        {reviews.map((review) => (
          <OrderRow
            key={review.orderCode}
            review={review}
            mine={review.summary.technician === currentUser}
            open={openCode === review.orderCode}
            onToggle={() => setOpenCode((current) => (current === review.orderCode ? null : review.orderCode))}
            onOpen={() => onOpen(review.orderCode)}
          />
        ))}
      </ul>
    </div>
  );

  return (
    <section className="orders-inbox panel panel-3d" aria-label="Pedidos">
      <header className="orders-inbox-bar">
        <h2>Pendientes</h2>
        <div className="orders-scope" role="group" aria-label="Qué pedidos">
          <button type="button" className="tecla-3d" aria-pressed={scope === 'mine'} onClick={() => setScope('mine')}>Míos {sections.pendingMine}</button>
          <button type="button" className="tecla-3d" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>Todos {sections.pendingAll}</button>
        </div>
        <label className="orders-search"><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pedido, cliente, OF o modelo…" aria-label="Buscar pedidos" /></label>
      </header>
      {pendingLoading ? <p className="review-empty">Cargando pedidos…</p>
        : groups.length === 0 ? <p className="review-empty"><FileSearch aria-hidden="true" />{scope === 'mine' ? 'No tienes pedidos pendientes.' : 'No hay pedidos pendientes.'}</p>
          : <>{columns}{groups.map((group) => (
            <section key={group.status} className="orders-group" aria-label={`${group.label}: ${group.reviews.length}`}>
              <h3 className={`orders-group-title tone-${group.tone}`}><span className="orders-dot" aria-hidden="true" />{group.label}<span className="orders-count">{group.reviews.length}</span></h3>
              {block(group.reviews)}
            </section>
          ))}</>}
      <header className="orders-inbox-bar">
        <h2>Generados</h2>
        <input className="review-year" type="number" min="2000" max="2100" value={year} onChange={(event) => onYear(Number(event.target.value))} aria-label="Año" />
        <span className="orders-count">{sections.history.length}</span>
      </header>
      {historyLoading ? <p className="review-empty">Cargando historial…</p>
        : sections.history.length === 0 ? <p className="review-empty">No hay pedidos generados en {year}.</p>
          : <>{columns}{groupByDay(sections.history).map((day) => (
            <section key={day.key} className="orders-group" aria-label={`${day.label}: ${day.reviews.length} pedidos`}>
              <h3 className="orders-day-title">{day.label}<span>· {day.reviews.length} {day.reviews.length === 1 ? 'pedido' : 'pedidos'}</span></h3>
              {block(day.reviews)}
            </section>
          ))}</>}
    </section>
  );
}

function OrderRow({ review, mine, open, onToggle, onOpen }: {
  review: ReviewSummary;
  mine: boolean;
  open: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const detailId = `orders-detail-${review.orderCode}`;
  const awnings = review.summary.awningList;
  const author = review.summary.technician ? controlLabel(review.summary.technician) : '—';
  return (
    <li className={open ? 'orders-row is-open' : 'orders-row'}>
      <button
        type="button"
        className="orders-row-toggle"
        aria-expanded={open}
        aria-controls={detailId}
        aria-label={`${open ? 'Plegar' : 'Desplegar'} ${review.orderCode}`}
        onClick={onToggle}
      />
      <div className="orders-row-cells">
        <ChevronDown className="orders-chevron" aria-hidden="true" />
        <strong className="orders-code">{review.orderCode}</strong>
        <span className="orders-customer">{review.summary.customer || 'Sin cliente'}</span>
        <span className="orders-model-tags">{Array.from(new Set(review.summary.models || [])).map((model) => <span key={model} className="orders-model-tag">{controlLabel(model)}</span>)}</span>
        <span className="orders-author">{author}{mine && <em className="orders-me">Tú</em>}</span>
        <span className="orders-date">{formatListDate(review.updatedAt)}</span>
        <span className="orders-awnings">
          {awnings?.length
            ? awnings.map((item) => <AwningChip key={item.letter} item={item} />)
            : <span className="orders-models">{review.summary.awnings} {review.summary.awnings === 1 ? 'elemento' : 'elementos'}</span>}
        </span>
      </div>
      {open && (
        <div className="orders-detail" id={detailId}>
          {awnings?.length ? (
            <ul className="orders-detail-list">
              {awnings.map((item) => (
                <li key={item.letter} className={`is-${item.state}`}>
                  <AwningChip item={item} />
                  <strong>{controlLabel(item.model)}</strong>
                  <span>OF {item.of || '—'}</span>
                  <span className="orders-detail-notes">{item.notes.length ? item.notes.join(' · ') : 'Sin avisos.'}</span>
                </li>
              ))}
            </ul>
          ) : <p className="orders-detail-empty">{(review.summary.models || []).map(controlLabel).join(' + ')} · {review.summary.awnings} elementos</p>}
          <div className="orders-detail-actions">
            {review.reviewNote && <p className="orders-detail-note"><strong>Nota de revisión:</strong> {review.reviewNote}</p>}
            <button type="button" className="primary-button boton-3d" onClick={onOpen}><FolderOpen aria-hidden="true" />Abrir el pedido</button>
          </div>
        </div>
      )}
    </li>
  );
}

function AwningChip({ item }: { item: AwningItem }) {
  const label = item.state === 'ok' ? 'correcto' : item.state === 'warn' ? 'con aviso' : 'con errores';
  return (
    <span className={`orders-chip is-${item.state}`} title={`${item.letter} · ${controlLabel(item.model)} · ${label}`}>
      {item.letter}
      {item.state === 'ok' ? <Check aria-hidden="true" /> : item.state === 'warn' ? <AlertTriangle aria-hidden="true" /> : <CircleAlert aria-hidden="true" />}
    </span>
  );
}
