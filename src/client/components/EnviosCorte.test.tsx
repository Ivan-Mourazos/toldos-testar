import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { SelectorDestinoDxf } from './EnviosCorte';
it('el selector tiene exactamente tres destinos y usa el técnico del pedido por defecto', () => {
  const html = renderToStaticMarkup(<SelectorDestinoDxf destino="bot" elegir={() => {}} tecnico="" elegirTecnico={() => {}} tecnicoPedido="IVÁN" />);
  const destinos = html.split('</select>')[0];
  expect(destinos.match(/<option/g)).toHaveLength(3);
  for (const t of ['Bot (carpeta del técnico)', 'Carpeta DXFs del año', 'Descargar en mi PC', 'Técnico del pedido · Iván', 'Angel', 'Ivan.Sanchez']) expect(html).toContain(t);
});
