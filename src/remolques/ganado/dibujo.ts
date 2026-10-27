import type { ModeloGanado } from "../calc/ganado.ts";
import { DIBUJO_ECONOMICO } from "./economicoDatos.ts";

// El dibujo de confección de un remolque de ganado (cm, origen abajo a la izquierda): el de su plantilla, con
// los ollaos a 4 cm del borde de corte como en el corte (en la plantilla, a 4,5). Lo usan el plano y la
// pantalla, para que enseñen lo mismo.

/** Iván, 23/10/2026: en el ganado, los centros de los ollaos a 4 cm del borde de corte. */
export const OLLAO_AL_BORDE_CM = 4;

export type DibujoGanado = typeof DIBUJO_ECONOMICO;

const PLANTILLAS: Record<ModeloGanado, DibujoGanado> = { REMOLCAR_ECONOMICO: DIBUJO_ECONOMICO };

/** Las rectas del borde de corte (capa DISCO1): las líneas y los lados de las polilíneas. */
function bordesDeCorte(d: DibujoGanado): [number, number, number, number][] {
  const lineas = d.lineas.filter((l) => l.capa === "DISCO1").map((l): [number, number, number, number] => [l.x1, l.y1, l.x2, l.y2]);
  const lados = d.polilineas.filter((p) => p.capa === "DISCO1").flatMap((p) => p.puntos
    .slice(0, p.cerrada ? undefined : -1)
    .map(([x, y], k): [number, number, number, number] => [x, y, ...p.puntos[(k + 1) % p.puntos.length]]));
  return [...lineas, ...lados];
}

/** Un ollao (marca redonda de rotulador) pegado a un borde de corte, a 4 cm de él; los demás círculos, igual. */
function acercarAlBorde(c: { capa: string; x: number; y: number; r: number }, bordes: [number, number, number, number][]) {
  if (c.capa !== "ROTULADOR") return c;
  let mejor: { d: number; px: number; py: number } | null = null;
  for (const [x1, y1, x2, y2] of bordes) {
    const L2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (L2 < 1e-6) continue;
    const u = ((c.x - x1) * (x2 - x1) + (c.y - y1) * (y2 - y1)) / L2;
    if (u < 0 || u > 1) continue;
    const px = x1 + u * (x2 - x1), py = y1 + u * (y2 - y1), d = Math.hypot(px - c.x, py - c.y);
    if (!mejor || d < mejor.d) mejor = { d, px, py };
  }
  // Solo los que están a 4-5,5 cm de un borde: las marcas de dentro (ventana, rayas) no se mueven.
  if (!mejor || mejor.d <= OLLAO_AL_BORDE_CM || mejor.d >= OLLAO_AL_BORDE_CM + 1.5) return c;
  const k = (mejor.d - OLLAO_AL_BORDE_CM) / mejor.d;
  return { ...c, x: c.x + (mejor.px - c.x) * k, y: c.y + (mejor.py - c.y) * k };
}

export function dibujoGanado(modelo: string): DibujoGanado | null {
  const d = (PLANTILLAS as Record<string, DibujoGanado>)[modelo];
  if (!d) return null;
  const bordes = bordesDeCorte(d);
  return { ...d, circulos: d.circulos.map((c) => acercarAlBorde(c, bordes)) };
}
