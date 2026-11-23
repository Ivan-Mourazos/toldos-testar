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
    for (const { pieza: p } of c.colocadas.filter(t => !t.aparte)) areas.set(p.of, (areas.get(p.of) ?? 0) + p.ancho * p.alto * (p.multiplicador ?? 1));
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

/**
 * Los ML de la lona de una puerta para su cajetín: los rollos donde van sus paños y, en cada uno, lo que toca a cada OF
 * de esos paños. Una sola cifra si la puerta tiene una OF y una lona; si no (Araujo con tramos de otra OF u otro
 * material), cada una con su OF y su material. Solo apilables, enrollables y autorreparables, también las de Araujo y
 * Santa Pau; ni System Dock ni sacos confeccionados (Iván, 17/11/2026).
 */
function paresLonaPuerta(cortes: CortePuertas[], elemento: { id: string; input: { modelo: string } }) {
  if (!['PUERTAPLE', 'PUERTAENR', 'PUERTAUTO'].includes(elemento.input.modelo)) return new Map<string, { material: string; of: string }>();
  const pares = new Map<string, { material: string; of: string }>();
  for (const c of cortes) if (c.opcion === 'principal') for (const { pieza: p } of c.colocadas)
    if (p.clase === 'pano' && p.id.startsWith(`${elemento.id}:`)) pares.set(JSON.stringify([c.material, p.of]), { material: c.material, of: p.of });
  return pares;
}

/** El mismo reparto que se muestra en los cajetines, con cada par de material y OF una sola vez. */
export function metrosLonaPuertas(cortes: CortePuertas[], elementos: Array<{ id: string; input: { modelo: string } }>) {
  const pares = new Map(elementos.flatMap(elemento => [...paresLonaPuerta(cortes, elemento)]));
  const porMaterial = new Map([...new Set([...pares.values()].map(p => p.material))].map(material => {
    const anchos = new Set(cortes.filter(c => c.opcion === 'principal' && c.material === material).map(c => c.anchoRollo));
    const anchoRollo = anchos.size === 1 ? [...anchos][0] : undefined;
    return [material, { anchoRollo, porOf: metrosPorOf(cortes, material) }];
  }));
  return [...pares.values()].map(({ material, of }) => {
    const metraje = porMaterial.get(material);
    return { material, of, anchoRollo: metraje?.anchoRollo, cm: metraje?.porOf.get(of) ?? 0 };
  });
}

export function textoMlPuerta(cortes: CortePuertas[], elemento: { id: string; input: { modelo: string } }): string {
  const lista = [...paresLonaPuerta(cortes, elemento).values()];
  const variasOf = new Set(lista.map(x => x.of)).size > 1, variosMat = new Set(lista.map(x => x.material)).size > 1;
  return lista.map(({ material, of }) => {
    const cm = metrosPorOf(cortes, material).get(of) ?? 0;
    return [...variasOf ? [of] : [], ...variosMat ? [material] : [], formatoMl(cm)].join(' ');
  }).filter(v => !/^0,00 ML$/.test(v)).join(' · ');
}

/** «20,00 ML» a partir de los cm. */
export const formatoMl = (cm: number) => `${(cm / 100).toFixed(2).replace('.', ',')} ML`;
