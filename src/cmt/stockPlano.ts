export type DeteccionStockPlano =
  | { aplica: false; motivo: 'web' | 'sin-pedido' }
  | { aplica: true; pedido: string; entrega: number | null; mlPropuesto: number | null };

export interface TelaPlano { codigo: string; descripcion: string; reservada: boolean; asignada?: boolean }
export interface OrdenStockPlano { of: string; telas: TelaPlano[] }
export interface PedidoStockPlano { cliente: string; ordenes: OrdenStockPlano[] }
export interface LonaPlano { codigo: string; descripcion: string; ml: number | null; ofs: string[] }

export const PEDIDO_PLANO = /^AR26\d{5}$/;
export const ERROR_STOCK_PLANO = 'No se pudo comprobar el stock de lona.';
const redondear = (n: number) => Math.round(n * 100) / 100;

export function propuestaLonasPlano(ordenes: OrdenStockPlano[], seleccionadas: string[], mlPropuesto: number | null): LonaPlano[] {
  const lonas = new Map<string, LonaPlano>();
  for (const of of seleccionadas) {
    const telas = ordenes.find(orden => orden.of === of)?.telas ?? [];
    const reservas = telas.filter(tela => tela.reservada);
    const asignadas = telas.filter(tela => tela.asignada ?? !tela.reservada);
    const candidatas = reservas.length === 1 ? reservas : asignadas.length ? asignadas : reservas;
    for (const { codigo, descripcion } of candidatas.length ? candidatas : [{ codigo: '', descripcion: '' }]) {
      const lona = lonas.get(codigo) ?? { codigo, descripcion, ml: null, ofs: [] };
      lona.ofs.push(of);
      lonas.set(codigo, lona);
    }
  }
  const filas = [...lonas.values()];
  if (!filas.length) return [{ codigo: '', descripcion: '', ml: null, ofs: seleccionadas }];
  if (filas.length === 1 && filas[0].codigo) filas[0].ml = mlPropuesto;
  return filas;
}

export function sumarLonasPlano(filas: { codigo: string; ml: number | null; ofs: string[] }[]) {
  const lonas = new Map<string, { codigo: string; ml: number; ofs: Set<string> }>();
  for (const { codigo, ml, ofs } of filas) {
    if (!codigo || ml === null) continue;
    const lona = lonas.get(codigo) ?? { codigo, ml: 0, ofs: new Set<string>() };
    lona.ml += ml;
    for (const of of ofs) lona.ofs.add(of);
    lonas.set(codigo, lona);
  }
  return [...lonas.values()].map(lona => ({ ...lona, ml: redondear(lona.ml), ofs: [...lona.ofs].sort() }));
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
