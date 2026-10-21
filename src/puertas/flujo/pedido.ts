import { awningLetter } from "../../domain/awningCompleteness.js";
import { normalizeOf } from "../../reviewRules.js";
import { codigoPedido, ErrorPedidoRemolques, validarClienteRps } from "../../remolques/flujo/pedido.ts";
import type { ResumenElemento, ResumenPedido } from "../../remolques/flujo/tipos.ts";
import { anioDelPlanteamiento } from "../../remolques/salida/nombre-pdf.ts";
import { calcularPuerta, MODELOS_PUERTAS } from "../calcular.ts";
import type { PedidoPuertas, Puerta } from "../tipos.ts";
import {
  TIPO_PEDIDO_PUERTAS,
  type CabeceraPuertas, type FicheroPlanoPuertas, type PedidoPuertasGuardado, type ResumenPedidoPuertas,
} from "./tipos.ts";

// Reglas puras de un pedido de puertas guardado (fase 2), sin Node ni disco: las usan el servidor y la
// web. Las de autoría, estados y CoordinaOT son las de toldos (src/reviewRules.js), como en remolques.

const OF_PROVISIONAL = "SIN OF";
export const PUERTA_NOUNS = { one: "puerta", many: "puertas", none: "El pedido no tiene puertas." };
const ofDe = (puerta: Puerta) => normalizeOf(puerta.of ?? "");
const unicos = (valores: string[]) => [...new Set(valores.filter(Boolean))];
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Las letras y OF que se preguntan a CoordinaOT, en el orden del pedido (A, B…). */
export function elementosAprobacion(pedido: Pick<PedidoPuertas, "elementos">): { letter: string; of: string }[] {
  return pedido.elementos.map((elemento, indice) => ({ letter: awningLetter(indice), of: ofDe(elemento.input) }));
}

/** Las puertas sin OF (o con la provisional): solo sirven para la vista previa. */
export function puertasSinOf(pedido: Pick<PedidoPuertas, "elementos">): string[] {
  return elementosAprobacion(pedido).filter(({ of }) => !of || of.toUpperCase() === OF_PROVISIONAL).map(({ letter }) => letter);
}

export function exigirOfsPuertas(pedido: Pick<PedidoPuertas, "elementos">) {
  const sinOf = puertasSinOf(pedido);
  if (sinOf.length) {
    throw new ErrorPedidoRemolques(`Falta la OF de la puerta ${sinOf.join(", ")}: escríbela antes de guardar, descargar o enviar el corte.`, 409);
  }
}

/** La cabecera que manda la pantalla, comprobada. Sin fecha vale la de hoy. */
export function validarCabeceraPuertas(bruto: unknown, hoy: string): CabeceraPuertas {
  const c = (bruto ?? {}) as { cliente?: unknown; fecha?: unknown; clienteRps?: unknown };
  if (typeof bruto !== "object" || Array.isArray(bruto) || (c.cliente !== undefined && typeof c.cliente !== "string")
    || (c.fecha !== undefined && c.fecha !== "" && (typeof c.fecha !== "string" || !FECHA.test(c.fecha)))) {
    throw new ErrorPedidoRemolques("Revisa el cliente y la fecha del pedido de puertas.");
  }
  const clienteRps = validarClienteRps(c.clienteRps);
  return {
    cliente: (c.cliente ?? "").trim().slice(0, 200),
    fecha: typeof c.fecha === "string" && c.fecha ? c.fecha : hoy,
    ...(clienteRps ? { clienteRps } : {}),
  };
}

export function resumenElementos(pedido: Pick<PedidoPuertas, "elementos">): ResumenElemento[] {
  return pedido.elementos.map(({ input }, indice) => {
    const errores = calcularPuerta(input).avisos.filter((aviso) => aviso.nivel === "error").map((aviso) => aviso.texto);
    return { letter: awningLetter(indice), model: MODELOS_PUERTAS[input.modelo], of: ofDe(input), state: errores.length ? "error" : "ok", notes: errores };
  });
}

export function resumenPedido(pedido: Pick<PedidoPuertas, "elementos">, cabecera: CabeceraPuertas,
  autoria: { technician: string; reviewer: string }): ResumenPedido {
  return {
    customer: cabecera.cliente || cabecera.clienteRps?.nombre || "",
    orderDate: cabecera.fecha,
    technician: autoria.technician,
    reviewer: autoria.reviewer,
    awnings: pedido.elementos.length,
    ofs: unicos(pedido.elementos.map((e) => ofDe(e.input))),
    models: unicos(pedido.elementos.map((e) => MODELOS_PUERTAS[e.input.modelo])),
    diagnostics: 0,
  };
}

/** El pedido que se guarda para revisión, a partir del que manda la pantalla (ya validado). */
export function crearPedidoPuertas({ pedido, cabecera, autoria, existente, ahora }: {
  pedido: PedidoPuertas;
  cabecera: CabeceraPuertas;
  autoria: { technician: string; reviewer: string };
  existente: PedidoPuertasGuardado | null;
  ahora: string;
}): PedidoPuertasGuardado {
  const numeroPedido = pedido.orderCode.trim();
  // «Corregir» no trae el cliente de RPS: se queda el que tenía.
  const conCliente = cabecera.clienteRps || !existente?.cabecera.clienteRps ? cabecera : { ...cabecera, clienteRps: existente.cabecera.clienteRps };
  return {
    schemaVersion: 1,
    kind: TIPO_PEDIDO_PUERTAS,
    orderCode: codigoPedido(numeroPedido),
    numeroPedido,
    cabecera: conCliente,
    status: "PENDING_REVIEW",
    createdAt: existente?.createdAt ?? ahora,
    updatedAt: ahora,
    createdBy: existente?.createdBy || autoria.technician,
    reviewedAt: null,
    reviewedBy: "",
    reviewNote: "",
    production: null,
    enviosCorte: structuredClone(existente?.enviosCorte ?? []),
    summary: resumenPedido(pedido, conCliente, autoria),
    elementos: pedido.elementos.map(({ id, input }) => ({ id, input })),
  };
}

/** Generado: PRODUCED, con su plano y el revisor de CoordinaOT (si no da ninguno, no se nombra a nadie). */
export function marcarPedidoGenerado(pedido: PedidoPuertasGuardado, { revisor, ficheros, ahora }: {
  revisor: string;
  ficheros: FicheroPlanoPuertas[];
  ahora: string;
}): PedidoPuertasGuardado {
  return {
    ...pedido,
    status: "PRODUCED",
    updatedAt: ahora,
    reviewedAt: revisor ? ahora : null,
    reviewedBy: revisor,
    summary: { ...pedido.summary, reviewer: revisor },
    production: { createdAt: ahora, createdBy: pedido.summary.technician || pedido.createdBy, files: ficheros },
  };
}

/** Lo que lista Pedidos: sin las puertas y con el estado de cada una. */
export function resumenBandeja(pedido: PedidoPuertasGuardado): ResumenPedidoPuertas {
  const copia: Partial<PedidoPuertasGuardado> = { ...pedido };
  delete copia.elementos;
  return { ...(copia as ResumenPedidoPuertas), summary: { ...pedido.summary, awningList: resumenElementos(pedido) } };
}

/** El año del pedido para Pedidos: las dos cifras tras «AR» o, si no, el de su fecha. */
export function anioPedido(pedido: Pick<PedidoPuertasGuardado, "numeroPedido" | "summary" | "createdAt">): number {
  return anioDelPlanteamiento(pedido.numeroPedido, pedido.summary.orderDate || pedido.createdAt.slice(0, 10));
}

/** Para volver a la pantalla («Corregir» o «Reutilizar datos»): el documento del configurador. */
export function pedidoParaEditar(pedido: PedidoPuertasGuardado): PedidoPuertas & { cabecera: CabeceraPuertas } {
  return { schemaVersion: 1, kind: TIPO_PEDIDO_PUERTAS, orderCode: pedido.numeroPedido, cabecera: pedido.cabecera,
    elementos: structuredClone(pedido.elementos) };
}
