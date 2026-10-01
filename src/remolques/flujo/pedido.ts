import { awningLetter } from "../../domain/awningCompleteness.js";
import { normalizeOf } from "../../reviewRules.js";
import type { BaquetonInput } from "../calc/baqueton.ts";
import type { CabeceraInput, LonaInput } from "../calc/lona.ts";
import { nombrePerfil } from "../calc/params.ts";
import type { DatosHojaPedido, ElementoPedidoHoja } from "../hoja/tipos.ts";
import { normalizarNumeroPedido } from "../pedidos/numero-pedido.ts";
import { errorPlanteamientoIncompleto } from "../pedidos/validar-planteamiento.ts";
import { anioDelPlanteamiento } from "../salida/nombre-pdf.ts";
import type { TipoPlanteamiento } from "../store/types.ts";
import {
  ESQUEMA_PEDIDO_REMOLQUES, TIPO_PEDIDO_REMOLQUES,
  type ElementoGuardado, type FicheroGenerado, type PedidoRemolques, type ResumenElemento, type ResumenPedido,
  type ResumenPedidoRemolques,
} from "./tipos.ts";

// Reglas puras de un pedido de remolques (fase 5), sin Node ni disco: las usan el servidor y la
// web. Las de autoría, estados y CoordinaOT son las de toldos (src/reviewRules.js).

/** Un error del pedido que manda la pantalla o que se pide: la ruta responde con su código. */
export class ErrorPedidoRemolques extends Error {
  statusCode: number;
  constructor(mensaje: string, statusCode = 400) {
    super(mensaje);
    this.name = "ErrorPedidoRemolques";
    this.statusCode = statusCode;
  }
}

/** La clave del pedido: el número sin puntos ni espacios, en mayúsculas (AR.26.04286 → AR2604286). */
export function codigoPedido(numeroPedido: string): string {
  const codigo = normalizarNumeroPedido(String(numeroPedido ?? ""));
  if (!codigo) throw new ErrorPedidoRemolques("Falta el número de pedido.");
  return codigo.slice(0, 80);
}

/** El modelo de un elemento en Pedidos: el perfil de la lona («Recto con aguas») o «Baquetón». */
export function modeloElemento(elemento: { tipo: TipoPlanteamiento; input: LonaInput | BaquetonInput }): string {
  if (elemento.tipo === "baqueton") return "Baquetón";
  const perfil = (elemento.input as LonaInput).tipoPerfil;
  return perfil ? nombrePerfil(perfil) : "Remolque";
}

const ofDe = (elemento: { input: LonaInput | BaquetonInput }) => normalizeOf(elemento.input.cabecera.ordenFabricacion ?? "");
const unicos = (valores: string[]) => [...new Set(valores.filter(Boolean))];

/** Las letras y OF que se preguntan a CoordinaOT, en el orden del pedido (A, B…), como los toldos. */
export function elementosAprobacion(pedido: Pick<PedidoRemolques, "elementos">): { letter: string; of: string }[] {
  return pedido.elementos.map((elemento, indice) => ({ letter: awningLetter(indice), of: ofDe(elemento) }));
}

export function resumenElementos(elementos: ElementoGuardado[]): ResumenElemento[] {
  return elementos.map((elemento, indice) => {
    const falta = errorPlanteamientoIncompleto(elemento.input);
    return {
      letter: awningLetter(indice),
      model: modeloElemento(elemento),
      of: ofDe(elemento),
      state: falta ? "error" : "ok",
      notes: falta ? [falta] : [],
    };
  });
}

export function resumenPedido(elementos: ElementoGuardado[], autoria: { technician: string; reviewer: string }): ResumenPedido {
  const cabeceras = elementos.map((elemento) => elemento.input.cabecera);
  return {
    customer: cabeceras.map((cabecera) => cabecera.cliente.trim()).find(Boolean) ?? "",
    orderDate: cabeceras[0]?.fecha ?? "",
    technician: autoria.technician,
    reviewer: autoria.reviewer,
    awnings: elementos.length,
    ofs: unicos(elementos.map(ofDe)),
    models: unicos(elementos.map(modeloElemento)),
    diagnostics: 0,
  };
}

const conCabecera = (elemento: ElementoGuardado, cambios: Partial<CabeceraInput>): ElementoGuardado => ({
  ...elemento,
  input: { ...elemento.input, cabecera: { ...elemento.input.cabecera, ...cambios } },
});

/**
 * El pedido que se guarda para revisión. `datos` sale de prepararPedidoHoja (completo, ordenado y
 * calculado); `autoria`, de reviewAuthorship. El autor queda como «Realizado por» de cada elemento.
 */
export function crearPedidoRemolques({ datos, autoria, existente, ahora }: {
  datos: DatosHojaPedido;
  autoria: { technician: string; reviewer: string };
  existente: PedidoRemolques | null;
  ahora: string;
}): PedidoRemolques {
  const numeroPedido = datos.elementos[0].input.cabecera.numeroPedido.trim();
  const elementos = datos.elementos.map((e) => conCabecera(
    { version: e.version, tipo: e.tipo, input: e.input, result: e.result, paramsSnapshot: datos.params },
    { realizadoPor: autoria.technician },
  ));
  return {
    schemaVersion: ESQUEMA_PEDIDO_REMOLQUES,
    kind: TIPO_PEDIDO_REMOLQUES,
    orderCode: codigoPedido(numeroPedido),
    numeroPedido,
    status: "PENDING_REVIEW",
    createdAt: existente?.createdAt ?? ahora,
    updatedAt: ahora,
    createdBy: existente?.createdBy || autoria.technician,
    reviewedAt: null,
    reviewedBy: "",
    reviewNote: "",
    production: null,
    summary: resumenPedido(elementos, autoria),
    params: datos.params,
    elementos,
  };
}

/** Generado: PRODUCED, con sus dos PDF y el revisor de CoordinaOT en el pedido y en cada elemento. */
export function marcarPedidoGenerado(pedido: PedidoRemolques, { revisor, ficheros, ahora }: {
  revisor: string;
  ficheros: FicheroGenerado[];
  ahora: string;
}): PedidoRemolques {
  return {
    ...pedido,
    status: "PRODUCED",
    updatedAt: ahora,
    reviewedAt: revisor ? ahora : pedido.reviewedAt,
    reviewedBy: revisor || pedido.reviewedBy,
    summary: { ...pedido.summary, reviewer: revisor || pedido.summary.reviewer },
    elementos: revisor ? pedido.elementos.map((elemento) => conCabecera(elemento, { revision: revisor })) : pedido.elementos,
    production: { createdAt: ahora, createdBy: pedido.summary.technician || pedido.createdBy, files: ficheros },
  };
}

/** Lo que lista Pedidos: sin elementos ni parámetros y con el estado de cada elemento. */
export function resumenBandeja(pedido: PedidoRemolques): ResumenPedidoRemolques {
  const copia: Partial<PedidoRemolques> = { ...pedido };
  delete copia.elementos;
  delete copia.params;
  return { ...(copia as ResumenPedidoRemolques), summary: { ...pedido.summary, awningList: resumenElementos(pedido.elementos) } };
}

/** El año del pedido para Pedidos y «Generados»: las dos cifras tras «AR» o, si no, el de su fecha. */
export function anioPedido(pedido: Pick<PedidoRemolques, "numeroPedido" | "summary" | "createdAt">): number {
  return anioDelPlanteamiento(pedido.numeroPedido, pedido.summary.orderDate || pedido.createdAt.slice(0, 10));
}

/** Los elementos como los pide la hoja de taller: sin resultado, que lo recalcula el servidor. */
export function elementosPedidoHoja(pedido: Pick<PedidoRemolques, "elementos">): ElementoPedidoHoja[] {
  return pedido.elementos.map(({ version, tipo, input }) => ({ version, tipo, input }));
}
