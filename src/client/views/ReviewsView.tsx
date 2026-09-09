import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, FileSearch, RefreshCw, Search } from 'lucide-react';
import type { ReviewPackage, ReviewSummary, RuleParameters } from '../types';
import type { AskForConfirmation, Notify } from '../components/NotificationCenter';
import { ReviewOrderDetail, ReviewStatusBadge } from '../components/ReviewOrderDetail';

export function ReviewsView({ refreshKey, parameters, onOpen, onReuse, onToast, onConfirm }: {
  refreshKey: number;
  parameters: RuleParameters;
  onOpen: (review: ReviewPackage) => void | Promise<void>;
  onReuse: (review: ReviewPackage) => void | Promise<void>;
  onToast: Notify;
  onConfirm: AskForConfirmation;
}) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'queue' | 'approved' | 'produced'>('queue');
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [detail, setDetail] = useState<{ orderCode: string; review: ReviewPackage | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [approving, setApproving] = useState(false);
  const [generating, setGenerating] = useState(false);
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

  const reviewCounts = useMemo(() => ({
    queue: reviews.filter(isPending).length,
    approved: reviews.filter(isApproved).length,
    produced: reviews.filter(isProduced).length
  }), [reviews]);
  const scopedReviews = useMemo(() => reviews.filter((review) => {
    if (viewMode === 'queue') return isPending(review);
    if (viewMode === 'approved') return isApproved(review);
    return isProduced(review);
  }), [reviews, viewMode]);

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
  const detailLoading = Boolean(effectiveSelectedCode && !detailIsCurrent);

  useEffect(() => {
    if (!effectiveSelectedCode) return;
    let cancelled = false;
    fetchReviewDetails(effectiveSelectedCode)
      .then((review) => {
        if (cancelled) return;
        setDetail({ orderCode: effectiveSelectedCode, review });
      })
      .catch((error) => {
        if (cancelled) return;
        setDetail({ orderCode: effectiveSelectedCode, review: null });
        onToast(error instanceof Error ? error.message : 'No se pudieron cargar los datos del pedido.', { tone: 'error' });
      });
    return () => { cancelled = true; };
  }, [effectiveSelectedCode, refreshKey, detailRefresh, onToast]);

  async function openSelected() {
    if (!selected) return;
    setWorking(true);
    try {
      const review = selectedReview || await fetchReviewDetails(selected.orderCode);
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
      const review = selectedReview || await fetchReviewDetails(selected.orderCode);
      await onReuse(review);
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudieron reutilizar los datos del pedido.', { tone: 'error' });
    } finally {
      setWorking(false);
    }
  }

  async function approveSelected() {
    if (!selected || !selectedReview) return;
    const choice = await onConfirm({
      title: `Aprobar ${selected.orderCode}`,
      message: 'El pedido quedará marcado como Aprobado en la lista de revisión. Esta acción no genera reservas ni envía archivos a producción.',
      confirmLabel: 'Aprobar pedido',
      cancelLabel: 'Seguir revisando',
      tone: 'warning'
    });
    if (choice !== 'confirm') return;

    setApproving(true);
    try {
      const response = await fetch(`/api/reviews/${encodeURIComponent(selected.orderCode)}/mark-approved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer: selectedReview.order.reviewer || selectedReview.order.technician })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo aprobar el pedido.');
      updateLocalReview(data.review as ReviewPackage);
      setViewMode('approved');
      onToast(`Pedido ${selected.orderCode} marcado como aprobado.`, { tone: 'success', title: 'Revisión aprobada' });
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudo aprobar el pedido.', { tone: 'error' });
    } finally {
      setApproving(false);
    }
  }

  async function generateSelected() {
    if (!selected || !selectedReview || selected.status !== 'APPROVED') return;
    const targetCode = selected.orderCode;
    const initialChoice = await onConfirm({
      title: `Generar archivos de ${targetCode}`,
      message: 'Se guardará el planteamiento PDF en Planteamientos y un Excel de reserva por cada OF en Subida de material.',
      details: [`${targetCode}-1.pdf`, ...selectedReview.summary.ofs.map((of) => `${of}.xls`)],
      confirmLabel: 'Generar archivos',
      cancelLabel: 'Ahora no',
      tone: 'warning'
    });
    if (initialChoice !== 'confirm') return;

    setGenerating(true);
    let includeNonAcrylicFabrics: boolean | null = null;
    let confirmOverwrite = false;
    try {
      while (true) {
        const response = await fetch(`/api/reviews/${encodeURIComponent(targetCode)}/generate-files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            includeNonAcrylicFabrics,
            confirmOverwrite
          })
        });
        const data = await response.json();

        if (response.status === 409 && data.needsFabricConfirmation) {
          const fabrics = (data.fabrics || []).map((fabric: { code: string; description: string; ofs?: string[] }) =>
            `${fabric.code} · ${fabric.description}${fabric.ofs?.length ? ` (OF ${fabric.ofs.join(', ')})` : ''}`
          );
          const choice = await onConfirm({
            title: fabrics.length > 1 ? 'Telas no acrílicas' : 'Tela no acrílica',
            message: 'Decide si debe incluirse en la reserva de material.',
            details: fabrics,
            confirmLabel: 'Incluir en la reserva',
            cancelLabel: 'No incluir',
            tone: 'warning'
          });
          if (choice === 'dismiss') return;
          includeNonAcrylicFabrics = choice === 'confirm';
          continue;
        }

        if (response.status === 409 && data.needsConfirmation) {
          const choice = await onConfirm({
            title: 'Sustituir archivos existentes',
            message: 'Estos archivos ya existen. Comprueba la lista antes de sustituirlos.',
            details: data.existing,
            confirmLabel: 'Sustituir archivos',
            cancelLabel: 'Conservar archivos',
            tone: 'danger'
          });
          if (choice !== 'confirm') return;
          confirmOverwrite = true;
          continue;
        }

        if (!response.ok) throw new Error(data.error || 'No se pudieron generar los archivos.');
        updateLocalReview(data.review as ReviewPackage);
        setViewMode('produced');
        const rpsCount = (data.saved || []).filter((file: { type: string }) => file.type === 'rps').length;
        onToast(`Guardado ${targetCode}-1.pdf y ${rpsCount} ${rpsCount === 1 ? 'Excel de reserva' : 'Excel de reserva'}.`, {
          tone: 'success',
          title: 'Archivos generados'
        });
        return;
      }
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudieron generar los archivos.', { tone: 'error' });
    } finally {
      setGenerating(false);
    }
  }

  function updateLocalReview(review: ReviewPackage) {
    setDetail((current) => current?.orderCode === review.orderCode
      ? { orderCode: review.orderCode, review: { ...review, order: current.review?.order || review.order } }
      : current);
    setReviews((current) => current.map((item) => item.orderCode === review.orderCode ? reviewSummary(review) : item));
  }

  return (
    <section className="reviews-layout">
      <div className="review-inbox panel">
        <div className="section-header review-toolbar">
          <div><h2>{viewMode === 'queue' ? 'Por revisar' : viewMode === 'approved' ? 'Aprobados' : 'Archivos generados'}</h2><span>{scopedReviews.length} pedidos en {year}</span></div>
          <button className="icon-button" type="button" disabled={generating} onClick={() => void load()} aria-label="Actualizar"><RefreshCw aria-hidden="true" /></button>
        </div>
        <div className="review-view-switch" role="group" aria-label="Vista de revisión">
          <button type="button" disabled={generating} aria-pressed={viewMode === 'queue'} className={viewMode === 'queue' ? 'is-active' : ''} onClick={() => setViewMode('queue')}>Por revisar <span>{reviewCounts.queue}</span></button>
          <button type="button" disabled={generating} aria-pressed={viewMode === 'approved'} className={viewMode === 'approved' ? 'is-active' : ''} onClick={() => setViewMode('approved')}>Aprobados <span>{reviewCounts.approved}</span></button>
          <button type="button" disabled={generating} aria-pressed={viewMode === 'produced'} className={viewMode === 'produced' ? 'is-active' : ''} onClick={() => setViewMode('produced')}>Generados <span>{reviewCounts.produced}</span></button>
        </div>
        <div className="review-filters">
          <label><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pedido, cliente o modelo…" aria-label="Buscar pedidos" /></label>
          <input className="review-year" type="number" min="2000" max="2100" value={year} onChange={(event) => { setLoading(true); setYear(Number(event.target.value)); }} aria-label="Año" />
        </div>
        <div className="review-list">
          {loading ? <div className="review-empty">Cargando pedidos…</div>
            : filtered.length === 0 ? <div className="review-empty"><FileSearch aria-hidden="true" />No hay pedidos para esta búsqueda.</div>
              : filtered.map((review) => (
                <button className={`review-list-item ${effectiveSelectedCode === review.orderCode ? 'is-selected' : ''}`} disabled={generating} type="button" key={review.orderCode} onClick={() => setSelectedCode(review.orderCode)}>
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
        parameters={parameters}
        loading={detailLoading}
        canEdit={Boolean(selected && isPending(selected))}
        canReuse={Boolean(selected && isReviewed(selected))}
        canApprove={Boolean(selected && isPending(selected))}
        canGenerate={Boolean(selected && selected.status === 'APPROVED')}
        disabled={working || approving || generating}
        approving={approving}
        generating={generating}
        onEdit={() => void openSelected()}
        onReuse={() => void reuseSelected()}
        onApprove={() => void approveSelected()}
        onGenerate={() => void generateSelected()}
      />
    </section>
  );
}

function reviewSummary(review: ReviewPackage): ReviewSummary {
  const { order, ...summary } = review;
  void order;
  return summary;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-ES');
}

function formatAwningCount(count: number) {
  return `${count} ${count === 1 ? 'toldo' : 'toldos'}`;
}

function isPending(review: Pick<ReviewSummary, 'status'>) {
  return review.status === 'PENDING_REVIEW' || review.status === 'CHANGES_REQUESTED';
}

function isReviewed(review: Pick<ReviewSummary, 'status'>) {
  return review.status === 'APPROVED' || review.status === 'PRODUCED';
}

function isApproved(review: Pick<ReviewSummary, 'status'>) {
  return review.status === 'APPROVED';
}

function isProduced(review: Pick<ReviewSummary, 'status'>) {
  return review.status === 'PRODUCED';
}

async function fetchReviewDetails(orderCode: string) {
  const reviewResponse = await fetch(`/api/reviews/${encodeURIComponent(orderCode)}`);
  const reviewData = await reviewResponse.json();
  if (!reviewResponse.ok) throw new Error(reviewData.error || 'No se pudo abrir el pedido.');
  return reviewData as ReviewPackage;
}
