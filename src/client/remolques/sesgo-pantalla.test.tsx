import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { emptyLona } from '../../remolques/entradas-vacias.ts';
import { calcLona, type LonaInput } from '../../remolques/calc/lona.ts';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { FormularioLona } from './FormularioLona';
import { conMedidaDelante, hayValoresDetras, sinDetras, sinRadios, tieneDetras, tieneRadios } from './medidasOpcionales';
import { ResultadosLona } from './Resultados';

// El pedido de Hijos de Pedro López del CAD de Iván (30/09/2026): 130 delante y 131,5 detrás,
// puentes de HPL delante y detrás. El CAD no trae el alto: se introducen los contornos.
const hpl = (extra: Partial<LonaInput> = {}): LonaInput => ({
  ...emptyLona(),
  largo: 211, ancho: 130, anchoAtras: 131.5, altoDelante: 40, altoAtras: 40,
  tipoPerfil: 'TIPO 01', contorno: 162.3, contornoAtras: 163.8,
  recogeDelante: 'PUENTES HIJOS DE PEDRO LOPEZ', recogeAtras: 'PUENTES HIJOS DE PEDRO LOPEZ',
  bastillaEnfundar: false, ventana: false, rotulacion: false,
  modoOllaos: 'REPARTIDOS', pasoOllaos: 35, primerOllao: 2.5,
  ...extra,
});
const desescapar = (t: string) => t.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const formulario = (input: LonaInput) =>
  desescapar(renderToStaticMarkup(<FormularioLona input={input} materiales={[]} onChange={() => {}} />));
const tarjetas = (input: LonaInput) => {
  const html = desescapar(renderToStaticMarkup(
    <ResultadosLona res={calcLona(input, DEFAULT_PARAMS)} modoOllaos={input.modoOllaos} primerOllao={2.5} onOllaosChange={() => {}} />,
  ));
  return Object.fromEntries([...html.matchAll(/<div class="rem-dato"><span>(.*?)<\/span><strong>(.*?)<\/strong><\/div>/g)]
    .map((m) => [m[1], m[2]]));
};
/** El Sí / No de un grupo: qué botón está pulsado. */
const pulsado = (html: string, grupo: string) => {
  const bloque = html.slice(html.indexOf(`aria-label="${grupo}"`));
  return bloque.match(/aria-pressed="true"[^>]*>(Sí|No)</)?.[1] ?? null;
};

describe('remolque distinto detrás en los resultados', () => {
  it('el ejemplo de HPL: paño trasero 172,5, lona hecha 131 / 132,5 y paño contorno en trapecio', () => {
    const t = tarjetas(hpl());
    expect(t['Paño delantero']).toBe('172,5 × 44,5');
    expect(t['Paño trasero']).toBe('172,5 × 44,5');
    expect(t['Lona hecha']).toBe('212 × 131 del. / 132,5 tras.');
    expect(t['Paño contorno']).toBe('234,5 × 169,3 del. / 170,8 tras.');
    expect(t['Contorno corte (+7)']).toBe('169,3 del. / 170,8 tras.');
  });
  it('sin contorno detrás todavía, la punta de detrás sale con raya', () => {
    const t = tarjetas(hpl({ contornoAtras: undefined }));
    expect(t['Paño contorno']).toBe('234,5 × 169,3 del. / — tras.');
    expect(t['Contorno corte (+7)']).toBe('169,3 del. / — tras.');
  });
  it('igual delante y detrás, las tarjetas son las de siempre', () => {
    const t = tarjetas(hpl({ anchoAtras: 0, altoAtras: 0, contornoAtras: undefined }));
    expect(t['Paño contorno']).toBe('234,5 × 169,3');
    expect(t['Contorno corte (+7)']).toBe('169,3');
  });
});

describe('«Detrás distinto» en el formulario', () => {
  it('arranca en Sí con medidas de detrás distintas y enseña ancho, alto y contorno de detrás', () => {
    const html = formulario(hpl({ contornoAtras: undefined }));
    expect(pulsado(html, 'Detrás distinto')).toBe('Sí');
    for (const campo of ['anchoAtras', 'altoAtras', 'contornoAtras']) expect(html).toContain(`data-campo="${campo}"`);
    expect(html).toContain('Contorno detrás');
    // Calculado con el ancho de detrás más la demasía de la lona hecha (132,5) y el alto de detrás: 2 × 40 + 132,5.
    const detras = html.slice(html.indexOf('data-campo="contornoAtras"'));
    expect(detras).toContain('Usar calculado: 212,5');
  });
  it('arranca en No sin medidas de detrás, o con las mismas que delante (como las trae RPS), y las esconde', () => {
    for (const input of [hpl({ anchoAtras: 0, altoAtras: 0, contornoAtras: undefined }), hpl({ anchoAtras: 130, altoAtras: 40, contornoAtras: undefined })]) {
      const html = formulario(input);
      expect(pulsado(html, 'Detrás distinto')).toBe('No');
      for (const campo of ['anchoAtras', 'altoAtras', 'contornoAtras']) expect(html).not.toContain(`data-campo="${campo}"`);
    }
  });
  it('qué cuenta como tener medidas de detrás y qué se borra al pasar a No', () => {
    expect(tieneDetras(hpl())).toBe(true);
    expect(tieneDetras(hpl({ anchoAtras: 0, altoAtras: 0, contornoAtras: 170 }))).toBe(true);
    expect(tieneDetras(hpl({ anchoAtras: 130, altoAtras: 40, contornoAtras: undefined }))).toBe(false);
    expect(hayValoresDetras(hpl({ anchoAtras: 130, altoAtras: 40, contornoAtras: undefined }))).toBe(true);
    expect(hayValoresDetras(hpl({ anchoAtras: 0, altoAtras: 0, contornoAtras: undefined }))).toBe(false);
    const limpia = sinDetras(hpl());
    expect(limpia).toMatchObject({ anchoAtras: 0, altoAtras: 0, contornoAtras: undefined, ancho: 130, altoDelante: 40 });
    const res = calcLona(limpia, DEFAULT_PARAMS);
    expect(res.lonaHecha.anchoAtras).toBe(res.lonaHecha.ancho);
    expect(res).not.toHaveProperty('contornoAtrasAjustado');
  });
  it('en No, cambiar el ancho o el alto de delante no deja el de detrás escondido con el valor viejo', () => {
    const igual = hpl({ anchoAtras: 130, altoAtras: 40, contornoAtras: undefined });
    expect(conMedidaDelante(igual, 'altoDelante', 45, false)).toMatchObject({ altoDelante: 45, altoAtras: 0 });
    expect(conMedidaDelante(igual, 'ancho', 135, false)).toMatchObject({ ancho: 135, anchoAtras: 0 });
    // En Sí, detrás se deja como esté.
    expect(conMedidaDelante(hpl(), 'ancho', 135, true)).toMatchObject({ ancho: 135, anchoAtras: 131.5 });
  });
});

describe('«Con radios» en el formulario', () => {
  it('TIPO 03: en No sin radios y los esconde; en Sí con alguno', () => {
    const sin = formulario(hpl({ tipoPerfil: 'TIPO 03', aguas: 20 }));
    expect(pulsado(sin, 'Con radios')).toBe('No');
    expect(sin).not.toContain('data-campo="radioCumbrera"');
    expect(sin).not.toContain('data-campo="radioHombro"');
    const con = formulario(hpl({ tipoPerfil: 'TIPO 03', aguas: 20, radioHombro: 10.1 }));
    expect(pulsado(con, 'Con radios')).toBe('Sí');
    expect(con).toContain('data-campo="radioCumbrera"');
    expect(con).toContain('data-campo="radioHombro"');
  });
  it('TIPO 04: igual con el radio de abajo y el de arriba; el chaflán sigue a la vista', () => {
    const sin = formulario(hpl({ tipoPerfil: 'TIPO 04', chaflan: 30 }));
    expect(pulsado(sin, 'Con radios')).toBe('No');
    expect(sin).toContain('data-campo="chaflan"');
    expect(sin).not.toContain('data-campo="radioChaflanAbajo"');
    const con = formulario(hpl({ tipoPerfil: 'TIPO 04', chaflan: 30, radioChaflanArriba: 5 }));
    expect(pulsado(con, 'Con radios')).toBe('Sí');
    expect(con).toContain('data-campo="radioChaflanAbajo"');
    expect(con).toContain('data-campo="radioChaflanArriba"');
  });
  it('TIPO 05: el radio de esquina es obligatorio y no va tras «Con radios»', () => {
    const html = formulario(hpl({ tipoPerfil: 'TIPO 05' }));
    expect(html).toContain('data-campo="radioEsquina"');
    expect(html).not.toContain('Con radios');
  });
  it('pasar a No deja vivas las aristas del perfil elegido y no toca las demás medidas', () => {
    const tipo03 = hpl({ tipoPerfil: 'TIPO 03', aguas: 20, radioCumbrera: 5, radioHombro: 10.1 });
    expect(tieneRadios(tipo03)).toBe(true);
    expect(sinRadios(tipo03)).toEqual({ ...tipo03, radioCumbrera: 0, radioHombro: 0 });
    const tipo04 = hpl({ tipoPerfil: 'TIPO 04', chaflan: 30, radioChaflanAbajo: 4 });
    expect(sinRadios(tipo04)).toEqual({ ...tipo04, radioChaflanAbajo: 0, radioChaflanArriba: 0 });
    expect(tieneRadios(hpl({ tipoPerfil: 'TIPO 05', radioEsquina: 8 }))).toBe(false);
  });
});
