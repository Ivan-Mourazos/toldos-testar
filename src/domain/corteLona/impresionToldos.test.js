import { beforeAll, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import referencia from './fixtures/pt-main-e74ba8f.json' with { type: 'json' };
import { generarMuestras } from '../../../scripts/lib/muestras-planos.mjs';
import { auditarDxf } from './auditoriaPlano.js';
import { leerPlanoTexto } from '../../flujoDwg/planoDxf.js';

const hash = x => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
let r;
beforeAll(async () => { r = await generarMuestras(); expect(r.excluidas.filter(p => p.ejemplo)).toEqual([]); }, 120000);
it.each(referencia.planos.filter(p => p.familia.startsWith('Toldos')))('$familia $ejemplo: A4 legible y geometría intacta', p => {
  const m = r.muestras.find(m => m.familia === p.familia && m.ejemplo === p.ejemplo);
  const a = auditarDxf(m.dxf, { capasTextosExcluidas: ['ROTULADOR'] });
  for (const h of a.hojas) {
    expect(h.nombre).not.toContain(' + ');
    expect(h.ventanas.length).toBeGreaterThanOrEqual(2);
    expect(h.solapes, h.nombre).toEqual([]);
    expect(h.cruces, h.nombre).toEqual([]);
    expect(h.recortes, h.nombre).toEqual([]);
    expect(h.encimaCajetin, h.nombre).toEqual([]);
  }
  const ps = leerPlanoTexto(m.dxf).modelo.map(q => Object.fromEntries(Object.entries(q).filter(([k]) => k !== 'handle')));
  const ts = leerPlanoTexto(m.dxf).modelo.filter(p => p.tipo === 'texto' && !p.deCota);
  expect(hash(ts.map(({ capa, valor }) => ({ capa, valor })))).toBe(p.ordenTextos);
  const visibles = new Set(a.hojas.flatMap(h => h.textos.filter(t => t.ventana).map(t => t.handle)));
  for (const i of p.textosEnHoja) expect(visibles.has(ts[i].handle), ts[i].valor).toBe(true);
  expect(hash(ps.filter(p => !p.deCota && !['texto', 'cota'].includes(p.tipo) && p.capa !== 'cotas'))).toBe(p.geometria);
  expect(hash(ps.filter(p => p.tipo === 'texto' && !p.deCota && p.capa !== 'texto'))).toBe(p.textosFijos);
  expect(hash(ps.filter(p => p.tipo === 'texto' && !p.deCota && p.capa === 'texto').map(p => p.valor).sort())).toBe(p.textos);
  expect(hash(ps.filter(p => p.tipo === 'cota').map(({ a, b, capa, valor, estilo, medida }) => ({ a, b, capa, valor, estilo, medida })))).toBe(p.cotas);
}, 30000);
it.each(referencia.planos.filter(p => /^(Remolques|ASSA)/.test(p.familia)))('$familia $ejemplo: conserva su DXF completo de main', p => {
  expect(hash(r.muestras.find(m => m.familia === p.familia && m.ejemplo === p.ejemplo).dxf)).toBe(p.dxf);
});
it('conserva todos los cortes, colocaciones y DXF del bot', () => {
  for (const k of ['integridadToldos', 'integridadPuertas', 'integridadRemolques']) expect(r[k], k).toEqual(referencia[k]);
});
