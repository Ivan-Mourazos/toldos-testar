import React, { useEffect, useMemo, useState } from 'react';
import { Eye, RefreshCw } from 'lucide-react';
import type { ReviewPackage, RuleParameters } from '../types';
import { PdfPreviewPages } from './PdfPreviewPages';

type PreviewState = {
  source: string;
  refreshKey: number;
  status: 'loading' | 'ready' | 'error';
  url: string;
  error: string;
};

export function ReviewPlanteamientoPreview({ order, parameters }: {
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
    <section className="review-inline-preview" aria-label="Vista previa del planteamiento" aria-busy={visiblePreview.status === 'loading'}>
      <header>
        <div>
          <span className="review-preview-icon"><Eye aria-hidden="true" /></span>
          <div><strong>Vista previa del planteamiento</strong><small>Estructuras A5 y telas A4 · mismo archivo que en Pedido</small></div>
        </div>
        <button className="ghost-button" type="button" disabled={visiblePreview.status === 'loading'} onClick={() => setRefreshKey((value) => value + 1)}>
          <RefreshCw aria-hidden="true" />{visiblePreview.status === 'error' ? 'Reintentar' : 'Actualizar'}
        </button>
      </header>
      {visiblePreview.status === 'loading' && <div className="review-preview-placeholder">Preparando la vista previa…</div>}
      {visiblePreview.status === 'error' && <div className="review-preview-placeholder is-error" role="alert">{visiblePreview.error}</div>}
      {visiblePreview.status === 'ready' && visiblePreview.url && <PdfPreviewPages key={visiblePreview.url} url={visiblePreview.url} />}
    </section>
  );
}
