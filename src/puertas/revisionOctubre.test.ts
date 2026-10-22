import { describe, expect, it } from 'vitest';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { dibujarAlzadoTaller } from './planoTaller.ts';
import { base, pedidoDe } from './__fixtures__/ejemplos.ts';
import { puertaPlanoReal } from './__fixtures__/planosReales.ts';

describe('Correcciones de taller del 22 de octubre por la noche', () => {
  it.each(['AR2605036', 'AR2604904'])('%s: entradas y sacos sin raya central de rotulador', id => {
    const r = calcularPuerta(puertaPlanoReal(id));
    const piezas = [...r.piezas, ...r.alternativasSaco?.entero ?? [], ...r.alternativasSaco?.partido ?? []];
    expect(piezas.filter(p => ['entrada', 'saco'].includes(p.clase)).every(p => p.marcas.length === 0)).toBe(true);
  });

  it('autorreparable: las tres marcas superiores se miden desde la cabecera terminada', () => {
    const p = puertaPlanoReal('AR2604904'), r = calcularPuerta(p);
    const superior = r.piezas.filter(p => p.clase === 'pano').at(-1)!;
    for (const distancia of [3.5, 20, 30]) expect(superior.marcas.some(m => Math.abs(m[1] - (superior.alto - 3.5 - distancia)) < .001
      && m[1] === m[3] && Math.abs(m[2] - m[0]) > p.frente / 2)).toBe(true);
  });

  it('el bot abre los dos huecos laterales de cada entrada y conserva cerrados los de cintas', () => {
    const r = generarCortePuertas(pedidoDe('AR2605036', puertaPlanoReal('AR2605036')));
    const c = r.cortes.find(c => c.colocadas.some(t => t.pieza.clase === 'entrada'))!;
    const t = c.colocadas.find(t => t.pieza.clase === 'entrada')!;
    expect(t.girada).toBe(false);
    const x = t.x + 10, h = t.pieza.huecos[0];
    expect(c.entidades.lineas.some(l => l.capa === 'CUTTER' && l.x1 === x && l.x2 === x
      && l.y1 >= t.y + h.y * 10 && l.y1 <= t.y + (h.y + h.alto) * 10)).toBe(false);
    const alzado = dibujarAlzadoTaller(puertaPlanoReal('AR2605036'), 'A').lienzo;
    expect(alzado.polilineas.filter(p => p.capa === 'CUTTER').length).toBeGreaterThan(0);
  });

  it('el saco partido conserva las dos mitades pegadas y compartiendo corte', () => {
    const r = generarCortePuertas(pedidoDe('AR2605036', puertaPlanoReal('AR2605036')));
    const c = r.cortes.find(c => c.opcion === 'saco-partido')!;
    expect(c.colocadas).toHaveLength(2);
    const [a, b] = c.colocadas;
    expect(a.girada).toBe(false); expect(b.girada).toBe(false);
    expect(b.x).toBe(a.x); expect(b.y).toBe(a.y + a.pieza.alto * 10);
  });

  it('autorreparable: conserva el frente a lo largo si girar no evita un empate', () => {
    const p = base('PUERTAUTO', 200, 210);
    const c = generarCortePuertas(pedidoDe('AR2600001', p)).cortes.find(c => c.colocadas.some(t => t.pieza.clase === 'pano'))!;
    expect(c.colocadas.find(t => t.pieza.clase === 'pano')!.girada).toBe(false);
  });

  it('las piezas que llenan el ancho del rollo preceden a las demás', () => {
    const p = base('PUERTAUTO', 426, 515);
    const c = generarCortePuertas(pedidoDe('AR2600001', p)).cortes.find(c => c.colocadas.some(t => t.pieza.clase === 'pano'))!;
    const completas = c.colocadas.filter(t => (t.girada ? t.pieza.ancho : t.pieza.alto) === p.rollo);
    const otras = c.colocadas.filter(t => !completas.includes(t));
    expect(completas.length).toBeGreaterThan(0);
    expect(Math.max(...completas.map(t => t.x))).toBeLessThan(Math.min(...otras.map(t => t.x)));
  });

  it('las entradas iguales de autorreparable llevan el mismo nombre', () => {
    const r = calcularPuerta(puertaPlanoReal('AR2604904'));
    expect(new Set(r.piezas.filter(p => p.clase === 'entrada').map(p => p.nombre)).size).toBe(1);
  });

  it('apilable: OF, código y REVÉS comparten fila en tres columnas', () => {
    const p = puertaPlanoReal('AR2605036'), l = dibujarAlzadoTaller(p, 'A').lienzo;
    const textos = [p.of, 'A1', 'REVÉS'].map(v => l.textos.find(t => t.valor === v)!);
    expect(new Set(textos.map(t => t.y)).size).toBe(1);
    expect(new Set(textos.map(t => t.x)).size).toBe(3);
  });
});
