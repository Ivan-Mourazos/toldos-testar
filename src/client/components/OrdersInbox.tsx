import React, { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, CircleAlert, FileSearch, FolderOpen, Search } from 'lucide-react';
import type { CoordinaStatus, ReviewSummary } from '../types';
import { formatListDate, groupByDay, inboxSections, pendingGroups } from '../ordersInbox';
import { controlLabel } from './controlLabels';

type AwningItem = NonNullable<ReviewSummary['summary']['awningList']>[number];

// Iván, 28/09/2026: listas como las de CoordinaOT. Bloques por estado con su rótulo
// (punto de color, nombre y cuántos), columnas juntas y filas densas; toda la fila se
// pulsa y se despliega dentro, con cada toldo y lo que le pasa. Los toldos se ven ya en la
// fila (A ✓, D aviso) para saber qué hay que revisar sin abrir nada.
export function OrdersInbox({ pending, history, currentUser, pendingLoading, historyLoading, year, onYear, onOpen, coordinaStatus }: {
  pending: ReviewSummary[];
  history: ReviewSummary[];
  currentUser: string;
  pendingLoading: boolean;
  historyLoading: boolean;
  year: number;
  onYear: (year: number) => void;
  onOpen: (orderCode: string) => void;
  coordinaStatus: CoordinaStatus | null;
}) {
  // Iván, 28/09/2026: al entrar se ve todo, porque lo que toca revisar es de otros.
  const [scope, setScope] = useState<'mine' | 'all'>('all');
  const [query, setQuery] = useState('');
  const [openCode, setOpenCode] = useState<string | null>(null);
  const sections = inboxSections({ pending, history }, { me: currentUser, scope, query });
  const groups = pendingGroups(sections.pending, coordinaStatus);

  const columns = (withDate: boolean) => (
    <div className={withDate ? 'orders-columns' : 'orders-columns is-history'} aria-hidden="true">
      <span />
      <span>Pedido</span><span>Cliente</span><span>Modelos</span><span>Autor</span>{withDate && <span>Fecha</span>}<span className="is-end">Toldos</span>
    </div>
  );
  // En el historial ya se agrupa por días: la fecha de cada fila sobra, como en CoordinaOT.
  const block = (reviews: ReviewSummary[], withDate = true) => (
    <div className={withDate ? 'orders-block' : 'orders-block is-history'}>
      <ul className="orders-list">
        {reviews.map((review) => (
          <OrderRow
            key={review.orderCode}
            review={review}
            mine={review.summary.technician === currentUser}
            open={openCode === review.orderCode}
            onToggle={() => setOpenCode((current) => (current === review.orderCode ? null : review.orderCode))}
            onOpen={() => onOpen(review.orderCode)}
            withDate={withDate}
            coordinaStatus={coordinaStatus}
          />
        ))}
      </ul>
    </div>
  );

  return (
    <section className="orders-inbox" aria-label="Pedidos">
      {/* Como CoordinaOT: sin panel de fondo; buscador y filtros en una barra encima de la lista. */}
      <header className="orders-inbox-bar orders-filters">
        <label className="orders-search"><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pedido, cliente, OF o modelo…" aria-label="Buscar pedidos" /></label>
        <span className="orders-filter-label">Pendientes de</span>
        <div className="orders-scope" role="group" aria-label="Qué pedidos pendientes">
          <button type="button" className="tecla-3d" aria-pressed={scope === 'all'} onClick={() => setScope('all')}>Todo el equipo {sections.pendingAll}</button>
          <button type="button" className="tecla-3d" aria-pressed={scope === 'mine'} onClick={() => setScope('mine')}>Míos {sections.pendingMine}</button>
        </div>
      </header>
      {coordinaStatus && !coordinaStatus.disponible && (
        <p className="orders-coordina-down" role="status"><AlertTriangle aria-hidden="true" />No se puede consultar CoordinaOT; los pedidos se muestran como por revisar.</p>
      )}
      {pendingLoading ? <p className="review-empty">Cargando pedidos…</p>
        : groups.length === 0 ? <p className="review-empty"><FileSearch aria-hidden="true" />{scope === 'mine' ? 'No tienes pedidos pendientes.' : 'No hay pedidos pendientes.'}</p>
          : <>{columns(true)}{groups.map((group) => (
            <section key={group.key} className="orders-group" aria-label={`${group.label}: ${group.reviews.length}`}>
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
          : <>{columns(false)}{groupByDay(sections.history).map((day) => (
            <section key={day.key} className="orders-group" aria-label={`${day.label}: ${day.reviews.length} pedidos`}>
              <h3 className="orders-day-title">{day.label}<span>· {day.reviews.length} {day.reviews.length === 1 ? 'pedido' : 'pedidos'}</span></h3>
              {block(day.reviews, false)}
            </section>
          ))}</>}
    </section>
  );
}

function OrderRow({ review, mine, open, onToggle, onOpen, withDate, coordinaStatus }: {
  review: ReviewSummary;
  mine: boolean;
  open: boolean;
  onToggle: () => void;
  onOpen: () => void;
  withDate: boolean;
  coordinaStatus: CoordinaStatus | null;
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
        {withDate && <span className="orders-date">{formatListDate(review.updatedAt)}</span>}
        <span className="orders-awnings">
          {awnings?.length
            ? awnings.map((item) => <AwningChip key={item.letter} item={item} coordinaStatus={coordinaStatus} />)
            : <span className="orders-models">{review.summary.awnings} {review.summary.awnings === 1 ? 'elemento' : 'elementos'}</span>}
        </span>
      </div>
      {open && (
        <div className="orders-detail" id={detailId}>
          {awnings?.length ? (
            <ul className="orders-detail-list">
              {awnings.map((item) => {
                // La nota de devolución solo se enseña si CoordinaOT la tiene devuelta.
                const returned = coordinaStatus?.disponible ? coordinaStatus.ofs?.[item.of.trim()] : undefined;
                const nota = returned?.estado === 'devuelta' ? returned.nota : '';
                return (
                <li key={item.letter} className={`is-${item.state}`}>
                  <AwningChip item={item} coordinaStatus={coordinaStatus} />
                  <strong>{controlLabel(item.model)}</strong>
                  <span>OF {item.of || '—'}</span>
                  <span className="orders-detail-notes">{item.notes.length ? item.notes.join(' · ') : 'Sin avisos.'}</span>
                  {nota && <span className="orders-detail-returned"><strong>Devuelta en CoordinaOT:</strong> {nota}</span>}
                </li>
                );
              })}
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

function AwningChip({ item, coordinaStatus }: { item: AwningItem; coordinaStatus: CoordinaStatus | null }) {
  const label = item.state === 'ok' ? 'correcto' : item.state === 'warn' ? 'con aviso' : 'con errores';
  const coordina = coordinaStatus?.disponible ? coordinaStatus.ofs?.[item.of.trim()]?.estado : undefined;
  // Un solo signo claro por toldo: si el cálculo está bien y CoordinaOT tiene marca, solo se
  // enseña la de CoordinaOT (evita «✓ ✓» o «✓ ↩», que parecen contradecirse). Con aviso o
  // error se mantiene el icono del cálculo y se añade la marca de CoordinaOT.
  const showCalcIcon = !(item.state === 'ok' && coordina);
  return (
    <span className={`orders-chip is-${item.state}`} title={`${item.letter} · ${controlLabel(item.model)} · ${label} · CoordinaOT: ${coordina ?? 'sin datos'}`}>
      {item.letter}
      {showCalcIcon && (item.state === 'ok' ? <Check aria-hidden="true" /> : item.state === 'warn' ? <AlertTriangle aria-hidden="true" /> : <CircleAlert aria-hidden="true" />)}
      {coordina === 'aprobada' && <span className="orders-chip-coordina is-approved" role="img" aria-label="aprobada en CoordinaOT">✓</span>}
      {coordina === 'devuelta' && <span className="orders-chip-coordina is-returned" role="img" aria-label="devuelta en CoordinaOT">↩</span>}
      {coordina && coordina !== 'aprobada' && coordina !== 'devuelta' && <span className="orders-chip-coordina is-waiting" role="img" aria-label="en revisión en CoordinaOT">•</span>}
    </span>
  );
}
