import { limpiarObservaciones } from '../../remolques/hoja/observaciones.ts';
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

/** Lo que necesita el servidor: el resultado lo calcula él con los parámetros comunes. Las
 *  observaciones van sin las líneas vacías que dejó «Añadir línea». */
export function cuerpoVistaPrevia(lineas: LineaPedido[]): { elementos: ElementoPedidoHoja[] } {
  return {
    elementos: lineas.map(({ version, tipo, input }) => ({
      version, tipo, input: { ...input, observaciones: limpiarObservaciones(input.observaciones) },
    })),
  };
}

/**
 * Guarda de peticiones de la vista previa: solo la última petición vigente puede abrir el visor.
 * Se invalida al cerrar, al desmontar y al cambiar el pedido mientras la hoja se prepara.
 */
export function crearGuardaPeticion() {
  let actual = 0;
  let abortador: AbortController | null = null;
  return {
    /** Empieza una petición: anula la anterior y devuelve su señal y su número. */
    nueva() {
      abortador?.abort();
      abortador = new AbortController();
      actual += 1;
      return { numero: actual, senal: abortador.signal };
    },
    vigente(numero: number): boolean {
      return numero === actual;
    },
    /** Descarta lo que esté en vuelo (cerrar, desmontar, cambiar de pedido). */
    invalidar() {
      abortador?.abort();
      abortador = null;
      actual += 1;
    },
  };
}
