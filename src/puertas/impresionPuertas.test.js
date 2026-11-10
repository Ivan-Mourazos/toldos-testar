import { beforeAll, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import referencia from '../domain/corteLona/fixtures/pt-main-e74ba8f.json' with { type: 'json' };
import cotasMain from './fixtures-cotas-impresion.json' with { type: 'json' };
import crucesMain from './fixtures-cruces-portanova.json' with { type: 'json' };
import { generarMuestras } from '../../scripts/lib/muestras-planos.mjs';
import { leerPlanoTexto } from '../flujoDwg/planoDxf.js';
import { auditarDxf } from '../domain/corteLona/auditoriaPlano.js';

const hash = x => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
let r;
beforeAll(async () => { r = await generarMuestras(); expect(r.excluidas.filter(p => p.ejemplo)).toEqual([]); }, 120000);
it.each(referencia.planos.filter(p => p.familia.startsWith('Puertas')))('$familia $ejemplo: conserva las piezas y cotas, sin colisiones nuevas', p => {
  const m = r.muestras.find(m => m.familia === p.familia && m.ejemplo === p.ejemplo);
  const a = auditarDxf(m.dxf, { capasTextosExcluidas: ['ROTULADOR'] });
  for (const h of a.hojas) {
    expect(h.ventanas.length).toBeGreaterThanOrEqual(2);
    expect(h.solapes, h.nombre).toEqual([]);
    if (p.familia.includes('Portanova')) {
      // Referencia de main e74ba8f: cotas, marcas del corte y espaciadores que deben conservar su sitio.
      // El hash incluye texto, capa, caja y extremos de cada línea; no admite otros cruces.
      const base = crucesMain.find(q => q.ejemplo === p.ejemplo).hojas.find(q => q.nombre === h.nombre);
      expect(h.cruces, h.nombre).toHaveLength(base.cantidad);
      expect(hash(h.cruces.map(({ handle: _handle, ...c }) => JSON.stringify(c)).sort()), h.nombre).toBe(base.sha);
    } else expect(h.cruces, h.nombre).toEqual([]);
    expect(h.recortes, h.nombre).toEqual([]);
    expect(h.encimaCajetin, h.nombre).toEqual([]);
  }
  const ps = leerPlanoTexto(m.dxf).modelo.map(({ handle: _handle, ...p }) => p);
  const ts = leerPlanoTexto(m.dxf).modelo.filter(p => p.tipo === 'texto' && !p.deCota);
  expect(hash(ts.map(({ capa, valor }) => ({ capa, valor })))).toBe(p.ordenTextos);
  const visibles = new Set(a.hojas.flatMap(h => h.textos.filter(t => t.ventana).map(t => t.handle)));
  for (const i of p.textosEnHoja) expect(visibles.has(ts[i].handle), ts[i].valor).toBe(true);
  expect(hash(ps.filter(p => !p.deCota && !['texto', 'cota'].includes(p.tipo) && p.capa !== 'cotas'))).toBe(p.geometria);
  expect(hash(ps.filter(p => p.tipo === 'texto' && !p.deCota && p.capa !== 'texto'))).toBe(p.textosFijos);
  expect(hash(ps.filter(p => p.tipo === 'texto' && !p.deCota && p.capa === 'texto').map(p => p.valor).sort())).toBe(p.textos);
  const cotas = ps.filter(p => p.tipo === 'cota'), f = cotasMain.find(q => q.familia === p.familia && q.ejemplo === p.ejemplo);
  const bloques = [];
  for (const q of ps) {
    if (q.tipo === 'cota') bloques.push([q]);
    else if (q.deCota) bloques.at(-1)?.push(q);
  }
  expect(hash(cotas.map(({ a, b, capa, valor, estilo, medida }) => ({ a, b, capa, valor, estilo, medida })))).toBe(p.cotas);
  expect(cotas).toHaveLength(f.cotas.length);
  cotas.forEach((c, i) => { if (!f.marcadas.includes(i) || p.familia.includes('Portanova') && c.valor !== '1 CM') {
    expect(hash(c), `cota ${i}: ${c.valor ?? c.medida}`).toBe(f.cotas[i]);
    expect(hash(bloques[i]), `líneas y número de cota ${i}`).toBe(f.bloques[i]);
  } });
  if (/Santa Pau/.test(p.familia) || /Araujo/.test(p.familia) && p.ejemplo !== 'AR2506255') expect(hash(m.dxf)).toBe(p.dxf);
}, 30000);
it('System Dock: una presentación por cada una de sus dos lonas, con el corte compartido completo', () => {
  const m = r.muestras.find(m => m.familia === 'Puertas / System Dock');
  const a = auditarDxf(m.dxf, { capasTextosExcluidas: ['ROTULADOR'] });
  expect(a.hojas).toHaveLength(2);
});
it('conserva todos los cortes y archivos del bot', () => {
  for (const k of ['integridadToldos', 'integridadPuertas', 'integridadRemolques']) expect(r[k], k).toEqual(referencia[k]);
});
