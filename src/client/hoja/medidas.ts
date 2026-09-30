import type { VistaHoja } from '../remolques/render/captura';

// Tamaños de la hoja de taller, en milímetros de papel (A4 apaisado). hoja.css usa los mismos
// números: si cambias uno aquí, cámbialo allí. Las vistas se capturan a 220 ppp de su tamaño
// impreso para que el papel no las pixele (mínimo pedido: 200 ppp).

export const PX_POR_MM = 220 / 25.4;
export const aPixeles = (mm: number) => Math.round(mm * PX_POR_MM);

/** Ancho del hueco del dibujo (a la derecha de la columna de datos) y separación entre vistas. */
export const ANCHO_DIBUJO_MM = 211;
export const HUECO_MM = 3;
// Encima de cada recuadro va el nombre de la vista, en una línea de 3,5 mm (hoja.css): el cuerpo
// de la hoja mide el alto de las dos filas de vistas, más el hueco, más dos nombres.

/** Letra de cotas y números de ollaos: 2,5 mm (algo más de 7 pt, lo mínimo que se lee bien
 *  impreso; 1 pt = 0,3528 mm). */
export const LETRA_COTA_MM = 2.5;

/** Franja al pie de la vista de delante y de la de detrás para la recogida de esa cara (Iván,
 *  30/09/2026): una línea de 7 pt como mucho (`.hoja-vista-nota` en hoja.css). El dibujo se
 *  encuadra por encima de ella. */
export const NOTA_VISTA_MM = 3.5;

export interface MedidaMm { ancho: number; alto: number }

const NORMAL: Record<VistaHoja, MedidaMm> = {
  'tres-cuartos': { ancho: 104, alto: 56 },
  'tres-cuartos-detras': { ancho: 104, alto: 56 },
  delante: { ancho: 52, alto: 47 },
  detras: { ancho: 52, alto: 47 },
  lateral: { ancho: 101, alto: 47 },
};

/** Con la tabla de ganchos no cabe todo: primero encogen las vistas rectas, luego las 3/4. */
const CON_GANCHOS: Record<VistaHoja, MedidaMm> = {
  'tres-cuartos': { ancho: 104, alto: 44 },
  'tres-cuartos-detras': { ancho: 104, alto: 44 },
  delante: { ancho: 52, alto: 35 },
  detras: { ancho: 52, alto: 35 },
  lateral: { ancho: 101, alto: 35 },
};

export function tamanoVista(vista: VistaHoja, conGanchos: boolean): MedidaMm {
  return (conGanchos ? CON_GANCHOS : NORMAL)[vista];
}
