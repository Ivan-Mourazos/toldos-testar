import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SelectorProducto } from './SelectorProducto';

// Puertas en pausa en el servidor (Iván, 22/10/2026: «aún le faltan bastante»): sin pestaña.
describe('selector de producto', () => {
  it('enseña Puertas salvo que estén en pausa', () => {
    const pintar = (puertas?: boolean) => renderToStaticMarkup(<SelectorProducto producto="toldos" onChange={() => undefined} puertas={puertas} />);
    expect(pintar()).toContain('aria-label="Puertas"');
    expect(pintar(false)).not.toContain('aria-label="Puertas"');
    expect(pintar(false)).toContain('aria-label="Remolques"');
  });
  it('muestra System Dock como producto con su propio pedido a medias', () => {
    const html = renderToStaticMarkup(<SelectorProducto inicio producto="systemdock" onChange={() => undefined} pedidos={{ systemdock: { numero: 'AR2604615', elementos: 2 } }} />);
    expect(html).toContain('aria-label="System Dock"');
    expect(html).toContain('Seguir con AR2604615 · 2 elementos');
    expect(renderToStaticMarkup(<SelectorProducto producto="systemdock" onChange={() => undefined} />)).toContain('aria-pressed="true"');
  });
});
