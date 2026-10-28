// Lectura de BAMBALINAS.dwg (pasado a DXF con ODA): cada entidad del modelo como una lista de puntos, con las
// curvas (SPLINE) evaluadas de verdad (de Boor), los arcos y las polilíneas con abombamiento muestreados.
import fs from 'node:fs';

export function leerEntidades(ruta) {
  const t = fs.readFileSync(ruta, 'utf8').split(/\r?\n/).map((s) => s.trim());
  const ents = [];
  let i = t.findIndex((x, k) => x === 'ENTITIES' && t[k - 1] === '2') + 1;
  for (; i < t.length - 1; i += 2) {
    if (t[i] === '0') { if (t[i + 1] === 'ENDSEC') break; ents.push({ tipo: t[i + 1], g: [] }); }
    else if (ents.length) ents.at(-1).g.push([t[i], t[i + 1]]);
  }
  return ents.filter((e) => valor(e, '67') !== '1');
}

export const valores = (e, c) => e.g.filter(([k]) => k === c).map(([, x]) => +x);
export const valor = (e, c) => e.g.find(([k]) => k === c)?.[1];

function deBoor(grado, nudos, control, pesos, u) {
  let k = grado;
  while (k < nudos.length - grado - 2 && u >= nudos[k + 1]) k++;
  const d = [];
  for (let j = 0; j <= grado; j++) {
    const [x, y] = control[k - grado + j], w = pesos[k - grado + j] ?? 1;
    d.push([x * w, y * w, w]);
  }
  for (let r = 1; r <= grado; r++) {
    for (let j = grado; j >= r; j--) {
      const i0 = k - grado + j;
      const a = (u - nudos[i0]) / (nudos[i0 + grado + 1 - r] - nudos[i0]) || 0;
      d[j] = d[j].map((v, c) => (1 - a) * d[j - 1][c] + a * v);
    }
  }
  return [d[grado][0] / d[grado][2], d[grado][1] / d[grado][2]];
}

/** Los puntos de una entidad, en orden; null si no es una línea del dibujo. */
export function puntos(e, porTramo = 24) {
  const v = (c) => valores(e, c);
  if (e.tipo === 'LINE') return [[v('10')[0], v('20')[0]], [v('11')[0], v('21')[0]]];
  if (e.tipo === 'ARC') {
    const [cx, cy, r, a0, a1] = [v('10')[0], v('20')[0], v('40')[0], v('50')[0], v('51')[0]];
    const barrido = ((a1 - a0) % 360 + 360) % 360 || 360, n = Math.max(4, Math.ceil(barrido / 3));
    return Array.from({ length: n + 1 }, (_, k) => {
      const a = ((a0 + (barrido * k) / n) * Math.PI) / 180;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    });
  }
  if (e.tipo === 'LWPOLYLINE') {
    const xs = v('10'), ys = v('20'), cerrada = (+valor(e, '70') & 1) === 1;
    // Abombamientos (42) en el orden de los vértices.
    const bulges = []; let idx = -1;
    for (const [k, x] of e.g) { if (k === '10') { idx++; bulges[idx] = 0; } if (k === '42') bulges[idx] = +x; }
    const pts = xs.map((x, k) => [x, ys[k]]);
    const out = [];
    const n = cerrada ? pts.length : pts.length - 1;
    for (let k = 0; k < n; k++) {
      const [p, q, b] = [pts[k], pts[(k + 1) % pts.length], bulges[k] || 0];
      out.push(p);
      if (Math.abs(b) > 1e-9) {
        const ang = 4 * Math.atan(b), dx = q[0] - p[0], dy = q[1] - p[1], c = Math.hypot(dx, dy);
        // Centro a la izquierda de la cuerda (abombamiento positivo: arco antihorario).
        const r = c / (2 * Math.sin(ang / 2)), d = r * Math.cos(ang / 2);
        const [cx, cy] = [(p[0] + q[0]) / 2 - (d * dy) / c, (p[1] + q[1]) / 2 + (d * dx) / c];
        const a0 = Math.atan2(p[1] - cy, p[0] - cx), m = 16, R = Math.abs(r);
        for (let j = 1; j < m; j++) { const a = a0 + (ang * j) / m; out.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
      }
    }
    out.push(cerrada ? pts[0] : pts.at(-1));
    return out;
  }
  if (e.tipo === 'SPLINE') {
    const grado = +valor(e, '71'), nudos = v('40'), xs = v('10'), ys = v('20'), pesos = v('41');
    if (!xs.length) { const fx = v('11'), fy = v('21'); return fx.map((x, k) => [x, fy[k]]); }
    const control = xs.map((x, k) => [x, ys[k]]);
    const [u0, u1] = [nudos[grado], nudos[nudos.length - grado - 1]];
    const tramos = Math.max(1, new Set(nudos.slice(grado, nudos.length - grado)).size - 1);
    const n = tramos * porTramo;
    return Array.from({ length: n + 1 }, (_, k) => deBoor(grado, nudos, control, pesos, Math.min(u1, u0 + ((u1 - u0) * k) / n) - (k === n ? 1e-12 : 0)));
  }
  return null;
}
