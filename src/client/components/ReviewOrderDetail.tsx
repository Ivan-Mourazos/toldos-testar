import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CopyPlus, Download, Eye, ExternalLink, Factory, FileSearch, FileSpreadsheet, FileText, PencilLine } from 'lucide-react';
import type { Calculation, ReviewPackage, RuleParameters } from '../types';
import { OrderView } from '../views/OrderView';
import { ReviewPlanteamientoPreview } from './ReviewPlanteamientoPreview';
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const previewButtonRef = useRef<HTMLButtonElement>(null);
  const availableModels = useMemo(
    () => Array.from(new Set(review?.order.awnings.map((awning) => awning.model).filter(Boolean) || [])),
    [review]
  );
  // Cada toldo necesita un id propio para repartir los avisos: en pedidos con el id
  // vacío o repetido, cada fila de «Qué revisar» se llevaba los avisos de todos.
  const order = useMemo(() => review ? withUniqueAwningIds(review.order) : null, [review]);
  const reviewParameters = review?.order.parameters || parameters;
  // Un solo cálculo para «Qué revisar» y para el estado de cada toldo en el índice de
  // los bloques: si no, el índice daba ✓ a un toldo con errores de cálculo.
  const [diagnostics, setDiagnostics] = useState<Calculation['diagnostics'] | null>(null);

  useEffect(() => {
    if (!order) return undefined;
    const controller = new AbortController();
    fetch('/api/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...order, parameters: reviewParameters }),
      signal: controller.signal
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setDiagnostics(data?.diagnostics || []))
      .catch(() => { /* cancelado o sin conexión: el resumen sale sin avisos */ });
    return () => controller.abort();
  }, [order, reviewParameters]);

  const backButton = <button type="button" className="ghost-button boton-3d reviews-back-button" onClick={onBack}>← Pedidos</button>;

  if (loading) {
    return <section className="review-reader panel panel-3d">{backButton}<div className="review-empty"><FileSearch aria-hidden="true" />Cargando el pedido y su vista previa…</div></section>;
  }

  if (!review || !order) {
    return <section className="review-reader panel panel-3d">{backButton}<div className="review-empty"><FileSearch aria-hidden="true" />Selecciona un pedido para revisarlo.</div></section>;
  }

  // Un pedido generado ya no se corrige ni se genera desde aquí: sus archivos ya salieron.
  // Para hacer otro parecido está «Reutilizar datos» en el bloque de archivos.
  const isProduced = review.status === 'PRODUCED';
  const produced = isProduced && Boolean(review.production);
  const canGenerate = canGenerateReview(review.status, review.order.technician, currentUser);
  // Sin autor (pedidos históricos), puede generar cualquiera: no hay a quién señalar.
  const generateNote = !canGenerate && !isProduced && review.order.technician
    ? `Lo genera el autor (${controlLabel(review.order.technician)})`
    : '';

  return (
    <section className="review-reader panel panel-3d" aria-label={`Datos de revisión de ${review.orderCode}`}>
      <header className="review-reader-header">
        {backButton}
        <div className="review-reader-title">
          <h2>{review.orderCode}</h2>
          <small>{[
            review.summary.customer || 'Sin cliente',
            review.order.orderDate && `pedido del ${review.order.orderDate.split('-').reverse().join('/')}`,
            review.order.technician && `autor ${controlLabel(review.order.technician)}`,
            review.updatedAt && `guardado ${formatDateTime(review.updatedAt)}`
          ].filter(Boolean).join(' · ')}</small>
        </div>
        <div className="review-reader-actions">
          <button ref={previewButtonRef} className="ghost-button boton-3d" type="button" disabled={disabled} onClick={() => setPreviewOpen(true)}>
            <Eye aria-hidden="true" />Vista previa
          </button>
          {!isProduced && (
            <>
              <button className="ghost-button boton-3d" type="button" disabled={disabled} onClick={onEdit}>
                <PencilLine aria-hidden="true" />Corregir
              </button>
              <button
                className="primary-button boton-3d review-generate-button"
                type="button"
                disabled={disabled || !canGenerate}
                title={generateNote || undefined}
                onClick={onGenerate}
              >
                <Factory aria-hidden="true" />{generating ? 'Generando…' : 'Generar archivos'}
              </button>
              {generateNote && <span className="review-generate-note">{generateNote}</span>}
            </>
          )}
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
            <button className="ghost-button boton-3d review-reuse-button" type="button" disabled={disabled} onClick={onReuse}>
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


      {/* Sin fieldset desactivado: dejaría sin usar el índice y las flechas de los bloques.
          Cada tarjeta y la cabecera se desactivan por su cuenta en modo lectura. */}
      <div className="review-readonly-order" role="group" aria-label="Formulario del pedido en solo lectura">
        <OrderView
          availableModelNames={availableModels}
          orderCode={review.order.orderCode}
          customer={review.order.customer}
          orderDate={review.order.orderDate}
          fabric={review.order.fabric}
          sameFabric={review.order.sameFabric}
          notes={review.order.notes}
          remate={review.order.remate}
          remateColor={review.order.remateColor}
          awnings={order.awnings}
          calculation={null}
          diagnostics={diagnostics}
          calculationState="idle"
          parameters={reviewParameters}
          setOrderCode={noop}
          setCustomer={noop}
          setOrderDate={noop}
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
      </div>

      {previewOpen && (
        <ReviewPlanteamientoPreview
          review={review}
          parameters={reviewParameters}
          onClose={() => { setPreviewOpen(false); previewButtonRef.current?.focus(); }}
        />
      )}
    </section>
  );
}

function withUniqueAwningIds(order: ReviewPackage['order']): ReviewPackage['order'] {
  const seen = new Set<string>();
  const awnings = order.awnings.map((awning, index) => {
    const id = awning.id && !seen.has(awning.id) ? awning.id : `toldo-${index + 1}`;
    seen.add(id);
    return id === awning.id ? awning : { ...awning, id };
  });
  return awnings.every((awning, index) => awning === order.awnings[index]) ? order : { ...order, awnings };
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

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short', timeStyle: 'short'
  }).format(date);
}
