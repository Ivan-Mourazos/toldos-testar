import { bloqueCanalon } from './canalon.js';
import { compararOperaciones, operacionesEnPano } from './comparar.js';

/** Busca un combinado completo por sus cortes, sin deducir cantidades de los bloques del original. */
export function contrastarCanalon(modelo, canalon) {
  if (!canalon) return { coincide: false, motivo: 'Sin juego en la plantilla.' };
  const b = bloqueCanalon(canalon, 'combinado');
  const caida = canalon.caida ?? 50, tolerancia = 1;
  const esperado = b.lineas.map(l => ({ tipo: 'raya', capa: l.capa, a: [l.x1, l.y1], b: [l.x2, l.y2] }));
  const semillas = modelo.filter(p => !p.deCota && p.tipo === 'raya' && p.capa === 'DISCO1' && !p.curva &&
    Math.abs(Math.abs(p.a[0] - p.b[0]) - canalon.mitad) <= tolerancia &&
    Math.abs(Math.abs(p.a[1] - p.b[1]) - caida) <= tolerancia)
    .map(p => p.a[0] < p.b[0] ? p : { ...p, a: p.b, b: p.a }).filter(p => p.b[1] > p.a[1]);
  let mejor = null;
  for (const p of semillas) {
    const caja = { x0: p.a[0], y0: p.a[1], x1: p.a[0] + b.largoMm, y1: p.a[1] + b.altoMm };
    const operaciones = operacionesEnPano(modelo, caja, [], { conBordes: true });
    const comparacion = compararOperaciones(esperado, operaciones);
    if (comparacion.coincide) return { ...comparacion, caja };
    if (comparacion.desviacionMm !== null && (!mejor || comparacion.desviacionMm < mejor.desviacionMm)) mejor = comparacion;
  }
  return { coincide: false, motivo: 'No se encuentra un combinado completo igual, tramo a tramo y por herramienta.',
    desviacionMm: mejor?.desviacionMm ?? null };
}
