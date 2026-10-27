import { describe, expect, it } from 'vitest';
import { puertaPlanoReal } from './__fixtures__/planosReales.ts';
import { calcularPuerta } from './calcular.ts';
import { dibujarAlzadoEnrollable } from './planoEnrollable.ts';
import { geometriaAlzado } from './alzado.ts';

// Medido por tmp/puertas-5247/medir-referencia.mjs en las copias del DWG y del bot de AR2605065.
// Tira: X 0–214, a 1 cm de los cachos (-1–8 / 206–215), Y 265,25–272,75 desde cabecera.
describe('AR2605065: E.T. entre ventanales alineada con los paños', () => {
  it('los mininúmeros conservan la letra de la puerta al cambiar de elemento', () => {
    const p = puertaPlanoReal('AR2605065');
    const g = geometriaAlzado(p, calcularPuerta(p), 'B');
    const minis = g.formas.filter(a => a.tipo === 'texto' && a.clase === 'puerta-texto-rotulador');
    expect(minis).toHaveLength(8);
    expect(minis.every(a => a.tipo === 'texto' && /^b\d+$/.test(a.lineas[0]))).toBe(true);
  });

  it('el plano cierra los cuatro lados de la tira de 214 × 7,5, no solo pinta el eje', () => {
    const l = dibujarAlzadoEnrollable(puertaPlanoReal('AR2605065'), 'A').lienzo;
    const segmento = (x1: number, y1: number, x2: number, y2: number) => l.lineas.some(a => a.capa === 'DISCO1'
      && a.x1 === x1 && a.y1 === y1 && a.x2 === x2 && a.y2 === y2);
    expect(segmento(0, -272.75, 214, -272.75)).toBe(true);
    expect(segmento(214, -272.75, 214, -265.25)).toBe(true);
    expect(segmento(214, -265.25, 0, -265.25)).toBe(true);
    expect(segmento(0, -265.25, 0, -272.75)).toBe(true);
    expect(l.lineas.some(a => a.capa === 'ROTULADOR' && a.y1 === -272.75 && a.y2 === -272.75)).toBe(true);
  });

  it('alzado y corte mantienen la tira a 1 cm de los bordes exteriores de los cachos y sus cuatro marcas de unión', () => {
    const p = puertaPlanoReal('AR2605065'), r = calcularPuerta(p);
    const g = geometriaAlzado(p, r);
    expect(g.formas.filter(a => a.tipo === 'rect' && a.clase === 'puerta-entrada-alzado' && a.y === 265.25))
      .toMatchObject([{ x: 0, ancho: 214, alto: 7.5 }]);
    const tiras = r.piezas.filter(a => a.nombre.startsWith('Entrada entre ventanales'));
    expect(tiras).toHaveLength(2);
    expect(tiras[0]).toMatchObject({ ancho: 214, alto: 8, origenAlzado: [0, 127] });
    expect(tiras[0].unionesCorte).toHaveLength(4);
    expect(tiras[1].unionesCorte ?? []).toHaveLength(0);
    for (const u of tiras[0].unionesCorte ?? []) {
      expect(g.formas.filter(a => a.tipo === 'texto' && a.lineas[0] === `a${u.numero}`))
        .toMatchObject([{ x: u.x, y: p.alto - tiras[0].origenAlzado![1] - u.y, tamano: 1 }]);
    }
    const cachos = r.piezas.filter(a => a.clase === 'cacho');
    expect(Math.min(...cachos.map(a => a.origenAlzado![0]))).toBe(-1);
    expect(Math.max(...cachos.map(a => a.origenAlzado![0] + a.ancho))).toBe(215);
    expect(r.piezas.filter(a => a.clase === 'cristal').map(a => [a.ancho, a.alto])).toEqual([[202, 56.5], [202, 67.5]]);
  });
});
