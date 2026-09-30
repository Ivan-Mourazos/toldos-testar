import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CapturaVista } from '../remolques/render/captura';
import { CapaCotasHoja } from './CapaCotasHoja';

const captura: CapturaVista = {
  png: 'data:image/png;base64,', ancho: 400, alto: 300,
  cotas: {
    lineas: [
      { x1: 50, y1: 280, x2: 350, y2: 280, texto: '201', tx: 200, ty: 280 },
      { x1: 150, y1: 120, x2: 250, y2: 120, texto: '50', tx: 200, ty: 120, textoDebajo: true },
    ],
    marcas: [{ x: 60, y: 200, texto: '2,5', hacia: 'arriba' }, { x: 120, y: 240, texto: '41,5', hacia: 'abajo' }],
  },
  rotulos: [{ x: 200, y: 20, texto: 'DELANTE', alinear: 'middle' }],
};

describe('cotas de las vistas de la hoja', () => {
  // Iván, 30/09/2026: los números de los ollaos (y de los ganchos) distraen en el dibujo; ya están
  // en las tablas de debajo. Las cotas de las medidas se quedan.
  it('sin los números de ollaos ni de ganchos, con las cotas y los rótulos', () => {
    const html = renderToStaticMarkup(<CapaCotasHoja captura={captura} />);
    expect(html).not.toContain('2,5');
    expect(html).not.toContain('41,5');
    expect(html).toContain('>201<');
    expect(html).toContain('>DELANTE<');
  });

  it('una cota con el número debajo lo escribe por debajo de su línea', () => {
    const html = renderToStaticMarkup(<CapaCotasHoja captura={captura} />);
    const y = (texto: string) => Number(new RegExp(`y="([\\d.]+)"[^>]*>${texto}<`).exec(html)![1]);
    expect(y('201')).toBeLessThan(280);
    expect(y('50')).toBeGreaterThan(120);
  });
});
