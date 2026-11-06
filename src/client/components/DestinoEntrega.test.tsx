import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { OpcionesEntrega } from './DestinoEntrega';
it('muestra históricos, datos conocidos y el destino recomendado sin generar', () => {
  const html = renderToStaticMarkup(<OpcionesEntrega datos={{ siguiente: 12, recomendado: { numero: 10, modo: 'sustituir' }, pasos: [], existentes: [
    { numero: 10, fecha: '2026-11-06', ofs: ['0230001'], modelos: ['PUERTAENR'], origen: 'Web', archivos: [] },
    { numero: 11, ofs: [], origen: 'Excel antiguo', archivos: [] },
  ] }} destino={{ numero: 10, modo: 'sustituir' }} elegir={() => {}} />);
  expect(html).toContain('Nuevo: -12');
  expect(html).toContain('Sustituir -10');
  expect(html).toContain('0230001');
  expect(html).toContain('PUERTAENR');
  expect(html).toContain('Excel antiguo');
  expect(html.match(/checked=""/g)).toHaveLength(1);
});
