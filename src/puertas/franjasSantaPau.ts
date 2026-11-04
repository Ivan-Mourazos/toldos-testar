import type { Punto } from './tipos.ts';

// Diagonales amarillas del faldón de Santa Pau (se imprimen tras cortar el saco negro). Iván, 04/11/2026: «que la
// web ponga unas bien hechas para que quede bonito en la presentación», no copiar las de sus planos, que eran
// irregulares. Se conserva su inclinación (30 de avance por cada 35 de alto) y el ancho de franja (14,142 medido
// en horizontal); franja y hueco son iguales y el dibujo queda centrado en el frente. Solo es presentación:
// nada de esto va al corte de máquina.
export const FRANJAS_SANTA_PAU = { avancePorAlto: 30 / 35, ancho: 14.142136 } as const;

/** Recorta un polígono convexo por el semiplano que deja dentro el punto `dentro`. */
function recortar(ps: Punto[], a: Punto, b: Punto, dentro: Punto): Punto[] {
  const lado = (p: Punto) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
  const signo = Math.sign(lado(dentro)) || 1, d = (p: Punto) => signo * lado(p), salida: Punto[] = [];
  ps.forEach((p, i) => {
    const q = ps[(i + 1) % ps.length], u = d(p), v = d(q);
    if (u >= -1e-9) salida.push(p);
    if ((u >= 0) !== (v >= 0)) { const t = u / (u - v); salida.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
  });
  return salida;
}

/** Franjas regulares del faldón (frente × alto, en cm desde el bajo), recortadas en su borde. `_revision` se
 * mantiene por compatibilidad con los pedidos guardados; ya no cambia el dibujo. */
export function franjasSantaPau(frente: number, alto: number, _revision?: string): Array<{ capa: string; puntos: Punto[] }> {
  if (!(frente > 0) || !(alto > 0)) return [];
  const { ancho } = FRANJAS_SANTA_PAU, avance = FRANJAS_SANTA_PAU.avancePorAlto * alto, paso = 2 * ancho;
  // Una franja centrada en el frente a media altura y las demás a paso igual a ambos lados.
  const x0 = frente / 2 - ancho / 2 - avance / 2;
  const centro: Punto = [frente / 2, alto / 2];
  const bordes: Array<[Punto, Punto]> = [[[0, 0], [frente, 0]], [[frente, 0], [frente, alto]], [[frente, alto], [0, alto]], [[0, alto], [0, 0]]];
  const salida: Array<{ capa: string; puntos: Punto[] }> = [];
  const desde = Math.floor((-x0 - avance - ancho) / paso), hasta = Math.ceil((frente - x0) / paso);
  for (let k = desde; k <= hasta; k++) {
    const x = x0 + k * paso;
    let franja: Punto[] = [[x, 0], [x + ancho, 0], [x + ancho + avance, alto], [x + avance, alto]];
    for (const [a, b] of bordes) franja = recortar(franja, a, b, centro);
    const area = franja.reduce((s, p, i) => { const q = franja[(i + 1) % franja.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
    if (franja.length >= 3 && Math.abs(area) > 0.01) salida.push({ capa: 'referencias', puntos: franja.map(([px, py]) => [Math.round(px * 1e6) / 1e6, Math.round(py * 1e6) / 1e6] as Punto) });
  }
  return salida;
}
