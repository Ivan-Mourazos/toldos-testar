// Geometría de las copias locales. No completa bordes abiertos ni gira piezas.
import { codigosAssa as codigos } from '../../src/assa/codigos.js';

export { codigos };

const redondear = (n, d = 6) => Number(n.toFixed(d));
export const esCorte = p => !p.deCota && /^(?:corte|cortes\s*-?\s*lona|DISCO[12]|CUTTER)$/i.test(p.capa);
function cajaPuntos(pts) {
  return { x0: Math.min(...pts.map(p => p[0])), x1: Math.max(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), y1: Math.max(...pts.map(p => p[1])) };
}
const dentroCaja = (p, b, e = 1e-7) => p[0] >= b.x0 - e && p[0] <= b.x1 + e && p[1] >= b.y0 - e && p[1] <= b.y1 + e;
function dentroPoligono(p, puntos) {
  let dentro = false;
  for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
    const a = puntos[i], b = puntos[j];
    if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0])
      dentro = !dentro;
  }
  return dentro;
}
// Las curvas se muestrean solo para recorrer las caras. Se guarda siempre el original.
function puntosCurva(p) {
  if (p.tipo === 'arco') {
    const a = p.desde * Math.PI / 180, ang = ((p.hasta - p.desde + 360) % 360 || 360) * Math.PI / 180;
    const n = Math.max(4, Math.ceil(ang / (Math.PI / 36)));
    return Array.from({ length: n + 1 }, (_, i) => [p.punto[0] + p.r * Math.cos(a + ang * i / n), p.punto[1] + p.r * Math.sin(a + ang * i / n)]);
  }
  if (!p.curva)
    return [p.a, p.b];
  const [a, b] = [p.a, p.b], dx = b[0] - a[0], dy = b[1] - a[1];
  const c = [(a[0] + b[0]) / 2 - dy * (1 - p.curva ** 2) / (4 * p.curva), (a[1] + b[1]) / 2 + dx * (1 - p.curva ** 2) / (4 * p.curva)];
  const r = Math.hypot(a[0] - c[0], a[1] - c[1]), ang = 4 * Math.atan(p.curva), ini = Math.atan2(a[1] - c[1], a[0] - c[0]);
  const n = Math.max(2, Math.ceil(Math.abs(ang) / (Math.PI / 36)));
  return Array.from({ length: n + 1 }, (_, i) => i === 0 ? a : i === n ? b : [c[0] + r * Math.cos(ini + ang * i / n), c[1] + r * Math.sin(ini + ang * i / n)]);
}
export function contornosCerrados(primitivas, mmPorUnidad = 1000) {
  const eps = 1e-7, clave = p => p.map(v => Math.round(v / eps)).join(','), nodos = new Map(), aristas = new Map();
  const cortes = primitivas.filter(p => esCorte(p) && ['raya', 'arco'].includes(p.tipo));
  const segmentos = [];
  for (const original of cortes) {
    const pts = puntosCurva(original);
    for (let i = 1; i < pts.length; i++)
      segmentos.push({ a: pts[i - 1], b: pts[i], original });
  }
  // Los extremos que caen sobre otro segmento lo dividen: lados compartidos y uniones en T.
  const horizontales = new Map(), verticales = new Map();
  for (const s of segmentos)
    for (const p of [s.a, s.b]) {
      const x = Math.round(p[0] / eps), y = Math.round(p[1] / eps);
      if (!horizontales.has(y))
        horizontales.set(y, []);
      horizontales.get(y).push(p);
      if (!verticales.has(x))
        verticales.set(x, []);
      verticales.get(x).push(p);
    }
  const nodo = p => {
    const k = clave(p);
    if (!nodos.has(k))
      nodos.set(k, { p, vecinos: new Set() });
    return k;
  };
  for (const s of segmentos) {
    const dx = s.b[0] - s.a[0], dy = s.b[1] - s.a[1], l2 = dx * dx + dy * dy;
    if (l2 < eps * eps)
      continue;
    const candidatos = Math.abs(dy) < eps ? horizontales.get(Math.round(s.a[1] / eps)) ?? [] : Math.abs(dx) < eps ? verticales.get(Math.round(s.a[0] / eps)) ?? [] : [];
    const pts = [s.a, s.b, ...candidatos.filter(p => {
        const t = ((p[0] - s.a[0]) * dx + (p[1] - s.a[1]) * dy) / l2;
        return t > eps && t < 1 - eps;
      })];
    pts.sort((a, b) => (a[0] - b[0]) * dx + (a[1] - b[1]) * dy);
    for (let i = 1; i < pts.length; i++) {
      const a = nodo(pts[i - 1]), b = nodo(pts[i]);
      if (a === b)
        continue;
      nodos.get(a).vecinos.add(b);
      nodos.get(b).vecinos.add(a);
      const k = [a, b].sort().join('|');
      if (!aristas.has(k))
        aristas.set(k, []);
      aristas.get(k).push(s.original);
    }
  }
  for (const n of nodos.values())
    n.orden = [...n.vecinos].sort((a, b) => Math.atan2(nodos.get(a).p[1] - n.p[1], nodos.get(a).p[0] - n.p[0]) - Math.atan2(nodos.get(b).p[1] - n.p[1], nodos.get(b).p[0] - n.p[0]));
  const visitadas = new Set(), salida = [];
  for (const [inicio, n] of nodos)
    for (const siguiente of n.orden) {
      if (visitadas.has(`${inicio}|${siguiente}`))
        continue;
      const camino = [], originales = new Set();
      let a = inicio, b = siguiente, ok = false;
      for (let paso = 0; paso <= aristas.size * 2; paso++) {
        const k = `${a}|${b}`;
        if (visitadas.has(k)) {
          ok = a === inicio && b === siguiente;
          break;
        }
        visitadas.add(k);
        camino.push(nodos.get(a).p);
        for (const p of aristas.get([a, b].sort().join('|')) ?? [])
          originales.add(p);
        const vecinos = nodos.get(b).orden, idx = vecinos.indexOf(a), c = vecinos[(idx - 1 + vecinos.length) % vecinos.length];
        a = b;
        b = c;
      }
      if (!ok || camino.length < 3)
        continue;
      const area = camino.reduce((s, p, i) => {
        const q = camino[(i + 1) % camino.length];
        return s + p[0] * q[1] - p[1] * q[0];
      }, 0) / 2;
      if (area <= eps * eps)
        continue;
      const caja = cajaPuntos(camino);
      salida.push({ caja, medidasMm: [redondear((caja.x1 - caja.x0) * mmPorUnidad, 3), redondear((caja.y1 - caja.y0) * mmPorUnidad, 3)], areaMm2: redondear(area * mmPorUnidad ** 2, 3), puntos: camino, segmentos: [...originales], capas: [...new Set([...originales].map(p => p.capa))] });
    }
  return salida;
}
export function asignarRotulos(contornos, textos) {
  const ts = textos.filter(t => codigos(t.valor).length === 1).map(t => ({ ...t, codigo: codigos(t.valor)[0] }));
  const asignaciones = contornos.map((pieza, i) => {
    const interiores = ts.filter(t => dentroPoligono(t.punto, pieza.puntos));
    // Título sobre la pieza, alineado en X y sin saltar otro título ni otra pieza.
    const superiores = ts.filter(t => t.punto[0] >= pieza.caja.x0 - .5 * t.h && t.punto[0] <= pieza.caja.x1 + .5 * t.h && t.punto[1] >= pieza.caja.y1 && t.punto[1] - pieza.caja.y1 <= Math.max(12 * t.h, (pieza.caja.y1 - pieza.caja.y0) * 2));
    const candidatos = interiores.length ? interiores : superiores.filter(t => !ts.some(o => o !== t && o.punto[1] < t.punto[1] - 1e-7 && o.punto[1] > pieza.caja.y1 && o.punto[0] >= pieza.caja.x0 && o.punto[0] <= pieza.caja.x1));
    const codes = [...new Set(candidatos.map(t => t.codigo))];
    const compite = contornos.some((otra, j) => j !== i && otra.caja.y0 > pieza.caja.y1 + 1e-7 && candidatos.some(t => otra.caja.y1 < t.punto[1] && dentroCaja([t.punto[0], otra.caja.y0], otra.caja)));
    return { pieza: i, codigos: codes, rotulos: candidatos.map(t => ({ handle: t.handle, valor: t.valor, punto: t.punto })), estado: codes.length === 1 && !compite ? 'vinculo-unico' : codes.length ? 'dudoso' : 'sin-rotulo', criterio: interiores.length ? 'codigo dentro del contorno' : 'titulo alineado sobre la pieza; sin otro titulo interpuesto' };
  });
  // Un conjunto de paños contiguos comparte el mismo título. No lo propagamos por distancia.
  const padres = contornos.map((_, i) => i), buscar = i => padres[i] === i ? i : padres[i] = buscar(padres[i]);
  const bordes = new Map(), clave = p => p.map(n => Math.round(n / 1e-7)).join(',');
  contornos.forEach((p, i) => p.puntos.forEach((a, j) => {
    const b = p.puntos[(j + 1) % p.puntos.length], k = [clave(a), clave(b)].sort().join('|');
    if (bordes.has(k))
      padres[buscar(i)] = buscar(bordes.get(k));
    else
      bordes.set(k, i);
  }));
  const grupos = Map.groupBy(asignaciones, a => buscar(a.pieza));
  for (const grupo of grupos.values()) {
    const codes = [...new Set(grupo.flatMap(a => a.codigos))], rotulos = [...new Map(grupo.flatMap(a => a.rotulos).map(t => [t.handle ?? t.valor + String(t.punto), t])).values()];
    if (grupo.length > 1 && codes.length)
      for (const a of grupo) {
        a.codigos = codes;
        a.rotulos = rotulos;
        a.estado = codes.length === 1 ? 'vinculo-unico' : 'dudoso';
        a.criterio = 'panos con borde compartido y titulo comun';
      }
  }
  return asignaciones;
}
export function piezasExteriores(contornos) {
  return contornos.filter((p, i) => !contornos.some((q, j) => i !== j && q.areaMm2 > p.areaMm2 + 1 && dentroCaja([p.caja.x0, p.caja.y0], q.caja) && dentroCaja([p.caja.x1, p.caja.y1], q.caja) && dentroPoligono([(p.caja.x0 + p.caja.x1) / 2, (p.caja.y0 + p.caja.y1) / 2], q.puntos)));
}
