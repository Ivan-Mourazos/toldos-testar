import React, { useMemo } from 'react';
import { AlertTriangle, CopyPlus, FileSearch, PencilLine } from 'lucide-react';
import { buildReviewSheetEntries, fabricLabel } from '../../domain/reviewSheetEntries.js';
import type { Calculation, ReviewPackage, ReviewStatus } from '../types';

export function ReviewOrderDetail({
  review,
  calculation,
  loading,
  canEdit,
  canReuse,
  disabled,
  onEdit,
  onReuse
}: {
  review: ReviewPackage | null;
  calculation: Calculation | null;
  loading: boolean;
  canEdit: boolean;
  canReuse: boolean;
  disabled: boolean;
  onEdit: () => void;
  onReuse: () => void;
}) {
  const entries = useMemo(
    () => review && calculation ? buildReviewSheetEntries(review.order, calculation) : [],
    [review, calculation]
  );

  if (loading) {
    return <section className="review-reader panel"><div className="review-empty"><FileSearch aria-hidden="true" />Cargando los datos del pedido…</div></section>;
  }

  if (!review || !calculation) {
    return <section className="review-reader panel"><div className="review-empty"><FileSearch aria-hidden="true" />Selecciona un pedido para ver sus datos.</div></section>;
  }

  const globalDiagnostics = calculation.diagnostics.filter((item) => !item.awningId);
  const orderFabric = fabricLabel(review.order.fabric) || 'Por toldo / sin indicar';

  return (
    <section className="review-reader panel" aria-label={`Datos de revisión de ${review.orderCode}`}>
      <header className="review-reader-header">
        <div>
          <span>Vista de solo lectura</span>
          <h2>{review.orderCode}</h2>
          <small>Comprueba aquí el pedido sin modificar el formulario original.</small>
        </div>
        <div className="review-reader-actions">
          <ReviewStatusBadge status={review.status} />
          {canEdit && <button className="ghost-button" type="button" disabled={disabled} onClick={onEdit}><PencilLine aria-hidden="true" />Corregir en Pedido</button>}
          {canReuse && <button className="ghost-button" type="button" disabled={disabled} onClick={onReuse}><CopyPlus aria-hidden="true" />Reutilizar datos</button>}
        </div>
      </header>

      <dl className="review-order-summary">
        <SummaryFact label="Cliente" value={review.order.customer} />
        <SummaryFact label="Fecha del pedido" value={formatDate(review.order.orderDate)} />
        <SummaryFact label="Técnico" value={review.order.technician} />
        <SummaryFact label="Revisión asignada" value={review.order.reviewer} />
        <SummaryFact label="Tela" value={orderFabric} />
        <SummaryFact label="Elementos" value={String(review.order.awnings.length)} />
      </dl>

      {review.order.notes && (
        <div className="review-order-notes">
          <strong>Observaciones de tela del pedido</strong>
          <p>{review.order.notes}</p>
        </div>
      )}

      {globalDiagnostics.length > 0 && (
        <div className="review-reader-diagnostics">
          <AlertTriangle aria-hidden="true" />
          <div><strong>Observaciones generales del cálculo</strong>{globalDiagnostics.map((item, index) => <span key={`${item.message}-${index}`}>{item.message}</span>)}</div>
        </div>
      )}

      <div className="review-order-cards">
        {entries.map((entry: ReturnType<typeof buildReviewSheetEntries>[number]) => {
          const diagnostics = calculation.diagnostics.filter((item) => item.awningId === entry.awning.id);
          return (
            <article className="review-order-card" key={entry.awning.id}>
              <header>
                <span className="review-letter" aria-label={`Elemento ${entry.letter}`}>{entry.letter}</span>
                <div className="review-card-title">
                  <h3>{entry.title}</h3>
                  {entry.legacyTitle && <small>antes {entry.legacyTitle}</small>}
                </div>
                {entry.modified && <span className="review-modified">Reglas modificadas</span>}
                <EntryStatus status={entry.status} />
              </header>

              <dl className="review-card-fields">
                {entry.fields.map((field: { label: string; value: string }, index: number) => (
                  <div key={`${field.label}-${index}`}><dt>{field.label}</dt><dd>{field.value}</dd></div>
                ))}
              </dl>

              {entry.notes.length > 0 && (
                <div className="review-card-notes is-single">
                  {entry.notes.map((note: { label: string; value: string }) => (
                    <div key={note.label}><strong>{note.label}</strong><p>{note.value}</p></div>
                  ))}
                </div>
              )}

              {diagnostics.length > 0 && (
                <ul className="review-card-diagnostics">
                  {diagnostics.map((diagnostic, index) => <li key={`${diagnostic.message}-${index}`}>{diagnostic.message}</li>)}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const labels: Record<ReviewStatus, string> = {
    PENDING_REVIEW: 'Pendiente',
    CHANGES_REQUESTED: 'Con cambios',
    PRODUCED: 'En producción'
  };
  return <span className={`review-status status-${status.toLowerCase()}`}>{labels[status]}</span>;
}

function EntryStatus({ status }: { status: string }) {
  const className = status === 'VÁLIDO' ? 'is-valid' : status === 'REVISAR' ? 'is-review' : 'is-incomplete';
  return <span className={`review-entry-status ${className}`}>{status}</span>;
}

function SummaryFact({ label, value }: { label: string; value?: string }) {
  return <div><dt>{label}</dt><dd>{value || '—'}</dd></div>;
}

function formatDate(value: string) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-ES').format(date);
}
