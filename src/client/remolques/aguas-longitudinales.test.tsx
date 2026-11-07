import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyLona } from '../../remolques/entradas-vacias.ts';
import { calcLona, type LonaInput } from '../../remolques/calc/lona.ts';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { escenaLona } from '../../remolques/escena/lona.ts';
import { geometriaContorno } from './render/cuerpo';
import { FormularioLona } from './FormularioLona';
import { Escena3D } from './Escena3D';
import { hojaLona } from '../../remolques/hoja/datos-hoja.ts';

const input: LonaInput = {
  ...emptyLona(), largo: 244, ancho: 143, altoDelante: 96,
  tipoPerfil: 'TIPO 02', aguas: 16, direccionAguas: 'delante-atras',
};

describe('vistas con aguas hacia delante y atrás', () => {
  it('la hoja distingue el alto central del de los extremos', () => {
    const hoja = hojaLona(input, calcLona(input, DEFAULT_PARAMS));
    expect(hoja.banda[1].lineas).toEqual(['245 × 144', 'ALTO CENTRO 96', 'EXTREMOS 80']);
    expect(hoja.banda[0].lineas).toContain('2 PAÑOS DE 247 × 99,5 · LATERALES CON PICO');
  });
  it('ofrece el sentido, el alto central y que el techo monta encima del lateral', () => {
    const html = renderToStaticMarkup(<FormularioLona input={input} materiales={[]} onChange={() => {}} />);
    expect(html).toContain('Aguas hacia');
    expect(html).toContain('Delante y atrás');
    expect(html).toContain('Alto centro');
    expect(html).not.toContain('data-campo="contorno"');
    expect(html).toContain('Solape soldadura');
    expect(html).toContain('El techo monta encima del lateral: marca roja en los laterales, a 2 cm del borde');
  });

  it('la malla tiene la cumbrera exacta a mitad del largo y los dos extremos a 80', () => {
    const res = calcLona(input, DEFAULT_PARAMS);
    const cuerpo = escenaLona(input, res, DEFAULT_PARAMS)!.cuerpo;
    if (cuerpo.tipo !== 'lona') throw Error('Falta la lona');
    const geo = geometriaContorno(cuerpo);
    try {
      const p = geo.getAttribute('position');
      const puntos = Array.from({ length: p.count }, (_, i) => [p.getX(i), p.getY(i), p.getZ(i)]);
      expect(Math.max(...puntos.map(([, y]) => y))).toBe(96);
      for (const z of [0, res.lonaHecha.largo]) {
        expect(Math.max(...puntos.filter((p) => p[2] === z).map(([, y]) => y))).toBe(80);
      }
      expect(puntos.filter(([, y]) => y === 96).every(([, , z]) => z === res.lonaHecha.largo / 2)).toBe(true);
    } finally { geo.dispose(); }
  });

  it('el dibujo de respaldo conserva la forma y acota los extremos a 80', () => {
    const html = renderToStaticMarkup(<Escena3D modo="lona" {...input} medidasHechas={{ largo: 245, ancho: 144 }} />);
    expect(html).toContain('ALTO DEL. 80');
    expect(html).toContain('ALTO TRAS. 80');
    expect(html).not.toContain('ALTO DEL. 96');
  });
});
