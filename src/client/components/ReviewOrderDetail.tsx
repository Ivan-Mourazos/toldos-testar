import React, { useMemo } from 'react';
import { CheckCircle2, CopyPlus, Download, ExternalLink, Factory, FileSearch, FileSpreadsheet, FileText, PencilLine } from 'lucide-react';
import type { ReviewPackage, ReviewStatus, RuleParameters } from '../types';
import { OrderView } from '../views/OrderView';
import { ReviewPlanteamientoPreview } from './ReviewPlanteamientoPreview';

const noop = () => undefined;

export function ReviewOrderDetail({
  review,
  parameters,
  loading,
  canEdit,
  canReuse,
  canApprove,
  canGenerate,
  disabled,
  approving,
  generating,
  onEdit,
  onReuse,
  onApprove,
  onGenerate
}: {
  review: ReviewPackage | null;
  parameters: RuleParameters;
  loading: boolean;
  canEdit: boolean;
  canReuse: boolean;
  canApprove: boolean;
  canGenerate: boolean;
  disabled: boolean;
  approving: boolean;
  generating: boolean;
  onEdit: () => void;
  onReuse: () => void;
  onApprove: () => void;
  onGenerate: () => void;
}) {
  const availableModels = useMemo(
    () => Array.from(new Set(review?.order.awnings.map((awning) => awning.model).filter(Boolean) || [])),
    [review]
  );

  if (loading) {
    return <section className="review-reader panel"><div className="review-empty"><FileSearch aria-hidden="true" />Cargando el pedido y su vista previa…</div></section>;
  }

  if (!review) {
    return <section className="review-reader panel"><div className="review-empty"><FileSearch aria-hidden="true" />Selecciona un pedido para revisarlo.</div></section>;
  }

  const reviewParameters = review.order.parameters || parameters;
  const approved = review.status === 'APPROVED';
  const produced = review.status === 'PRODUCED' && Boolean(review.production);

  return (
    <section className="review-reader review-reader-form panel" aria-label={`Datos de revisión de ${review.orderCode}`}>
      <header className="review-reader-header">
        <div>
          <span>Revisión visual del pedido</span>
          <h2>{review.orderCode}</h2>
          <small>Formulario bloqueado en solo lectura · vista previa paginada con flechas.</small>
        </div>
        <div className="review-reader-actions">
          <ReviewStatusBadge status={review.status} />
          {canEdit && <button className="ghost-button" type="button" disabled={disabled} onClick={onEdit}><PencilLine aria-hidden="true" />Corregir en Pedido</button>}
          {canReuse && <button className="ghost-button" type="button" disabled={disabled} onClick={onReuse}><CopyPlus aria-hidden="true" />Reutilizar datos</button>}
          {canApprove && (
            <button className="primary-button review-approve-button" type="button" disabled={disabled} onClick={onApprove}>
              <CheckCircle2 aria-hidden="true" />{approving ? 'Aprobando…' : 'Aprobar'}
            </button>
          )}
          {canGenerate && (
            <button className="primary-button review-generate-button" type="button" disabled={disabled} onClick={onGenerate}>
              <Factory aria-hidden="true" />{generating ? 'Generando…' : 'Generar archivos'}
            </button>
          )}
        </div>
      </header>

      {approved && (
        <div className="review-approved-summary">
          <CheckCircle2 aria-hidden="true" />
          <span><strong>Pedido aprobado</strong>{review.reviewedBy ? `Revisado por ${review.reviewedBy}${review.reviewedAt ? ` · ${formatDateTime(review.reviewedAt)}` : ''}. Ya puedes generar el PDF y los Excel de reserva.` : 'Ya puedes generar el PDF y los Excel de reserva.'}</span>
        </div>
      )}

      {produced && review.production && (
        <div className="review-production-block" role="status">
          <div className="review-production-summary">
            <Factory aria-hidden="true" />
            <span>
              <strong>Archivos generados{review.order.technician || review.production.createdBy ? ` por ${review.order.technician || review.production.createdBy}, autor del pedido` : ''}</strong>
              <small>{formatDateTime(review.production.createdAt)} · abre el PDF o descarga cada reserva directamente.</small>
            </span>
          </div>
          <div className="review-generated-files">
            {review.production.files.map((file, index) => (
              <GeneratedFileLink key={`${file.type}-${file.of || ''}-${file.filename}`} review={review} file={file} index={index} />
            ))}
          </div>
        </div>
      )}

      {produced && <ReviewPlanteamientoPreview review={review} parameters={reviewParameters} />}

      <fieldset className="review-readonly-order" disabled aria-label="Formulario del pedido en solo lectura">
        <OrderView
          availableModelNames={availableModels}
          orderCode={review.order.orderCode}
          customer={review.order.customer}
          orderDate={review.order.orderDate}
          technician={review.order.technician}
          reviewer={review.order.reviewer}
          fabric={review.order.fabric}
          sameFabric={review.order.sameFabric}
          notes={review.order.notes}
          remate={review.order.remate}
          remateColor={review.order.remateColor}
          awnings={review.order.awnings}
          calculation={null}
          calculationState="idle"
          parameters={reviewParameters}
          setOrderCode={noop}
          setCustomer={noop}
          setOrderDate={noop}
          setTechnician={noop}
          setReviewer={noop}
          setFabric={noop}
          setSameFabric={noop}
          setNotes={noop}
          setRemate={noop}
          setRemateColor={noop}
          addAwning={noop}
          duplicateAwning={noop}
          removeAwning={noop}
          updateAwning={noop}
          onAutofill={noop}
          autofillLoading={false}
          autofill={null}
          readOnly
        />
      </fieldset>

      {!produced && <ReviewPlanteamientoPreview review={review} parameters={reviewParameters} />}
    </section>
  );
}

function GeneratedFileLink({ review, file, index }: {
  review: ReviewPackage;
  file: NonNullable<ReviewPackage['production']>['files'][number];
  index: number;
}) {
  const isPdf = file.type === 'pdf';
  const href = `/api/reviews/${encodeURIComponent(review.orderCode)}/generated-files/${index}`;
  return (
    <a
      className={`review-generated-file ${isPdf ? 'is-pdf' : 'is-rps'}`}
      href={href}
      target={isPdf ? '_blank' : undefined}
      rel={isPdf ? 'noreferrer' : undefined}
      download={isPdf ? undefined : file.filename}
      title={file.savedPath}
    >
      <span className="review-generated-file-icon">{isPdf ? <FileText aria-hidden="true" /> : <FileSpreadsheet aria-hidden="true" />}</span>
      <span><strong>{file.filename}</strong><small>{isPdf ? 'Planteamiento PDF' : `Reserva de material${file.of ? ` · OF ${file.of}` : ''}`}</small></span>
      {isPdf ? <ExternalLink aria-hidden="true" /> : <Download aria-hidden="true" />}
    </a>
  );
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const labels: Record<ReviewStatus, string> = {
    PENDING_REVIEW: 'Pendiente',
    CHANGES_REQUESTED: 'Con cambios',
    APPROVED: 'Aprobado',
    PRODUCED: 'Archivos generados'
  };
  return <span className={`review-status status-${status.toLowerCase()}`}>{labels[status]}</span>;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short', timeStyle: 'short'
  }).format(date);
}
