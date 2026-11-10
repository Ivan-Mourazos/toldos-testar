import { beforeAll, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import referencia from './fixtures-portanova-minima.json' with { type: 'json' };
import { generarMuestras } from '../../scripts/lib/muestras-planos.mjs';
import { leerPlanoTexto, presentacionesDxf } from '../flujoDwg/planoDxf.js';
import { auditarDxf } from '../domain/corteLona/auditoriaPlano.js';

let muestras;
beforeAll(async () => { ({ muestras } = await generarMuestras()); }, 120000);
const limpio = ({ handle: _handle, ...p }) => p;
it.each(referencia.portanova)('$ejemplo: conserva ventanas, corte, letras grandes y bloques de notas de main', r => {
  const dxf = muestras.find(m => m.familia === r.familia && m.ejemplo === r.ejemplo).dxf;
  const hs = presentacionesDxf(dxf);
  expect(hs.map(h => [...new Map(h.primitivas.filter(p => p.recorte).map(p => [p.recorte.id, limpio(p.recorte)])).values()])).toEqual(r.ventanas);
  const ts = leerPlanoTexto(dxf).modelo.filter(p => p.tipo === 'texto' && !p.deCota).map(limpio);
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
  for (const p of referencia.protegidos) {
    const m = muestras.find(m => m.familia === p.familia && m.ejemplo === p.ejemplo);
    expect(createHash('sha256').update(m.dxf).digest('hex'), `${p.familia} ${p.ejemplo}`).toBe(p.sha);
  }
});
it('AR2605220: separa la nota del saco de su cota sin reducir la letra', () => {
  const m = muestras.find(m => m.ejemplo === 'AR2605220');
  const a = auditarDxf(m.dxf, { capasTextosExcluidas: ['ROTULADOR'] });
  expect(a.hojas.flatMap(h => h.solapes)).toEqual([]);
});
