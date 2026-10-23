import type { PiezaPuerta, Puerta } from './tipos.ts';

/** Diferencia firmada del bajo en coordenadas de confección (y hacia arriba). */
export function desnivelSuelo(p: Puerta): number {
  const s = p.modelo === 'PUERTAPLE' ? p.apilable.sueloInclinado : undefined;
  return s && Number.isFinite(s.altoIzquierdo) && Number.isFinite(s.altoDerecho)
    ? s.altoIzquierdo - s.altoDerecho : 0;
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
