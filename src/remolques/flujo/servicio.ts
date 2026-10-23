import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { enviarCorte as enviarCorteCompartido } from "../../corteEnvios.js";
import {
  approvalReviewers, coordinaAuthor, ELEMENT_NOUNS, generateFilesDecision, generationBlock, reviewAuthorship, saveReviewDecision, uniqueOfs,
} from "../../reviewRules.js";
import type { CalcParams } from "../calc/params.ts";
import { exigirOfsCorte } from "../corte/of.js";
import { validarParams } from "../calc/validar-params.ts";
import { prepararPedidoHoja } from "../hoja/pedido.ts";
import type { DatosHojaPedido } from "../hoja/tipos.ts";
import { archivarPdfRemolques, destinosPdfRemolques, ErrorArchivoPdf, mensajeCarpetaNoDisponible, type CarpetasRemolques } from "../salida/archivo.ts";
import { nombrePdf } from "../salida/nombre-pdf.ts";
import { adjuntarDatosPedido } from "./adjunto.ts";
import { buscarRemolques, validarFiltros, type FichaBusqueda, type ResultadoBusqueda } from "./buscar.ts";
import type { AlmacenPedidosRemolques } from "./almacen.ts";
import {
  anioPedido, codigoPedido, crearPedidoRemolques, elementosAprobacion, elementosPedidoHoja, ErrorPedidoRemolques,
  marcarPedidoGenerado, resumenBandeja, validarClienteRps,
} from "./pedido.ts";
import type { FicheroCorte, FicheroGenerado, PedidoRemolques, ResumenPedidoRemolques } from "./tipos.ts";

// El flujo de un pedido de remolques en el servidor (fase 5), con las reglas de toldos de
// src/reviewRules.js. Las rutas de src/server.js solo pasan la petición y devuelven la respuesta.
// Los errores llevan su código (statusCode): 400 dato mal, 403 generación apagada, 404 no está,
// 409 conflicto, 503 CoordinaOT o Chromium no responden.

/** Lo que devuelve coordinaStatus.js (statusOf). */
export type EstadoCoordina = {
  disponible: boolean;
  motivo?: string;
  ofs?: Record<string, { estado?: string; nota?: string; revisor?: string; actualizado?: string | null; autor?: string }>;
};

export interface DependenciasPedidosRemolques {
  almacen: AlmacenPedidosRemolques;
  /** Configuración → Rutas de trabajo en este momento. */
  ajustes: () => Promise<CarpetasRemolques & { corteLonaBotDirectory?: string; corteLonaDxfDirectory?: string }>;
  /** Espera a las carpetas de red dormidas antes de generar (workflow.js, waitForDirectories). */
  despertarCarpetas?: (carpetas: string[]) => Promise<unknown>;
  /** Los parámetros comunes de remolques, si la pantalla no manda los suyos. */
  parametros: () => Promise<CalcParams>;
  coordina: { statusOf(ofs: string[], opciones?: { fresh?: boolean }): Promise<EstadoCoordina> };
  /** La lista de técnicos de toldos (la de «Soy»): da el nombre del revisor de CoordinaOT. */
  tecnicos: string[];
  /** La hoja de taller en PDF (servicio de Chromium de la fase 4). */
  hacerPdf: (datos: DatosHojaPedido) => Promise<Uint8Array>;
  /** true si ese número ya está guardado como pedido de toldos (nunca hay pedidos mixtos). */
  esPedidoDeToldos: (orderCode: string) => Promise<boolean>;
  /** Las fichas de cliente con que se calcula (remolquesClientesStore.get): el buscador busca por su nombre. */
  fichas?: () => Promise<readonly FichaBusqueda[]>;
  /** El corte de lona (corte/archivos.js): sin él, «Generar archivos» deja solo los PDF. */
  corte?: CorteRemolques;
  /** Dónde se apuntan los fallos que no paran nada (por defecto, console.error). */
  registrar?: (mensaje: string) => void;
  ahora?: () => Date;
}

export type ArchivoCorte = FicheroCorte & { contenido: Uint8Array };

export interface CorteRemolques {
  /** Todos los bytes del corte del pedido (con los resultados con que se genera), sin escribir nada. */
  preparar(pedido: PedidoRemolques): Promise<{ ficheros: ArchivoCorte[]; avisos: string[] }>;
  escribir(ficheros: ArchivoCorte[]): Promise<void>;
  /** El corte para verlo en pantalla: piezas, metros de rollo y avisos, sin los archivos. */
  vista(pedido: PedidoRemolques): unknown;
  prepararDxf?(pedido: PedidoRemolques): { filename: string; contents: Uint8Array }[];
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

/** Lo que hace falta de workflowStore (src/workflow.js) para mirar si un número es de toldos. */
export interface TiendaToldos {
  getSettings(): Promise<{ reviewDirectory?: string }>;
  getReview(orderCode: string): Promise<unknown>;
}

/**
 * true si ese número ya está guardado como pedido de toldos. Lo usan el servidor (no se guarda como
 * remolques) y el paso desde la web vieja (no se pasa). Sin carpeta de toldos no hay nada que mirar.
 */
export function comprobadorPedidoToldos(tienda: TiendaToldos): (orderCode: string) => Promise<boolean> {
  return async (orderCode) => {
    if (!(await tienda.getSettings()).reviewDirectory) return false;
    try {
      await tienda.getReview(orderCode);
      return true;
    } catch (error) {
      return esPedidoDeToldosSegunError(error);
    }
  };
}

export const mensajePedidoDeRemolques = (orderCode: string) =>
  `${orderCode} ya está guardado como pedido de remolques: un pedido es de toldos o de remolques. Revisa el número.`;

/**
 * true si ese número ya está guardado como pedido de remolques (lo pregunta el guardado de toldos).
 * Si la carpeta interna no está puesta, no hay pedidos de remolques; si falla al leerla, se apunta y
 * se responde false: toldos tiene que seguir funcionando aunque la carpeta de remolques esté rota.
 */
export async function yaEsPedidoDeRemolques(
  almacen: Pick<AlmacenPedidosRemolques, "obtener">,
  orderCode: string,
  registrar: (mensaje: string) => void = (mensaje) => console.error(mensaje),
): Promise<boolean> {
  let codigo: string;
  try {
    codigo = codigoPedido(orderCode);
  } catch {
    return false;
  }
  try {
    return (await almacen.obtener(codigo)) !== null;
  } catch (error) {
    registrar(`No se pudo mirar si ${codigo} es un pedido de remolques; se guarda como toldos: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * El pedido con el resultado de cada elemento tal como lo ha calculado la hoja (por su versión) y los
 * parámetros del pedido como los de cada elemento: así lo que va dentro del PDF es lo que se imprime.
 */
function conResultadosDeLaHoja(pedido: PedidoRemolques, datos: DatosHojaPedido): PedidoRemolques {
  return {
    ...pedido,
    elementos: pedido.elementos.map((elemento) => {
      const calculado = datos.elementos.find((e) => e.version === elemento.version);
      if (!calculado) throw new Error(`La hoja no trae el elemento ${elemento.version} del pedido ${pedido.orderCode}.`);
      return { ...elemento, result: calculado.result, paramsSnapshot: pedido.params };
    }),
  };
}

const sinContenido = ({ contenido: _contenido, ...fichero }: ArchivoCorte): FicheroCorte => fichero;

async function prepararCorte(corte: CorteRemolques, pedido: PedidoRemolques, registrar: (mensaje: string) => void) {
  try {
    return await corte.preparar(pedido);
  } catch (error) {
    registrar(`Pedido ${pedido.orderCode}: no se pudo preparar el corte de lona: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
    return { ficheros: [], avisos: ["No se pudo preparar el corte de lona: hay que hacerlo a mano."] };
  }
}

export function crearServicioPedidosRemolques(deps: DependenciasPedidosRemolques) {
  const reloj = deps.ahora ?? (() => new Date());
  const registrar = deps.registrar ?? ((mensaje: string) => console.error(mensaje));
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

  /** El buscador (diseño 02/10/2026): todos los pedidos guardados, de todos los años, elemento a elemento. */
  async function buscar(cuerpo: unknown): Promise<ResultadoBusqueda> {
    const filtros = validarFiltros(cuerpo);
    return buscarRemolques(await deps.almacen.listar(), filtros, { fichas: filtros.cliente ? await fichasParaBuscar() : [] });
  }

  /** Si las fichas no se pueden leer se busca igual, por el nombre y el código: se apunta y sigue. */
  async function fichasParaBuscar(): Promise<readonly FichaBusqueda[]> {
    try {
      return (await deps.fichas?.()) ?? [];
    } catch (error) {
      (deps.registrar ?? console.error)(`El buscador de remolques no pudo leer las fichas de cliente: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  async function guardar(cuerpo: unknown): Promise<Respuesta> {
    const c = (cuerpo ?? {}) as { elementos?: unknown; params?: unknown; savedBy?: unknown; confirmOverwrite?: unknown; clienteRps?: unknown };
    const salvador = typeof c.savedBy === "string" ? c.savedBy.trim() : "";
    if (!salvador || !deps.tecnicos.includes(salvador)) throw new ErrorPedidoRemolques("Elige quién eres en «Soy» antes de guardar.");
    const params = c.params == null ? await deps.parametros() : paramsDeLaPantalla(c.params);
    const clienteRps = validarClienteRps(c.clienteRps);
    // Completo, del mismo pedido, ordenado y calculado aquí: nunca se guarda un resultado que no salga del cálculo.
    const datos = prepararPedidoHoja(c.elementos, params);
    exigirOfsCorte(datos);
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
      // Si un compañero lo ha cogido en CoordinaOT, pasa a ser el autor (Iván, 23/10/2026).
      const ofsGuardadas = existente ? elementosAprobacion(existente) : [];
      const currentAuthor = existente ? coordinaAuthor(ofsGuardadas, await deps.coordina.statusOf(uniqueOfs(ofsGuardadas))) : "";
      const autoria = reviewAuthorship({
        existingTechnician: existente?.summary.technician,
        existingReviewer: existente?.summary.reviewer,
        technician: datos.elementos[0].input.cabecera.realizadoPor,
        savedBy: salvador,
        currentAuthor,
      });
      const pedido = crearPedidoRemolques({ datos, autoria, existente, ahora: ahora(), clienteRps });
      await deps.almacen.guardar(pedido);
      // Como en toldos: el plano del corte sale ya al guardar, para revisarlo antes de aprobar.
      const planoCorte = await escribirPlanoRevision(pedido);
      return { status: 200, cuerpo: { ok: true, review: resumenBandeja(pedido), overwritten: Boolean(existente), planoCorte } };
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
      const { nombre, destinos, raices } = destinosPdfRemolques(pedido.numeroPedido, pedido.summary.orderDate, ajustes);
      // Las carpetas de red se despiertan aquí, para no tener que pasar antes por Configuración.
      await deps.despertarCarpetas?.(raices);

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
      // La hoja se recalcula con los parámetros del pedido; los datos que van dentro del PDF (y el
      // pedido generado) llevan esos mismos resultados, no los de cuando se guardó.
      const datos: DatosHojaPedido = { ...prepararPedidoHoja(elementosPedidoHoja(pedido), pedido.params), revisadoPor: revisor };
      const calculado = conResultadosDeLaHoja(pedido, datos);
      // El corte sale solo con sus botones: «Generar archivos» deja los PDF.
      const generado = marcarPedidoGenerado(calculado, { revisor, ficheros, ahora: ahora() });
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
      return { status: 200, cuerpo: { ok: true, review: resumenBandeja(generado), saved: ficheros, nombre, corte: generado.production?.corte ?? null } };
    } finally {
      ocupados.delete(orderCode);
    }
  }

  /**
   * El plano del corte para revisar antes de aprobar (Iván, 20/10/2026: «para aprobar necesitamos revisar el
   * corte primero»). Solo el plano: el DXF del bot sale con su botón propio. Nunca hace fallar a quien lo
   * llama; lo que pase va en los avisos. Si el plano ya está en su carpeta (el DWG de Oficina Tecnica/<año>,
   * quizá hecho a mano), no se sustituye sin `confirmar` (Iván, 20/10/2026): se devuelve en `existentes`.
   */
  async function escribirPlanoRevision(pedido: PedidoRemolques, confirmar = false): Promise<{ files: FicheroCorte[]; avisos: string[]; existentes?: string[] } | null> {
    exigirOfsCorte(pedido);
    if (!deps.corte) return null;
    if (!(await deps.ajustes()).productionEnabled) return { files: [], avisos: ["Modo simulación: no se ha escrito el plano del corte."] };
    const { ficheros, avisos } = await prepararCorte(deps.corte, pedido, registrar);
    const planos = ficheros.filter((fichero) => fichero.type === "plano-corte-lona");
    const yaEstan = (await Promise.all(planos.map((plano) => existeFichero(plano.savedPath))))
      .map((esta, indice) => (esta ? planos[indice].filename : ""))
      .filter(Boolean);
    if (yaEstan.length > 0 && !confirmar) return { files: [], avisos, existentes: yaEstan };
    try {
      await deps.corte.escribir(planos);
    } catch (error) {
      registrar(`Pedido ${pedido.orderCode}: no se pudo escribir el plano del corte: ${(error as Error).message}`);
      // Lo que más pasa al sustituir (AR2605158, 21/10/2026): el plano que había lo hizo un técnico y la cuenta
      // del servidor solo puede leerlo, o está abierto en AutoCAD. Se dice para que no parezca que no hace nada.
      const nombres = planos.map((plano) => plano.filename).join(" · ");
      const codigo = (error as NodeJS.ErrnoException).code;
      const motivo = codigo === "EACCES" || codigo === "EPERM"
        ? `No se pudo sustituir ${nombres}: el servidor no tiene permiso para cambiar el plano que hay (lo hizo otra persona). Bórralo o cámbiale el nombre y vuelve a guardar el plano.`
        : codigo === "EBUSY"
          ? `No se pudo sustituir ${nombres}: está abierto (quizá en AutoCAD). Ciérralo y vuelve a guardar el plano.`
          : "No se pudo escribir el plano del corte en su carpeta.";
      return { files: [], avisos: [...avisos, motivo] };
    }
    return { files: planos.map(sinContenido), avisos };
  }

  /** «Guardar plano para revisar» de la ficha: el plano del corte de un pedido ya guardado, sin tocar el pedido. */
  async function planoCorte(orderCodeBruto: string, cuerpo?: unknown): Promise<Respuesta> {
    const orderCode = codigoPedido(orderCodeBruto);
    if (ocupados.has(orderCode)) return { status: 409, cuerpo: { error: MENSAJE_GUARDANDO } };
    if (!deps.corte) throw new ErrorPedidoRemolques("El corte de lona no está disponible en este servidor.", 404);
    const pedido = await obtener(orderCode);
    const datos: DatosHojaPedido = { ...prepararPedidoHoja(elementosPedidoHoja(pedido), pedido.params), revisadoPor: "" };
    const confirmar = (cuerpo as { confirmOverwrite?: unknown } | null)?.confirmOverwrite === true;
    const planoCorte = await escribirPlanoRevision(conResultadosDeLaHoja(pedido, datos), confirmar);
    if (planoCorte?.existentes?.length) {
      return { status: 409, cuerpo: { needsConfirmation: true, existing: planoCorte.existentes, error: "El plano de este pedido ya está en su carpeta." } };
    }
    return { status: 200, cuerpo: { ok: true, planoCorte } };
  }

  /** El corte de lona como saldría al generar (con los resultados recalculados como la hoja), para verlo. */
  async function corte(orderCode: string): Promise<unknown> {
    if (!deps.corte) throw new ErrorPedidoRemolques("El corte de lona no está disponible en este servidor.", 404);
    const pedido = await obtener(orderCode);
    const datos: DatosHojaPedido = { ...prepararPedidoHoja(elementosPedidoHoja(pedido), pedido.params), revisadoPor: "" };
    return deps.corte.vista(conResultadosDeLaHoja(pedido, datos));
  }

  /** El planteo del formulario, calculado aquí sin consultar ni tocar el almacén de pedidos. */
  async function vistaPreviaCorte(cuerpo: unknown): Promise<unknown> {
    if (!deps.corte) throw new ErrorPedidoRemolques("El corte de lona no está disponible en este servidor.", 404);
    const c = (cuerpo ?? {}) as { elementos?: unknown; params?: unknown; clienteRps?: unknown };
    // La pantalla siempre los manda: leer valores por defecto podría inicializar archivos de configuración.
    const params = paramsDeLaPantalla(c.params);
    const datos = prepararPedidoHoja(c.elementos, params);
    const pedido = crearPedidoRemolques({ datos, autoria: { technician: datos.elementos[0].input.cabecera.realizadoPor || "", reviewer: "" },
      existente: null, ahora: ahora(), clienteRps: validarClienteRps(c.clienteRps) });
    return deps.corte.vista(pedido);
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

  function pedidoCalculado(pedido: PedidoRemolques) {
    return conResultadosDeLaHoja(pedido, { ...prepararPedidoHoja(elementosPedidoHoja(pedido), pedido.params), revisadoPor: pedido.reviewedBy });
  }

  async function descargarCorte(orderCode: string) {
    if (!deps.corte?.prepararDxf) throw new ErrorPedidoRemolques("El corte de lona no está disponible.", 404);
    const pedido = await obtener(orderCode);
    exigirOfsCorte(pedido);
    return deps.corte.prepararDxf(pedidoCalculado(pedido))[0];
  }

  async function enviarCorte(orderCodeBruto: string, cuerpo: unknown): Promise<Respuesta> {
    const orderCode = codigoPedido(orderCodeBruto);
    if (ocupados.has(orderCode)) return { status: 409, cuerpo: { error: MENSAJE_GUARDANDO } };
    ocupados.set(orderCode, "generando");
    try {
      const c = (cuerpo ?? {}) as { usuario?: unknown; destino?: unknown; confirmBot?: unknown; confirmOverwrite?: unknown };
      const usuario = typeof c.usuario === "string" ? c.usuario.trim() : "";
      if (!deps.tecnicos.includes(usuario)) throw new ErrorPedidoRemolques("Elige quién eres en «Soy» antes de mandar o guardar el corte.");
      if (!deps.corte?.prepararDxf) throw new ErrorPedidoRemolques("El corte de lona no está disponible.", 404);
      const pedido = await obtener(orderCode);
      exigirOfsCorte(pedido);
      const calculado = pedidoCalculado(pedido);
      return await enviarCorteCompartido({ pedido, order: { orderCode, technician: pedido.summary.technician }, settings: await deps.ajustes(),
        usuario, destino: c.destino, confirmBot: c.confirmBot === true, confirmOverwrite: c.confirmOverwrite === true,
        elementos: elementosAprobacion(pedido), coordina: deps.coordina, nombres: ELEMENT_NOUNS,
        comprobarCorte: () => {}, preparar: () => deps.corte!.prepararDxf!(calculado),
        guardarRegistro: (actualizado: PedidoRemolques) => deps.almacen.guardar(actualizado), ahora: reloj });
    } finally { ocupados.delete(orderCode); }
  }

  return { listar, obtener, guardar, generar, vistaPrevia, archivo, buscar, corte, vistaPreviaCorte, planoCorte, enviarCorte, descargarCorte };
}
