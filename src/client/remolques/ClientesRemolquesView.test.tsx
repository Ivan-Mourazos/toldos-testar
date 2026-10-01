import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from '../../remolques/calc/params';
import { PARAMS_GENERALES } from '../../remolques/clientes/params-efectivos';
import { entradasDeCliente, fichasSemilla } from '../../remolques/clientes/semilla';
import { ClientesRemolquesView } from './ClientesRemolquesView';

const fichas = fichasSemilla(entradasDeCliente(DEFAULT_PARAMS));
const recogidas = PARAMS_GENERALES.recogidas.map((r) => r.nombre);

describe('Parámetros › Remolques › Clientes', () => {
  it('lista las fichas y abre la primera con su recogida propia y sus extras', () => {
    const html = renderToStaticMarkup(<ClientesRemolquesView fichas={fichas} recogidasGenerales={recogidas} onUpdate={() => {}} />);
    for (const nombre of ['HIJOS DE PEDRO LOPEZ', 'AYALA', 'GENERAL WOLDER']) expect(html).toContain(nombre);
    expect(html).toContain('036662 · 048286');
    expect(html).toContain('aria-label="Ficha de HIJOS DE PEDRO LOPEZ"');
    expect(html).toContain('value="PUENTES HIJOS DE PEDRO LOPEZ"');
    expect(html).toContain('Paño trasero con el ancho de delante');
    expect(html).toContain('ABIERTO EN LA PARTE TRASERA (REFORZAR)');
    expect(html).toContain('Añadir ficha');
    expect(html).toContain('Añadir medida');
    expect(html).not.toContain('<select');
  });

  it('sin fichas lo dice', () => {
    const html = renderToStaticMarkup(<ClientesRemolquesView fichas={[]} recogidasGenerales={recogidas} onUpdate={() => {}} />);
    expect(html).toContain('Todavía no hay fichas');
  });

  it('bloquea la edición mientras lee o guarda', () => {
    const html = renderToStaticMarkup(<ClientesRemolquesView fichas={fichas} recogidasGenerales={recogidas} disabled onUpdate={() => {}} />);
    expect(html).toContain('<fieldset class="remolques-parameters clientes-remolques-hoja" disabled="">');
  });
});
