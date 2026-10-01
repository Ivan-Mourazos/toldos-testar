import React, { useState } from 'react';
import { AlertTriangle, Check, ChevronDown, CircleAlert, FilePen, FileSearch, FolderOpen, Search, Trash2 } from 'lucide-react';
import type { CoordinaStatus, PedidoBandeja } from '../types';
import {
  borradoresVisibles, claveBandeja, collapseAwnings, fechaBorrador, filtrosProducto, formatListDate, groupByDay, inboxSections, limitModels, pendingGroups, productoDe,
  type FiltroProducto,
} from '../ordersInbox';
import { controlLabel } from './controlLabels';
import type { ResumenBorrador } from '../../borradores/tipos.ts';
import { formOptions } from '../../domain/modelBehavior.js';
import { COORDINA_NOT_CONFIGURED_MOTIVO, normalizeOf, reviewerName } from '../../reviewRules.js';

type AwningItem = NonNullable<PedidoBandeja['summary']['awningList']>[number];

// Iván, 28/09/2026: listas como las de CoordinaOT. Bloques por estado con su rótulo
// (punto de color, nombre y cuántos), columnas juntas y filas densas; toda la fila se
// pulsa y se despliega dentro, con cada toldo y lo que le pasa. Los toldos se ven ya en la
// fila (A ✓, D aviso) para saber qué hay que revisar sin abrir nada.
export function OrdersInbox({ pending, history, currentUser, pendingLoading, historyLoading, year, onYear, onOpen, coordinaStatus, borradores = [], onSeguirBorrador = () => undefined, onDescartarBorrador = () => undefined }: {
  pending: PedidoBandeja[];
  history: PedidoBandeja[];
  currentUser: string;
  pendingLoading: boolean;
  historyLoading: boolean;
  year: number;
  onYear: (year: number) => void;
  onOpen: (review: PedidoBandeja) => void;
  coordinaStatus: CoordinaStatus | null;
  /** Borradores del servidor (diseño 01/10/2026): van encima de «Por revisar» y no cuentan. */
  borradores?: ResumenBorrador[];
  onSeguirBorrador?: (borrador: ResumenBorrador) => void;
  onDescartarBorrador?: (borrador: ResumenBorrador) => void;
}) {
  // Iván, 28/09/2026: al entrar se ve todo, porque lo que toca revisar es de otros.
  const [scope, setScope] = useState<'mine' | 'all'>('all');
  const [query, setQuery] = useState('');
  // Toldos y remolques en la misma lista (fase 5), con un filtro para ver solo unos.
  const [producto, setProducto] = useState<FiltroProducto>('todos');
  const [openCode, setOpenCode] = useState<string | null>(null);
  const sections = inboxSections({ pending, history }, { me: currentUser, scope, query, producto });
  const groups = pendingGroups(sections.pending, coordinaStatus);
  const drafts = borradoresVisibles(borradores, { me: currentUser, scope, query, producto });

  const columns = (withDate: boolean) => (
    <div className={withDate ? 'orders-columns' : 'orders-columns is-history'} aria-hidden="true">
      <span />
      <span>Pedido</span><span>Cliente</span><span>Modelos</span><span>Autor</span>{withDate && <span>Fecha</span>}<span className="is-end">Elementos</span>
    </div>
  );
  // En el historial ya se agrupa por días: la fecha de cada fila sobra, como en CoordinaOT.
  const block = (reviews: PedidoBandeja[], withDate = true, tone?: string) => (
    <div className={withDate ? 'orders-block' : 'orders-block is-history'}>
      <ul className="orders-list">
        {reviews.map((review) => (
          <OrderRow
            key={claveBandeja(review)}
            review={review}
            mine={review.summary.technician === currentUser}
            open={openCode === claveBandeja(review)}
            onToggle={() => setOpenCode((current) => (current === claveBandeja(review) ? null : claveBandeja(review)))}
            onOpen={() => onOpen(review)}
            withDate={withDate}
            coordinaStatus={coordinaStatus}
            tone={tone}
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
        <div className="orders-scope tira-3d glass-chip" role="group" aria-label="Qué pedidos pendientes">
          <button type="button" className={scope === 'all' ? 'pestana-activa' : undefined} aria-pressed={scope === 'all'} onClick={() => setScope('all')}>Todo el equipo {sections.pendingAll}</button>
          <button type="button" className={scope === 'mine' ? 'pestana-activa' : undefined} aria-pressed={scope === 'mine'} onClick={() => setScope('mine')}>Míos {sections.pendingMine}</button>
        </div>
        <span className="orders-filter-label">Pedidos de</span>
        <div className="orders-scope tira-3d glass-chip" role="group" aria-label="Qué tipo de pedidos">
          {filtrosProducto.map((filtro) => (
            <button key={filtro.key} type="button" className={producto === filtro.key ? 'pestana-activa' : undefined} aria-pressed={producto === filtro.key} onClick={() => setProducto(filtro.key)}>{filtro.label}</button>
          ))}
        </div>
      </header>
      {coordinaStatus && !coordinaStatus.disponible && (
        <p className="orders-coordina-down" role="status"><AlertTriangle aria-hidden="true" />{coordinaStatus.motivo === COORDINA_NOT_CONFIGURED_MOTIVO ? 'No se puede consultar CoordinaOT: la conexión no está configurada en el servidor.' : 'No se puede consultar CoordinaOT; los pedidos se muestran como por revisar.'}</p>
      )}
      {(drafts.length > 0 || (!pendingLoading && groups.length > 0)) && columns(true)}
      {drafts.length > 0 && (
        <section className="orders-group" aria-label={`Borradores: ${drafts.length}`}>
          <h3 className="orders-group-title tone-draft"><span className="orders-dot" aria-hidden="true" />Borradores<span className="orders-count">{drafts.length}</span></h3>
          <div className="orders-block">
            <ul className="orders-list">
              {drafts.map((borrador) => {
                const clave = `borrador:${borrador.orderCode}`;
                return (
                  <DraftRow
                    key={clave}
                    borrador={borrador}
                    mine={borrador.savedBy === currentUser}
                    open={openCode === clave}
                    onToggle={() => setOpenCode((current) => (current === clave ? null : clave))}
                    onSeguir={() => onSeguirBorrador(borrador)}
                    onDescartar={() => onDescartarBorrador(borrador)}
                  />
                );
              })}
            </ul>
          </div>
        </section>
      )}
      {pendingLoading ? <p className="review-empty">Cargando pedidos…</p>
        : groups.length === 0 ? <p className="review-empty"><FileSearch aria-hidden="true" />{scope === 'mine' ? 'No tienes pedidos pendientes.' : 'No hay pedidos pendientes.'}</p>
          : groups.map((group) => (
            <section key={group.key} className="orders-group" aria-label={`${group.label}: ${group.reviews.length}`}>
              <h3 className={`orders-group-title tone-${group.tone}`}><span className="orders-dot" aria-hidden="true" />{group.label}<span className="orders-count">{group.reviews.length}</span></h3>
              {block(group.reviews, true, group.tone)}
            </section>
          ))}
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

function OrderRow({ review, mine, open, onToggle, onOpen, withDate, coordinaStatus, tone }: {
  review: PedidoBandeja;
  mine: boolean;
  open: boolean;
  onToggle: () => void;
  onOpen: () => void;
  withDate: boolean;
  coordinaStatus: CoordinaStatus | null;
  tone?: string;
}) {
  const detailId = `orders-detail-${productoDe(review)}-${review.orderCode}`;
  const awnings = review.summary.awningList;
  const author = review.summary.technician ? controlLabel(review.summary.technician) : '—';
  return (
    <li className={`orders-row ${open ? 'bloque-3d-hundido is-open' : 'bloque-3d'}${tone ? ` tone-${tone}` : ''}`}>
      <div className="orders-row-head">
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
        <ModelTags models={review.summary.models} producto={productoDe(review)} />
        <span className="orders-author">{author}{mine && <em className="orders-me">Tú</em>}</span>
        {withDate && <span className="orders-date">{formatListDate(review.updatedAt)}</span>}
        <span className="orders-awnings">
          {awnings?.length
            ? collapseAwnings(awnings, (item) => `${item.state}|${coordinaOf(item, coordinaStatus) ?? ''}`).map((group) => <AwningChip key={group.items[0].letter} item={group.items[0]} group={group} coordinaStatus={coordinaStatus} />)
            : <span className="orders-models">{review.summary.awnings} {review.summary.awnings === 1 ? 'elemento' : 'elementos'}</span>}
        </span>
      </div>
      </div>
      {open && (
        <div className="orders-detail" id={detailId}>
          {awnings?.length ? (
            <ul className="orders-detail-list">
              {awnings.map((item) => {
                // La nota de devolución solo se enseña si CoordinaOT la tiene devuelta.
                const returned = coordinaStatus?.disponible ? coordinaStatus.ofs?.[normalizeOf(item.of)] : undefined;
                const nota = returned?.estado === 'devuelta' ? returned.nota : '';
                // Quién aprobó en CoordinaOT; es el que quedará de revisor al generar.
                const approvedBy = returned?.estado === 'aprobada' && returned.revisor ? reviewerName(returned.revisor, formOptions.tecnicos as string[]) : '';
                return (
                <li key={item.letter} className={`is-${item.state}`}>
                  <AwningChip item={item} coordinaStatus={coordinaStatus} />
                  <strong>{controlLabel(item.model)}</strong>
                  <span>OF {item.of || '—'}</span>
                  <span className="orders-detail-notes">{item.notes.length ? item.notes.join(' · ') : 'Sin avisos'}</span>
                  {approvedBy && <span className="orders-detail-approved">Aprobado por {controlLabel(approvedBy)}</span>}
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

// Un borrador (diseño 01/10/2026): las mismas columnas que un pedido, con la etiqueta «Borrador»
// delante; al desplegarlo, «Descartar borrador» y «Seguir con el borrador».
function DraftRow({ borrador, mine, open, onToggle, onSeguir, onDescartar }: {
  borrador: ResumenBorrador;
  mine: boolean;
  open: boolean;
  onToggle: () => void;
  onSeguir: () => void;
  onDescartar: () => void;
}) {
  const detailId = `orders-detail-borrador-${borrador.orderCode}`;
  const author = borrador.savedBy ? controlLabel(borrador.savedBy) : '—';
  const elementos = borrador.summary.elementos;
  return (
    <li className={`orders-row is-draft ${open ? 'bloque-3d-hundido is-open' : 'bloque-3d'} tone-draft`}>
      <div className="orders-row-head">
      <button
        type="button"
        className="orders-row-toggle"
        aria-expanded={open}
        aria-controls={detailId}
        aria-label={`${open ? 'Plegar' : 'Desplegar'} el borrador ${borrador.orderCode}`}
        onClick={onToggle}
      />
      <div className="orders-row-cells">
        <ChevronDown className="orders-chevron" aria-hidden="true" />
        <strong className="orders-code">{borrador.orderCode}</strong>
        <span className="orders-customer">{borrador.summary.customer || 'Sin cliente'}</span>
        <ModelTags models={borrador.summary.models} producto={borrador.kind} borrador />
        <span className="orders-author">{author}{mine && <em className="orders-me">Tú</em>}</span>
        <span className="orders-date">{fechaBorrador(borrador.updatedAt)}</span>
        <span className="orders-awnings"><span className="orders-models">{elementos} {elementos === 1 ? 'elemento' : 'elementos'}</span></span>
      </div>
      </div>
      {open && (
        <div className="orders-detail" id={detailId}>
          <p className="orders-detail-empty">Guardado por {author} el {fechaBorrador(borrador.updatedAt)}. Es un borrador: no está en revisión hasta que se guarde para revisión.</p>
          <div className="orders-detail-actions">
            <button type="button" className="ghost-button" onClick={onDescartar}><Trash2 aria-hidden="true" />Descartar borrador</button>
            <button type="button" className="primary-button boton-3d" onClick={onSeguir}><FilePen aria-hidden="true" />Seguir con el borrador</button>
          </div>
        </div>
      )}
    </li>
  );
}

function ModelTags({ models, producto, borrador = false }: { models?: string[]; producto: 'toldos' | 'remolques'; borrador?: boolean }) {
  // Una sola línea (Iván, 01/10/2026: «prefiero abreviaturas o un + que filas más grandes»): el
  // primer modelo y «+N» con todos al pasar el ratón; un nombre largo se corta con «…».
  const { visible, hidden } = limitModels(models, 1, 1);
  const tinte = producto === 'remolques' ? ' is-remolques' : '';
  // Todos los modelos también en el título de la línea entera, por si «+N» queda cortado.
  const todos = Array.from(new Set(models ?? [])).map(controlLabel).join('\n') || undefined;
  return (
    <span className="orders-model-tags" title={todos}>
      {borrador && <span className="orders-borrador-tag">Borrador</span>}
      <span className={`orders-kind-tag familia-tag is-${producto}`}>{producto === 'remolques' ? 'Remolque' : 'Toldo'}</span>
      {visible.map((model) => <span key={model} className={`orders-model-tag familia-tag is-nombre${tinte}`} title={controlLabel(model)}>{controlLabel(model)}</span>)}
      {hidden.length > 0 && <span className={`orders-model-tag familia-tag${tinte}`} title={Array.from(new Set(models)).map(controlLabel).join('\n')}>+{hidden.length}</span>}
    </span>
  );
}

function coordinaOf(item: AwningItem, coordinaStatus: CoordinaStatus | null) {
  return coordinaStatus?.disponible ? coordinaStatus.ofs?.[normalizeOf(item.of)]?.estado : undefined;
}

function AwningChip({ item, group, coordinaStatus }: { item: AwningItem; group?: { label: string; items: AwningItem[] }; coordinaStatus: CoordinaStatus | null }) {
  const label = item.state === 'ok' ? 'correcto' : item.state === 'warn' ? 'con aviso' : 'con errores';
  const coordina = coordinaOf(item, coordinaStatus);
  // Un solo signo claro por toldo: si el cálculo está bien y CoordinaOT tiene marca, solo se
  // enseña la de CoordinaOT (evita «✓ ✓» o «✓ ↩», que parecen contradecirse). Con aviso o
  // error se mantiene el icono del cálculo y se añade la marca de CoordinaOT.
  const showCalcIcon = !(item.state === 'ok' && coordina);
  return (
    <span className={`orders-chip is-${item.state}${item.state === 'ok' ? ' pildora-plantear' : item.state === 'warn' ? ' pildora-aviso' : ''}`} title={group && group.items.length > 1 ? group.items.map((one) => `${one.letter} · ${controlLabel(one.model)} · OF ${one.of || '—'}`).join('\n') + `\n${label} · CoordinaOT: ${coordina ?? 'sin datos'}` : `${item.letter} · ${controlLabel(item.model)} · ${label} · CoordinaOT: ${coordina ?? 'sin datos'}`}>
      {group?.label ?? item.letter}
      {showCalcIcon && (item.state === 'ok' ? <Check aria-hidden="true" /> : item.state === 'warn' ? <AlertTriangle aria-hidden="true" /> : <CircleAlert aria-hidden="true" />)}
      {coordina === 'aprobada' && <span className="orders-chip-coordina is-approved" role="img" aria-label="aprobada en CoordinaOT">✓</span>}
      {coordina === 'devuelta' && <span className="orders-chip-coordina is-returned" role="img" aria-label="devuelta en CoordinaOT">↩</span>}
      {coordina && coordina !== 'aprobada' && coordina !== 'devuelta' && <span className="orders-chip-coordina is-waiting" role="img" aria-label="en revisión en CoordinaOT">•</span>}
    </span>
  );
}
