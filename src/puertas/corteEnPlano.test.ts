import { describe, expect, it } from 'vitest';
import { corteDelPlano } from '../flujoDwg/corteDwg.js';
import { base, pedidoDe, puerta4638 } from './__fixtures__/ejemplos.ts';
import { puertaPlanoReal } from './__fixtures__/planosReales.ts';
import { generarCortePuertas } from './corte.ts';
import { escribirPlanoPuertas } from './plano.ts';
import type { PedidoPuertas } from './tipos.ts';

// Iván, 24/10/2026 (flujo del DWG): el corte del plano es el que se manda al bot, así que lleva todo lo que lleva hoy el DXF
// del bot: los mismos textos, la misma raya de rotulador y de cutter, los mismos arcos y ninguna raya de corte de menos
// (las muestras sueltas repiten los cortes que el bot comparte entre piezas pegadas).
const cabecera = { cliente: 'OTRO', tecnico: 'IVÁN', revisor: '', fecha: '2026-10-24' };
const ar5220 = () => ({ ...base('PUERTAENR', 366, 410), of: '0233291', enrollable: { T: 229, D: 60, margen: 8, empates: [], saco: 80 },
  entradas: [50, 121, 181, 231].map(altura => ({ altura, diametro: 30 as const, largo: 366, alto: 8, huecos: [] })) });
const casos: Array<[string, () => PedidoPuertas]> = [
  ['dos enrollables', () => pedidoDe('AR2600001', puerta4638(), { ...puerta4638(), of: '0239999', frente: puerta4638().frente - 40 })],
  ['AR2605220, con sacos de stock', () => pedidoDe('AR2605220', ar5220())],
  ['AR2605036, apilable', () => pedidoDe('AR2605036', puertaPlanoReal('AR2605036'))],
  ['AR2604904, autorreparable', () => pedidoDe('AR2604904', puertaPlanoReal('AR2604904'))],
];

describe('el corte del plano es el del bot', () => {
  it.each(casos)('%s', (_, crear) => {
    const pedido = crear();
    const bot = generarCortePuertas(pedido, { ofStockSacos: '0230811' }).archivo!;
    expect(bot).toBeTruthy();
    const corte = corteDelPlano(escribirPlanoPuertas({ pedido, cabecera, ofStockSacos: '0230811' }));
    expect(corte.error).toBeNull();
    // Los textos, uno a uno.
    const textosPlano = corte.entidades.filter(e => e.texto && ['texto', 'ROTULADOR'].includes(e.capa)).map(e => `${e.capa}:${e.texto.valor}`).sort();
    expect(textosPlano).toEqual(bot.entidades.textos.map(t => `${t.capa}:${t.valor}`).sort());
    // Rotulador y cutter, la misma raya (en mm); los arcos, los mismos; el corte, nada de menos.
    const largo = (capa: string, lineas: Array<{ capa: string; x1: number; y1: number; x2: number; y2: number }>, k: number) =>
      lineas.filter(a => a.capa === capa).reduce((s, a) => s + Math.hypot(a.x2 - a.x1, a.y2 - a.y1) * k, 0);
    const lineasPlano = corte.entidades.flatMap(e => ((e.segmentos ?? []) as number[][][]).map(([[x1, y1], [x2, y2]]) => ({ capa: e.capa as string, x1, y1, x2, y2 })));
    for (const capa of ['ROTULADOR', 'CUTTER']) expect(largo(capa, lineasPlano, 1000), capa).toBeCloseTo(largo(capa, bot.entidades.lineas, 1), 0);
    expect(largo('DISCO1', lineasPlano, 1000)).toBeGreaterThanOrEqual(largo('DISCO1', bot.entidades.lineas, 1) - 1);
    expect(corte.entidades.reduce((s, e) => s + (e.arcos?.length ?? 0), 0)).toBe(bot.entidades.arcos.length);
  });
});
