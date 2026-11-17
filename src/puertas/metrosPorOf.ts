import type { CortePuertas } from './tipos.ts';

/**
 * ML de la lona principal que corresponden a cada OF, en cm (Iván, 17/11/2026). En un pedido de varias puertas con un
 * corte largo, repartir a partes iguales no vale si una puerta es mucho más grande: el largo de cada rollo se reparte
 * por la superficie de las piezas de cada OF (las «X2», tantas veces como se cortan). Solo la opción principal del
 * corte: las alternativas del saco son opciones, no consumo. Lo de la OF de stock queda en la suya. El redondeo se
 * ajusta para que cada rollo cuadre al centímetro con su largo.
 */
export function metrosPorOf(cortes: CortePuertas[], material: string): Map<string, number> {
  const total = new Map<string, number>();
  for (const c of cortes) {
    if (c.opcion !== 'principal' || c.material !== material || !c.colocadas.length) continue;
    const areas = new Map<string, number>();
    for (const { pieza: p } of c.colocadas) areas.set(p.of, (areas.get(p.of) ?? 0) + p.ancho * p.alto * (p.multiplicador ?? 1));
    const suma = [...areas.values()].reduce((s, v) => s + v, 0);
    if (!(suma > 0)) continue;
    const largo = Math.round(c.largo / 10);
    const partes = [...areas].map(([of, a]) => ({ of, exacto: largo * a / suma }))
      .map(x => ({ ...x, cm: Math.floor(x.exacto) }));
    let falta = largo - partes.reduce((s, x) => s + x.cm, 0);
    for (const x of [...partes].sort((a, b) => (b.exacto - b.cm) - (a.exacto - a.cm))) if (falta-- > 0) x.cm++;
    for (const x of partes) total.set(x.of, (total.get(x.of) ?? 0) + x.cm);
  }
  return total;
}

/** «20,00 ML» a partir de los cm. */
export const formatoMl = (cm: number) => `${(cm / 100).toFixed(2).replace('.', ',')} ML`;
