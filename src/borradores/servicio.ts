import type { AlmacenBorradores } from "./almacen.ts";
import {
  codigoBorrador, crearBorrador, ErrorBorrador, leerContenido, MENSAJE_OCUPADO, MENSAJE_OTRO_NUMERO,
  MENSAJE_SIN_AUTOR, MENSAJE_YA_EN_PEDIDOS, mensajeOtroTipo, resumenDeBorrador, SIN_CARPETA_BORRADORES,
} from "./reglas.ts";
import type { Borrador, ResumenBorrador } from "./tipos.ts";

// Los borradores en el servidor (diseño 01/10/2026). Las rutas de src/server.js solo pasan la
// petición y devuelven la respuesta. Los errores llevan su código (statusCode): 400 dato mal,
// 404 no está, 409 conflicto; 503 si no se puede mirar si el número ya es un pedido de toldos.

export interface DependenciasBorradores {
  almacen: AlmacenBorradores;
  /** La lista de técnicos de «Soy». */
  tecnicos: string[];
  /** true si ese número ya está guardado como pedido de toldos (para revisión o generado). */
  esPedidoDeToldos: (orderCode: string) => Promise<boolean>;
  /** true si ese número ya está guardado como pedido de remolques. */
  esPedidoDeRemolques: (orderCode: string) => Promise<boolean>;
  ahora?: () => Date;
  registrar?: (mensaje: string) => void;
}

export interface Respuesta {
  status: number;
  cuerpo: unknown;
}

export function crearServicioBorradores(deps: DependenciasBorradores) {
  const reloj = deps.ahora ?? (() => new Date());
  const registrar = deps.registrar ?? ((mensaje: string) => console.error(mensaje));
  // Un bloqueo por número: dos guardados (o un guardado y un «Descartar») del mismo borrador no se
  // cruzan; el segundo recibe un 409 y se repite.
  const ocupados = new Set<string>();

  async function listar(): Promise<{ configurado: boolean; borradores: ResumenBorrador[] }> {
    if (!(await deps.almacen.configurada())) return { configurado: false, borradores: [] };
    return { configurado: true, borradores: (await deps.almacen.listar()).map(resumenDeBorrador) };
  }

  /** El borrador de ese número, o null si no hay (o no hay carpeta): no es un error, y así el navegador no lo apunta como fallo. */
  async function obtener(orderCodeBruto: string): Promise<Borrador | null> {
    return await deps.almacen.obtener(codigoBorrador(orderCodeBruto));
  }

  async function guardar(orderCodeBruto: string, cuerpo: unknown): Promise<Respuesta> {
    const orderCode = codigoBorrador(orderCodeBruto);
    if (!(await deps.almacen.configurada())) throw new ErrorBorrador(SIN_CARPETA_BORRADORES);
    const c = (cuerpo ?? {}) as { kind?: unknown; savedBy?: unknown; contenido?: unknown; confirmOverwrite?: unknown };
    const savedBy = typeof c.savedBy === "string" ? c.savedBy.trim() : "";
    if (!savedBy || !deps.tecnicos.includes(savedBy)) throw new ErrorBorrador(MENSAJE_SIN_AUTOR);
    const leido = leerContenido(c.kind, c.contenido);
    if (codigoBorrador(leido.numeroPedido) !== orderCode) throw new ErrorBorrador(MENSAJE_OTRO_NUMERO);
    if (ocupados.has(orderCode)) return { status: 409, cuerpo: { error: MENSAJE_OCUPADO } };
    ocupados.add(orderCode);
    try {
      // Un pedido ya guardado se corrige desde Pedidos, no con un borrador.
      if ((await deps.esPedidoDeToldos(orderCode)) || (await deps.esPedidoDeRemolques(orderCode))) {
        throw new ErrorBorrador(MENSAJE_YA_EN_PEDIDOS, 409);
      }
      const existente = await deps.almacen.obtener(orderCode);
      if (existente && existente.kind !== leido.kind) throw new ErrorBorrador(mensajeOtroTipo(orderCode, existente.kind), 409);
      if (existente && existente.savedBy !== savedBy && c.confirmOverwrite !== true) {
        return { status: 409, cuerpo: { needsConfirmation: true, savedBy: existente.savedBy, error: `Este borrador es de ${existente.savedBy}.` } };
      }
      const borrador = crearBorrador({ leido, savedBy, existente, ahora: reloj().toISOString() });
      await deps.almacen.guardar(borrador);
      return { status: 200, cuerpo: { ok: true, borrador: resumenDeBorrador(borrador), sustituido: Boolean(existente) } };
    } finally {
      ocupados.delete(orderCode);
    }
  }

  /** «Descartar borrador»: cualquiera puede (la web pregunta antes). Si ya no estaba, no es un error. */
  async function descartar(orderCodeBruto: string): Promise<Respuesta> {
    const orderCode = codigoBorrador(orderCodeBruto);
    if (ocupados.has(orderCode)) return { status: 409, cuerpo: { error: MENSAJE_OCUPADO } };
    ocupados.add(orderCode);
    try {
      return { status: 200, cuerpo: { ok: true, existia: await deps.almacen.borrar(orderCode) } };
    } finally {
      ocupados.delete(orderCode);
    }
  }

  /**
   * Tras guardar un pedido para revisión, su borrador sobra, pero solo si es del mismo tipo: un
   * borrador de remolques con ese número no se toca al guardar toldos (y al revés). Nunca falla:
   * el pedido ya está guardado, y si no se puede borrar se apunta para informática.
   */
  async function borrarTrasRevision(orderCodeBruto: string, kind: Borrador["kind"]): Promise<void> {
    let orderCode: string;
    try {
      orderCode = codigoBorrador(orderCodeBruto);
    } catch {
      return;
    }
    if (ocupados.has(orderCode)) {
      registrar(`El pedido ${orderCode} se ha guardado para revisión, pero su borrador estaba ocupado y no se borró.`);
      return;
    }
    ocupados.add(orderCode);
    try {
      const existente = await deps.almacen.obtener(orderCode);
      if (!existente) return;
      if (existente.kind !== kind) {
        registrar(`El pedido ${orderCode} se ha guardado para revisión (${kind}), pero su borrador es de ${existente.kind}: se conserva.`);
        return;
      }
      await deps.almacen.borrar(orderCode);
    } catch (error) {
      registrar(`El pedido ${orderCode} se ha guardado para revisión, pero no se pudo borrar su borrador: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      ocupados.delete(orderCode);
    }
  }

  return { listar, obtener, guardar, descartar, borrarTrasRevision };
}
