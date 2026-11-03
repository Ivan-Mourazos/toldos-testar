import { generarCal } from './generarCal.js';
import { DEFAULT_PARAMS } from '../calc/params.ts';

/** Medidas en cm, hasta la intersección teórica del lateral y las aguas. */
export interface MedidasCal {
  recto: number;
  ancho: number;
  frente: number;
  diagonal: number;
  alto: number;
  altoFrente: number;
  aguas: number;
  aguasFrente: number;
  /** Radio exterior de apoyo de la lona, medido en el arco. */
  radio: number;
  fruncir: number;
  pasoOllaos: number;
  ventana: boolean;
  puerta: 'NINGUNA' | 'MFI' | 'MFD';
  /** Desde atrás, sobre el recto terminado. Vacío: reparto al paso indicado. */
  laterales: number[];
  diagonalOllaos?: number;
  frenteOllaos?: number;
}

export const MEDIDAS_CAL_GEMELO: MedidasCal = {
  recto: 195, ancho: 190, frente: 60, diagonal: 90, alto: 70, altoFrente: 70,
  aguas: 5, aguasFrente: 5, radio: 8, fruncir: 5, pasoOllaos: 30,
  ventana: true, puerta: 'NINGUNA', laterales: [],
};
export const MEDIDAS_CAL_5319: MedidasCal = {
  recto: 210, ancho: 160, frente: 54, diagonal: 102, alto: 57, altoFrente: 57,
  aguas: 10, aguasFrente: 0, radio: 9.5, fruncir: 5, pasoOllaos: 35,
  ventana: true, puerta: 'MFI', laterales: [30, 55, 94, 126, 157, 193],
  diagonalOllaos: 4, frenteOllaos: 3,
};

export type PuntoCal = [number, number];
export type PrimitivaCal =
  | { tipo: 'tramo'; a: PuntoCal; b: PuntoCal }
  | { tipo: 'arco'; c: PuntoCal; r: number; inicio: number; barrido: number }
  | { tipo: 'ollao'; c: PuntoCal; r: number };
export interface PiezaCal {
  nombre: string;
  contorno: PuntoCal[];
  terminado?: PuntoCal[];
  corte: PrimitivaCal[];
  marcas: PrimitivaCal[];
  ollaos: { tipo: 'ollao'; c: PuntoCal; r: number }[];
}
export interface DesarrolloCal {
  piezas: PiezaCal[];
  proyeccion: number;
  largoHecho: number;
  ventana: { ancho: number; alto: number } | null;
  medidas: { radioA: number; radioB: number; altoA: number; altoB: number; aguasA: number; aguasB: number };
  pendientes: string[];
}

export function calcularMedidasCal(m: MedidasCal): DesarrolloCal {
  if (!m) throw Error('Faltan las medidas de Cal.');
  for (const k of ['recto', 'ancho', 'frente', 'diagonal', 'alto', 'altoFrente', 'radio', 'pasoOllaos'] as const) {
    if (!Number.isFinite(m[k]) || m[k] <= 0) throw Error(`Revisa ${k}: tiene que ser mayor que cero.`);
  }
  for (const k of ['aguas', 'aguasFrente', 'fruncir'] as const) {
    if (!Number.isFinite(m[k]) || m[k] < 0) throw Error(`Revisa ${k}: no puede ser negativo.`);
  }
  if (Math.max(m.recto, m.diagonal, m.frente) / m.pasoOllaos > 1000 || m.laterales?.length > 1000) throw Error('Demasiados ollaos: revisa el paso y las medidas.');
  if (m.ancho < m.frente) throw Error('El frente no puede ser más ancho que el cuerpo.');
  if (!['NINGUNA', 'MFI', 'MFD'].includes(m.puerta) || typeof m.ventana !== 'boolean') throw Error('Indica la puerta y la ventana.');
  if (!Array.isArray(m.laterales) || m.laterales.some((x, i) => !Number.isFinite(x) || x < 0 || x > m.recto + DEFAULT_PARAMS.demasiaLonaHecha || (i > 0 && x <= m.laterales[i - 1]))) {
    throw Error('Los ollaos laterales deben ir en orden y dentro del recto terminado.');
  }
  for (const n of [m.diagonalOllaos, m.frenteOllaos]) {
    if (n !== undefined && (!Number.isInteger(n) || n < 2 || n > 100)) throw Error('Indica de 2 a 100 ollaos por borde.');
  }
  const h = { ...m, ...Object.fromEntries(
    ['recto', 'ancho', 'frente', 'diagonal', 'alto', 'altoFrente', 'aguas', 'aguasFrente', 'radio', 'fruncir', 'pasoOllaos']
      .map(k => [k, (m[k as keyof MedidasCal] as number) * 10]),
  ), laterales: m.laterales.map(x => x * 10) };
  // Acabados medidos en el gemelo (18F73→18F74, 18F5D→18F60). No proceden del 00389 especial.
  const r = {
    lonaHecha: DEFAULT_PARAMS.demasiaLonaHecha * 10,
    holguraContorno: DEFAULT_PARAMS.ajusteContornoCurva * 10,
    costura: 10, bastilla: 35, fruncir: 50, pasos: 5,
    inicioOllao: 25, dentroOllao: 10, radioOllao: 2.5,
    largoMarca: 20, marcaAtras: 50, repartoFrente: 350,
    ventana: { ancho: 500, alto: 350, separacionTangencia: 50 },
  };
  const g = generarCal(h, r) as unknown as DesarrolloCal;
  return { ...g, pendientes: m.puerta === 'NINGUNA' ? [] : [
    `Falta definir la puerta ${m.puerta}: ancho terminado, cremallera hasta arriba, solapas y su unión con el morro. El dibujo muestra cuerpo, morro y frente; el corte completo queda a mano.`,
  ] };
}
