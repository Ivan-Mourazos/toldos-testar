import { validarParams } from "../remolques/calc/validar-params.ts";
import { modeloElemento } from "../remolques/flujo/pedido.ts";
import { normalizarNumeroPedido } from "../remolques/pedidos/numero-pedido.ts";
import type { LineaPedido } from "../remolques/workspace/lineas.ts";
import {
  ESQUEMA_BORRADOR, TIPOS_BORRADOR,
  type Borrador, type BorradorToldos, type ContenidoRemolques, type ContenidoToldos, type ResumenBorrador, type ResumenContenido,
  type TipoBorrador,
} from "./tipos.ts";

// Reglas puras de los borradores (diseño 01/10/2026), sin Node ni disco: las usan el servidor y la web.

/** Un error del borrador que se manda o se pide: la ruta responde con su código. */
export class ErrorBorrador extends Error {
  statusCode: number;
  constructor(mensaje: string, statusCode = 400) {
    super(mensaje);
    this.name = "ErrorBorrador";
    this.statusCode = statusCode;
  }
}

export const MENSAJE_SIN_NUMERO = "Falta el número de pedido: sin número no hay borrador.";
export const MENSAJE_SIN_AUTOR = "Elige quién eres en «Soy» antes de guardar el borrador.";
export const MENSAJE_YA_EN_PEDIDOS = "Este pedido ya está en Pedidos: ábrelo y usa «Corregir».";
export const MENSAJE_OCUPADO = "Se está guardando o descartando este borrador: vuelve a intentarlo en un momento.";
export const MENSAJE_OTRO_NUMERO = "El número del borrador no coincide con el de la dirección.";
export const MENSAJE_NO_HAY = "No hay borrador de este pedido.";
export const SIN_CARPETA_BORRADORES = "Falta la carpeta de borradores en Configuración (paso 08): no se pueden guardar borradores.";
const MENSAJE_TIPO = "El borrador tiene que ser de toldos o de remolques.";
const MENSAJE_FORMA_TOLDOS = "El borrador de toldos no tiene la forma del formulario.";
const MENSAJE_FORMA_REMOLQUES = "El borrador de remolques no tiene la forma de la pantalla.";

export const mensajeOtroTipo = (orderCode: string, kind: TipoBorrador) =>
  `${orderCode} ya tiene un borrador de ${kind}: un pedido es de toldos o de remolques. Ábrelo desde Pedidos o revisa el número.`;

/** La clave del borrador: el número sin puntos ni espacios, en mayúsculas (AR.26.04286 → AR2604286). */
export function codigoBorrador(numeroPedido: unknown): string {
  const codigo = normalizarNumeroPedido(String(numeroPedido ?? ""));
  if (!codigo) throw new ErrorBorrador(MENSAJE_SIN_NUMERO);
  return codigo.slice(0, 80);
}

const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === "object" && valor !== null && !Array.isArray(valor);
const texto = (valor: unknown) => (typeof valor === "string" ? valor : "");
const unicos = (valores: string[]) => [...new Set(valores.filter(Boolean))];
const pareceLinea = (valor: unknown): valor is LineaPedido =>
  esObjeto(valor) && typeof valor.version === "string" && (valor.tipo === "lona" || valor.tipo === "baqueton")
  && esObjeto(valor.input) && esObjeto(valor.input.cabecera);

/** El contenido que manda la pantalla, comprobado: su tipo, su número tal como se escribió y lo que se guarda. */
export type ContenidoLeido =
  | { kind: "toldos"; numeroPedido: string; contenido: ContenidoToldos }
  | { kind: "remolques"; numeroPedido: string; contenido: ContenidoRemolques };

/** Solo se comprueba la forma: un borrador puede estar a medias. */
export function leerContenido(kind: unknown, contenido: unknown): ContenidoLeido {
  if (!TIPOS_BORRADOR.includes(kind as TipoBorrador)) throw new ErrorBorrador(MENSAJE_TIPO);
  if (kind === "toldos") {
    const order = esObjeto(contenido) ? contenido.order : null;
    if (!esObjeto(order) || typeof order.orderCode !== "string" || !Array.isArray(order.awnings)) {
      throw new ErrorBorrador(MENSAJE_FORMA_TOLDOS);
    }
    return { kind: "toldos", numeroPedido: String(order.orderCode).trim(), contenido: { order: order as ContenidoToldos["order"] } };
  }
  if (!esObjeto(contenido) || typeof contenido.numeroPedido !== "string" || !Array.isArray(contenido.lineas)) {
    throw new ErrorBorrador(MENSAJE_FORMA_REMOLQUES);
  }
  const lineas: unknown[] = contenido.lineas;
  if (!lineas.every(pareceLinea)) throw new ErrorBorrador(MENSAJE_FORMA_REMOLQUES);
  const leido: ContenidoRemolques = {
    numeroPedido: String(contenido.numeroPedido).trim(),
    cliente: texto(contenido.cliente),
    fecha: texto(contenido.fecha),
    lineas,
  };
  if (contenido.paramsGuardados != null) {
    const params = validarParams(contenido.paramsGuardados);
    if (!params.ok) throw new ErrorBorrador(`Los parámetros guardados del borrador no son válidos: ${params.errores.join("; ")}.`);
    leido.paramsGuardados = params.params;
  }
  return { kind: "remolques", numeroPedido: leido.numeroPedido, contenido: leido };
}

type ConContenido =
  | { kind: "toldos"; contenido: ContenidoToldos }
  | { kind: "remolques"; contenido: ContenidoRemolques };

export function resumenContenido(borrador: ConContenido): ResumenContenido {
  if (borrador.kind === "toldos") {
    const { order } = borrador.contenido;
    return {
      customer: texto(order.customer).trim(),
      orderDate: texto(order.orderDate),
      elementos: order.awnings.length,
      models: unicos(order.awnings.map((awning) => (esObjeto(awning) ? texto(awning.model) : ""))),
    };
  }
  const { cliente, fecha, lineas } = borrador.contenido;
  return {
    customer: cliente.trim() || (lineas.map((linea) => texto(linea.input.cabecera.cliente).trim()).find(Boolean) ?? ""),
    orderDate: fecha,
    elementos: lineas.length,
    models: unicos(lineas.map(modeloElemento)),
  };
}

/** El borrador que se guarda. Al sustituir uno, conserva cuándo se creó; quién lo guardó es el último. */
export function crearBorrador({ leido, savedBy, existente, ahora }: {
  leido: ContenidoLeido;
  savedBy: string;
  existente: Borrador | null;
  ahora: string;
}): Borrador {
  const base: Omit<BorradorToldos, "kind" | "contenido"> = {
    schemaVersion: ESQUEMA_BORRADOR,
    orderCode: codigoBorrador(leido.numeroPedido),
    numeroPedido: leido.numeroPedido,
    savedBy,
    createdAt: existente?.createdAt ?? ahora,
    updatedAt: ahora,
    summary: resumenContenido(leido),
  };
  return leido.kind === "toldos"
    ? { ...base, kind: "toldos", contenido: leido.contenido }
    : { ...base, kind: "remolques", contenido: leido.contenido };
}

/** Lo que lista Pedidos: sin el contenido, que puede ser grande. */
export function resumenDeBorrador(borrador: Borrador): ResumenBorrador {
  const copia: Partial<Borrador> = { ...borrador };
  delete copia.contenido;
  return copia as ResumenBorrador;
}

/** Lo que se lee del disco puede ser cualquier cosa: solo vale lo que tiene forma de borrador. */
export function esBorrador(valor: unknown): valor is Borrador {
  return esObjeto(valor) && TIPOS_BORRADOR.includes(valor.kind as TipoBorrador)
    && typeof valor.orderCode === "string" && Boolean(valor.orderCode)
    && typeof valor.savedBy === "string" && typeof valor.updatedAt === "string"
    && esObjeto(valor.summary) && esObjeto(valor.contenido);
}
