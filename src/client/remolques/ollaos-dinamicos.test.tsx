import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyBaqueton, emptyLona } from '../../remolques/entradas-vacias.ts';
import { calcLona } from '../../remolques/calc/lona.ts';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { FormularioLona } from './FormularioLona';
import { FormularioBaqueton } from './FormularioBaqueton';
import { ResultadosLona } from './Resultados';

describe('ollaos dinámicos en pantalla', () => {
  it('muestra todos los ollaos repartidos y el total completo', () => {
    const input = { ...emptyLona(), largo: 1000, ancho: 200, modoOllaos: 'REPARTIDOS' as const };
    const html = renderToStaticMarkup(<ResultadosLona res={calcLona(input, DEFAULT_PARAMS)} modoOllaos={input.modoOllaos} primerOllao={2.5} onOllaosChange={() => {}} />);
    expect(html).toContain('>30</th>');
    expect(html).toContain('>998,5</td>');
    expect(html).toContain('class="rem-tabla-total">30</td>');
  });

  it('ofrece una casilla más al completar las posiciones manuales, sin cortar las anteriores', () => {
    const input = { ...emptyLona(), modoOllaos: 'SEGUN SE INDICA' as const, ollaosManuales: { laterales: Array.from({ length: 20 }, (_, i) => 2.5 + 30 * i), atras: [], delante: [] } };
    const html = renderToStaticMarkup(<ResultadosLona res={calcLona(input, DEFAULT_PARAMS)} modoOllaos={input.modoOllaos} primerOllao={2.5} onOllaosChange={() => {}} />);
    expect(html).toContain('aria-label="LATERALES · ATRÁS A ADELANTE, ollao 21"');
    expect(html).toContain('value="572,5"');
  });

  it('ofrece un gancho más al completar las casillas, sin el antiguo tope de 11', () => {
    const laterales = Array.from({ length: 15 }, (_, i) => 10 + 30 * i);
    const html = renderToStaticMarkup(<ResultadosLona res={calcLona({ ...emptyLona(), largo: 1000, ancho: 200 }, DEFAULT_PARAMS)} modoOllaos="SEGUN GANCHOS" primerOllao={2.5} onOllaosChange={() => {}}
      ganchos={{ ganchos: { laterales, atras: [], delante: [] }, alReves: { laterales: false, atras: false, delante: false }, extremos: true, avisos: [], onChange: () => {} }} />);
    expect(html).toContain('gancho 16"');
    expect(html).toContain('value="430"');
  });

  it('pide por separado el paso de laterales y cabezas en ambos formularios', () => {
    for (const html of [
      renderToStaticMarkup(<FormularioLona input={{ ...emptyLona(), modoOllaos: 'REPARTIDOS' }} materiales={[]} onChange={() => {}} />),
      renderToStaticMarkup(<FormularioBaqueton input={{ ...emptyBaqueton(), modoOllaos: 'REPARTIDOS' }} materiales={[]} onChange={() => {}} />),
    ]) {
      expect(html).toContain('Paso laterales');
      expect(html).toContain('Paso cabezas');
      expect(html).toContain('data-campo="pasoOllaosCabezas"');
    }
  });
});
