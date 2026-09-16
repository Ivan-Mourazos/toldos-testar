import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

type PagePreview = {
  documentKey: string;
  pageNumber: number;
  status: 'loading' | 'ready' | 'error';
  imageUrl: string;
};

// La página se rasteriza a la resolución que ocupa en pantalla, no a una escala
// fija: si no, al agrandar el visor el navegador estira un mapa de bits pequeño.
// El tamaño se redondea en escalones para no rehacer el dibujo en cada píxel.
const STAGE_STEP = 48;
const MAX_RENDER_SCALE = 4;

function quantize(value: number) {
  return Math.max(STAGE_STEP, Math.ceil(value / STAGE_STEP) * STAGE_STEP);
}

export function PdfPreviewCarousel({ url, ariaLabel = 'Vista previa del PDF' }: {
  url: string;
  ariaLabel?: string;
}) {
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const latestImageRef = useRef('');
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [documentKey, setDocumentKey] = useState('');
  const [documentStatus, setDocumentStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pagePreview, setPagePreview] = useState<PagePreview>({
    documentKey: '', pageNumber: 1, status: 'loading', imageUrl: ''
  });

  useEffect(() => () => {
    if (latestImageRef.current) URL.revokeObjectURL(latestImageRef.current);
    latestImageRef.current = '';
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const style = window.getComputedStyle(stage);
      const width = quantize(stage.clientWidth
        - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
      const height = quantize(stage.clientHeight
        - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom));
      setStageSize((current) => current.width === width && current.height === height
        ? current
        : { width, height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    const controller = new AbortController();
    pdfRef.current = null;

    async function loadDocument() {
      try {
        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
        if (!active) return;
        GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        // Descargamos el PDF completo antes de entregarlo a PDF.js. Los pedidos
        // históricos pueden venir de dos carpetas distintas y no todos los
        // servidores de archivos responden correctamente a peticiones Range.
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`No se pudo abrir el PDF (${response.status}).`);
        const data = new Uint8Array(await response.arrayBuffer());
        if (!active) return;
        loadingTask = getDocument({ data });
        const loadedPdf = await loadingTask.promise;
        if (!active) return;
        pdfRef.current = loadedPdf;
        setPageCount(loadedPdf.numPages);
        setPageNumber(1);
        setDocumentKey(url);
        setDocumentStatus('ready');
      } catch (error) {
        if (!active) return;
        console.error('No se pudo abrir el PDF:', error);
        setDocumentKey(url);
        setDocumentStatus('error');
      }
    }

    void loadDocument();
    return () => {
      active = false;
      controller.abort();
      pdfRef.current = null;
      void loadingTask?.destroy();
    };
  }, [url]);

  useEffect(() => {
    if (documentStatus !== 'ready' || documentKey !== url || !pdfRef.current) return;
    if (stageSize.width <= 0 || stageSize.height <= 0) return;
    let active = true;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    async function renderPage() {
      try {
        const page = await pdfRef.current!.getPage(pageNumber);
        if (!active) return;
        const base = page.getViewport({ scale: 1 });
        const fitScale = Math.min(stageSize.width / base.width, stageSize.height / base.height);
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const scale = Math.min(fitScale * pixelRatio, MAX_RENDER_SCALE);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas no disponible.');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        renderTask = page.render({ canvas, canvasContext: context, viewport });
        await renderTask.promise;
        if (!active) return;
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No se pudo preparar la página.')), 'image/png');
        });
        if (!active) return;
        const imageUrl = URL.createObjectURL(blob);
        // La imagen anterior sigue en pantalla hasta que la nueva está lista:
        // así redibujar por un cambio de tamaño no provoca un parpadeo.
        if (latestImageRef.current) URL.revokeObjectURL(latestImageRef.current);
        latestImageRef.current = imageUrl;
        setPagePreview({ documentKey, pageNumber, status: 'ready', imageUrl });
        page.cleanup();
      } catch (error) {
        if (!active || (error instanceof Error && error.name === 'RenderingCancelledException')) return;
        console.error('No se pudo renderizar la página del PDF:', error);
        setPagePreview({ documentKey, pageNumber, status: 'error', imageUrl: '' });
      }
    }

    void renderPage();
    return () => {
      active = false;
      renderTask?.cancel();
    };
  }, [documentKey, documentStatus, pageNumber, url, stageSize.width, stageSize.height]);

  const visibleDocumentStatus = documentKey === url ? documentStatus : 'loading';
  const visiblePage = pagePreview.documentKey === documentKey && pagePreview.pageNumber === pageNumber
    ? pagePreview
    : { ...pagePreview, status: 'loading' as const, imageUrl: '' };
  const previousPage = () => setPageNumber((value) => Math.max(1, value - 1));
  const nextPage = () => setPageNumber((value) => Math.min(pageCount, value + 1));

  return (
    <div
      className="pdf-carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') previousPage();
        if (event.key === 'ArrowRight') nextPage();
      }}
    >
      <div className="pdf-carousel-stage" ref={stageRef} aria-live="polite">
        {visibleDocumentStatus === 'loading' && <div className="pdf-carousel-state">Abriendo el PDF…</div>}
        {visibleDocumentStatus === 'error' && <div className="pdf-carousel-state is-error">No se pudo mostrar este PDF.</div>}
        {visibleDocumentStatus === 'ready' && visiblePage.status === 'loading' && <div className="pdf-carousel-state">Preparando página {pageNumber}…</div>}
        {visibleDocumentStatus === 'ready' && visiblePage.status === 'error' && <div className="pdf-carousel-state is-error">No se pudo mostrar esta página.</div>}
        {visibleDocumentStatus === 'ready' && visiblePage.status === 'ready' && visiblePage.imageUrl && (
          <img className="pdf-carousel-page" src={visiblePage.imageUrl} alt={`Página ${pageNumber} de ${pageCount}`} />
        )}
        {visibleDocumentStatus === 'ready' && pageCount > 1 && (
          <>
            <button className="pdf-carousel-arrow is-previous" type="button" onClick={previousPage} disabled={pageNumber <= 1} aria-label="Página anterior">
              <ChevronLeft aria-hidden="true" />
            </button>
            <button className="pdf-carousel-arrow is-next" type="button" onClick={nextPage} disabled={pageNumber >= pageCount} aria-label="Página siguiente">
              <ChevronRight aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      {visibleDocumentStatus === 'ready' && pageCount > 0 && (
        <footer className="pdf-carousel-footer">
          <button type="button" onClick={previousPage} disabled={pageNumber <= 1} aria-label="Página anterior"><ChevronLeft aria-hidden="true" /></button>
          <strong>Página {pageNumber} de {pageCount}</strong>
          <button type="button" onClick={nextPage} disabled={pageNumber >= pageCount} aria-label="Página siguiente"><ChevronRight aria-hidden="true" /></button>
        </footer>
      )}
    </div>
  );
}
