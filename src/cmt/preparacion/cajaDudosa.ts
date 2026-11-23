import { value, values } from '../dxf.ts';
import type { EntidadDxf } from '../tipos.ts';
import { anclaTexto, aplicar, tramoPolilinea, vertices } from './hornear.ts';
import { cajaDe } from './marco.ts';
import type { Caja, P, Pieza } from './tipos.ts';

function puntos(e: EntidadDxf, x: number, y: number): P[] {
  const xs = values(e, x), ys = values(e, y);
  if (xs.length !== ys.length) throw new Error('Coordenadas incompletas');
  return xs.map((dato, i) => {
    const p = { x: Number(dato), y: Number(ys[i]) };
    if (!dato || !ys[i] || !Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error('Coordenadas inválidas');
    return p;
  });
}

function cajaPolilinea(e: EntidadDxf): Caja | null {
  const vs = vertices(e);
  if (vs.length < 2 || Number(value(e, 90)) !== vs.length || vs.some(p => ![p.x, p.y, p.bulge].every(Number.isFinite))) return null;
  const tramos: Pieza[] = [];
  const n = (Number(value(e, 70)) & 1) ? vs.length : vs.length - 1;
  for (let i = 0; i < n; i++) {
    const a = vs[i], b = vs[(i + 1) % vs.length], base = { capa: '', id: '' };
    if (a.x === b.x && a.y === b.y) continue;
    const tramo = tramoPolilinea(a, b, a.bulge);
    tramos.push(tramo.tipo === 'arco' ? { ...tramo, ...base, circulo: false } : { ...tramo, ...base });
  }
  const caja = cajaDe(tramos);
  if (!caja) return null;
  const ancho = e.pairs.reduce((max, [c, v]) => [40, 41, 43].includes(c) ? Math.max(max, Math.abs(Number(v))) : max, 0);
  return { x0: caja.x0 - ancho, x1: caja.x1 + ancho, y0: caja.y0 - ancho, y1: caja.y1 + ancho };
}

/** Envolvente conservadora. Si no se puede comprobar, la entidad sigue siendo una duda. */
export function cajaDudosa(e: EntidadDxf): Caja | null {
  try {
    const plana = !Number(value(e, 210, '0')) && !Number(value(e, 220, '0'));
    const centro = puntos(e, 10, 20);
    const signoX = Number(value(e, 230, '1')) < 0 ? -1 : 1;
    const m = e.transformacion;
    let ps: P[];
    if (e.type === 'SPLINE') {
      if (values(e, 41).some(v => !(Number(v) > 0)) || centro.length < 2) return null;
      ps = [...centro, ...puntos(e, 11, 21)];
    } else if (e.type === 'ELLIPSE' && plana) {
      const [a] = centro, [b] = puntos(e, 11, 21);
      const ratio = Number(value(e, 40));
      if (!a || !b || !(ratio > 0 && ratio <= 1)) return null;
      const dx = Math.hypot(b.x, b.y * ratio), dy = Math.hypot(b.y, b.x * ratio);
      ps = [{ x: a.x - dx, y: a.y - dy }, { x: a.x + dx, y: a.y + dy }];
    } else if (e.type === 'LWPOLYLINE' && plana) {
      const c = cajaPolilinea(e);
      if (!c) return null;
      ps = [{ x: signoX * c.x0, y: c.y0 }, { x: signoX * c.x1, y: c.y1 }];
    } else if (e.type === 'TEXT' && plana) {
      const ancla = anclaTexto(e.pairs);
      const [p] = puntos(e, ancla, ancla + 10);
      if (!p) return null;
      ps = [{ x: signoX * p.x, y: p.y }];
    } else if (e.type === 'LINE') {
      ps = [...centro, ...puntos(e, 11, 21)];
      if (centro.length !== 1 || ps.length !== 2) return null;
    } else if (['CIRCLE', 'ARC'].includes(e.type) && plana) {
      const [c] = centro, r = Number(value(e, 40));
      if (!c || !(r > 0)) return null;
      const x = signoX * c.x;
      ps = [{ x: x - r, y: c.y - r }, { x: x + r, y: c.y + r }];
    } else {
      return null;
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    // Las esquinas cruzadas conservan la caja cuando el bloque lleva giro.
    if (ps.length === 2 && e.type !== 'LINE' && e.type !== 'SPLINE') {
      const [a, b] = ps;
      ps.push({ x: a.x, y: b.y }, { x: b.x, y: a.y });
    }
    for (const p of ps) {
      const q = m ? aplicar(m, p) : p;
      x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x);
      y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
    }
    return [x0, y0, x1, y1].every(Number.isFinite) ? { x0, y0, x1, y1 } : null;
  } catch {
    return null;
  }
}
