import { anchoArial } from '../domain/corteLona/texto.js';
import { esVertical, textoCota, type CotaAlzado } from './alzado.ts';

/** El SVG respeta el mismo hueco para el número que el bloque DIMENSION del CAD. */
export function tramosCota(c: CotaAlzado): Array<[number, number]> {
  const v = esVertical(c), a = Math.min(v ? c.y1 : c.x1, v ? c.y2 : c.x2), b = Math.max(v ? c.y1 : c.x1, v ? c.y2 : c.x2);
  const t = c.texto, perpendicular = v ? t.x : t.y, centro = v ? t.y : t.x;
  if (!c.tamanoTexto || Math.abs(perpendicular - c.linea) > .01) return [[a, b]];
  const mitad = anchoArial(textoCota(c), c.tamanoTexto) / 2 + .6;
  return [[a, Math.max(a, centro - mitad)], [Math.min(b, centro + mitad), b]].filter(([u, w]) => w > u) as Array<[number, number]>;
}
