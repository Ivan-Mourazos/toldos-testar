import { describe, expect, it } from 'vitest';
import { calcularMedidasCal, MEDIDAS_CAL_5319 } from './medidas.ts';
import { construirMorro, desglosePerfil } from './geometria.js';

// AR2605331, Metales Jaifer: hoja sin curva y LINE 16EC6…16ECD del levantamiento.
const medidas = { ...MEDIDAS_CAL_5319, recto: 200, ancho: 151, frente: 61, diagonal: 98,
  alto: 65, altoFrente: 65, aguas: 0, aguasFrente: 0, radio: 0, margenBajo: 3,
  puerta: 'NINGUNA' as const, puertaMorro: undefined, refuerzoMfd: false, laterales: [] };

describe('Contraste del 5331 sin curvas', () => {
  it('calcula el contorno 65 + 152 + 65 sin aumento de curva: corte 288', () => {
    const g = calcularMedidasCal(medidas);
    expect(g.desarrolloCuerpo).toMatchObject({ total: 2820, curvas: 0, holgura: 0, bastillas: 60, corte: 2880 });
    expect(g.proyeccion).toBeCloseTo(881.8163074, 6);
    expect(g.piezas.flatMap(p => p.corte).some(p => p.tipo === 'arco')).toBe(false);
  });

  it('levanta y desarrolla el morro sin inventar radios ni alterar sus longitudes', () => {
    const m = construirMorro({ ancho: 1520, frente: 620, diagonal: 990, largoCuerpo: 2010,
      altoA: 650, altoB: 650, aguasA: 0, aguasB: 0, radioA: 0, radioB: 0, pasos: 5 });
    const largo = (ps: number[][]) => ps.slice(1).reduce((s, p, i) => s + Math.hypot(...p.map((x, k) => x - ps[i][k])), 0);
    expect(largo(m.desarrollo.a)).toBeCloseTo(2820, 6);
    expect(largo(m.desarrollo.b)).toBeCloseTo(1920, 6);
    expect(Math.hypot(...m.desarrollo.a[0].map((x: number, i: number) => x - m.desarrollo.b[0][i]))).toBeCloseTo(990, 6);
  });

  it('incluye aguas aun sin radio y mantiene el aumento de curva a cero', () => {
    const g = calcularMedidasCal({ ...medidas, aguas: 10, aguasFrente: 6 });
    expect(g.desarrolloCuerpo.total).toBeCloseTo(desglosePerfil({ ancho: 1520, alto: 650, aguas: 100, radio: 0 }).total, 6);
    expect(g.desarrolloCuerpo.holgura).toBe(0);
  });
});
