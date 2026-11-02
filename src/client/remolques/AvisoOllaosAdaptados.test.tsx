import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FormularioLona } from './FormularioLona';
import { FormularioBaqueton } from './FormularioBaqueton';
import { emptyBaqueton, emptyLona } from '../../remolques/entradas-vacias.ts';

const propuesta = { origenes: ['200×130'], hecha: { largo: 203, ancho: 133 } };
describe('aviso de ollaos adaptados', () => {
  it('se ve como propuesta en los dos formularios y explica la revisión y el guardado', () => {
    for (const html of [
      renderToStaticMarkup(<FormularioLona input={{ ...emptyLona(), modoOllaos: 'SEGUN SE INDICA', ollaosAdaptados: propuesta }} materiales={[]} onChange={() => {}} />),
      renderToStaticMarkup(<FormularioBaqueton input={{ ...emptyBaqueton(), modoOllaos: 'SEGUN SE INDICA', ollaosAdaptados: propuesta }} materiales={[]} onChange={() => {}} />),
    ]) {
      expect(html).toContain('role="status"');
      expect(html).toContain('Propuesta · Ollaos adaptados de 200×130: revisa.');
      expect(html).toContain('solo pasan a la ficha');
    }
  });
  it('sin propuesta o al elegir repartidos no lo muestra', () => {
    for (const input of [emptyLona(), { ...emptyLona(), modoOllaos: 'REPARTIDOS' as const, ollaosAdaptados: propuesta }]) {
      expect(renderToStaticMarkup(<FormularioLona input={input} materiales={[]} onChange={() => {}} />)).not.toContain('Ollaos adaptados');
    }
  });
});
