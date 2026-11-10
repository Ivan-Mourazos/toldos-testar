import { anchoArial } from '../../domain/corteLona/texto.js';
import { huecosStock, restarRetal } from './retales.js';

// Catálogo MATERIAL PARA STOCK: 200 y 165 mm exactos, sin la demasía de la plantilla histórica de ganado.
export const LARGO_MINIMO_REFUERZO = 1230; // AR2601123: tira manual de 123 × 16,5 cm.

export function refuerzosDeStock(ocupadas, largo, rollo, minimo = LARGO_MINIMO_REFUERZO) {
  if (!Number.isFinite(minimo) || minimo <= 0) throw new Error('El largo mínimo de los refuerzos debe ser positivo.');
  let libres = huecosStock(ocupadas, largo, rollo);
  const tiras = [], lineas = [], textos = [];
  while (libres.length) {
    let mejor = null;
    for (const h of libres) {
      const longitud = Math.floor((h.w + .000001) * 10) / 10;
      if (longitud < minimo) continue;
      for (let n20 = 0; n20 * 200 <= h.h + .001; n20++) {
        const n165 = Math.floor((h.h - n20 * 200 + .001) / 165), ancho = n20 * 200 + n165 * 165;
        if (!ancho) continue;
        const area = longitud * ancho, n = n20 + n165;
        if (!mejor || area > mejor.area + .001 || (Math.abs(area - mejor.area) <= .001 && n < mejor.n)) {
          mejor = { h, longitud, n20, n165, area, n };
        }
      }
    }
    if (!mejor) break;
    let y = mejor.h.y;
    for (const ancho of [...Array(mejor.n20).fill(200), ...Array(mejor.n165).fill(165)]) {
      const x = mejor.h.x, w = mejor.longitud, nombre = ancho === 200 ? 'T.O / REF 20cm STOCK' : 'REF 16.5cm STOCK';
      tiras.push({ nombre, refuerzoStock: true, x, y, ancho: w, hueco: ancho });
      lineas.push([x, y, x + w, y], [x + w, y, x + w, y + ancho], [x + w, y + ancho, x, y + ancho], [x, y + ancho, x, y]);
      textos.push({ capa: 'texto', x: x + w / 2, y: y + ancho / 2, valor: nombre, centrado: true,
        h: Math.min(ancho === 200 ? 150 : 120, ancho * .7, w * .9 / anchoArial(nombre, 1)) });
      libres = restarRetal(libres, { x, y, w, h: ancho });
      y += ancho;
    }
  }
  return { tiras, lineas, textos };
}
