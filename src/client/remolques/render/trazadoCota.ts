import type { LineaCota } from './proyeccion';

// Cómo se dibuja una cota ya proyectada, igual en la pantalla (CapaCotas) y en la hoja de taller
// (CapaCotasHoja); cada una pone sus medidas en `EstiloCota`. Dos casos que antes salían mal
// (Iván, 01/10/2026):
// - una cota corta, como unas aguas de 8 cm, juntaba las dos flechas: pasa a llevarlas por fuera,
//   con la punta en cada extremo y una cola hacia fuera;
// - el alto de una ventana ancha en un remolque estrecho podía caer sobre el borde de la lona: si
//   entre la línea y el borde no cabe el número, la cota pasa dentro de la ventana, con el número
//   hacia su centro (el halo del texto lo separa del dibujo).

export interface EstiloCota {
  anchoLienzo: number;
  /** Tamaño de la letra, en las unidades del lienzo. */
  letra: number;
  /** Largo de cada flecha. */
  flecha: number;
  /** Separación del número a su línea, en una cota vertical. */
  hueco: number;
  /** Cuánto se baja el número de una vertical para centrarlo en su línea. */
  bajaVertical: number;
  /** Número de una horizontal: cuánto sube por encima de su línea o baja por debajo. */
  subeHorizontal: number;
  bajaHorizontal: number;
}

export interface Tramo { x1: number; y1: number; x2: number; y2: number }
export interface TrazadoCota {
  linea: Tramo;
  /** Flechas por fuera: la punta en el extremo y el cuerpo hacia fuera. */
  fuera: boolean;
  /** Con las flechas por fuera, la línea sigue un poco más allá de cada una. */
  colas: Tramo[];
  texto: { x: number; y: number; anchor: 'start' | 'middle' | 'end' };
}

/** Por debajo de este largo (en flechas) las dos flechas de dentro casi se tocan. */
const MINIMO_EN_FLECHAS = 3;
/** Ancho aproximado de una cifra: basta para decidir si el número cabe. */
const ANCHO_CIFRA = 0.62;

export function trazarCota(l: LineaCota, e: EstiloCota): TrazadoCota {
  const vertical = Math.abs(l.x2 - l.x1) < Math.abs(l.y2 - l.y1);
  let linea: Tramo = { x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2 };
  let { tx, ty } = l;
  // Lado del número en una vertical: +1 a la derecha, −1 a la izquierda. Sin más datos, hacia
  // fuera del dibujo por la mitad en que cae; con el borde de la lona, hacia él si cabe.
  let lado = tx < e.anchoLienzo / 2 ? -1 : 1;
  if (vertical && l.hueco) {
    const haciaBorde = l.hueco.bordeX < l.x1 ? -1 : 1;
    const sitio = Math.abs(l.hueco.bordeX - l.x1);
    const necesita = e.hueco + l.texto.length * e.letra * ANCHO_CIFRA + e.letra * 0.4;
    if (sitio >= necesita) {
      lado = haciaBorde;
    } else {
      const d = l.hueco.dentro;
      linea = { x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2 };
      ({ tx, ty } = d);
      lado = -haciaBorde;
    }
  }

  const largo = Math.hypot(linea.x2 - linea.x1, linea.y2 - linea.y1);
  const fuera = largo > 0 && largo < MINIMO_EN_FLECHAS * e.flecha;
  const colas: Tramo[] = [];
  if (fuera) {
    const ux = (linea.x2 - linea.x1) / largo;
    const uy = (linea.y2 - linea.y1) / largo;
    const cola = e.flecha * 1.75;
    colas.push({ x1: linea.x1, y1: linea.y1, x2: linea.x1 - ux * cola, y2: linea.y1 - uy * cola });
    colas.push({ x1: linea.x2, y1: linea.y2, x2: linea.x2 + ux * cola, y2: linea.y2 + uy * cola });
  }

  const texto: TrazadoCota['texto'] = vertical
    ? { x: tx + lado * e.hueco, y: ty + e.bajaVertical, anchor: lado < 0 ? 'end' : 'start' }
    : { x: tx, y: l.textoDebajo ? ty + e.bajaHorizontal : ty - e.subeHorizontal, anchor: 'middle' };
  return { linea, fuera, colas, texto };
}
