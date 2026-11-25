import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { apilableVentanal } from '../../puertas/__fixtures__/apilableVentanal.ts';
import { pedidoDe } from '../../puertas/__fixtures__/ejemplos.ts';
import { generarCortePuertas } from '../../puertas/corte.ts';
import { DibujoCortePuertas } from './VistaCortePuertas';

it('muestra las mitades horizontales y conserva los 520 mm y la colocación del DXF', () => {
  const { cortes, archivo } = generarCortePuertas(pedidoDe('AR2605731', apilableVentanal()));
  const c = cortes.find(x => x.opcion === 'saco-partido')!;
  expect(c.largo).toBe(520);
  expect(c.colocadas.map(t => t.girada)).toEqual([true, true]);
  expect(archivo?.entidades.textos.some(t => t.valor === 'A · SACO' && t.giro === 90)).toBe(true);
  const antes = JSON.stringify(c);
  const html = renderToStaticMarkup(<DibujoCortePuertas corte={c} ajustado/>);
  expect(html).toContain('Piezas en horizontal');
  expect(html).toMatch(/x1="0"[^>]+x2="266"[^>]+data-capa="DISCO1"/);
  expect(JSON.stringify(c)).toBe(antes);
});
