/**
 * El corte en la hoja, repartido en varias ventanas una debajo de otra (Iván, 05/11/2026, AR2605391: «hay que
 * aprovechar el hueco»). Un rollo largo (41 m) en una ventana casi cuadrada quedaba como una tira fina arriba; aquí se
 * parte en tramos por donde no hay pieza y cada tramo va en su ventana, todas a la misma escala. Solo cambia la hoja:
 * el corte del modelo, que es el que lee el flujo del DWG para el bot, no se toca.
 */
type Zona = { x0: number; y0: number; x1: number; y1: number };
/** Una fila del corte en el modelo (cm): su alto, con rótulo y cotas, y lo que ocupan sus piezas a lo largo. */
export type FilaCorte = { y0: number; y1: number; piezas: Array<[number, number]>; evitar?: number[] };
export type TramoCorte = { zona: Zona; papel: Zona };

/** Hueco entre ventanas, en mm de papel. */
const ENTRE_TRAMOS = 4;
/** Lo que se repite del final del tramo anterior, en cm, para que se vea que sigue. */
const SOLAPE = 10;
/** Medio texto de una cota del largo, en cm, con algo de aire. */
const ANCHO_TEXTO_COTA = 45;

/** Donde se puede partir sin cortar ninguna pieza de ninguna fila. */
function cortesLibres(filas: FilaCorte[]): number[] {
  const bordes = [...new Set(filas.flatMap(f => f.piezas.flat()))].sort((a, b) => a - b);
  return bordes.filter(x => filas.every(f => f.piezas.every(([a, b]) => !(a < x - 0.5 && x + 0.5 < b))));
}

/** Si al partir cae el texto de una cota (`evitar`, su centro), el tramo acaba antes y el siguiente lo enseña entero. */
function finDeTramo(filas: FilaCorte[], c: number): number {
  const cerca = filas.flatMap(f => f.evitar ?? []).filter(e => Math.abs(e - c) < ANCHO_TEXTO_COTA);
  return Math.min(c, ...cerca.map(e => e - ANCHO_TEXTO_COTA));
}

/**
 * Tramos y su sitio en el papel. `ventana` es el sitio del corte en la hoja (mm) y `escala` pasa de cm de modelo a mm
 * de papel a escala 1. Devuelve un solo tramo si partir no lo enseña al menos un 15 % más grande.
 */
export function repartirCorte(zona: Zona, filas: FilaCorte[], ventana: Zona): TramoCorte[] {
  const libres = cortesLibres(filas), anchoV = ventana.x1 - ventana.x0, altoV = ventana.y1 - ventana.y0;
  const opciones = [1, 2, 3, 4].map(k => {
    const cortes: number[] = [];
    for (let j = 1; j < k; j++) {
      const objetivo = zona.x0 + (zona.x1 - zona.x0) * j / k, previo = cortes.at(-1) ?? zona.x0;
      const c = libres.filter(x => x > previo + 50 && x < zona.x1 - 50)
        .sort((a, b) => Math.abs(a - objetivo) - Math.abs(b - objetivo))[0];
      if (c == null) return undefined;
      cortes.push(c);
    }
    const tramos: Zona[] = [zona.x0, ...cortes].map((x0, j) => {
      const x1 = cortes[j] == null ? zona.x1 : finDeTramo(filas, cortes[j]);
      if (!j) return { x0, x1, y0: zona.y0, y1: zona.y1 };
      // Del segundo en adelante, solo las filas que siguen más allá del corte.
      const siguen = filas.filter(f => Math.max(...f.piezas.map(p => p[1])) > x0 + 0.5);
      return { x0: Math.min(x0 - SOLAPE, finDeTramo(filas, x0)), x1, y0: Math.min(...siguen.map(f => f.y0)), y1: Math.max(...siguen.map(f => f.y1)) };
    });
    const ancho = Math.max(...tramos.map(t => t.x1 - t.x0)), alto = tramos.reduce((s, t) => s + t.y1 - t.y0, 0);
    const escala = Math.min(anchoV / ancho, (altoV - ENTRE_TRAMOS * (k - 1)) / alto);
    return { tramos, escala };
  }).filter(o => o != null && o.tramos.every(t => Number.isFinite(t.y0)));
  const una = opciones[0]!;
  const mejor = opciones.reduce((m, o) => (o!.escala > m!.escala ? o : m), una)!;
  const elegida = mejor.escala > una.escala * 1.15 ? mejor : una;
  let arriba = ventana.y1;
  return elegida.tramos.map(z => {
    const w = (z.x1 - z.x0) * elegida.escala, h = (z.y1 - z.y0) * elegida.escala;
    const papel = { x0: ventana.x0, x1: ventana.x0 + w, y1: arriba, y0: arriba - h };
    arriba = papel.y0 - ENTRE_TRAMOS;
    return { zona: z, papel };
  });
}
