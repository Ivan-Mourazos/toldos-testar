import { describe, expect, it } from 'vitest';
import { apilable, base, pedidoDe } from './__fixtures__/ejemplos.ts';
import { generarCortePuertas } from './corte.ts';
import { hojasPuertas } from './planoEnrollable.ts';
import { formatoMl, metrosPorOf } from './metrosPorOf.ts';
import type { CortePuertas, PiezaPuerta } from './tipos.ts';

// Iván, 17/11/2026: en un pedido de varias puertas con un corte largo hay que poner unos ML a cada OF. Repartir a partes
// iguales no vale si una puerta es mucho más grande: los ML del rollo se reparten por la superficie de las piezas de cada
// OF, solo de la lona principal, y se anotan junto al material en el cajetín de cada presentación.
const pieza = (of: string, ancho: number, alto: number, extra: Partial<PiezaPuerta> = {}): PiezaPuerta => ({
  id: `${of}-${ancho}`, nombre: 'Paño', clase: 'pano', ancho, alto, cantidad: 1, material: 'LAC900 AZUL', rollo: 300, of,
  radio: 0, contorno: [], marcas: [], textos: [], huecos: [], ...extra });
const corte = (largoMm: number, piezas: PiezaPuerta[], extra: Partial<CortePuertas> = {}): CortePuertas => ({
  material: 'LAC900 AZUL', anchoRollo: 3000, largo: largoMm, opcion: 'principal',
  entidades: { lineas: [], textos: [], arcos: [], circulos: [] } as unknown as CortePuertas['entidades'],
  colocadas: piezas.map(p => ({ pieza: p, x: 0, y: 0, girada: false })), ...extra });

describe('ML de la lona por OF', () => {
  it('reparte el largo del corte por la superficie de cada OF, no a partes iguales', () => {
    const ml = metrosPorOf([corte(40000, [pieza('A', 300, 400), pieza('B', 150, 400), pieza('C', 90, 400), pieza('D', 60, 400)])], 'LAC900 AZUL');
    expect(Object.fromEntries(ml)).toEqual({ A: 2000, B: 1000, C: 600, D: 400 });
  });

  it('cuadra al centímetro con el largo del corte', () => {
    const ml = metrosPorOf([corte(10000, [pieza('A', 100, 100), pieza('B', 100, 100), pieza('C', 100, 100)])], 'LAC900 AZUL');
    expect([...ml.values()].reduce((s, v) => s + v, 0)).toBe(1000);
    expect([...ml.values()].sort()).toEqual([333, 333, 334]);
  });

  it('suma las piezas «X2» tantas veces como se cortan', () => {
    const ml = metrosPorOf([corte(3000, [pieza('A', 100, 100, { multiplicador: 2 }), pieza('B', 100, 100)])], 'LAC900 AZUL');
    expect(Object.fromEntries(ml)).toEqual({ A: 200, B: 100 });
  });

  it('solo cuenta la lona principal: ni otros materiales ni las alternativas del saco', () => {
    const ml = metrosPorOf([
      corte(1000, [pieza('A', 100, 100)]),
      corte(5000, [pieza('B', 100, 100, { material: 'LAC900 NEGRO' })], { material: 'LAC900 NEGRO' }),
      corte(2000, [pieza('B', 100, 100)], { opcion: 'saco-entero' }),
    ], 'LAC900 AZUL');
    expect(Object.fromEntries(ml)).toEqual({ A: 100 });
  });

  it('se escribe en metros con coma', () => {
    expect(formatoMl(2000)).toBe('20,00 ML');
    expect(formatoMl(333)).toBe('3,33 ML');
  });

  it('cada presentación lleva los ML de su OF junto al material, y entre todas suman el corte de la lona', () => {
    const grande = { ...apilable(), of: '0290001' }, pequena = { ...base('PUERTAPLE', 150, 250), of: '0290002',
      apilable: { ...apilable().apilable, pasos: [60, 60] }, entradas: [], ventanas: [] };
    const pedido = pedidoDe('AR2600001', grande, pequena);
    const { cortes } = generarCortePuertas(pedido);
    const hojas = hojasPuertas(pedido, [], cortes);
    const ml = hojas.map(h => /· (\d+),(\d\d) ML$/.exec(h.cajetin.MATERIAL)!).map(m => Number(m[1]) * 100 + Number(m[2]));
    expect(hojas[0].cajetin.MATERIAL).toMatch(/^LAC900 AZUL 5002 · \d+,\d\d ML$/);
    expect(ml[0]).toBeGreaterThan(ml[1]);
    const largo = cortes.filter(c => c.opcion === 'principal' && c.material === 'LAC900 AZUL 5002').reduce((s, c) => s + Math.round(c.largo / 10), 0);
    expect(ml[0] + ml[1]).toBe(largo);
  });

  it('sin el corte, el cajetín queda como antes', () => {
    const pedido = pedidoDe('AR2600001', apilable());
    expect(hojasPuertas(pedido, [])[0].cajetin.MATERIAL).toBe('LAC900 AZUL 5002');
  });
});
