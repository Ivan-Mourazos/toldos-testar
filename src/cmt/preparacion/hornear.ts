import { prepararEntidades } from '../entidades.ts';
import { number, value } from '../dxf.ts';
import type { Dxf, Duda, EntidadDxf } from '../tipos.ts';
import type { Matriz, P, Pieza } from './tipos.ts';

const ID: Matriz = [1, 0, 0, 1, 0, 0];
const ESPEJO_OCS: Matriz = [-1, 0, 0, 1, 0, 0];
const OMITIR = new Set(['POINT', 'HATCH', 'WIPEOUT', 'IMAGE', 'VIEWPORT']);
const RAD = Math.PI / 180;

export const normGrados = (g: number) => ((g % 360) + 360) % 360;
export const aplicar = (m: Matriz, p: P): P => ({ x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] });
export const componer = (a: Matriz, b: Matriz): Matriz => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];

function uniforme(m: Matriz): { s: number; espejo: boolean } | null {
  const a2 = m[0] ** 2 + m[1] ** 2, b2 = m[2] ** 2 + m[3] ** 2, cruz = m[0] * m[2] + m[1] * m[3], ref = Math.max(a2, b2);
  if (!(ref > 0) || !Number.isFinite(ref) || Math.abs(a2 - b2) > 1e-6 * ref || Math.abs(cruz) > 1e-6 * ref) return null;
  return { s: Math.sqrt(a2), espejo: m[0] * m[3] - m[1] * m[2] < 0 };
}
const anguloImagen = (m: Matriz, g: number) => normGrados(Math.atan2(m[1] * Math.cos(g * RAD) + m[3] * Math.sin(g * RAD), m[0] * Math.cos(g * RAD) + m[2] * Math.sin(g * RAD)) / RAD);

export function tramoPolilinea(p: P, q: P, bulge: number):
  { tipo: 'linea'; a: P; b: P } | { tipo: 'arco'; c: P; r: number; desde: number; hasta: number } {
  if (Math.abs(bulge) < 1e-12) return { tipo: 'linea', a: p, b: q };
  const dx = q.x - p.x, dy = q.y - p.y, cuerda = Math.hypot(dx, dy);
  const d = cuerda * (1 - bulge * bulge) / (4 * bulge); // del punto medio al centro, hacia la izquierda de p→q
  const c = { x: (p.x + q.x) / 2 - dy / cuerda * d, y: (p.y + q.y) / 2 + dx / cuerda * d };
  const r = Math.hypot(p.x - c.x, p.y - c.y);
  const ap = normGrados(Math.atan2(p.y - c.y, p.x - c.x) / RAD), aq = normGrados(Math.atan2(q.y - c.y, q.x - c.x) / RAD);
  return bulge > 0 ? { tipo: 'arco', c, r, desde: ap, hasta: aq } : { tipo: 'arco', c, r, desde: aq, hasta: ap };
}

export function transformarPieza(p: Pieza, m: Matriz): Pieza {
  if (p.tipo === 'linea') return { ...p, a: aplicar(m, p.a), b: aplicar(m, p.b) };
  const u = uniforme(m);
  if (!u) throw new Error(`Hay un bloque con escala desigual en la capa ${p.capa}: descompón el bloque en ZWCAD y revisa sus arcos y textos`);
  if (p.tipo === 'arco') {
    const c = aplicar(m, p.c), r = p.r * u.s;
    if (p.circulo) return { ...p, c, r, desde: 0, hasta: 360 };
    const a0 = anguloImagen(m, p.desde), a1 = anguloImagen(m, p.hasta);
    return { ...p, c, r, desde: u.espejo ? a1 : a0, hasta: u.espejo ? a0 : a1 };
  }
  if (u.espejo) throw new Error(`Hay un texto reflejado en la capa ${p.capa}: descompón el bloque en ZWCAD y endereza el texto`);
  const pares = p.pares.filter(([c]) => anclaTexto(p.pares) === 11 || (c !== 11 && c !== 21 && c !== 31)).map(([c, v]) => [c, v] as [number, string]);
  const punto = (cx: number, cy: number) => {
    const ix = pares.findIndex(([c]) => c === cx), iy = pares.findIndex(([c]) => c === cy);
    if (ix < 0 || iy < 0) return;
    const q = aplicar(m, { x: Number(pares[ix][1]), y: Number(pares[iy][1]) });
    pares[ix] = [cx, String(q.x)]; pares[iy] = [cy, String(q.y)];
  };
  punto(10, 20);
  if (anclaTexto(pares) === 11) punto(11, 21);
  const i40 = pares.findIndex(([c]) => c === 40); if (i40 >= 0) pares[i40] = [40, String(Number(pares[i40][1]) * u.s)];
  const i50 = pares.findIndex(([c]) => c === 50), g = anguloImagen(m, i50 >= 0 ? Number(pares[i50][1]) : 0);
  if (i50 >= 0) pares[i50] = [50, String(g)]; else if (g > 1e-9) pares.push([50, String(g)]);
  return { ...p, pares };
}
export const transformarPiezas = (piezas: Pieza[], m: Matriz) => piezas.map(p => transformarPieza(p, m));

function vertices(e: EntidadDxf): { x: number; y: number; bulge: number }[] {
  const out: { x: number; y: number; bulge: number }[] = [];
  for (const [c, v] of e.pairs) {
    if (c === 10) out.push({ x: Number(v), y: NaN, bulge: 0 });
    else if (c === 20 && out.length) out[out.length - 1].y = Number(v);
    else if (c === 42 && out.length) out[out.length - 1].bulge = Number(v);
  }
  return out;
}

function locales(e: EntidadDxf, capa: string, id: string, estilo?: Record<number, string>): Pieza[] {
  if (e.type === 'LINE') return [{ tipo: 'linea', capa, id, a: { x: number(e, 10), y: number(e, 20) }, b: { x: number(e, 11), y: number(e, 21) } }];
  if (e.type === 'CIRCLE') return [{ tipo: 'arco', capa, id, c: { x: number(e, 10), y: number(e, 20) }, r: number(e, 40), desde: 0, hasta: 360, circulo: true }];
  if (e.type === 'ARC') return [{ tipo: 'arco', capa, id, c: { x: number(e, 10), y: number(e, 20) }, r: number(e, 40), desde: normGrados(number(e, 50)), hasta: normGrados(number(e, 51)), circulo: false }];
  if (e.type === 'LWPOLYLINE') {
    const v = vertices(e), cerrada = (number(e, 70) & 1) === 1, out: Pieza[] = [];
    if (v.length !== number(e, 90) || !v.length || v.some(p => ![p.x, p.y, p.bulge].every(Number.isFinite))) {
      throw new Error('La polilínea tiene vértices incompletos: repárala en ZWCAD');
    }
    const n = cerrada ? v.length : v.length - 1;
    for (let i = 0; i < n; i++) {
      const p = v[i], q = v[(i + 1) % v.length];
      if (Math.hypot(q.x - p.x, q.y - p.y) < 1e-12) continue;
      const tramo = tramoPolilinea(p, q, p.bulge);
      const base = { capa, id: `${id}#${i}` };
      out.push(tramo.tipo === 'arco' ? { ...tramo, ...base, circulo: false } : { ...tramo, ...base });
    }
    return out;
  }
  const pares = e.pairs.filter(([c]) => ![5, 8, 210, 220, 230].includes(c));
  for (const [codigo, dato] of [[41, estilo?.[41]], [51, estilo?.[50]]] as const) {
    if (dato !== undefined && !pares.some(([c]) => c === codigo)) pares.push([codigo, dato]);
  }
  for (const [c, v] of pares) {
    if ([41, 50, 51].includes(c) && (!v || !Number.isFinite(Number(v)))) {
      throw new Error('El texto tiene un formato inválido: corrígelo en ZWCAD');
    }
  }
  return [{ tipo: 'texto', capa, id, pares }];
}

export function anclaTexto(pares: [number, string][]): 10 | 11 {
  return pares.some(([c, v]) => (c === 72 || c === 73) && Number(v) !== 0) ? 11 : 10;
}

const REQUERIDOS: Record<string, number[]> = {
  LINE: [10, 20, 11, 21],
  CIRCLE: [10, 20, 40],
  ARC: [10, 20, 40, 50, 51],
  LWPOLYLINE: [90, 10, 20],
  TEXT: [1, 10, 20, 40],
};

function validarEntidad(e: EntidadDxf, capa: string) {
  const requeridos = [...(Object.hasOwn(REQUERIDOS, e.type) ? REQUERIDOS[e.type] : [])];
  if (!requeridos.length) {
    if (e.type === 'INSERT') throw new Error(`Hay un INSERT con normal no admitida en la capa ${capa}: descompón el bloque en ZWCAD`);
    throw new Error(`Hay una entidad ${e.type} en la capa ${capa}: conviértela a polilínea en ZWCAD`);
  }
  if (e.type === 'TEXT' && anclaTexto(e.pairs) === 11) requeridos.push(11, 21);
  const faltan = requeridos.filter(c => !e.pairs.some(([codigo, v]) => codigo === c && (c === 1 || v.trim() !== '')));
  if (faltan.length) throw new Error(`La entidad ${e.type} en la capa ${capa} está incompleta (datos ${faltan.join(', ')}): corrígela en ZWCAD`);
  if (['ARC', 'CIRCLE', 'TEXT'].includes(e.type) && number(e, 40) <= 0) {
    throw new Error(`La entidad ${e.type} en la capa ${capa} no tiene radio o altura positivos: corrígela en ZWCAD`);
  }
  if (e.type === 'LWPOLYLINE' && e.pairs.some(([c, v]) => [40, 41, 43].includes(c) && Number(v) !== 0)) {
    throw new Error(`La polilínea en la capa ${capa} tiene anchura: dibuja sus bordes como contornos en ZWCAD`);
  }
}

export function descomponer(d: Dxf, avisos: Duda[]) {
  // Conserva como duda las referencias incompatibles que el conversor antiguo colocaría mal.
  const proteger = (e: EntidadDxf): EntidadDxf =>
    e.type === 'INSERT' && (number(e, 230, 1) < 0 || number(e, 210) || number(e, 220))
      ? { ...e, type: 'INSERT_NO_ADMITIDO' } : e;
  d.entities = d.entities.map(proteger);
  if (d.sections.BLOCKS) d.sections.BLOCKS = d.sections.BLOCKS.map(proteger);
  prepararEntidades(d, avisos);
  d.entities = d.entities.map(e => e.type === 'INSERT_NO_ADMITIDO' ? { ...e, type: 'INSERT' } : e);
}

export function hornear(entidades: EntidadDxf[], estilos: Dxf['styles'] = {}): { piezas: Pieza[]; avisos: Duda[]; dudas: (Duda & { indice: number })[] } {
  const piezas: Pieza[] = [], avisos: Duda[] = [], dudas: (Duda & { indice: number })[] = [];
  const omitidas = new Map<string, number>();
  const fuentes = new Set<string>();
  const tablaEstilos = new Map(Object.entries(estilos).map(([nombre, estilo]) => [nombre.toUpperCase(), estilo]));
  for (const [i, e] of entidades.entries()) {
    const capa = value(e, 8).trim() || '0';
    const handle = value(e, 5);
    try {
      const omitida = number(e, 67) ? 'de espacio papel' : OMITIR.has(e.type) ? e.type : null;
      if (omitida) {
        omitidas.set(omitida, (omitidas.get(omitida) ?? 0) + 1);
        continue;
      }
      validarEntidad(e, capa);
      if (e.type !== 'LINE' && (Math.abs(number(e, 210)) > 1e-9 || Math.abs(number(e, 220)) > 1e-9)) {
        throw new Error(`La entidad ${e.type} en la capa ${capa} no está en el plano XY: corrígela en ZWCAD`);
      }
      const m = e.transformacion ?? ID;
      if (!m.every(Number.isFinite)) throw new Error('El bloque tiene una transformación inválida: corrígelo en ZWCAD');
      const total = e.type !== 'LINE' && number(e, 230, 1) < 0 ? componer(m, ESPEJO_OCS) : m;
      const estilo = tablaEstilos.get(value(e, 7, 'Standard').toUpperCase());
      const nuevas = locales(e, capa, `e${i}`, estilo).map(p => transformarPieza(p, total));
      const fuente = estilo?.[3];
      if (e.type === 'TEXT' && fuente && /\.shx$/i.test(fuente) && !fuentes.has(fuente)) {
        fuentes.add(fuente);
        avisos.push({ handle, capa, tipo: e.type, motivo: `El estilo usa la fuente ${fuente}: revisa el texto en la vista previa` });
      }
      for (const pieza of nuevas) piezas.push(pieza);
    } catch (error) {
      dudas.push({ indice: i, handle, tipo: e.type, capa, motivo: error instanceof Error ? error.message : String(error) });
    }
  }
  for (const [tipo, n] of omitidas) avisos.push({ tipo, motivo: `Se han omitido ${n} ${tipo} (no se cortan)` });
  return { piezas, avisos, dudas };
}
