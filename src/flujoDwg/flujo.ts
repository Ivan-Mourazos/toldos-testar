import { readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { carpetaCorte } from "../corteLonaArchivos.js";
import { escribirDxf2004 } from "../domain/corteLona/dxfCorte.js";
import { corteDelPlano, entidadesBot } from "./corteDwg.js";

// El flujo del corte con el DWG que manda (plan del 24/10/2026), común a puertas, remolques y toldos: el borrador del plano
// y «Abrir corte» (fase 1), «Confirmar corte» y el paso del DWG a la carpeta del año al guardar para revisión (fase 2), y el
// DXF del bot sacado del DWG revisado, con aviso si cambió (fase 3). Cada producto da su plano y guarda su pedido.

/** Un fallo con su código HTTP, como los de los pedidos. */
export class ErrorFlujoDwg extends Error {
  statusCode: number;
  // Sin «public statusCode» en el constructor: los scripts cargan este fichero con Node, que solo quita los tipos.
  constructor(mensaje: string, statusCode = 400) {
    super(mensaje);
    this.name = "ErrorFlujoDwg";
    this.statusCode = statusCode;
  }
}

export interface FicheroPlano { filename: string; savedPath: string; contenido: Uint8Array }

/** El corte que confirmó el autor y dónde quedó el DWG al guardar para revisión. */
export interface CorteConfirmado {
  huella: string;
  por: string;
  fecha: string;
  filename: string;
  /** El DWG en la carpeta del año, el que abre el revisor. */
  plano: string;
}

/** Lo confirmado con «Confirmar corte», antes de guardar el pedido (src/flujoDwg/confirmaciones.js). */
export interface ConfirmacionesCorte {
  leer(orderCode: string): Promise<{ huella: string; por: string; fecha: string; filename: string } | null>;
  guardar(orderCode: string, datos: { huella: string; por: string; fecha: string; filename: string }): Promise<void>;
  borrar(orderCode: string): Promise<void>;
}

export interface AjustesFlujoDwg {
  productionEnabled?: boolean;
  corteBorradoresDirectory?: string;
  corteBorradoresRed?: string;
  corteLonaPlanoDirectory?: string;
}

export interface DependenciasFlujoDwg {
  ajustes: () => Promise<AjustesFlujoDwg>;
  /** El plano de una carpeta en DXF (el DWG pasado por ODA). Sin él, el flujo no está en marcha. */
  leer?: (ruta: string) => Promise<string>;
  /** Escribe un plano en su carpeta (creándola si falta). */
  escribir: (fichero: FicheroPlano) => Promise<void>;
  confirmaciones?: ConfirmacionesCorte;
  registrar?: (mensaje: string) => void;
  ahora?: () => Date;
}

type Respuesta = { status: number; cuerpo: unknown };

export async function existeFichero(fichero: string): Promise<boolean> {
  try {
    return (await stat(fichero)).isFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw new ErrorFlujoDwg(`No se puede leer la carpeta ${path.dirname(fichero)}: comprueba que está disponible.`, 503);
  }
}

/** Por qué no se pudo escribir un plano, en palabras de la oficina. */
export function motivoPlano(error: unknown, nombre: string): string {
  const codigo = (error as NodeJS.ErrnoException).code;
  if (codigo === "EACCES" || codigo === "EPERM") {
    return `No se pudo sustituir ${nombre}: el servidor no tiene permiso para cambiar el plano que hay (lo hizo otra persona). Bórralo o cámbiale el nombre y vuelve a intentarlo.`;
  }
  if (codigo === "EBUSY") return `No se pudo sustituir ${nombre}: está abierto (quizá en AutoCAD o ZWCAD). Ciérralo y vuelve a intentarlo.`;
  return "No se pudo escribir el plano en su carpeta.";
}

export function crearFlujoDwg(deps: DependenciasFlujoDwg) {
  const registrar = deps.registrar ?? ((mensaje: string) => console.error(mensaje));
  const ahora = () => (deps.ahora ?? (() => new Date()))().toISOString();

  /** En marcha cuando la carpeta de borradores está en Configuración y el servidor sabe leer el plano. Sin ella, todo como antes. */
  const activo = (a: AjustesFlujoDwg) => Boolean(a.corteBorradoresDirectory && a.corteBorradoresRed && deps.leer && deps.confirmaciones);

  /** El borrador del pedido en su carpeta: DWG o, si faltaba ODA al crearlo, DXF. */
  async function borradorDe(carpeta: string, orderCode: string) {
    for (const extension of ["dwg", "dxf"]) {
      const filename = `${orderCode}.${extension}`, ruta = path.join(carpeta, filename);
      if (await existeFichero(ruta)) return { ruta, filename };
    }
    return null;
  }

  async function leerCorte(ruta: string) {
    let dxf: string;
    try {
      dxf = await deps.leer!(ruta);
    } catch (error) {
      registrar(`No se pudo leer el plano del corte ${ruta}: ${(error as Error).message}`);
      throw new ErrorFlujoDwg(`No se pudo leer el plano del corte: ${(error as Error).message}`, 503);
    }
    return { ...(corteDelPlano(dxf) as { error: string | null; huella?: string; fuera: unknown[]; entidades: Array<{ capa: string }> }), dxf };
  }

  /**
   * Fase 1: el plano tal como está en pantalla, en la carpeta de borradores, para abrirlo en ZWCAD y perfilarlo. Si ya hay
   * uno, no se pisa: se abre el que hay, salvo que el autor pida generarlo de nuevo. Al corregir un pedido con el corte
   * confirmado, se sigue desde el DWG revisado (`revisado`). Devuelve el enlace `tgm-pedidos:` con su ruta de red.
   */
  async function borrador({ orderCode, preparar, regenerar = false, revisado }: {
    orderCode: string;
    preparar: (carpeta: string) => Promise<{ fichero: FicheroPlano | null; avisos: string[] }>;
    regenerar?: boolean;
    revisado?: string;
  }): Promise<Respuesta> {
    const ajustes = await deps.ajustes();
    if (!ajustes.productionEnabled) throw new ErrorFlujoDwg("Modo simulación: no se ha escrito el borrador del corte.", 403);
    if (!ajustes.corteBorradoresDirectory || !ajustes.corteBorradoresRed) {
      throw new ErrorFlujoDwg("Falta la carpeta de borradores del corte en Configuración (la del servidor y la de red).", 409);
    }
    const { fichero, avisos } = await preparar(ajustes.corteBorradoresDirectory);
    if (!fichero) throw new ErrorFlujoDwg(avisos.at(-1) ?? "No se pudo preparar el borrador del corte.", 500);
    const red = `${ajustes.corteBorradoresRed.replace(/[\\/]+$/, "")}\\${fichero.filename}`;
    const url = `tgm-pedidos://open?kind=cad&path=${encodeURIComponent(red)}`;
    let existe = await existeFichero(fichero.savedPath);
    if (!existe && !regenerar && revisado && path.extname(revisado).toLowerCase() === path.extname(fichero.filename).toLowerCase() && await existeFichero(revisado)) {
      await deps.escribir({ ...fichero, contenido: await readFile(revisado) });
      avisos.push("Es el DWG que se guardó para revisión.");
      existe = true;
    }
    if (existe && !regenerar) return { status: 200, cuerpo: { ok: true, existente: true, filename: fichero.filename, ruta: red, url, avisos } };
    try {
      await deps.escribir(fichero);
    } catch (error) {
      registrar(`Pedido ${orderCode}: no se pudo escribir el borrador del corte: ${(error as Error).message}`);
      throw new ErrorFlujoDwg(motivoPlano(error, fichero.filename), 500);
    }
    return { status: 200, cuerpo: { ok: true, existente: false, sustituido: existe, filename: fichero.filename, ruta: red, url, avisos } };
  }

  /**
   * Fase 2, «Confirmar corte»: lee el borrador tal como lo dejó el autor en ZWCAD, comprueba que el corte está dentro de su
   * recuadro y apunta quién, cuándo y su huella. «Guardar para revisión» exige esta confirmación y que no haya cambiado.
   */
  async function confirmar(orderCode: string, autor: string): Promise<Respuesta> {
    const ajustes = await deps.ajustes();
    if (!activo(ajustes)) throw new ErrorFlujoDwg("Falta la carpeta de borradores del corte en Configuración.", 409);
    const borradorActual = await borradorDe(ajustes.corteBorradoresDirectory!, orderCode);
    if (!borradorActual) throw new ErrorFlujoDwg(`No hay borrador del corte de ${orderCode}: pulsa «Abrir corte» para crearlo.`, 409);
    const corte = await leerCorte(borradorActual.ruta);
    if (corte.error) return { status: 409, cuerpo: { error: corte.error, fuera: corte.fuera.length } };
    const datos = { huella: corte.huella!, por: autor, fecha: ahora(), filename: borradorActual.filename };
    await deps.confirmaciones!.guardar(orderCode, datos);
    return { status: 200, cuerpo: { ok: true, confirmado: datos, entidades: corte.entidades.length } };
  }

  /**
   * Fase 2, al guardar para revisión: solo con el corte confirmado y sin cambios desde entonces. Devuelve la pregunta si el
   * plano ya está en la carpeta del año, o cómo terminar: `escribir` lo deja en su carpeta (antes de guardar el pedido) y
   * `limpiar` quita el borrador y su confirmación (después). Null si el flujo no está en marcha: todo como antes.
   */
  async function alGuardar({ orderCode, technician, confirmOverwrite }: { orderCode: string; technician: string; confirmOverwrite: boolean }):
    Promise<null | { respuesta: Respuesta } | { corteConfirmado: CorteConfirmado; escribir: () => Promise<void>; limpiar: () => Promise<string[]> }> {
    const ajustes = await deps.ajustes();
    if (!activo(ajustes)) return null;
    const borradorActual = await borradorDe(ajustes.corteBorradoresDirectory!, orderCode);
    const confirmacion = await deps.confirmaciones!.leer(orderCode);
    if (!borradorActual || !confirmacion) {
      throw new ErrorFlujoDwg("Antes de guardar para revisión, abre el corte («Abrir corte»), revísalo en ZWCAD y pulsa «Confirmar corte».", 409);
    }
    const corte = await leerCorte(borradorActual.ruta);
    if (corte.error) throw new ErrorFlujoDwg(corte.error, 409);
    if (corte.huella !== confirmacion.huella) {
      throw new ErrorFlujoDwg("El borrador del corte ha cambiado desde que lo confirmaste: revísalo y vuelve a pulsar «Confirmar corte».", 409);
    }
    if (!ajustes.corteLonaPlanoDirectory) throw new ErrorFlujoDwg("Falta la carpeta de planos del corte en Configuración.", 409);
    const destino = path.join(carpetaCorte(ajustes.corteLonaPlanoDirectory, { orderCode, technician }), borradorActual.filename);
    if (!confirmOverwrite && await existeFichero(destino)) {
      return { respuesta: { status: 409, cuerpo: { needsConfirmation: true, existing: [borradorActual.filename], motivo: "plano",
        error: `El plano ${borradorActual.filename} ya está en su carpeta del año: se sustituirá por el borrador con el corte confirmado.` } } };
    }
    return {
      corteConfirmado: { huella: confirmacion.huella, por: confirmacion.por, fecha: confirmacion.fecha, filename: borradorActual.filename, plano: destino },
      async escribir() {
        try {
          await deps.escribir({ filename: borradorActual.filename, savedPath: destino, contenido: await readFile(borradorActual.ruta) });
        } catch (error) {
          registrar(`Pedido ${orderCode}: no se pudo pasar el borrador a su carpeta: ${(error as Error).message}`);
          throw new ErrorFlujoDwg(motivoPlano(error, borradorActual.filename), 500);
        }
      },
      async limpiar() {
        try {
          await rm(borradorActual.ruta, { force: true });
          await deps.confirmaciones!.borrar(orderCode);
          return [];
        } catch (error) {
          registrar(`Pedido ${orderCode}: no se pudo quitar el borrador ${borradorActual.ruta}: ${(error as Error).message}`);
          return [`El plano ya está en su carpeta, pero no se pudo quitar el borrador ${borradorActual.filename}: bórralo a mano.`];
        }
      },
    };
  }

  /**
   * Fase 3: el DXF del bot del DWG revisado tal como está ahora (con lo que se haya cambiado en ZWCAD): lo de dentro del
   * recuadro CORTE, en las capas del bot, sin cotas ni recuadro. También devuelve su huella y el plano en DXF.
   */
  async function corteDelDwg(confirmado: CorteConfirmado) {
    if (!deps.leer) throw new ErrorFlujoDwg("Este servidor no puede leer el plano del corte.", 503);
    if (!(await existeFichero(confirmado.plano))) {
      throw new ErrorFlujoDwg(`No está el plano revisado ${confirmado.filename} en su carpeta: no se puede sacar el corte.`, 409);
    }
    const corte = await leerCorte(confirmado.plano);
    if (corte.error) throw new ErrorFlujoDwg(corte.error, 409);
    const bot = entidadesBot(corte.entidades);
    if (bot.noConvertibles.length) {
      throw new ErrorFlujoDwg(`En el recuadro CORTE hay ${bot.noConvertibles.length} ${bot.noConvertibles.length === 1 ? "objeto" : "objetos"} que no se pueden mandar al bot (bloques, sombreados…): explótalos o bórralos en ZWCAD.`, 409);
    }
    return { huella: corte.huella ?? "", dxf: escribirDxf2004(bot) as string, plano: corte.dxf };
  }

  /** Fase 3, al mandar: si el corte del DWG ya no es el que se confirmó (y revisó), se pregunta; si se acepta, queda la nota. */
  async function antesDeMandar(confirmado: CorteConfirmado, aceptarCambio: boolean, usuario: string):
    Promise<{ respuesta: Respuesta } | { dwg: Awaited<ReturnType<typeof corteDelDwg>>; nota: string }> {
    const dwg = await corteDelDwg(confirmado);
    if (dwg.huella === confirmado.huella) return { dwg, nota: "" };
    if (!aceptarCambio) {
      return { respuesta: { status: 409, cuerpo: { cambioCorte: true,
        error: "El corte del DWG ha cambiado desde que se confirmó y se revisó. Si lo mandas, irá con esos cambios y quedará apuntado." } } };
    }
    return { dwg, nota: `Corte cambiado en el DWG después de confirmarlo; lo mandó ${usuario} con los cambios.` };
  }

  return { activo, borrador, confirmar, alGuardar, corteDelDwg, antesDeMandar };
}
