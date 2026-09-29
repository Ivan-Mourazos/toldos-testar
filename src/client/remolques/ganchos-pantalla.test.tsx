import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyLona } from '../../remolques/entradas-vacias.ts';
import { calcLona, type LonaInput } from '../../remolques/calc/lona.ts';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { FormularioLona } from './FormularioLona';
import { MODOS_OLLAOS } from './opciones';
import { pantallaGanchos, ResultadosLona } from './Resultados';

const lona = (extra: Partial<LonaInput> = {}): LonaInput => ({
  ...emptyLona(),
  largo: 300, ancho: 200, altoDelante: 100, tipoPerfil: 'TIPO 01',
  modoOllaos: 'SEGUN GANCHOS',
  ganchos: { laterales: [5, 100, 200, 295], atras: [160, 110, 60, 10], delante: [10, 60, 110, 160] },
  ...extra,
});
const desescapar = (t: string) => t.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

describe('ollaos según ganchos en pantalla', () => {
  it('el modo aparece en el desplegable', () => {
    expect(MODOS_OLLAOS).toContainEqual({ value: 'SEGUN GANCHOS', label: 'Según ganchos' });
  });

  it('enseña el editor de ganchos, los avisos y los ollaos calculados', () => {
    const input = lona();
    const html = desescapar(renderToStaticMarkup(
      <ResultadosLona
        res={calcLona(input, DEFAULT_PARAMS)}
        modoOllaos={input.modoOllaos}
        primerOllao={2.5}
        onOllaosChange={() => {}}
        ganchos={pantallaGanchos(input, undefined, () => {})}
      />,
    ));
    expect(html).toContain('Ganchos del pedido');
    expect(html.match(/Medido al revés/g)).toHaveLength(3);
    expect(html).toContain('aria-label="DELANTE · IZQUIERDA A DERECHA, gancho 1"');
    expect(html).toContain('Los ganchos de atrás van bajando');
    // Delante: ganchos 10, 60, 110, 160 → sobre la lona 10,5… → ollaos 2,5 · 35,5 · 85,5 · 135,5 · 198,5.
    for (const valor of ['35,5', '85,5', '135,5', '198,5']) expect(html).toContain(`>${valor}<`);
    expect(html).toContain('uno en cada extremo, a 2,5 cm del borde');
  });

  it('el formulario pide los extremos y su distancia solo en este modo', () => {
    const conExtremos = renderToStaticMarkup(<FormularioLona input={lona()} materiales={[]} onChange={() => {}} />);
    expect(conExtremos).toContain('Ollaos en los extremos');
    expect(conExtremos).toContain('Extremo al borde');
    const sinExtremos = renderToStaticMarkup(<FormularioLona input={lona({ ollaosExtremos: false })} materiales={[]} onChange={() => {}} />);
    expect(sinExtremos).toContain('Ollaos en los extremos');
    expect(sinExtremos).not.toContain('Extremo al borde');
  });
});
