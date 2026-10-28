import { expect, it } from 'vitest';
import { hojasPedidos } from './hojasLote.js';
import { planoDelLote } from './archivos.js';
import { prepararLote } from './lote.js';
import { corteDelPlano, entidadesBot } from '../flujoDwg/corteDwg.js';

const l = { IDOrderLine: 'a', CodOrder: 'AR.26.04704', NumLine: 2, CodArticle: 'H0K420102-0034', codigo: '420102-0034', descripcion: 'NH3200 NT600',
  cantidad: 8, of_: '0232434', entregaSolicitada: '2026-10-31', estado: 'validado' };

// Iván, 28/10/2026: «el DWG con lo que lleva el lote, con todas las referencias y cuánto de cada».
it('una hoja por pedido: su número grande, el nº de línea de RPS, el dibujo de la plantilla y las unidades', () => {
  const { entidades, sinDibujo } = hojasPedidos([l, { ...l, IDOrderLine: 'b', NumLine: 1, CodArticle: 'H0K499999-0001', codigo: '499999-0001', estado: 'a-mano' }], 0);
  const textos = entidades.textos.map(t => t.valor);
  expect(textos).toEqual(expect.arrayContaining(['AR2604704', '1', '2']));
  // La 0034 tiene variantes entre lotes: se avisa de revisar su dibujo.
  expect(textos).toContain('8 UDS   OF 0232434   H0K420102-0034   REVISAR DIBUJO');
  expect(textos.some(t => /H0K499999-0001.*SIN DIBUJO.*A MANO/.test(t))).toBe(true);
  expect(sinDibujo).toEqual(['H0K499999-0001']);
  expect(entidades.lineas.some(x => x.capa === 'referencias')).toBe(true);
  // Nada de las hojas va en capas del bot.
  expect([...entidades.lineas, ...entidades.textos].every(x => !['DISCO1', 'DISCO2', 'CUTTER', 'ROTULADOR', 'taladro', 'texto'].includes(x.capa))).toBe(true);
});

it('las hojas van en el DWG del lote, fuera del recuadro CORTE: el bot recibe solo el corte', () => {
  const certificado = { referencias: { '420102-0034': { descripciones: [{ descripcion: l.descripcion, corteMm: [3010, 666], geometria: 1, ultimaGeometria: true }] } } };
  const lote = prepararLote('2026-10-31', [l], {}, certificado, { palets: { a: 1 } });
  const plano = planoDelLote(lote), bot = entidadesBot(corteDelPlano(plano).entidades);
  expect(plano).toContain('AR2604704');
  expect(bot.lineas).toHaveLength(lote.entidades.lineas.length);
  expect(bot.textos).toHaveLength(lote.entidades.textos.length);
});
