/** Medidas en mm, igual que el corte. Se exploran apoyos, no una rejilla de resolución arbitraria. */
export type FormaCorte = { w: number; h: number; girada: boolean };
export type RectanguloCorte = FormaCorte & { id: string; x: number; y: number };
export type PiezaCorte = { id: string; formas: FormaCorte[]; simetria?: string };
export type PresupuestoCorte = { restantes: number };
type Hueco = { x: number; y: number; w: number; h: number };
const EPS = .001;
const derecha = (r: Hueco) => r.x + r.w;
const arriba = (r: Hueco) => r.y + r.h;
const solapan = (a: Hueco, b: Hueco) => a.x < derecha(b) - EPS && b.x < derecha(a) - EPS
  && a.y < arriba(b) - EPS && b.y < arriba(a) - EPS;

/** Rectángulos libres máximos (pueden solaparse entre sí, nunca con una pieza). */
function huecosMaximos(ocupadas: Hueco[], largo: number, rollo: number): Hueco[] {
  let libres: Hueco[] = [{ x: 0, y: 0, w: largo, h: rollo }];
  for (const p of ocupadas) libres = restar(libres, p);
  return libres;
}

function restar(libres: Hueco[], p: Hueco): Hueco[] {
  const siguientes: Hueco[] = [];
  for (const h of libres) {
    if (!solapan(h, p)) { siguientes.push(h); continue; }
    if (p.x > h.x + EPS) siguientes.push({ ...h, w: p.x - h.x });
    if (derecha(p) < derecha(h) - EPS) siguientes.push({ ...h, x: derecha(p), w: derecha(h) - derecha(p) });
    if (p.y > h.y + EPS) siguientes.push({ ...h, h: p.y - h.y });
    if (arriba(p) < arriba(h) - EPS) siguientes.push({ ...h, y: arriba(p), h: arriba(h) - arriba(p) });
  }
  return siguientes.filter((a, i) => !siguientes.some((b, j) => i !== j && b.x <= a.x + EPS && b.y <= a.y + EPS
    && derecha(b) >= derecha(a) - EPS && arriba(b) >= arriba(a) - EPS
    && (j < i || b.w * b.h > a.w * a.h + EPS)));
}

/** Partición sin solapes, escogiendo primero el retal rectangular más grande. Sirve también para stock. */
export function huecosLibres(ocupadas: Hueco[], largo: number, rollo: number): Hueco[] {
  const resultado: Hueco[] = [];
  let libres = huecosMaximos(ocupadas, largo, rollo);
  while (libres.length) {
    libres.sort((a, b) => b.w * b.h - a.w * a.h || a.x - b.x || a.y - b.y || b.w - a.w);
    const h = libres[0];
    resultado.push(h);
    // Al reservarlo como ocupado, los siguientes huecos ya no pueden reutilizar esa lona.
    libres = restar(libres, h);
  }
  return resultado;
}

/**
 * Branch and bound: todos los órdenes, giros permitidos y cruces de bordes de piezas ya puestas.
 * Un anidado rectangular puede compactarse abajo/izquierda hasta esos apoyos sin empeorar largo ni ancho.
 * No se exige guillotina ni se limita a columnas. Los intentos (también los rechazados) consumen nodos;
 * el presupuesto se comparte entre TODOS los rollos y alternativas del pedido, nunca depende del reloj.
 * Al agotarlo se devuelve la mejor solución COMPLETA, empezando por la solución anterior de producción.
 */
export function buscarColocacion(
  piezas: PiezaCorte[], rollo: number, inicial: RectanguloCorte[], presupuesto: PresupuestoCorte,
  valida: (r: RectanguloCorte[]) => boolean = () => true,
  aprovechamiento: (huecos: Hueco[]) => number = () => 0,
): RectanguloCorte[] {
  if (!piezas.length || presupuesto.restantes <= 0) return inicial;
  let mejor = inicial;
  const limites = (rs: RectanguloCorte[]) => ({ largo: Math.max(0, ...rs.map(derecha)), ancho: Math.max(0, ...rs.map(arriba)) });
  let coste = limites(mejor);
  let retal = -1;
  let stock = -1;
  const area = piezas.reduce((s, p) => s + p.formas[0].w * p.formas[0].h, 0);
  const usadas = new Set<string>();
  const puestas: RectanguloCorte[] = [];
  const tipos = piezas.map(p => `${p.simetria ?? ''}:${p.formas.map(f => `${f.w},${f.h},${Number(f.girada)}`).join(';')}`);
  // Orden fijo de exploración; no se usa tiempo, azar ni orden de una respuesta externa.
  const indices = piezas.map((_, i) => i).sort((a, b) => piezas[b].formas[0].w * piezas[b].formas[0].h
    - piezas[a].formas[0].w * piezas[a].formas[0].h || a - b);
  const prioridad = new Map(indices.map((i, orden) => [i, orden]));
  const visitar = (largo: number, ancho: number) => {
    if (presupuesto.restantes <= 0) return;
    if (puestas.length === piezas.length) {
      if (!valida(puestas)) return;
      const mejora = largo < coste.largo - EPS || Math.abs(largo - coste.largo) < EPS && ancho < coste.ancho - EPS;
      if (!mejora && (Math.abs(largo - coste.largo) > EPS || Math.abs(ancho - coste.ancho) > EPS)) return;
      // Una mejora de los dos primeros objetivos ya gana a la anterior: no exige valorar retales.
      if (mejora) {
        mejor = puestas.map(p => ({ ...p }));
        coste = { largo, ancho };
        retal = -1; stock = -1;
        return;
      }
      // Valorar un retal exige restar cada pieza a los huecos: ese trabajo también gasta presupuesto.
      // Así los empates de un pedido grande no pueden multiplicar el coste fuera del límite de nodos.
      const trabajo = puestas.length * puestas.length;
      if (presupuesto.restantes < trabajo) { presupuesto.restantes = 0; return; }
      presupuesto.restantes -= trabajo;
      const sobrante = () => Math.max(0, ...huecosMaximos(puestas, largo, rollo).map(h => h.w * h.h));
      if (retal < 0) retal = Math.max(0, ...huecosMaximos(mejor, coste.largo, rollo).map(h => h.w * h.h));
      const nuevo = sobrante();
      if (nuevo < retal - EPS) return;
      if (Math.abs(nuevo - retal) < EPS) {
        if (stock < 0) stock = aprovechamiento(huecosLibres(mejor, coste.largo, rollo));
        const nuevoStock = aprovechamiento(huecosLibres(puestas, largo, rollo));
        if (nuevoStock <= stock + EPS) return; // A igualdad completa conserva el primero: desempate estable.
        stock = nuevoStock;
      } else stock = -1;
      retal = nuevo;
      mejor = puestas.map(p => ({ ...p }));
      coste = { largo, ancho };
      return;
    }
    // Cotas inferiores de superficie: con este largo no puede ocupar menos que área/largo.
    if (area > coste.largo * rollo + EPS) return;
    if (largo >= coste.largo - EPS && Math.max(ancho, area / coste.largo) > coste.ancho + EPS) return;
    const xs = [...new Set([0, ...puestas.map(derecha)])].sort((a, b) => a - b);
    const ys = [...new Set([0, ...puestas.map(arriba)])].sort((a, b) => a - b);
    const vistos = new Set<string>();
    const opciones: Array<{ i: number; r: RectanguloCorte; largo: number; ancho: number }> = [];
    for (const i of indices) {
      const p = piezas[i];
      if (usadas.has(p.id) || vistos.has(tipos[i])) continue;
      vistos.add(tipos[i]); // Piezas intercambiables: no repetir sus permutaciones geométricas.
      for (const f of p.formas) for (const x of xs) for (const y of ys) {
        if (presupuesto.restantes <= 0) return;
        presupuesto.restantes--;
        const l = Math.max(largo, x + f.w), a = Math.max(ancho, y + f.h);
        if (y + f.h > rollo + EPS || l > coste.largo + EPS || Math.abs(l - coste.largo) < EPS && a > coste.ancho + EPS) continue;
        const r = { ...f, id: p.id, x, y };
        if (puestas.some(q => solapan(r, q))) continue;
        opciones.push({ i, r, largo: l, ancho: a });
      }
    }
    // Primero las piezas grandes: una tira pequeña en el origen puede bloquear miles de ramas útiles.
    opciones.sort((a, b) => prioridad.get(a.i)! - prioridad.get(b.i)! || a.largo - b.largo || a.ancho - b.ancho
      || a.r.y - b.r.y || a.r.x - b.r.x || Number(a.r.girada) - Number(b.r.girada));
    for (const o of opciones) {
      if (presupuesto.restantes <= 0) return;
      if (o.largo > coste.largo + EPS || Math.abs(o.largo - coste.largo) < EPS && o.ancho > coste.ancho + EPS) continue;
      usadas.add(o.r.id); puestas.push(o.r);
      visitar(o.largo, o.ancho);
      puestas.pop(); usadas.delete(o.r.id);
    }
  };
  visitar(0, 0);
  return mejor;
}
