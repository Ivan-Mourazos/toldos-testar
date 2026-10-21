import { describe, expect, it } from 'vitest';
import { calcularPuerta } from './calcular.ts';
import { generarCortePuertas } from './corte.ts';
import { autorreparable, base, pedidoDe } from './__fixtures__/ejemplos.ts';

describe('Identificación de las soldaduras del corte', () => {
  it('cada empate normal lleva el mismo mininúmero en ambos paños, a 1 del borde y 4 de las puntas', () => {
    const p = autorreparable();
    const r = generarCortePuertas(pedidoDe('AR2604904', p));
    const c = r.cortes.find(c => c.material === 'LAC900 AZUL 5002')!;
    const minis = c.entidades.textos.filter(t => t.capa === 'ROTULADOR' && t.valor === 'a1');
    expect(minis).toHaveLength(4);
    expect(minis.every(t => t.h === 10)).toBe(true);
    for (const colocada of c.colocadas.filter(t => t.pieza.clase === 'pano')) {
      const esperadas = colocada.pieza.unionesCorte!;
      expect(esperadas).toHaveLength(2);
      for (const a of esperadas) {
        const x = colocada.x + 10 * (colocada.girada ? colocada.pieza.alto - a.y : a.x);
        const y = colocada.y + 10 * (colocada.girada ? a.x : a.y);
        expect(minis.some(t => Math.abs(t.x - x) < .001 && Math.abs(t.y - y) < .001)).toBe(true);
      }
    }
    expect(r.archivo!.dxf).toContain('\r\na1\r\n');
    expect(c.entidades.textos.some(t => t.valor.startsWith('UNIÓN '))).toBe(false);
  });

  it('la E.T. incorporada usa los mismos mininúmeros de 1 cm dentro del solape de 7,5', () => {
    const p = base('PUERTAENR', 474, 700);
    p.enrollable = { T: 509, D: 60, margen: 11, empates: [] };
    p.entradas = [60, 131, 191, 441].map(altura => ({ altura, diametro: 30, largo: 474, alto: 8, huecos: [] }));
    const r = calcularPuerta(p), panos = r.piezas.filter(p => p.clase === 'pano');
    expect(r.uniones[0].solape).toBe(7.5);
    expect(panos.flatMap(p => p.unionesCorte ?? []).map(t => t.numero)).toEqual([1, 1, 1, 1]);
    expect(panos[0].unionesCorte!.every(t => t.y === panos[0].alto - 1)).toBe(true);
    expect(panos[1].unionesCorte!.every(t => t.y === 1)).toBe(true);
  });

  it('AR2604725: el saco partido también identifica las dos mitades que se sueldan', () => {
    const p = base('PUERTAENR', 474, 430);
    p.enrollable = { T: 239, D: 60, margen: 11, empates: [], sacoPartido: true };
    const r = generarCortePuertas(pedidoDe('AR2604725', p));
    const saco = r.cortes.find(c => c.material === p.materialSaco)!;
    expect(saco.entidades.textos.filter(t => t.capa === 'ROTULADOR' && t.h === 10 && t.valor === 'a1')).toHaveLength(4);
  });

  it('dos grupos de empates de la misma puerta no reutilizan un número y las puertas llevan su letra', () => {
    const p = autorreparable();
    p.autorreparable.empates = [100, 200];
    const r = generarCortePuertas(pedidoDe('PRUEBA', p, p));
    const textos = r.cortes.flatMap(c => c.entidades.textos).filter(t => t.capa === 'ROTULADOR');
    for (const valor of ['a1', 'a2', 'b1', 'b2']) expect(textos.filter(t => t.valor === valor)).toHaveLength(4);
  });
});
