// Analiza en todos los lotes 2025-2026 con DXF y CMT:
// 1) Qué trazos exactos disparan «recorridos duplicados» en 430129-0002, 430172-0005 y 430172-0034 (DXF y CMT).
// 2) Qué pasa con 430129-0002 en el 07-11 (handles 343D y 2C47).
// 3) En qué lotes 420102-0021 va en tiras triples (10830), parejas (7220) o sueltas (3610), y si hay sueltas de más.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { leerPlanoDxf } from '../lib/plano-dxf.mjs';
import { leerCmt } from '../../src/cmt/binario.ts';
import { extraerPanos } from '../../src/assa/leerCorte.js';
import { operacionesEnPano } from '../../src/assa/comparar.js';

const base = fileURLToPath(new URL('../../tmp/assa-0711-historico/cortes/', import.meta.url));
const refs = ['430129-0002', '430172-0005', '430172-0034'];
const PT_TO_MM = 25.4 / 72;

function segLen(a, b) {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function duplicadosEnOps(ops) {
  const segs = ops.filter(o => o.tipo === 'raya').map(o => ({ capa: o.capa, a: o.a, b: o.b, len: segLen(o.a, o.b) }));
  const arcos = ops.filter(o => o.tipo === 'arco');
  const dups = [];
  for (let i = 0; i < segs.length; i++) {
    for (let j = i + 1; j < segs.length; j++) {
      if (segs[i].capa !== segs[j].capa) continue;
      const a1 = segs[i].a, b1 = segs[i].b, a2 = segs[j].a, b2 = segs[j].b;
      const dx1 = b1[0] - a1[0], dy1 = b1[1] - a1[1], l1 = segs[i].len;
      const dx2 = b2[0] - a2[0], dy2 = b2[1] - a2[1], l2 = segs[j].len;
      if (l1 < 0.01 || l2 < 0.01) continue;
      const cross = Math.abs((dx1 * dy2 - dy1 * dx2) / (l1 * l2));
      if (cross > 0.01) continue;
      const dist = Math.abs((a2[0] - a1[0]) * dy1 - (a2[1] - a1[1]) * dx1) / l1;
      if (dist > 0.5) continue;
      const proj = p => ((p[0] - a1[0]) * dx1 + (p[1] - a1[1]) * dy1) / l1;
      const t2a = proj(a2), t2b = proj(b2);
      const lo = Math.max(0, Math.min(t2a, t2b)), hi = Math.min(l1, Math.max(t2a, t2b));
      if (hi - lo > 0.5) {
        dups.push({
          capa: segs[i].capa,
          solapeMm: +(hi - lo).toFixed(2),
          len1: +l1.toFixed(2),
          len2: +l2.toFixed(2),
          exacto: Math.abs(lo) < 0.5 && Math.abs(hi - l1) < 0.5 && Math.abs(l1 - l2) < 0.5,
          seg1: [a1.map(v => +v.toFixed(1)), b1.map(v => +v.toFixed(1))],
          seg2: [a2.map(v => +v.toFixed(1)), b2.map(v => +v.toFixed(1))],
        });
      }
    }
  }
  for (let i = 0; i < arcos.length; i++) {
    for (let j = i + 1; j < arcos.length; j++) {
      if (arcos[i].capa !== arcos[j].capa) continue;
      if (Math.hypot(arcos[i].punto[0] - arcos[j].punto[0], arcos[i].punto[1] - arcos[j].punto[1]) < 0.5 &&
          Math.abs(arcos[i].r - arcos[j].r) < 0.5) {
        dups.push({ capa: arcos[i].capa, tipo: 'arco', solapeMm: 0, centro: arcos[i].punto.map(v => +v.toFixed(1)), r: +arcos[i].r.toFixed(1) });
      }
    }
  }
  return dups;
}

// Lee segmentos del CMT y encuentra cajas de paños de una dimensión concreta (W x H mm) por bordes DISCO1/CM-WHL
function extraerCmtSegs(doc) {
  const segs = [];
  for (const obj of doc.objects) {
    for (const p of obj.paths) {
      const pts = p.points;
      let i = 1;
      while (i < pts.length) {
        if (pts[i].type === 4) {
          segs.push({
            tool: obj.tool,
            objIndex: obj.index,
            a: [pts[i - 1].x * PT_TO_MM, pts[i - 1].y * PT_TO_MM],
            b: [pts[i].x * PT_TO_MM, pts[i].y * PT_TO_MM],
          });
          i += 1;
        } else {
          i += 3;
        }
      }
    }
  }
  return segs;
}

// Busca en los segmentos del CMT un segmento horizontal de longitud ~W (borde superior del paño) con dos verticales ~H
function buscarPanosEnCmt(segs, W, H) {
  // En CMT las herramientas de corte suelen llamarse CM-WHL-..., DISCO1, etc., y rotulador CM-PEN-...
  const isWheel = t => /CUTW|WHL|DISCO/i.test(t);
  const horiz = segs.filter(s => isWheel(s.tool) && Math.abs(s.a[1] - s.b[1]) < 2 && Math.abs(Math.abs(s.a[0] - s.b[0]) - W) < 5);
  const vert = segs.filter(s => isWheel(s.tool) && Math.abs(s.a[0] - s.b[0]) < 2 && Math.abs(s.a[1] - s.b[1]) >= H - 5);
  const cajas = [];
  const vistas = new Set();
  for (const h of horiz) {
    const x0 = Math.min(h.a[0], h.b[0]), x1 = Math.max(h.a[0], h.b[0]), y = h.a[1];
    // Puede ser borde superior (paño debajo: [y-H, y]) o borde inferior (paño encima: [y, y+H])
    for (const [by0, by1] of [[y - H, y], [y, y + H]]) {
      const tieneIzq = vert.some(v => Math.abs(v.a[0] - x0) < 3 && Math.min(v.a[1], v.b[1]) <= by0 + 5 && Math.max(v.a[1], v.b[1]) >= by1 - 5);
      const tieneDer = vert.some(v => Math.abs(v.a[0] - x1) < 3 && Math.min(v.a[1], v.b[1]) <= by0 + 5 && Math.max(v.a[1], v.b[1]) >= by1 - 5);
      if (!tieneIzq || !tieneDer) continue;
      // Verificar que dentro hay alguna marca de rotulador (para distinguir el paño real de un hueco entre dos paños)
      const dentro = segs.filter(s => {
        const mx = (s.a[0] + s.b[0]) / 2, my = (s.a[1] + s.b[1]) / 2;
        return mx > x0 + 5 && mx < x1 - 5 && my > by0 + 5 && my < by1 - 5;
      });
      if (dentro.length < 4) continue;
      const key = `${Math.round(x0 / 10)},${Math.round(by0 / 10)}`;
      if (vistas.has(key)) continue;
      vistas.add(key);
      const ops = dentro.map(s => ({
        tipo: 'raya',
        capa: s.tool,
        a: [s.a[0] - x0, s.a[1] - by0],
        b: [s.b[0] - x0, s.b[1] - by0],
      }));
      cajas.push({ x0, y0: by0, x1, y1: by1, ops, dups: duplicadosEnOps(ops) });
    }
  }
  return cajas;
}

const resumen = { dxf: {}, cmt: {} };
const detalle = [];

for (const anio of ['2025', '2026']) {
  const dir = path.join(base, anio);
  const files = fs.readdirSync(dir).sort();
  const cmtFiles = files.filter(f => /\.cmt$/i.test(f));

  for (const f of files) {
    if (!/\.dxf$/i.test(f)) continue;
    const modelo = leerPlanoDxf(path.join(dir, f)).modelo;
    const grupos = extraerPanos(modelo).filter(g => refs.includes(g.codigo));
    if (!grupos.length) continue;

    const stem = f.replace(/\.dxf$/i, '').toLowerCase();
    const stemBase = stem.replace(/[_\s]+$/, '');
    const cmtName = cmtFiles.find(c => {
      const cs = c.replace(/\.cmt$/i, '').toLowerCase();
      return cs === stem || cs === stemBase;
    });

    let cmtSegs = null, cmtErr = null;
    if (cmtName) {
      try {
        const doc = leerCmt(fs.readFileSync(path.join(dir, cmtName)));
        cmtSegs = extraerCmtSegs(doc);
      } catch (e) {
        cmtErr = e.message;
      }
    }

    const codsUnicos = [...new Set(grupos.map(g => g.codigo))];
    for (const cod of codsUnicos) {
      const gs = grupos.filter(g => g.codigo === cod);
      const medidas = gs[0].panos[0].medidasMm;
      const dxfPanosInfo = gs.flatMap(g => g.panos.map(p => {
        const ops = operacionesEnPano(modelo, p.caja, p.uniones);
        const dups = duplicadosEnOps(ops);
        return { rotulo: g.titulo.handle, reps: g.repeticiones, medidasMm: p.medidasMm, opsCount: ops.length, dups };
      }));
      const dxfConDup = dxfPanosInfo.filter(p => p.dups.length > 0).length;
      const dxfCapasDup = [...new Set(dxfPanosInfo.flatMap(p => p.dups.map(d => d.capa)))];
      const dxfMaxSolape = Math.max(0, ...dxfPanosInfo.flatMap(p => p.dups.map(d => d.solapeMm)));

      let cmtPanos = null;
      if (cmtSegs) {
        cmtPanos = buscarPanosEnCmt(cmtSegs, medidas[0], medidas[1]);
      }

      const cmtConDup = cmtPanos ? cmtPanos.filter(p => p.dups.length > 0).length : null;
      const cmtCapasDup = cmtPanos ? [...new Set(cmtPanos.flatMap(p => p.dups.map(d => d.capa)))] : null;
      const cmtMaxSolape = cmtPanos ? Math.max(0, ...cmtPanos.flatMap(p => p.dups.map(d => d.solapeMm))) : null;

      resumen.dxf[cod] ??= { lotes: 0, lotesConDup: 0, panosTotal: 0, panosConDup: 0, capas: new Set(), maxSolape: 0, tipos: {} };
      resumen.dxf[cod].lotes++;
      if (dxfConDup > 0) resumen.dxf[cod].lotesConDup++;
      resumen.dxf[cod].panosTotal += dxfPanosInfo.length;
      resumen.dxf[cod].panosConDup += dxfConDup;
      for (const c of dxfCapasDup) resumen.dxf[cod].capas.add(c);
      resumen.dxf[cod].maxSolape = Math.max(resumen.dxf[cod].maxSolape, dxfMaxSolape);
      for (const d of dxfPanosInfo.flatMap(p => p.dups)) {
        const k = `${d.capa}|solape=${d.solapeMm}|minLen=${Math.min(d.len1 ?? 0, d.len2 ?? 0)}`;
        resumen.dxf[cod].tipos[k] = (resumen.dxf[cod].tipos[k] ?? 0) + 1;
      }

      if (cmtPanos && cmtPanos.length > 0) {
        resumen.cmt[cod] ??= { lotes: 0, lotesConDup: 0, panosTotal: 0, panosConDup: 0, capas: new Set(), maxSolape: 0, tipos: {} };
        resumen.cmt[cod].lotes++;
        if (cmtConDup > 0) resumen.cmt[cod].lotesConDup++;
        resumen.cmt[cod].panosTotal += cmtPanos.length;
        resumen.cmt[cod].panosConDup += cmtConDup;
        for (const c of cmtCapasDup) resumen.cmt[cod].capas.add(c);
        resumen.cmt[cod].maxSolape = Math.max(resumen.cmt[cod].maxSolape, cmtMaxSolape);
        for (const d of cmtPanos.flatMap(p => p.dups)) {
          const k = `${d.capa}|solape=${d.solapeMm}|minLen=${Math.min(d.len1 ?? 0, d.len2 ?? 0)}`;
          resumen.cmt[cod].tipos[k] = (resumen.cmt[cod].tipos[k] ?? 0) + 1;
        }
      }

      detalle.push({
        fichero: `${anio}/${f}`,
        cmt: cmtName ? `${anio}/${cmtName}` : null,
        cmtErr,
        codigo: cod,
        dxfPanos: dxfPanosInfo.length,
        dxfConDup,
        dxfCapasDup,
        dxfMaxSolape,
        cmtPanos: cmtPanos?.length ?? null,
        cmtConDup,
        cmtCapasDup,
        cmtMaxSolape,
      });
    }
  }
}

console.log('=== RESUMEN DXF ===');
for (const [cod, r] of Object.entries(resumen.dxf)) {
  console.log(cod, { ...r, capas: [...r.capas] });
}
console.log('\n=== RESUMEN CMT (paños emparejados por geometría en máquina) ===');
for (const [cod, r] of Object.entries(resumen.cmt)) {
  console.log(cod, { ...r, capas: [...r.capas] });
}
console.log('\n=== DETALLE POR LOTE (donde hay CMT legible y paños encontrados) ===');
for (const d of detalle.filter(x => x.cmtPanos > 0)) {
  console.log(`${d.fichero.padEnd(26)} | ${d.codigo} | DXF ${d.dxfConDup}/${d.dxfPanos} (max ${d.dxfMaxSolape}mm ${d.dxfCapasDup.join(',')}) | CMT ${d.cmtConDup}/${d.cmtPanos} (max ${d.cmtMaxSolape}mm ${(d.cmtCapasDup||[]).join(',')})`);
}
fs.writeFileSync(fileURLToPath(new URL('../../tmp/assa-dudas/cmt-duplicados-resumen.json', import.meta.url)),
  JSON.stringify({ detalle, resumen: Object.fromEntries(Object.entries(resumen).map(([k, v]) => [k, Object.fromEntries(Object.entries(v).map(([c, x]) => [c, { ...x, capas: [...x.capas] }]))])) }, null, 2));
