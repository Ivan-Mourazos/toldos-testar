import { calcBaqueton, type BaquetonInput } from "../calc/baqueton.ts";
import { calcLona, type LonaInput } from "../calc/lona.ts";
import type { CalcParams } from "../calc/params.ts";
import { nombreElementoPedido } from "../pedidos/agrupar-pedido.ts";
import { normalizarNumeroPedido } from "../pedidos/numero-pedido.ts";
import { errorPlanteamientoIncompleto } from "../pedidos/validar-planteamiento.ts";
import type { DatosHojaPedido, ElementoHoja, ElementoPedidoHoja } from "./tipos.ts";

// El pedido que manda la pantalla para la hoja de taller: se comprueba (mismo pedido, cada
// elemento completo), se ordena por versión (10, 11…) y se calcula aquí con los parámetros
// comunes, para que la hoja nunca imprima un resultado que no sale del cálculo.

export const MAX_ELEMENTOS_HOJA = 30;

/** Un error en lo que manda la pantalla: la ruta responde 400 con este mensaje. */
export class ErrorPedidoHoja extends Error {
  statusCode = 400;
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorPedidoHoja";
  }
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);

function leerElemento(valor: unknown, posicion: number): ElementoPedidoHoja {
  if (
    !esObjeto(valor) || (valor.tipo !== "lona" && valor.tipo !== "baqueton") || typeof valor.version !== "string"
    || !esObjeto(valor.input) || !esObjeto(valor.input.cabecera)
  ) {
    throw new ErrorPedidoHoja(`El elemento ${posicion + 1} del pedido no tiene el formato esperado.`);
  }
  const input = valor.input as unknown as LonaInput | BaquetonInput;
  if ((valor.tipo === "baqueton") !== ("baqueton" in input)) {
    throw new ErrorPedidoHoja(`${nombreElementoPedido(valor.version, valor.tipo)}: el tipo no cuadra con sus datos.`);
  }
  return { version: valor.version, tipo: valor.tipo, input };
}

const numeroVersion = (version: string) => {
  const numero = Number(version);
  return Number.isFinite(numero) ? numero : Number.MAX_SAFE_INTEGER;
};

export function prepararPedidoHoja(elementos: unknown, params: CalcParams): DatosHojaPedido {
  if (!Array.isArray(elementos) || elementos.length === 0) {
    throw new ErrorPedidoHoja("El pedido no tiene elementos para la hoja de taller.");
  }
  if (elementos.length > MAX_ELEMENTOS_HOJA) {
    throw new ErrorPedidoHoja(`Un pedido admite como mucho ${MAX_ELEMENTOS_HOJA} elementos en la hoja de taller.`);
  }
  const lista = elementos.map(leerElemento).sort((a, b) => numeroVersion(a.version) - numeroVersion(b.version));
  const pedidos = new Set(lista.map((e) => normalizarNumeroPedido(String(e.input.cabecera.numeroPedido ?? ""))));
  if (pedidos.has("")) throw new ErrorPedidoHoja("Falta el número de pedido.");
  if (pedidos.size > 1) throw new ErrorPedidoHoja("Todos los elementos de la hoja tienen que ser del mismo pedido.");
  if (new Set(lista.map((e) => e.version)).size !== lista.length) {
    throw new ErrorPedidoHoja("Hay dos elementos con la misma versión en el pedido.");
  }
  const calculados = lista.map((e): ElementoHoja => {
    const error = errorPlanteamientoIncompleto(e.input);
    if (error) throw new ErrorPedidoHoja(`${nombreElementoPedido(e.version, e.tipo)}: ${error}`);
    if (e.tipo === "lona") {
      const input = e.input as LonaInput;
      return { version: e.version, tipo: "lona", input, result: calcLona(input, params) };
    }
    const input = e.input as BaquetonInput;
    return { version: e.version, tipo: "baqueton", input, result: calcBaqueton(input, params) };
  });
  return { elementos: calculados, params };
}
