import type { Material } from "../calc/materiales-seed.ts";
import type { CalcParams } from "../calc/params.ts";
import { crearInputDesdeRps } from "../rps/aplicar-linea.ts";
import { normalizarNumeroPedidoRps } from "../rps/numero-pedido.ts";
import type { LineaPedidoRps, PedidoRps } from "../rps/types.ts";
import { siguienteVersion, type LineaPedido } from "./lineas.ts";

// «Obtener datos del pedido» en Remolques, como en Toldos (Iván, 30/09/2026): en vez de enseñar
// las líneas de RPS y aplicarlas una a una sobre el elemento abierto, se crea de una vez un
// elemento por línea. Aquí está la parte pura: qué elementos salen del pedido de RPS, cuáles de
// ellos ya están en el pedido y cómo queda el pedido al sustituir o al añadir solo las que faltan.

export type ModoImportacionRps = "sustituir" | "anadir";

export interface OpcionesImportacionRps {
  materiales: Material[];
  params: CalcParams;
  realizadoPor: string;
  importadoEn: string;
}

/** Lo que hay que comprobar a mano de lo que trajo RPS; vacío si la línea es clara. */
export function avisosLineaRps(linea: LineaPedidoRps, conBobina: boolean): string[] {
  const avisos: string[] = [];
  // Una línea sin medidas legibles («CONFECCIÓN SEGÚN PATRÓN») se crea igual, con lo que
  // haya, para no perderla de vista; el aviso dice por qué le faltan medidas.
  if (linea.requiereRevision) avisos.push("RPS no da las medidas completas: revísalas con el texto de la línea.");
  if (linea.materialRps.texto && !conBobina) avisos.push(`RPS pide ${linea.materialRps.texto}: elige la bobina.`);
  if (linea.rotulacion === null && !linea.tipoRotulacion) avisos.push("RPS no indica si lleva rotulación.");
  if (linea.recogidaDelante) avisos.push("RPS menciona una recogida delante: elige de qué tipo.");
  if (linea.recogidaAtras) avisos.push("RPS menciona una recogida detrás: elige de qué tipo.");
  if (linea.textoRotulacion) avisos.push(`Texto de rotulación en RPS: «${linea.textoRotulacion}».`);
  return avisos;
}

/** Un elemento por cada línea de remolque de RPS, en el orden del pedido. */
export function lineasDesdePedidoRps(pedido: PedidoRps, opciones: OpcionesImportacionRps): LineaPedido[] {
  return pedido.lineas.map((lineaRps, indice) => {
    const creado = crearInputDesdeRps(
      pedido, lineaRps, indice, opciones.materiales, opciones.params, opciones.realizadoPor,
    );
    return {
      version: creado.input.cabecera.version,
      tipo: creado.tipo,
      input: creado.input,
      snapshotSvg: null,
      origenRps: {
        numeroPedido: pedido.numero,
        numeroLinea: lineaRps.numeroLinea,
        idLinea: lineaRps.idLinea,
        ordenFabricacion: lineaRps.ordenFabricacion,
        importadoEn: opciones.importadoEn,
        requiereRevision: lineaRps.requiereRevision,
        avisos: avisosLineaRps(lineaRps, Boolean(creado.input.material)),
        texto: (lineaRps.detalle || lineaRps.descripcion).trim(),
        cliente: pedido.cliente,
      },
    } satisfies LineaPedido;
  });
}

const limpiarOf = (of: string | null | undefined) => (of ?? "").trim();

/**
 * ¿Este elemento del pedido es esta línea de RPS? Por la línea de la que se importó y, si se
 * tecleó a mano, por la OF: es lo único que identifica un remolque en los dos sitios.
 */
function casaCon(
  existente: LineaPedido, numeroPedido: string, idLinea: string, ordenFabricacion: string | null,
): boolean {
  const origen = existente.origenRps;
  if (origen && normalizarNumeroPedidoRps(origen.numeroPedido) === normalizarNumeroPedidoRps(numeroPedido)) {
    return origen.idLinea === idLinea;
  }
  const of = limpiarOf(ordenFabricacion);
  return Boolean(of) && limpiarOf(existente.input.cabecera.ordenFabricacion) === of;
}

/** Posición del elemento del pedido que contiene la línea de RPS, o -1 si no está. */
export function indiceElementoDeLineaRps(
  lineas: LineaPedido[], numeroPedido: string, lineaRps: LineaPedidoRps,
): number {
  return lineas.findIndex((linea) => casaCon(linea, numeroPedido, lineaRps.idLinea, lineaRps.ordenFabricacion));
}

export interface CoincidenciaRps {
  deRps: LineaPedido;
  existente: LineaPedido | null;
}

export interface PlanImportacionRps {
  /** Una por línea de RPS, en su orden, con el elemento que ya la contiene si lo hay. */
  coincidencias: CoincidenciaRps[];
  /** Las líneas de RPS que el pedido todavía no tiene. */
  faltan: LineaPedido[];
  /** Elementos del pedido que no corresponden a ninguna línea de RPS. */
  ajenas: LineaPedido[];
  /** Obtener otra vez no cambiaría nada: ni faltan, ni sobran, ni hay datos distintos. */
  alDia: boolean;
}

// Lo que dice RPS de un elemento, sin la cabecera que es del pedido (cliente, fecha, quién lo
// planteó, cómo se tecleó el número): un cambio de «Soy» no es un dato distinto de RPS.
const datosDeRps = (linea: LineaPedido) => JSON.stringify([
  linea.tipo,
  { ...linea.input, cabecera: { ordenFabricacion: linea.input.cabecera.ordenFabricacion } },
]);

export function planificarImportacionRps(existentes: LineaPedido[], deRps: LineaPedido[]): PlanImportacionRps {
  const usadas = new Set<LineaPedido>();
  const coincidencias = deRps.map((nueva) => {
    const origen = nueva.origenRps;
    const existente = origen
      ? existentes.find((linea) => !usadas.has(linea)
        && casaCon(linea, origen.numeroPedido, origen.idLinea, origen.ordenFabricacion)) ?? null
      : null;
    if (existente) usadas.add(existente);
    return { deRps: nueva, existente };
  });
  const faltan = coincidencias.filter((c) => !c.existente).map((c) => c.deRps);
  const ajenas = existentes.filter((linea) => !usadas.has(linea));
  const alDia = faltan.length === 0 && ajenas.length === 0
    && coincidencias.every((c) => c.existente && datosDeRps(c.existente) === datosDeRps(c.deRps));
  return { coincidencias, faltan, ajenas, alDia };
}

/**
 * Cómo queda el pedido. «Sustituir» deja justo las líneas de RPS (con el `id` guardado del
 * elemento que casaba, para no duplicar su registro); «añadir» no toca nada de lo que había y
 * pone detrás las que faltan, con versiones nuevas: la de RPS (10 + posición) podría ser la de
 * un elemento tecleado a mano y lo sustituiría.
 */
export function lineasTrasImportar(
  existentes: LineaPedido[], deRps: LineaPedido[], modo: ModoImportacionRps,
): { lineas: LineaPedido[]; versionActiva: string | null } {
  const plan = planificarImportacionRps(existentes, deRps);
  if (modo === "sustituir") {
    const lineas = plan.coincidencias.map(({ deRps: nueva, existente }) => (
      existente?.id ? { ...nueva, id: existente.id } : nueva
    ));
    return { lineas, versionActiva: lineas[0]?.version ?? null };
  }
  const lineas = [...existentes];
  let primeraNueva: string | null = null;
  for (const falta of plan.faltan) {
    const version = siguienteVersion(lineas);
    primeraNueva ??= version;
    lineas.push({ ...falta, version, input: { ...falta.input, cabecera: { ...falta.input.cabecera, version } } });
  }
  return { lineas, versionActiva: primeraNueva };
}
