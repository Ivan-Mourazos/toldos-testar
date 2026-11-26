import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { elegirLona, LonasEntrega, type LonaEditable } from './LonasEntrega';

const pendiente = { descripcion: 'LAC900 AZUL', ml: 9.11, ofs: ['0290001', '0290002'], opciones: [
  { codigo: 'LAC900AZ02P300', nombre: 'PVC 900 AZUL 5002 · 300 AN' },
  { codigo: 'LAC900AZ10P300', nombre: 'PVC 900 AZUL 5010 · 300 AN' },
] };

it('una lona por elegir enseña sus opciones y no dice que la lista está vacía', () => {
  const html = renderToStaticMarkup(<LonasEntrega lonas={[]} ofs={pendiente.ofs} cambiar={() => {}} enviado={false} porElegir={[pendiente]} />);
  expect(html).toContain('LAC900 AZUL');
  expect(html).toContain('9,11 m');
  expect(html).toContain('PVC 900 AZUL 5002 · 300 AN');
  expect(html).toContain('PVC 900 AZUL 5010 · 300 AN');
  expect(html).not.toContain('La lista de lonas está vacía.');
});

it('al elegir, la lona entra con los metros del corte; si ya estaba, se suman metros y OF', () => {
  expect(elegirLona([], pendiente, 'LAC900AZ10P300')).toEqual([
    { codigo: 'LAC900AZ10P300', descripcion: 'LAC900 AZUL', metros: '9,11', ofs: ['0290001', '0290002'], origen: 'corte' },
  ]);
  const lonas: LonaEditable[] = [{ codigo: 'LAC900AZ02P300', descripcion: 'LAC900 AZUL 5002', metros: '2,5', ofs: ['0290003'], origen: 'corte' }];
  expect(elegirLona(lonas, pendiente, 'LAC900AZ02P300')).toEqual([
    { codigo: 'LAC900AZ02P300', descripcion: 'LAC900 AZUL 5002', metros: '11,61', ofs: ['0290003', '0290001', '0290002'], origen: 'corte' },
  ]);
});
