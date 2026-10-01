import { mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { codigoBorrador, ErrorBorrador, esBorrador, SIN_CARPETA_BORRADORES } from "./reglas.ts";
import type { Borrador } from "./tipos.ts";

// Los borradores en el servidor (diseño 01/10/2026): un JSON por número de pedido en la carpeta de
// borradores (Configuración, paso 08; semilla DRAFTS_DIRECTORY). Como el de los pedidos de remolques
// (src/remolques/flujo/almacen.ts): escritura atómica (temporal y renombrar) y un fichero roto se salta.

export interface AlmacenBorradores {
  /** Si la carpeta está puesta en Configuración. */
  configurada(): Promise<boolean>;
  obtener(orderCode: string): Promise<Borrador | null>;
  /** Escribe el borrador (lo sustituye si ya estaba). Devuelve la ruta del fichero. */
  guardar(borrador: Borrador): Promise<string>;
  /** Todos, del más reciente al más antiguo. */
  listar(): Promise<Borrador[]>;
  /** true si estaba y se ha borrado. */
  borrar(orderCode: string): Promise<boolean>;
}

/** El número normalizado como nombre: solo letras y cifras, así nunca sale de la carpeta. */
export const ficheroBorrador = (carpeta: string, orderCode: string) => path.join(carpeta, `${codigoBorrador(orderCode)}.json`);

async function leer(fichero: string): Promise<Borrador> {
  const datos: unknown = JSON.parse(await readFile(fichero, "utf8"));
  if (!esBorrador(datos)) throw new Error(`${path.basename(fichero)} no es un borrador.`);
  return datos;
}

const contenido = (borrador: Borrador) => `${JSON.stringify(borrador, null, 2)}\n`;
const temporalDe = (fichero: string) => `${fichero}.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
const codigo = (error: unknown) => (error as NodeJS.ErrnoException).code;

export function crearAlmacenBorradores({ carpeta, registrar = (mensaje: string) => console.error(mensaje) }: {
  /** La carpeta de borradores de la configuración en este momento ('' si no está puesta). */
  carpeta: () => Promise<string>;
  registrar?: (mensaje: string) => void;
}): AlmacenBorradores {
  const carpetaActual = async () => (await carpeta()).trim();

  return {
    async configurada() {
      return Boolean(await carpetaActual());
    },

    async obtener(orderCode) {
      const dir = await carpetaActual();
      if (!dir) return null;
      try {
        return await leer(ficheroBorrador(dir, orderCode));
      } catch (error) {
        if (codigo(error) === "ENOENT") return null;
        throw error;
      }
    },

    async guardar(borrador) {
      const dir = await carpetaActual();
      if (!dir) throw new ErrorBorrador(SIN_CARPETA_BORRADORES);
      await mkdir(dir, { recursive: true });
      const fichero = ficheroBorrador(dir, borrador.orderCode);
      const temporal = temporalDe(fichero);
      try {
        await writeFile(temporal, contenido(borrador), { flag: "wx" });
        await rename(temporal, fichero);
      } catch (error) {
        await rm(temporal, { force: true });
        throw error;
      }
      return fichero;
    },

    async listar() {
      const dir = await carpetaActual();
      if (!dir) return [];
      let nombres: string[];
      try {
        nombres = await readdir(dir);
      } catch (error) {
        if (codigo(error) === "ENOENT") return [];
        throw error;
      }
      const borradores = await Promise.all(nombres.filter((nombre) => nombre.toLowerCase().endsWith(".json")).map(async (nombre) => {
        try {
          return await leer(path.join(dir, nombre));
        } catch (error) {
          registrar(`No se pudo leer el borrador ${nombre}: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      }));
      return borradores
        .filter((borrador): borrador is Borrador => borrador !== null)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async borrar(orderCode) {
      const dir = await carpetaActual();
      if (!dir) return false;
      try {
        await rm(ficheroBorrador(dir, orderCode));
        return true;
      } catch (error) {
        if (codigo(error) === "ENOENT") return false;
        throw error;
      }
    },
  };
}
