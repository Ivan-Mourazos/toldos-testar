import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { emptyBaqueton, emptyLona } from '../../remolques/entradas-vacias.ts';
import { FormularioBaqueton } from './FormularioBaqueton';
import { FormularioLona } from './FormularioLona';

const marcas = (html: string) => html.match(/class="rem-del-cliente"/g)?.length ?? 0;

describe('marca «del cliente» en los formularios', () => {
  it('solo en los campos que puso la ficha', () => {
    const input = { ...emptyLona(), tipoPerfil: 'TIPO 02' as const, aguas: 20, recogeDelante: 'GOMA', recogeAtras: 'GOMA', observaciones: 'ETIQUETA' };
    const html = renderToStaticMarkup(<FormularioLona input={input} materiales={[]} params={DEFAULT_PARAMS} delCliente={['tipoPerfil', 'recogeDelante', 'observaciones']} onChange={() => {}} />);
    expect(marcas(html)).toBe(3);
    expect(html).toContain('>del cliente<');
  });

  it('el ancho de detrás que puso el sesgo se ve y va marcado', () => {
    const input = { ...emptyLona(), ancho: 120, anchoAtras: 121.5 };
    const html = renderToStaticMarkup(<FormularioLona input={input} materiales={[]} params={DEFAULT_PARAMS} delCliente={['anchoAtras']} onChange={() => {}} />);
    expect(marcas(html)).toBe(1);
  });

  it('el baquetón marca el cliente de los extras y los ollaos', () => {
    const input = { ...emptyBaqueton(), clienteEspecifico: 'AYALA', modoOllaos: 'SEGUN SE INDICA' as const };
    const html = renderToStaticMarkup(<FormularioBaqueton input={input} materiales={[]} params={DEFAULT_PARAMS} delCliente={['clienteEspecifico', 'modoOllaos', 'ollaosManuales']} onChange={() => {}} />);
    expect(marcas(html)).toBe(2);
  });

  it('sin marcas, ninguna', () => {
    expect(marcas(renderToStaticMarkup(<FormularioLona input={emptyLona()} materiales={[]} params={DEFAULT_PARAMS} onChange={() => {}} />))).toBe(0);
  });
});
