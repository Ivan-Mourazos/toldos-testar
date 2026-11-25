import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { auditarDxf } from '../src/domain/corteLona/auditoriaPlano.js';
import { crucesRotulosLineas } from '../src/domain/corteLona/auditoriaRotulos.ts';
import referencia from '../src/domain/corteLona/fixtures/pt-main-e74ba8f.json' with { type: 'json' };
import { leerPlanoTexto, presentacionesDxf } from '../src/flujoDwg/planoDxf.js';
import cotasMain from '../src/puertas/fixtures-cotas-impresion.json' with { type: 'json' };
import crucesMain from '../src/puertas/fixtures-cruces-portanova.json' with { type: 'json' };
import referenciaPortanova from '../src/puertas/fixtures-portanova-minima.json' with { type: 'json' };
import referenciaGanado from '../src/remolques/corte/__fixtures__/ganado-presentacion-main.json' with { type: 'json' };
import { generarMuestras } from './lib/muestras-planos.mjs';

const hash = x => createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
const sinHandle = p => Object.fromEntries(Object.entries(p).filter(([k]) => k !== 'handle'));

let corpus;
beforeAll(async () => {
  corpus = await generarMuestras();
  expect(corpus.excluidas.filter(e => e.ejemplo), 'Todas las muestras deben generarse').toEqual([]);
}, 120000);

describe('Auditoría general', () => {
  it('genera los modelos con corte y las demás familias desde fuentes locales existentes', () => {
    expect(corpus.excluidas.filter(e => e.ejemplo)).toEqual([]);
    for (const modelo of corpus.modelosConCorte) expect(corpus.muestras.some(p => p.familia === `Toldos / ${modelo}`), modelo).toBe(true);
    for (const familia of ['BAMBALINAS', 'Portanova Enrollable', 'Portanova Plegable', 'Portanova Apilable', 'Portanova Autorreparable', 'Araujo', 'Santa Pau', 'System Dock', 'REMOLCAR_ECONOMICO', 'REMOLCAR_ESTANDAR', 'CAL_MEDIDAS', 'ASSA'])
      expect(corpus.muestras.some(p => p.familia.includes(familia)), familia).toBe(true);
    expect(corpus.muestras.every(p => p.fuente && p.dxf.includes('AC1032'))).toBe(true);
    expect(corpus.excluidas.map(e => e.familia)).toContain('FALDONES');
  });
});


describe('Impresión de puertas', () => {
  it.each(referencia.planos.filter(p => p.familia.startsWith('Puertas')))('$familia $ejemplo: conserva las piezas y cotas, sin colisiones nuevas', p => {
    const m = corpus.muestras.find(m => m.familia === p.familia && m.ejemplo === p.ejemplo);
    const a = auditarDxf(m.dxf, { capasTextosExcluidas: ['ROTULADOR'] });
    for (const h of a.hojas) {
      expect(h.ventanas.length).toBeGreaterThanOrEqual(2);
      expect(h.solapes, h.nombre).toEqual([]);
      if (p.familia.includes('Portanova')) {
        // Referencia de main e74ba8f: cotas, marcas del corte y espaciadores que deben conservar su sitio.
        // El hash incluye texto, capa, caja y extremos de cada línea; no admite otros cruces.
        const base = crucesMain.find(q => q.ejemplo === p.ejemplo).hojas.find(q => q.nombre === h.nombre);
        expect(h.cruces, h.nombre).toHaveLength(base.cantidad);
        expect(hash(h.cruces.map(c => JSON.stringify(sinHandle(c))).sort()), h.nombre).toBe(base.sha);
      } else expect(h.cruces, h.nombre).toEqual([]);
      expect(h.recortes, h.nombre).toEqual([]);
      expect(h.encimaCajetin, h.nombre).toEqual([]);
    }
    const ps = leerPlanoTexto(m.dxf).modelo.map(sinHandle);
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
    const m = corpus.muestras.find(m => m.familia === 'Puertas / System Dock');
    const a = auditarDxf(m.dxf, { capasTextosExcluidas: ['ROTULADOR'] });
    expect(a.hojas).toHaveLength(2);
  });
  it('conserva todos los cortes y archivos del bot', () => {
    for (const k of ['integridadToldos', 'integridadPuertas', 'integridadRemolques']) expect(corpus[k], k).toEqual(referencia[k]);
  });
});


describe('Portanova mínima', () => {
  it.each(referenciaPortanova.portanova)('$ejemplo: conserva ventanas, corte, letras grandes y bloques de notas de main', r => {
    const dxf = corpus.muestras.find(m => m.familia === r.familia && m.ejemplo === r.ejemplo).dxf;
    const hs = presentacionesDxf(dxf);
    expect(hs.map(h => [...new Map(h.primitivas.filter(p => p.recorte).map(p => [p.recorte.id, sinHandle(p.recorte)])).values()])).toEqual(r.ventanas);
    const ts = leerPlanoTexto(dxf).modelo.filter(p => p.tipo === 'texto' && !p.deCota).map(sinHandle);
    expect(ts).toHaveLength(r.textos.length);
    const corteX = Math.max(...r.textos.filter(t => /^A[1-9]$/.test(t.valor)).map(t => t.punto[0]));
    ts.forEach((t, i) => {
      const b = r.textos[i];
      expect({ ...t, punto: b.punto }).toEqual(b);
      if (b.capa !== 'texto' || b.punto[0] >= corteX || /^(?:[A-Z]\d+|REVÉS|DERECHO|\d{7}|X\d+)$/.test(b.valor)) expect(t).toEqual(b);
      if (/^(?:REFUERZO DE |COSER VELCRO |CERRAR E\.T)/.test(b.valor)) {
        const j = r.textos.findIndex((q, j) => j !== i && /^(?:SOLDADO ·|DE 5 |2 CM MÁXIMO)/.test(q.valor)
          && Math.abs(q.punto[0] - b.punto[0]) < 1e-6 && Math.abs(q.punto[1] - b.punto[1]) < 4 * b.h);
        if (j >= 0) for (const k of [0, 1]) expect(ts[j].punto[k] - t.punto[k]).toBeCloseTo(r.textos[j].punto[k] - b.punto[k], 7);
      }
    });
  });
  it('conserva los 42 DXF de las familias aprobadas', () => {
    for (const p of referenciaPortanova.protegidos) {
      const m = corpus.muestras.find(m => m.familia === p.familia && m.ejemplo === p.ejemplo);
      expect(createHash('sha256').update(m.dxf).digest('hex'), `${p.familia} ${p.ejemplo}`).toBe(p.sha);
    }
  });
  it('AR2605220: separa la nota del saco de su cota sin reducir la letra', () => {
    const m = corpus.muestras.find(m => m.ejemplo === 'AR2605220');
    const a = auditarDxf(m.dxf, { capasTextosExcluidas: ['ROTULADOR'] });
    expect(a.hojas.flatMap(h => h.solapes)).toEqual([]);
  });
});


describe('Impresión de toldos', () => {
  it.each(referencia.planos.filter(p => p.familia.startsWith('Toldos')))('$familia $ejemplo: A4 legible y geometría intacta', p => {
    const m = corpus.muestras.find(m => m.familia === p.familia && m.ejemplo === p.ejemplo);
    const a = auditarDxf(m.dxf, { capasTextosExcluidas: ['ROTULADOR'] });
    for (const h of a.hojas) {
      expect(h.nombre).not.toContain(' + ');
      expect(h.ventanas.length).toBeGreaterThanOrEqual(2);
      expect(h.solapes, h.nombre).toEqual([]);
      expect(h.cruces, h.nombre).toEqual([]);
      expect(h.recortes, h.nombre).toEqual([]);
      expect(h.encimaCajetin, h.nombre).toEqual([]);
    }
    const ps = leerPlanoTexto(m.dxf).modelo.map(sinHandle);
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
    expect(hash(corpus.muestras.find(m => m.familia === p.familia && m.ejemplo === p.ejemplo).dxf)).toBe(p.dxf);
  });
  it('conserva todos los cortes, colocaciones y DXF del bot', () => {
    for (const k of ['integridadToldos', 'integridadPuertas', 'integridadRemolques']) expect(corpus[k], k).toEqual(referencia[k]);
  });
});


describe('Presentación de ganado', () => {
  it.each(referenciaGanado.ganado)('$ejemplo: una A4 con dibujo y corte, sin colisiones y con el modelo conservado', p => {
    const m = corpus.muestras.find(m => m.ejemplo === p.ejemplo);
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

  it.each(referenciaGanado.otras.filter(p => p.familia.startsWith('Remolques') || p.familia.startsWith('ASSA')))('$familia $ejemplo: DXF idéntico a main eba659e', p => {
    expect(hash(corpus.muestras.find(m => m.familia === p.familia && m.ejemplo === p.ejemplo).dxf)).toBe(p.dxf);
  });

  it('conserva los 20 DXF del bot y su colocación, incluido el ganado', () => {
    expect(corpus.integridadRemolques).toEqual(referenciaGanado.integridadRemolques);
  });
});
