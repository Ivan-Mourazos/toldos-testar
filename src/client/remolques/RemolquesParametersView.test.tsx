import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { DEFAULT_PARAMS } from '../../remolques/calc/params';
import { RemolquesParametersView } from './RemolquesParametersView';

it('presenta las cinco secciones, los campos editables y las acciones sin editar técnicos ni el máximo de ollaos', () => {
  const html = renderToStaticMarkup(<RemolquesParametersView parameters={DEFAULT_PARAMS} onUpdate={() => {}} onReset={() => {}} />);
  expect(html.match(/class="parameter-band"/g)).toHaveLength(5);
  expect(html.match(/type="number"/g)).toHaveLength(12 + DEFAULT_PARAMS.recogidas.length * 4 + DEFAULT_PARAMS.clientesBaqueton.length * 7);
  expect(html.match(/type="checkbox"/g)).toHaveLength(DEFAULT_PARAMS.recogidas.length);
  expect(html.match(/<textarea/g)).toHaveLength(DEFAULT_PARAMS.clientesBaqueton.length);
  expect(html).toContain('Restaurar valores por defecto');
  expect(html).toContain('Añadir recogida');
  expect(html).toContain('Añadir cliente');
  expect(html).not.toContain('Quitar recogida NO');
  expect(html).not.toContain('aria-label="Quitar cliente GENERAL"');
  expect(html).not.toContain('Máximo de ollaos');
  expect(html).not.toContain('Técnicos');
  expect(html).not.toContain('<select');
});
it('bloquea la edición hasta leer los parámetros comunes o durante el guardado', () => {
  const html = renderToStaticMarkup(<RemolquesParametersView parameters={DEFAULT_PARAMS} disabled onUpdate={() => {}} onReset={() => {}} />);
  expect(html).toContain('<fieldset class="remolques-parameters" disabled="">');
});
