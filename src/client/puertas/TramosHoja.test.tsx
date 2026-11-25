import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { cotas5743, puerta5743 } from '../../puertas/__fixtures__/tgm5743.ts';
import { nuevaPuertaDeCliente } from '../../puertas/nuevaPuertaCliente.ts';
import { TramosHoja } from './TramosHoja';

const pintar = (p = puerta5743()) => renderToStaticMarkup(<TramosHoja p={p} medidas={() => undefined} entradas={3} />);

describe('tramos de la hoja en Puertas genéricas', () => {
  it('pone una casilla por tramo, de abajo arriba, con su ventanal', () => {
    const html = pintar();
    expect(html).toContain('Número de tramos');
    expect(html).toContain('Tramo 1 · abajo (mm)');
    expect(html).toContain('Tramo 2 (mm)');
    expect(html).toContain(`Tramo ${cotas5743.length} · arriba (mm)`);
    expect(html.match(/type="checkbox"/g)).toHaveLength(cotas5743.length);
    expect(html.match(/checked=""/g)).toHaveLength(1);
    expect(html).toContain('lleva 3 E.T.');
  });

  it('sin saco, el tramo de abajo no puede llevar ventanal', () => {
    const base = puerta5743();
    const html = pintar({ ...base, tgm: { ...base.tgm!, abajo: 'tubo', ventanal: undefined } });
    expect(html.match(/disabled=""/g)).toHaveLength(1);
  });

  it('la puerta nueva empieza sin tramos', () => {
    const html = pintar(nuevaPuertaDeCliente('general', 'enrollable'));
    expect(html).toContain('Número de tramos');
    expect(html).not.toContain('Tramo 1');
  });
});
