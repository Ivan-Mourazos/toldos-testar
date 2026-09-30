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

export function prepararPedidoHoja(elementos?: ElementoPedidoHoja[] | null, params?: CalcParams): DatosHojaPedido {
  if (!elementos || elementos.length === 0) {
    throw new ErrorPedidoHoja("El pedido no tiene elementos para la hoja de taller.");
  }

  if (elementos.length > MAX_ELEMENTOS_HOJA) {
    throw new ErrorPedidoHoja("Un pedido admite como mucho 30 elementos en la hoja de taller.");
  }

  // Validar que cada elemento tiene el formato esperado
  for (let i = 0; i < elementos.length; i++) {
    const e = elementos[i];
    if (!e || typeof e !== "object" || !("tipo" in e) || !("version" in e) || !("input" in e)) {
      throw new ErrorPedidoHoja(`El elemento ${i + 1} del pedido no tiene el formato esperado.`);
    }
    const input = e.input as Record<string, unknown>;
    if (!input || typeof input !== "object" || !("cabecera" in input)) {
      throw new ErrorPedidoHoja(`El elemento ${i + 1} del pedido no tiene el formato esperado.`);
    }
  }

  // Validar que el tipo cuadra con sus datos
  for (let i = 0; i < elementos.length; i++) {
    const e = elementos[i];
    const tieneFormadeLona = "altoDelante" in e.input;
    const tieneBaqueton = "baqueton" in e.input;

    if (e.tipo === "lona" && !tieneFormadeLona) {
      throw new ErrorPedidoHoja(`Lona ${i + 1}: el tipo no cuadra con sus datos.`);
    }
    if (e.tipo === "baqueton" && !tieneBaqueton) {
      throw new ErrorPedidoHoja(`Baquetón ${i + 1}: el tipo no cuadra con sus datos.`);
    }
  }

  // Validar que todos son del mismo pedido
  const numeroNormalizado = normalizarNumeroPedido((elementos[0].input as Record<string, unknown>).cabecera.numeroPedido as string);
  for (const e of elementos) {
    if (!e.input.cabecera.numeroPedido.trim()) {
      throw new ErrorPedidoHoja("Falta el número de pedido.");
    }
    if (normalizarNumeroPedido(e.input.cabecera.numeroPedido) !== numeroNormalizado) {
      throw new ErrorPedidoHoja("Todos los elementos de la hoja tienen que ser del mismo pedido.");
    }
  }

  // Validar que no hay versiones repetidas
  const versiones = new Set<string>();
  for (const e of elementos) {
    if (versiones.has(e.version)) {
      throw new ErrorPedidoHoja("Hay dos elementos con la misma versión en el pedido.");
    }
    versiones.add(e.version);
  }

  // Ordenar por versión (como números si son numéricos)
  const ordenados = [...elementos].sort((a, b) => {
    const numA = Number(a.version);
    const numB = Number(b.version);
    if (Number.isFinite(numA) && Number.isFinite(numB)) {
      return numA - numB;
    }
    return a.version.localeCompare(b.version);
  });

  // Validar completitud y calcular
  const elementosHoja: ElementoHoja[] = [];
  for (let i = 0; i < ordenados.length; i++) {
    const e = ordenados[i];
    const error = errorPlanteamientoIncompleto(e.input);
    if (error) {
      const nombre = nombreElementoPedido(e.version, e.tipo);
      throw new ErrorPedidoHoja(`${nombre}: ${error}`);
    }

    if (e.tipo === "lona") {
      const result = calcLona(e.input as LonaInput, params!);
      elementosHoja.push({
        version: e.version,
        tipo: "lona",
        input: e.input as LonaInput,
        result,
      });
    } else if (e.tipo === "baqueton") {
      const result = calcBaqueton(e.input as BaquetonInput, params!);
      elementosHoja.push({
        version: e.version,
        tipo: "baqueton",
        input: e.input as BaquetonInput,
        result,
      });
    }
  }

  return {
    elementos: elementosHoja,
    params: params!,
  };
}
