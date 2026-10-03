import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { altoFila, HojaTelas } from './HojaTelas';
import type { HojaTelasDatos } from './tipos';

const ejemplo: HojaTelasDatos = {
  planIndex: 0,
  header: { of: '0230194', orderCode: 'AR2603332', customer: 'CLIENTE', technician: 'IVÁN', reviewer: '—', date: '02/10/2026', title: 'PLANTEAMIENTO DE TELAS' },
  diagramTitle: 'CAMBIO DE TELA',
  rotulacion: { tela: 'NO', bamba: '—' },
  datos: { material: 'LONA PVC 580 BLANCO :250 AN', curva: 'SIN BAMBA', remate: '—' },
  rows: [{ letter: 'A', fabricWidth: '337,0', dropLabel: 'SALIDA', fabricDrop: '265,0', units: '1', line: '' }],
  total: { label: 'NS86BLANP250 · LONA PVC 580 BLANCO :250 AN', amount: '5,3 ML' },
  notes: '',
  footer: 'Planteamiento de telas'
};
const pintar = (datos: HojaTelasDatos) => renderToStaticMarkup(<HojaTelas datos={datos} onLista={() => {}} onError={() => {}} />);

describe('HojaTelas', () => {
  it('cabecera con OF y pedido arriba, «—» y el recuadro del dibujo vacío en su sitio', () => {
    const html = pintar(ejemplo);
    expect(html).toMatch(/OF:.*0230194.*Nº PEDIDO:.*AR2603332/s);
    expect(html).toContain('telas-dibujo');
    expect(html).toMatch(/left:\s*36pt.*top:\s*149pt.*width:\s*242pt.*height:\s*300pt/s);
    expect(html).toContain('NS86BLANP250 · LONA PVC 580 BLANCO :250 AN');
    expect(html).toContain('PAÑO TOTAL NECESARIO');
  });

  it('la segunda línea de cada fila es la instrucción', () => {
    const html = pintar({ ...ejemplo, rows: [{ ...ejemplo.rows[0], line: 'BAMBALINA INCLUIDA DE 25CM' }] });
    expect(html).toContain('BAMBALINA INCLUIDA DE 25CM');
    expect(html).not.toContain('CAMB. TELA');
  });

  it('el recuadro del dibujo va vacío: el servidor encaja ahí el dibujo', () => {
    const html = pintar(ejemplo);
    expect(html).toMatch(/<div class="telas-dibujo"[^>]*><\/div>/);
  });

  it('observaciones solo si hay notas', () => {
    expect(pintar(ejemplo)).not.toContain('OBSERVACIONES');
    const html = pintar({ ...ejemplo, notes: 'PRIMERA LÍNEA\nSEGUNDA LÍNEA' });
    expect(html).toContain('OBSERVACIONES');
    expect(html).toContain('PRIMERA LÍNEA');
    expect(html).toContain('SEGUNDA LÍNEA');
  });

  it('la instrucción y el material van en una línea, con la letra mínima de 7 pt', () => {
    const html = pintar({ ...ejemplo, rows: [{ ...ejemplo.rows[0], line: 'BAMBALINA INCLUIDA DE 25CM' }] });
    expect(html).toMatch(/class="[^"]*hoja-una-linea[^"]*" data-letra-minima="7">LONA PVC 580 BLANCO :250 AN</);
    expect(html).toMatch(/class="[^"]*hoja-una-linea[^"]*" data-letra-minima="7">BAMBALINA INCLUIDA DE 25CM</);
  });

  it('una fila por toldo, con su letra y la palabra de la caída', () => {
    const html = pintar({ ...ejemplo, rows: [ejemplo.rows[0], { ...ejemplo.rows[0], letter: 'B', dropLabel: 'CAÍDA' }] });
    expect(html.match(/class="telas-letra"/g)).toHaveLength(2);
    expect(html).toContain('CAÍDA');
  });
});

describe('altoFila', () => {
  it('con pocas filas crecen hasta 90 pt, con muchas no bajan de 62 pt', () => {
    expect(altoFila(1)).toBe(90);
    expect(altoFila(4)).toBeCloseTo((512.28 - 214) / 4 - 9, 5);
    expect(altoFila(8)).toBe(62);
  });
});
