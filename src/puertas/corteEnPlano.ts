import type { CortePuertas, EntidadesPuertas } from './tipos.ts';

// El corte del plano es el del bot (Iván, 24/10/2026, flujo del DWG): lo que se toque en ZWCAD es lo que se corta. Estas
// funciones pasan las entidades del bot (mm) al plano (cm): un corte entero en su rollo, o lo que cae dentro de una pieza
// para dibujarla suelta como muestra, con sus líneas recortadas a ella. El plano no reconstruye nada.

type Colocada = CortePuertas['colocadas'][number];
const vacias = (): EntidadesPuertas => ({ lineas: [], textos: [], arcos: [], circulos: [] });

/** Todo el corte en cm, con el principio del rollo en (0, `yc`). */
export function corteEnPlano(c: CortePuertas, yc: number): EntidadesPuertas {
  const e = c.entidades;
  return {
    lineas: e.lineas.map(a => ({ ...a, x1: a.x1 / 10, x2: a.x2 / 10, y1: yc + a.y1 / 10, y2: yc + a.y2 / 10 })),
    arcos: e.arcos.map(a => ({ ...a, x: a.x / 10, y: yc + a.y / 10, r: a.r / 10 })),
    circulos: e.circulos.map(a => ({ ...a, x: a.x / 10, y: yc + a.y / 10, r: a.r / 10 })),
    textos: e.textos.map(a => ({ ...a, x: a.x / 10, y: yc + a.y / 10, h: a.h / 10 })),
  };
}

/** Un segmento recortado a la caja (Liang–Barsky); nada si queda fuera o se reduce a un punto. */
function recortar([x1, y1, x2, y2]: number[], caja: { x0: number; y0: number; x1: number; y1: number }, tol = 0.01) {
  const [dx, dy] = [x2 - x1, y2 - y1];
  let [t0, t1] = [0, 1];
  for (const [p, q] of [[-dx, x1 - caja.x0 + tol], [dx, caja.x1 + tol - x1], [-dy, y1 - caja.y0 + tol], [dy, caja.y1 + tol - y1]]) {
    if (Math.abs(p) < 1e-12) { if (q < 0) return null; continue; }
    const t = q / p;
    if (p < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
    if (t0 > t1) return null;
  }
  if ((t1 - t0) * Math.hypot(dx, dy) < tol) return null;
  return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
}

/** Los textos del bot que no son de ninguna pieza (el título «MATERIAL · CORTE», REVÉS…), en el orden del bot. */
export function textosFuera(c: CortePuertas): EntidadesPuertas['textos'] {
  return c.entidades.textos.filter(a => !c.colocadas.some(t => {
    const [w, h] = t.girada ? [t.pieza.alto, t.pieza.ancho] : [t.pieza.ancho, t.pieza.alto];
    return a.x >= t.x - .01 && a.x <= t.x + w * 10 + .01 && a.y >= t.y - .01 && a.y <= t.y + h * 10 + .01;
  }));
}

/**
 * Lo del bot dentro de una pieza colocada, en cm y en el sistema de la pieza: sin girar, con su esquina de abajo a la
 * izquierda en el origen. Las líneas que la cruzan (cortes compartidos con sus vecinas) se recortan a su caja.
 */
export function entidadesDePieza(c: CortePuertas, t: Colocada): EntidadesPuertas {
  const p = t.pieza, [w, h] = t.girada ? [p.alto, p.ancho] : [p.ancho, p.alto];
  const caja = { x0: t.x, y0: t.y, x1: t.x + w * 10, y1: t.y + h * 10 };
  const dentro = (x: number, y: number) => x >= caja.x0 - .01 && x <= caja.x1 + .01 && y >= caja.y0 - .01 && y <= caja.y1 + .01;
  // Del rollo (mm) a la pieza (cm): girada, lo de arriba de la pieza queda a la izquierda, como al colocarla.
  const local = (x: number, y: number): [number, number] => {
    const u = (x - t.x) / 10, v = (y - t.y) / 10;
    return t.girada ? [v, p.alto - u] : [u, v];
  };
  const giro = t.girada ? -90 : 0;
  const salida = vacias();
  for (const a of c.entidades.lineas) {
    const r = recortar([a.x1, a.y1, a.x2, a.y2], caja);
    if (!r) continue;
    const [p1, p2] = [local(r[0], r[1]), local(r[2], r[3])];
    salida.lineas.push({ ...a, x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] });
  }
  for (const a of c.entidades.arcos) {
    if (!dentro(a.x, a.y)) continue;
    const [x, y] = local(a.x, a.y);
    salida.arcos.push({ ...a, x, y, r: a.r / 10, desde: a.desde + giro, hasta: a.hasta + giro });
  }
  for (const a of c.entidades.circulos) {
    if (!dentro(a.x, a.y)) continue;
    const [x, y] = local(a.x, a.y);
    salida.circulos.push({ ...a, x, y, r: a.r / 10 });
  }
  for (const a of c.entidades.textos) {
    if (!dentro(a.x, a.y)) continue;
    const [x, y] = local(a.x, a.y);
    salida.textos.push({ ...a, x, y, h: a.h / 10, giro: (a.giro ?? 0) + giro });
  }
  return salida;
}
