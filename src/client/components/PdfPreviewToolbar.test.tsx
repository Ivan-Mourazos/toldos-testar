import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { PdfPreviewToolbar } from './PdfPreviewToolbar';

const props = { zoom: 'height' as const, pageNumber: 1, onZoom: () => {}, onZoomStep: () => {}, onPage: () => {} };
it('una sola hoja conserva el zoom y elimina la navegación que ocupa espacio', () => {
  const html = renderToStaticMarkup(<PdfPreviewToolbar {...props} pageCount={1} heading={<strong>Hoja de taller</strong>} actions={<button>Cerrar vista previa</button>} />);
  expect(html).toContain('aria-label="Zoom del PDF"');
  expect(html).toContain('Página entera');
  expect(html).toContain('Ajustar al ancho');
  expect(html).toContain('Cerrar vista previa');
  expect(html).not.toContain('Página 1 de 1');
  expect(html).not.toContain('Ir a página del PDF');
  expect(html).not.toContain('Página anterior');
});
it('varias hojas comparten una barra de zoom y navegación con los nombres accesibles existentes', () => {
  const html = renderToStaticMarkup(<PdfPreviewToolbar {...props} pageCount={3} pageNumber={2} zoom={150} />);
  expect(html.match(/class="pdf-carousel-toolbar"/g)).toHaveLength(1);
  expect(html).toContain('Página 2 de 3');
  expect(html).toContain('150 %');
  expect(html).toContain('aria-label="Página anterior"');
  expect(html).toContain('aria-label="Página siguiente"');
  expect(html).toContain('aria-label="Ir a página del PDF"');
  expect(html).toContain('aria-current="page" aria-label="Página 2"');
});
