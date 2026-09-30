import casos from '../../remolques/__fixtures__/produccion-2026-09.json';
import { DEFAULT_PARAMS } from '../../remolques/calc/params.ts';
import { muestrasHoja, NOMBRES_MUESTRAS, type CasoFixture, type NombreMuestra } from '../../remolques/hoja/muestras.ts';
import { prepararPedidoHoja } from '../../remolques/hoja/pedido.ts';
import type { DatosHojaPedido } from '../../remolques/hoja/tipos.ts';

/** `hoja-remolques.html?muestra=varios` en desarrollo: la hoja sin pasar por el servidor. */
export function datosMuestra(nombre: string): DatosHojaPedido {
  if (!NOMBRES_MUESTRAS.includes(nombre as NombreMuestra)) {
    throw new Error(`No hay muestra «${nombre}». Hay: ${NOMBRES_MUESTRAS.join(', ')}.`);
  }
  return prepararPedidoHoja(muestrasHoja(casos as CasoFixture[])[nombre as NombreMuestra], DEFAULT_PARAMS);
}
