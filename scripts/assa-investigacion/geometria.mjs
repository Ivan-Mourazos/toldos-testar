// Lectura geométrica: derivada de assa-lote/tmp/caras.mjs, sin consultar medidas esperadas.
export const red = n => Math.round(n * 1000) / 1000;
export const cerca = (a, b, eps = 1) => Math.abs(a - b) <= eps;
export const unico = a => [...new Set(a)];
export const suma = a => a.reduce((s, n) => s + n, 0);
export const pedidoDe = s => {
  const m = String(s).toUpperCase().match(/\bAR[.\s]?(\d{2})[.\s]?(\d{5})(?!\d)/);
  return m ? `AR.${m[1]}.${m[2]}` : null;
};
export const candidatoUnico = candidatos => candidatos.length === 1 ? candidatos[0] : null;
export const cajaDe = puntos => ({ x0: Math.min(...puntos.map(p => p[0])), x1: Math.max(...puntos.map(p => p[0])),
  y0: Math.min(...puntos.map(p => p[1])), y1: Math.max(...puntos.map(p => p[1])) });
export const dentro = (p, c, e = 0) => p[0] >= c.x0 - e && p[0] <= c.x1 + e && p[1] >= c.y0 - e && p[1] <= c.y1 + e;
export function componentes(items, vecinos) {
  const pendientes = new Set(items), resultado = [];
  while (pendientes.size) {
    const primero = pendientes.values().next().value, grupo = [primero]; pendientes.delete(primero);
    for (let i = 0; i < grupo.length; i++) for (const q of pendientes) if (vecinos(grupo[i], q)) {
      pendientes.delete(q); grupo.push(q);
    }
    resultado.push(grupo);
  }
  return resultado;
}

// Una fila es una pila en el ancho del rollo, con proyección horizontal común y bordes que se tocan.
// Admite largos distintos; no junta filas separadas por un pasillo ni columnas sin solape.
export function filasPanos(panos) {
  return componentes(panos, (a, b) => {
    const p = a.caja, q = b.caja, solape = Math.min(p.x1, q.x1) - Math.max(p.x0, q.x0);
    return solape > Math.min(p.x1 - p.x0, q.x1 - q.x0) * .5 &&
      (cerca(p.y0, q.y1) || cerca(p.y1, q.y0) || (cerca(p.y0, q.y0) && cerca(p.y1, q.y1) && cerca(p.x1, q.x0)));
  }).map(ps => ({ panos: ps, codigos: unico(ps.map(p => p.codigo)).sort(),
    caja: cajaDe(ps.flatMap(p => [[p.caja.x0, p.caja.y0], [p.caja.x1, p.caja.y1]])) }));
}

export function caras(modelo, capas = /^DISCO[12]$/) {
  const segs = modelo.filter(p => p.tipo === 'raya' && !p.deCota && capas.test(p.capa) && !p.curva)
    .map(p => [p.a, p.b]);
  const clave = q => `${Math.round(q[0] * 10)},${Math.round(q[1] * 10)}`;
  const pts = new Map(); for (const s of segs) for (const q of s) pts.set(clave(q), q);
  const puntos = [...pts.values()], trozos = [];
  // Partir por extremos interiores permite cerrar caras que comparten un borde en T.
  for (const [a, b] of segs) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy;
    if (l2 < 1e-6) continue;
    const ts = [0, 1], x0 = Math.min(a[0], b[0]) - .2, x1 = Math.max(a[0], b[0]) + .2,
      y0 = Math.min(a[1], b[1]) - .2, y1 = Math.max(a[1], b[1]) + .2;
    for (const q of puntos) {
      if (q[0] < x0 || q[0] > x1 || q[1] < y0 || q[1] > y1) continue;
      const t = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l2;
      if (t <= 1e-6 || t >= 1 - 1e-6) continue;
      const d = Math.abs((q[0] - a[0]) * dy - (q[1] - a[1]) * dx) / Math.sqrt(l2);
      if (d < .15) ts.push(t);
    }
    ts.sort((u, v) => u - v);
    for (let i = 1; i < ts.length; i++) trozos.push([[a[0] + dx * ts[i - 1], a[1] + dy * ts[i - 1]],
      [a[0] + dx * ts[i], a[1] + dy * ts[i]]]);
  }
  const ady = new Map(), nodos = new Map();
  for (const [a, b] of trozos) {
    const ka = clave(a), kb = clave(b); if (ka === kb) continue;
    nodos.set(ka, a); nodos.set(kb, b);
    if (!ady.has(ka)) ady.set(ka, new Set()); if (!ady.has(kb)) ady.set(kb, new Set());
    ady.get(ka).add(kb); ady.get(kb).add(ka);
  }
  const ang = (u, v) => { const p = nodos.get(u), q = nodos.get(v); return Math.atan2(q[1] - p[1], q[0] - p[0]); };
  const orden = new Map([...ady].map(([u, vs]) => [u, [...vs].sort((v, w) => ang(u, v) - ang(u, w))]));
  const usado = new Set(), resultado = [];
  for (const [u0, vs] of orden) for (const v0 of vs) {
    if (usado.has(`${u0}>${v0}`)) continue;
    const poli = []; let u = u0, v = v0, n = 0;
    while (!usado.has(`${u}>${v}`) && n++ < 10000) {
      usado.add(`${u}>${v}`); poli.push(nodos.get(u));
      const lista = orden.get(v), i = lista.indexOf(u), w = lista[(i - 1 + lista.length) % lista.length]; u = v; v = w;
    }
    if (u !== u0 || v !== v0) continue;
    let area = 0;
    for (let i = 0; i < poli.length; i++) { const p = poli[i], q = poli[(i + 1) % poli.length]; area += p[0] * q[1] - q[0] * p[1]; }
    if (area > .01) resultado.push({ poli, area: red(area / 2), ...cajaDe(poli) });
  }
  return resultado;
}
