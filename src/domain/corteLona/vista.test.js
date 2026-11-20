import { describe, expect, it } from 'vitest';
import { escribirDxf2004 } from './dxfCorte.js';
import { limitesModelo } from './vista.js';

const variable = (dxf, nombre) => {
  const l = dxf.replace(/\r/g, '').split('\n');
  const i = l.findIndex((x) => x === nombre);
  return [Number(l[i + 2]), Number(l[i + 4])];
};
const vistaActiva = (dxf) => {
  const s = dxf.replace(/\r/g, '');
  const ini = s.search(/\n {2}2\n\*Active\n/i), fin = s.indexOf('\n  0\n', ini + 1);
  const l = s.slice(ini, fin).split('\n'), g = {};
  for (let i = 1; i + 1 < l.length; i += 2) g[l[i].trim()] ??= Number(l[i + 1]);
  return g;
};

describe('vista al abrir el DXF', () => {
  it('el corte abre centrado en lo dibujado, sin tocar $EXTMIN (origen del CMT)', () => {
    const lineas = [{ capa: 'DISCO1', x1: 0, y1: 0, x2: 8000, y2: 0 }, { capa: 'DISCO1', x1: 8000, y1: 0, x2: 8000, y2: 2500 }];
    const dxf = escribirDxf2004({ lineas, textos: [] }, { leyenda: false });
    const v = vistaActiva(dxf);
    expect(v['12']).toBeCloseTo(1000 + 4000, 3);
    expect(v['22']).toBeCloseTo(1000 + 1250, 3);
    expect(v['40'] * v['41']).toBeGreaterThan(8000);
    expect(v['40']).toBeGreaterThan(2500);
    expect(variable(dxf, '$EXTMIN')).toEqual([-54.40842534326824, -28.52682595935192]);
  });

  it('el elevación (0,0) de un HATCH no cuenta como punto del dibujo', () => {
    const src = '  0\nSECTION\n  2\nENTITIES\n  0\nHATCH\n  8\n0\n 10\n0.0\n 20\n0.0\n 10\n50.0\n 20\n60.0\n 10\n70.0\n 20\n80.0\n  0\nENDSEC\n';
    expect(limitesModelo(src)).toEqual({ x0: 50, y0: 60, x1: 70, y1: 80 });
  });
});
