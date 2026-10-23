import type { PiezaPuerta } from './tipos.ts';

/** Como toldos y remolques: 1 cm dentro del borde soldado y 1 cm desde cada punta (Iván, 22/10/2026: «no a 4 cm, ponlas a 1 cm»). */
export function numerarBorde(p: PiezaPuerta, numero: number, borde: 'arriba' | 'abajo' | 'izquierda' | 'derecha') {
  const horizontal = borde === 'arriba' || borde === 'abajo';
  const sitios = horizontal
    ? [1, p.ancho - 1].map(x => ({ x, y: borde === 'arriba' ? p.alto - 1 : 1, numero }))
    : [1, p.alto - 1].map(y => ({ x: borde === 'derecha' ? p.ancho - 1 : 1, y, numero, giro: 90 }));
  p.unionesCorte = [...p.unionesCorte ?? [], ...sitios];
}

/** Centro del tramo libre más largo a lo ancho de una franja, entre sus recortes: ahí va el rótulo de una E.T. para
 * no caer encima del recorte de la cinta del centro (Iván, 23/10/2026, AR2605035). */
export function centroLibre(huecos: Array<{ x: number; ancho: number }>, ancho: number): number {
  const ocupados = huecos.map(h => [h.x, h.x + h.ancho]).sort((a, b) => a[0] - b[0]);
  let mejor = [0, 0], desde = 0;
  for (const [a, b] of [...ocupados, [ancho, ancho]]) {
    if (a - desde > mejor[1] - mejor[0]) mejor = [desde, a];
    desde = Math.max(desde, b);
  }
  return (mejor[0] + mejor[1]) / 2;
}
