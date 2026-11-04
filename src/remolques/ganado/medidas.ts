import { generarCal } from './generarCal.js';
import { ajusteContorno, DEFAULT_PARAMS } from '../calc/params.ts';

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
  /** Radio exterior de apoyo de la lona; 0 si el perfil no tiene curvas. */
  radio: number;
  fruncir: number;
  recogidaAtras?: 'CUERDA' | 'GOMA';
  /** Añadido de corte en cada bajo, en cm; sin valor, el general de parámetros. */
  margenBajo?: number;
  /** Cuerdas de cada curva en el desarrollo del morro; el recorrido del paño usa arcos exactos. */
  divisionesCurva?: number;
  pasoOllaos: number;
  ventana: boolean;
  /** Medida expresamente indicada en el pedido, en cm; ausente usa la estándar adaptada. */
  ventanaMedidas?: { ancho: number; alto: number };
  puerta: 'NINGUNA' | 'MFI' | 'MFD';
  /** Desde atrás, sobre el recto terminado. Vacío: reparto al paso indicado. */
  laterales: number[];
  diagonalOllaos?: number;
  frenteOllaos?: number;
  /** Pieza y posición históricas de Talleres Cal, diagonal de mano fija derecha. */
  refuerzoMfd?: boolean;
  /** Puerta integrada en la diagonal del morro, sin solapas independientes. */
  puertaMorro?: { separacionBorde: number };
}

export const MEDIDAS_CAL_VACIAS: MedidasCal = {
  recto: 0, ancho: 0, frente: 0, diagonal: 0, alto: 0, altoFrente: 0,
  aguas: 0, aguasFrente: 0, radio: 0, fruncir: 5, pasoOllaos: 30,
  ventana: true, puerta: 'NINGUNA', laterales: [],
};

export const MEDIDAS_CAL_GEMELO: MedidasCal = {
  recto: 195, ancho: 190, frente: 60, diagonal: 90, alto: 70, altoFrente: 70,
  aguas: 5, aguasFrente: 5, radio: 8, fruncir: 5, pasoOllaos: 30,
  ventana: true, puerta: 'NINGUNA', laterales: [],
  recogidaAtras: 'GOMA',
};
export const MEDIDAS_CAL_5319: MedidasCal = {
  recto: 210, ancho: 160, frente: 54, diagonal: 102, alto: 67, altoFrente: 57,
  aguas: 10, aguasFrente: 10, radio: 9.5, fruncir: 5, pasoOllaos: 35, margenBajo: 3, divisionesCurva: 4,
  ventana: true, puerta: 'MFI', laterales: [2.5, 10, 30, 55, 94, 126, 157, 193],
  diagonalOllaos: 4, frenteOllaos: 3,
  refuerzoMfd: true,
  puertaMorro: { separacionBorde: 4 },
  recogidaAtras: 'CUERDA',
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
  desarrolloCuerpo: { laterales: number; aguas: number; curvas: number; total: number; holgura: number; bastillas: number; corte: number };
  puerta: { lado: 'MFI' | 'MFD'; ancho: number; alto: number; separacionBorde: number } | null;
}

export function calcularMedidasCal(m: MedidasCal): DesarrolloCal {
  if (!m) throw Error('Faltan las medidas de Cal.');
  if (m.ventanaMedidas && [m.ventanaMedidas.ancho, m.ventanaMedidas.alto].some(n => !Number.isFinite(n) || n <= 0)) throw Error('Las medidas de la ventana del pedido deben ser mayores que cero.');
  if (m.margenBajo !== undefined && (!Number.isFinite(m.margenBajo) || m.margenBajo < 0)) throw Error('El añadido de corte en los bajos no puede ser negativo.');
  if (m.divisionesCurva !== undefined && (!Number.isInteger(m.divisionesCurva) || m.divisionesCurva < 2 || m.divisionesCurva > 64)) throw Error('Indica de 2 a 64 divisiones por curva.');
  if (m.recogidaAtras !== undefined && !['CUERDA', 'GOMA'].includes(m.recogidaAtras)) throw Error('Elige cuerda o goma para fruncir atrás.');
  if (m.refuerzoMfd !== undefined && typeof m.refuerzoMfd !== 'boolean') throw Error('Indica sí o no para el refuerzo MFD.');
  if (m.puertaMorro && (!Number.isFinite(m.puertaMorro.separacionBorde) || m.puertaMorro.separacionBorde <= 0)) throw Error('La separación de las cremalleras debe ser mayor que cero.');
  for (const k of ['recto', 'ancho', 'frente', 'diagonal', 'alto', 'altoFrente', 'pasoOllaos'] as const) {
    if (!Number.isFinite(m[k]) || m[k] <= 0) throw Error(`Revisa ${k}: tiene que ser mayor que cero.`);
  }
  for (const k of ['aguas', 'aguasFrente', 'fruncir', 'radio'] as const) {
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
  ), laterales: m.laterales.map(x => x * 10), puertaMorro: m.puertaMorro ? { separacionBorde: m.puertaMorro.separacionBorde * 10 } : undefined,
    ventanaMedidas: m.ventanaMedidas ? { ancho: m.ventanaMedidas.ancho * 10, alto: m.ventanaMedidas.alto * 10 } : undefined };
  // Acabados medidos en el gemelo (18F73→18F74, 18F5D→18F60). No proceden del 00389 especial.
  const r = {
    lonaHecha: DEFAULT_PARAMS.demasiaLonaHecha * 10,
    // Misma regla que remolques: aumento una vez al paño que envuelve; bajos aparte.
    holguraContorno: (ajusteContorno(DEFAULT_PARAMS, m.radio > 0 ? (m.aguas > 0 ? 'TIPO 03' : 'TIPO 05') : (m.aguas > 0 ? 'TIPO 02' : 'TIPO 01')) - DEFAULT_PARAMS.ajusteContornoBase) * 10,
    costura: 10, bastilla: (m.margenBajo ?? DEFAULT_PARAMS.ajusteContornoBase / 2) * 10, fruncir: 50, pasos: 5,
    inicioOllao: 25, dentroOllao: 10, radioOllao: 2.5,
    largoMarca: 20, marcaAtras: 50, repartoFrente: 350,
    ventana: { ancho: 500, alto: 350, separacionTangencia: 50 },
  };
  const g = generarCal(h, r) as unknown as DesarrolloCal;
  return { ...g, pendientes: m.puerta === 'NINGUNA' || m.puertaMorro ? [] : [
    `Falta definir la puerta ${m.puerta}: ancho terminado, cremallera hasta arriba, solapas y su unión con el morro. El dibujo muestra cuerpo, morro y frente; el corte completo queda a mano.`,
  ] };
}
