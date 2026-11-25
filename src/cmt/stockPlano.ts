/** Trozo de lona del corte: lo que mide a lo largo (cota o caja), el ancho que ocupa y lo que pone escrito. */
export interface TramoStockPlano { largoM: number; altoCm: number; textos: string[] }
export type DeteccionStockPlano =
  | { aplica: false; motivo: 'web' | 'sin-pedido' }
  | { aplica: true; pedido: string; tramos: TramoStockPlano[] };

export interface TelaPlano { codigo: string; descripcion: string; reservada: boolean; asignada?: boolean }
export interface OrdenStockPlano { of: string; telas: TelaPlano[] }
export interface PedidoStockPlano { cliente: string; ordenes: OrdenStockPlano[] }
/** Lo que el servidor propone para el aviso: lonas leídas del plano con sus ML y las OF del pedido. */
export interface PropuestaStockPlano { cliente: string; ofs: string[]; lonas: LonaPropuesta[] }
export interface LonaPropuesta { codigo: string; descripcion: string; ml: number }

export const PEDIDO_PLANO = /^AR\d{7}$/;
export const ERROR_STOCK_PLANO = 'No se pudo comprobar el stock de lona.';
const redondear = (n: number) => Math.round(n * 100) / 100;

/** Junta las filas de la misma lona sumando sus ML (las filas sin lona o sin metros no cuentan). */
export function sumarLonasPlano<T extends { codigo: string; ml: number | null }>(filas: T[]): (T & { ml: number })[] {
  const lonas = new Map<string, T & { ml: number }>();
  for (const fila of filas) {
    if (!fila.codigo || fila.ml === null) continue;
    const lona = lonas.get(fila.codigo);
    if (lona) lona.ml += fila.ml;
    else lonas.set(fila.codigo, { ...fila, ml: fila.ml });
  }
  return [...lonas.values()].map(lona => ({ ...lona, ml: redondear(lona.ml) }));
}

export function cuentaStockPlano({ metros = 0, reservado = 0, reservadoPropio = 0 }: {
  metros?: number; reservado?: number; reservadoPropio?: number;
}) {
  const stockDecimas = Math.round(metros * 10);
  const reservaDecimas = Math.round(reservado * 10);
  return {
    stock: stockDecimas / 10,
    reservado: reservaDecimas / 10,
    disponible: (stockDecimas - reservaDecimas) / 10,
    reservadoPropio: Math.round(reservadoPropio * 10) / 10,
  };
}
