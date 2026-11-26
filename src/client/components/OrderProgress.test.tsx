import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OrderProgress } from './OrderProgress';

describe('resumen de elementos del pedido', () => {
  it('distingue completos de pendientes sin afirmar que el pedido pueda guardarse', () => {
    const html = renderToStaticMarkup(<OrderProgress total={4} ready={1} />);
    expect(html).toContain('1 de 4 listo');
    // Sin repetir lo pendiente: «1 de 4» ya lo dice (Iván, 26/11/2026).
    expect(html).not.toContain('por completar');
    expect(html).not.toContain('Listo para revisión');
  });
  it('un elemento válido con aviso cuenta como listo y el aviso se menciona', () => {
    const html = renderToStaticMarkup(<OrderProgress total={1} ready={1} avisos={1} />);
    expect(html).toContain('1 de 1 listo');
    expect(html).toContain('is-ok');
    expect(html).toContain('1 con aviso');
    expect(html).not.toContain('por completar');
  });
  it('el vacío y el pedido completo usan el mismo resumen en ambas pantallas', () => {
    expect(renderToStaticMarkup(<OrderProgress total={0} ready={0} />)).toContain('Sin elementos');
    expect(renderToStaticMarkup(<OrderProgress total={2} ready={2} />)).toContain('is-ok');
  });
});
