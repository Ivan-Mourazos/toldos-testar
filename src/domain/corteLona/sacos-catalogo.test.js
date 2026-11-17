import { describe, expect, it } from 'vitest';
import { SACOS, MARGEN_SACO_CM, sacosEnHuecos, sacosEnRetales, sacosEnRectangulos, valorarSacos } from './colocacion.js';
import { sacosDeStock } from '../../remolques/corte/sacos.js';

const of = '0230811';
const enHueco = (w, h) => sacosEnHuecos([{ x: 0, y: 0, ancho: w, hueco: 100 }], h + 100, of);
const enRemolque = (w, h) => sacosDeStock([{ x: 0, y: 0, ancho: w, hueco: 100 }], h + 100, of).sacos;

describe('catálogo de sacos de stock, Iván, 17/11/2026', () => {
  it('solo admite la tira de 260×85 y el trozo de 130×85, con ±10 cm', () => {
    expect(SACOS).toEqual([[260, 85], [130, 85]]);
    expect(MARGEN_SACO_CM).toBe(10);
  });

  for (const [nombre, llenar] of [['toldos y puertas', enHueco], ['remolques', enRemolque]]) {
    describe(nombre, () => {
      it('prefiere una tira a dos trozos cuando cabe', () => {
        const sacos = llenar(2600, 850);
        expect(sacos).toHaveLength(1);
        expect(sacos[0]).toMatchObject({ medida: '260X85', medidaCatalogo: '260X85', ancho: 2600, hueco: 850, of });
      });
      it('140×300: cuatro trozos dan dos sacos y ganan a una tira', () => {
        const sacos = llenar(1400, 3000);
        expect(sacos).toHaveLength(4);
        expect(sacos.every(s => s.medidaCatalogo === '130X85' && s.medida === '140X75')).toBe(true);
      });
      it('285×120: una tira gana a tres trozos porque el impar no completa otro saco', () => {
        const sacos = llenar(2850, 1200);
        expect(sacos).toHaveLength(1);
        expect(sacos[0].medidaCatalogo).toBe('260X85');
        expect(valorarSacos(sacos).sacos).toBe(1);
      });
      it('descarta el último medio saco si salen tres trozos', () => {
        const sacos = llenar(1300, 2250);
        expect(sacos).toHaveLength(2);
        expect(sacos.every(s => s.medidaCatalogo === '130X85')).toBe(true);
      });
      it('un trozo suelto no es un saco completo', () => {
        expect(llenar(1300, 850)).toEqual([]);
      });
      it.each([[2500, 750, '250X75'], [2700, 950, '270X95'], [750, 2500, '250X75'], [950, 2700, '270X95']])(
        'ajusta ambos lados del retal de %i×%i mm y rotula %s', (w, h, medida) => {
          const sacos = llenar(w, h);
          expect(sacos).toHaveLength(1);
          expect(sacos[0]).toMatchObject({ medida, ancho: w, hueco: h });
        });
      it.each([[2500, 740], [1190, 1700], [2400, 740]])('no sale de la tolerancia en %i×%i mm', (w, h) => {
        expect(llenar(w, h)).toEqual([]);
      });
      it('por debajo del mínimo de la tira solo admite dos trozos válidos', () => {
        const sacos = llenar(2490, 750);
        expect(sacos).toHaveLength(2);
        expect(sacos.every(s => s.medidaCatalogo === '130X85')).toBe(true);
      });
    });
  }

  it('cierra parejas entre dos retales: tres trozos más uno ganan a una tira más uno suelto', () => {
    const ocupadas = [{ x: 0, y: 0, ancho: 2850, hueco: 100 },
      { x: 2850, y: 0, ancho: 100, hueco: 1300 }, { x: 2950, y: 0, ancho: 1300, hueco: 450 }];
    const rectangulos = [{ x: 0, y: 100, w: 2850, h: 1200 }, { x: 2950, y: 450, w: 1300, h: 850 }];
    for (const sacos of [sacosEnRectangulos(rectangulos, of), sacosEnHuecos(ocupadas, 1300, of),
      sacosEnRetales(ocupadas, 1300, of), sacosDeStock(ocupadas, 1300, of).sacos]) {
      expect(sacos).toHaveLength(4);
      expect(sacos.every(s => s.medidaCatalogo === '130X85')).toBe(true);
      expect(valorarSacos(sacos).sacos).toBe(2);
      expect(sacos.some(s => s.x >= 2950)).toBe(true);
    }
  });

  it('el Tetris recibe solo sacos cerrados aunque se valore un plan con trozos impares', () => {
    const trozo = { medidaCatalogo: '130X85', x: 0, y: 0, ancho: 1300, hueco: 850 };
    expect(valorarSacos([trozo]).sacos).toBe(0);
    expect(valorarSacos([trozo, trozo, trozo]).sacos).toBe(1);
  });

  it('empareja trozos de huecos separados en todo el material y descarta solo el último', () => {
    const ocupadas = [0, 1400, 2800].flatMap(x => [
      { x, y: 0, ancho: 1300, hueco: 100 }, { x: x + 1300, y: 0, ancho: 100, hueco: 950 },
    ]);
    for (const sacos of [sacosEnHuecos(ocupadas, 950, of), sacosEnRetales(ocupadas, 950, of), sacosDeStock(ocupadas, 950, of).sacos]) {
      expect(sacos).toHaveLength(2);
      expect(new Set(sacos.map(s => s.x)).size).toBe(2);
      expect(sacos.every(s => [0, 1400, 2800].includes(s.x))).toBe(true);
      expect(sacos.every(s => s.medida === '130X85')).toBe(true);
    }
  });

  it('remolques rotula la medida real incluso en el rótulo agrupado', () => {
    const r = sacosDeStock([{ x: 0, y: 0, ancho: 2700, hueco: 100 }], 1050, of);
    expect(r.textos.some(t => t.valor === 'SACO 270X95 STOCK')).toBe(true);
    expect(r.textos.some(t => /260X85/.test(t.valor))).toBe(false);
  });
});
