import { normGrados } from './hornear.ts';
import { barridoArco as barrido, cajaPieza } from './marco.ts';
import type { Caja, Pieza } from './tipos.ts';

export const TOL_MM = 0.01;
type Linea = Extract<Pieza, { tipo: 'linea' }>; type Arco = Extract<Pieza, { tipo: 'arco' }>;
export const longitud = (p: Pieza) => p.tipo === 'linea' ? Math.hypot(p.b.x - p.a.x, p.b.y - p.a.y) : p.tipo === 'arco' ? p.r * barrido(p) * Math.PI / 180 : 0;
const cercanas = (a: Caja, b: Caja, t: number) => a.x0 <= b.x1 + t && b.x0 <= a.x1 + t && a.y0 <= b.y1 + t && b.y0 <= a.y1 + t;

function pisadoLinea(p: Linea, q: Linea, tol: number): [number, number] | null {
  const lp = longitud(p), lq = longitud(q);
  if (Math.min(lp, lq) <= tol) return null;
  const [larga, corta] = lp >= lq ? [p, q] : [q, p];
  const L = Math.max(lp, lq);
  const ux = (larga.b.x - larga.a.x) / L, uy = (larga.b.y - larga.a.y) / L;
  const distancia = (r: Linea['a']) => Math.abs((r.x - larga.a.x) * uy - (r.y - larga.a.y) * ux);
  if (distancia(corta.a) > tol || distancia(corta.b) > tol) return null;
  const proyeccion = (r: Linea['a']) => ((r.x - p.a.x) * (p.b.x - p.a.x) + (r.y - p.a.y) * (p.b.y - p.a.y)) / lp;
  const pa = proyeccion(q.a), pb = proyeccion(q.b);
  const lo = Math.max(0, Math.min(pa, pb)), hi = Math.min(lp, Math.max(pa, pb));
  return hi - lo > tol ? [lo, hi] : null;
}

function trozoLinea(p: Linea, lo: number, hi: number): Linea {
  const L = longitud(p);
  const punto = (s: number) => ({ x: p.a.x + (p.b.x - p.a.x) * (s / L), y: p.a.y + (p.b.y - p.a.y) * (s / L) });
  return { ...p, a: punto(lo), b: punto(hi) };
}

function restarLineas(p: Linea, q: Linea, tol: number): Pieza[] {
  const tramo = pisadoLinea(p, q, tol);
  if (!tramo) return [p];
  const [lo, hi] = tramo, L = longitud(p);
  const salida: Linea[] = [];
  if (lo > tol) salida.push(trozoLinea(p, 0, lo));
  if (L - hi > tol) salida.push(trozoLinea(p, hi, L));
  return salida;
}

function pisadoArco(p: Arco, q: Arco, tol: number): [number, number][] {
  if (Math.hypot(p.c.x - q.c.x, p.c.y - q.c.y) > tol || Math.abs(p.r - q.r) > tol) return [];
  const tg = tol / Math.min(p.r, q.r) * 180 / Math.PI;
  const ps = p.circulo ? 0 : normGrados(p.desde), pe = ps + barrido(p), qsw = barrido(q);
  const quitar: [number, number][] = [];
  for (const k of [-360, 0, 360]) {
    const qs = (q.circulo ? 0 : normGrados(q.desde)) + k;
    const lo = Math.max(ps, qs), hi = Math.min(pe, qs + qsw);
    if (hi > lo) quitar.push([lo, hi]);
  }
  return quitar.reduce((suma, [lo, hi]) => suma + hi - lo, 0) > tg ? quitar : [];
}

const trozoArco = (p: Arco, lo: number, hi: number): Arco =>
  ({ ...p, circulo: hi - lo >= 360, desde: normGrados(lo), hasta: normGrados(hi) });

function restarArcos(p: Arco, q: Arco, tol: number): Pieza[] {
  const quitar = pisadoArco(p, q, tol);
  if (!quitar.length) return [p];
  const tg = tol / p.r * 180 / Math.PI, ps = p.circulo ? 0 : normGrados(p.desde), pe = ps + barrido(p);
  const quedan: [number, number][] = [];
  let cursor = ps;
  for (const [lo, hi] of quitar) {
    if (lo - cursor > tg) quedan.push([cursor, lo]);
    cursor = Math.max(cursor, hi);
  }
  if (pe - cursor > tg) quedan.push([cursor, pe]);
  if (p.circulo && quedan.length > 1 && quedan[0][0] === ps && quedan.at(-1)?.[1] === pe) {
    const ultimo = quedan.pop()!;
    quedan[0] = [ultimo[0], quedan[0][1] + 360];
  }
  return quedan.map(([lo, hi]) => trozoArco(p, lo, hi));
}

function tramosPisados(p: Pieza, q: Pieza): Pieza[] {
  if (p.tipo === 'linea' && q.tipo === 'linea') {
    const tramo = pisadoLinea(p, q, TOL_MM);
    return tramo ? [trozoLinea(p, ...tramo)] : [];
  }
  if (p.tipo === 'arco' && q.tipo === 'arco') {
    return pisadoArco(p, q, TOL_MM).map(([lo, hi]) => trozoArco(p, lo, hi));
  }
  return [];
}

export function restar(p: Pieza, q: Pieza, tol = TOL_MM): Pieza[] {
  if (p.tipo === 'linea' && q.tipo === 'linea') return restarLineas(p, q, tol);
  if (p.tipo === 'arco' && q.tipo === 'arco') return restarArcos(p, q, tol);
  return [p];
}
function restarTodas(p: Pieza, otras: Pieza[]): Pieza[] {
  let trozos = [p];
  for (const q of otras) {
    const cq = cajaPieza(q);
    trozos = trozos.flatMap(t => cercanas(cajaPieza(t), cq, TOL_MM) ? restar(t, q) : [t]);
    if (!trozos.length) break;
  }
  return trozos;
}
export function quitarRepetidos(piezas: Pieza[]): { piezas: Pieza[]; mm: number } {
  const salida: Pieza[] = [], porCapa = new Map<string, Pieza[]>(); let mm = 0;
  for (const p of piezas) {
    if (p.tipo === 'texto') { salida.push(p); continue; }
    const previas = porCapa.get(p.capa) ?? [];
    const trozos = restarTodas(p, previas);
    mm += longitud(p) - trozos.reduce((s, t) => s + longitud(t), 0);
    previas.push(...trozos); porCapa.set(p.capa, previas); salida.push(...trozos);
  }
  return { piezas: salida, mm };
}
export interface GrupoSolape { clave: string; capas: [string, string]; zonas: Caja[]; mm: number }
export function buscarSolapes(piezas: Pieza[]): GrupoSolape[] {
  const grupos = new Map<string, GrupoSolape>(), ps = piezas.filter(p => p.tipo !== 'texto'), cajas = ps.map(cajaPieza);
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    if (ps[i].capa === ps[j].capa || !cercanas(cajas[i], cajas[j], TOL_MM)) continue;
    const tramos = tramosPisados(ps[i], ps[j]);
    const pisado = tramos.reduce((s, t) => s + longitud(t), 0);
    if (pisado <= TOL_MM) continue;
    const capas = [ps[i].capa, ps[j].capa].sort() as [string, string], clave = capas.join('|');
    const g = grupos.get(clave) ?? { clave, capas, zonas: [], mm: 0 };
    g.mm += pisado;
    g.zonas.push(...tramos.map(cajaPieza));
    grupos.set(clave, g);
  }
  return [...grupos.values()];
}
export function aplicarSolapes(piezas: Pieza[], decisiones: Record<string, string>): Pieza[] {
  let actual = piezas;
  for (const clave of Object.keys(decisiones).sort()) {
    const gana = decisiones[clave];
    const [a, b, ...resto] = clave.split('|');
    if (!a || !b || a === b || resto.length || (gana !== a && gana !== b)) throw new Error('Elige una de las dos capas del solape.');
    const pierde = gana === a ? b : a;
    const ganadoras = actual.filter(p => p.capa === gana);
    actual = actual.flatMap(p => p.capa === pierde ? restarTodas(p, ganadoras) : [p]);
  }
  return actual;
}
