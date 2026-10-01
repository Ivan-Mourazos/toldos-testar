import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { PARAMS_GENERALES } from '../../remolques/clientes/params-efectivos';
import { RemolquesParametersView } from './RemolquesParametersView';

it('presenta las cinco secciones, los campos generales y las acciones, sin clientes ni técnicos ni el máximo de ollaos', () => {
  const html = renderToStaticMarkup(<RemolquesParametersView parameters={PARAMS_GENERALES} onUpdate={() => {}} onReset={() => {}} />);
  expect(html.match(/class="parameter-band"/g)).toHaveLength(5);
  expect(html.match(/type="number"/g)).toHaveLength(12 + PARAMS_GENERALES.recogidas.length * 4 + 7);
  expect(html.match(/type="checkbox"/g)).toBeNull();
  expect(html.match(/<textarea/g)).toHaveLength(1);
  expect(html).toContain('Extras generales del baquetón');
  expect(html).toContain('Parámetros › Remolques › Clientes');
  expect(html).toContain('Restaurar valores por defecto');
  expect(html).toContain('Añadir recogida');
  expect(html).not.toContain('Añadir cliente');
  expect(html).not.toContain('Paño trasero con el ancho de delante');
  expect(html).not.toContain('Quitar recogida NO');
  expect(html).not.toContain('Máximo de ollaos');
  expect(html).not.toContain('Técnicos');
  expect(html).not.toContain('<select');
});
it('bloquea la edición hasta leer los parámetros comunes o durante el guardado', () => {
  const html = renderToStaticMarkup(<RemolquesParametersView parameters={PARAMS_GENERALES} disabled onUpdate={() => {}} onReset={() => {}} />);
  expect(html).toContain('<fieldset class="remolques-parameters" disabled="">');
});
