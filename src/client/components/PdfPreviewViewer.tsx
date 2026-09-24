import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

type PageImage = { url: string; width: number; height: number; scale: number };
type Zoom = 'height' | 'fit' | number;
const MAX_RENDER_SCALE = 4;

export function PdfPreviewViewer({ url, ariaLabel = 'Vista previa del PDF' }: {
  url: string;
  ariaLabel?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const imagesRef = useRef(new Map<number, PageImage>());
  const pageWidthsRef = useRef(new Map<number, number>());
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [documentKey, setDocumentKey] = useState('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pageCount, setPageCount] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState<Zoom>('height');
  const [images, setImages] = useState(new Map<number, PageImage>());
  const [renderError, setRenderError] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const measure = () => {
      const style = getComputedStyle(stage);
      const width = Math.max(1, stage.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight));
      const height = Math.max(1, stage.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom));
      setStageSize((current) => current.width === width && current.height === height ? current : { width, height });
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
    const cache = imagesRef.current;
    pdfRef.current = null;
    pageWidthsRef.current.clear();
    for (const image of cache.values()) URL.revokeObjectURL(image.url);
    cache.clear();

    async function loadDocument() {
      try {
        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
        if (!active) return;
        GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        // Algunos archivos históricos no admiten peticiones Range: se descarga
        // el PDF completo antes de entregarlo a PDF.js.
        const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(`No se pudo abrir el PDF (${response.status}).`);
        const data = new Uint8Array(await response.arrayBuffer());
        if (!active) return;
        loadingTask = getDocument({ data });
        const pdf = await loadingTask.promise;
        if (!active) return;
        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        setPageNumber(1);
        setZoom('height');
        setRenderError(false);
        setImages(new Map());
        setDocumentKey(url);
        setStatus('ready');
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        console.error('No se pudo abrir el PDF:', error);
        setDocumentKey(url);
        setStatus('error');
      }
    }

    void loadDocument();
    return () => {
      active = false;
      controller.abort();
      pdfRef.current = null;
      for (const image of cache.values()) URL.revokeObjectURL(image.url);
      cache.clear();
      void loadingTask?.destroy();
    };
  }, [url]);

  useEffect(() => {
    if (status !== 'ready' || documentKey !== url || !pdfRef.current || stageSize.width <= 0 || stageSize.height <= 0) return;
    let active = true;
    const tasks = new Set<{ cancel: () => void }>();
    const needed = [pageNumber, pageNumber + 1].filter((page) => page <= pageCount);
    for (const [number, image] of imagesRef.current) {
      if (!needed.includes(number)) {
        URL.revokeObjectURL(image.url);
        imagesRef.current.delete(number);
      }
    }
    queueMicrotask(() => {
      if (active) {
        setImages(new Map(imagesRef.current));
        setRenderError(false);
      }
    });

    async function renderPage(number: number) {
      let page;
      try {
        page = await pdfRef.current!.getPage(number);
        if (!active) return;
        const base = page.getViewport({ scale: 1 });
        pageWidthsRef.current.set(number, base.width);
        const scale = zoom === 'height'
          ? Math.min(stageSize.height / base.height, stageSize.width / base.width)
          : zoom === 'fit' ? stageSize.width / base.width : zoom / 100;
        const cached = imagesRef.current.get(number);
        if (cached && Math.abs(cached.scale - scale) < 0.01) return;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: Math.min(scale * pixelRatio, MAX_RENDER_SCALE) });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas no disponible.');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const task = page.render({ canvas, canvasContext: context, viewport });
        tasks.add(task);
        await task.promise;
        tasks.delete(task);
        if (!active) return;
        const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
          (value) => value ? resolve(value) : reject(new Error('No se pudo preparar la página.')), 'image/png'
        ));
        if (!active) return;
        const image = { url: URL.createObjectURL(blob), width: base.width * scale, height: base.height * scale, scale };
        if (cached) URL.revokeObjectURL(cached.url);
        imagesRef.current.set(number, image);
        setImages(new Map(imagesRef.current));
      } catch (error) {
        if (!active || (error instanceof Error && error.name === 'RenderingCancelledException')) return;
        console.error('No se pudo renderizar la página del PDF:', error);
        if (number === pageNumber) setRenderError(true);
      } finally {
        page?.cleanup();
      }
    }

    // Solo se prepara la página visible y la siguiente; la segunda queda lista
    // para que el avance sea inmediato sin renderizar el resto del documento.
    for (const number of needed) void renderPage(number);
    return () => {
      active = false;
      for (const task of tasks) task.cancel();
    };
  }, [documentKey, pageCount, pageNumber, stageSize.width, stageSize.height, status, url, zoom]);

  useEffect(() => {
    if (stageRef.current) stageRef.current.scrollTo(0, 0);
  }, [pageNumber]);

  const changePage = (number: number) => setPageNumber(Math.max(1, Math.min(pageCount, number)));
  const changeZoom = (direction: number) => {
    const baseWidth = pageWidthsRef.current.get(pageNumber);
    const image = imagesRef.current.get(pageNumber);
    const baseHeight = image && image.height / image.scale;
    const current = zoom === 'fit' ? (baseWidth ? Math.round(stageSize.width / baseWidth * 100) : 100)
      : zoom === 'height' ? (baseHeight && baseWidth ? Math.round(Math.min(stageSize.height / baseHeight, stageSize.width / baseWidth) * 100) : 100)
        : zoom;
    setZoom(Math.max(50, Math.min(300, Math.round(current / 25) * 25 + direction * 25)));
  };

  useEffect(() => {
    const stage = stageRef.current;
    const onKeyDown = (event: KeyboardEvent) => {
      const root = rootRef.current;
      if (!root || !document.activeElement) return;
      const dialog = root.closest('dialog, [role="dialog"]');
      if (!root.contains(document.activeElement) && !(dialog && dialog.contains(document.activeElement))) return;
      if (event.key === 'ArrowLeft') changePage(pageNumber - 1);
      else if (event.key === 'ArrowRight') changePage(pageNumber + 1);
      else if (event.key === '+' || event.key === '=' || event.key === 'Add') changeZoom(1);
      else if (event.key === '-' || event.key === 'Subtract') changeZoom(-1);
      else return;
      event.preventDefault();
    };
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey || event.deltaY === 0) return;
      event.preventDefault();
      changeZoom(event.deltaY < 0 ? 1 : -1);
    };
    window.addEventListener('keydown', onKeyDown);
    stage?.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      stage?.removeEventListener('wheel', onWheel);
    };
  });

  const visibleStatus = documentKey === url ? status : 'loading';
  const image = images.get(pageNumber);
  const baseWidth = image && image.width / image.scale;
  const baseHeight = image && image.height / image.scale;
  const expectedScale = zoom === 'height'
    ? (baseHeight && baseWidth ? Math.min(stageSize.height / baseHeight, stageSize.width / baseWidth) : 0)
    : zoom === 'fit' ? (baseWidth ? stageSize.width / baseWidth : 0) : zoom / 100;
  const visibleImage = image && Math.abs(image.scale - expectedScale) < 0.01 ? image : null;

  return (
    <div className="pdf-carousel" ref={rootRef} aria-label={ariaLabel} tabIndex={0}>
      <div className="pdf-carousel-toolbar" role="group" aria-label="Zoom del PDF">
        <button type="button" className="tecla-3d" onClick={() => setZoom('height')} aria-pressed={zoom === 'height'}>Página entera</button>
        <button type="button" className="tecla-3d" onClick={() => setZoom('fit')} aria-pressed={zoom === 'fit'}>Ajustar al ancho</button>
        <span className="pdf-carousel-zoom-value">{zoom === 'height' ? 'Entera' : zoom === 'fit' ? 'Ancho' : `${zoom} %`}</span>
        <button type="button" onClick={() => changeZoom(-1)} aria-label="Reducir zoom"><Minus aria-hidden="true" /></button>
        <button type="button" onClick={() => changeZoom(1)} aria-label="Ampliar zoom"><Plus aria-hidden="true" /></button>
        <span className="pdf-carousel-wheel-hint">Ctrl + rueda</span>
      </div>
      <div className="pdf-carousel-stage" ref={stageRef} aria-live="polite">
        {visibleStatus === 'loading' && <div className="pdf-carousel-state">Abriendo el PDF…</div>}
        {visibleStatus === 'error' && <div className="pdf-carousel-state is-error">No se pudo mostrar este PDF.</div>}
        {visibleStatus === 'ready' && !visibleImage && !renderError && <div className="pdf-carousel-state">Preparando página {pageNumber}…</div>}
        {visibleStatus === 'ready' && renderError && <div className="pdf-carousel-state is-error">No se pudo mostrar esta página.</div>}
        {visibleStatus === 'ready' && visibleImage && (
          <div className="pdf-carousel-canvas" style={{ width: visibleImage.width, height: visibleImage.height }}>
            <img className="pdf-carousel-page hoja-3d" src={visibleImage.url} alt={`Página ${pageNumber} de ${pageCount}`} width={visibleImage.width} height={visibleImage.height} />
          </div>
        )}
        {visibleStatus === 'ready' && pageCount > 1 && <>
          <button className="pdf-carousel-arrow is-previous" type="button" onClick={() => changePage(pageNumber - 1)} disabled={pageNumber <= 1} aria-label="Página anterior"><ChevronLeft aria-hidden="true" /></button>
          <button className="pdf-carousel-arrow is-next" type="button" onClick={() => changePage(pageNumber + 1)} disabled={pageNumber >= pageCount} aria-label="Página siguiente"><ChevronRight aria-hidden="true" /></button>
        </>}
      </div>
      {visibleStatus === 'ready' && pageCount > 0 && <>
        <footer className="pdf-carousel-footer">
          <button type="button" onClick={() => changePage(pageNumber - 1)} disabled={pageNumber <= 1} aria-label="Página anterior"><ChevronLeft aria-hidden="true" /></button>
          <strong>Página {pageNumber} de {pageCount}</strong>
          <button type="button" onClick={() => changePage(pageNumber + 1)} disabled={pageNumber >= pageCount} aria-label="Página siguiente"><ChevronRight aria-hidden="true" /></button>
        </footer>
        <nav className="pdf-carousel-pages" aria-label="Ir a página del PDF">
          {Array.from({ length: pageCount }, (_, index) => <button key={index} type="button" aria-current={pageNumber === index + 1 ? 'page' : undefined} onClick={() => changePage(index + 1)} aria-label={`Página ${index + 1}`}>{index + 1}</button>)}
        </nav>
      </>}
    </div>
  );
}
