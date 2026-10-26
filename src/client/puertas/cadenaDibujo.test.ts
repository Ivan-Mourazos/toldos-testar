import { describe, expect, it } from 'vitest';
import { cintasDesdeCotas, cintasSimetricas, leerCadena, ejesDesdeTramos, cintasDesdeFila } from './cadenaDibujo';

describe('leerCadena', () => {
  it('lee la fila de la hoja de Portanova en mm, de abajo arriba (AR2605035)', () => {
    expect(leerCadena('310 580 550 580 550 580 700', 0)).toEqual({ pie: 31, pasos: [58, 55, 58, 55, 58], cabecera: 70, enMm: true });
  });
  it('si la suma cuadra con el alto en cm, la toma en cm; admite ; y coma decimal', () => {
    expect(leerCadena('31; 58; 55,5; 70', 214.5)).toEqual({ pie: 31, pasos: [58, 55.5], cabecera: 70, enMm: false });
    expect(leerCadena('310 580 550 700', 214)).toMatchObject({ enMm: true, pie: 31 });
  });
  it('rechaza lo que no son cotas', () => {
    expect(leerCadena('310', 0)).toBeNull();
    expect(leerCadena('310 abc 700', 0)).toBeNull();
    expect(leerCadena('310 0 700', 0)).toBeNull();
  });
});

describe('cintasSimetricas', () => {
  it('completa la derecha en simétrico y no repite la del centro (432 cm: 44 y 210 → 44, 210, 376)', () => {
    expect(cintasSimetricas([44, 210], 432)).toEqual([44, 210, 376]);
    expect(cintasSimetricas([44], 432)).toEqual([44, 376]);
  });
});

describe('cintasDesdeCotas', () => {
  it('como en el pedido AR2605035: 60 380 120 1540 en 4320 → 44, 210, 376', () => {
    expect(cintasDesdeCotas([60, 380, 120, 1540], 432)).toEqual({ xs: [44, 210, 376] });
  });
  it('borde → recorte → hasta el del centro: tres cintas (432 cm: 440 120 1540 → 44, 210, 376)', () => {
    expect(cintasDesdeCotas([440, 120, 1540], 432)).toEqual({ xs: [44, 210, 376] });
  });
  it('si la última cota llega al centro de la puerta, no hay recorte en el centro', () => {
    expect(cintasDesdeCotas([600, 120, 1440], 432)).toEqual({ xs: [60, 360] });
  });
  it('avisa si la fila no llega al centro o acaba en un recorte', () => {
    expect(cintasDesdeCotas([440, 120, 1000], 432)).toHaveProperty('error');
    expect(cintasDesdeCotas([440, 120], 432)).toHaveProperty('error');
  });
});

describe('ejesDesdeTramos (E.T. de enrollable, 26/10/2026)', () => {
  it('suma los tramos en cm: del bajo al primer eje y de eje a eje', () => {
    expect(ejesDesdeTramos('60 71 60', 360)).toEqual({ ejes: [60, 131, 191], enMm: false });
  });
  it('en mm, como en la hoja, y sin la cabecera si el último tramo llega arriba', () => {
    expect(ejesDesdeTramos('600 710 600 1690', 360)).toEqual({ ejes: [60, 131, 191], enMm: true });
  });
  it('avisa si los tramos se pasan del alto o no hay alto', () => {
    expect(ejesDesdeTramos('3000 3000', 360)).toHaveProperty('error');
    expect(ejesDesdeTramos('60', 0)).toHaveProperty('error');
    expect(ejesDesdeTramos('60 x', 360)).toHaveProperty('error');
  });
});

describe('cintasDesdeCotas: avisos claros (26/10/2026)', () => {
  it('con la última cota en cm en vez de mm, dice cuál es', () => {
    expect(cintasDesdeCotas([60, 380, 120, 154], 432)).toEqual({ error: 'La última cota no cuadra: ¿es 1540 mm en vez de 154? Todas van en mm.' });
  });
  it('si no cuadra por otra cosa, dice cuánto suman y cuánto hay hasta el centro, en mm', () => {
    expect(cintasDesdeCotas([60, 380, 120, 1000], 432)).toHaveProperty('error', expect.stringMatching(/suman 1560 mm.*2100 mm/));
  });
});

describe('cintasDesdeFila (26/10/2026: la primera desde la izquierda, el recorte, hasta el siguiente…)', () => {
  it('AR2605035: como antes, con la cota hasta el recorte del centro', () => {
    expect(cintasDesdeFila([60, 380, 120, 1540], 432)).toEqual({ xs: [44, 210, 376], enMm: true });
  });
  it('sin llegar al centro: refleja los recortes escritos', () => {
    expect(cintasDesdeFila([440, 120, 500, 120], 432)).toEqual({ xs: [44, 106, 314, 376], enMm: true });
  });
  it('en cm si los recortes vienen como 12', () => {
    expect(cintasDesdeFila([44, 12], 432)).toEqual({ xs: [44, 376], enMm: false });
  });
  it('avisa si pasa del centro o no hay recortes', () => {
    expect(cintasDesdeFila([60, 380, 120, 3000], 432)).toHaveProperty('error', expect.stringMatching(/pasan del centro/));
    expect(cintasDesdeFila([440, 500], 432)).toHaveProperty('error', expect.stringMatching(/ningún recorte/));
  });
});
