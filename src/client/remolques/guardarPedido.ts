import type { ContenidoRemolques } from '../../borradores/tipos.ts';
import type { CalcParams } from '../../remolques/calc/params.ts';
import type { ClienteRpsPedido, PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import { normalizarNumeroPedido } from '../../remolques/pedidos/numero-pedido.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import { cuerpoVistaPrevia } from './vistaPrevia';

// «Guardar para revisión» y abrir un pedido guardado en Remolques (fase 5).

export type ModoCarga = 'corregir' | 'reutilizar';

/**
 * El cliente de RPS del pedido, sacado de las líneas que se trajeron de RPS (02/10/2026): con su
 * código el buscador no falla. Solo cuentan las traídas de este mismo pedido. Todas las de un pedido
 * tienen el mismo cliente; si no, se queda el primero y se apunta.
 */
export function clienteRpsDeLineas(
  lineas: LineaPedido[],
  avisar: (mensaje: string) => void = (mensaje) => console.warn(mensaje),
): ClienteRpsPedido | null {
  const clientes = lineas
    .filter((linea) => linea.origenRps?.cliente?.codigo?.trim()
      && normalizarNumeroPedido(linea.origenRps.numeroPedido ?? '') === normalizarNumeroPedido(linea.input.cabecera.numeroPedido ?? ''))
    .map((linea) => linea.origenRps!.cliente!);
  if (clientes.length === 0) return null;
  const [primero] = clientes;
  const otros = [...new Set(clientes.map((c) => c.codigo.trim()).filter((codigo) => codigo !== primero.codigo.trim()))];
  if (otros.length) avisar(`Las líneas del pedido traen clientes de RPS distintos (${[primero.codigo.trim(), ...otros].join(', ')}): se guarda el ${primero.codigo.trim()}.`);
  return { codigo: primero.codigo.trim(), nombre: primero.nombre.trim() };
}

/**
 * Lo que manda «Guardar para revisión»: los elementos (el servidor los calcula), los parámetros con
 * que se ven, quién guarda y, si los elementos vienen de RPS, el cliente de RPS.
 */
export function cuerpoGuardar(lineas: LineaPedido[], params: CalcParams, savedBy: string, confirmOverwrite: boolean) {
  const clienteRps = clienteRpsDeLineas(lineas);
  return { ...cuerpoVistaPrevia(lineas), params, savedBy, confirmOverwrite, ...(clienteRps ? { clienteRps } : {}) };
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
