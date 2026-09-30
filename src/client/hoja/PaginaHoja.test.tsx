import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import casos from '../../remolques/__fixtures__/produccion-2026-09.json';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { CLIENTE_LARGO, muestrasHoja, type CasoFixture } from '../../remolques/hoja/muestras.ts';
import { paginaHoja } from '../../remolques/hoja/pagina.ts';
import { prepararPedidoHoja } from '../../remolques/hoja/pedido.ts';
import { PaginaHoja } from './PaginaHoja';

const muestras = muestrasHoja(casos as CasoFixture[]);
const pagina = (nombre: keyof typeof muestras, indice = 0) => {
  const datos = prepararPedidoHoja(muestras[nombre], DEFAULT_PARAMS);
  return paginaHoja(datos.elementos[indice], indice, datos.elementos.length, datos.params);
};
const desescapar = (t: string) => t.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

describe('PaginaHoja', () => {
  it('lleva cabecera, título, banda, grupos, tabla de ollaos y las cinco vistas', () => {
    const html = desescapar(renderToStaticMarkup(<PaginaHoja pagina={pagina('varios')} vistas={null} />));
    for (const texto of [
      'CLIENTE DE PRUEBA', 'REALIZADO POR', 'REVISADO POR', 'AR.26.99996', '0239999', '30/09/2026',
      'REMOLQUE · 1 DE 3', 'PAÑOS A CORTAR', 'MEDIDA LONA HECHA', 'FORMA', 'ACABADOS', 'MATERIAL', 'OBSERVACIONES',
      'OLLAOS LATERALES DE ATRÁS A ADELANTE', 'TOTAL', '3/4 DESDE DELANTE', '3/4 DESDE DETRÁS', 'VISTA LATERAL',
    ]) expect(html).toContain(texto);
    expect(html).not.toContain('GANCHOS ·');
    expect(html).toContain('src="/logo-tgm-transparent.png"');
  });

  it('con «Según ganchos» añade su tabla y encoge el dibujo', () => {
    const html = desescapar(renderToStaticMarkup(<PaginaHoja pagina={pagina('segun-ganchos')} vistas={null} />));
    expect(html).toContain('GANCHOS DELANTE DE DERECHA A IZQUIERDA (MEDIDO AL REVÉS)');
    expect(html).toContain('hoja-pagina con-ganchos');
  });

  it('«REVISADO POR» va vacío y no hay notas del cálculo: solo las observaciones del técnico', () => {
    const html = desescapar(renderToStaticMarkup(<PaginaHoja pagina={pagina('varios', 2)} vistas={null} />));
    expect(html).toMatch(/<span>REVISADO POR<\/span><strong><\/strong>/);
    expect(html).not.toContain('NOTAS DEL CÁLCULO');
    expect(html).toContain('REFORZAR LAS ESQUINAS DE DETRÁS CON DOBLE COSTURA.');
  });

  it('con el remolque sesgado, el contorno de corte y su paño llevan las dos puntas', () => {
    const html = desescapar(renderToStaticMarkup(<PaginaHoja pagina={pagina('sesgado')} vistas={null} />));
    expect(html).toContain('<span class="hoja-rotulo">CONTORNO DE CORTE</span><strong class="hoja-celda-linea">169,3 DEL. / 170,8 TRAS.</strong>');
    expect(html).toContain('1 PAÑO DE 234,5 × 169,3 DEL. / 170,8 TRAS.');
    expect(html).toContain('ANCHO 130 DEL. / 131,5 TRAS.');
  });

  it('el nombre del cliente va entero en el HTML (el CSS lo deja en una línea)', () => {
    const html = desescapar(renderToStaticMarkup(<PaginaHoja pagina={pagina('segun-ganchos')} vistas={null} />));
    expect(html).toContain(`<strong class="hoja-cab-grande">${CLIENTE_LARGO}</strong>`);
  });

  // Revisión de Iván, 30/09/2026.
  it('las observaciones, una por línea, numeradas y sin las vacías', () => {
    const base = pagina('lona-ventana');
    const html = desescapar(renderToStaticMarkup(<PaginaHoja pagina={{ ...base, observaciones: 'REFORZAR\n\nOJO CON EL GOLPE' }} vistas={null} />));
    expect(html).toContain('<ol class="hoja-observaciones"><li><span class="hoja-obs-numero">1.</span><span>REFORZAR</span></li>'
      + '<li><span class="hoja-obs-numero">2.</span><span>OJO CON EL GOLPE</span></li></ol>');
    const vacia = desescapar(renderToStaticMarkup(<PaginaHoja pagina={{ ...base, observaciones: '—' }} vistas={null} />));
    expect(vacia).toContain('<p class="hoja-observaciones-vacias">—</p>');
  });

  it('la recogida se escribe al pie de la vista de delante y de la de detrás', () => {
    const html = desescapar(renderToStaticMarkup(<PaginaHoja pagina={pagina('sesgado')} vistas={null} />));
    expect(html.match(/RECOGIDA: PUENTES HIJOS DE PEDRO LÓPEZ/g)).toHaveLength(2);
    expect(html).toMatch(/hoja-vista-delante[^]*hoja-vista-nota[^]*hoja-vista-detras[^]*hoja-vista-nota[^]*hoja-vista-lateral/);
    const baqueton = desescapar(renderToStaticMarkup(<PaginaHoja pagina={pagina('baqueton')} vistas={null} />));
    expect(baqueton).not.toContain('RECOGIDA');
  });

  it('el material va en una línea que se ajusta a lo ancho', () => {
    const html = desescapar(renderToStaticMarkup(<PaginaHoja pagina={pagina('lona-ventana')} vistas={null} />));
    expect(html).toMatch(/<p class="hoja-material hoja-una-linea"/);
  });

  it('la bastilla de enfundar se dice en ACABADOS', () => {
    const html = desescapar(renderToStaticMarkup(<PaginaHoja pagina={pagina('bastilla')} vistas={null} />));
    expect(html).toMatch(/<dt>BASTILLA ENFUNDAR<\/dt><dd><span>SÍ<\/span><\/dd>/);
  });
});
