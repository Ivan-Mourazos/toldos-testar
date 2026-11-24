import type { Herramienta, Pieza } from './tipos.ts';
export const CAPAS_FIJAS: Record<string, Herramienta> = { DISCO1: 'DISCO1', DISCO2: 'DISCO2', CUTTER: 'CUTTER', ROTULADOR: 'ROTULADOR', TALADRO: 'taladro', TEXTO: 'texto',
  // Las cotas del plano no se cortan nunca: se quitan solas sin preguntar (Iván, 24/11/2026).
  COTAS: 'NO_CORTAR' };
export const claveCapa = (capa: string) => capa.trim().toUpperCase();
export interface CapaDesconocida { capa: string; color: number; piezas: number; sugerida?: Herramienta }
/** Colores de las capas del bot. Solo preseleccionan el desplegable: el técnico confirma (Iván, 23/11). */
export const COLOR_SUGERIDO: Record<number, Herramienta> = { 7: 'DISCO1', 6: 'DISCO2', 112: 'CUTTER', 1: 'ROTULADOR', 106: 'texto' };
export function herramientaCapa(capa: string, tabla: Record<string, Herramienta>, decisiones: Record<string, Herramienta> = {}): Herramienta | undefined {
  const clave = claveCapa(capa);
  if (!clave || clave === '0') return 'NO_CORTAR';
  if (Object.hasOwn(CAPAS_FIJAS, clave)) return CAPAS_FIJAS[clave];
  if (Object.hasOwn(decisiones, clave)) return decisiones[clave];
  return Object.hasOwn(tabla, clave) ? tabla[clave] : undefined;
}

export const normalizarCapas = <T>(tabla: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.entries(tabla).map(([nombre, valor]) => [claveCapa(nombre), valor]));

export function asignarCapas(piezas: Pieza[], tabla: Record<string, Herramienta>, decisiones: Record<string, Herramienta>, capasDxf: Record<string, { color: number }>) {
  const salida: Pieza[] = [], desconocidas = new Map<string, CapaDesconocida>(); let descartadas = 0;
  const guardadas = normalizarCapas(tabla);
  const elegidas = normalizarCapas(decisiones);
  const colores = normalizarCapas(capasDxf);
  for (const p of piezas) {
    const k = claveCapa(p.capa), h = herramientaCapa(k, guardadas, elegidas);
    if (h === 'NO_CORTAR') { descartadas++; continue; }
    if (h) { salida.push({ ...p, capa: h }); continue; }
    let d = desconocidas.get(k);
    if (!d) {
      const color = Math.abs(Object.hasOwn(colores, k) ? colores[k].color : 0);
      const sugerida = COLOR_SUGERIDO[color];
      d = sugerida ? { capa: p.capa, color, piezas: 0, sugerida } : { capa: p.capa, color, piezas: 0 };
    }
    d.piezas++; desconocidas.set(k, d); salida.push(p);
  }
  return { piezas: salida, desconocidas: [...desconocidas.values()], descartadas };
}
