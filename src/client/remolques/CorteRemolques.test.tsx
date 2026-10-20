import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import AR2604800 from '../../remolques/corte/__fixtures__/AR2604800.json';
import AR2605132 from '../../remolques/corte/__fixtures__/AR2605132.json';
import { crearCorteRemolques } from '../../remolques/corte/archivos.js';
import { CorteRemolquesVista, type VistaCorteRemolques } from './CorteRemolques';

// La vista que da el servidor (la misma función que usa la ruta /corte), sin escribir nada.
const { vista } = crearCorteRemolques({ ajustes: async () => ({}), oda: { disponible: false } });
const pintar = (pedido: unknown) => renderToStaticMarkup(<CorteRemolquesVista datos={vista(pedido) as VistaCorteRemolques} />);

describe('el corte de lona del pedido de remolques', () => {
  it('enseña cada lona con sus metros de rollo, el dibujo, los avisos y las OF', () => {
    const html = pintar(AR2605132);
    expect(html).toContain('LONA PVC 580 GRIS CLARO 7038');
    expect(html).toContain('AR2605132.dxf');
    expect(html).toMatch(/<b>8,03 m<\/b> de rollo/);
    expect(html).toContain('el contorno no cabe en el rollo');
    expect(html).toContain('OF 0233152 · lona alta 270×160×80 TIPO 05');
    // Arcos de las esquinas y ollaos en el dibujo.
    expect(html).toMatch(/<path d="M/);
    expect(html).toMatch(/<circle /);
  });

  it('dice qué lona se corta a mano y por qué', () => {
    const html = pintar(AR2604800);
    expect(html).toContain('se corta a mano');
    expect(html).toContain('perfil TIPO 03');
    expect(html).not.toContain('corte-material');
  });
});
