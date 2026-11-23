export type Herramienta = 'DISCO1' | 'DISCO2' | 'CUTTER' | 'ROTULADOR' | 'taladro' | 'texto' | 'NO_CORTAR';
export const HERRAMIENTAS: Herramienta[] = ['DISCO1', 'DISCO2', 'CUTTER', 'ROTULADOR', 'taladro', 'texto', 'NO_CORTAR'];
export interface P { x: number; y: number }
export interface Caja { x0: number; y0: number; x1: number; y1: number }
/** Ángulos en grados, sentido antihorario. `circulo` = vuelta entera. */
export type Pieza =
  | { tipo: 'linea'; capa: string; id: string; a: P; b: P }
  | { tipo: 'arco'; capa: string; id: string; c: P; r: number; desde: number; hasta: number; circulo: boolean }
  | { tipo: 'texto'; capa: string; id: string; pares: [number, string][] };
/** Igual que `entidades.ts`: x' = m0·x + m2·y + m4 ; y' = m1·x + m3·y + m5. */
export type Matriz = [number, number, number, number, number, number];
