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

export function PdfPreviewCarousel({ url, ariaLabel = 'Vista previa del PDF' }: {
  url: string;
  ariaLabel?: string;
}) {
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const [documentKey, setDocumentKey] = useState('');
  const [documentStatus, setDocumentStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pagePreview, setPagePreview] = useState<PagePreview>({
    documentKey: '', pageNumber: 1, status: 'loading', imageUrl: ''
  });

  useEffect(() => {
    let active = true;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    pdfRef.current = null;

    async function loadDocument() {
      try {
        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
        if (!active) return;
        GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        loadingTask = getDocument({ url });
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
      pdfRef.current = null;
      void loadingTask?.destroy();
    };
  }, [url]);

  useEffect(() => {
    if (documentStatus !== 'ready' || documentKey !== url || !pdfRef.current) return;
    let active = true;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;
    let imageUrl = '';

    async function renderPage() {
      try {
        const page = await pdfRef.current!.getPage(pageNumber);
        if (!active) return;
        const viewport = page.getViewport({ scale: 1.55 });
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas no disponible.');
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0]
        });
        await renderTask.promise;
        if (!active) return;
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((value) => value ? resolve(value) : reject(new Error('No se pudo preparar la página.')), 'image/png');
        });
        if (!active) return;
        imageUrl = URL.createObjectURL(blob);
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
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [documentKey, documentStatus, pageNumber, url]);

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
      <div className="pdf-carousel-stage" aria-live="polite">
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
