import { describe, expect, it } from 'vitest';
import { construirMorro, desglosePerfil } from './geometria.js';

// Longitudes independientes: suma de LINE / ARC originales, incluidas sus normales 3D.
const casos = [
  ['5319 cuerpo · 10EF3', 1610, 670, 100, 95, 2901.628123693461],
  ['5319 frente · 10EF2', 550, 570, 100, 95, 1691.257446393942],
  ['Gemelo cuerpo · 18DFD…18E02', 1910, 700, 50, 80, 3251.889742483322],
  ['Gemelo frente · 18E08…18E03', 610, 700, 50, 80, 1971.659137996184],
  ['1847 cuerpo · 110F1', 1610, 650, 0, 200, 2738.31853071796],
  ['1847 frente · 141FA', 710, 470, 0, 100, 1564.159265358861],
  ['5060 cuerpo · 17F1F', 1610, 850, 0, 100, 3224.159265358979],
  ['4281 cuerpo · 18363', 1560, 780, 180, 100, 3111.594134],
] as const;
describe('Recorrido por el exterior del arco, desde los levantamientos reales', () => {
  it('incluye aguas transversales y caída longitudinal del morro 3D del 5319', () => {
    const m = construirMorro({ ancho: 1610, frente: 550, diagonal: 1030, largoCuerpo: 2110,
      altoA: 670, altoB: 570, aguasA: 100, aguasB: 100, radioA: 95, radioB: 95, pasos: 4 });
    const k = (m.perfilA.length - 1) / 2;
    expect(m.perfilA[k]).toEqual([0, 805, 770]);
    expect(m.perfilB[k][1]).toBeCloseTo(805, 6);
    expect(m.perfilB[k][2]).toBeCloseTo(670, 6);
    expect(m.proyeccion).toBeCloseTo(883.1760866, 6);
    // Generatriz de la cumbrera: incluye el desnivel real de 100 mm entre secciones.
    expect(Math.hypot(...m.perfilB[k].map((x: number, i: number) => x - m.perfilA[k][i]))).toBeCloseTo(888.8194417, 6);
  });

  it.each(casos)('%s', (_, ancho, alto, aguas, radio, total) => {
    const d = desglosePerfil({ ancho, alto, aguas, radio });
    expect(d.total).toBeCloseTo(total, 3);
    expect(d.laterales + d.aguas + d.curvas).toBeCloseTo(total, 3);
    expect(d.curvas).toBeGreaterThan(0);
  });
  it('en el 5319 conserva los arcos reales, sin sustituirlos por cuerdas', () => {
    const d = desglosePerfil({ ancho: 1610, alto: 670, aguas: 100, radio: 95 });
    expect(d.laterales).toBeCloseTo(1172.142104, 3);
    expect(d.aguas).toBeCloseTo(1454.516907, 3);
    expect(d.curvas).toBeCloseTo(274.969113, 3);
  });
});
