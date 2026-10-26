import { createHash } from "node:crypto";
import { readdir, readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { carpetaCorte } from "../corteLonaArchivos.js";
import { escribirDxf2004 } from "../domain/corteLona/dxfCorte.js";
import { corteDelPlano, entidadesBot } from "./corteDwg.js";
import { rutaParaTgmPedidos } from "./rutaPc.js";

// El flujo del corte con el DWG que manda (plan del 24/10/2026), común a puertas, remolques y toldos: el borrador del plano
// y «Abrir corte» (fase 1), «Confirmar corte» y el paso del DWG a la carpeta del año al guardar para revisión (fase 2), y el
// DXF del bot sacado del DWG revisado, con aviso si cambió (fase 3). Cada producto da su plano y guarda su pedido.
// Un pedido puede llevar varios planos (toldos: uno por tela y ancho de rollo): se confirman, se guardan y se mandan juntos.

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
  /** Con varios planos (toldos de varias telas), todos; `filename` y `plano` son el primero. */
  planos?: Array<{ filename: string; plano: string }>;
}

type Confirmacion = { huella: string; por: string; fecha: string; filename: string; ficheros?: string[] };

/** Lo confirmado con «Confirmar corte», antes de guardar el pedido (src/flujoDwg/confirmaciones.js). */
export interface ConfirmacionesCorte {
  leer(orderCode: string): Promise<Confirmacion | null>;
  guardar(orderCode: string, datos: Confirmacion): Promise<void>;
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

/** La huella de varios planos juntos; con uno, la suya (así no cambia la de los pedidos de un solo plano). */
const huellaJunta = (huellas: string[]) => huellas.length === 1 ? huellas[0]
  : createHash("sha256").update([...huellas].sort().join("|")).digest("hex");

/** Cuándo se guardó por última vez alguno de los DWG revisados (ms). */
async function ultimoCambio(confirmado: CorteConfirmado) {
  let ultimo = 0;
  for (const p of planosDe(confirmado)) ultimo = Math.max(ultimo, (await stat(p.plano)).mtimeMs);
  return ultimo;
}

/** La última aprobación de las OF del pedido en CoordinaOT (`actualizado` de las aprobadas), o null. */
export function ultimaAprobacion(estado: { ofs?: Record<string, { estado?: string; actualizado?: string | null }> } | null | undefined, ofs: string[]) {
  const fechas = ofs.map((of) => estado?.ofs?.[of]).filter((e) => e?.estado === "aprobada" && e.actualizado).map((e) => e!.actualizado!);
  return fechas.sort().at(-1) ?? null;
}

/** Todos los planos de un corte confirmado. */
export const planosDe = (c: CorteConfirmado) => c.planos?.length ? c.planos : [{ filename: c.filename, plano: c.plano }];

export function crearFlujoDwg(deps: DependenciasFlujoDwg) {
  const registrar = deps.registrar ?? ((mensaje: string) => console.error(mensaje));
  const ahora = () => (deps.ahora ?? (() => new Date()))().toISOString();

  /** En marcha cuando la carpeta de borradores está en Configuración y el servidor sabe leer el plano. Sin ella, todo como antes. */
  const activo = (a: AjustesFlujoDwg) => Boolean(a.corteBorradoresDirectory && a.corteBorradoresRed && deps.leer && deps.confirmaciones);

  /**
   * Los borradores del pedido en su carpeta: `AR….dwg` o, con varios planos, `AR… (…).dwg`; DXF si faltaba ODA al crearlos
   * (con los dos, el DWG). Por nombre, para que el orden sea siempre el mismo.
   */
  async function borradoresDe(carpeta: string, orderCode: string) {
    let nombres: string[];
    try {
      nombres = await readdir(carpeta);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw new ErrorFlujoDwg(`No se puede leer la carpeta ${carpeta}: comprueba que está disponible.`, 503);
    }
    const codigo = orderCode.toUpperCase();
    const delPedido = nombres.filter((n) => /\.(dwg|dxf)$/i.test(n) && [`${codigo}.`, `${codigo} (`].some((p) => n.toUpperCase().startsWith(p)));
    const base = (n: string) => n.slice(0, -4).toUpperCase();
    return delPedido
      .filter((n) => !/\.dxf$/i.test(n) || !delPedido.some((o) => /\.dwg$/i.test(o) && base(o) === base(n)))
      .sort()
      .map((filename) => ({ filename, ruta: path.join(carpeta, filename) }));
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

  /** El corte de varios planos: el primero que falle, con su nombre si hay más de uno, y la huella de todos. */
  async function leerCortes(ficheros: Array<{ filename: string; ruta: string }>) {
    const cortes = [];
    for (const f of ficheros) {
      const corte = await leerCorte(f.ruta);
      if (corte.error) {
        return { error: ficheros.length > 1 ? `${f.filename}: ${corte.error}` : corte.error, fuera: corte.fuera.length, cortes: [], huella: "" };
      }
      cortes.push(corte);
    }
    return { error: null, fuera: 0, cortes, huella: huellaJunta(cortes.map((c) => c.huella ?? "")) };
  }

  /**
   * Fase 1: el plano tal como está en pantalla, en la carpeta de borradores, para abrirlo en ZWCAD y perfilarlo. Si ya hay
   * uno, no se pisa: se abre el que hay, salvo que el autor pida generarlo de nuevo. Al corregir un pedido con el corte
   * confirmado, se sigue desde el DWG revisado (`revisado`). Devuelve el enlace `tgm-pedidos:` con su ruta de red, y con
   * varios planos, el de cada uno en `ficheros`.
   */
  async function borrador({ orderCode, preparar, regenerar = false, revisado }: {
    orderCode: string;
    preparar: (carpeta: string) => Promise<{ fichero?: FicheroPlano | null; ficheros?: FicheroPlano[]; avisos: string[] }>;
    regenerar?: boolean;
    revisado?: string | string[];
  }): Promise<Respuesta> {
    const ajustes = await deps.ajustes();
    if (!ajustes.productionEnabled) throw new ErrorFlujoDwg("Modo simulación: no se ha escrito el borrador del corte.", 403);
    if (!ajustes.corteBorradoresDirectory || !ajustes.corteBorradoresRed) {
      throw new ErrorFlujoDwg("Falta la carpeta de borradores del corte en Configuración (la del servidor y la de red).", 409);
    }
    const carpeta = ajustes.corteBorradoresDirectory;
    const preparado = await preparar(carpeta);
    const { avisos } = preparado;
    const ficheros = preparado.ficheros ?? (preparado.fichero ? [preparado.fichero] : []);
    if (!ficheros.length) throw new ErrorFlujoDwg(avisos.at(-1) ?? "No se pudo preparar el borrador del corte.", 500);
    // La Configuración guardada con la IP o con \\stinkor también abre: se pasa a la ruta de DFS (rutaPc.js).
    const redBase = rutaParaTgmPedidos(ajustes.corteBorradoresRed).replace(/[\\/]+$/, "");
    const enlace = (filename: string) => {
      const ruta = `${redBase}\\${filename}`;
      return { filename, ruta, url: `tgm-pedidos://open?kind=cad&path=${encodeURIComponent(ruta)}` };
    };
    const respuesta = (nombres: string[], extra: object) =>
      ({ status: 200, cuerpo: { ok: true, ...extra, ...enlace(nombres[0]), ...(nombres.length > 1 ? { ficheros: nombres.map(enlace) } : {}), avisos } });
    let existentes = await borradoresDe(carpeta, orderCode);
    const revisados = Array.isArray(revisado) ? revisado : revisado ? [revisado] : [];
    if (!existentes.length && !regenerar && revisados.length) {
      const presentes = [];
      for (const r of revisados) if (await existeFichero(r)) presentes.push(r);
      for (const r of presentes) await deps.escribir({ filename: path.basename(r), savedPath: path.join(carpeta, path.basename(r)), contenido: await readFile(r) });
      if (presentes.length) {
        avisos.push(presentes.length > 1 ? "Son los DWG que se guardaron para revisión." : "Es el DWG que se guardó para revisión.");
        existentes = await borradoresDe(carpeta, orderCode);
      }
    }
    if (existentes.length && !regenerar) return respuesta(existentes.map((e) => e.filename), { existente: true });
    try {
      // Generado de nuevo: fuera los que ya no salen (p. ej. una tela quitada del pedido).
      for (const e of existentes) if (!ficheros.some((f) => f.filename === e.filename)) await rm(e.ruta, { force: true });
      for (const f of ficheros) await deps.escribir(f);
    } catch (error) {
      registrar(`Pedido ${orderCode}: no se pudo escribir el borrador del corte: ${(error as Error).message}`);
      throw new ErrorFlujoDwg(motivoPlano(error, ficheros.map((f) => f.filename).join(" · ")), 500);
    }
    return respuesta(ficheros.map((f) => f.filename), { existente: false, sustituido: existentes.length > 0 });
  }

  /**
   * Fase 2, «Confirmar corte»: lee el borrador tal como lo dejó el autor en ZWCAD, comprueba que el corte está dentro de su
   * recuadro y apunta quién, cuándo y su huella. «Guardar para revisión» exige esta confirmación y que no haya cambiado.
   */
  async function confirmar(orderCode: string, autor: string): Promise<Respuesta> {
    const ajustes = await deps.ajustes();
    if (!activo(ajustes)) throw new ErrorFlujoDwg("Falta la carpeta de borradores del corte en Configuración.", 409);
    const borradores = await borradoresDe(ajustes.corteBorradoresDirectory!, orderCode);
    if (!borradores.length) throw new ErrorFlujoDwg(`No hay borrador del corte de ${orderCode}: pulsa «Abrir corte» para crearlo.`, 409);
    const leido = await leerCortes(borradores);
    if (leido.error) return { status: 409, cuerpo: { error: leido.error, fuera: leido.fuera } };
    const datos: Confirmacion = { huella: leido.huella, por: autor, fecha: ahora(), filename: borradores[0].filename,
      ...(borradores.length > 1 ? { ficheros: borradores.map((b) => b.filename) } : {}) };
    await deps.confirmaciones!.guardar(orderCode, datos);
    return { status: 200, cuerpo: { ok: true, confirmado: datos, entidades: leido.cortes.reduce((n, c) => n + c.entidades.length, 0) } };
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
    const borradores = await borradoresDe(ajustes.corteBorradoresDirectory!, orderCode);
    const confirmacion = await deps.confirmaciones!.leer(orderCode);
    if (!borradores.length || !confirmacion) {
      throw new ErrorFlujoDwg("Antes de guardar para revisión, abre el corte («Abrir corte»), revísalo en ZWCAD y pulsa «Confirmar corte».", 409);
    }
    const leido = await leerCortes(borradores);
    if (leido.error) throw new ErrorFlujoDwg(leido.error, 409);
    if (leido.huella !== confirmacion.huella) {
      throw new ErrorFlujoDwg("El borrador del corte ha cambiado desde que lo confirmaste: revísalo y vuelve a pulsar «Confirmar corte».", 409);
    }
    if (!ajustes.corteLonaPlanoDirectory) throw new ErrorFlujoDwg("Falta la carpeta de planos del corte en Configuración.", 409);
    const carpeta = carpetaCorte(ajustes.corteLonaPlanoDirectory, { orderCode, technician });
    const planos = borradores.map((b) => ({ ...b, plano: path.join(carpeta, b.filename) }));
    if (!confirmOverwrite) {
      const yaEstan = [];
      for (const p of planos) if (await existeFichero(p.plano)) yaEstan.push(p.filename);
      if (yaEstan.length) {
        return { respuesta: { status: 409, cuerpo: { needsConfirmation: true, existing: yaEstan, motivo: "plano",
          error: `${yaEstan.length > 1 ? `Los planos ${yaEstan.join(" · ")} ya están` : `El plano ${yaEstan[0]} ya está`} en su carpeta del año: se sustituirá por el borrador con el corte confirmado.` } } };
      }
    }
    return {
      corteConfirmado: { huella: confirmacion.huella, por: confirmacion.por, fecha: confirmacion.fecha, filename: planos[0].filename, plano: planos[0].plano,
        ...(planos.length > 1 ? { planos: planos.map(({ filename, plano }) => ({ filename, plano })) } : {}) },
      async escribir() {
        for (const p of planos) {
          try {
            await deps.escribir({ filename: p.filename, savedPath: p.plano, contenido: await readFile(p.ruta) });
          } catch (error) {
            registrar(`Pedido ${orderCode}: no se pudo pasar el borrador a su carpeta: ${(error as Error).message}`);
            throw new ErrorFlujoDwg(motivoPlano(error, p.filename), 500);
          }
        }
      },
      async limpiar() {
        try {
          for (const p of planos) await rm(p.ruta, { force: true });
          await deps.confirmaciones!.borrar(orderCode);
          return [];
        } catch (error) {
          registrar(`Pedido ${orderCode}: no se pudo quitar el borrador: ${(error as Error).message}`);
          return [`El plano ya está en su carpeta, pero no se pudo quitar el borrador ${planos.map((p) => p.filename).join(" · ")}: bórralo a mano.`];
        }
      },
    };
  }

  /**
   * Fase 3: el DXF del bot del DWG revisado tal como está ahora (con lo que se haya cambiado en ZWCAD): lo de dentro del
   * recuadro CORTE, en las capas del bot, sin cotas ni recuadro. Con varios planos, uno encima de otro, como las telas del
   * DXF del bot de siempre. También devuelve su huella y los planos en DXF (`plano`, el primero).
   */
  async function corteDelDwg(confirmado: CorteConfirmado) {
    if (!deps.leer) throw new ErrorFlujoDwg("Este servidor no puede leer el plano del corte.", 503);
    const planos = planosDe(confirmado);
    for (const p of planos) {
      if (!(await existeFichero(p.plano))) {
        throw new ErrorFlujoDwg(`No está el plano revisado ${p.filename} en su carpeta: no se puede sacar el corte.`, 409);
      }
    }
    const leido = await leerCortes(planos.map((p) => ({ filename: p.filename, ruta: p.plano })));
    if (leido.error) throw new ErrorFlujoDwg(leido.error, 409);
    const juntos = { lineas: [] as Linea[], textos: [] as Texto[], arcos: [] as Arco[], circulos: [] as Circulo[] };
    let noConvertibles = 0, siguiente = 0;
    for (const corte of leido.cortes) {
      const bot = entidadesBot(corte.entidades) as { lineas: Linea[]; textos: Texto[]; arcos: Arco[]; circulos: Circulo[]; noConvertibles: unknown[] };
      noConvertibles += bot.noConvertibles.length;
      const ys = [...bot.lineas.flatMap((l) => [l.y1, l.y2]), ...bot.textos.map((t) => t.y), ...bot.arcos.flatMap((a) => [a.y - a.r, a.y + a.r]),
        ...bot.circulos.flatMap((c) => [c.y - c.r, c.y + c.r])];
      if (!ys.length) continue;
      const dy = siguiente - Math.min(...ys);
      juntos.lineas.push(...bot.lineas.map((l) => ({ ...l, y1: l.y1 + dy, y2: l.y2 + dy })));
      juntos.textos.push(...bot.textos.map((t) => ({ ...t, y: t.y + dy })));
      juntos.arcos.push(...bot.arcos.map((a) => ({ ...a, y: a.y + dy })));
      juntos.circulos.push(...bot.circulos.map((c) => ({ ...c, y: c.y + dy })));
      siguiente = Math.max(...ys) + dy + 1000;
    }
    if (noConvertibles) {
      throw new ErrorFlujoDwg(`En el recuadro CORTE hay ${noConvertibles} ${noConvertibles === 1 ? "objeto" : "objetos"} que no se pueden mandar al bot (bloques, sombreados…): explótalos o bórralos en ZWCAD.`, 409);
    }
    return { huella: leido.huella, dxf: escribirDxf2004(juntos) as string, plano: leido.cortes[0].dxf, planos: leido.cortes.map((c) => c.dxf) };
  }

  /** Fase 4: los DWG revisados tal como están, en DXF, para imprimir sus presentaciones. */
  async function planosDelDwg(confirmado: CorteConfirmado) {
    if (!deps.leer) throw new ErrorFlujoDwg("Este servidor no puede leer el plano del corte.", 503);
    const planos = [];
    for (const p of planosDe(confirmado)) {
      if (!(await existeFichero(p.plano))) throw new ErrorFlujoDwg(`No está el plano revisado ${p.filename} en su carpeta.`, 409);
      planos.push(await deps.leer(p.plano));
    }
    return planos;
  }

  /**
   * Fase 3, al mandar: si el corte del DWG ya no es el que se confirmó (y revisó), se pregunta; si se acepta, queda la nota.
   * Si hay que revisarlo, se pasa a revisión en CoordinaOT (Iván, 25/10/2026): aprobado otra vez después del último cambio
   * del DWG (`aprobadoEn`, la última aprobación de sus OF), sale sin preguntar.
   */
  async function antesDeMandar(confirmado: CorteConfirmado, aceptarCambio: boolean, usuario: string, aprobadoEn?: string | null):
    Promise<{ respuesta: Respuesta } | { dwg: Awaited<ReturnType<typeof corteDelDwg>>; nota: string }> {
    const dwg = await corteDelDwg(confirmado);
    if (dwg.huella === confirmado.huella) return { dwg, nota: "" };
    const aprobado = aprobadoEn ? Date.parse(aprobadoEn) : NaN;
    if (Number.isFinite(aprobado) && aprobado > await ultimoCambio(confirmado)) {
      return { dwg, nota: "Corte cambiado en el DWG y aprobado de nuevo en CoordinaOT." };
    }
    if (!aceptarCambio) {
      return { respuesta: { status: 409, cuerpo: { cambioCorte: true,
        error: "El corte del DWG ha cambiado desde que se confirmó y se revisó. Si lo mandas, irá con esos cambios y quedará apuntado. Si hay que revisarlo, pásalo a revisión en CoordinaOT: cuando lo aprueben otra vez, saldrá sin preguntar." } } };
    }
    return { dwg, nota: `Corte cambiado en el DWG después de confirmarlo; lo mandó ${usuario} con los cambios.` };
  }

  return { activo, borrador, confirmar, alGuardar, corteDelDwg, planosDelDwg, antesDeMandar };
}

type Linea = { capa: string; x1: number; y1: number; x2: number; y2: number };
type Texto = { capa: string; x: number; y: number; h: number; valor: string };
type Arco = { capa: string; x: number; y: number; r: number; desde: number; hasta: number };
type Circulo = { capa: string; x: number; y: number; r: number };
