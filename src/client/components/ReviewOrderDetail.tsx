import React, { useMemo, useRef } from 'react';
import { CheckCircle2, CopyPlus, Download, ExternalLink, Factory, FileSearch, FileSpreadsheet, FileText, PanelLeftClose, PanelLeftOpen, PencilLine, Undo2 } from 'lucide-react';
import type { ReviewPackage, ReviewStatus, RuleParameters } from '../types';
import { OrderView } from '../views/OrderView';
import { ReviewPlanteamientoPreview } from './ReviewPlanteamientoPreview';
import { ReviewChecklist } from './ReviewChecklist';
import { controlLabel } from './controlLabels';

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
  listCollapsed,
  onToggleList,
  onEdit,
  onReuse,
  onApprove,
  onReturn,
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
  listCollapsed: boolean;
  onToggleList: () => void;
  onEdit: () => void;
  onReuse: () => void;
  onApprove: () => void;
  onReturn: () => void;
  onGenerate: () => void;
}) {
  const formPane = useRef<HTMLDivElement>(null);
  const availableModels = useMemo(
    () => Array.from(new Set(review?.order.awnings.map((awning) => awning.model).filter(Boolean) || [])),
    [review]
  );

  const listToggle = (
    <button className="icon-button review-list-toggle" type="button" onClick={onToggleList} aria-label={listCollapsed ? 'Mostrar la lista de pedidos' : 'Ocultar la lista de pedidos'} aria-pressed={!listCollapsed}>
      {listCollapsed ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
    </button>
  );

  if (loading) {
    // El botón de la lista va también aquí: con la lista plegada no habría forma de abrirla.
    return <section className="review-reader panel">{listToggle}<div className="review-empty"><FileSearch aria-hidden="true" />Cargando el pedido y su vista previa…</div></section>;
  }

  if (!review) {
    return <section className="review-reader panel">{listToggle}<div className="review-empty"><FileSearch aria-hidden="true" />Selecciona un pedido para revisarlo.</div></section>;
  }

  const reviewParameters = review.order.parameters || parameters;
  const approved = review.status === 'APPROVED';
  const produced = review.status === 'PRODUCED' && Boolean(review.production);
  const returned = review.status === 'CHANGES_REQUESTED';

  // El formulario va en su propio panel con desplazamiento: se lleva la tarjeta del
  // toldo elegido en "Qué revisar" a la vista y se resalta un momento.
  function focusAwning(letter: string) {
    const card = formPane.current?.querySelector<HTMLElement>(`[data-awning-letter="${letter}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    card.classList.add('is-flash');
    window.setTimeout(() => card.classList.remove('is-flash'), 1400);
  }

  return (
    <section className="review-reader review-reader-form panel" aria-label={`Datos de revisión de ${review.orderCode}`}>
      <header className="review-reader-header">
        <div className="review-reader-title">
          {listToggle}
          <div>
            <h2>{review.orderCode}</h2>
            <small>{[
              review.summary.customer || 'Sin cliente',
              review.order.technician && `técnico ${controlLabel(review.order.technician)}`,
              review.order.reviewer && `revisión ${controlLabel(review.order.reviewer)}`,
              review.order.orderDate && new Date(review.order.orderDate).toLocaleDateString('es-ES')
            ].filter(Boolean).join(' · ')}</small>
          </div>
        </div>
        <ReviewSteps status={review.status} />
        <div className="review-reader-actions">
          {canEdit && <button className="ghost-button" type="button" disabled={disabled} onClick={onEdit}><PencilLine aria-hidden="true" />Corregir en Pedido</button>}
          {canApprove && <button className="ghost-button" type="button" disabled={disabled} onClick={onReturn}><Undo2 aria-hidden="true" />Devolver al técnico</button>}
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

      {returned && (
        <div className="review-state-note is-returned" role="status">
          <Undo2 aria-hidden="true" />
          <span>
            <strong>Devuelto al técnico{review.reviewedBy ? ` por ${controlLabel(review.reviewedBy)}` : ''}{review.reviewedAt ? ` · ${formatDateTime(review.reviewedAt)}` : ''}</strong>
            {review.reviewNote || 'Sin nota.'}
          </span>
        </div>
      )}

      {canApprove && !returned && (
        <p className="review-state-hint">Aprobar no genera ningún archivo: solo lo marca como revisado. Los archivos se generan en el paso siguiente.</p>
      )}

      {approved && (
        <div className="review-state-note is-approved" role="status">
          <CheckCircle2 aria-hidden="true" />
          <span>
            <strong>Aprobado{review.reviewedBy ? ` por ${controlLabel(review.reviewedBy)}` : ''}{review.reviewedAt ? ` · ${formatDateTime(review.reviewedAt)}` : ''}. Aún no se ha generado nada.</strong>
            {review.reviewNote ? `${review.reviewNote} · ` : ''}«Generar archivos» guarda el PDF definitivo y un Excel de reserva por OF, y antes te enseña la lista.
          </span>
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

      <ReviewChecklist review={review} parameters={reviewParameters} onFocusAwning={focusAwning} />

      {/* Formulario y PDF a la vez (Iván, 23/09/2026): cada panel se desplaza por su cuenta. */}
      <div className="review-panes">
        <div ref={formPane} className="review-form-pane">
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
        </div>
        <div className="review-pdf-pane">
          <ReviewPlanteamientoPreview review={review} parameters={reviewParameters} />
        </div>
      </div>
    </section>
  );
}

// Los tres pasos, siempre a la vista: el miedo era que aprobar ya generase archivos.
function ReviewSteps({ status }: { status: ReviewStatus }) {
  const current = status === 'PRODUCED' ? 2 : status === 'APPROVED' ? 1 : 0;
  const steps = [
    { title: status === 'CHANGES_REQUESTED' ? 'Devuelto' : 'Por revisar', detail: 'Se comprueban los datos' },
    { title: 'Aprobado', detail: 'No genera nada' },
    { title: 'Archivos generados', detail: 'PDF y reserva en carpetas' }
  ];
  return (
    <ol className="review-steps" aria-label="Estado del pedido">
      {steps.map((step, index) => (
        <li key={step.title} className={index < current ? 'is-done' : index === current ? 'is-current' : ''} aria-current={index === current ? 'step' : undefined}>
          <span className="review-step-dot">{index < current ? '✓' : index + 1}</span>
          <span><strong>{step.title}</strong><small>{step.detail}</small></span>
        </li>
      ))}
    </ol>
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
