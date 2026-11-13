// Recogida con correas (Iván, 13/11/2026; pedido de ejemplo AR2504631 de Remolques Jalón y la lámina
// DIBUJOS/REMOLQUES/REMOLQUES GANADO/remolques especiales/RECOLLER_CON_CORREAS.jpg): la esquina queda abierta;
// la cinta va cosida en el paño, sin llegar a la oreja, y la hebilla en el lateral, a la misma altura.
// El paño lleva las orejas de la goma, pero sin ollaos.

/** Lo que mide la recogida en el desplegable. */
export const RECOGIDA_CORREAS = "CORREAS";

/** Medidas en cm sobre la lona hecha, sacadas del AR2504631 (oreja de 65 sobre la lona hecha: correas a 15 y
 *  52,5, con 35 de hueco entre las dos y la de arriba a 10 de lo alto de la oreja). */
export const CORREAS = {
  /** Del borde de abajo de la lona hecha al de abajo de la primera correa. */
  primera: 15,
  /** Ancho de la cinta. */
  ancho: 2.5,
  /** De lo alto de la cinta de arriba a lo alto de la oreja. */
  margenArriba: 10,
  /** Separación máxima entre correas (de borde de abajo a borde de abajo): 35 de hueco + la cinta. */
  pasoMaximo: 37.5,
} as const;

export const esCorreas = (recogida: string | undefined | null): boolean => recogida === RECOGIDA_CORREAS;

const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Dónde va cada correa de una esquina, repartidas por la oreja (Iván, 13/11/2026): el borde de abajo de cada
 * cinta, en cm sobre la lona hecha. La primera a 15; la última, con lo alto de la cinta a 10 de lo alto de la
 * oreja; entre medias, las justas para que no se separen más de 37,5. Una oreja baja lleva solo la primera.
 */
export function alturasCorreas(altoOreja: number): number[] {
  const ultima = altoOreja - CORREAS.margenArriba - CORREAS.ancho;
  if (!(ultima > CORREAS.primera)) return [CORREAS.primera];
  // Con 1 mm de tolerancia: la oreja de la web sale con decimales (68,52 en el AR2504631) y no por eso lleva otra.
  const tramos = Math.ceil((ultima - CORREAS.primera - 0.1) / CORREAS.pasoMaximo);
  return Array.from({ length: tramos + 1 }, (_, k) => r1(CORREAS.primera + ((ultima - CORREAS.primera) * k) / tramos));
}
