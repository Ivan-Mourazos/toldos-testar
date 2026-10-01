import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  approvalReviewers, ELEMENT_NOUNS, generateFilesDecision, generationBlock, reviewAuthorship, saveReviewDecision, uniqueOfs,
} from "../../reviewRules.js";
import type { CalcParams } from "../calc/params.ts";
import { validarParams } from "../calc/validar-params.ts";
import { prepararPedidoHoja } from "../hoja/pedido.ts";
import type { DatosHojaPedido } from "../hoja/tipos.ts";
import { archivarPdfRemolques, destinosPdfRemolques, ErrorArchivoPdf, mensajeCarpetaNoDisponible, type CarpetasRemolques } from "../salida/archivo.ts";
import { nombrePdf } from "../salida/nombre-pdf.ts";
import { adjuntarDatosPedido } from "./adjunto.ts";
import type { AlmacenPedidosRemolques } from "./almacen.ts";
import {
  anioPedido, codigoPedido, crearPedidoRemolques, elementosAprobacion, elementosPedidoHoja, ErrorPedidoRemolques,
  marcarPedidoGenerado, resumenBandeja,
} from "./pedido.ts";
import type { FicheroGenerado, PedidoRemolques, ResumenPedidoRemolques } from "./tipos.ts";

// El flujo de un pedido de remolques en el servidor (fase 5), con las reglas de toldos de
// src/reviewRules.js. Las rutas de src/server.js solo pasan la petición y devuelven la respuesta.
// Los errores llevan su código (statusCode): 400 dato mal, 403 generación apagada, 404 no está,
// 409 conflicto, 503 CoordinaOT o Chromium no responden.

/** Lo que devuelve coordinaStatus.js (statusOf). */
export type EstadoCoordina = {
  disponible: boolean;
  motivo?: string;
  ofs?: Record<string, { estado?: string; nota?: string; revisor?: string; actualizado?: string | null }>;
};

export interface DependenciasPedidosRemolques {
  almacen: AlmacenPedidosRemolques;
  /** Configuración → Rutas de trabajo en este momento. */
  ajustes: () => Promise<CarpetasRemolques>;
  /** Los parámetros comunes de remolques, si la pantalla no manda los suyos. */
  parametros: () => Promise<CalcParams>;
  coordina: { statusOf(ofs: string[], opciones?: { fresh?: boolean }): Promise<EstadoCoordina> };
  /** La lista de técnicos de toldos (la de «Soy»): da el nombre del revisor de CoordinaOT. */
  tecnicos: string[];
  /** La hoja de taller en PDF (servicio de Chromium de la fase 4). */
  hacerPdf: (datos: DatosHojaPedido) => Promise<Uint8Array>;
  /** true si ese número ya está guardado como pedido de toldos (nunca hay pedidos mixtos). */
  esPedidoDeToldos: (orderCode: string) => Promise<boolean>;
  ahora?: () => Date;
}

export interface Respuesta {
  status: number;
  cuerpo: unknown;
}

/** Los parámetros que manda la pantalla, comprobados como se guardan los de Parámetros. */
export function paramsDeLaPantalla(bruto: unknown): CalcParams {
  const resultado = validarParams(bruto);
  if (!resultado.ok) {
    throw new ErrorPedidoRemolques(`Los parámetros de remolques del pedido no son válidos: ${resultado.errores.join("; ")}.`);
  }
  return resultado.params;
}

async function existeFichero(fichero: string): Promise<boolean> {
  try {
    return (await stat(fichero)).isFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw new ErrorPedidoRemolques(mensajeCarpetaNoDisponible(path.dirname(fichero)), 503);
  }
}

export const MENSAJE_TOLDOS_SIN_COMPROBAR = "No se puede comprobar si este número ya es un pedido de toldos; inténtalo en un momento.";

/**
 * Qué significa un error al leer el pedido de toldos con ese número: no está (ENOENT) → no es de
 * toldos; el fichero existe pero no se entiende (no editable, datos rotos) → el número está cogido;
 * cualquier otro fallo (carpeta caída, permisos) → no se sabe, y no se guarda como remolques.
 */
export function esPedidoDeToldosSegunError(error: unknown): boolean {
  const e = error as { code?: string; name?: string } | null;
  if (e?.code === "ENOENT") return false;
  if (e?.code === "NOT_EDITABLE_REVIEW_PDF" || error instanceof SyntaxError || e?.name === "InvalidPDFException") return true;
  throw new ErrorPedidoRemolques(MENSAJE_TOLDOS_SIN_COMPROBAR, 503);
}

export function crearServicioPedidosRemolques(deps: DependenciasPedidosRemolques) {
  const reloj = deps.ahora ?? (() => new Date());
  const ahora = () => reloj().toISOString();
  // Un bloqueo por pedido: dos «Generar archivos» a la vez no escriben dos veces, y «Guardar» y
  // «Generar archivos» del mismo pedido nunca se cruzan (el almacén se queda con lo último que
  // escribe: un guardado a mitad de una generación pisaría el pedido generado, o al revés).
  const ocupados = new Map<string, "guardando" | "generando">();
  const MENSAJE_GUARDANDO = "Se está guardando este pedido: vuelve a intentarlo en un momento.";

  async function obtener(orderCode: string): Promise<PedidoRemolques> {
    const pedido = await deps.almacen.obtener(codigoPedido(orderCode));
    if (!pedido) throw new ErrorPedidoRemolques("No se encontró el pedido de remolques.", 404);
    return pedido;
  }

  async function listar(anio: number): Promise<{ year: number; reviews: ResumenPedidoRemolques[] }> {
    const pedidos = await deps.almacen.listar();
    return { year: anio, reviews: pedidos.filter((pedido) => anioPedido(pedido) === anio).map(resumenBandeja) };
  }

  async function guardar(cuerpo: unknown): Promise<Respuesta> {
    const c = (cuerpo ?? {}) as { elementos?: unknown; params?: unknown; savedBy?: unknown; confirmOverwrite?: unknown };
    const salvador = typeof c.savedBy === "string" ? c.savedBy.trim() : "";
    if (!salvador || !deps.tecnicos.includes(salvador)) throw new ErrorPedidoRemolques("Elige quién eres en «Soy» antes de guardar.");
    const params = c.params == null ? await deps.parametros() : paramsDeLaPantalla(c.params);
    // Completo, del mismo pedido, ordenado y calculado aquí: nunca se guarda un resultado que no salga del cálculo.
    const datos = prepararPedidoHoja(c.elementos, params);
    const orderCode = codigoPedido(datos.elementos[0].input.cabecera.numeroPedido);
    const ocupado = ocupados.get(orderCode);
    if (ocupado === "generando") {
      return { status: 409, cuerpo: { error: "Se están generando los archivos de este pedido: espera a que terminen antes de volver a guardarlo." } };
    }
    if (ocupado === "guardando") return { status: 409, cuerpo: { error: MENSAJE_GUARDANDO } };
    ocupados.set(orderCode, "guardando");
    try {
      if (await deps.esPedidoDeToldos(orderCode)) {
        throw new ErrorPedidoRemolques(`${orderCode} ya está guardado como pedido de toldos: un pedido es de toldos o de remolques. Revisa el número.`, 409);
      }
      const existente = await deps.almacen.obtener(orderCode);
      // Uno generado no se pisa nunca (PRODUCED_SAVE_ERROR), ni confirmando.
      const decision = saveReviewDecision(existente, c.confirmOverwrite === true);
      if (decision.action === "refuse") throw new ErrorPedidoRemolques(decision.error, decision.statusCode);
      if (decision.action === "confirm") {
        return { status: 409, cuerpo: { needsConfirmation: true, existing: [orderCode], error: "Este pedido ya está guardado en Pedidos." } };
      }
      const autoria = reviewAuthorship({
        existingTechnician: existente?.summary.technician,
        existingReviewer: existente?.summary.reviewer,
        technician: datos.elementos[0].input.cabecera.realizadoPor,
        savedBy: salvador,
      });
      const pedido = crearPedidoRemolques({ datos, autoria, existente, ahora: ahora() });
      await deps.almacen.guardar(pedido);
      return { status: 200, cuerpo: { ok: true, review: resumenBandeja(pedido), overwritten: Boolean(existente) } };
    } finally {
      ocupados.delete(orderCode);
    }
  }

  async function generar(orderCodeBruto: string, cuerpo: unknown): Promise<Respuesta> {
    const orderCode = codigoPedido(orderCodeBruto);
    const ocupado = ocupados.get(orderCode);
    if (ocupado === "generando") return { status: 409, cuerpo: { error: "Ya se están generando los archivos de este pedido." } };
    if (ocupado === "guardando") return { status: 409, cuerpo: { error: MENSAJE_GUARDANDO } };
    ocupados.set(orderCode, "generando");
    try {
      const confirmar = (cuerpo as { confirmOverwrite?: unknown } | null)?.confirmOverwrite === true;
      const ajustes = await deps.ajustes();
      if (!ajustes.productionEnabled) {
        throw new ErrorPedidoRemolques("La generación de archivos está desactivada en Configuración: no se ha generado nada.", 403);
      }
      const pedido = await obtener(orderCode);
      const decision = generateFilesDecision(pedido.status);
      if (decision.action === "unchanged") {
        return { status: 200, cuerpo: { ok: true, unchanged: true, review: resumenBandeja(pedido), saved: pedido.production?.files ?? [] } };
      }
      if (decision.action === "refuse") throw new ErrorPedidoRemolques(decision.error, decision.statusCode);

      // Dónde irá: si faltan las carpetas o el número no vale, se dice antes de preguntar a nadie.
      const { nombre, destinos } = destinosPdfRemolques(pedido.numeroPedido, pedido.summary.orderDate, ajustes);

      // Solo se genera lo que CoordinaOT ha aprobado, OF por OF, preguntando en el momento.
      const aprobacion = elementosAprobacion(pedido);
      const estado = await deps.coordina.statusOf(uniqueOfs(aprobacion), { fresh: true });
      const bloqueo = generationBlock(aprobacion, estado, ELEMENT_NOUNS);
      if (bloqueo) throw new ErrorPedidoRemolques(bloqueo, estado.disponible ? 409 : 503);
      const revisor = approvalReviewers(aprobacion, estado, deps.tecnicos);

      // Si ya hay un PDF de este pedido, se pregunta antes de hacer el nuevo.
      const yaEstan = (await Promise.all(destinos.map(existeFichero)))
        .map((existe, indice) => (existe ? path.basename(destinos[indice]) : ""))
        .filter(Boolean);
      if (yaEstan.length > 0 && !confirmar) return { status: 409, cuerpo: { needsConfirmation: true, existing: yaEstan } };

      const ficheros: FicheroGenerado[] = destinos.map((savedPath) => ({ type: "pdf", filename: path.basename(savedPath), savedPath }));
      const generado = marcarPedidoGenerado(pedido, { revisor, ficheros, ahora: ahora() });
      const datos: DatosHojaPedido = { ...prepararPedidoHoja(elementosPedidoHoja(pedido), pedido.params), revisadoPor: revisor };
      const pdf = await adjuntarDatosPedido(await deps.hacerPdf(datos), generado);
      try {
        await archivarPdfRemolques(pdf, { numeroPedido: pedido.numeroPedido, fecha: pedido.summary.orderDate }, ajustes, { sustituir: confirmar });
      } catch (error) {
        // Apareció un PDF desde la comprobación de arriba: se pregunta igual.
        if (error instanceof ErrorArchivoPdf && error.codigo === "PDF_EXISTENTE") {
          return { status: 409, cuerpo: { needsConfirmation: true, existing: destinos.map((destino) => path.basename(destino)) } };
        }
        throw error;
      }
      // Primero los PDF y después el estado: si el archivo falla, el pedido sigue pendiente y se puede repetir.
      try {
        await deps.almacen.guardar(generado);
      } catch (error) {
        console.error(`Pedido ${orderCode}: los PDF están archivados (${destinos.join(", ")}) pero no se pudo guardar el estado generado:`, error);
        throw new ErrorPedidoRemolques(
          "Los PDF ya están en sus carpetas, pero no se pudo apuntar el pedido como generado. Avisa a informática antes de volver a generarlo.",
          500,
        );
      }
      return { status: 200, cuerpo: { ok: true, review: resumenBandeja(generado), saved: ficheros, nombre } };
    } finally {
      ocupados.delete(orderCode);
    }
  }

  async function vistaPrevia(orderCode: string): Promise<{ pdf: Uint8Array; nombre: string }> {
    const pedido = await obtener(orderCode);
    const datos: DatosHojaPedido = {
      ...prepararPedidoHoja(elementosPedidoHoja(pedido), pedido.params),
      revisadoPor: pedido.status === "PRODUCED" ? pedido.reviewedBy : "",
    };
    return { pdf: await deps.hacerPdf(datos), nombre: nombrePdf(pedido.numeroPedido) };
  }

  async function archivo(orderCode: string): Promise<{ pdf: Uint8Array; nombre: string }> {
    const pedido = await obtener(orderCode);
    if (pedido.status !== "PRODUCED" || !pedido.production?.files.length) {
      throw new ErrorPedidoRemolques("Este pedido todavía no tiene archivos generados.", 404);
    }
    for (const fichero of pedido.production.files) {
      try {
        return { pdf: await readFile(fichero.savedPath), nombre: fichero.filename };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
    throw new ErrorPedidoRemolques("El PDF generado ya no está en sus carpetas de archivo.", 404);
  }

  return { listar, obtener, guardar, generar, vistaPrevia, archivo };
}
