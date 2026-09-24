import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CopyPlus, Download, Eye, ExternalLink, Factory, FileSearch, FileSpreadsheet, FileText, PencilLine, X } from 'lucide-react';
import type { ReviewPackage, ReviewStatus, RuleParameters } from '../types';
import { OrderView } from '../views/OrderView';
import { ReviewPlanteamientoPreview } from './ReviewPlanteamientoPreview';
import { ReviewChecklist } from './ReviewChecklist';
import { controlLabel } from './controlLabels';
import { canGenerateReview } from '../generatePermission';

const noop = () => undefined;

// Pedido abierto (rediseño 24/09/2026): ya no se aprueba ni se devuelve desde aquí (lo
// hace CoordinaOT). Un solo desplazamiento, el formulario manda, y las únicas acciones
// son ver el PDF, corregir el pedido y generar los archivos (solo puede el autor).
export function ReviewOrderDetail({
  review,
  parameters,
  loading,
  currentUser,
  disabled,
  generating,
  onBack,
  onEdit,
  onReuse,
  onGenerate
}: {
  review: ReviewPackage | null;
  parameters: RuleParameters;
  loading: boolean;
  currentUser: string;
  disabled: boolean;
  generating: boolean;
  onBack: () => void;
  onEdit: () => void;
  onReuse: () => void;
  onGenerate: () => void;
}) {
  const formRef = useRef<HTMLFieldSetElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const availableModels = useMemo(
    () => Array.from(new Set(review?.order.awnings.map((awning) => awning.model).filter(Boolean) || [])),
    [review]
  );

  const backButton = <button type="button" className="ghost-button reviews-back-button" onClick={onBack}>← Pedidos</button>;

  if (loading) {
    return <section className="review-reader panel">{backButton}<div className="review-empty"><FileSearch aria-hidden="true" />Cargando el pedido y su vista previa…</div></section>;
  }

  if (!review) {
    return <section className="review-reader panel">{backButton}<div className="review-empty"><FileSearch aria-hidden="true" />Selecciona un pedido para revisarlo.</div></section>;
  }

  const reviewParameters = review.order.parameters || parameters;
  const produced = review.status === 'PRODUCED' && Boolean(review.production);
  const canGenerate = canGenerateReview(review.status, review.order.technician, currentUser);
  // Sin autor (pedidos históricos), puede generar cualquiera: no hay a quién señalar.
  const generateNote = !canGenerate && review.status !== 'PRODUCED' && review.order.technician
    ? `Lo genera el autor (${controlLabel(review.order.technician)})`
    : '';

  // El formulario va en su propio panel con desplazamiento: se lleva la tarjeta del
  // toldo elegido en "Qué revisar" a la vista y se resalta un momento.
  function focusAwning(letter: string) {
    const card = formRef.current?.querySelector<HTMLElement>(`[data-awning-letter="${letter}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    card.classList.add('is-flash');
    window.setTimeout(() => card.classList.remove('is-flash'), 1400);
  }

  return (
    <section className="review-reader panel" aria-label={`Datos de revisión de ${review.orderCode}`}>
      <header className="review-reader-header">
        {backButton}
        <div className="review-reader-title">
          <h2>{review.orderCode}</h2>
          <small>{[
            review.summary.customer || 'Sin cliente',
            review.order.technician && `autor ${controlLabel(review.order.technician)}`,
            review.updatedAt && `guardado ${formatDateTime(review.updatedAt)}`
          ].filter(Boolean).join(' · ')}</small>
        </div>
        <div className="review-reader-actions">
          <button className="ghost-button" type="button" disabled={disabled} onClick={() => setPreviewOpen(true)}>
            <Eye aria-hidden="true" />Vista previa
          </button>
          <button className="ghost-button" type="button" disabled={disabled} onClick={onEdit}>
            <PencilLine aria-hidden="true" />Corregir
          </button>
          <button
            className="primary-button review-generate-button"
            type="button"
            disabled={disabled || !canGenerate}
            title={generateNote || undefined}
            onClick={onGenerate}
          >
            <Factory aria-hidden="true" />{generating ? 'Generando…' : 'Generar archivos'}
          </button>
          {generateNote && <span className="review-generate-note">{generateNote}</span>}
        </div>
      </header>

      {produced && review.production && (
        <div className="review-production-block" role="status">
          <div className="review-production-summary">
            <Factory aria-hidden="true" />
            <span>
              <strong>Archivos generados{review.order.technician || review.production.createdBy ? ` por ${review.order.technician || review.production.createdBy}, autor del pedido` : ''}</strong>
              <small>{formatDateTime(review.production.createdAt)} · abre el PDF o descarga cada reserva directamente.</small>
            </span>
            <button className="ghost-button review-reuse-button" type="button" disabled={disabled} onClick={onReuse}>
              <CopyPlus aria-hidden="true" />Reutilizar datos
            </button>
          </div>
          <div className="review-generated-files">
            {review.production.files.map((file, index) => (
              <GeneratedFileLink key={`${file.type}-${file.of || ''}-${file.filename}`} review={review} file={file} index={index} />
            ))}
          </div>
        </div>
      )}

      <ReviewChecklist review={review} parameters={reviewParameters} onFocusAwning={focusAwning} />

      <fieldset ref={formRef} className="review-readonly-order" disabled aria-label="Formulario del pedido en solo lectura">
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

      {previewOpen && (
        <ReviewPreviewDialog review={review} parameters={reviewParameters} onClose={() => setPreviewOpen(false)} />
      )}
    </section>
  );
}

function ReviewPreviewDialog({ review, parameters, onClose }: {
  review: ReviewPackage;
  parameters: RuleParameters;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  return (
    <div className="model-picker-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="model-picker review-preview-dialog" role="dialog" aria-modal="true" aria-label={`Vista previa de ${review.orderCode}`}>
        <header className="model-picker-header">
          <div className="model-picker-icon"><Eye aria-hidden="true" /></div>
          <div>
            <span>Pedido {review.orderCode}</span>
            <h2>Vista previa</h2>
          </div>
          <button ref={closeRef} className="icon-button" type="button" onClick={onClose} aria-label="Cerrar vista previa"><X aria-hidden="true" /></button>
        </header>
        <ReviewPlanteamientoPreview review={review} parameters={parameters} />
      </section>
    </div>
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
    CHANGES_REQUESTED: 'Devuelto',
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
