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
    // Aviso junto al nombre de la ficha y al de la recogida propia.
    expect(html.match(/Si cambias el nombre, los pedidos a medias de este cliente dejan de encontrar sus extras./g)).toHaveLength(2);
    expect(html).toContain('Añadir medida');
    expect(html).not.toContain('<select');
  });

  it('los números salen con coma decimal y teclado decimal, no como type=number', () => {
    const conDecimal = [{ ...fichas[0], sesgoDetras: 244.5, medidas: [{ tipo: 'lona' as const, largo: 610.5, ancho: 250, ollaos: { delante: [12.5], atras: [], laterales: [] } }] }];
    const html = renderToStaticMarkup(<ClientesRemolquesView fichas={conDecimal} recogidasGenerales={recogidas} onUpdate={() => {}} />);
    expect(html).toContain('value="244,5"');
    expect(html).toContain('value="610,5"');
    expect(html).toContain('inputMode="decimal"');
    expect(html).not.toContain('type="number"');
    expect(html).not.toContain('NaN');
  });

  it('la ayuda de los campos de texto es neutra, no el aviso naranja', () => {
    const html = renderToStaticMarkup(<ClientesRemolquesView fichas={[{ ...fichas[0], medidas: [{ tipo: 'lona' as const, largo: 600, ancho: 250, ollaos: { delante: [], atras: [], laterales: [] } }] }]} recogidasGenerales={recogidas} onUpdate={() => {}} />);
    expect(html).toContain('<small class="clientes-remolques-ayuda">Separados por comas</small>');
    expect(html).toContain('<small class="clientes-remolques-ayuda">Separadas por «·» o espacios</small>');
    expect(html).not.toContain('field-hint-warn');
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
