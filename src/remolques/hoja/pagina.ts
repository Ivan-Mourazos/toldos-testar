import type { BaquetonInput } from "../calc/baqueton.ts";
import { sinReves, type Lado } from "../calc/ganchos.ts";
import type { CabeceraInput, LonaInput } from "../calc/lona.ts";
import { sinPosiciones, type RepartoLados } from "../calc/ollaos.ts";
import type { CalcParams } from "../calc/params.ts";
import { notaRecogida } from "../etiquetas.ts";
import type { TipoPlanteamiento } from "../store/types.ts";
import { datosHoja, type DatosHoja } from "./datos-hoja.ts";
import type { ElementoHoja } from "./tipos.ts";

// Todo lo que lleva una hoja de taller, en texto: lo de la web vieja (cabecera, título, banda,
// grupos y tabla de ollaos) y lo nuevo de la fase 4 (tabla de ganchos).

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
const oRaya = (valor: string | undefined) => (valor ?? "").trim() || "—";

export interface CabeceraHoja {
  cliente: string;
  realizadoPor: string;
  /** Vacío hasta la fase 5, que pone el revisor de CoordinaOT. */
  revisadoPor: string;
  numeroPedido: string;
  of: string;
  fecha: string;
}
export interface FilaPosiciones { nombre: string; posiciones: number[] }
export interface TablaPosiciones { titulo: string; columnas: number; filas: FilaPosiciones[] }
export interface PaginaHojaDatos extends DatosHoja {
  /** La versión del elemento (10, 11…): identifica la hoja. */
  clave: string;
  tipo: TipoPlanteamiento;
  cabecera: CabeceraHoja;
  ollaos: TablaPosiciones;
  ganchos: TablaPosiciones | null;
  /** Lo que se escribe al pie de la vista de delante y de la de detrás: su recogida (Iván,
   *  30/09/2026). null en el baquetón, que no lleva. */
  notasVistas: { delante: string; detras: string } | null;
}

/** 12 columnas como la hoja de siempre; más si algún lado lleva más (la vieja cortaba en 12). */
export const COLUMNAS_MINIMAS = 12;
const columnas = (filas: FilaPosiciones[]) => Math.max(COLUMNAS_MINIMAS, ...filas.map((f) => f.posiciones.length));
const LADOS_TABLA: Lado[] = ["laterales", "atras", "delante"];

export function fechaEs(fecha: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : fecha;
}

export function cabeceraHoja(c: CabeceraInput, revisadoPor = ""): CabeceraHoja {
  return {
    cliente: oRaya(c.cliente),
    realizadoPor: oRaya(c.realizadoPor),
    revisadoPor,
    numeroPedido: oRaya(c.numeroPedido.toUpperCase()),
    of: oRaya(c.ordenFabricacion),
    fecha: oRaya(fechaEs(c.fecha)),
  };
}

export function tituloOllaos(input: LonaInput | BaquetonInput, primerOllao: number): string {
  if (input.modoOllaos === "REPARTIDOS") {
    return `OLLAOS · REPARTIDOS · PRIMER Y ÚLTIMO OLLAO A ${fmt(primerOllao)} CM DEL BORDE`;
  }
  if (input.modoOllaos === "SEGUN GANCHOS") {
    return (input.ollaosExtremos ?? true)
      ? `OLLAOS · SEGÚN GANCHOS · UNO ENTRE CADA DOS GANCHOS Y LOS DE LOS EXTREMOS A ${fmt(primerOllao)} CM DEL BORDE`
      : "OLLAOS · SEGÚN GANCHOS · UNO ENTRE CADA DOS GANCHOS, SIN OLLAOS EN LOS EXTREMOS";
  }
  return `OLLAOS · ${input.modoOllaos || "SIN ELEGIR"}`;
}

const NOMBRE_OLLAOS: Record<Lado, string> = {
  laterales: "OLLAOS LATERALES DE ATRÁS A ADELANTE",
  atras: "OLLAOS ATRÁS DE IZQUIERDA A DERECHA",
  delante: "OLLAOS DELANTE DE IZQUIERDA A DERECHA",
};

/** Las posiciones de los ollaos sobre la lona hecha (o el remolque hecho del baquetón). */
export function tablaOllaos(input: LonaInput | BaquetonInput, reparto: RepartoLados, primerOllao: number): TablaPosiciones {
  const filas = LADOS_TABLA.map((lado) => ({ nombre: NOMBRE_OLLAOS[lado], posiciones: reparto[lado] }));
  return { titulo: tituloOllaos(input, primerOllao), columnas: columnas(filas), filas };
}

/** [normal, medido al revés]: el lado medido desde el otro extremo se lee al revés. */
const NOMBRE_GANCHOS: Record<Lado, [string, string]> = {
  laterales: ["GANCHOS LATERALES DE ATRÁS A ADELANTE", "GANCHOS LATERALES DE ADELANTE A ATRÁS (MEDIDO AL REVÉS)"],
  atras: ["GANCHOS ATRÁS DE IZQUIERDA A DERECHA", "GANCHOS ATRÁS DE DERECHA A IZQUIERDA (MEDIDO AL REVÉS)"],
  delante: ["GANCHOS DELANTE DE IZQUIERDA A DERECHA", "GANCHOS DELANTE DE DERECHA A IZQUIERDA (MEDIDO AL REVÉS)"],
};

/** Solo con «Según ganchos»: los ganchos tal cual vienen en el pedido, medidos sobre el remolque. */
export function tablaGanchos(input: LonaInput | BaquetonInput): TablaPosiciones | null {
  if (input.modoOllaos !== "SEGUN GANCHOS") return null;
  const ganchos = input.ganchos ?? sinPosiciones();
  const alReves = input.ganchosAlReves ?? sinReves();
  const filas = LADOS_TABLA.map((lado) => ({ nombre: NOMBRE_GANCHOS[lado][alReves[lado] ? 1 : 0], posiciones: ganchos[lado] }));
  return { titulo: "GANCHOS · SOBRE EL REMOLQUE, COMO VIENEN EN EL PEDIDO", columnas: columnas(filas), filas };
}

export function paginaHoja(elemento: ElementoHoja, indice: number, total: number, params: CalcParams): PaginaHojaDatos {
  return {
    ...datosHoja(elemento, indice, total),
    clave: elemento.version,
    tipo: elemento.tipo,
    cabecera: cabeceraHoja(elemento.input.cabecera),
    ollaos: tablaOllaos(elemento.input, elemento.result.reparto, elemento.input.primerOllao ?? params.primerOllao),
    ganchos: tablaGanchos(elemento.input),
    notasVistas: elemento.tipo === "lona"
      ? { delante: notaRecogida(elemento.input.recogeDelante), detras: notaRecogida(elemento.input.recogeAtras) }
      : null,
  };
}
