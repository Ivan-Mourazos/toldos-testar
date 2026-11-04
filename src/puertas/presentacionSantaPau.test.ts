import { describe, expect, it } from 'vitest';
import { pedidosSantaPau } from './__fixtures__/santapau.ts';
import { geometriaAlzado } from './alzado.ts';
import { calcularPuerta } from './calcular.ts';
import { escribirPlanoPuertas } from './plano.ts';
import { generarCortePuertas } from './corte.ts';
import { crucesRotulosLineas, recortesRotulos, solapesRotulos, type RotuloAuditable } from './auditoriaRotulos.ts';
import { presentacionesDxf } from '../flujoDwg/planoDxf.js';
import { FRANJAS_SANTA_PAU, franjasSantaPau } from './franjasSantaPau.ts';
import { tramosCota } from './tramosCota.ts';

function seccion(puntos: number[][], y: number) {
  const xs: number[] = [];
  puntos.forEach(([x, a], i) => { const [u, b] = puntos[(i + 1) % puntos.length]; if ((a > y) !== (b > y)) xs.push(x + (u - x) * (y - a) / (b - a)); });
  return xs.sort((a, b) => a - b);
}

describe('Santa Pau: franjas y legibilidad de las hojas', () => {
  it.each(pedidosSantaPau().flatMap(p => p.elementos.map((e, i) => ({ pedido: p.orderCode, p: e.input, letra: String.fromCharCode(65 + i) }))))('$pedido $letra: los rótulos usan el centro de la pieza y los refuerzos son simétricos', ({ p, letra }) => {
    const l = geometriaAlzado(p, calcularPuerta(p), letra).cad!;
    const valores = [`${letra}1`, `${letra}2`, letra, 'REVÉS', p.of, 'MACARRON (5.5 MM)'];
    const centrales = l.textos.filter(t => valores.includes(t.valor) || /^X\d+$/.test(t.valor) || /5 CM \(HUECOS\)|suave soldado|bravo.*corte|ET SOLDADA|SOLDAR POR EL DERECHO/i.test(t.valor));
    expect(centrales.length).toBeGreaterThan(12);
    for (const t of centrales) { expect(t.x).toBeCloseTo(p.frente / 2, 5); expect(t.ancla).toBe(5); }
    const refs = l.textos.filter(t => t.valor === 'REFUERZO EN E.T.').sort((a, b) => a.y - b.y || a.x - b.x);
    for (let i = 0; i < refs.length; i += 2) expect(refs[i].x + refs[i + 1].x).toBeCloseTo(p.frente, 5);
    expect(calcularPuerta(p).piezas.every(p => !p.margenEscuadrado)).toBe(true);
  });
  // Iván, 04/11/2026: diagonales bien hechas (regulares), no copiadas de sus planos.
  it.each([163.5, 197, 216, 281.5])('frente %s: franjas regulares, iguales, a paso fijo y centradas', frente => {
    const { ancho } = FRANJAS_SANTA_PAU;
    const franjas = franjasSantaPau(frente, 35, '5363').map(b => seccion(b.puntos, 17.5)).filter(xs => xs.length).sort((a, b) => a[0] - b[0]);
    const enteras = franjas.filter(([a, b]) => a > 1e-6 && b < frente - 1e-6);
    expect(enteras.length).toBeGreaterThan(1);
    for (const [a, b] of enteras) expect(b - a).toBeCloseTo(ancho, 5);
    for (let i = 1; i < enteras.length; i++) expect(enteras[i][0] - enteras[i - 1][0]).toBeCloseTo(2 * ancho, 5);
    // Simétricas respecto al centro del frente a media altura.
    for (const [a, b] of franjas) expect(franjas.some(([c, d]) => Math.abs(frente - b - c) < 1e-5 && Math.abs(frente - a - d) < 1e-5)).toBe(true);
  });
  it.each([30, 35, 40])('las diagonales se recortan en el borde del faldón de%s, sin desbordarlo', alto => {
    for (const frente of [163.5, 197, 216, 281.5, 300]) for (const revision of ['4815', '5363']) {
      const bandas = franjasSantaPau(frente, alto, revision);
      expect(bandas.length).toBeGreaterThan(0);
      expect(bandas.flatMap(b => b.puntos).every(([x, y]) => x >= -.00001 && x <= frente + .00001 && y >= -.00001 && y <= alto + .00001)).toBe(true);
    }
  });
  it('5363 B dibuja en el plano las mismas franjas regulares que la función', () => {
    const p = pedidosSantaPau()[1].elementos[1].input;
    const l = geometriaAlzado(p, calcularPuerta(p), 'B').cad!;
    expect(l.sombreados.filter(s => s.solido)).toHaveLength(franjasSantaPau(p.frente, 35, '5363').length);
  });
  it('el detector encuentra cruces de texto con texto y con un número de cota girado', () => {
    const textos = [{ tipo: 'texto', valor: 'A1', punto: [10, 10], h: 5 }, { tipo: 'texto', valor: 'REVÉS', punto: [12, 10], h: 5 }, { tipo: 'texto', valor: '135', punto: [10, 10], h: 5, giro: 90, deCota: true }];
    expect(solapesRotulos(textos)).toHaveLength(3);
    expect(crucesRotulosLineas([...textos, { tipo: 'raya', capa: 'DISCO1', a: [0, 10], b: [30, 10] }]).length).toBeGreaterThan(0);
    expect(recortesRotulos([{ ...textos[0], recorte: { centro: [10, 10], ancho: 2, alto: 2 } }])).toHaveLength(1);
  });
  it.each(pedidosSantaPau().flatMap(p => p.elementos))('$id: el SVG deja hueco real en la línea bajo cada número de cota', ({ input: p }) => {
    const g = geometriaAlzado(p, calcularPuerta(p));
    const cotas = g.formas.filter(f => f.tipo === 'cota');
    for (const c of cotas) {
      const v = c.x1 === c.x2, enLinea = Math.abs((v ? c.texto.x : c.texto.y) - c.linea) < .01;
      const tramos = tramosCota(c);
      if (enLinea) expect(tramos.every(([a, b]) => (v ? c.texto.y : c.texto.x) < a || (v ? c.texto.y : c.texto.x) > b)).toBe(true);
      else expect(tramos).toHaveLength(1);
      if (!v) expect(c.texto.y + c.tamanoTexto!).toBeLessThan(g.vista.yMin + g.vista.alto);
    }
  });
  it.each(pedidosSantaPau())('$orderCode: ningún rótulo ni número de cota se cruza en sus dos presentaciones', pedido => {
    const dxf = escribirPlanoPuertas({ pedido, cabecera: { cliente: 'SANTA PAU', tecnico: 'IVÁN', revisor: '', fecha: '04/11/2026' } });
    const hojas = presentacionesDxf(dxf) as Array<{ nombre: string; primitivas: RotuloAuditable[] }>;
    for (const h of hojas) {
      expect(solapesRotulos(h.primitivas), h.nombre).toEqual([]);
      expect(crucesRotulosLineas(h.primitivas), h.nombre).toEqual([]);
      expect(recortesRotulos(h.primitivas), h.nombre).toEqual([]);
    }
  });
  it.each(pedidosSantaPau())('$orderCode: los textos del bot no se pisan, tampoco cuando gira un paño', pedido => {
    const c = generarCortePuertas(pedido);
    for (const corte of c.cortes) {
      const ps = [...corte.entidades.textos.map(t => ({ tipo: 'texto', valor: t.valor, punto: [t.x, t.y], h: t.h, giro: t.giro, ancla: t.centrado ? 5 : 7 })), ...corte.entidades.lineas.map(l => ({ tipo: 'raya', capa: l.capa, a: [l.x1, l.y1], b: [l.x2, l.y2] }))];
      expect(solapesRotulos(ps)).toEqual([]);
      expect(crucesRotulosLineas(ps, .8)).toEqual([]);
    }
  });
});
