import { stat } from "node:fs/promises";
import path from "node:path";
import { enviarCorte as enviarCorteCompartido } from "../../corteEnvios.js";
import {
  approvalReviewers, coordinaAuthor, generateFilesDecision, generationBlock, reviewAuthorship, saveReviewDecision, uniqueOfs,
} from "../../reviewRules.js";
import type { AlmacenPedidos } from "../../remolques/flujo/almacen.ts";
import { codigoPedido, ErrorPedidoRemolques } from "../../remolques/flujo/pedido.ts";
import type { EstadoCoordina, Respuesta } from "../../remolques/flujo/servicio.ts";
import { generarCortePuertas } from "../corte.ts";
import { leerPedidoPuertas } from "../pedido.ts";
import {
  anioPedido, crearPedidoPuertas, PUERTA_NOUNS, elementosAprobacion, exigirOfsPuertas, marcarPedidoGenerado, puertasSinOf, resumenBandeja,
  validarCabeceraPuertas,
} from "./pedido.ts";
import type { FicheroPlanoPuertas, PedidoPuertasGuardado, ResumenPedidoPuertas } from "./tipos.ts";

// El flujo de un pedido de puertas en el servidor (fase 2, 22/10/2026), con las reglas de toldos y remolques
// (src/reviewRules.js): guardar para revisión (y el plano DWG para revisarlo), CoordinaOT aprueba por OF, el
// autor genera y manda el corte. No hay PDF ni reserva en RPS (Iván: «No se reserva el PVC»; el documento es
// el plano, «una presentación de CAD, como toldos»). Los errores llevan su código, como en remolques.

/** El plano del pedido (archivos.ts): bytes y dónde va, sin escribir nada hasta `escribir`. */
export interface PlanoPuertas {
  preparar(pedido: PedidoPuertasGuardado, revisor: string): Promise<{ fichero: (FicheroPlanoPuertas & { contenido: Uint8Array }) | null; avisos: string[] }>;
  escribir(fichero: FicheroPlanoPuertas & { contenido: Uint8Array }): Promise<void>;
}

export interface DependenciasPedidosPuertas {
  almacen: AlmacenPedidos<PedidoPuertasGuardado>;
  ajustes: () => Promise<{ productionEnabled?: boolean; corteLonaBotDirectory?: string; corteLonaPlanoDirectory?: string; corteLonaDxfDirectory?: string }>;
  coordina: { statusOf(ofs: string[], opciones?: { fresh?: boolean }): Promise<EstadoCoordina> };
  /** La lista de técnicos (la de «Soy»). */
  tecnicos: string[];
  /** La OF de los sacos de stock (src/ofStockSacos.js): sin ella, el corte va sin sacos. */
  ofStockSacos?: () => Promise<{ of: string }>;
  /** El producto con que ya está guardado ese número, si es otro («toldos», «remolques»): nunca hay pedidos mixtos. */
  otroProducto: (orderCode: string) => Promise<string | null>;
  plano?: PlanoPuertas;
  registrar?: (mensaje: string) => void;
  ahora?: () => Date;
}

async function existeFichero(fichero: string): Promise<boolean> {
  try {
    return (await stat(fichero)).isFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw new ErrorPedidoRemolques(`No se puede leer la carpeta ${path.dirname(fichero)}: comprueba que está disponible.`, 503);
  }
}

/** El texto de por qué no se puede escribir el plano, como en remolques (AR2605158). */
function motivoPlano(error: unknown, nombre: string): string {
  const codigo = (error as NodeJS.ErrnoException).code;
  if (codigo === "EACCES" || codigo === "EPERM") {
    return `No se pudo sustituir ${nombre}: el servidor no tiene permiso para cambiar el plano que hay (lo hizo otra persona). Bórralo o cámbiale el nombre y vuelve a guardar el plano.`;
  }
  if (codigo === "EBUSY") return `No se pudo sustituir ${nombre}: está abierto (quizá en AutoCAD). Ciérralo y vuelve a guardar el plano.`;
  return "No se pudo escribir el plano en su carpeta.";
}

export function crearServicioPedidosPuertas(deps: DependenciasPedidosPuertas) {
  const reloj = deps.ahora ?? (() => new Date());
  const registrar = deps.registrar ?? ((mensaje: string) => console.error(mensaje));
  const ahora = () => reloj().toISOString();
  // Un bloqueo por pedido, como en remolques: guardar, generar y mandar el corte nunca se cruzan.
  const ocupados = new Map<string, "guardando" | "generando">();
  const MENSAJE_OCUPADO = "Se está guardando este pedido: vuelve a intentarlo en un momento.";

  async function obtener(orderCode: string): Promise<PedidoPuertasGuardado> {
    const pedido = await deps.almacen.obtener(codigoPedido(orderCode));
    if (!pedido) throw new ErrorPedidoRemolques("No se encontró el pedido de puertas.", 404);
    return pedido;
  }

  async function listar(anio: number): Promise<{ year: number; reviews: ResumenPedidoPuertas[] }> {
    const pedidos = await deps.almacen.listar();
    return { year: anio, reviews: pedidos.filter((pedido) => anioPedido(pedido) === anio).map(resumenBandeja) };
  }

  /**
   * El plano para revisar (como el corte de toldos y remolques, al guardar). Nunca hace fallar a quien lo llama:
   * lo que pase va en los avisos. Si ya está en su carpeta (quizá hecho a mano), no se sustituye sin confirmar.
   */
  async function escribirPlano(pedido: PedidoPuertasGuardado, revisor: string, confirmar: boolean) {
    if (!deps.plano) return null;
    if (!(await deps.ajustes()).productionEnabled) return { files: [], avisos: ["Modo simulación: no se ha escrito el plano."] };
    let preparado;
    try {
      preparado = await deps.plano.preparar(pedido, revisor);
    } catch (error) {
      registrar(`Pedido ${pedido.orderCode}: no se pudo preparar el plano de puertas: ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
      return { files: [], avisos: ["No se pudo preparar el plano: hay que hacerlo a mano."] };
    }
    const { fichero, avisos } = preparado;
    if (!fichero) return { files: [], avisos };
    if (!confirmar && await existeFichero(fichero.savedPath)) return { files: [], avisos, existentes: [fichero.filename] };
    try {
      await deps.plano.escribir(fichero);
    } catch (error) {
      registrar(`Pedido ${pedido.orderCode}: no se pudo escribir el plano de puertas: ${(error as Error).message}`);
      return { files: [], avisos: [...avisos, motivoPlano(error, fichero.filename)] };
    }
    return { files: [{ type: fichero.type, filename: fichero.filename, savedPath: fichero.savedPath }], avisos };
  }

  async function guardar(cuerpo: unknown): Promise<Respuesta> {
    const c = (cuerpo ?? {}) as { pedido?: unknown; savedBy?: unknown; confirmOverwrite?: unknown };
    const salvador = typeof c.savedBy === "string" ? c.savedBy.trim() : "";
    if (!salvador || !deps.tecnicos.includes(salvador)) throw new ErrorPedidoRemolques("Elige quién eres en «Soy» antes de guardar.");
    let enviado;
    try {
      enviado = leerPedidoPuertas(c.pedido);
    } catch (error) {
      throw new ErrorPedidoRemolques((error as Error).message);
    }
    const orderCode = codigoPedido(enviado.orderCode);
    exigirOfsPuertas(enviado);
    // Con errores en las comprobaciones no sale el corte: se corrigen antes de mandarlo a revisar.
    const errores = generarCortePuertas(enviado).avisos.filter((aviso) => aviso.nivel === "error");
    if (errores.length) {
      throw new ErrorPedidoRemolques(`Antes de guardar, resuelve las comprobaciones: ${errores.slice(0, 3).map((aviso) => aviso.texto).join(" · ")}${errores.length > 3 ? ` (y ${errores.length - 3} más)` : ""}.`);
    }
    const cabecera = validarCabeceraPuertas((c.pedido as { cabecera?: unknown }).cabecera ?? {}, ahora().slice(0, 10));
    const ocupado = ocupados.get(orderCode);
    if (ocupado === "generando") {
      return { status: 409, cuerpo: { error: "Se están generando los archivos de este pedido: espera a que terminen antes de volver a guardarlo." } };
    }
    if (ocupado === "guardando") return { status: 409, cuerpo: { error: MENSAJE_OCUPADO } };
    ocupados.set(orderCode, "guardando");
    try {
      const otro = await deps.otroProducto(orderCode);
      if (otro) throw new ErrorPedidoRemolques(`${orderCode} ya está guardado como pedido de ${otro}: un pedido es de un solo producto. Revisa el número.`, 409);
      const existente = await deps.almacen.obtener(orderCode);
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
        technician: salvador,
        savedBy: salvador,
        currentAuthor,
      });
      const pedido = crearPedidoPuertas({ pedido: enviado, cabecera, autoria, existente, ahora: ahora() });
      await deps.almacen.guardar(pedido);
      // El plano sale ya al guardar, para revisarlo antes de aprobar (como el corte de toldos y remolques).
      const plano = await escribirPlano(pedido, "", false);
      return { status: 200, cuerpo: { ok: true, review: resumenBandeja(pedido), overwritten: Boolean(existente), plano } };
    } finally {
      ocupados.delete(orderCode);
    }
  }

  /** «Guardar plano para revisar» de la ficha: el plano de un pedido ya guardado, sin tocar el pedido. */
  async function planoRevision(orderCodeBruto: string, cuerpo?: unknown): Promise<Respuesta> {
    const orderCode = codigoPedido(orderCodeBruto);
    if (ocupados.has(orderCode)) return { status: 409, cuerpo: { error: MENSAJE_OCUPADO } };
    if (!deps.plano) throw new ErrorPedidoRemolques("El plano de puertas no está disponible en este servidor.", 404);
    const pedido = await obtener(orderCode);
    const confirmar = (cuerpo as { confirmOverwrite?: unknown } | null)?.confirmOverwrite === true;
    const plano = await escribirPlano(pedido, pedido.status === "PRODUCED" ? pedido.reviewedBy : "", confirmar);
    if (plano?.existentes?.length) {
      return { status: 409, cuerpo: { needsConfirmation: true, existing: plano.existentes, error: "El plano de este pedido ya está en su carpeta." } };
    }
    return { status: 200, cuerpo: { ok: true, plano } };
  }

  /**
   * «Generar archivos»: con todo aprobado en CoordinaOT, el plano definitivo (con quién lo revisó en el
   * cajetín) y el pedido pasa a Generados. El de revisión ya está en la carpeta: se pregunta antes de sustituirlo.
   */
  async function generar(orderCodeBruto: string, cuerpo: unknown): Promise<Respuesta> {
    const orderCode = codigoPedido(orderCodeBruto);
    const ocupado = ocupados.get(orderCode);
    if (ocupado === "generando") return { status: 409, cuerpo: { error: "Ya se están generando los archivos de este pedido." } };
    if (ocupado === "guardando") return { status: 409, cuerpo: { error: MENSAJE_OCUPADO } };
    ocupados.set(orderCode, "generando");
    try {
      const confirmar = (cuerpo as { confirmOverwrite?: unknown } | null)?.confirmOverwrite === true;
      if (!(await deps.ajustes()).productionEnabled) {
        throw new ErrorPedidoRemolques("La generación de archivos está desactivada en Configuración: no se ha generado nada.", 403);
      }
      if (!deps.plano) throw new ErrorPedidoRemolques("El plano de puertas no está disponible en este servidor.", 404);
      const pedido = await obtener(orderCode);
      const decision = generateFilesDecision(pedido.status);
      if (decision.action === "unchanged") {
        return { status: 200, cuerpo: { ok: true, unchanged: true, review: resumenBandeja(pedido), saved: pedido.production?.files ?? [] } };
      }
      if (decision.action === "refuse") throw new ErrorPedidoRemolques(decision.error, decision.statusCode);
      exigirOfsPuertas(pedido);
      const aprobacion = elementosAprobacion(pedido);
      const estado = await deps.coordina.statusOf(uniqueOfs(aprobacion), { fresh: true });
      const bloqueo = generationBlock(aprobacion, estado, PUERTA_NOUNS);
      if (bloqueo) throw new ErrorPedidoRemolques(bloqueo, estado.disponible ? 409 : 503);
      const revisor = approvalReviewers(aprobacion, estado, deps.tecnicos);
      const plano = await escribirPlano(pedido, revisor, confirmar);
      if (plano?.existentes?.length) {
        return { status: 409, cuerpo: { needsConfirmation: true, existing: plano.existentes,
          error: "El plano de revisión de este pedido ya está en su carpeta: se sustituye por el definitivo, con el revisor." } };
      }
      if (!plano?.files.length) {
        throw new ErrorPedidoRemolques(plano?.avisos.at(-1) ?? "No se pudo escribir el plano: no se ha generado nada.", 500);
      }
      const generado = marcarPedidoGenerado(pedido, { revisor, ficheros: plano.files, ahora: ahora() });
      try {
        await deps.almacen.guardar(generado);
      } catch (error) {
        console.error(`Pedido ${orderCode}: el plano está escrito pero no se pudo guardar el estado generado:`, error);
        throw new ErrorPedidoRemolques("El plano ya está en su carpeta, pero no se pudo apuntar el pedido como generado. Avisa a informática antes de volver a generarlo.", 500);
      }
      return { status: 200, cuerpo: { ok: true, review: resumenBandeja(generado), saved: plano.files, avisos: plano.avisos } };
    } finally {
      ocupados.delete(orderCode);
    }
  }

  /** El corte como saldría (piezas, rollos y avisos), para verlo: sin archivos ni nada escrito. */
  const ofStock = async () => (await deps.ofStockSacos?.())?.of || undefined;

  async function corte(orderCode: string) {
    const pedido = await obtener(orderCode);
    const { resultados, cortes, avisos } = generarCortePuertas({ ...pedido, summary: undefined }, { ofStockSacos: await ofStock() });
    return { resultados, cortes, avisos, sinOf: puertasSinOf(pedido) };
  }

  /** Un solo DXF por pedido, con las opciones de saco dentro (el técnico de la máquina elige). */
  async function prepararDxf(pedido: PedidoPuertasGuardado): Promise<{ filename: string; contents: Uint8Array }[]> {
    exigirOfsPuertas(pedido);
    const { archivo } = generarCortePuertas({ ...pedido, summary: undefined }, { ofStockSacos: await ofStock() });
    if (!archivo) throw new ErrorPedidoRemolques("Este pedido no tiene corte disponible: revisa las comprobaciones de las puertas.", 409);
    return [{ filename: `${archivo.nombre}.dxf`, contents: Buffer.from(archivo.dxf, "latin1") }];
  }

  async function descargarCorte(orderCode: string) {
    return (await prepararDxf(await obtener(orderCode)))[0];
  }

  async function enviarCorte(orderCodeBruto: string, cuerpo: unknown): Promise<Respuesta> {
    const orderCode = codigoPedido(orderCodeBruto);
    if (ocupados.has(orderCode)) return { status: 409, cuerpo: { error: MENSAJE_OCUPADO } };
    ocupados.set(orderCode, "generando");
    try {
      const c = (cuerpo ?? {}) as { usuario?: unknown; destino?: unknown; confirmBot?: unknown; confirmOverwrite?: unknown };
      const usuario = typeof c.usuario === "string" ? c.usuario.trim() : "";
      if (!deps.tecnicos.includes(usuario)) throw new ErrorPedidoRemolques("Elige quién eres en «Soy» antes de mandar o guardar el corte.");
      const pedido = await obtener(orderCode);
      exigirOfsPuertas(pedido);
      return await enviarCorteCompartido({ pedido, order: { orderCode, technician: pedido.summary.technician }, settings: await deps.ajustes(),
        usuario, destino: c.destino, confirmBot: c.confirmBot === true, confirmOverwrite: c.confirmOverwrite === true,
        elementos: elementosAprobacion(pedido), coordina: deps.coordina, nombres: PUERTA_NOUNS,
        comprobarCorte: () => {}, preparar: () => prepararDxf(pedido),
        guardarRegistro: (actualizado: PedidoPuertasGuardado) => deps.almacen.guardar(actualizado), ahora: reloj });
    } finally {
      ocupados.delete(orderCode);
    }
  }

  return { listar, obtener, guardar, planoRevision, generar, corte, descargarCorte, enviarCorte };
}
