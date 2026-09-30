import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { Material } from '../../remolques/calc/materiales-seed.ts';
import { emptyBaqueton, emptyLona } from '../../remolques/entradas-vacias.ts';
import { CampoMaterial } from './Campos';
import { FormularioBaqueton } from './FormularioBaqueton';
import { FormularioLona } from './FormularioLona';
import { codigoStockMaterial } from './stockMaterial';

// Iván, 01/10/2026: el material de remolques como la tela de los toldos. Se lee entero (no se corta
// en «LONA NS86 2L 630 g/m² :GRI…»), con su código, y debajo el stock de esa lona en RPS.
const VERDE = 'LONA NS86 2L 630 g/m² :VERDE COR/704 (SIMILAR 6026): 250 AN  (580)';
const MATERIALES: Material[] = [
  { nombre: VERDE, codigoBobina: 'NS86VE26P250', stockArzua: 84.75 },
  { nombre: 'LONA  NS86 2L 650 g/m² IGNIFUGA B1:PLATA/NEGRO:250 AN', codigoBobina: 'NS86B16P/NP250', stockArzua: 737.6 },
  { nombre: 'LONA RARA', codigoBobina: 'CÓDIGO RARO', stockArzua: null },
];

describe('código de la bobina para preguntar su stock', () => {
  it('el de la bobina elegida de la lista (RPS o semilla), en mayúsculas', () => {
    expect(codigoStockMaterial(VERDE, MATERIALES)).toBe('NS86VE26P250');
  });
  it('también los códigos de RPS con barra', () => {
    expect(codigoStockMaterial('LONA  NS86 2L 650 g/m² IGNIFUGA B1:PLATA/NEGRO:250 AN', MATERIALES)).toBe('NS86B16P/NP250');
  });
  it('sin código de RPS (texto manual, vacío o un código que RPS no admite) no hay nada que preguntar', () => {
    expect(codigoStockMaterial('LONA A MANO DEL CLIENTE', MATERIALES)).toBe('');
    expect(codigoStockMaterial('', MATERIALES)).toBe('');
    expect(codigoStockMaterial('LONA RARA', MATERIALES)).toBe('');
  });
});

describe('el campo material', () => {
  it('se lee entero: el nombre en un área que crece a dos líneas y el código de la bobina debajo', () => {
    const html = renderToStaticMarkup(<CampoMaterial value={VERDE} opciones={MATERIALES} onChange={() => {}} />);
    expect(html).toMatch(/<textarea[^>]*data-campo="material"[^>]*>/);
    expect(html).toContain('LONA NS86 2L 630 g/m² :VERDE COR/704 (SIMILAR 6026): 250 AN  (580)</textarea>');
    expect(html).toContain('<strong class="rem-material-codigo">NS86VE26P250</strong>');
    // Mientras llega la respuesta de RPS, el mismo texto que en toldos.
    expect(html).toContain('Consultando stock en RPS…');
    // Como el buscador de tela: una cruz para borrarlo.
    expect(html).toContain('aria-label="Borrar material"');
  });

  it('una lona escrita a mano no enseña ni código ni stock', () => {
    const html = renderToStaticMarkup(<CampoMaterial value="LONA A MANO" opciones={MATERIALES} onChange={() => {}} />);
    expect(html).not.toContain('rem-material-codigo');
    expect(html).not.toContain('fabric-stock-line');
  });

  it('la lona y el baquetón lo ponen a todo lo ancho', () => {
    const lona = renderToStaticMarkup(<FormularioLona input={{ ...emptyLona(), material: VERDE }} materiales={MATERIALES} metrosTela={6.2} onChange={() => {}} />);
    const baq = renderToStaticMarkup(<FormularioBaqueton input={{ ...emptyBaqueton(), material: VERDE }} materiales={MATERIALES} metrosTela={3} onChange={() => {}} />);
    for (const html of [lona, baq]) expect(html).toMatch(/class="field fabric-combobox rem-campo rem-material rem-span-4"/);
  });
});
