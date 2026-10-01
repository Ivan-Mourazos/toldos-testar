import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FabricStockText } from './FabricStockLine';
import type { FabricStock } from '../fabricStock';

const stock: FabricStock = { code: 'ACRILI2018P120', metros: 15.5, reservado: 3, disponible: 12.5, bobinasConDisponible: 2, mayorBobinaDisponible: 10, consignacion: 30, almacenes: [] };

describe('stock bajo la tela y dentro de las opciones', () => {
  it('reutiliza los avisos y el detalle de la línea en la opción compacta', () => {
    const markup = renderToStaticMarkup(<FabricStockText state={{ status: 'ready', stock }} compact />);
    expect(markup).toContain('<span');
    expect(markup).toContain('12,5 m disponibles');
    expect(markup).toContain('+ 30 m en consignación');
    expect(markup).toContain('Stock RPS: 12,5 m disponibles en 2 bobinas (la mayor, 10 m)');
  });

  it('distingue sin stock, consultando y fallo', () => {
    expect(renderToStaticMarkup(<FabricStockText state={{ status: 'ready', stock: { ...stock, disponible: 0 } }} compact />)).toContain('Sin stock en RPS');
    expect(renderToStaticMarkup(<FabricStockText state={{ status: 'error' }} compact />)).toContain('Stock no disponible ahora');
    expect(renderToStaticMarkup(<FabricStockText state={{ status: 'loading' }} compact />)).toContain('Consultando stock en RPS…');
    expect(renderToStaticMarkup(<FabricStockText state={{ status: 'idle' }} />)).toBe('');
  });
});
