import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyLona } from '../../remolques/entradas-vacias.ts';
import { calcLona, type LonaInput } from '../../remolques/calc/lona.ts';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { DibujoRemolque } from './DibujoRemolque';

const pintar = (extra: Partial<LonaInput>) => {
  const input: LonaInput = { ...emptyLona(), largo: 300, ancho: 200, altoDelante: 100, tipoPerfil: 'TIPO 01', ...extra };
  return renderToStaticMarkup(
    <DibujoRemolque tipo="lona" input={input} res={calcLona(input, DEFAULT_PARAMS)} params={DEFAULT_PARAMS}
      respaldo={<p>RESPALDO</p>} />,
  );
};

describe('DibujoRemolque', () => {
  it('sin WebGL enseña el dibujo técnico y lo dice', () => {
    const html = pintar({});
    expect(html).toContain('RESPALDO');
    expect(html).toContain('Este equipo no puede mostrar el 3D: se ve el dibujo técnico.');
  });

  it('sin forma decidida enseña el dibujo técnico (su aviso de qué falta) sin decir nada del 3D', () => {
    const html = pintar({ tipoPerfil: '' });
    expect(html).toContain('RESPALDO');
    expect(html).not.toContain('no puede mostrar el 3D');
  });
});
