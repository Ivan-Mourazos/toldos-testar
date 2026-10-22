import { describe, expect, it } from 'vitest';
import { esVertical, geometriaAlzado, textoCota, type CotaAlzado } from './alzado.ts';
import { calcularPuerta, nuevaPuerta } from './calcular.ts';
import { apilable, autorreparable, puerta4638 } from './__fixtures__/ejemplos.ts';
import type { Puerta } from './tipos.ts';

const cotas = (p: Puerta) => geometriaAlzado(p, calcularPuerta(p)).formas.filter((f): f is CotaAlzado => f.tipo === 'cota');
/** La cadena de la derecha: las cotas verticales que van de un hito a otro en el borde derecho. */
const cadena = (p: Puerta) => cotas(p).filter(c => esVertical(c) && c.x1 === p.frente && !c.sufijo && Math.abs(c.linea - (p.frente + 34)) < 1e-9);

describe('geometriaAlzado', () => {
  it.each([
    ['enrollable AR2604638', puerta4638()],
    ['apilable', apilable()],
    ['autorreparable', autorreparable()],
  ])('%s: una sola cota de alto total y la cadena de la derecha suma el alto', (_nombre, p) => {
    const totales = cotas(p).filter(c => esVertical(c) && c.sufijo === ' cm');
    expect(totales).toHaveLength(1);
    expect(totales[0].valor).toBe(p.alto);
    const tramos = cadena(p);
    expect(tramos.length).toBeGreaterThan(1);
    expect(tramos.reduce((s, c) => s + c.valor, 0)).toBeCloseTo(p.alto, 6);
    // Cada tramo mide lo que dice.
    for (const c of tramos) expect(Math.abs(c.y2 - c.y1)).toBeCloseTo(c.valor, 6);
    const frente = cotas(p).filter(c => !esVertical(c) && c.sufijo === ' cm');
    expect(frente.map(c => c.valor)).toEqual([p.frente]);
  });

  it('AR2604638: la cadena es pie, tramo, D y T, y el cristal se acota con su ancho de corte', () => {
    const p = puerta4638();
    expect(cadena(p).map(textoCota)).toEqual(['60', '71', 'D 60', 'T 123']);
    const cristal = cotas(p).find(c => !esVertical(c) && c.marcas === 4 && c.linea === 123 + 18.5);
    expect(cristal?.valor).toBe(172 - 12 + 4);
    const formas = geometriaAlzado(p, calcularPuerta(p)).formas;
    expect(formas.filter(f => f.tipo === 'rect' && f.clase === 'puerta-cacho')).toHaveLength(2);
    expect(formas.some(f => f.tipo === 'texto' && f.taller && f.lineas.join(' ').includes('0232309'))).toBe(true);
  });

  it('dibuja con 400 cm si faltan frente y alto', () => {
    const p = nuevaPuerta('PUERTAENR');
    const g = geometriaAlzado(p, calcularPuerta(p));
    expect([g.F, g.H]).toEqual([400, 400]);
    expect(g.vista.ancho).toBeGreaterThan(400);
  });
});
