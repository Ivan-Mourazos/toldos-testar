import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { anchoArial } from '../../domain/corteLona/texto.js';
import { generarCortePuertas } from '../../puertas/corte.ts';
import { puertaPlanoReal } from '../../puertas/__fixtures__/planosReales.ts';
import { araujo5365 } from '../../puertas/__fixtures__/araujo.ts';
import { pedidoDe } from '../../puertas/__fixtures__/ejemplos.ts';
import type { CortePuertas } from '../../puertas/tipos.ts';
import {
  anchoOcupadoCorte,
  DibujoCortePuertas,
  geometriaCorteAjustado,
  textoCabeceraCorte,
} from './VistaCortePuertas';

describe('VistaCortePuertas · ancho ocupado y dibujo ajustado', () => {
  it('calcula el ancho real ocupado en mm considerando piezas normales y giradas', () => {
    const corteBase: CortePuertas = {
      material: 'TRANSP. 1000MI',
      anchoRollo: 1400,
      largo: 5890,
      opcion: 'principal',
      entidades: { lineas: [], textos: [], arcos: [], circulos: [] },
      colocadas: [
        {
          pieza: {
            id: 'p1', nombre: 'Cristal', clase: 'cristal', ancho: 589, alto: 5.5,
            cantidad: 1, material: 'TRANSP. 1000MI', rollo: 140, of: '0230001',
            contorno: [[0, 0], [589, 0], [589, 5.5], [0, 5.5]], marcas: [], textos: [], huecos: [], radio: 0,
          },
          x: 0, y: 0, girada: false,
        },
      ],
    };
    expect(anchoOcupadoCorte(corteBase)).toBe(55);
    expect(textoCabeceraCorte(corteBase)).toBe('Ocupa 5890 × 55 mm · rollo de 1400 mm');

    const conGirada: CortePuertas = {
      ...corteBase,
      colocadas: [
        ...corteBase.colocadas,
        {
          pieza: { ...corteBase.colocadas[0].pieza, id: 'p2', ancho: 20, alto: 100 },
          x: 0, y: 55, girada: true,
        },
      ],
    };
    expect(anchoOcupadoCorte(conGirada)).toBe(255);
    expect(textoCabeceraCorte(conGirada)).toBe('Ocupa 5890 × 255 mm · rollo de 1400 mm');
  });

  it('en AR2605036 (cristal y saco entero) incluye los rótulos grandes sin recortar y sin espacio vacío del rollo', () => {
    const { cortes } = generarCortePuertas(pedidoDe('AR2605036', puertaPlanoReal('AR2605036')));
    const transp = cortes.find(c => c.material.includes('TRANSP'))!;
    const sacoEntero = cortes.find(c => c.opcion === 'saco-entero')!;
    expect(transp).toBeTruthy();
    expect(sacoEntero).toBeTruthy();

    for (const c of [transp, sacoEntero]) {
      const g = geometriaCorteAjustado(c);
      // El dibujo ajustado es claramente más bajo que el rollo completo vacío
      expect(g.ocupado).toBeLessThan(c.anchoRollo);
      expect(g.vista.alto).toBeLessThan(c.anchoRollo);

      // Todos los textos (incluido el rótulo grande del material) caben dentro del viewBox calculado
      for (const t of g.textos) {
        const anchoTxt = anchoArial(t.valor, t.h);
        const xIzq = t.centrado ? t.x - anchoTxt / 2 : t.x;
        const xDer = t.centrado ? t.x + anchoTxt / 2 : t.x + anchoTxt;
        const ySupSvg = -(t.centrado ? t.y + t.h / 2 : t.y + t.h);
        expect(xIzq).toBeGreaterThanOrEqual(g.vista.x - 0.01);
        expect(xDer).toBeLessThanOrEqual(g.vista.x + g.vista.ancho + 0.01);
        expect(ySupSvg).toBeGreaterThanOrEqual(g.vista.y - 0.01);
      }

      const html = renderToStaticMarkup(<DibujoCortePuertas corte={c} ajustado />);
      expect(html).toContain('is-ajustado');
      expect(html).toContain(c.material);
      // El fondo del rollo cubre solo el alto ocupado, no el rollo completo
      expect(html).toContain(`height="${g.ocupado}"`);
    }

    expect(textoCabeceraCorte(transp)).toBe(`Ocupa ${transp.largo} × 330 mm · rollo de 1400 mm`);
    expect(textoCabeceraCorte(sacoEntero)).toBe(`Ocupa ${sacoEntero.largo} × 300 mm · rollo de 3000 mm`);

    // En la lona principal con «CORTAR POR EL REVÉS», los dos renglones del título no se pisan aunque el superior supere anchoRollo
    const lona = cortes.find(c => c.material.includes('BLANCO'))!;
    const gLona = geometriaCorteAjustado(lona);
    const tMat = gLona.textos.find(t => t.valor.includes('BLANCO'))!;
    const tReves = gLona.textos.find(t => t.valor === 'CORTAR POR EL REVÉS')!;
    expect(tMat.y - tReves.y).toBeGreaterThanOrEqual(tReves.h);
  });

  it('recoloca títulos que flotan encima de un rollo vacío (p. ej. bolsa de Araujo) para no dejar hueco', () => {
    const { cortes } = generarCortePuertas(pedidoDe('AR2605365', araujo5365()));
    const bolsa = cortes.find(c => c.material.includes('AMARILLO'))!;
    expect(bolsa).toBeTruthy();
    const g = geometriaCorteAjustado(bolsa);
    expect(g.ocupado).toBeLessThan(bolsa.anchoRollo / 2);
    expect(g.vista.alto).toBeLessThan(bolsa.anchoRollo * 0.5);
  });
});
