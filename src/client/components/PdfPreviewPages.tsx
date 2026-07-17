import React, { useEffect, useRef, useState } from 'react';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export function PdfPreviewPages({ url }: { url: string }) {
  const pagesRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    let destroyLoadingTask: (() => void) | null = null;
    const pageImageUrls: string[] = [];
    const container = pagesRef.current;

    container?.replaceChildren();

    async function renderPages() {
      try {
        const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist');
        if (cancelled) return;
        GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        const loadingTask = getDocument({ url });
        destroyLoadingTask = () => { void loadingTask.destroy(); };
        const pdf = await loadingTask.promise;
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled || !container) return;
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.4 });
          const outputScale = Math.min(window.devicePixelRatio || 1, 2);
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) throw new Error('Canvas no disponible.');

          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;

          const pageFrame = document.createElement('section');
          pageFrame.className = 'pdf-preview-page';
          pageFrame.setAttribute('aria-label', `Página ${pageNumber} de ${pdf.numPages}`);
          pageFrame.append(canvas);
          container.append(pageFrame);

          await page.render({
            canvas,
            canvasContext: context,
            viewport,
            transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0]
          }).promise;
          const pageImage = new Image();
          const imageBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error('No se pudo preparar la página PDF.'));
            }, 'image/png');
          });
          const imageUrl = URL.createObjectURL(imageBlob);
          pageImageUrls.push(imageUrl);
          pageImage.alt = `Página ${pageNumber} de ${pdf.numPages}`;
          pageImage.style.width = `${viewport.width}px`;
          pageImage.style.height = `${viewport.height}px`;
          pageImage.src = imageUrl;
          await pageImage.decode();
          if (cancelled) return;
          pageFrame.replaceChildren(pageImage);
        }
        if (!cancelled) setStatus('ready');
      } catch (error) {
        console.error('No se pudo renderizar la vista previa PDF:', error);
        if (!cancelled) setStatus('error');
      }
    }

    void renderPages();
    return () => {
      cancelled = true;
      destroyLoadingTask?.();
      pageImageUrls.forEach((imageUrl) => URL.revokeObjectURL(imageUrl));
    };
  }, [url]);

  return (
    <div className="pdf-preview-scroll">
      {status === 'loading' && <div className="pdf-preview-state">Generando vista previa…</div>}
      {status === 'error' && <div className="pdf-preview-state is-error">No se pudo mostrar la vista previa.</div>}
      <div ref={pagesRef} className="pdf-preview-pages" aria-live="polite" />
    </div>
  );
}
