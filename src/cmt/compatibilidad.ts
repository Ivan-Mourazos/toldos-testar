import type { Dxf, ObjetoGeometrico } from './tipos.ts';
import { value } from './dxf.ts';

/**
 * El paso SVG observado expresa las LINE en píxeles de 96 dpi con seis cifras.
 * Su eje Y parte de la página A4 de 297 mm. Las curvas conservan otra precisión.
 * Se aplica después de unir por los extremos originales para no perder uniones.
 */
export function redondearComoRobot(objects: ObjetoGeometrico[], dxf: Dxf): void {
  const tipos = new Map(dxf.entities.map(e => [value(e, 5), e.type]));
  for (const o of objects) {
    if (o.entity === 'TEXT' || !o.source.some(h => tipos.get(h) === 'LINE')) continue;
    for (let k = 0; k < o.paths.length; k++) {
      let p = o.paths[k];
      const first = p[0], last = p.at(-1)!;
      if (Math.hypot(first.x - last.x, first.y - last.y) < .02 && p.some(q => q.type !== 0 && !q.lineaDxf) && p.some(q => q.type === 4 && q.lineaDxf)) {
        // El robot inicia estos trazados en un nodo de curva y termina con recta.
        // No se fuerza el último punto al primero: eso cambia el relleno en CUTMatic.
        const i = p.findIndex((q, j) => q.type === 4 && q.lineaDxf && p[j + 1] && !p[j + 1].lineaDxf);
        if (i > 0) {
          p = [{...p[i], type: 0}, ...p.slice(i + 1), ...p.slice(1, i + 1)];
          o.paths[k] = p;
        }
      }
      for (let i = 0; i < p.length; i++) {
        if (!(p[i].type === 4 && p[i].lineaDxf) && !(i === 0 && p[1]?.type === 4 && p[1].lineaDxf)) continue;
        p[i] = {...p[i],
          x: Number((p[i].x * 96 / 25.4).toPrecision(6)) * 25.4 / 96,
          y: 297 - Number(((297 - p[i].y) * 96 / 25.4).toPrecision(6)) * 25.4 / 96};
      }
    }
  }
}
