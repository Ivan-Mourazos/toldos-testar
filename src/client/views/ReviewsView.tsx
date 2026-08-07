import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronRight, CircleAlert, Factory, FileSearch, RefreshCw, Search, Undo2 } from 'lucide-react';
import type { ReviewPackage, ReviewStatus, ReviewSummary } from '../types';

export function ReviewsView({ refreshKey, onOpen, onToast }: {
  refreshKey: number;
  onOpen: (review: ReviewPackage) => void;
  onToast: (message: string) => void;
}) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [query, setQuery] = useState('');
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`/api/reviews?year=${year}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo cargar la bandeja.');
      setReviews(data.reviews);
      setSelectedCode((current) => data.reviews.some((item: ReviewSummary) => item.orderCode === current) ? current : data.reviews[0]?.orderCode || '');
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudo cargar la bandeja.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reviews?year=${year}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No se pudo cargar la bandeja.');
        return data.reviews as ReviewSummary[];
      })
      .then((items) => {
        if (cancelled) return;
        setReviews(items);
        setSelectedCode((current) => items.some((item) => item.orderCode === current) ? current : items[0]?.orderCode || '');
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoading(false);
        onToast(error instanceof Error ? error.message : 'No se pudo cargar la bandeja.');
      });
    return () => { cancelled = true; };
  }, [year, refreshKey, onToast]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return reviews;
    return reviews.filter((review) =>
      review.orderCode.toLowerCase().includes(term)
      || review.summary.customer.toLowerCase().includes(term)
      || review.summary.models.some((model) => model.toLowerCase().includes(term))
    );
  }, [reviews, query]);
  const selected = reviews.find((review) => review.orderCode === selectedCode) || null;

  async function fetchReview(orderCode: string) {
    const response = await fetch(`/api/reviews/${encodeURIComponent(orderCode)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo abrir el pedido.');
    return data as ReviewPackage;
  }

  async function openSelected() {
    if (!selected) return;
    setWorking(true);
    try {
      onOpen(await fetchReview(selected.orderCode));
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudo abrir el pedido.');
    } finally {
      setWorking(false);
    }
  }

  async function requestChanges() {
    if (!selected) return;
    await decide('request-changes', false);
  }

  async function approve(confirmOverwrite = false) {
    if (!selected) return;
    await decide('approve', confirmOverwrite);
  }

  async function decide(action: 'request-changes' | 'approve', confirmOverwrite: boolean) {
    if (!reviewer.trim()) {
      onToast('Indica quién realiza la revisión.');
      return;
    }
    if (action === 'request-changes' && !note.trim()) {
      onToast('Describe los cambios que hay que realizar.');
      return;
    }
    setWorking(true);
    try {
      const response = await fetch(`/api/reviews/${encodeURIComponent(selected!.orderCode)}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewer, note, confirmOverwrite })
      });
      const data = await response.json();
      if (response.status === 409 && data.needsConfirmation) {
        const ok = window.confirm(`Ya existen estos archivos:\n\n${data.existing.join('\n')}\n\n¿Quieres sustituirlos?`);
        if (ok) await approve(true);
        return;
      }
      if (!response.ok) throw new Error(data.error || 'No se pudo completar la revisión.');
      onToast(action === 'approve'
        ? `Pedido ${selected!.orderCode} aprobado: PDF y RPS guardados.`
        : `Cambios solicitados para ${selected!.orderCode}.`);
      setNote('');
      await load();
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'No se pudo completar la revisión.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="reviews-layout">
      <div className="review-inbox panel">
        <div className="section-header review-toolbar">
          <div><h2>Bandeja compartida</h2><span>{reviews.length} pedidos en {year}</span></div>
          <button className="icon-button" type="button" onClick={() => void load()} aria-label="Actualizar"><RefreshCw aria-hidden="true" /></button>
        </div>
        <div className="review-filters">
          <label><Search aria-hidden="true" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pedido, cliente o modelo…" /></label>
          <input className="review-year" type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(Number(event.target.value))} aria-label="Año" />
        </div>
        <div className="review-list">
          {loading ? <div className="review-empty">Cargando pedidos…</div>
            : filtered.length === 0 ? <div className="review-empty"><FileSearch aria-hidden="true" />No hay pedidos para esta búsqueda.</div>
              : filtered.map((review) => (
                <button className={`review-list-item ${selectedCode === review.orderCode ? 'is-selected' : ''}`} type="button" key={review.orderCode} onClick={() => setSelectedCode(review.orderCode)}>
                  <span className="review-list-main"><strong>{review.orderCode}</strong><small>{review.summary.customer || 'Sin cliente'}</small></span>
                  <StatusBadge status={review.status} />
                  <span className="review-list-meta">{review.summary.awnings} toldos · {formatDate(review.updatedAt)}</span>
                  <ChevronRight aria-hidden="true" />
                </button>
              ))}
        </div>
      </div>

      <aside className="review-desk panel">
        {!selected ? <div className="review-empty"><FileSearch aria-hidden="true" />Selecciona un pedido para revisar.</div> : (
          <>
            <div className="review-desk-head">
              <div><span>Mesa de revisión</span><h2>{selected.orderCode}</h2></div>
              <StatusBadge status={selected.status} />
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
            <button className="ghost-button review-open" type="button" disabled={working} onClick={openSelected}><FileSearch aria-hidden="true" />Abrir pedido y comprobar</button>
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

function StatusBadge({ status }: { status: ReviewStatus }) {
  const labels: Record<ReviewStatus, string> = {
    PENDING_REVIEW: 'Pendiente',
    CHANGES_REQUESTED: 'Con cambios',
    PRODUCED: 'En producción'
  };
  return <span className={`review-status status-${status.toLowerCase()}`}>{labels[status]}</span>;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('es-ES');
}
