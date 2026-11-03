import { expect, it } from 'vitest';
import lineas from './fixtures/lote0711.json' with { type: 'json' };
import { prepararLote } from './lote.js';
import { revisionOficinaDelLote } from './revisionesOficina.js';
import { planoDelLote } from './archivos.js';
import { maquetarLote } from './documentoLote.js';
import { leerPlanoTexto, presentacionesDxf } from '../flujoDwg/planoDxf.js';

const lote = () => prepararLote('2026-11-07', lineas, {}, undefined,
  { palets: Object.fromEntries(lineas.map(l => [l.IDOrderLine, l.palets[0]])) });

it('reproduce el lote completo de oficina solo con las 25 líneas exactas de RPS', () => {
  const l = lote(), revision = revisionOficinaDelLote(l);
  expect(l.totalUnidades).toBe(314);
  expect(l.aMano).toBe(9);
  expect(revision.hojas).toHaveLength(25);
  expect(revision.hojas.every(h => h.primitivas.length > 0)).toBe(true);
  expect(revision.corte.filter(p => p.tipo === 'texto' && /^PALET /.test(p.valor)).map(p => p.valor))
    .toEqual(expect.arrayContaining(['PALET 1', 'PALET 2', 'PALET 3', 'PALET 4', 'PALET 5 y 6']));
  const doc = maquetarLote(l, revision), src = planoDelLote(l), p = leerPlanoTexto(src);
  expect(doc.hojasPedido).toHaveLength(10);
  expect(doc.primitivas.filter(p => p.tipo === 'texto' && p.valor.includes('SIN DIBUJO'))).toHaveLength(0);
  expect(p.modelo.some(p => p.tipo === 'texto' && /PARKING|SOLDAD|SOPLETE/.test(p.valor))).toBe(true);
  expect(p.modelo.some(p => p.tipo === 'texto' && p.valor === 'BLANCO')).toBe(true);
  expect(p.modelo.some(p => p.tipo === 'texto' && p.valor === 'PALET 5 y 6')).toBe(true);
  expect(p.modelo.filter(p => p.tipo === 'texto').every(p => !p.valor.includes('AR2605047'))).toBe(true);
  expect(p.modelo.every(p => !p.a || p.a.every(Number.isFinite))).toBe(true);
  const paginas = presentacionesDxf(src);
  expect(paginas).toHaveLength(20);
  const primera = paginas.find(p => p.nombre === 'AR2605111 - 1');
  expect(primera.primitivas.some(p => p.tipo === 'texto' && p.valor.includes('AR2605142'))).toBe(false);
  const palet3 = paginas.find(p => p.nombre === 'Corte - PALET 3');
  expect(palet3.primitivas.some(p => p.tipo === 'texto' && p.capa === 'texto' && p.valor === '4')).toBe(false);
});

it.each(['cantidad', 'descripcion', 'of_', 'CodArticle'])('retira la revisión si cambia %s; no adapta piezas por intuición', campo => {
  const l = lote();
  l.lineas[0] = { ...l.lineas[0], [campo]: campo === 'cantidad' ? 35 : 'otro dato' };
  expect(revisionOficinaDelLote(l)).toBeNull();
});

it('retira la revisión con palets distintos o sueltas elegidas, y no valida las líneas a mano', () => {
  const l = lote();
  l.lineas[0].palet = 1;
  expect(revisionOficinaDelLote(l)).toBeNull();
  const s = lote();
  s.sueltas = { '420150-0087': true };
  expect(revisionOficinaDelLote(s)).toBeNull();
  expect(lote().lineas.filter(l => l.estado === 'a-mano')).toHaveLength(9);
});
