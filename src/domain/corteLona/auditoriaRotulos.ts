import { anchoArial } from './texto.js';

export interface RotuloAuditable {
  tipo: string; valor?: string; punto?: number[]; h?: number; ancho?: number;
  ancla?: number; giro?: number; deCota?: boolean; escalaX?: number;
  recorte?: { centro: number[]; ancho: number; alto: number };
  a?: number[]; b?: number[]; capa?: string;
  handle?: string;
}
export interface CajaRotulo { texto: string; cota: boolean; x0: number; x1: number; y0: number; y1: number }

/** Prepara la caja de Arial del rótulo para colocarla en varios puntos con la misma altura y giro. */
export function prepararCajaRotulo(p: RotuloAuditable) {
  const { h, valor, recorte } = p;
  if (p.tipo !== 'texto' || !h || !valor?.trim()) return undefined;
  const filas: string[] = [];
  for (const parrafo of valor.split('\n')) {
    let fila = '';
    for (const palabra of parrafo.split(/\s+/)) {
      const candidata = `${fila}${fila ? ' ' : ''}${palabra}`;
      if (fila && p.ancho && anchoArial(candidata, h) > p.ancho) { filas.push(fila); fila = palabra; }
      else fila = candidata;
    }
    filas.push(fila);
  }
  const ancho = Math.max(...filas.map(f => anchoArial(f, h))) * (p.escalaX ?? 1);
  const ancla = p.ancla ?? 5, columna = (ancla - 1) % 3, fila = Math.floor((ancla - 1) / 3);
  const base = fila === 0 ? h : fila === 1 ? -(filas.length - 1) * h * .7 + h * .36 : -(filas.length - 1) * h * 1.4;
  const descenso = /[gjpqy]/.test(valor) ? h * .25 : 0;
  const alto = h + (filas.length - 1) * h * 1.4 + descenso;
  const x = -ancho * columna / 2, y = -base - (filas.length - 1) * h * 1.4 - descenso;
  const r = (p.giro ?? 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const esquinas = [[x, y], [x + ancho, y], [x + ancho, y + alto], [x, y + alto]]
    .map(([a, b]) => [a * c, b * s, a * s, b * c]);
  const cota = Boolean(p.deCota);
  return ([px, py]: number[]): CajaRotulo | undefined => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [ax, bx, ay, by] of esquinas) {
      // Conserva el orden de las operaciones para no mover los contactos por redondeo.
      const ex = px + ax - bx, ey = py + ay + by;
      x0 = Math.min(x0, ex); x1 = Math.max(x1, ex);
      y0 = Math.min(y0, ey); y1 = Math.max(y1, ey);
    }
    if (recorte) {
      x0 = Math.max(x0, recorte.centro[0] - recorte.ancho / 2); x1 = Math.min(x1, recorte.centro[0] + recorte.ancho / 2);
      y0 = Math.max(y0, recorte.centro[1] - recorte.alto / 2); y1 = Math.min(y1, recorte.centro[1] + recorte.alto / 2);
    }
    return x1 > x0 && y1 > y0 ? { texto: valor, cota, x0, x1, y0, y1 } : undefined;
  };
}

/** Las unidades son las del dibujo recibido (cm en lienzo, mm en papel). */
export function cajasRotulos(primitivas: RotuloAuditable[]): CajaRotulo[] {
  return primitivas.flatMap(p => {
    const caja = p.punto && prepararCajaRotulo(p)?.(p.punto);
    return caja ? [caja] : [];
  });
}

/** No se descartan las cotas: sus MTEXT se comprueban junto a los demás rótulos. */
export function solapesRotulos(primitivas: RotuloAuditable[], tolerancia = .05) {
  const cajas = cajasRotulos(primitivas), solapes: Array<{ a: CajaRotulo; b: CajaRotulo }> = [];
  cajas.forEach((a, i) => { for (const b of cajas.slice(i + 1)) {
    if (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > tolerancia && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > tolerancia) solapes.push({ a, b });
  } });
  return solapes;
}

/** Un texto con el ancla dentro de la ventana también puede quedar cortado. */
export function recortesRotulos(primitivas: RotuloAuditable[], tolerancia = .1) {
  return primitivas.filter(p => p.tipo === 'texto' && p.recorte).flatMap(p => {
    const [c] = cajasRotulos([{ ...p, recorte: undefined }]), v = p.recorte!;
    if (!c) return [];
    const fuera = c.x0 < v.centro[0] - v.ancho / 2 - tolerancia || c.x1 > v.centro[0] + v.ancho / 2 + tolerancia
      || c.y0 < v.centro[1] - v.alto / 2 - tolerancia || c.y1 > v.centro[1] + v.alto / 2 + tolerancia;
    return fuera ? [c] : [];
  });
}

/** Cruces reales por el interior de una caja, no simples contactos con su borde.
 * Se comprueban las líneas de confección y las del bloque de cada cota.
 */
export function crucesRotulosLineas(primitivas: RotuloAuditable[], margen = .08, cajas = cajasRotulos(primitivas)) {
  const lineas = primitivas.filter(p => p.tipo === 'raya' && p.a && p.b && (p.deCota || ['DISCO1', 'ROTULADOR', 'cortes - lona', 'corte', 'corte (vent)', 'marca', 'ejes', 'borrar', 'referencias', 'referencia-1'].includes(p.capa ?? '')));
  const cruces: Array<{ texto: string; capa: string; a: number[]; b: number[]; caja: CajaRotulo; handle?: string }> = [];
  for (const c of cajas) for (const l of lineas) {
    const a = l.a!, b = l.b!, dx = b[0] - a[0], dy = b[1] - a[1];
    let t0 = 0, t1 = 1;
    const caja = { x0: c.x0 + margen, x1: c.x1 - margen, y0: c.y0 + margen, y1: c.y1 - margen };
    if (l.recorte) {
      const v = l.recorte;
      caja.x0 = Math.max(caja.x0, v.centro[0] - v.ancho / 2); caja.x1 = Math.min(caja.x1, v.centro[0] + v.ancho / 2);
      caja.y0 = Math.max(caja.y0, v.centro[1] - v.alto / 2); caja.y1 = Math.min(caja.y1, v.centro[1] + v.alto / 2);
    }
    if (caja.x1 <= caja.x0 || caja.y1 <= caja.y0) continue;
    for (const [p, q] of [[-dx, a[0] - caja.x0], [dx, caja.x1 - a[0]], [-dy, a[1] - caja.y0], [dy, caja.y1 - a[1]]]) {
      if (Math.abs(p) < 1e-12) { if (q < 0) { t1 = -1; break; } continue; }
      const t = q / p;
      if (p < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    }
    if (t1 > t0 && Math.hypot(dx, dy) * (t1 - t0) > margen) cruces.push({ texto: c.texto, capa: l.capa ?? '', a, b, caja: c, handle: l.handle });
  }
  return cruces;
}
