import { beforeAll, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import referencia from './__fixtures__/ganado-presentacion-main.json' with { type: 'json' };
import { generarMuestras } from '../../../scripts/lib/muestras-planos.mjs';
import { auditarDxf } from '../../domain/corteLona/auditoriaPlano.js';
import { leerPlanoTexto, presentacionesDxf } from '../../flujoDwg/planoDxf.js';
import { crucesRotulosLineas } from '../../domain/corteLona/auditoriaRotulos.ts';

let muestras, integridadRemolques;
const hash = x => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const sinHandle = p => Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'handle'));
beforeAll(async () => {
  const r = await generarMuestras();
  expect(r.excluidas.filter(e => e.ejemplo), 'Todas las muestras deben generarse').toEqual([]);
  ({ muestras, integridadRemolques } = r);
}, 120000);

it.each(referencia.ganado)('$ejemplo: una A4 con dibujo y corte, sin colisiones y con el modelo conservado', p => {
  const m = muestras.find(m => m.ejemplo === p.ejemplo);
  const r = auditarDxf(m.dxf, { capasTextosExcluidas: ['ROTULADOR'] });
  expect(r.hojas).toHaveLength(1);
  const h = r.hojas[0];
  expect(h.ventanas).toHaveLength(2);
  expect(h.solapes).toEqual([]);
  expect(h.cruces).toEqual([]);
  expect(h.recortes).toEqual([]);
  expect(h.encimaCajetin).toEqual([]);
  expect(h.textos.some(t => /^N\d+$/.test(t.texto))).toBe(false);
  const primitivas = presentacionesDxf(m.dxf)[0].primitivas.filter(p => !(p.tipo === 'texto' && p.capa === 'ROTULADOR'))
    .map(p => p.tipo === 'raya' && p.capa === 'cotas' ? { ...p, deCota: true } : p);
  expect(crucesRotulosLineas(primitivas), 'Incluidas las referencias nuevas de las notas').toEqual([]);
  const ps = leerPlanoTexto(m.dxf).modelo;
  expect(hash(ps.filter(p => !p.deCota && !['texto', 'cota'].includes(p.tipo) && p.capa !== 'cotas').map(sinHandle))).toBe(p.geometria);
  expect(hash(ps.filter(p => p.tipo === 'texto' && !p.deCota && p.capa !== 'texto').map(sinHandle))).toBe(p.textosFijos);
  expect(hash(ps.filter(p => p.tipo === 'texto' && !p.deCota && p.capa === 'texto').map(p => p.valor).sort())).toBe(p.textos);
  expect(hash(ps.filter(p => p.tipo === 'cota').map(({ a, b, medida, valor, capa, estilo }) => ({ a, b, medida, valor, capa, estilo })))).toBe(p.cotas);
});

it.each(referencia.otras)('$familia $ejemplo: DXF idéntico a main eba659e', p => {
  expect(hash(muestras.find(m => m.familia === p.familia && m.ejemplo === p.ejemplo).dxf)).toBe(p.dxf);
});

it('conserva los 20 DXF del bot y su colocación, incluido el ganado', () => {
  expect(integridadRemolques).toEqual(referencia.integridadRemolques);
});
