import { link, mkdir, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { codigoPedido, ErrorPedidoRemolques } from "./pedido.ts";
import { TIPO_PEDIDO_REMOLQUES, type PedidoRemolques } from "./tipos.ts";

// Los pedidos de remolques, pendientes y generados, dentro de la web (Iván, 01/10/2026): un JSON
// por pedido en la carpeta interna de remolques (Configuración; semilla REMOLQUES_REVISION_DIRECTORY).
// En las carpetas compartidas solo aparecen los dos PDF al generar, como con la web vieja.

export const SIN_CARPETA_INTERNA = "Falta la carpeta interna de remolques en Configuración: no se pueden guardar pedidos de remolques.";

export interface AlmacenPedidosRemolques {
  obtener(orderCode: string): Promise<PedidoRemolques | null>;
  /** Escribe el pedido (lo sustituye si ya estaba). Devuelve la ruta del fichero. */
  guardar(pedido: PedidoRemolques): Promise<string>;
  /** Solo si no existe: lo usa el paso desde la web vieja, que nunca pisa nada. */
  crear(pedido: PedidoRemolques): Promise<"creado" | "ya-existe">;
  /** Todos, del más reciente al más antiguo. Un fichero que no es un pedido se salta (y se avisa). */
  listar(): Promise<PedidoRemolques[]>;
}

/** El número normalizado como nombre: solo letras y cifras, así nunca sale de la carpeta. */
export const ficheroPedido = (carpeta: string, orderCode: string) => path.join(carpeta, `${codigoPedido(orderCode)}.json`);

function esPedido(valor: unknown): valor is PedidoRemolques {
  const p = valor as Partial<PedidoRemolques> | null;
  return Boolean(p && p.kind === TIPO_PEDIDO_REMOLQUES && typeof p.orderCode === "string" && p.orderCode
    && Array.isArray(p.elementos) && p.summary);
}

async function leer(fichero: string): Promise<PedidoRemolques> {
  const datos: unknown = JSON.parse(await readFile(fichero, "utf8"));
  if (!esPedido(datos)) throw new Error(`${path.basename(fichero)} no es un pedido de remolques.`);
  return datos;
}

const contenido = (pedido: PedidoRemolques) => `${JSON.stringify(pedido, null, 2)}\n`;
const temporalDe = (fichero: string) => `${fichero}.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
const codigo = (error: unknown) => (error as NodeJS.ErrnoException).code;

export function crearAlmacenPedidosRemolques({ carpeta, registrar = (mensaje: string) => console.error(mensaje) }: {
  /** La carpeta interna de la configuración en este momento ('' si no está puesta). */
  carpeta: () => Promise<string>;
  registrar?: (mensaje: string) => void;
}): AlmacenPedidosRemolques {
  async function carpetaObligatoria() {
    const dir = (await carpeta()).trim();
    if (!dir) throw new ErrorPedidoRemolques(SIN_CARPETA_INTERNA);
    await mkdir(dir, { recursive: true });
    return dir;
  }

  return {
    async obtener(orderCode) {
      const dir = (await carpeta()).trim();
      if (!dir) return null;
      try {
        return await leer(ficheroPedido(dir, orderCode));
      } catch (error) {
        if (codigo(error) === "ENOENT") return null;
        throw error;
      }
    },

    async guardar(pedido) {
      const fichero = ficheroPedido(await carpetaObligatoria(), pedido.orderCode);
      const temporal = temporalDe(fichero);
      await writeFile(temporal, contenido(pedido), { flag: "wx" });
      try {
        await rename(temporal, fichero);
      } catch (error) {
        await rm(temporal, { force: true });
        throw error;
      }
      return fichero;
    },

    async crear(pedido) {
      const fichero = ficheroPedido(await carpetaObligatoria(), pedido.orderCode);
      const temporal = temporalDe(fichero);
      await writeFile(temporal, contenido(pedido), { flag: "wx" });
      try {
        // link falla con EEXIST si ya está: nunca se pisa un pedido.
        await link(temporal, fichero);
        return "creado";
      } catch (error) {
        if (codigo(error) === "EEXIST") return "ya-existe";
        throw error;
      } finally {
        await rm(temporal, { force: true });
      }
    },

    async listar() {
      const dir = (await carpeta()).trim();
      if (!dir) return [];
      let nombres: string[];
      try {
        nombres = await readdir(dir);
      } catch (error) {
        if (codigo(error) === "ENOENT") return [];
        throw error;
      }
      const pedidos = await Promise.all(nombres.filter((nombre) => nombre.toLowerCase().endsWith(".json")).map(async (nombre) => {
        try {
          return await leer(path.join(dir, nombre));
        } catch (error) {
          registrar(`No se pudo leer el pedido de remolques ${nombre}: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      }));
      return pedidos
        .filter((pedido): pedido is PedidoRemolques => pedido !== null)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
  };
}
