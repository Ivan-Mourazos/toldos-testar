import { describe, expect, it } from 'vitest';
import { presentacionesDxf } from '../flujoDwg/planoDxf.js';
import { nuevaPuerta } from './calcular.ts';
import { escribirPlanoPuertas } from './plano.ts';
import type { PedidoPuertas } from './tipos.ts';

// Iván, 20/11/2026 (AR2605639): el corte salía partido en un tramo larguísimo y una sola columna suelta debajo, todo
// diminuto. Las filas de muestras (sacos, cristal) tapaban los bordes de las columnas de la lona y solo dejaban partir
// al final. Las muestras se recolocan, así que no deben decidir por dónde se parte la lona.
const puerta = (frente: number, alto: number, of: string, cantidad: number, T: number) => {
  const p = nuevaPuerta('PUERTAENR');
  return { ...p, frente, alto, of, cantidad, confirmada: true, ventanasConfirmadas: true, material: 'LAC900', color: 'GRIS 7038',
    enrollable: { ...p.enrollable, T, D: 60, margen: 6, saco: 80, sacoPartido: true },
    entradas: [60, 131, 191].map(altura => ({ altura, diametro: 30 as const, largo: frente, alto: 8, huecos: [] })) };
};

describe('tramos del corte en la presentación', () => {
  it('AR2605639: ningún tramo se queda con una columna suelta', () => {
    const pedido = { orderCode: 'AR2605639', elementos: [
      { id: 'A', input: puerta(312, 345, '0234164', 1, 154) },
      { id: 'B', input: puerta(322, 345, '0234165', 2, 154) },
      { id: 'C', input: puerta(312, 360, '0234166', 2, 169) },
    ] } as unknown as PedidoPuertas;
    const dxf = escribirPlanoPuertas({ pedido, ofStockSacos: '0230811', cabecera: { cliente: 'PORTANOVA', tecnico: 'IVÁN', revisor: '', fecha: '2026-11-20' } });
    const hojas = presentacionesDxf(dxf as string);
    expect(hojas.length).toBe(3);
    for (const hoja of hojas) {
      const vps = new Map<number, { escala: number; zona: { x0: number; x1: number } }>();
      for (const p of hoja.primitivas) if (p.recorte) vps.set(p.recorte.id, p.recorte);
      // Los tramos del corte comparten escala con el más ancho.
      const todos = [...vps.values()];
      const ancho = (v: (typeof todos)[number]) => v.zona.x1 - v.zona.x0;
      const mayor = todos.reduce((a, b) => (ancho(b) > ancho(a) ? b : a));
      const tramos = todos.filter(v => Math.abs(v.escala - mayor.escala) < 1e-6);
      expect(tramos.length).toBe(2);
      expect(Math.min(...tramos.map(ancho)) / ancho(mayor)).toBeGreaterThan(0.4);
    }
  });
});
