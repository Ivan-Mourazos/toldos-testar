import { describe, expect, it } from 'vitest';
import { buscarColocacion, huecosLibres, type RectanguloCorte } from './colocacionTetris.ts';

const pieza = (id: string, w: number, h: number, girar = false) => ({ id, formas: [{ w, h, girada: false }, ...girar ? [{ w: h, h: w, girada: true }] : []] });
const sitio = (id: string, x: number, y: number, w: number, h: number): RectanguloCorte => ({ id, x, y, w, h, girada: false });
const largo = (r: RectanguloCorte[]) => Math.max(0, ...r.map(p => p.x + p.w));
const ancho = (r: RectanguloCorte[]) => Math.max(0, ...r.map(p => p.y + p.h));
const solapan = (a: RectanguloCorte, b: RectanguloCorte) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

describe('Colocación como el Tetris', () => {
  it('rellena un hueco cruzando el límite de las columnas iniciales', () => {
    // La pieza de 4 × 2 atraviesa dos columnas: no cabe en ninguna de ellas por separado.
    const piezas = [pieza('a', 3, 4), pieza('b', 3, 4), pieza('c', 4, 2)];
    const inicial = [sitio('a', 0, 0, 3, 4), sitio('b', 3, 0, 3, 4), sitio('c', 6, 0, 4, 2)];
    const r = buscarColocacion(piezas, 6, inicial, { restantes: 100000 });
    expect(largo(r)).toBe(6);
    expect(r).toHaveLength(3);
  });
  it('a igual largo reduce el ancho ocupado antes de aprovechar los sobrantes', () => {
    const piezas = [pieza('a', 10, 2), pieza('b', 4, 2), pieza('c', 4, 2)];
    const inicial = [sitio('a', 0, 0, 10, 2), sitio('b', 0, 2, 4, 2), sitio('c', 0, 4, 4, 2)];
    const r = buscarColocacion(piezas, 6, inicial, { restantes: 100000 });
    expect(largo(r)).toBe(10);
    expect(ancho(r)).toBe(4);
  });
  it('explora los dos giros y distintos órdenes sin imponer guillotina', () => {
    const piezas = [pieza('a', 6, 2, true), pieza('b', 4, 3, true), pieza('c', 4, 3, true)];
    const inicial = [sitio('a', 0, 0, 6, 2), sitio('b', 6, 0, 4, 3), sitio('c', 10, 0, 4, 3)];
    const r = buscarColocacion(piezas, 6, inicial, { restantes: 100000 });
    expect(largo(r)).toBe(6);
    expect(r.some(p => p.girada)).toBe(true);
    r.forEach((a, i) => {
      expect(a.y + a.h).toBeLessThanOrEqual(6);
      r.slice(i + 1).forEach(b => expect(solapan(a, b)).toBe(false));
    });
  });
  it('agota un presupuesto de nodos reproducible y conserva la solución inicial completa', () => {
    const piezas = [pieza('a', 3, 4, true), pieza('b', 3, 4, true), pieza('c', 4, 2, true)];
    const inicial = [sitio('a', 0, 0, 3, 4), sitio('b', 3, 0, 3, 4), sitio('c', 6, 0, 4, 2)];
    const ejecutar = () => buscarColocacion(piezas, 6, inicial, { restantes: 30 });
    expect(ejecutar()).toEqual(ejecutar());
    expect(largo(ejecutar())).toBeLessThanOrEqual(largo(inicial));
    expect(buscarColocacion(piezas, 6, inicial, { restantes: 0 })).toEqual(inicial);
  });
  it('resuelve un molinillo que no admite cortes de guillotina', () => {
    const piezas = [pieza('a', 4, 2), pieza('b', 2, 4), pieza('c', 4, 2), pieza('d', 2, 4), pieza('e', 2, 2)];
    const inicial = [sitio('a', 0, 0, 4, 2), sitio('b', 4, 0, 2, 4), sitio('c', 6, 0, 4, 2), sitio('d', 10, 0, 2, 4), sitio('e', 12, 0, 2, 2)];
    expect(largo(buscarColocacion(piezas, 6, inicial, { restantes: 1000000 }))).toBe(6);
  });
  it('a igual largo y ancho reúne el sobrante en un retal rectangular grande', () => {
    const piezas = [pieza('a', 8, 2), pieza('b', 2, 2), pieza('c', 2, 2)];
    const inicial = [sitio('a', 0, 0, 8, 2), sitio('b', 2, 2, 2, 2), sitio('c', 6, 2, 2, 2)];
    const r = buscarColocacion(piezas, 4, inicial, { restantes: 100000 });
    expect([largo(r), ancho(r)]).toEqual([8, 4]);
    expect(Math.max(...huecosLibres(r, 8, 4).map(h => h.w * h.h))).toBe(8);
  });
  it('encuentra huecos reales sin invadir piezas escalonadas, aunque sus X sean distintas', () => {
    const ocupadas = [sitio('a', 0, 0, 6, 2), sitio('b', 2, 2, 4, 2), sitio('c', 4, 4, 2, 2)];
    const huecos = huecosLibres(ocupadas, 6, 6);
    expect(huecos.reduce((s, h) => s + h.w * h.h, 0)).toBe(12);
    huecos.forEach((a, i) => {
      ocupadas.forEach(b => expect(solapan({ ...a, id: '', girada: false }, b)).toBe(false));
      huecos.slice(i + 1).forEach(b => expect(solapan({ ...a, id: '', girada: false }, { ...b, id: '', girada: false })).toBe(false));
    });
  });

  it('coincide con una enumeración independiente de todas las casillas en problemas pequeños', () => {
    // Oráculo deliberadamente distinto: orden fijo y TODAS las coordenadas enteras, sin apoyos ni poda geométrica.
    function cabe(piezas: ReturnType<typeof pieza>[], l: number, h: number, puestas: RectanguloCorte[] = []): boolean {
      if (puestas.length === piezas.length) return true;
      const p = piezas[puestas.length];
      for (const f of p.formas) for (let x = 0; x <= l - f.w; x++) for (let y = 0; y <= h - f.h; y++) {
        const r = { id: p.id, ...f, x, y };
        if (puestas.every(q => !solapan(r, q)) && cabe(piezas, l, h, [...puestas, r])) return true;
      }
      return false;
    }
    for (const medidas of [
      [[3, 2], [2, 2], [1, 3]], [[4, 1], [2, 3], [3, 2]], [[3, 3], [2, 1], [2, 2]],
      [[1, 3], [2, 3], [3, 1]], [[4, 2], [3, 1], [1, 2]], [[2, 2], [2, 2], [3, 1]],
    ]) {
      const piezas = medidas.map(([w, h], i) => pieza(String(i), w, h, true));
      let x = 0;
      const inicial = piezas.map(p => { const f = p.formas[0]; const r = sitio(p.id, x, 0, f.w, f.h); x += f.w; return r; });
      const r = buscarColocacion(piezas, 4, inicial, { restantes: 1000000 });
      let esperado: number[] = [];
      for (let l = 1; l <= largo(inicial) && !esperado.length; l++) for (let h = 1; h <= 4; h++) {
        if (cabe(piezas, l, h)) { esperado = [l, h]; break; }
      }
      expect([largo(r), ancho(r)], JSON.stringify(medidas)).toEqual(esperado);
    }
  });
});
