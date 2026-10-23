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
export function medidasSaco(utilMm: number, modelo: Puerta['modelo'] = 'PUERTAPLE') {
  const rematado = utilMm / 10 + 1;
  // La enrollable no se suelda doblada: el corte es el doble del rematado y la pestaña de velcro queda a 2 de
  // cada lado (120: corte 26, pestaña 11 entre 13 y 24). La autorreparable no lleva pestaña.
  if (modelo === 'PUERTAENR') return { rematado, corte: 2 * rematado, altoPestana: rematado - 2 };
  return { rematado, corte: 2 * rematado + 8, altoPestana: modelo === 'PUERTAUTO' ? 0 : rematado + 2 };
}

/** Saco simple de la apilable; sin elegir, el de 80, que es el habitual. */
export const sacoApilable = (p: Puerta) => medidasSaco(p.apilable.saco ?? 80);

/** Saco útil en mm de cualquier puerta. Las enrollables y autorreparables guardadas antes del campo eran de 120. */
export function sacoUtil(p: Puerta): number | null {
  if (p.modelo === 'PUERTAPLE') return p.apilable.saco;
  const saco = p.modelo === 'PUERTAENR' ? p.enrollable.saco : p.autorreparable.saco;
  return saco === undefined ? 120 : saco;
}

/** Medidas del saco de la puerta; sin saco puesto se dibuja el habitual de su modelo y el cálculo avisa. */
export const sacoPuerta = (p: Puerta) => medidasSaco(sacoUtil(p) ?? (p.modelo === 'PUERTAPLE' ? 80 : 120), p.modelo);

/** Doble saco: el de 80 integrado sale del propio paño, que empieza 2,5 más abajo que su rematado
 * (antes −13,5 con el rematado de 11; con el de 9, −11,5). */
export const bajoDobleSaco = (p: Puerta) => -(sacoApilable(p).rematado + 2.5);

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

/**
 * En el corte, el saco inclinado se gira para que su lado largo de abajo quede recto con el rollo: así se ajusta
 * al inicio del rollo y las mitades del saco partido van pegadas. La forma no cambia (Iván, 23/10/2026, AR2605035).
 */
export function enderezarSaco(pieza: PiezaPuerta): PiezaPuerta {
  if (pieza.clase !== 'saco') return pieza;
  const c = pieza.contorno;
  const lados = c.map((a, i) => [a, c[(i + 1) % c.length]] as const).filter(([a, b]) => Math.abs(b[0] - a[0]) > pieza.ancho / 2);
  if (!lados.length) return pieza;
  const abajo = lados.reduce((m, l) => l[0][1] + l[1][1] < m[0][1] + m[1][1] ? l : m);
  const [a, b] = abajo[0][0] < abajo[1][0] ? abajo : [abajo[1], abajo[0]];
  const giro = -Math.atan2(b[1] - a[1], b[0] - a[0]);
  if (Math.abs(giro) < 1e-9) return pieza;
  const [cos, sin] = [Math.cos(giro), Math.sin(giro)];
  const girar = (x: number, y: number): [number, number] => [x * cos - y * sin, x * sin + y * cos];
  const puntos = c.map(([x, y]) => girar(x, y));
  const x0 = Math.min(...puntos.map(p => p[0])), y0 = Math.min(...puntos.map(p => p[1]));
  const red = (v: number) => Math.round(v * 1e4) / 1e4;
  const mover = (x: number, y: number): [number, number] => { const [u, v] = girar(x, y); return [red(u - x0), red(v - y0)]; };
  const contorno = c.map(([x, y]) => mover(x, y));
  return { ...pieza, contorno,
    ancho: Math.max(...contorno.map(p => p[0])), alto: Math.max(...contorno.map(p => p[1])),
    marcas: pieza.marcas.map(([x1, y1, x2, y2]) => [...mover(x1, y1), ...mover(x2, y2)] as [number, number, number, number]),
    textos: pieza.textos.map(t => { const [x, y] = mover(t.x, t.y); return { ...t, x, y }; }),
    unionesCorte: pieza.unionesCorte?.map(t => { const [x, y] = mover(t.x, t.y); return { ...t, x, y }; }) };
}
