import type { ElementoPedidoHoja } from '../../remolques/hoja/tipos.ts';
import type { EstadoLinea, LineaPedido } from '../../remolques/workspace/lineas.ts';
import { rotuloElemento } from './rotulo';

/** Qué falta para poder ver la hoja de taller: solo sale con todos los elementos completos. */
export function faltaParaPdf(lineas: LineaPedido[], estados: Record<string, EstadoLinea>): string | null {
  if (lineas.length === 0) return 'Añade al menos un elemento.';
  const indice = lineas.findIndex((linea) => !estados[linea.version]?.lista);
  if (indice < 0) return null;
  const linea = lineas[indice];
  return `${rotuloElemento(linea, indice)}: ${estados[linea.version]?.falta ?? 'faltan datos.'}`;
}

/** Lo que necesita el servidor: el resultado lo calcula él con los parámetros comunes. */
export function cuerpoVistaPrevia(lineas: LineaPedido[]): { elementos: ElementoPedidoHoja[] } {
  return { elementos: lineas.map(({ version, tipo, input }) => ({ version, tipo, input })) };
}
