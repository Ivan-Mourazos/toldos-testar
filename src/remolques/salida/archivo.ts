import path from "node:path";
import { access, copyFile, link, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { anioDelPlanteamiento, nombrePdf } from "./nombre-pdf.ts";

// Archivo de la hoja de taller de remolques en las dos carpetas de siempre (fase 4; lo llama la
// fase 5 al pasar a producción): `AR…-10.pdf` en la de planteamientos (la que procesa RPS) y
// `<año>/AR….pdf` en la de oficina técnica. Las carpetas salen de Configuración (plantillas con
// {YYYY}, como las de toldos). Escritura atómica: las dos copias o ninguna.

/** Lo que el archivo necesita de la configuración del flujo (Configuración → Rutas de trabajo). */
export interface CarpetasRemolques {
  productionEnabled: boolean;
  remolquesPlanteamientosDirectory: string;
  remolquesOficinaTecnicaDirectory: string;
}

type CodigoArchivo =
  | "ESCRITURA_DESACTIVADA" | "SIN_CARPETAS" | "RUTA_NO_VALIDA" | "PEDIDO_NO_VALIDO"
  | "NO_ES_PDF" | "CARPETA_NO_DISPONIBLE" | "PDF_EXISTENTE" | "ARCHIVO_INCOMPLETO";

export class ErrorArchivoPdf extends Error {
  statusCode: number;
  codigo: CodigoArchivo;
  constructor(mensaje: string, statusCode: number, codigo: CodigoArchivo) {
    super(mensaje);
    this.name = "ErrorArchivoPdf";
    this.statusCode = statusCode;
    this.codigo = codigo;
  }
}

export const mensajeCarpetaNoDisponible = (raiz: string) => `La carpeta de archivo no está disponible o no permite escribir: ${raiz}`;
export const MENSAJE_PDF_EXISTENTE = "Ya existe un PDF de este pedido en las carpetas de archivo. Se sustituirán las dos copias.";

/** La parte fija de una plantilla, hasta el primer {YYYY}: tiene que existir (es el montaje de red). */
export function raizPlantilla(plantilla: string): string {
  const i = plantilla.indexOf("{YYYY}");
  return i < 0 ? plantilla : path.dirname(`${plantilla.slice(0, i)}x`);
}

export function destinosPdfRemolques(
  numeroPedido: string,
  fecha: string,
  carpetas: Omit<CarpetasRemolques, "productionEnabled">,
  ahora = new Date(),
): { nombre: string; anio: number; destinos: [string, string]; raices: [string, string] } {
  const planteamientos = carpetas.remolquesPlanteamientosDirectory.trim();
  const oficina = carpetas.remolquesOficinaTecnicaDirectory.trim();
  if (!planteamientos || !oficina) {
    throw new ErrorArchivoPdf("Faltan las carpetas de remolques en Configuración (planteamientos y oficina técnica). No se ha guardado el PDF.", 400, "SIN_CARPETAS");
  }
  const raices: [string, string] = [raizPlantilla(planteamientos), raizPlantilla(oficina)];
  if (!raices.every((raiz) => path.isAbsolute(raiz))) {
    throw new ErrorArchivoPdf("Las carpetas de remolques deben ser rutas absolutas del servidor.", 400, "RUTA_NO_VALIDA");
  }
  if (!oficina.includes("{YYYY}")) {
    throw new ErrorArchivoPdf("La carpeta de oficina técnica de remolques debe llevar {YYYY}: el PDF va en <año>/PEDIDO.pdf.", 400, "RUTA_NO_VALIDA");
  }
  const nombre = nombrePdf(numeroPedido);
  if (!/^[A-Z0-9]+-10\.pdf$/.test(nombre) || nombre.startsWith("SIN-PEDIDO")) {
    throw new ErrorArchivoPdf("El número de pedido no es válido para archivar el PDF.", 400, "PEDIDO_NO_VALIDO");
  }
  const anio = anioDelPlanteamiento(numeroPedido, fecha, ahora);
  const conAnio = (plantilla: string) => plantilla.replaceAll("{YYYY}", String(anio));
  return {
    nombre,
    anio,
    destinos: [path.join(conAnio(planteamientos), nombre), path.join(conAnio(oficina), nombre.replace(/-10\.pdf$/, ".pdf"))],
    raices,
  };
}

async function existe(fichero: string): Promise<boolean> {
  try {
    const datos = await stat(fichero);
    if (!datos.isFile()) throw new Error(`El destino no es un archivo: ${fichero}`);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

/** Errores de link que significan «este sistema de archivos no admite enlaces duros» (p. ej. CIFS). */
const LINK_NO_SOPORTADO = new Set(["EPERM", "ENOTSUP", "EOPNOTSUPP", "EXDEV", "EINVAL", "ENOSYS"]);

/**
 * Publica sin sustituir: link es atómico y falla con EEXIST si el destino ya existe (un archivo
 * que haya aparecido desde la comprobación). Si el sistema no admite enlaces, se copia con
 * COPYFILE_EXCL y se comprueba lo copiado. El temporal lo borra quien llama.
 */
async function publicarSinSustituir(temporal: string, destino: string, contenido: Uint8Array): Promise<void> {
  try {
    await link(temporal, destino);
    return;
  } catch (error) {
    if (!LINK_NO_SOPORTADO.has((error as NodeJS.ErrnoException).code ?? "")) throw error;
  }
  await copyFile(temporal, destino, constants.COPYFILE_EXCL);
  if (!Buffer.from(await readFile(destino)).equals(Buffer.from(contenido))) {
    // Se publicó mal: se quita aquí mismo, que quien llama aún no lo tiene en su lista.
    await rm(destino, { force: true });
    throw new Error(`La copia del PDF no coincide: ${destino}`);
  }
}

export async function archivarPdfRemolques(
  contenido: Uint8Array,
  pedido: { numeroPedido: string; fecha: string },
  carpetas: CarpetasRemolques,
  opciones: { sustituir?: boolean; ahora?: Date } = {},
): Promise<{ nombre: string; anio: number; destinos: string[]; sustituido: boolean }> {
  if (!carpetas.productionEnabled) {
    throw new ErrorArchivoPdf("La escritura de archivos está desactivada en Configuración: no se ha guardado el PDF.", 403, "ESCRITURA_DESACTIVADA");
  }
  if (Buffer.from(contenido.subarray(0, 4)).toString("ascii") !== "%PDF") {
    throw new ErrorArchivoPdf("Lo que se iba a archivar no es un PDF.", 400, "NO_ES_PDF");
  }
  const { nombre, anio, destinos, raices } = destinosPdfRemolques(pedido.numeroPedido, pedido.fecha, carpetas, opciones.ahora);
  // Las raíces deben existir: no crear una carpeta local si falta el montaje de red.
  for (const raiz of raices) {
    try {
      if (!(await stat(raiz)).isDirectory()) throw new Error("No es una carpeta");
      await access(raiz, constants.W_OK);
    } catch {
      throw new ErrorArchivoPdf(mensajeCarpetaNoDisponible(raiz), 503, "CARPETA_NO_DISPONIBLE");
    }
  }
  for (const destino of destinos) await mkdir(path.dirname(destino), { recursive: true });
  const anteriores = await Promise.all(destinos.map(existe));
  if (anteriores.some(Boolean) && !opciones.sustituir) throw new ErrorArchivoPdf(MENSAJE_PDF_EXISTENTE, 409, "PDF_EXISTENTE");

  const marca = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const temporales = destinos.map((d) => `${d}.${marca}.tmp`);
  const copias = destinos.map((d) => `${d}.${marca}.bak`);
  const escritos: number[] = [];
  try {
    // Preparar ambas copias y comprobar sus bytes antes de tocar los PDF publicados: si algo no
    // cuadra, no se ha publicado nada.
    for (let i = 0; i < destinos.length; i++) {
      await writeFile(temporales[i], contenido, { flag: "wx" });
      if (!Buffer.from(await readFile(temporales[i])).equals(Buffer.from(contenido))) {
        throw new Error(`La copia temporal del PDF no coincide: ${temporales[i]}`);
      }
      if (anteriores[i]) await copyFile(destinos[i], copias[i], constants.COPYFILE_EXCL);
    }
    for (let i = 0; i < destinos.length; i++) {
      if (opciones.sustituir) await rename(temporales[i], destinos[i]);
      else await publicarSinSustituir(temporales[i], destinos[i], contenido);
      escritos.push(i);
    }
  } catch (error) {
    const fallos: string[] = [];
    for (const i of escritos.reverse()) {
      try {
        if (anteriores[i]) await rename(copias[i], destinos[i]);
        else await rm(destinos[i], { force: true });
      } catch {
        fallos.push(destinos[i]);
      }
    }
    if (fallos.length) {
      // Con su código: quien genera tiene que leer este texto, no el genérico de fallo del servidor.
      throw new ErrorArchivoPdf(
        `Archivo incompleto. Revisa ${fallos.join(", ")}; se conservan las copias .bak para recuperar los PDF anteriores.`,
        500,
        "ARCHIVO_INCOMPLETO",
      );
    }
    await Promise.all(copias.map((d) => rm(d, { force: true }).catch(() => {})));
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new ErrorArchivoPdf(MENSAJE_PDF_EXISTENTE, 409, "PDF_EXISTENTE");
    throw error;
  } finally {
    await Promise.all(temporales.map((d) => rm(d, { force: true }).catch(() => {})));
  }
  await Promise.all(copias.map((d) => rm(d, { force: true }).catch(() => {})));
  return { nombre, anio, destinos, sustituido: anteriores.some(Boolean) };
}
