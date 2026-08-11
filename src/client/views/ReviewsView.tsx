import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, CircleAlert, Factory, FileSearch, RefreshCw, Search, Undo2 } from 'lucide-react';
import type { Calculation, ReviewPackage, ReviewSummary } from '../types';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { ReviewOrderDetail, ReviewStatusBadge } from '../components/ReviewOrderDetail';

export function ReviewsView({ refreshKey, onOpen, onReuse, onToast, onConfirm }: {
  refreshKey: number;
  onOpen: (review: ReviewPackage) => void | Promise<void>;
  onReuse: (review: ReviewPackage) => void | Promise<void>;
  onToast: Notify;
  onConfirm: AskForConfirmation;
}) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'queue' | 'history'>('queue');
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [detail, setDetail] = useState<{ orderCode: string; review: ReviewPackage | null; calculation: Calculation | null } | null>(null);
  const [reviewer, setReviewer] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [detailRefresh, setDetailRefresh] = useState(0);
  const listRequestId = useRef(0);

  async function load() {
    const requestId = ++listRequestId.current;
    setLoading(true);
    try {
      const response = await fetch(`/api/reviews?year=${year}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar la bandeja.');
      if (requestId !== listRequestId.current) return;
      setReviews(data.reviews);
      setSelectedCode((current) => data.reviews.some((item: ReviewSummary) => item.orderCode === current) ? current : data.reviews[0]?.orderCode || '');
      setDetailRefresh((current) => current + 1);
    } catch (error) {
      if (requestId !== listRequestId.current) return;
      onToast(error instanceof Error ? error.message : 'No se pudo cargar la bandeja.', { tone: 'error' });
    } finally {
      if (requestId === listRequestId.current) setLoading(false);
    }
  }

  useEffect(() => {
    const requestId = ++listRequestId.current;
    let cancelled = false;
    fetch(`/api/reviews?year=${year}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo cargar la bandeja.');
        return data.reviews as ReviewSummary[];
      })
      .then((items) => {
        if (cancelled || requestId !== listRequestId.current) return;
        setReviews(items);
        setSelectedCode((current) => items.some((item) => item.orderCode === current) ? current : items[0]?.orderCode || '');
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled || requestId !== listRequestId.current) return;
        setLoading(false);
        onToast(error instanceof Error ? error.message : 'No se pudo cargar la bandeja.', { tone: 'error' });
      });
    return () => { cancelled = true; };
  }, [year, refreshKey, onToast]);

  const scopedReviews = useMemo(
    () => reviews.filter((review) => viewMode === 'history' ? review.status === 'PRODUCED' : review.status !== 'PRODUCED'),
    [reviews, viewMode]
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return scopedReviews;
    return scopedReviews.filter((review) =>
      review.orderCode.toLowerCase().includes(term)
      || review.summary.customer.toLowerCase().includes(term)
      || review.summary.models.some((model) => model.toLowerCase().includes(term))
    );
  }, [scopedReviews, query]);

  const effectiveSelectedCode = filtered.some((item) => item.orderCode === selectedCode)
    ? selectedCode
    : filtered[0]?.orderCode || '';
  const selected = reviews.find((review) => review.orderCode === effectiveSelectedCode) || null;
  const detailIsCurrent = detail?.orderCode === effectiveSelectedCode;
  const selectedReview = detailIsCurrent ? detail.review : null;
  const selectedCalculation = detailIsCurrent ? detail.calculation : null;
  const detailLoading = Boolean(effectiveSelectedCode && !detailIsCurrent);

  useEffect(() => {
    if (!effectiveSelectedCode) return;
    let cancelled = false;
    fetchReviewDetails(effectiveSelectedCode)
      .then(({ review, calculation }) => {
        if (cancelled) return;
        setDetail({ orderCode: effectiveSelectedCode, review, calculation });
      })
      .catch((error) => {
        if (cancelled) return;
        setDetail({ orderCode: effectiveSelectedCode, review: null, calculation: null });
        onToast(error instanceof Error ? error.message : 'No se pudieron cargar los datos del pedido.', { tone: 'error' });
      });
    return () => { cancelled = true; };
  }, [effectiveSelectedCode, refreshKey, detailRefresh, onToast]);

  async function openSelected() {
    if (!selected) return;
    setWorking(true);
    try {
      const review = selectedReview || (await fetchReviewDetails(selected.orderCode)).review;
      await onOpen(review);
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudo abrir el pedido.', { tone: 'error' });
    } finally {
      setWorking(false);
    }
  }

  async function reuseSelected() {
    if (!selected) return;
    setWorking(true);
    try {
      const review = selectedReview || (await fetchReviewDetails(selected.orderCode)).review;
      await onReuse(review);
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudieron reutilizar los datos del pedido.', { tone: 'error' });
    } finally {
      setWorking(false);
    }
  }

  async function requestChanges() {
    if (!selected) return;
    await decide('request-changes', false);
  }

  async function approve(confirmOverwrite = false, includeNonAcrylicFabrics: boolean | null = null) {
    if (!selected) return;
    await decide('approve', confirmOverwrite, includeNonAcrylicFabrics);
  }

  async function decide(action: 'request-changes' | 'approve', confirmOverwrite: boolean, includeNonAcrylicFabrics: boolean | null = null) {
    if (!reviewer.trim()) {
      onToast('Indica quién realiza la revisión.', { tone: 'warning' });
      return;
    }
    if (action === 'request-changes' && !note.trim()) {
      onToast('Describe los cambios que hay que realizar.', { tone: 'warning' });
      return;
    }
    setWorking(true);
    try {
      const response = await fetch(`/api/reviews/${encodeURIComponent(selected!.orderCode)}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer, note, confirmOverwrite, includeNonAcrylicFabrics })
      });
      const data = await response.json();
      if (response.status === 409 && data.needsFabricConfirmation) {
        const fabricItems = (data.fabrics || []) as { code: string; description: string; ofs: string[] }[];
        const fabrics = fabricItems.map((fabric) =>
          `${fabric.code} · ${fabric.description}${fabric.ofs?.length ? ` (OF ${fabric.ofs.join(', ')})` : ''}`
        );
        const plural = fabricItems.length > 1;
        const choice = await onConfirm({
          title: plural ? 'Telas no acrílicas' : 'Tela no acrílica',
          message: `Decide si quieres incluir${plural ? 'las' : 'la'} en la reserva de material. Cerrar este aviso no tomará ninguna decisión.`,
          details: fabrics,
          confirmLabel: 'Incluir en la reserva',
          cancelLabel: 'No incluir',
          tone: 'warning'
        });
        if (choice === 'dismiss') return;
        await approve(confirmOverwrite, choice === 'confirm');
        return;
      }
      if (response.status === 409 && data.needsConfirmation) {
        const choice = await onConfirm({
          title: 'Sustituir archivos existentes',
          message: 'Los siguientes archivos ya existen en las carpetas de producción. Comprueba la lista antes de sustituirlos.',
          details: data.existing,
          confirmLabel: 'Sustituir archivos',
          cancelLabel: 'Conservar archivos',
          tone: 'danger'
        });
        if (choice === 'confirm') await approve(true, includeNonAcrylicFabrics);
        return;
      }
      if (!response.ok) throw new Error(data.error || 'No se pudo completar la revisión.');
      if (data.review) setDetail({ orderCode: selected!.orderCode, review: data.review as ReviewPackage, calculation: selectedCalculation });
      onToast(action === 'approve'
        ? buildApprovalMessage(selected!.orderCode, data)
        : `Cambios solicitados para ${selected!.orderCode}.`, {
        tone: 'success',
        title: action === 'approve' ? 'Pedido enviado a producción' : 'Cambios solicitados'
      });
      setNote('');
      await load();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudo completar la revisión.', { tone: 'error' });
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="reviews-layout">
      <div className="review-inbox panel">
        <div className="section-header review-toolbar">
          <div><h2>{viewMode === 'queue' ? 'Bandeja compartida' : 'Historial'}</h2><span>{scopedReviews.length} pedidos en {year}</span></div>
          <button className="icon-button" type="button" onClick={() => void load()} aria-label="Actualizar"><RefreshCw aria-hidden="true" /></button>
        </div>
        <div className="review-view-switch" role="group" aria-label="Vista de revisión">
          <button type="button" aria-pressed={viewMode === 'queue'} className={viewMode === 'queue' ? 'is-active' : ''} onClick={() => { setViewMode('queue'); setNote(''); }}>Por revisar <span>{reviews.filter((item) => item.status !== 'PRODUCED').length}</span></button>
          <button type="button" aria-pressed={viewMode === 'history'} className={viewMode === 'history' ? 'is-active' : ''} onClick={() => { setViewMode('history'); setNote(''); }}>Historial <span>{reviews.filter((item) => item.status === 'PRODUCED').length}</span></button>
        </div>
        <div className="review-filters">
          <label><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pedido, cliente o modelo…" aria-label="Buscar pedidos" /></label>
          <input className="review-year" type="number" min="2000" max="2100" value={year} onChange={(event) => { setLoading(true); setYear(Number(event.target.value)); setNote(''); }} aria-label="Año" />
        </div>
        <div className="review-list">
          {loading ? <div className="review-empty">Cargando pedidos…</div>
            : filtered.length === 0 ? <div className="review-empty"><FileSearch aria-hidden="true" />No hay pedidos para esta búsqueda.</div>
              : filtered.map((review) => (
                <button className={`review-list-item ${effectiveSelectedCode === review.orderCode ? 'is-selected' : ''}`} type="button" key={review.orderCode} onClick={() => { setSelectedCode(review.orderCode); setNote(''); }}>
                  <span className="review-list-main"><strong>{review.orderCode}</strong><small>{review.summary.customer || 'Sin cliente'}</small></span>
                  <ReviewStatusBadge status={review.status} />
                  <span className="review-list-meta">{formatAwningCount(review.summary.awnings)} · {formatDate(review.updatedAt)}</span>
                  <ChevronRight aria-hidden="true" />
                </button>
              ))}
        </div>
      </div>

      <ReviewOrderDetail
        review={selectedReview}
        calculation={selectedCalculation}
        loading={detailLoading}
        canEdit={Boolean(selected && selected.status !== 'PRODUCED')}
        canReuse={Boolean(selected && selected.status === 'PRODUCED')}
        disabled={working}
        onEdit={() => void openSelected()}
        onReuse={() => void reuseSelected()}
      />

      <aside className="review-desk panel">
        {!selected ? <div className="review-empty"><FileSearch aria-hidden="true" />Selecciona un pedido para revisar.</div> : (
          <>
            <div className="review-desk-head">
              <div><span>Mesa de revisión</span><h2>{selected.orderCode}</h2></div>
              <ReviewStatusBadge status={selected.status} />
            </div>
            <dl className="review-facts">
              <div><dt>Cliente</dt><dd>{selected.summary.customer || '-'}</dd></div>
              <div><dt>Técnico</dt><dd>{selected.summary.technician || '-'}</dd></div>
              <div><dt>OF</dt><dd>{selected.summary.ofs.join(', ') || '-'}</dd></div>
              <div><dt>Modelos</dt><dd>{selected.summary.models.join(', ') || '-'}</dd></div>
            </dl>
            {selected.status === 'CHANGES_REQUESTED' && selected.reviewNote && (
              <div className="review-note"><CircleAlert aria-hidden="true" /><span><strong>Cambios solicitados por {selected.reviewedBy}</strong>{selected.reviewNote}</span></div>
            )}
            {selected.status === 'PRODUCED' && selected.production && (
              <div className="review-production-files"><Factory aria-hidden="true" /><span><strong>Enviado a producción</strong>{selected.production.files.map((file) => file.filename).join(' · ')}</span></div>
            )}
            {selected.status !== 'PRODUCED' && (
              <div className="review-decision">
                <label>Revisado por<input value={reviewer} onChange={(event) => setReviewer(event.target.value)} placeholder="Nombre del técnico" /></label>
                <label>Observaciones<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Opcional al aprobar; obligatorio al pedir cambios" /></label>
                <div>
                  <button className="ghost-button request-changes-button" type="button" disabled={working} onClick={requestChanges}><Undo2 aria-hidden="true" />Pedir cambios</button>
                  <button className="primary-button" type="button" disabled={working} onClick={() => void approve()}><Check aria-hidden="true" />Aprobar y producir</button>
                </div>
              </div>
            )}
          </>
        )}
      </aside>
    </section>
  );
}

function buildApprovalMessage(orderCode: string, data: { saved?: { type: string }[]; excludedNonAcrylicFabrics?: unknown[] }) {
  const rpsCount = data.saved?.filter((file) => file.type === 'rps').length || 0;
  const excludedCount = data.excludedNonAcrylicFabrics?.length || 0;
  const excludedLabel = excludedCount > 1 ? 'las telas no acrílicas' : 'la tela no acrílica';
  if (!rpsCount && excludedCount) return `Pedido ${orderCode} aprobado: PDF guardado; ${excludedLabel} no se ${excludedCount > 1 ? 'incluyeron' : 'incluyó'} y no fue necesario crear RPS.`;
  if (excludedCount) return `Pedido ${orderCode} aprobado: PDF y RPS guardados sin incluir ${excludedLabel}.`;
  return `Pedido ${orderCode} aprobado: PDF y RPS guardados.`;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-ES');
}

function formatAwningCount(count: number) {
  return `${count} ${count === 1 ? 'toldo' : 'toldos'}`;
}

async function fetchReviewDetails(orderCode: string) {
  const reviewResponse = await fetch(`/api/reviews/${encodeURIComponent(orderCode)}`);
  const reviewData = await reviewResponse.json();
  if (!reviewResponse.ok) throw new Error(reviewData.error || 'No se pudo abrir el pedido.');
  const review = reviewData as ReviewPackage;

  const calculationResponse = await fetch('/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(review.order)
  });
  const calculationData = await calculationResponse.json();
  if (!calculationResponse.ok) throw new Error(calculationData.error || 'No se pudieron comprobar los datos del pedido.');
  return { review, calculation: calculationData as Calculation };
}
