// Detección de cambios hechos a mano en el DWG (ZWCAD) después de que la web lo escribiera.
// La huella de los bytes distingue una edición de un cambio en los metadatos del fichero.
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { planosDe, type CorteConfirmado } from '../flujoDwg/flujo.ts';

export interface RegistroArchivoEscrito {
  filename: string;
  plano: string;
  sha256: string;
  mtimeMs: number;
  size: number;
}

export interface CorteConfirmadoConEscritos extends CorteConfirmado {
  archivosEscritos?: RegistroArchivoEscrito[];
}

export interface AlmacenEscritos {
  leer(clave: string): Promise<{ archivosEscritos?: RegistroArchivoEscrito[]; fecha?: string } | null>;
  guardar(clave: string, datos: { archivosEscritos: RegistroArchivoEscrito[]; fecha: string; huella: string; por: string; filename: string }): Promise<void>;
  borrar(clave: string): Promise<void>;
}

export const MENSAJE_CAMBIOS_A_MANO = 'El DWG tiene cambios hechos a mano; si regeneras se pierden';

const claveEscritosBorrador = (orderCode: string) => `${orderCode}-escritos`;
const rutaNormal = (ruta: string) => path.resolve(ruta).toLowerCase();

/** Huella SHA-256 de los bytes de un archivo en disco junto a su mtime y tamaño. */
export async function huellaArchivoEnDisco(ruta: string, filename = path.basename(ruta)): Promise<RegistroArchivoEscrito | null> {
  try {
    const [info, bytes] = await Promise.all([fs.stat(ruta), fs.readFile(ruta)]);
    if (!info.isFile()) return null;
    return {
      filename,
      plano: ruta,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      mtimeMs: info.mtimeMs,
      size: info.size
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

/** Registra los archivos escritos por la web para un corte confirmado (revisado). */
export async function registrarArchivosEscritos(planos: Array<{ filename: string; plano: string }>): Promise<RegistroArchivoEscrito[]> {
  const registros: RegistroArchivoEscrito[] = [];
  for (const p of planos) {
    const reg = await huellaArchivoEnDisco(p.plano, p.filename);
    if (reg) registros.push(reg);
  }
  return registros;
}

/** Apunta los archivos recién escritos en la carpeta de borradores para detectar ediciones en ZWCAD. */
export async function guardarEscritosBorrador(
  almacen: AlmacenEscritos | undefined,
  orderCode: string,
  planos: Array<{ filename: string; plano: string }>,
  ahora = new Date().toISOString()
): Promise<RegistroArchivoEscrito[]> {
  const registros = await registrarArchivosEscritos(planos);
  if (almacen && registros.length) {
    try {
      await almacen.guardar(claveEscritosBorrador(orderCode), {
        huella: registros.map(r => r.sha256).join('|'),
        por: '',
        fecha: ahora,
        filename: registros[0].filename,
        archivosEscritos: registros
      });
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode !== 409) throw error;
    }
  }
  return registros;
}

export async function leerEscritosBorrador(almacen: AlmacenEscritos | undefined, orderCode: string): Promise<RegistroArchivoEscrito[]> {
  if (!almacen) return [];
  try {
    const guardado = await almacen.leer(claveEscritosBorrador(orderCode));
    return Array.isArray(guardado?.archivosEscritos) ? guardado.archivosEscritos : [];
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 409) return [];
    throw error;
  }
}

export async function borrarEscritosBorrador(almacen: AlmacenEscritos | undefined, orderCode: string): Promise<void> {
  if (!almacen) return;
  try {
    await almacen.borrar(claveEscritosBorrador(orderCode));
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 409) throw error;
  }
}

/** Comprueba si un archivo concreto difiere del que escribió la web. */
async function archivoModificadoAMano(ruta: string, esperado: RegistroArchivoEscrito | undefined, fechaGuardadoMs: number): Promise<boolean> {
  let info;
  try {
    info = await fs.stat(ruta);
    if (!info.isFile()) return false;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
  if (esperado) {
    // Una edición puede conservar la fecha de modificación y el tamaño.
    if (info.size !== esperado.size) return true;
    const bytes = await fs.readFile(ruta);
    const shaActual = createHash('sha256').update(bytes).digest('hex');
    return shaActual !== esperado.sha256;
  }
  // Registros anteriores a esta mejora (sin archivosEscritos): comparar mtime con margen de 5 s.
  return Number.isFinite(fechaGuardadoMs) && info.mtimeMs > fechaGuardadoMs + 5_000;
}

export interface ResultadoCambiosManuales {
  modificadoAMano: boolean;
  archivosModificados: string[];
}

/**
 * Comprueba si alguno de los DWG de referencia del pedido fue modificado a mano en ZWCAD
 * después de que la web lo escribiera.
 */
export async function detectarCambiosManualesDwg({
  corteConfirmado,
  borradores = [],
  escritosBorrador = []
}: {
  corteConfirmado?: CorteConfirmadoConEscritos | null;
  borradores?: Array<{ filename: string; ruta: string }>;
  escritosBorrador?: RegistroArchivoEscrito[];
}): Promise<ResultadoCambiosManuales> {
  const archivosModificados: string[] = [];

  if (corteConfirmado) {
    const planos = planosDe(corteConfirmado);
    const porRuta = new Map<string, RegistroArchivoEscrito>();
    const porNombre = new Map<string, RegistroArchivoEscrito>();
    for (const r of corteConfirmado.archivosEscritos ?? []) {
      porRuta.set(rutaNormal(r.plano), r);
      porNombre.set(r.filename.toLowerCase(), r);
    }
    const fechaMs = corteConfirmado.fecha ? Date.parse(corteConfirmado.fecha) : NaN;
    for (const p of planos) {
      const esperado = porRuta.get(rutaNormal(p.plano)) ?? porNombre.get(p.filename.toLowerCase());
      if (await archivoModificadoAMano(p.plano, esperado, fechaMs)) {
        archivosModificados.push(p.filename);
      }
    }
    if (archivosModificados.length) return { modificadoAMano: true, archivosModificados };
  }

  if (borradores.length) {
    const porRuta = new Map<string, RegistroArchivoEscrito>();
    const porNombre = new Map<string, RegistroArchivoEscrito>();
    for (const r of escritosBorrador) {
      porRuta.set(rutaNormal(r.plano), r);
      porNombre.set(r.filename.toLowerCase(), r);
    }
    for (const b of borradores) {
      const esperado = porRuta.get(rutaNormal(b.ruta)) ?? porNombre.get(b.filename.toLowerCase());
      if (esperado && await archivoModificadoAMano(b.ruta, esperado, NaN)) {
        archivosModificados.push(b.filename);
      }
    }
  }

  return { modificadoAMano: archivosModificados.length > 0, archivosModificados };
}
