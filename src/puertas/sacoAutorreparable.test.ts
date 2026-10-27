import { describe, expect, it } from 'vitest';
import { base, pedidoDe } from './__fixtures__/ejemplos.ts';
import { geometriaAlzado } from './alzado.ts';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { dibujarAlzadoTaller } from './planoTaller.ts';
import { sacoPuerta } from './saco.ts';

describe('Autorreparable: una sola raya para soldar el saco del pedido (Iván, 27/10/2026)', () => {
  it.each([80, 110, 120])('saco de %s: plano, alzado y bot conservan solo la marca nueva', saco => {
    const p = base('PUERTAUTO', 300, 331);
    p.autorreparable = { saco, empates: [] };
    const s = sacoPuerta(p), y = -p.alto + s.rematado + 2;
    const r = calcularPuerta(p);
    const l = dibujarAlzadoTaller(p, 'A').lienzo;
    const rayasBajo = l.lineas.filter(a => a.capa === 'ROTULADOR' && a.y1 === a.y2 && a.y1 < -p.alto + 20);
    expect(rayasBajo).toEqual([{ capa: 'ROTULADOR', x1: 0, y1: y, x2: p.frente, y2: y }]);
    expect(l.lineas.filter(a => a.capa === 'referencias' && a.x1 === a.x2 && a.y1 === -p.alto))
      .toEqual([{ capa: 'referencias', x1: 0, y1: -p.alto, x2: 0, y2: y },
        { capa: 'referencias', x1: p.frente, y1: -p.alto, x2: p.frente, y2: -p.alto + s.rematado }]);
    const g = geometriaAlzado(p, r);
    expect(g.formas.filter(a => a.tipo === 'linea' && a.clase === 'puerta-rotulador' && a.y1 === a.y2 && a.y1 > p.alto - 20))
      .toMatchObject([{ y1: -y, y2: -y }]);
    const pano = r.piezas.find(a => a.clase === 'pano')!;
    expect(pano.marcas.filter(a => a[1] === a[3] && a[1] < 20)).toEqual([[1.5, 2, 298.5, 2]]);
    expect(r.piezas.find(a => a.clase === 'saco')?.alto).toBe(2 * (s.rematado + 2));
    const c = generarCortePuertas(pedidoDe('AR2605249', p)).cortes.find(c => c.colocadas.some(t => t.pieza.clase === 'pano'))!;
    const t = c.colocadas.find(t => t.pieza.clase === 'pano')!;
    const marcas = c.entidades.lineas.filter(a => a.capa === 'ROTULADOR' && (t.girada
      ? Math.abs(a.x1 - (t.x + t.pieza.alto * 10 - 20)) < .001 && a.x1 === a.x2 && Math.abs(a.y2 - a.y1) > 100
      : Math.abs(a.y1 - (t.y + 20)) < .001 && a.y1 === a.y2 && Math.abs(a.x2 - a.x1) > 100));
    expect(marcas).toHaveLength(1);
  });
});
