import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyBaqueton, emptyLona } from '../../remolques/entradas-vacias.ts';
import { calcLona, type LonaInput } from '../../remolques/calc/lona.ts';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { DibujoRemolque } from './DibujoRemolque';
import { FormularioBaqueton } from './FormularioBaqueton';
import { FormularioLona } from './FormularioLona';

// Iván, 30/09/2026: las observaciones se escriben por líneas, con «Añadir línea» y una papelera por
// línea, como las observaciones de tela de los toldos; se editan solo en el formulario.
const lona = (extra: Partial<LonaInput> = {}): LonaInput => ({
  ...emptyLona(), largo: 300, ancho: 200, altoDelante: 100, tipoPerfil: 'TIPO 01', ...extra,
});

describe('observaciones por líneas en pantalla', () => {
  it('la lona: una línea por renglón guardado, numeradas, con «Añadir línea» y eliminar cada una', () => {
    const html = renderToStaticMarkup(<FormularioLona input={lona({ observaciones: 'REFORZAR\nOJO CON EL GOLPE' })} materiales={[]} onChange={() => {}} />);
    expect(html).toContain('aria-label="Observaciones"');
    expect(html).toContain('Añadir línea');
    expect(html).toContain('value="REFORZAR"');
    expect(html).toContain('value="OJO CON EL GOLPE"');
    expect(html).toContain('aria-label="Eliminar observaciones, línea 2"');
  });

  it('un texto de antes, de una línea, es una sola línea', () => {
    const html = renderToStaticMarkup(<FormularioLona input={lona({ observaciones: 'DE ANTES' })} materiales={[]} onChange={() => {}} />);
    expect(html.match(/data-observation-line=/g)).toHaveLength(1);
    expect(html).toContain('value="DE ANTES"');
  });

  it('el baquetón también', () => {
    const html = renderToStaticMarkup(
      <FormularioBaqueton input={{ ...emptyBaqueton(), observaciones: 'UNA\nDOS' }} materiales={[]} onChange={() => {}} />,
    );
    expect(html).toContain('aria-label="Observaciones"');
    expect(html).toContain('value="DOS"');
  });

  it('el dibujo ya no tiene su propia casilla de observaciones', () => {
    const input = lona({ observaciones: 'OJO' });
    const html = renderToStaticMarkup(
      <DibujoRemolque tipo="lona" input={input} res={calcLona(input, DEFAULT_PARAMS)} params={DEFAULT_PARAMS} respaldo={<p>RESPALDO</p>} />,
    );
    expect(html).not.toContain('name="observaciones"');
    expect(html).not.toContain('OJO');
  });
});
