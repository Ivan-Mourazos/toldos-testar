import { expect, it } from 'vitest';
import { prepararLote } from './lote.js';
import { planoDelLote } from './archivos.js';
import { maquetarLote } from './documentoLote.js';
import { leerPlanoTexto, presentacionesDxf } from '../flujoDwg/planoDxf.js';
import { corteDelPlano, entidadesBot } from '../flujoDwg/corteDwg.js';

const linea = { IDOrderLine: 'a', CodOrder: 'AR.26.05234', NumLine: 1, CodArticle: 'H0K420102-0021', descripcion: 'NH3800 NT600',
  cantidad: 18, of_: '0233342', entregaSolicitada: '2026-11-07' };
const certificado = { referencias: { '420102-0021': { descripciones: [{ descripcion: linea.descripcion, corteMm: [3610, 666], geometria: 1, ultimaGeometria: true }] } } };
const lote = () => prepararLote('2026-11-07', [linea], {}, certificado, { palets: { a: 1 } });

it('genera presentaciones con el pedido, el corte y el papel del cortador, cada una con cajetín', () => {
  const src = planoDelLote(lote()), plano = leerPlanoTexto(src), hojas = presentacionesDxf(src);
  expect(hojas.map(h => h.nombre)).toEqual(expect.arrayContaining(['Conjunto', 'AR2605234 - 1', 'Cortador']));
  expect(hojas.every(h => h.primitivas.some(p => p.tipo === 'texto' && p.valor === 'Nº PEDIDO'))).toBe(true);
  expect(plano.modelo.some(p => p.tipo === 'texto' && p.valor.includes('PAPEL DEL CORTADOR'))).toBe(true);
  expect(plano.bloques.has('CAJETIN TGM')).toBe(true);
  const bot = entidadesBot(corteDelPlano(src).entidades);
  expect(bot.lineas).toHaveLength(lote().entidades.lineas.length);
  expect(bot.textos).toHaveLength(lote().entidades.textos.length);
});

it('pagina los pedidos en celdas iguales, sin escalar dibujos ni cambiar el corte por estética', () => {
  const l = lote();
  l.lineas = Array.from({ length: 7 }, (_, i) => ({ ...l.lineas[0], IDOrderLine: String(i), NumLine: i + 1 }));
  const antes = JSON.stringify(l), doc = maquetarLote(l);
  expect(JSON.stringify(l)).toBe(antes);
  expect(doc.hojasPedido).toHaveLength(3);
  expect(new Set(doc.hojasPedido.map(h => [h.zona.x1 - h.zona.x0, h.zona.y1 - h.zona.y0].map(n => n.toFixed(6)).join('|'))).size).toBe(1);
  expect(doc.hojasPedido.flatMap(h => h.lineas)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(doc.zonaCorte.x1).toBeLessThan(doc.zonaCortador.x0);
  expect(doc.hojasPedido.every(h => h.zona.y0 > doc.zonaCorte.y1)).toBe(true);
});
