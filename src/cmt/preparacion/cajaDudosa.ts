import { value, values } from '../dxf.ts';
import type { EntidadDxf } from '../tipos.ts';
import { aplicar } from './hornear.ts';
import type { Caja, P } from './tipos.ts';

function puntos(e: EntidadDxf, x: number, y: number): P[] {
  const xs = values(e, x), ys = values(e, y);
  if (xs.length !== ys.length) throw new Error('Coordenadas incompletas');
  return xs.map((dato, i) => {
    const p = { x: Number(dato), y: Number(ys[i]) };
    if (!dato || !ys[i] || !Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error('Coordenadas inválidas');
    return p;
  });
}

/** Envolvente conservadora. Si no se puede comprobar, la entidad sigue siendo una duda. */
export function cajaDudosa(e: EntidadDxf): Caja | null {
  try {
    const plana = !Number(value(e, 210, '0')) && !Number(value(e, 220, '0'));
    const centro = puntos(e, 10, 20);
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
    } else if (e.type === 'LINE') {
      ps = [...centro, ...puntos(e, 11, 21)];
      if (centro.length !== 1 || ps.length !== 2) return null;
    } else if (['CIRCLE', 'ARC'].includes(e.type) && plana) {
      const [c] = centro, r = Number(value(e, 40));
      if (!c || !(r > 0)) return null;
      const x = Number(value(e, 230, '1')) < 0 ? -c.x : c.x;
      ps = [{ x: x - r, y: c.y - r }, { x: x + r, y: c.y + r }];
    } else {
      return null;
    }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    // Las esquinas cruzadas conservan la caja cuando el bloque lleva giro.
    if (e.type !== 'LINE' && e.type !== 'SPLINE') {
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
