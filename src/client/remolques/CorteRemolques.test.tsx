import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AR2604800 from '../../remolques/corte/__fixtures__/AR2604800.json';
import AR2605132 from '../../remolques/corte/__fixtures__/AR2605132.json';
import { crearCorteRemolques } from '../../remolques/corte/archivos.js';
import { CorteRemolquesVista, escribirPlanoCorte, type VistaCorteRemolques } from './CorteRemolques';

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
    // Los puentes de ESVA aún no tienen corte (los de Hijos de Pedro López sí).
    const pedido = structuredClone(AR2604800);
    pedido.elementos[0].input.recogeAtras = 'PUENTES ESVA';
    const html = pintar(pedido);
    expect(html).toContain('se corta a mano');
    expect(html).toContain('recogida con puentes');
    expect(html).not.toContain('corte-material');
  });
});

describe('sustituir el plano del corte que ya está', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('pregunta antes; con «Conservar» no pide nada al servidor', async () => {
    const pedir = vi.fn();
    vi.stubGlobal('fetch', pedir);
    const preguntar = vi.fn(async () => 'cancel' as const);
    expect(await escribirPlanoCorte('/api/remolques/pedidos/AR2604286', ['AR2604286.dwg'], preguntar)).toBe('conservado');
    expect(preguntar).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('AR2604286.dwg ya está en su carpeta') }));
    expect(pedir).not.toHaveBeenCalled();
  });

  it('con «Sustituir plano» lo vuelve a pedir confirmado', async () => {
    const planoCorte = { files: [{ filename: 'AR2604286.dwg' }], avisos: [] };
    const pedir = vi.fn(async () => new Response(JSON.stringify({ ok: true, planoCorte })));
    vi.stubGlobal('fetch', pedir);
    expect(await escribirPlanoCorte('/api/remolques/pedidos/AR2604286', ['AR2604286.dwg'], async () => 'confirm')).toEqual(planoCorte);
    expect(pedir).toHaveBeenCalledWith('/api/remolques/pedidos/AR2604286/plano-corte', expect.objectContaining({ method: 'POST', body: JSON.stringify({ confirmOverwrite: true }) }));
  });
});
