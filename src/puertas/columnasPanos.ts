import { huecosLibres, type PiezaCorte, type RectanguloCorte } from '../domain/corteLona/colocacionTetris.ts';

/** Los paños más largos que el ancho del rollo tienen un solo sentido. Probar primero columnas de
 * paños del mismo frente deja franjas continuas donde caben E.T. que cruzan de una columna a otra. */
export function columnasPanos(piezas: PiezaCorte[], esPano: (id: string) => boolean, rollo: number): RectanguloCorte[] | null {
  const panos = piezas.filter(p => esPano(p.id));
  if (panos.length < 2 || !panos.every(p => p.formas.length === 1 && p.formas[0].w > rollo)) return null;
  const columnas: Array<{ ancho: number; alto: number; piezas: RectanguloCorte[] }> = [];
  for (const p of panos.sort((a,b) => b.formas[0].w - a.formas[0].w || b.formas[0].h - a.formas[0].h)) {
    const f = p.formas[0];
    let columna = columnas.filter(c => c.ancho === f.w && c.alto + f.h <= rollo)
      .sort((a,b) => b.alto - a.alto)[0];
    if (!columna) {
      columna = { ancho: f.w, alto: 0, piezas: [] };
      columnas.push(columna);
    }
    columna.piezas.push({ ...f, id: p.id, x: 0, y: columna.alto });
    columna.alto += f.h;
  }
  const puestas: RectanguloCorte[] = [];
  const franjas: Array<{x: number; w: number; y: number}> = [];
  let largo = 0;
  for (const c of columnas.sort((a,b) => a.alto - b.alto)) {
    franjas.push({x: largo, w: c.ancho, y: c.alto});
    puestas.push(...c.piezas.map(p => ({ ...p, x: largo })));
    largo += c.ancho;
  }
  const auxiliares = piezas.filter(p => !esPano(p.id)).sort((a,b) =>
    b.formas[0].w * b.formas[0].h - a.formas[0].w * a.formas[0].h);
  for (const p of auxiliares) {
    const libres = huecosLibres(puestas, largo, rollo);
    // Una partición del hueco global puede cruzar dos columnas y tapar un apoyo exacto.
    for (const c of franjas) {
      const y = Math.max(c.y, ...puestas.filter(q=>q.x < c.x+c.w && q.x+q.w > c.x).map(q=>q.y+q.h));
      if (y < rollo) libres.push({x:c.x,y,w:c.w,h:rollo-y});
    }
    const opciones = libres.flatMap(r => p.formas.filter(f => f.w <= r.w && f.h <= r.h)
      .map(f => ({ r, f, sobra: r.w * r.h - f.w * f.h }))).sort((a,b) => a.sobra - b.sobra);
    if (!opciones.length) return null;
    const { r, f } = opciones[0];
    puestas.push({ ...f, id: p.id, x: r.x, y: r.y });
  }
  return puestas;
}
