import { number } from '../dxf.ts';
import type { EntidadDxf } from '../tipos.ts';
import { cajaPieza } from './marco.ts';
import type { Caja, Pieza } from './tipos.ts';

/** Cota de un plano, en mm: dos puntos de definición (13 y 14) y el eje en el que mide. */
export interface CotaPlano { eje: 'x' | 'y'; a: { x: number; y: number }; b: { x: number; y: number }; largo: number }
export interface TextoPlano { x: number; y: number; texto: string }
/**
 * Un trozo de lona del corte: piezas juntas, separadas de las demás por un hueco.
 * `largoMm` es la cota que lo mide a lo largo (o su caja si no la tiene) y `textos` lo que pone dentro.
 */
export interface TramoCorte { anchoMm: number; altoMm: number; largoMm: number; porCota: boolean; textos: string[] }

const HUECO_MM = 500, TEXTO_CERCA_MM = 1000;
const distancia = (p: { x: number; y: number }, c: Caja) => Math.hypot(Math.max(c.x0 - p.x, 0, p.x - c.x1), Math.max(c.y0 - p.y, 0, p.y - c.y1));

/** Cotas lineales del espacio modelo (giradas a 0/90° o alineadas casi rectas), pasadas a mm con `k`. */
export function cotasDelPlano(entidades: EntidadDxf[], k: number): CotaPlano[] {
  const out: CotaPlano[] = [];
  for (const e of entidades) {
    if (e.type !== 'DIMENSION' || number(e, 67)) continue;
    const tipo = number(e, 70) & 7;
    if (tipo !== 0 && tipo !== 1) continue;
    const a = { x: number(e, 13) * k, y: number(e, 23) * k }, b = { x: number(e, 14) * k, y: number(e, 24) * k };
    const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
    let eje: 'x' | 'y' | null = null;
    if (tipo === 0) {
      const giro = ((number(e, 50) % 180) + 180) % 180;
      eje = giro < 0.5 || giro > 179.5 ? 'x' : Math.abs(giro - 90) < 0.5 ? 'y' : null;
    } else eje = dy <= 0.01 * dx ? 'x' : dx <= 0.01 * dy ? 'y' : null;
    if (!eje) continue;
    const largo = eje === 'x' ? dx : dy;
    if (largo > 1) out.push({ eje, a, b, largo });
  }
  return out;
}

/** Texto legible de un TEXT/MTEXT: sin códigos de formato de MTEXT. */
export function textoLimpio(pares: [number, string][]): string {
  const crudo = pares.filter(([c]) => c === 3).map(([, v]) => v).join('') + (pares.find(([c]) => c === 1)?.[1] ?? '');
  return crudo
    .replace(/\\[Pp]/g, ' ')
    .replace(/\\[A-Za-z][^;\\{}]*;/g, '')
    .replace(/\\[LlOoKk]/g, '')
    .replace(/[{}]/g, '')
    .replace(/%%[Cc]/g, 'Ø')
    .replace(/%%[DdPp]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const crecer = (c: Caja, m: number): Caja => ({ x0: c.x0 - m, y0: c.y0 - m, x1: c.x1 + m, y1: c.y1 + m });
const dentro = (p: { x: number; y: number }, c: Caja) => p.x >= c.x0 && p.x <= c.x1 && p.y >= c.y0 && p.y <= c.y1;
const tocan = (a: Caja, b: Caja) => a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;

/**
 * Agrupa las piezas del corte (en mm) en tramos separados por huecos de más de 50 cm y les asigna
 * la cota más larga que los mide a lo largo y los textos más cercanos (a menos de 1 m).
 */
export function tramosDelCorte(piezas: Pieza[], textos: TextoPlano[], cotas: CotaPlano[]): TramoCorte[] {
  const cajas = piezas.filter(p => p.tipo !== 'texto').map(cajaPieza);
  const padre = cajas.map((_, i) => i);
  const raiz = (i: number): number => padre[i] === i ? i : (padre[i] = raiz(padre[i]));
  const orden = cajas.map((_, i) => i).sort((a, b) => cajas[a].x0 - cajas[b].x0);
  for (let i = 0; i < orden.length; i++) {
    const a = crecer(cajas[orden[i]], HUECO_MM / 2);
    for (let j = i + 1; j < orden.length && cajas[orden[j]].x0 - HUECO_MM / 2 <= a.x1; j++) {
      if (tocan(a, crecer(cajas[orden[j]], HUECO_MM / 2))) padre[raiz(orden[j])] = raiz(orden[i]);
    }
  }
  const grupos = new Map<number, Caja>();
  cajas.forEach((c, i) => {
    const r = raiz(i), g = grupos.get(r);
    grupos.set(r, g ? { x0: Math.min(g.x0, c.x0), y0: Math.min(g.y0, c.y0), x1: Math.max(g.x1, c.x1), y1: Math.max(g.y1, c.y1) } : { ...c });
  });
  const tramos = [...grupos.values()].sort((a, b) => a.x0 - b.x0 || b.y1 - a.y1);
  // Cada texto va al tramo más cercano (el de la lona suele estar encima o al lado del corte).
  const suyos = tramos.map(() => [] as string[]);
  for (const t of textos) {
    let mejor = -1, d = TEXTO_CERCA_MM;
    tramos.forEach((c, i) => { const di = distancia(t, c); if (di <= d) { mejor = i; d = di; } });
    if (mejor >= 0 && t.texto && !suyos[mejor].includes(t.texto)) suyos[mejor].push(t.texto);
  }
  return tramos.map((caja, i) => {
    const ancho = caja.x1 - caja.x0, alto = caja.y1 - caja.y0;
    const eje = ancho >= alto ? 'x' : 'y', lado = Math.max(ancho, alto);
    const margen = Math.max(100, 0.03 * lado), zona = crecer(caja, margen);
    const medidas = cotas.filter(c => c.eje === eje && c.largo >= 0.5 * lado && c.largo <= lado + 2 * margen
      && dentro(c.a, zona) && dentro(c.b, zona));
    const cota = medidas.reduce<CotaPlano | null>((m, c) => !m || c.largo > m.largo ? c : m, null);
    return {
      anchoMm: Math.round(ancho), altoMm: Math.round(alto),
      largoMm: Math.round(cota?.largo ?? lado), porCota: !!cota,
      textos: suyos[i],
    };
  });
}
