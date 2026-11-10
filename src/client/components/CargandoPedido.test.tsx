import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CargandoPedido } from './CargandoPedido';

// Iván, 10/11/2026: al abrir un pedido desde CoordinaOT parecía que la web se quedaba trabada.
describe('CargandoPedido', () => {
  it('avisa de qué pedido se está cargando mientras llega', () => {
    const html = renderToStaticMarkup(<CargandoPedido numero="AR2605470" />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('Cargando el pedido AR2605470 de CoordinaOT…');
    expect(html).toContain('is-spinning');
  });

  it('no enseña nada cuando no se está cargando ningún pedido', () => {
    expect(renderToStaticMarkup(<CargandoPedido numero={null} />)).toBe('');
  });
});
