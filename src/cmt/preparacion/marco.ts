import { anclaTexto, normGrados } from './hornear.ts';
import type { EntidadDxf } from '../tipos.ts';
import type { Caja, P, Pieza } from './tipos.ts';

const RAD = Math.PI / 180;
type Arco = Extract<Pieza, { tipo: 'arco' }>;
export const barridoArco = (p: Arco) => p.circulo ? 360 : normGrados(p.hasta - p.desde) || 360;

export function cajaPieza(p: Pieza): Caja {
  if (p.tipo === 'linea') return { x0: Math.min(p.a.x, p.b.x), y0: Math.min(p.a.y, p.b.y), x1: Math.max(p.a.x, p.b.x), y1: Math.max(p.a.y, p.b.y) };
  if (p.tipo === 'texto') {
    const ancla = anclaTexto(p.pares);
    const x = Number(p.pares.find(([c]) => c === ancla)?.[1]), y = Number(p.pares.find(([c]) => c === ancla + 10)?.[1]);
    return { x0: x, y0: y, x1: x, y1: y };
  }
  const barrido = barridoArco(p);
  const angulos = [p.desde, p.desde + barrido, ...[0, 90, 180, 270, 360].filter(g => normGrados(g - p.desde) <= barrido || p.circulo)];
  const xs = angulos.map(g => p.c.x + p.r * Math.cos(g * RAD)), ys = angulos.map(g => p.c.y + p.r * Math.sin(g * RAD));
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
export function cajaDe(piezas: Pieza[]): Caja | null {
  if (!piezas.length) return null;
  return piezas.map(cajaPieza).reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }));
}
export const toleranciaDe = (c: Caja) => 1e-6 * Math.max(c.x1 - c.x0, c.y1 - c.y0) + 1e-9;
const entre = (v: number, min: number, max: number) => v >= min && v <= max;

function cruzaSegmento(a: P, b: P, m: Caja): boolean {
  let inicio = 0, fin = 1;
  for (const [p, d, min, max] of [[a.x, b.x - a.x, m.x0, m.x1], [a.y, b.y - a.y, m.y0, m.y1]]) {
    if (d === 0) {
      if (!entre(p, min, max)) return false;
      continue;
    }
    const t0 = (min - p) / d, t1 = (max - p) / d;
    inicio = Math.max(inicio, Math.min(t0, t1));
    fin = Math.min(fin, Math.max(t0, t1));
    if (inicio > fin) return false;
  }
  return true;
}

function cruzaArco(p: Arco, m: Caja): boolean {
  const barrido = barridoArco(p);
  for (const [eje, lado, otro, min, max] of [
    ['x', m.x0, 'y', m.y0, m.y1], ['x', m.x1, 'y', m.y0, m.y1],
    ['y', m.y0, 'x', m.x0, m.x1], ['y', m.y1, 'x', m.x0, m.x1],
  ] as const) {
    const d = lado - p.c[eje];
    if (Math.abs(d) > p.r) continue;
    const offset = Math.sqrt((p.r - Math.abs(d)) * (p.r + Math.abs(d)));
    for (const v of [offset, -offset]) {
      const angulo = (eje === 'x' ? Math.atan2(v, d) : Math.atan2(d, v)) / RAD;
      if (entre(p.c[otro] + v, min, max) && normGrados(angulo - p.desde) <= barrido + 1e-9) return true;
    }
  }
  return false;
}

export function clasificar(p: Pieza, marco: Caja, tol: number): 'dentro' | 'fuera' | 'cruza' {
  const c = cajaPieza(p);
  const m = { x0: marco.x0 - tol, y0: marco.y0 - tol, x1: marco.x1 + tol, y1: marco.y1 + tol };
  if (c.x0 >= m.x0 && c.x1 <= m.x1 && c.y0 >= m.y0 && c.y1 <= m.y1) return 'dentro';
  if (c.x1 < m.x0 || c.x0 > m.x1 || c.y1 < m.y0 || c.y0 > m.y1) return 'fuera';
  const cruza = p.tipo === 'linea' ? cruzaSegmento(p.a, p.b, m) : p.tipo === 'arco' && cruzaArco(p, m);
  return cruza ? 'cruza' : 'fuera';
}

export function esBorde(p: Pieza, m: Caja, tol: number): boolean {
  if (p.tipo !== 'linea' || p.capa !== '0' || p.deBloque) return false;
  const sobre = (lado: number, a: number, b: number) => Math.abs(a - lado) <= tol && Math.abs(b - lado) <= tol;
  const horizontal = entre(p.a.x, m.x0 - tol, m.x1 + tol) && entre(p.b.x, m.x0 - tol, m.x1 + tol)
    && [m.y0, m.y1].some(y => sobre(y, p.a.y, p.b.y));
  const vertical = entre(p.a.y, m.y0 - tol, m.y1 + tol) && entre(p.b.y, m.y0 - tol, m.y1 + tol)
    && [m.x0, m.x1].some(x => sobre(x, p.a.x, p.b.x));
  return horizontal || vertical;
}

const mismaCaja = (o: Caja, m: Caja, tol: number) =>
  Math.abs(o.x0 - m.x0) <= tol && Math.abs(o.y0 - m.y0) <= tol && Math.abs(o.x1 - m.x1) <= tol && Math.abs(o.y1 - m.y1) <= tol;

/** Rectángulo del marco en la capa 0, con algo del corte dentro o cruzándolo. */
export function buscarMarcos(piezas: Pieza[]): Caja[] {
  const corte = piezas.filter(p => p.capa !== '0' && !esCapaRecuadros(p.capa));
  return rectangulos(piezas, '0').filter(m => corte.some(p => clasificar(p, m, toleranciaDe(m)) !== 'fuera'));
}

/** Rectángulos hechos con cuatro líneas sueltas de la capa dada (no de bloques). */
function rectangulos(piezas: Pieza[], capa: string): Caja[] {
  const lineas = piezas.filter((p): p is Extract<Pieza, { tipo: 'linea' }> => p.tipo === 'linea' && p.capa === capa && !p.deBloque);
  const horizontales = lineas.filter(p => Math.abs(p.a.y - p.b.y) < 1e-5 * Math.abs(p.a.x - p.b.x));
  const verticales = lineas.filter(p => Math.abs(p.a.x - p.b.x) < 1e-5 * Math.abs(p.a.y - p.b.y));
  const marcos: Caja[] = [];
  for (const inferior of horizontales) {
    for (const superior of horizontales) {
      const m = { x0: Math.min(inferior.a.x, inferior.b.x), x1: Math.max(inferior.a.x, inferior.b.x), y0: inferior.a.y, y1: superior.a.y };
      const tol = toleranciaDe(m);
      if (m.x1 - m.x0 <= tol || m.y1 - m.y0 <= tol) continue;
      const en = (a: number, b: number) => Math.abs(a - b) <= tol;
      if (!en(inferior.b.y, m.y0) || !en(superior.b.y, m.y1)
        || !en(Math.min(superior.a.x, superior.b.x), m.x0) || !en(Math.max(superior.a.x, superior.b.x), m.x1)) continue;
      const lado = (x: number) => verticales.some(({ a, b }) => en(a.x, x) && en(b.x, x)
        && en(Math.min(a.y, b.y), m.y0) && en(Math.max(a.y, b.y), m.y1));
      if (!lado(m.x0) || !lado(m.x1)) continue;
      if (!marcos.some(o => mismaCaja(o, m, tol))) marcos.push(m);
    }
  }
  return marcos;
}

const esCapaRecuadros = (capa: string) => capa.trim().toUpperCase() === 'RECUADROS';
const valor = (e: EntidadDxf, codigo: number) => e.pairs.find(([c]) => c === codigo)?.[1] ?? '';

/** Rectángulo de una polilínea cerrada de cuatro vértices con los lados en horizontal y vertical. */
function cajaPolilinea(e: EntidadDxf): Caja | null {
  const xs = e.pairs.filter(([c]) => c === 10).map(([, v]) => Number(v));
  const ys = e.pairs.filter(([c]) => c === 20).map(([, v]) => Number(v));
  const cerrada = (Number(valor(e, 70)) & 1) === 1;
  if (xs.length !== ys.length || !(xs.length === 4 && cerrada || xs.length === 5 && xs[0] === xs[4] && ys[0] === ys[4])) return null;
  if (e.pairs.some(([c, v]) => c === 42 && Number(v) !== 0) || [...xs, ...ys].some(v => !Number.isFinite(v))) return null;
  const c = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  const tol = toleranciaDe(c);
  if (c.x1 - c.x0 <= tol || c.y1 - c.y0 <= tol) return null;
  const enBorde = xs.slice(0, 4).every((x, i) => (Math.abs(x - c.x0) <= tol || Math.abs(x - c.x1) <= tol)
    && (Math.abs(ys[i] - c.y0) <= tol || Math.abs(ys[i] - c.y1) <= tol));
  return enBorde ? c : null;
}

/** Texto de un TEXT o MTEXT sin los códigos de formato de MTEXT. */
const textoPlano = (e: EntidadDxf) => e.pairs.filter(([c]) => c === 3 || c === 1).map(([, v]) => v).join('')
  .replace(/\\[A-Za-z][^;\\{}]*;/g, '').replace(/\\P/g, ' ').replace(/[{}]/g, '').trim().toUpperCase();

/**
 * El recuadro CORTE que deja la web en sus planos (capa RECUADROS, con el rótulo «CORTE» encima y por fuera, ver
 * presentacion.js). Vale igual que el rectángulo de la capa 0 (Iván, 24/11/2026). El de DIBUJO no cuenta.
 */
export function marcosWeb(entidades: EntidadDxf[], piezas: Pieza[]): Caja[] {
  const enModelo = (e: EntidadDxf) => esCapaRecuadros(valor(e, 8)) && Number(valor(e, 67) || 0) !== 1;
  const rotulos = entidades.filter(e => enModelo(e) && (e.type === 'MTEXT' || e.type === 'TEXT') && textoPlano(e) === 'CORTE')
    .map(e => {
      const ancla = e.type === 'TEXT' ? anclaTexto(e.pairs) : 10;
      return { x: Number(valor(e, ancla)), y: Number(valor(e, ancla + 10)) };
    });
  if (!rotulos.length) return [];
  const candidatos = [
    ...entidades.filter(e => enModelo(e) && e.type === 'LWPOLYLINE').map(cajaPolilinea).filter((c): c is Caja => c !== null),
    ...rectangulos(piezas.filter(p => esCapaRecuadros(p.capa)).map(p => ({ ...p, capa: 'RECUADROS' })), 'RECUADROS'),
  ];
  const marcos: Caja[] = [];
  for (const m of candidatos) {
    const alto = m.y1 - m.y0, ancho = m.x1 - m.x0, tol = toleranciaDe(m);
    const rotulado = rotulos.some(({ x, y }) => y >= m.y1 - tol && y <= m.y1 + alto && x >= m.x0 - 0.1 * ancho && x <= m.x0 + 0.5 * ancho);
    if (rotulado && !marcos.some(o => mismaCaja(o, m, tol))) marcos.push(m);
  }
  return marcos;
}

/** Junta los marcos de la capa 0 y los de la web sin repetir el mismo rectángulo. */
export function unirMarcos(...grupos: Caja[][]): Caja[] {
  const todos: Caja[] = [];
  for (const m of grupos.flat()) if (!todos.some(o => mismaCaja(o, m, toleranciaDe(m)))) todos.push(m);
  return todos;
}
