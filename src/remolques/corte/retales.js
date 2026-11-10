const EPS = .001;
const derecha = p => p.x + p.w, arriba = p => p.y + p.h;

// Los candidatos pueden cruzarse entre sí. Solo se descuenta la lona ocupada por piezas o stock
// elegido, nunca un hueco entero antes de saber si sirve.
export function restarRetal(libres, p) {
  const siguientes = [];
  for (const h of libres) {
    if (p.x >= derecha(h) - EPS || derecha(p) <= h.x + EPS || p.y >= arriba(h) - EPS || arriba(p) <= h.y + EPS) {
      siguientes.push(h); continue;
    }
    if (p.x > h.x + EPS) siguientes.push({ ...h, w: p.x - h.x });
    if (derecha(p) < derecha(h) - EPS) siguientes.push({ ...h, x: derecha(p), w: derecha(h) - derecha(p) });
    if (p.y > h.y + EPS) siguientes.push({ ...h, h: p.y - h.y });
    if (arriba(p) < arriba(h) - EPS) siguientes.push({ ...h, y: arriba(p), h: arriba(h) - arriba(p) });
  }
  return siguientes.filter((a, i) => !siguientes.some((b, j) => i !== j && b.x <= a.x + EPS && b.y <= a.y + EPS
    && derecha(b) >= derecha(a) - EPS && arriba(b) >= arriba(a) - EPS
    && (j < i || b.w * b.h > a.w * a.h + EPS)));
}

export function huecosStock(ocupadas, largo, rollo) {
  let libres = largo > 0 && rollo > 0 ? [{ x: 0, y: 0, w: largo, h: rollo }] : [];
  for (const p of ocupadas) libres = restarRetal(libres, { x: p.x, y: p.y, w: p.ancho, h: p.hueco });
  return libres;
}
