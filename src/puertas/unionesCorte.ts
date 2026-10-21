import type { PiezaPuerta } from './tipos.ts';

/** Como toldos: 1 cm dentro del borde soldado y 4 cm desde cada punta. */
export function numerarBorde(p: PiezaPuerta, numero: number, borde: 'arriba' | 'abajo' | 'izquierda' | 'derecha') {
  const horizontal = borde === 'arriba' || borde === 'abajo';
  const sitios = horizontal
    ? [4, p.ancho - 4].map(x => ({ x, y: borde === 'arriba' ? p.alto - 1 : 1, numero }))
    : [4, p.alto - 4].map(y => ({ x: borde === 'derecha' ? p.ancho - 1 : 1, y, numero, giro: 90 }));
  p.unionesCorte = [...p.unionesCorte ?? [], ...sitios];
}
