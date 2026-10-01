import React from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';

export type PdfZoom = 'height' | 'fit' | number;

export function PdfPreviewToolbar({ heading, actions, zoom, pageNumber, pageCount, onZoom, onZoomStep, onPage }: {
  heading?: React.ReactNode;
  actions?: React.ReactNode;
  zoom: PdfZoom;
  pageNumber: number;
  pageCount: number;
  onZoom: (zoom: PdfZoom) => void;
  onZoomStep: (direction: number) => void;
  onPage: (page: number) => void;
}) {
  return <div className="pdf-carousel-toolbar">
    {heading && <div className="pdf-carousel-heading">{heading}</div>}
    <div className="pdf-carousel-zoom" role="group" aria-label="Zoom del PDF">
      <button type="button" className="tecla-3d" onClick={() => onZoom('height')} aria-pressed={zoom === 'height'}>Página entera</button>
      <button type="button" className="tecla-3d" onClick={() => onZoom('fit')} aria-pressed={zoom === 'fit'}>Ajustar al ancho</button>
      <button type="button" onClick={() => onZoomStep(-1)} aria-label="Reducir zoom"><Minus aria-hidden="true" /></button>
      <button type="button" onClick={() => onZoomStep(1)} aria-label="Ampliar zoom"><Plus aria-hidden="true" /></button>
      <span className="pdf-carousel-zoom-value">{zoom === 'height' ? 'Entera' : zoom === 'fit' ? 'Ancho' : `${zoom} %`}</span>
    </div>
    {pageCount > 1 && <div className="pdf-carousel-pagination">
      <div className="pdf-carousel-footer">
        <button type="button" onClick={() => onPage(pageNumber - 1)} disabled={pageNumber <= 1} aria-label="Página anterior"><ChevronLeft aria-hidden="true" /></button>
        <strong>Página {pageNumber} de {pageCount}</strong>
        <button type="button" onClick={() => onPage(pageNumber + 1)} disabled={pageNumber >= pageCount} aria-label="Página siguiente"><ChevronRight aria-hidden="true" /></button>
      </div>
      <nav className="pdf-carousel-pages" aria-label="Ir a página del PDF">
        {Array.from({ length: pageCount }, (_, index) => <button key={index} type="button" aria-current={pageNumber === index + 1 ? 'page' : undefined} aria-label={`Página ${index + 1}`} onClick={() => onPage(index + 1)}>{index + 1}</button>)}
      </nav>
    </div>}
    {actions && <div className="pdf-carousel-actions">{actions}</div>}
  </div>;
}
