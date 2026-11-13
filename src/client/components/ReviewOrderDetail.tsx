import { AccionesCorteMaquina } from './CorteMaquina';
import { ProduccionPedido } from './ProduccionPedido';
import type { DestinoEntrega } from '../../entregasTipos';
import React, { useEffect, useMemo, useState } from 'react';
import { CopyPlus, Download, ExternalLink, Factory, FileSearch, FileSpreadsheet, FileText } from 'lucide-react';
import type { Calculation, CoordinaStatus, ReviewPackage, RuleParameters } from '../types';
import type { EstadoCorte } from '../corteLona';
import { OrderView } from '../views/OrderView';
import { CorteLona, toldosConCorte } from './CorteLona';
import { DocumentosPedido } from './DocumentosPedido';
import { BotonAbrirCorteRevisado, BotonesFlujoCorte, useFlujoCorteDwg } from '../flujoCorteDwg';
import { PlanteamientoPedido } from './PlanteamientoPedido';
import { controlLabel } from './controlLabels';
import { generateState, puedeCorregir } from '../generatePermission';
import { awningLetter } from '../../domain/awningCompleteness.js';
import { AccionesPedido, CabeceraPedidoGuardado } from './AccionesPedido';
import { HistorialEnvios } from './EnviosCorte';
import { pedidoEntrega } from '../../entregas.js';
import type { AskForConfirmation, Notify } from './NotificationCenter';

const noop = () => undefined;

// Pedido abierto (rediseño 24/09/2026): ya no se aprueba ni se devuelve desde aquí (lo
// hace CoordinaOT). Un solo desplazamiento: ver el PDF, corregir, generar archivos y enviar
// el corte con sus botones propios, con aprobación comprobada.
export function ReviewOrderDetail({
  review,
  parameters,
  loading,
  currentUser,
  coordinaStatus,
  disabled,
  generating,
  onBack,
  onEdit,
  onReuse,
  onGenerate,
  notify = noop,
  onConfirm = async () => 'cancel',
  onGuardarCorte,
  onChanged
}: {
  review: ReviewPackage | null;
  parameters: RuleParameters;
  loading: boolean;
  currentUser: string;
  coordinaStatus: CoordinaStatus | null;
  disabled: boolean;
  generating: boolean;
  onBack: () => void;
  onEdit: () => void;
  onReuse: () => void;
  onGenerate: (destino?: DestinoEntrega) => void;
  notify?: Notify;
  onConfirm?: AskForConfirmation;
  onGuardarCorte?: (estado: EstadoCorte | null) => Promise<void> | void;
  onChanged?: () => void;
}) {
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
  // Lo que le falta al corte de lona para poder mandarlo (null: al día); lo dice el bloque del corte (CorteLona).
  const [faltaCorte, setFaltaCorte] = useState<string | null>('Comprobando el corte…');

  // Confirmar la regeneración guarda el corte directamente; no queda una versión local pendiente.
  const [generandoCorte, setGenerandoCorte] = useState(false);
  const estadoCorte = review?.corteLona ?? null;
  const autorDelCorte = Boolean(review && order && review.status !== 'PRODUCED' && onGuardarCorte && currentUser);
  const conFlujoCorte = autorDelCorte && Boolean(review && toldosConCorte(review.order).length > 0)
    && !review?.corteConfirmado;
  const flujoCorte = useFlujoCorteDwg({ base: '/api/corte-lona/borrador', codigo: review?.orderCode ?? '',
    entrada: JSON.stringify({ order: review?.order ?? null, corteLona: estadoCorte }),
    cuerpo: () => ({ order: review?.order, corteLona: estadoCorte }), aplica: conFlujoCorte, falta: faltaCorte, usuario: currentUser,
    notify, askForConfirmation: onConfirm, activo: conFlujoCorte, editable: true });

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
    return <section className="review-reader">{backButton}<div className="review-empty"><FileSearch aria-hidden="true" />Cargando el pedido y su vista previa…</div></section>;
  }

  if (!review || !order) {
    return <section className="review-reader">{backButton}<div className="review-empty"><FileSearch aria-hidden="true" />Selecciona un pedido para revisarlo.</div></section>;
  }

  // Corregir un generado prepara otra entrega; los archivos de la anterior siguen siendo históricos.
  const isProduced = review.status === 'PRODUCED';
  const produced = isProduced && Boolean(review.production);
  // CoordinaOT solo decide si todas las OF permiten generar; no importa el autor.
  const { allowed: canGenerate, note: generateNote } = generateState(review, currentUser, coordinaStatus);
  // Cualquier usuario de oficina puede corregir; CoordinaOT solo condiciona la salida.
  const corregible = puedeCorregir(review.status, (order.awnings || []).map((a, i) => ({ letter: awningLetter(i), of: String(a.of || '') })),
    order.technician || '', currentUser, coordinaStatus, true);
  const cortePermitido = generateState(Object.assign({}, pedidoEntrega(review), { status: 'PENDING_REVIEW' as const, entregas: [] }), currentUser, coordinaStatus);
  const puedeEnviar = Boolean(currentUser.trim());
  const conCorteLona = toldosConCorte(review.order).length > 0;
  const pdfIndex = review.production?.files.findIndex(file => file.type === 'pdf') ?? -1;
  const pdfGenerado = isProduced && pdfIndex >= 0;

  async function regenerarCorte() {
    setGenerandoCorte(true);
    try { await onGuardarCorte?.(estadoCorte); }
    finally { setGenerandoCorte(false); }
  }

  return (
    <section className="review-reader" aria-label={`Datos de revisión de ${review.orderCode}`}>
      <CabeceraPedidoGuardado pedido={review} volver={backButton} titulo={review.orderCode} datos={[
            review.summary.customer || 'Sin cliente',
            review.order.orderDate && `pedido del ${review.order.orderDate.split('-').reverse().join('/')}`,
            review.order.technician && `autor ${controlLabel(review.order.technician)}`,
            review.updatedAt && `guardado ${formatDateTime(review.updatedAt)}${review.updatedBy ? ` por ${controlLabel(review.updatedBy)}` : ''}`
          ].filter(Boolean).join(' · ')} corteNoRegenerado={review.corteNoRegenerado} corteSimulado={review.corteSimulado}
        acciones={<AccionesPedido generado={isProduced} ocupado={disabled || generandoCorte} enviando={generating} editandoPermitido={corregible}
          onEditar={onEdit} elementos={order.awnings.map(a => ({ of: String(a.of || '') }))} coordina={coordinaStatus} preguntar={onConfirm}
          abrir={review.corteConfirmado && !conFlujoCorte
            ? <BotonAbrirCorteRevisado ruta={`/api/reviews/${encodeURIComponent(review.orderCode)}/corte-dwg`} notify={notify} />
            : conFlujoCorte ? <BotonesFlujoCorte flujo={flujoCorte} ocupado={disabled || generandoCorte} /> : null}
          regenerar={autorDelCorte && conCorteLona ? () => void regenerarCorte() : undefined}
          codigo={review.orderCode} rutaDestinos={`/api/reviews/${encodeURIComponent(review.orderCode)}/destinos-entrega`} generar={onGenerate} generarPermitido={canGenerate} motivoGenerar={generateNote}
          produccion={<ProduccionPedido ruta={`/api/reviews/${encodeURIComponent(review.orderCode)}`} rutaPdf={`/api/reviews/${encodeURIComponent(review.orderCode)}/generate-files`}
            rutaPlano={`/api/reviews/${encodeURIComponent(review.orderCode)}/plano`} rutaCorte={conCorteLona ? `/api/reviews/${encodeURIComponent(review.orderCode)}/corte-lona` : undefined}
            tecnico={order.technician || ''} codigo={review.orderCode} generado={isProduced} permitido={puedeEnviar && (isProduced ? cortePermitido.allowed : canGenerate)} motivo={generateNote}
            ocupado={disabled || generandoCorte} usuario={currentUser} notify={notify} preguntar={onConfirm} onChanged={onChanged} onVolver={onBack}
            guardado={{ ruta: '/api/reviews', cuerpo: { order: review.order, corteLona: review.corteLona }, usuario: currentUser }}
            mas={produced ? <button type="button" role="menuitem" className="menu-mas-item" disabled={disabled} onClick={onReuse}><CopyPlus size={16} aria-hidden="true" />Reutilizar datos</button> : null} />} />} />

      {produced && review.production && (
        <div className="review-production-block bloque-3d" role="status">
          <div className="review-production-summary">
            <Factory aria-hidden="true" />
            <span>
              <strong>Archivos generados{review.production.createdBy ? ` por ${controlLabel(review.production.createdBy)}` : ''}</strong>
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

      <DocumentosPedido planteamiento={<PlanteamientoPedido
        origen={pdfGenerado ? `/api/reviews/${encodeURIComponent(review.orderCode)}/generated-files/${pdfIndex}` : '/api/planteamiento'}
        cuerpo={pdfGenerado ? undefined : JSON.stringify({ order: { ...pedidoEntrega(review).order, parameters: reviewParameters } })}
        version={review.updatedAt} />}
        corte={<CorteLona key={review.orderCode} order={pedidoEntrega(review).order} estado={estadoCorte} reviewCode={review.orderCode}
        dwgGuardado={Boolean(review.corteConfirmado && !review.corteNoRegenerado)}
        noRegenerado={review.corteNoRegenerado}
        generarArriba={autorDelCorte}
        regenerable={autorDelCorte}
        onListo={setFaltaCorte} />} />
      {conCorteLona && <AccionesCorteMaquina ruta={`/api/reviews/${encodeURIComponent(review.orderCode)}/corte-lona`} codigo={review.orderCode} onEnviado={onChanged} />}
      <HistorialEnvios envios={review.enviosCorte} />
      {review.planosCorte && <div className="corte-ayuda">{review.planosCorte.files.map(f => <p key={f.savedPath}>Plano: {f.savedPath} · {formatDateTime(f.writtenAt)}</p>)}{review.planosCorte.avisos.map((a, i) => <p key={i}>{a}</p>)}</div>}
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
  if (file.type === 'corte-lona') return <span className="review-generated-file chip-3d"><span><strong>{file.filename}</strong><small>DXF del corte · {file.savedPath}</small></span></span>;
  const isPdf = file.type === 'pdf';
  const href = `/api/reviews/${encodeURIComponent(review.orderCode)}/generated-files/${index}`;
  return (
    <a
      className={`review-generated-file chip-3d ${isPdf ? 'is-pdf' : 'is-rps'}`}
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
