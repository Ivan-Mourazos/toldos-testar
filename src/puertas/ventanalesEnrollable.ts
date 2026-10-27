import type { Puerta } from './tipos.ts';

/** Cotas desde cabecera: donde no hay E.T. se mide al borde del paño, donde la hay a su eje.
 * El cristal y los cachos solapan 2 cm con ese paño; la E.T. conserva 7,5 cm de dibujo y 8 de corte.
 */
export function ventanalesEnrollable(p: Puerta) {
  const e = p.enrollable, vs = [{ D: e.D, margen: e.margen }, ...e.ventanales ?? []];
  let desde = e.T;
  return vs.map((v, i) => {
    const hasta = desde + v.D, etArriba = !(i === 0 && e.sinEtArriba), etAbajo = !(i === vs.length - 1 && e.sinEtAbajo);
    const visibleDesde = desde + (etArriba ? 3.75 : 0);
    const ventana = { ...v, desde, hasta, etArriba, etAbajo,
      corteDesde: desde + (etArriba ? 1.75 : -2), corteHasta: hasta + (etAbajo ? -1.75 : 2),
      altoCorte: v.D - 3.5 + (etArriba ? 0 : 3.75) + (etAbajo ? 0 : 3.75),
      visibleDesde, altoVisible: v.D - (etArriba ? 3.75 : 0) - (etAbajo ? 3.75 : 0) };
    desde = hasta;
    return ventana;
  });
}
