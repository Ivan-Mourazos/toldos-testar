import type { LienzoEnrollable } from './planoEnrollable.ts';
import type { Punto } from './tipos.ts';

/** Mantiene la medida y la línea de cota; lleva sus referencias hasta el borde dibujado. */
export function anclarCotas(l: LienzoEnrollable) {
  const segmentos: Array<[Punto, Punto]> = l.lineas.filter(v => v.capa !== 'texto')
    .map(v => [[v.x1, v.y1], [v.x2, v.y2]]);
  for (const p of l.polilineas) {
    if (p.capa === 'texto') continue;
    for (let i = 0; i < p.puntos.length - (p.cerrada ? 0 : 1); i++) {
      // El extremo de una cota debe llegar a un tramo recto, no a la esquina virtual del radio.
      if (!p.curvas?.[i]) segmentos.push([p.puntos[i], p.puntos[(i + 1) % p.puntos.length]]);
    }
  }
  return l.cotas.map(c => {
    const vertical = c.giro === 90, s = vertical ? 1 : 0, t = vertical ? 0 : 1;
    const ancla = (p: Punto): Punto => {
      const candidatos: number[] = [];
      for (const [a, b] of segmentos) {
        if (Math.abs(a[s] - b[s]) < 1e-6) {
          if (Math.abs(p[s] - a[s]) < 1e-6) candidatos.push(Math.max(Math.min(a[t], b[t]), Math.min(Math.max(a[t], b[t]), p[t])));
        } else {
          const u = (p[s] - a[s]) / (b[s] - a[s]);
          if (u >= -1e-6 && u <= 1 + 1e-6) candidatos.push(a[t] + u * (b[t] - a[t]));
        }
      }
      const q: Punto = [...p];
      if (candidatos.length) q[t] = candidatos.sort((a, b) => Math.abs(a - p[t]) - Math.abs(b - p[t]))[0];
      return q;
    };
    const [x1, y1] = ancla([c.x1, c.y1]), [x2, y2] = ancla([c.x2, c.y2]);
    return { ...c, x1, y1, x2, y2 };
  });
}
