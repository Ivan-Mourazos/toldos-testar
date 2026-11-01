import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import { DibujoConfeccion } from './DibujoConfeccion';
import type { DibujoSvgDatos } from './tipos';

test('pinta primitivas SVG nativas con el lienzo normalizado y escapa los rótulos', () => {
  const datos: DibujoSvgDatos = { width: 242, height: 300, nodes: [
    { tag: 'path', attrs: { d: 'M1 2L3 4', fill: 'none', stroke: '#24513b', strokeWidth: 0.75, strokeDasharray: '2 1', transform: '' } },
    { tag: 'text', text: '<script>cota & tela</script>', attrs: { x: 10, y: 20, fill: '#24513b', transform: '', fontFamily: 'Segoe UI', fontWeight: 600, fontStyle: 'normal', fontSize: 8.45, textLength: 90, lengthAdjust: 'spacingAndGlyphs' } }
  ] };
  const html = renderToStaticMarkup(<DibujoConfeccion datos={datos} />);
  expect(html).toContain('viewBox="0 0 242 300"');
  expect(html).toContain('stroke-width="0.75"');
  expect(html).toContain('stroke-dasharray="2 1"');
  expect(html).toContain('&lt;script&gt;cota &amp; tela&lt;/script&gt;');
  expect(html).not.toContain('<script>');
});
