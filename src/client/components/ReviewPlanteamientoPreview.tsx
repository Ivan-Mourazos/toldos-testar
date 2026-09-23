import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Maximize2, RefreshCw, X } from 'lucide-react';
import type { ReviewPackage, RuleParameters } from '../types';
import { PdfPreviewViewer } from './PdfPreviewViewer';

type PreviewState = {
  source: string;
  refreshKey: number;
  status: 'loading' | 'ready' | 'error';
  url: string;
  error: string;
};

export function ReviewPlanteamientoPreview({ review, parameters }: {
  review: ReviewPackage;
  parameters: RuleParameters;
}) {
  const pdfIndex = review.production?.files.findIndex((file) => file.type === 'pdf') ?? -1;
  if (review.status === 'PRODUCED' && pdfIndex >= 0) {
    return <GeneratedReviewPreview review={review} pdfIndex={pdfIndex} />;
  }
  return <CalculatedReviewPreview order={review.order} parameters={parameters} />;
}

function GeneratedReviewPreview({ review, pdfIndex }: { review: ReviewPackage; pdfIndex: number }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(pdfIndex);
  const files = review.production!.files;
  const file = files[selectedIndex];
  const url = `/api/reviews/${encodeURIComponent(review.orderCode)}/generated-files/${selectedIndex}?v=${refreshKey}`;

  return (
    <PreviewShell
      title="Vista previa de archivos generados"
      subtitle={`${file.filename} · ${file.type === 'pdf' ? 'planteamiento definitivo' : `reserva de material${file.of ? ` de la OF ${file.of}` : ''}`}`}
      refreshing={false}
      onRefresh={() => setRefreshKey((value) => value + 1)}
    >
      <div className="generated-preview-selector" role="group" aria-label="Archivo que se muestra">
        {files.map((candidate, index) => (
          <button
            key={`${candidate.type}-${candidate.of || ''}-${candidate.filename}`}
            type="button"
            aria-pressed={index === selectedIndex}
            className={index === selectedIndex ? 'is-active' : ''}
            onClick={() => setSelectedIndex(index)}
          >
            <span>{candidate.type === 'pdf' ? 'PDF' : 'RPS'}</span>
            <strong>{candidate.type === 'pdf' ? 'Planteamiento' : `OF ${candidate.of || candidate.filename}`}</strong>
          </button>
        ))}
      </div>
      {file.type === 'pdf'
        ? <PdfPreviewViewer key={url} url={url} ariaLabel={`Vista previa de ${file.filename}`} />
        : <ReservationPreview key={url} url={url} filename={file.filename} />}
    </PreviewShell>
  );
}

function ReservationPreview({ url, filename }: { url: string; filename: string }) {
  const [state, setState] = useState<{
    status: 'loading' | 'ready' | 'error';
    rows: string[][];
    source: string;
  }>({ status: 'loading', rows: [], source: '' });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function loadReservation() {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'No se pudo abrir la reserva.');
        }
        const content = new TextDecoder('windows-1252').decode(await response.arrayBuffer());
        if (!active) return;
        const rows = content.replace(/^\uFEFF/, '').split(/\r?\n/)
          .filter((line) => line.trim())
          .map((line) => line.split('\t'));
        setState({ status: 'ready', rows, source: response.headers.get('X-Toldos-File-Source') || '' });
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        console.error('No se pudo abrir la reserva procesada:', error);
        setState({ status: 'error', rows: [], source: '' });
      }
    }
    void loadReservation();
    return () => { active = false; controller.abort(); };
  }, [url]);

  return (
    <div className="reservation-preview" aria-label={`Vista previa de ${filename}`} aria-live="polite">
      {state.status === 'loading' && <div className="reservation-preview-state">Abriendo la reserva…</div>}
      {state.status === 'error' && <div className="reservation-preview-state is-error">No se pudo mostrar esta reserva.</div>}
      {state.status === 'ready' && (
        <div className="reservation-preview-sheet">
          <header>
            <div><span>Reserva RPS</span><strong>{filename}</strong></div>
            <small>{state.source === 'processed' ? 'Recuperada de Procesados' : 'Archivo de subida'}</small>
          </header>
          <div className="reservation-preview-table-scroll">
            <table>
              <thead><tr>{(state.rows[0] || []).map((cell, index) => <th key={`${cell}-${index}`}>{cell}</th>)}</tr></thead>
              <tbody>{state.rows.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CalculatedReviewPreview({ order, parameters }: {
  order: ReviewPackage['order'];
  parameters: RuleParameters;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [preview, setPreview] = useState<PreviewState>({ source: '', refreshKey: -1, status: 'loading', url: '', error: '' });
  const requestBody = useMemo(() => JSON.stringify({
    order: order.parameters ? order : { ...order, parameters }
  }), [order, parameters]);
  const visiblePreview = preview.source === requestBody && preview.refreshKey === refreshKey
    ? preview
    : { source: requestBody, refreshKey, status: 'loading' as const, url: '', error: '' };

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    let active = true;

    async function generatePreview() {
      try {
        const response = await fetch('/api/planteamiento', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
          signal: controller.signal
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'No se pudo generar la vista previa.');
        }
        const blob = await response.blob();
        if (!active || controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setPreview({ source: requestBody, refreshKey, status: 'ready', url: objectUrl, error: '' });
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setPreview({
          source: requestBody,
          refreshKey,
          status: 'error',
          url: '',
          error: error instanceof Error ? error.message : 'No se pudo generar la vista previa.'
        });
      }
    }

    void generatePreview();
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [refreshKey, requestBody]);

  return (
    <PreviewShell
      title="Vista previa del planteamiento"
      subtitle="Una página cada vez · usa las flechas para recorrer el documento"
      refreshing={visiblePreview.status === 'loading'}
      retry={visiblePreview.status === 'error'}
      onRefresh={() => setRefreshKey((value) => value + 1)}
    >
      {visiblePreview.status === 'loading' && <div className="review-preview-placeholder">Preparando la vista previa…</div>}
      {visiblePreview.status === 'error' && <div className="review-preview-placeholder is-error" role="alert">{visiblePreview.error}</div>}
      {visiblePreview.status === 'ready' && visiblePreview.url && <PdfPreviewViewer key={visiblePreview.url} url={visiblePreview.url} />}
    </PreviewShell>
  );
}

function PreviewShell({ title, subtitle, refreshing, retry = false, onRefresh, children }: {
  title: string;
  subtitle: string;
  refreshing: boolean;
  retry?: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const expandRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!expanded) {
      dialog.open = true;
      return;
    }
    const previousOverflow = document.body.style.overflow;
    const expandButton = expandRef.current;
    dialog.open = false;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    return () => {
      dialog.close();
      dialog.open = true;
      document.body.style.overflow = previousOverflow;
      expandButton?.focus({ preventScroll: true });
    };
  }, [expanded]);

  return (
    <dialog ref={dialogRef} className="review-inline-preview" role={expanded ? 'dialog' : 'region'} aria-modal={expanded || undefined} aria-label={title} aria-busy={refreshing}
      onCancel={(event) => { event.preventDefault(); setExpanded(false); }}>
      <header>
        <div>
          <span className="review-preview-icon"><Eye aria-hidden="true" /></span>
          <div><strong>{title}</strong><small>{subtitle}</small></div>
        </div>
        <div className="review-preview-actions">
        <button className="ghost-button" type="button" disabled={refreshing} onClick={onRefresh}>
          <RefreshCw aria-hidden="true" />{retry ? 'Reintentar' : 'Actualizar'}
        </button>
        <button ref={expandRef} className="ghost-button" type="button" hidden={expanded} onClick={() => setExpanded(true)}>
          <Maximize2 aria-hidden="true" />Pantalla completa
        </button>
        <button ref={closeRef} className="ghost-button" type="button" hidden={!expanded} onClick={() => setExpanded(false)} aria-label="Cerrar pantalla completa">
          <X aria-hidden="true" />Cerrar <kbd>Esc</kbd>
        </button>
        </div>
      </header>
      {children}
    </dialog>
  );
}
