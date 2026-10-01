import type { ContenidoRemolques } from '../../borradores/tipos.ts';
import type { CalcParams } from '../../remolques/calc/params.ts';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import { cuerpoVistaPrevia } from './vistaPrevia';

// «Guardar para revisión» y abrir un pedido guardado en Remolques (fase 5).

export type ModoCarga = 'corregir' | 'reutilizar';

/** Lo que manda «Guardar para revisión»: los elementos (el servidor los calcula), los parámetros con que se ven y quién guarda. */
export function cuerpoGuardar(lineas: LineaPedido[], params: CalcParams, savedBy: string, confirmOverwrite: boolean) {
  return { ...cuerpoVistaPrevia(lineas), params, savedBy, confirmOverwrite };
}

/**
 * Las líneas de un pedido guardado para volver a la pantalla. «Corregir» lo deja tal cual: el autor
 * lo decide el servidor al guardar. «Reutilizar» es un pedido nuevo, como en toldos: lo hace quien
 * está («Soy»), sin revisor y con la fecha de hoy.
 */
export function lineasDesdePedidoGuardado(pedido: Pick<PedidoRemolques, 'elementos'>, modo: ModoCarga, usuario: string, hoy: string): LineaPedido[] {
  return pedido.elementos.map(({ version, tipo, input }) => ({
    version,
    tipo,
    input: modo === 'corregir'
      ? input
      : { ...input, cabecera: { ...input.cabecera, realizadoPor: usuario, revision: '', fecha: hoy } },
  }));
}

/** Lo que guarda «Guardar borrador» de Remolques: la cabecera, las líneas y, si se corregía, sus parámetros. */
export function contenidoBorradorRemolques(
  estado: { numeroPedido: string; cliente: string; fecha: string; lineas: LineaPedido[] },
  paramsGuardados: CalcParams | null,
): ContenidoRemolques {
  return {
    numeroPedido: estado.numeroPedido.trim(),
    cliente: estado.cliente,
    fecha: estado.fecha,
    lineas: estado.lineas,
    ...(paramsGuardados ? { paramsGuardados } : {}),
  };
}
