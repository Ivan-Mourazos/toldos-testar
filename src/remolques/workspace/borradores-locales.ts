import type { CalcParams } from "../calc/params.ts";
import { validarParams } from "../calc/validar-params.ts";
import type { LineaPedido } from "./lineas.ts";
import { normalizarNumeroPedido } from "../pedidos/numero-pedido.ts";

const PREFIJO = "tgm:borradores:";

/**
 * Los borradores viven en el navegador hasta que se completa el pedido. La
 * contrapartida es sabida y aceptada: un pedido a medias no sigue al usuario a
 * otro ordenador, y vaciar los datos del navegador lo pierde.
 *
 * El almacén llega por parámetro —no se lee `localStorage` aquí dentro— para
 * poder testear el módulo entero sin navegador. El reloj llega igual, por el
 * parámetro `ahora`, para que la fecha de guardado tampoco haga falta simularla.
 */
export function claveBorradores(numeroPedido: string): string {
  return `${PREFIJO}${normalizarNumeroPedido(numeroPedido)}`;
}

/** Lo que se recupera de un pedido: sus líneas y la que se estaba editando. */
export interface BorradoresPedido {
  lineas: LineaPedido[];
  versionActiva: string | null;
  /**
   * Solo al «Corregir» un pedido guardado: los parámetros con que se guardó. Van con el borrador
   * para que recargar la página no vuelva en silencio a los comunes; se van cuando se va él.
   */
  paramsGuardados?: CalcParams;
}

/**
 * Lo que se serializa. La cabecera no es adorno: `guardadoEn` ordena las claves
 * para saber cuál sacrificar cuando el navegador se queda sin cuota, y
 * `versionActiva` evita volver a la primera línea al recuperar el pedido.
 */
interface ContenidoGuardado {
  guardadoEn: string;
  versionActiva: string | null;
  lineas: LineaPedido[];
  paramsGuardados?: CalcParams;
}

const pareceLinea = (valor: unknown): valor is LineaPedido => {
  if (typeof valor !== "object" || valor === null) return false;
  const linea = valor as Partial<LineaPedido>;
  return typeof linea.version === "string"
    && (linea.tipo === "lona" || linea.tipo === "baqueton")
    && typeof linea.input === "object" && linea.input !== null;
};

const sinBorradores = (): BorradoresPedido => ({ lineas: [], versionActiva: null });

export function leerBorradores(
  almacen: Storage | null, numeroPedido: string,
): BorradoresPedido {
  if (!almacen) return sinBorradores();
  try {
    const crudo = almacen.getItem(claveBorradores(numeroPedido));
    if (!crudo) return sinBorradores();
    const datos: unknown = JSON.parse(crudo);
    // Lo que hay en el navegador puede venir de una versión anterior de la
    // aplicación: se filtra en vez de confiar en que tenga la forma esperada.
    // El formato anterior era el array pelado, sin cabecera.
    if (Array.isArray(datos)) {
      return { lineas: datos.filter(pareceLinea), versionActiva: null };
    }
    if (typeof datos !== "object" || datos === null) return sinBorradores();
    const { lineas, versionActiva, paramsGuardados } = datos as Partial<ContenidoGuardado>;
    const recuperados: BorradoresPedido = {
      lineas: Array.isArray(lineas) ? lineas.filter(pareceLinea) : [],
      versionActiva: typeof versionActiva === "string" ? versionActiva : null,
    };
    // Unos parámetros que no pasarían la comprobación del servidor no se recuperan: mejor los
    // comunes (sin el aviso de «Corregir») que un guardado que falla.
    const params = paramsGuardados === undefined ? null : validarParams(paramsGuardados);
    if (params?.ok) recuperados.paramsGuardados = params.params;
    return recuperados;
  } catch {
    return sinBorradores();
  }
}

/** Devuelve false si no se pudo guardar; entonces el trabajo solo vive en memoria. */
export function guardarBorradores(
  almacen: Storage | null,
  numeroPedido: string,
  lineas: LineaPedido[],
  versionActiva: string | null,
  ahora: string,
  /** Los de «Corregir»; sin ellos (null) el pedido se calcula con los comunes. */
  paramsGuardados: CalcParams | null = null,
): boolean {
  if (!almacen) return false;
  const clave = claveBorradores(numeroPedido);
  try {
    if (lineas.length === 0) {
      almacen.removeItem(clave);
      return true;
    }
    const contenido: ContenidoGuardado = {
      guardadoEn: ahora, versionActiva, lineas, ...(paramsGuardados ? { paramsGuardados } : {}),
    };
    return escribirHaciendoSitio(almacen, clave, JSON.stringify(contenido));
  } catch {
    return false;
  }
}

/**
 * Si no cabe, lo que sobra son los borradores de otros pedidos: se sacrifican
 * del más antiguo al más reciente, de uno en uno, hasta que la escritura entra.
 * El del pedido que se está guardando no se toca nunca, faltaría más.
 */
function escribirHaciendoSitio(almacen: Storage, clave: string, contenido: string): boolean {
  try {
    almacen.setItem(clave, contenido);
    return true;
  } catch {
    // Sin sitio: se hace hueco abajo en vez de dar la escritura por imposible.
  }
  for (const ajena of clavesAjenasPorAntiguedad(almacen, clave)) {
    try {
      almacen.removeItem(ajena);
      almacen.setItem(clave, contenido);
      return true;
    } catch {
      continue;
    }
  }
  return false;
}

function clavesAjenasPorAntiguedad(almacen: Storage, propia: string): string[] {
  const ajenas: { clave: string; guardadoEn: string }[] = [];
  // Las claves se recogen antes de borrar ninguna: borrar mueve los índices.
  for (let indice = 0; indice < almacen.length; indice += 1) {
    const clave = almacen.key(indice);
    if (!clave || clave === propia || !clave.startsWith(PREFIJO)) continue;
    ajenas.push({ clave, guardadoEn: guardadoEnDe(almacen, clave) });
  }
  return ajenas
    .sort((a, b) => a.guardadoEn.localeCompare(b.guardadoEn))
    .map((entrada) => entrada.clave);
}

/** Sin fecha legible cuenta como lo más antiguo: es formato viejo o basura. */
function guardadoEnDe(almacen: Storage, clave: string): string {
  try {
    const datos: unknown = JSON.parse(almacen.getItem(clave) ?? "");
    const guardadoEn = (datos as Partial<ContenidoGuardado> | null)?.guardadoEn;
    return typeof guardadoEn === "string" ? guardadoEn : "";
  } catch {
    return "";
  }
}

export function limpiarBorradores(almacen: Storage | null, numeroPedido: string): void {
  if (!almacen) return;
  try {
    almacen.removeItem(claveBorradores(numeroPedido));
  } catch {
    // Si no se puede limpiar, la próxima carga fusiona borrador y registro por
    // versión y el borrador ya coincide con lo guardado: no se pierde nada.
  }
}
