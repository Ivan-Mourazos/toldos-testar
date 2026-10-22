import type { PiezaPuerta } from './tipos.ts';

/** Como toldos y remolques: 1 cm dentro del borde soldado y 1 cm desde cada punta (Iván, 22/10/2026: «no a 4 cm, ponlas a 1 cm»). */
export function numerarBorde(p: PiezaPuerta, numero: number, borde: 'arriba' | 'abajo' | 'izquierda' | 'derecha') {
  const horizontal = borde === 'arriba' || borde === 'abajo';
  const sitios = horizontal
    ? [1, p.ancho - 1].map(x => ({ x, y: borde === 'arriba' ? p.alto - 1 : 1, numero }))
    : [1, p.alto - 1].map(y => ({ x: borde === 'derecha' ? p.ancho - 1 : 1, y, numero, giro: 90 }));
  p.unionesCorte = [...p.unionesCorte ?? [], ...sitios];
}
