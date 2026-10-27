import { describe, expect, it } from 'vitest';
import { base } from './__fixtures__/ejemplos.ts';
import { geometriaAlzado } from './alzado.ts';
import { calcularPuerta } from './calcular.ts';
import { dibujarAlzadoTaller } from './planoTaller.ts';

const horizontal = (marcas: number[][], y: number) => marcas.some(a => Math.abs(a[1] - y) < .001 && Math.abs(a[3] - y) < .001 && Math.abs(a[2] - a[0]) > 3);

describe('Empates normales: raya solo en el paño de arriba y flecha hacia el borde (Iván, 27/10/2026)', () => {
  it.each(['PUERTAUTO', 'PUERTAENR'] as const)('%s conserva solape y mininúmeros, sin raya en el paño inferior', modelo => {
    const p = base(modelo, 340, modelo === 'PUERTAUTO' ? 395 : 600);
    if (modelo === 'PUERTAUTO') p.autorreparable = { saco: 120, empates: [299] };
    else p.enrollable = { T: 350, D: 60, margen: 6, empates: [], saco: 120 };
    const r = calcularPuerta(p), panos = r.piezas.filter(a => a.clase === 'pano');
    if (modelo === 'PUERTAUTO') expect(panos.map(a => a.alto)).toEqual([300, 87.5]);
    const g = geometriaAlzado(p, r), l = dibujarAlzadoTaller(p, 'A').lienzo;
    for (const u of r.uniones) {
      expect(u.solape).toBe(2);
      const arriba = panos.find(a => Math.abs(a.origenAlzado![1] - (u.altura - u.solape / 2)) < .001)!;
      const abajo = panos.find(a => Math.abs(a.origenAlzado![1] + a.alto - (u.altura + u.solape / 2)) < .001)!;
      expect(horizontal(arriba.marcas, 2)).toBe(true);
      expect(horizontal(abajo.marcas, abajo.alto - 2)).toBe(false);
      expect(arriba.marcas.some(a => a[0] === arriba.ancho / 2 && a[2] === a[0] && a[1] === 2 && a[3] < a[1])).toBe(true);
      const flecha = arriba.marcas.filter(a => Math.abs(a[0] - arriba.ancho / 2) < 2 && Math.abs(a[2] - arriba.ancho / 2) < 2 && a[1] <= 2 && a[3] <= 2);
      expect(flecha).toHaveLength(4);
      expect(flecha.every(a => a[1] >= 0 && a[3] >= 0)).toBe(true);
      expect(arriba.unionesCorte).toHaveLength(2);
      const numero = arriba.unionesCorte![0].numero;
      const puntos = (a: typeof arriba) => a.unionesCorte!.filter(m => m.numero === numero).map(m => [m.x, a.origenAlzado![1] + m.y, m.numero]);
      expect(puntos(abajo)).toEqual(puntos(arriba));
      const yArriba = p.alto - u.altura - 1, yAbajo = p.alto - u.altura + 1;
      expect(g.formas.some(a => a.tipo === 'linea' && a.clase === 'puerta-rotulador' && a.y1 === yArriba && a.y2 === yArriba)).toBe(true);
      expect(g.formas.some(a => a.tipo === 'linea' && a.clase === 'puerta-rotulador' && a.y1 === yAbajo && a.y2 === yAbajo)).toBe(false);
      expect(l.lineas.some(a => a.capa === 'ROTULADOR' && a.y1 === -yArriba && a.y2 === -yArriba)).toBe(true);
      expect(l.lineas.some(a => a.capa === 'ROTULADOR' && a.y1 === -yAbajo && a.y2 === -yAbajo)).toBe(false);
    }
    if (modelo === 'PUERTAUTO') {
      expect(horizontal(panos[0].marcas, 2)).toBe(true);
      for (const d of [3.5, 20, 30]) expect(horizontal(panos[1].marcas, p.alto - d - panos[1].origenAlzado![1])).toBe(true);
    }
  });
});
