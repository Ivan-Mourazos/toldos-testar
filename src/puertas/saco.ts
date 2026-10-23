import type { PiezaPuerta, Puerta } from './tipos.ts';

/** Diferencia firmada del bajo en coordenadas de confección (y hacia arriba). */
export function desnivelSuelo(p: Puerta): number {
  const s = p.modelo === 'PUERTAPLE' ? p.apilable.sueloInclinado : undefined;
  return s && Number.isFinite(s.altoIzquierdo) && Number.isFinite(s.altoDerecho)
    ? s.altoIzquierdo - s.altoDerecho : 0;
}

/** Iván, 23/10/2026: el saco útil del pedido (mm) queda rematado con 1 cm de margen (80 → 9 cm, 110 → 12 cm).
 * Antes el de 80 se cortaba de 30 y quedaba de 11. El corte es dos veces el rematado más 8 y la pestaña, el
 * rematado más 2, como los de 30/13 (rematado 11) y 32/14 (rematado 12) de siempre. El plano rotula el del pedido.
 */
export function medidasSaco(utilMm: number) {
  const rematado = utilMm / 10 + 1;
  return { rematado, corte: 2 * rematado + 8, altoPestana: rematado + 2 };
}

/** Saco simple de la apilable; sin elegir, el de 80, que es el habitual. */
export const sacoApilable = (p: Puerta) => medidasSaco(p.apilable.saco ?? 80);

/** Pestaña del saco a la derecha mirando por el revés, como la pinte el pedido (Iván, 23/10/2026). */
export const pestanaDerecha = (p: Puerta) => p.modelo === 'PUERTAPLE' && p.apilable.ladoPestana === 'derecha';

/** Da la vuelta a la pieza de izquierda a derecha, sin moverla de su caja. */
export function espejarPieza(pieza: PiezaPuerta): void {
  const x = (v: number) => pieza.ancho - v;
  pieza.contorno = pieza.contorno.map(([a, b]) => [x(a), b] as [number, number]).reverse();
  pieza.marcas = pieza.marcas.map(([x1, y1, x2, y2]) => [x(x1), y1, x(x2), y2]);
  pieza.textos = pieza.textos.map(t => ({ ...t, x: x(t.x) }));
  pieza.unionesCorte = pieza.unionesCorte?.map(t => ({ ...t, x: x(t.x) }));
  pieza.huecos = pieza.huecos.map(h => ({ ...h, x: pieza.ancho - h.x - h.ancho,
    abierto: h.abierto === 'izquierda' ? 'derecha' : h.abierto === 'derecha' ? 'izquierda' : undefined }));
}

/** Cizalla vertical: conserva cabezas verticales, pestaña y ancho proyectado.
 * El lado largo mide hypot(ancho, desnivel); nunca se suma otra diagonal al ancho.
 * El origen sirve para continuar la misma pendiente en las mitades con solape.
 */
export function inclinarSaco(pieza: PiezaPuerta, pendiente: number, origen = 0): void {
  if (!pendiente) return;
  const y = (x: number, alto: number) => alto + pendiente * (x + origen);
  const contorno = pieza.contorno.map(([x, alto]) => [x, y(x, alto)] as [number, number]);
  const minimo = Math.min(...contorno.map(p => p[1]));
  pieza.contorno = contorno.map(([x, alto]) => [x, alto - minimo]);
  pieza.alto = Math.max(...pieza.contorno.map(p => p[1]));
  pieza.marcas = pieza.marcas.map(([x1,y1,x2,y2]) => [x1,y(x1,y1)-minimo,x2,y(x2,y2)-minimo]);
  pieza.textos = pieza.textos.map(t=>({...t,y:y(t.x,t.y)-minimo}));
  pieza.unionesCorte = pieza.unionesCorte?.map(t=>({...t,y:y(t.x,t.y)-minimo}));
}

/** Iván, 22/10/2026: las diagonales se imprimen después de cortar el saco negro. */
export function rotuloSaco(p: Pick<Puerta, 'materialSaco' | 'sacoDiagonalesAmarillas'>): string {
  return p.sacoDiagonalesAmarillas ? 'SACO 900 GR AMARILLO/NEGRO' : p.materialSaco.replace(/^LAC\s*900\s*/i, 'SACO 900 GR ');
}
