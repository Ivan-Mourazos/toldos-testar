import type { PiezaPuerta, Punto, Puerta } from './tipos.ts';

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
  // La enrollable no se suelda doblada. El rematado es lo que queda libre bajo el paño y los 2 cm de soldar van
  // encima (Iván, 24/10/2026, AR2605220: con el de 80 quedaba de 7): el corte es el doble de rematado + 2 y la
  // pestaña de velcro queda a 2 de cada lado (120: corte 30, pestaña 13 entre 15 y 28). La autorreparable no lleva pestaña.
  if (modelo === 'PUERTAENR') return { rematado, corte: 2 * (rematado + 2), altoPestana: rematado };
  return { rematado, corte: 2 * rematado + 8, altoPestana: modelo === 'PUERTAUTO' ? 0 : rematado + 2 };
}

/** Saco simple de la apilable; sin elegir, el de 80, que es el habitual. */
export const sacoApilable = (p: Puerta) => medidasSaco(p.apilable.saco ?? 80);

/** Saco útil en mm de cualquier puerta. Las autorreparables guardadas antes del campo eran de 120; las enrollables
 * se cortaban de 26 con el paño desde 11, que con la regla del 24/10/2026 es el de 100 (como los cortes reales). */
export function sacoUtil(p: Puerta): number | null {
  if (p.modelo === 'PUERTAPLE') return p.apilable.saco;
  const saco = p.modelo === 'PUERTAENR' ? p.enrollable.saco : p.autorreparable.saco;
  return saco === undefined ? (p.modelo === 'PUERTAENR' ? 100 : 120) : saco;
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

/** Saco del suelo inclinado. El doblez (la mitad del alto) sigue la pendiente del bajo y el lado largo mide
 * hypot(ancho, desnivel); nunca se suma otra diagonal al ancho. La mitad de arriba se cizalla y conserva la cabeza
 * vertical; la de abajo es su reflejo sobre la raya del doblez, con la cabeza un poco torcida, para que al doblar el
 * saco quede encima de la otra y la cabeza terminada salga vertical (Iván, 26/10/2026, AR2605035: con las dos cabezas
 * verticales, al doblarlo no quedaba bien).
 * El origen sirve para continuar el mismo doblez en las mitades con solape.
 */
export function inclinarSaco(pieza: PiezaPuerta, pendiente: number, origen = 0): void {
  if (!pendiente) return;
  const m = pendiente, f = pieza.alto / 2, k = 1 / (1 + m * m);
  const mover = ([x, y]: Punto): Punto => {
    if (y >= f) return [x, y + m * (x + origen)];
    // Doblada encima de la de arriba, cizallada y devuelta por reflejo sobre el doblez y = f + m·(x + origen).
    const dx = x + origen, dy = 2 * f - y + m * dx - f, t = (dx + m * dy) * k;
    return [2 * t - dx - origen, f + 2 * m * t - dy];
  };
  // Los tramos que cruzan el doblez se parten en él, para que cada mitad tome su forma.
  const cruce = (a: Punto, b: Punto): Punto | null =>
    (a[1] - f) * (b[1] - f) < 0 ? [a[0] + (b[0] - a[0]) * (f - a[1]) / (b[1] - a[1]), f] : null;
  const contorno = pieza.contorno.flatMap((a, i, c) => {
    const corte = cruce(a, c[(i + 1) % c.length]);
    return corte ? [a, corte] : [a];
  }).map(mover);
  const marcas = pieza.marcas.flatMap(([x1, y1, x2, y2]): Punto[][] => {
    const corte = cruce([x1, y1], [x2, y2]);
    return corte ? [[[x1, y1], corte], [corte, [x2, y2]]] : [[[x1, y1], [x2, y2]]];
  }).map(([a, b]) => [mover(a), mover(b)]);
  const x0 = Math.min(...contorno.map(p => p[0])), y0 = Math.min(...contorno.map(p => p[1]));
  const red = (v: number) => Math.round(v * 1e4) / 1e4;
  const llevar = (p: Punto): Punto => { const [x, y] = mover(p); return [red(x - x0), red(y - y0)]; };
  pieza.contorno = contorno.map(([x, y]) => [red(x - x0), red(y - y0)]);
  pieza.ancho = Math.max(...pieza.contorno.map(p => p[0]));
  pieza.alto = Math.max(...pieza.contorno.map(p => p[1]));
  pieza.marcas = marcas.map(([a, b]) => [red(a[0] - x0), red(a[1] - y0), red(b[0] - x0), red(b[1] - y0)]);
  pieza.textos = pieza.textos.map(t => { const [x, y] = llevar([t.x, t.y]); return { ...t, x, y }; });
  pieza.unionesCorte = pieza.unionesCorte?.map(t => { const [x, y] = llevar([t.x, t.y]); return { ...t, x, y }; });
}

/** Paño del bajo inclinado en el corte: media vuelta, para que su lado recto (el de arriba) vaya contra el borde del
 * rollo y lo inclinado quede dentro (Iván, 26/10/2026, AR2605035: «en el corte se suelen invertir para tener el fondo
 * recto»). Girar no le da la vuelta: sigue cortándose por el revés. En la confección no cambia nada.
 */
export function invertirPanoInclinado(pieza: PiezaPuerta): PiezaPuerta {
  // Solo el trapecio del bajo inclinado: cuatro esquinas, arriba recto y abajo no.
  if (pieza.clase !== 'pano' || pieza.contorno.length !== 4) return pieza;
  const [a, b, c, d] = pieza.contorno;
  if (Math.abs(c[1] - d[1]) > 1e-6 || Math.abs(a[1] - b[1]) < 1e-6) return pieza;
  const { ancho: w, alto: h } = pieza;
  const red = (v: number) => Math.round(v * 1e4) / 1e4;
  const girar = ([x, y]: Punto): Punto => [red(w - x), red(h - y)];
  return { ...pieza,
    contorno: pieza.contorno.map(girar),
    marcas: pieza.marcas.map(([x1, y1, x2, y2]) => [...girar([x1, y1]), ...girar([x2, y2])] as [number, number, number, number]),
    textos: pieza.textos.map(t => { const [x, y] = girar([t.x, t.y]); return { ...t, x, y }; }),
    unionesCorte: pieza.unionesCorte?.map(t => { const [x, y] = girar([t.x, t.y]); return { ...t, x, y }; }),
    huecos: pieza.huecos.map(q => ({ ...q, x: red(w - q.x - q.ancho), y: red(h - q.y - q.alto),
      abierto: q.abierto === 'izquierda' ? 'derecha' : q.abierto === 'derecha' ? 'izquierda' : undefined })),
    entradasIncorporadas: pieza.entradasIncorporadas?.map(e => ({ ...e, y: red(h - e.y) })) };
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
