import type { Puerta } from './tipos.ts';

export const SOLAPE_VENTANAL = 2;
export const EXTRA_CACHO_VENTANAL = 1;
export const anchoCristalVentanal = (frente: number, margen: number): number => margen === 0 ? frente : frente - 2 * margen + 2 * SOLAPE_VENTANAL;

/** El borde del paño cubre su E.T. hasta el lado que da al cristal. */
export function bordesVentanal(desde: number, hasta: number, semibandaInicial: number, semibandaFinal: number) {
  const visibleDesde = desde + semibandaInicial, visibleHasta = hasta - semibandaFinal;
  return {
    visibleDesde, visibleHasta, altoVisible: visibleHasta - visibleDesde,
    corteDesde: visibleDesde - SOLAPE_VENTANAL, corteHasta: visibleHasta + SOLAPE_VENTANAL,
  };
}

export const semianchoEtVentanal = (p: Puerta) => p.tgm?.ventanal ? p.tgm.anchoEt / 2 : 3.75;

export const NOTA_CACHOS_CRISTAL = 'LOS CACHOS DE LOS LATERALES DEL CRISTAL VAN 1 CM MÁS GRANDE PARA DESPUÉS ESCUADRARLO';
/** La nota del plano de una enrollable: la que escriba el técnico; si no ha escrito nada, la de los cachos, de serie
 * con ventanal (Iván, 06/11/2026). Borrarla en el formulario la quita del plano. */
export const notaPlanoEnrollable = (p: Puerta): string =>
  p.notaPlano !== undefined ? p.notaPlano.trim() : panoContinuoEnrollable(p) || ventanalesEnrollable(p).every(v => v.margen === 0) ? '' : NOTA_CACHOS_CRISTAL;

/** Tanto la ciega como la de ventanas pequeñas conservan la lona entre las E.T. */
export const panoContinuoEnrollable = (p: Puerta): boolean => Boolean(p.enrollable.sinVentanal || p.enrollable.ventanasPequenas);

/** Cotas desde cabecera: donde no hay E.T. se mide al borde del paño, donde la hay a su eje.
 * El cristal y los cachos solapan 2 cm con ese paño. En Portanova la E.T. se dibuja de 7,5 cm y se corta de 8.
 */
export function ventanalesEnrollable(p: Puerta) {
  const e = p.enrollable;
  // Puerta ciega: sin ventanales (ni cristal, ni cachos, ni paños partidos por ellos).
  if (panoContinuoEnrollable(p)) return [];
  const vs = [{ D: e.D, margen: e.margen }, ...e.ventanales ?? []];
  const mitadEt = semianchoEtVentanal(p);
  let desde = e.T;
  return vs.map((v, i) => {
    const hasta = desde + v.D, etArriba = !(i === 0 && e.sinEtArriba), etAbajo = !(i === vs.length - 1 && e.sinEtAbajo);
    const b = bordesVentanal(desde, hasta, etArriba ? mitadEt : 0, etAbajo ? mitadEt : 0);
    const altoVisible = v.D - (etArriba ? mitadEt : 0) - (etAbajo ? mitadEt : 0);
    const ventana = { ...v, desde, hasta, etArriba, etAbajo,
      corteDesde: b.corteDesde, corteHasta: b.corteHasta,
      altoCorte: v.D - (2 * mitadEt - 2 * SOLAPE_VENTANAL) + (etArriba ? 0 : mitadEt) + (etAbajo ? 0 : mitadEt),
      visibleDesde: b.visibleDesde, altoVisible };
    desde = hasta;
    return ventana;
  });
}
