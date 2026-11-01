// Lector local para el estudio: conserva identificadores y códigos originales.
import fs from 'node:fs';
import { ocs, sumar, por } from './medidas-geometria.mjs';

export function leerDxf(f) {
  const buf = fs.readFileSync(f);
  let texto;
  try { texto = new TextDecoder('utf8', { fatal: true }).decode(buf); } catch { texto = buf.toString('latin1'); }
  const ls = texto.split(/\r?\n/), secciones = {};
  let sec = '', actual;
  for (let i = 0; i + 1 < ls.length; i += 2) {
    const c = ls[i].trim(), v = ls[i + 1].trim();
    if (c === '0' && v === 'SECTION') { sec = ls[i + 3].trim(); secciones[sec] = []; i += 2; actual = null; continue; }
    if (c === '0' && v === 'ENDSEC') { sec = ''; actual = null; continue; }
    if (!sec) continue;
    if (c === '0') { actual = { t: v, g: {}, pares: [] }; secciones[sec].push(actual); }
    else if (actual) { actual.pares.push([c, v]); actual.g[c] ??= v; }
  }
  for (const es of Object.values(secciones)) {
    for (let i = 0; i < es.length; i++) if (es[i].t === 'POLYLINE') {
      es[i].vertices = [];
      for (let j = i + 1; es[j]?.t === 'VERTEX'; j++) es[i].vertices.push(es[j]);
    }
  }
  const bloques = new Map(); let b;
  for (const e of secciones.BLOCKS ?? []) {
    if (e.t === 'BLOCK') { b = { origen: punto(e), es: [] }; bloques.set(e.g[2], b); }
    else if (e.t === 'ENDBLK') b = null;
    else b?.es.push(e);
  }
  const originales = (secciones.ENTITIES ?? []).filter(e => e.g[67] !== '1');
  const entidades = [];
  function expandir(es, T = p => p, padre = '0', cadena = [], profundidad = 0) {
    for (const e of es) {
      if (['VERTEX', 'SEQEND'].includes(e.t)) continue;
      const capa = e.g[8] === '0' ? padre : e.g[8] ?? padre;
      if (e.t === 'INSERT' && profundidad < 12) {
        const bloque = bloques.get(e.g[2]); if (!bloque) continue;
        const ang = (+e.g[50] || 0) * Math.PI / 180, c = Math.cos(ang), s = Math.sin(ang);
        const trans = punto(e), esc = [+(e.g[41] ?? 1), +(e.g[42] ?? 1), +(e.g[43] ?? 1)];
        const tr = p => { const q = p.map((x, i) => (x - bloque.origen[i]) * esc[i]); return T(sumar(trans, ocs([q[0] * c - q[1] * s, q[0] * s + q[1] * c, q[2]], normal(e)))); };
        expandir(bloque.es, tr, capa, [...cadena, e.g[5]], profundidad + 1);
      } else entidades.push({ ...e, capa, T, id: [...cadena, e.g[5]].join('/'), bloque: cadena.length > 0 });
    }
  }
  expandir(originales);
  return { originales, entidades, secciones };
}
export const punto = (e, k = 10) => [+e.g[k] || 0, +e.g[k + 10] || 0, +e.g[k + 20] || 0];
export const normal = e => e.g[210] == null ? [0, 0, 1] : punto(e, 210);
export function vertices(e, pasos = 24) {
  const T = e.T ?? (p => p), n = normal(e);
  if (e.t === 'LINE') return [T(punto(e)), T(punto(e, 11))];
  if (e.t === '3DFACE') return [10, 11, 12, 13].map(k => T(punto(e, k)));
  if (e.t === 'ARC' || e.t === 'CIRCLE') {
    const c = punto(e), r = +e.g[40], ini = e.t === 'ARC' ? +e.g[50] * Math.PI / 180 : 0;
    let barrido = e.t === 'ARC' ? ((+e.g[51] - +e.g[50] + 360) % 360) * Math.PI / 180 : Math.PI * 2;
    if (Math.abs(barrido) < 1e-12) barrido = Math.PI * 2;
    return Array.from({ length: pasos + 1 }, (_, i) => T(ocs([c[0] + r * Math.cos(ini + barrido * i / pasos), c[1] + r * Math.sin(ini + barrido * i / pasos), c[2]], n)));
  }
  if (e.t === 'POLYLINE') return (e.vertices ?? []).map(v => T((+e.g[70] & 8) ? punto(v) : ocs([+v.g[10], +v.g[20], +e.g[30] || 0], n)));
  if (e.t === 'LWPOLYLINE' || e.t === 'SPLINE') {
    const vs = [];
    for (const [c, v] of e.pares) {
      if (c === '10') vs.push([+v, 0, +e.g[38] || 0]);
      if (c === '20' && vs.length) vs.at(-1)[1] = +v;
      if (c === '30' && vs.length) vs.at(-1)[2] = +v;
    }
    return vs.map(p => T(e.t === 'LWPOLYLINE' ? ocs(p, n) : p));
  }
  return [];
}
export function bulges(e) {
  if (e.t === 'POLYLINE') return (e.vertices ?? []).map(v => +v.g[42] || 0);
  const bs = []; for (const [c, v] of e.pares) { if (c === '10') bs.push(0); if (c === '42') bs[bs.length - 1] = +v; } return bs;
}
export const limpiar = s => (s ?? '').replace(/\\U\+([0-9a-f]{4})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))).replace(/\\P/g, ' | ').replace(/\\[a-z][^;\\{}]*;/gi, '').replace(/[{}]/g, '');
export const texto = e => limpiar(e.pares.filter(([c]) => c === '1' || c === '3').map(([, v]) => v).join(''));
export const escalar = (ps, k) => ps.map(p => por(p, k));
