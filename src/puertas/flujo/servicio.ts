import { readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { enviarCorte as enviarCorteCompartido } from "../../corteEnvios.js";
import { carpetaCorte } from "../../corteLonaArchivos.js";
import { corteDelPlano } from "../../flujoDwg/corteDwg.js";
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
import type { CorteConfirmado, FicheroPlanoPuertas, PedidoPuertasGuardado, ResumenPedidoPuertas } from "./tipos.ts";

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
    corteBorradoresDirectory?: string; corteBorradoresRed?: string }>;
  coordina: { statusOf(ofs: string[], opciones?: { fresh?: boolean }): Promise<EstadoCoordina> };
  /** La lista de técnicos (la de «Soy»). */
  tecnicos: string[];
  /** La OF de los sacos de stock (src/ofStockSacos.js): sin ella, el corte va sin sacos. */
  ofStockSacos?: () => Promise<{ of: string }>;
  /** El producto con que ya está guardado ese número, si es otro («toldos», «remolques»): nunca hay pedidos mixtos. */
  otroProducto: (orderCode: string) => Promise<string | null>;
  plano?: PlanoPuertas;
  confirmaciones?: ConfirmacionesCorte;
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

  // Flujo del DWG (plan del 24/10/2026): en marcha cuando la carpeta de borradores está en Configuración y el servidor
  // sabe leer el plano y apuntar las confirmaciones. Sin ella, todo como antes.
  type Ajustes = Awaited<ReturnType<DependenciasPedidosPuertas["ajustes"]>>;
  const conFlujoDwg = (a: Ajustes) => Boolean(a.corteBorradoresDirectory && a.corteBorradoresRed && deps.plano?.leer && deps.confirmaciones);

  /** El borrador del pedido en su carpeta: DWG o, si faltaba ODA al crearlo, DXF. */
  async function borradorDe(carpeta: string, orderCode: string) {
    for (const extension of ["dwg", "dxf"]) {
      const filename = `${orderCode}.${extension}`, ruta = path.join(carpeta, filename);
      if (await existeFichero(ruta)) return { ruta, filename };
    }
    return null;
  }

  async function corteDeBorrador(ruta: string) {
    let dxf: string;
    try {
      dxf = await deps.plano!.leer!(ruta);
    } catch (error) {
      registrar(`No se pudo leer el borrador del corte ${ruta}: ${(error as Error).message}`);
      throw new ErrorPedidoRemolques(`No se pudo leer el borrador del corte: ${(error as Error).message}`, 503);
    }
    return corteDelPlano(dxf) as { error: string | null; huella?: string; fuera: unknown[]; entidades: Array<{ capa: string }> };
  }

  /**
   * «Confirmar corte» (fase 2): lee el borrador tal como lo dejó el autor en ZWCAD, comprueba que el corte está dentro de su
   * recuadro y apunta quién, cuándo y su huella. «Guardar para revisión» exige esta confirmación y que no haya cambiado.
   */
  async function confirmarCorte(cuerpo: unknown): Promise<Respuesta> {
    const c = (cuerpo ?? {}) as { orderCode?: unknown; savedBy?: unknown };
    const autor = typeof c.savedBy === "string" ? c.savedBy.trim() : "";
    if (!autor || !deps.tecnicos.includes(autor)) throw new ErrorPedidoRemolques("Elige quién eres en «Soy» antes de confirmar el corte.");
    const orderCode = codigoPedido(typeof c.orderCode === "string" ? c.orderCode : "");
    const ajustes = await deps.ajustes();
    if (!conFlujoDwg(ajustes)) throw new ErrorPedidoRemolques("Falta la carpeta de borradores del corte en Configuración.", 409);
    const borrador = await borradorDe(ajustes.corteBorradoresDirectory!, orderCode);
    if (!borrador) throw new ErrorPedidoRemolques(`No hay borrador del corte de ${orderCode}: pulsa «Abrir corte» para crearlo.`, 409);
    const corte = await corteDeBorrador(borrador.ruta);
    if (corte.error) return { status: 409, cuerpo: { error: corte.error, fuera: corte.fuera.length } };
    const datos = { huella: corte.huella!, por: autor, fecha: ahora(), filename: borrador.filename };
    await deps.confirmaciones!.guardar(orderCode, datos);
    return { status: 200, cuerpo: { ok: true, confirmado: datos, entidades: corte.entidades.length } };
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
      const ajustes = await deps.ajustes();
      if (conFlujoDwg(ajustes)) {
        // Flujo del DWG (fase 2): solo con el corte confirmado y sin cambios desde entonces; el borrador pasa a la carpeta del
        // año, donde lo abre el revisor, y la web ya no genera el plano.
        const borrador = await borradorDe(ajustes.corteBorradoresDirectory!, orderCode);
        const confirmacion = await deps.confirmaciones!.leer(orderCode);
        if (!borrador || !confirmacion) {
          throw new ErrorPedidoRemolques("Antes de guardar para revisión, abre el corte («Abrir corte»), revísalo en ZWCAD y pulsa «Confirmar corte».", 409);
        }
        const corte = await corteDeBorrador(borrador.ruta);
        if (corte.error) throw new ErrorPedidoRemolques(corte.error, 409);
        if (corte.huella !== confirmacion.huella) {
          throw new ErrorPedidoRemolques("El borrador del corte ha cambiado desde que lo confirmaste: revísalo y vuelve a pulsar «Confirmar corte».", 409);
        }
        if (!ajustes.corteLonaPlanoDirectory) throw new ErrorPedidoRemolques("Falta la carpeta de planos del corte en Configuración.", 409);
        const destino = path.join(carpetaCorte(ajustes.corteLonaPlanoDirectory, { orderCode, technician: autoria.technician }), borrador.filename);
        if (c.confirmOverwrite !== true && await existeFichero(destino)) {
          return { status: 409, cuerpo: { needsConfirmation: true, existing: [borrador.filename], motivo: "plano",
            error: `El plano ${borrador.filename} ya está en su carpeta del año: se sustituirá por el borrador con el corte confirmado.` } };
        }
        try {
          await deps.plano!.escribir({ type: "plano-puertas", filename: borrador.filename, savedPath: destino, contenido: await readFile(borrador.ruta) });
        } catch (error) {
          registrar(`Pedido ${orderCode}: no se pudo pasar el borrador a su carpeta: ${(error as Error).message}`);
          throw new ErrorPedidoRemolques(motivoPlano(error, borrador.filename), 500);
        }
        const corteConfirmado: CorteConfirmado = { huella: confirmacion.huella, por: confirmacion.por, fecha: confirmacion.fecha, filename: borrador.filename, plano: destino };
        const conCorte = { ...pedido, corteConfirmado };
        await deps.almacen.guardar(conCorte);
        // El borrador ya está en la carpeta del año: se quita de borradores, con su confirmación.
        const avisos: string[] = [];
        try {
          await rm(borrador.ruta, { force: true });
          await deps.confirmaciones!.borrar(orderCode);
        } catch (error) {
          registrar(`Pedido ${orderCode}: no se pudo quitar el borrador ${borrador.ruta}: ${(error as Error).message}`);
          avisos.push(`El plano ya está en su carpeta, pero no se pudo quitar el borrador ${borrador.filename}: bórralo a mano.`);
        }
        const plano = { files: [{ type: "plano-puertas", filename: borrador.filename, savedPath: destino }], avisos };
        return { status: 200, cuerpo: { ok: true, review: resumenBandeja(conCorte), overwritten: Boolean(existente), plano } };
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
    const ajustes = await deps.ajustes();
    if (!ajustes.productionEnabled) throw new ErrorPedidoRemolques("Modo simulación: no se ha escrito el borrador del corte.", 403);
    if (!ajustes.corteBorradoresDirectory || !ajustes.corteBorradoresRed) {
      throw new ErrorPedidoRemolques("Falta la carpeta de borradores del corte en Configuración (la del servidor y la de red).", 409);
    }
    if (!deps.plano) throw new ErrorPedidoRemolques("El plano de puertas no está disponible en este servidor.", 404);
    if (ocupados.has(orderCode)) return { status: 409, cuerpo: { error: MENSAJE_OCUPADO } };
    ocupados.set(orderCode, "guardando");
    try {
      const cabecera = validarCabeceraPuertas((c.pedido as { cabecera?: unknown }).cabecera ?? {}, ahora().slice(0, 10));
      const borrador = { ...enviado, orderCode, summary: { customer: cabecera.cliente || cabecera.clienteRps?.nombre || "", technician: autor,
        orderDate: cabecera.fecha } } as unknown as PedidoPuertasGuardado;
      const { fichero, avisos } = await deps.plano.preparar(borrador, "", ajustes.corteBorradoresDirectory);
      if (!fichero) throw new ErrorPedidoRemolques(avisos.at(-1) ?? "No se pudo preparar el borrador del corte.", 500);
      const red = `${ajustes.corteBorradoresRed.replace(/[\\/]+$/, "")}\\${fichero.filename}`;
      const url = `tgm-pedidos://open?kind=cad&path=${encodeURIComponent(red)}`;
      let existe = await existeFichero(fichero.savedPath);
      // Al corregir un pedido guardado con el corte confirmado, se sigue desde el DWG revisado: vuelve a borradores.
      if (!existe && c.regenerar !== true) {
        const revisado = (await deps.almacen.obtener(orderCode))?.corteConfirmado?.plano;
        if (revisado && path.extname(revisado).toLowerCase() === path.extname(fichero.filename).toLowerCase() && await existeFichero(revisado)) {
          await deps.plano.escribir({ ...fichero, contenido: await readFile(revisado) });
          avisos.push("Es el DWG que se guardó para revisión.");
          existe = true;
        }
      }
      if (existe && c.regenerar !== true) return { status: 200, cuerpo: { ok: true, existente: true, filename: fichero.filename, ruta: red, url, avisos } };
      try {
        await deps.plano.escribir(fichero);
      } catch (error) {
        registrar(`Pedido ${orderCode}: no se pudo escribir el borrador del corte: ${(error as Error).message}`);
        throw new ErrorPedidoRemolques(motivoPlano(error, fichero.filename), 500);
      }
      return { status: 200, cuerpo: { ok: true, existente: false, sustituido: existe, filename: fichero.filename, ruta: red, url, avisos } };
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

  return { listar, obtener, guardar, borradorCorte, confirmarCorte, planoRevision, generar, corte, descargarCorte, enviarCorte };
}
