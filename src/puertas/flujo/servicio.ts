import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { enviarCorte as enviarCorteCompartido } from "../../corteEnvios.js";
import { crearFlujoDwg, ultimaAprobacion } from "../../flujoDwg/flujo.ts";
import { conRevisor, htmlPresentaciones, sinDibujarEnPdf } from "../../flujoDwg/planoDxf.js";
import { writeFileAtomic } from "../../workflow.js";
import { normalizarNumeroPedido } from "../../remolques/pedidos/numero-pedido.ts";
import { anioDelPlanteamiento } from "../../remolques/salida/nombre-pdf.ts";
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
  preparar(pedido: PedidoPuertasGuardado, revisor: string, carpetaBorradores?: string): Promise<{ fichero: (FicheroPlanoPuertas & { contenido: Uint8Array }) | null; avisos: string[] }>;
  escribir(fichero: FicheroPlanoPuertas & { contenido: Uint8Array }): Promise<void>;
  /** El plano de una carpeta en DXF (el DWG pasado por ODA), para leer su corte. */
  leer?(ruta: string): Promise<string>;
}

/** Lo confirmado con «Confirmar corte», antes de guardar el pedido (src/flujoDwg/confirmaciones.js). */
export interface ConfirmacionesCorte {
  leer(orderCode: string): Promise<{ huella: string; por: string; fecha: string; filename: string } | null>;
  guardar(orderCode: string, datos: { huella: string; por: string; fecha: string; filename: string }): Promise<void>;
  borrar(orderCode: string): Promise<void>;
}

export interface DependenciasPedidosPuertas {
  almacen: AlmacenPedidos<PedidoPuertasGuardado>;
  ajustes: () => Promise<{ productionEnabled?: boolean; corteLonaBotDirectory?: string; corteLonaPlanoDirectory?: string; corteLonaDxfDirectory?: string;
    corteBorradoresDirectory?: string; corteBorradoresRed?: string; remolquesPlanteamientosDirectory?: string }>;
  coordina: { statusOf(ofs: string[], opciones?: { fresh?: boolean }): Promise<EstadoCoordina> };
  /** La lista de técnicos (la de «Soy»). */
  tecnicos: string[];
  /** La OF de los sacos de stock (src/ofStockSacos.js): sin ella, el corte va sin sacos. */
  ofStockSacos?: () => Promise<{ of: string }>;
  /** El producto con que ya está guardado ese número, si es otro («toldos», «remolques»): nunca hay pedidos mixtos. */
  otroProducto: (orderCode: string) => Promise<string | null>;
  plano?: PlanoPuertas;
  confirmaciones?: ConfirmacionesCorte;
  /** Fase 4 del flujo del DWG: una página HTML de presentaciones, en PDF (el Chromium del servidor). */
  presentacionesPdf?: (html: string) => Promise<Uint8Array>;
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

  // Flujo del DWG (plan del 24/10/2026, src/flujoDwg/flujo.ts): borrador, confirmar, guardar desde el borrador y el bot desde el DWG.
  const flujo = crearFlujoDwg({ ajustes: deps.ajustes, leer: deps.plano?.leer, confirmaciones: deps.confirmaciones, registrar, ahora: reloj,
    escribir: (fichero) => deps.plano!.escribir({ type: "plano-puertas", ...fichero }) });

  /** En qué paso está el corte del pedido (borrador, confirmado, tocado después), para los botones de la pantalla. */
  async function estadoCorte(orderCode: unknown) {
    const codigo = typeof orderCode === "string" ? orderCode.trim() : "";
    if (!codigo) return { activo: false as const };
    return flujo.estado(codigoPedido(codigo));
  }

  /** «Confirmar corte» (fase 2): el corte del borrador, tal como quedó en ZWCAD, apuntado para guardar para revisión. */
  async function confirmarCorte(cuerpo: unknown): Promise<Respuesta> {
    const c = (cuerpo ?? {}) as { orderCode?: unknown; savedBy?: unknown };
    const autor = typeof c.savedBy === "string" ? c.savedBy.trim() : "";
    if (!autor || !deps.tecnicos.includes(autor)) throw new ErrorPedidoRemolques("Elige quién eres en «Soy» antes de confirmar el corte.");
    return flujo.confirmar(codigoPedido(typeof c.orderCode === "string" ? c.orderCode : ""), autor);
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
      // Flujo del DWG (fase 2): solo con el corte confirmado y sin cambios; el borrador pasa a la carpeta del año, donde lo abre
      // el revisor, y la web ya no genera el plano.
      const desdeBorrador = await flujo.alGuardar({ orderCode, technician: autoria.technician, confirmOverwrite: c.confirmOverwrite === true });
      if (desdeBorrador && "respuesta" in desdeBorrador) return desdeBorrador.respuesta;
      if (desdeBorrador) {
        await desdeBorrador.escribir();
        const conCorte = { ...pedido, corteConfirmado: desdeBorrador.corteConfirmado };
        await deps.almacen.guardar(conCorte);
        const avisos = await desdeBorrador.limpiar();
        const { filename, plano: savedPath } = desdeBorrador.corteConfirmado;
        return { status: 200, cuerpo: { ok: true, review: resumenBandeja(conCorte), overwritten: Boolean(existente), plano: { files: [{ type: "plano-puertas", filename, savedPath }], avisos } } };
      }
      await deps.almacen.guardar(pedido);
      // El plano sale ya al guardar, para revisarlo antes de aprobar (como el corte de toldos y remolques).
      const plano = await escribirPlano(pedido, "", false);
      return { status: 200, cuerpo: { ok: true, review: resumenBandeja(pedido), overwritten: Boolean(existente), plano } };
    } finally {
      ocupados.delete(orderCode);
    }
  }

  /**
   * Flujo del DWG, fase 1 (plan del 24/10/2026): el plano del pedido tal como está en pantalla, en la carpeta de
   * borradores, para abrirlo en ZWCAD y perfilarlo. Si ya hay uno, no se pisa: se abre el que hay, salvo que el autor
   * pida generarlo de nuevo (`regenerar`). Devuelve el enlace `tgm-pedidos:` con su ruta de red.
   */
  async function borradorCorte(cuerpo: unknown): Promise<Respuesta> {
    const c = (cuerpo ?? {}) as { pedido?: unknown; savedBy?: unknown; regenerar?: unknown };
    const autor = typeof c.savedBy === "string" ? c.savedBy.trim() : "";
    if (!autor || !deps.tecnicos.includes(autor)) throw new ErrorPedidoRemolques("Elige quién eres en «Soy» antes de abrir el corte.");
    let enviado;
    try {
      enviado = leerPedidoPuertas(c.pedido);
    } catch (error) {
      throw new ErrorPedidoRemolques((error as Error).message);
    }
    const orderCode = codigoPedido(enviado.orderCode);
    exigirOfsPuertas(enviado);
    const errores = generarCortePuertas(enviado).avisos.filter((aviso) => aviso.nivel === "error");
    if (errores.length) {
      throw new ErrorPedidoRemolques(`Antes de abrir el corte, resuelve las comprobaciones: ${errores.slice(0, 3).map((aviso) => aviso.texto).join(" · ")}${errores.length > 3 ? ` (y ${errores.length - 3} más)` : ""}.`);
    }
    if (!deps.plano) throw new ErrorPedidoRemolques("El plano de puertas no está disponible en este servidor.", 404);
    if (ocupados.has(orderCode)) return { status: 409, cuerpo: { error: MENSAJE_OCUPADO } };
    ocupados.set(orderCode, "guardando");
    try {
      const cabecera = validarCabeceraPuertas((c.pedido as { cabecera?: unknown }).cabecera ?? {}, ahora().slice(0, 10));
      const borrador = { ...enviado, orderCode, summary: { customer: cabecera.cliente || cabecera.clienteRps?.nombre || "", technician: autor,
        orderDate: cabecera.fecha } } as unknown as PedidoPuertasGuardado;
      return await flujo.borrador({ orderCode, regenerar: c.regenerar === true, revisado: (await deps.almacen.obtener(orderCode))?.corteConfirmado?.plano,
        preparar: (carpeta) => deps.plano!.preparar(borrador, "", carpeta) });
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
    if (pedido.corteConfirmado) {
      throw new ErrorPedidoRemolques("Este pedido tiene el corte confirmado: su plano es el DWG revisado y se cambia en ZWCAD, la web no lo vuelve a hacer.", 409);
    }
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
      // Con el corte confirmado, el plano es el DWG revisado: no se rehace (perdería los cambios hechos en ZWCAD).
      const confirmado = pedido.corteConfirmado;
      const plano: { files: FicheroPlanoPuertas[]; avisos: string[]; existentes?: string[] } | null = confirmado
        ? (await existeFichero(confirmado.plano)
          ? { files: [{ type: "plano-puertas", filename: confirmado.filename, savedPath: confirmado.plano }], avisos: [] }
          : { files: [], avisos: [`No está el plano revisado ${confirmado.filename} en su carpeta: no se ha generado nada.`] })
        : await escribirPlano(pedido, revisor, confirmar);
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

  /** Fase 3: con el corte confirmado, el DXF del bot sale del DWG revisado tal como está ahora. */
  const corteDelDwg = (pedido: PedidoPuertasGuardado) => flujo.corteDelDwg(pedido.corteConfirmado!);

  /** Un solo DXF por pedido, con las opciones de saco dentro (el técnico de la máquina elige). */
  async function prepararDxf(pedido: PedidoPuertasGuardado): Promise<{ filename: string; contents: Uint8Array }[]> {
    exigirOfsPuertas(pedido);
    if (pedido.corteConfirmado) return [{ filename: `${pedido.orderCode}.dxf`, contents: Buffer.from((await corteDelDwg(pedido)).dxf, "latin1") }];
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
      const c = (cuerpo ?? {}) as { usuario?: unknown; destino?: unknown; confirmBot?: unknown; confirmOverwrite?: unknown; aceptarCambioCorte?: unknown; pdfModo?: unknown };
      const usuario = typeof c.usuario === "string" ? c.usuario.trim() : "";
      if (!deps.tecnicos.includes(usuario)) throw new ErrorPedidoRemolques("Elige quién eres en «Soy» antes de mandar o guardar el corte.");
      const pedido = await obtener(orderCode);
      exigirOfsPuertas(pedido);
      // Si el corte del DWG ya no es el que se confirmó (y revisó), se pregunta antes de mandarlo.
      let nota = "";
      let dwg: Awaited<ReturnType<typeof corteDelDwg>> | null = null;
      if (pedido.corteConfirmado) {
        // Pasado a revisión en CoordinaOT y aprobado otra vez después del cambio: sale sin preguntar.
        const ofs = uniqueOfs(elementosAprobacion(pedido));
        const aprobadoEn = ultimaAprobacion(await deps.coordina.statusOf(ofs, { fresh: true }), ofs);
        const comprobado = await flujo.antesDeMandar(pedido.corteConfirmado, c.aceptarCambioCorte === true, usuario, aprobadoEn);
        if ("respuesta" in comprobado) return comprobado.respuesta;
        ({ dwg, nota } = comprobado);
      }
      // Fase 4: al mandar al bot, las presentaciones del DWG revisado en PDF, en planteamientos como AR…-10.pdf (Iván,
      // 24/10/2026). Se mira antes de mandar nada: si ya hay uno que no hizo la web, se pregunta si es otra parte del pedido.
      let pdf: { ruta: string; numero: number } | null = null;
      if (c.destino === "bot" && dwg && deps.presentacionesPdf) {
        const destino = await destinoPresentaciones(pedido, c.pdfModo);
        if ("respuesta" in destino) return destino.respuesta;
        pdf = destino;
      }
      const respuesta = await enviarCorteCompartido({ nota, pedido, order: { orderCode, technician: pedido.summary.technician }, settings: await deps.ajustes(),
        usuario, destino: c.destino, confirmBot: c.confirmBot === true, confirmOverwrite: c.confirmOverwrite === true,
        elementos: elementosAprobacion(pedido), coordina: deps.coordina, nombres: PUERTA_NOUNS,
        comprobarCorte: () => {}, preparar: () => prepararDxf(pedido),
        guardarRegistro: (actualizado: PedidoPuertasGuardado) => deps.almacen.guardar(actualizado), ahora: reloj });
      if (respuesta.status !== 200 || !pdf || !dwg) return respuesta;
      // El corte ya está en el bot: un fallo del PDF solo se avisa.
      try {
        const aprobacion = elementosAprobacion(pedido);
        const revisor = approvalReviewers(aprobacion, await deps.coordina.statusOf(uniqueOfs(aprobacion)), deps.tecnicos);
        const contenido = await deps.presentacionesPdf!(htmlPresentaciones(conRevisor(dwg.plano, revisor), pedido.numeroPedido));
        await mkdir(path.dirname(pdf.ruta), { recursive: true });
        await writeFileAtomic(pdf.ruta, contenido);
        const presentacionesPdf = { numero: pdf.numero, ruta: pdf.ruta, fecha: ahora() };
        await deps.almacen.guardar({ ...(await obtener(orderCode)), presentacionesPdf });
        // Si el DWG lleva algo que el PDF no sabe dibujar, se dice (Iván, 26/10/2026: «que el PDF lleve todo lo del DWG»).
        const faltan = Object.entries(sinDibujarEnPdf(dwg.plano)).map(([tipo, cuantas]) => `${cuantas} ${tipo}`);
        if (faltan.length) registrar(`Pedido ${orderCode}: el PDF de las presentaciones no lleva ${faltan.join(', ')} del DWG.`);
        return { status: 200, cuerpo: { ...(respuesta.cuerpo as object), presentaciones: { filename: path.basename(pdf.ruta), ruta: pdf.ruta },
          ...(faltan.length ? { avisos: [...((respuesta.cuerpo as { avisos?: string[] }).avisos ?? []),
            `El PDF de las presentaciones no lleva algunas cosas del DWG (${faltan.join(', ')}): revísalo con el DWG.`] } : {}) } };
      } catch (error) {
        registrar(`Pedido ${orderCode}: el corte salió al bot, pero no se pudo guardar el PDF de las presentaciones: ${(error as Error).stack ?? (error as Error).message}`);
        return { status: 200, cuerpo: { ...(respuesta.cuerpo as object), avisos: [`El corte ya está en el bot, pero no se pudo guardar el PDF de las presentaciones: ${(error as Error).message}`] } };
      }
    } finally {
      ocupados.delete(orderCode);
    }
  }

  /**
   * Dónde va el PDF de las presentaciones: el número que ya usó este pedido (lo mismo rehecho sustituye) o el -10; si ese ya
   * existe y no es suyo, se pregunta: sustituirlo o pasar al siguiente libre (otra parte del pedido).
   */
  async function destinoPresentaciones(pedido: PedidoPuertasGuardado, modo: unknown): Promise<{ ruta: string; numero: number } | { respuesta: Respuesta }> {
    const carpeta = (await deps.ajustes()).remolquesPlanteamientosDirectory?.trim();
    if (!carpeta) {
      throw new ErrorPedidoRemolques("Falta la carpeta de planteamientos de remolques en Configuración: allí va el PDF de las presentaciones (AR…-10.pdf). No se ha mandado nada.", 409);
    }
    const base = carpeta.replaceAll("{YYYY}", String(anioDelPlanteamiento(pedido.numeroPedido, pedido.summary.orderDate)));
    const codigo = normalizarNumeroPedido(pedido.numeroPedido) || pedido.orderCode;
    const ruta = (n: number) => path.join(base, `${codigo}-${n}.pdf`);
    const suyo = pedido.presentacionesPdf?.numero;
    if (suyo != null) return { ruta: ruta(suyo), numero: suyo };
    if (!(await existeFichero(ruta(10)))) return { ruta: ruta(10), numero: 10 };
    let siguiente = 11;
    while (await existeFichero(ruta(siguiente))) siguiente += 1;
    if (modo === "siguiente") return { ruta: ruta(siguiente), numero: siguiente };
    if (modo === "sustituir") return { ruta: ruta(10), numero: 10 };
    return { respuesta: { status: 409, cuerpo: { pdfExiste: true, existente: path.basename(ruta(10)), siguiente: path.basename(ruta(siguiente)),
      error: `Ya hay ${path.basename(ruta(10))} de este pedido. Si es de otra parte del pedido, las presentaciones irán en ${path.basename(ruta(siguiente))}; si es lo mismo, se sustituye.` } } };
  }

  return { listar, obtener, guardar, borradorCorte, confirmarCorte, estadoCorte, planoRevision, generar, corte, descargarCorte, enviarCorte };
}
