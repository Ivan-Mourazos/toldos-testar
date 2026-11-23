import { escribirDxf2004 } from '../../domain/corteLona/dxfCorte.js';
import { barridoArco, cajaDe } from './marco.ts';
import type { Pieza } from './tipos.ts';

/** Esquina inferior izquierda del dibujo en el DXF limpio. */
export const ORIGEN_DXF = { x: 0, y: 0 };

export function escribirDxfLimpio(piezas: Pieza[]): string {
  if (!piezas.length) throw new Error('No queda nada que cortar.');
  const caja = cajaDe(piezas.filter(p => p.tipo !== 'texto')) ?? cajaDe(piezas) ?? { x0: 0, y0: 0, x1: 0, y1: 0 };
  const lineas = [], arcos = [], circulos = [], textosCad = [];
  for (const p of piezas) {
    if (p.tipo === 'linea') lineas.push({ capa: p.capa, x1: p.a.x, y1: p.a.y, x2: p.b.x, y2: p.b.y });
    else if (p.tipo === 'arco' && barridoArco(p) === 360) circulos.push({ capa: p.capa, x: p.c.x, y: p.c.y, r: p.r });
    else if (p.tipo === 'arco') arcos.push({ capa: p.capa, x: p.c.x, y: p.c.y, r: p.r, desde: p.desde, hasta: p.hasta });
    else textosCad.push({ capa: p.capa, pares: p.pares });
  }
  return escribirDxf2004({ lineas, textos: [], circulos, arcos, textosCad },
    { dx: ORIGEN_DXF.x - caja.x0, dy: ORIGEN_DXF.y - caja.y0, leyenda: false });
}
