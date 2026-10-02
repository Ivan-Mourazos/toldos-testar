import { awningLetter } from "../../domain/awningCompleteness.js";
import { normalizeOf } from "../../reviewRules.js";
import { detrasDistinto, type LonaInput } from "../calc/lona.ts";
import { TIPOS_PERFIL, type TipoPerfil } from "../calc/params.ts";
import { normalizarNombre } from "../clientes/reglas.ts";
import { normalizarNumeroPedido } from "../pedidos/numero-pedido.ts";
import type { TipoPlanteamiento } from "../store/types.ts";
import { ErrorPedidoRemolques, modeloElemento } from "./pedido.ts";
import type { ElementoGuardado, EstadoPedidoRemolques, PedidoRemolques } from "./tipos.ts";

// El buscador de remolques (diseño 02/10/2026): filtra, elemento a elemento, todos los pedidos de
// remolques guardados por las características del remolque. Puro, sin Node ni disco: lo usan el
// servidor (POST /api/remolques/buscar) y las pruebas; la web solo toma sus tipos y constantes.

export const CAMPOS_MEDIDA = ["largo", "ancho", "alto", "radioEsquina", "radioCumbrera", "radioHombro", "aguas", "chaflan"] as const;
export type CampoMedida = (typeof CAMPOS_MEDIDA)[number];
/** El margen de una medida si no se escribe otro: ± 5 cm. */
export const MARGEN_POR_DEFECTO = 5;
/** Cuántas filas devuelve como mucho una búsqueda (las más nuevas). */
export const LIMITE_FILAS = 500;
export const LADOS_RECOGIDA = ["delante", "detras", "cualquiera"] as const;
export type LadoRecogida = (typeof LADOS_RECOGIDA)[number];
const SI_NO = ["si", "no"] as const;
export type SiNoFiltro = (typeof SI_NO)[number];
const ESTADOS = ["pendientes", "generados"] as const;
export type EstadoFiltro = (typeof ESTADOS)[number];
const TIPOS: readonly TipoPlanteamiento[] = ["lona", "baqueton"];

/** Una medida buscada: el valor y cuánto puede apartarse, en cm (los bordes cuentan). */
export interface MedidaFiltro {
  valor: number;
  margen: number;
}

/** Los filtros, todos opcionales: el que no está no filtra. */
export interface FiltrosBusqueda {
  /** Número de pedido (como se escribió o normalizado), cliente, OF u observaciones; cada palabra tiene que salir. */
  texto?: string;
  /** Parte del nombre del cliente (también el de una ficha), sin acentos ni mayúsculas. */
  cliente?: string;
  tipo?: TipoPlanteamiento;
  /** Solo lonas. */
  perfil?: TipoPerfil;
  /** Solo lonas. */
  recogida?: { nombre: string; lado: LadoRecogida };
  /** Largo y ancho valen para los dos; el resto, solo lonas. */
  medidas?: Partial<Record<CampoMedida, MedidaFiltro>>;
  /** Solo lonas. */
  ventana?: SiNoFiltro;
  rotulacion?: SiNoFiltro;
  /** Bastilla de enfundar. Solo lonas. */
  bastilla?: SiNoFiltro;
  /** Otro ancho u otro alto detrás. Solo lonas. */
  detrasDistinto?: SiNoFiltro;
  /** Texto contenido en el material («ALPHA», «7038»). */
  material?: string;
  estado?: EstadoFiltro;
  /** Fecha del pedido, AAAA-MM-DD; las dos incluyen el día. */
  desde?: string;
  hasta?: string;
}

/** Una fila del resultado: un elemento de un pedido. */
export interface FilaBusqueda {
  orderCode: string;
  numeroPedido: string;
  /** La versión del elemento (10, 11…): con ella se abre elegido en la ficha del pedido. */
  version: string;
  letra: string;
  tipo: TipoPlanteamiento;
  cliente: string;
  /** AAAA-MM-DD, o "" si no se sabe. */
  fecha: string;
  /** El perfil («Recto con aguas») o «Baquetón». */
  modelo: string;
  largo: number;
  ancho: number;
  /** El alto de delante; null en un baquetón. */
  alto: number | null;
  /** "" en un baquetón. */
  recogeDelante: string;
  recogeAtras: string;
  material: string;
  of: string;
  estado: EstadoPedidoRemolques;
}

export interface ResultadoBusqueda {
  filas: FilaBusqueda[];
  /** Cuántos elementos cumplen, aunque no salgan todos. */
  total: number;
  /** En cuántos pedidos están. */
  pedidos: number;
  /** true si cumplen más de `limite`: solo salen los más nuevos. */
  cortado: boolean;
  limite: number;
}

// ── Validación de lo que llega al servidor ──

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const esNumero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const vacio = (v: unknown) => v === undefined || v === null || v === "";
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function leerTexto(origen: Record<string, unknown>, clave: string, errores: string[], nombre = clave): string | undefined {
  const valor = origen[clave];
  if (vacio(valor)) return undefined;
  if (typeof valor !== "string") {
    errores.push(`«${nombre}» tiene que ser un texto.`);
    return undefined;
  }
  return valor.trim().slice(0, 200) || undefined;
}

function leerDeLista<T extends string>(
  origen: Record<string, unknown>, clave: string, valores: readonly T[], errores: string[], nombre = clave,
): T | undefined {
  const valor = origen[clave];
  if (vacio(valor)) return undefined;
  if (typeof valor !== "string" || !(valores as readonly string[]).includes(valor)) {
    errores.push(`«${nombre}» no es válido.`);
    return undefined;
  }
  return valor as T;
}

function leerFecha(origen: Record<string, unknown>, clave: string, errores: string[]): string | undefined {
  const fecha = leerTexto(origen, clave, errores);
  if (fecha && !FECHA.test(fecha)) {
    errores.push(`«${clave}» tiene que ser una fecha AAAA-MM-DD.`);
    return undefined;
  }
  return fecha;
}

function leerRecogida(bruto: unknown, errores: string[]): FiltrosBusqueda["recogida"] {
  if (vacio(bruto)) return undefined;
  if (!esObjeto(bruto)) {
    errores.push("«recogida» no es válida.");
    return undefined;
  }
  const nombre = leerTexto(bruto, "nombre", errores, "recogida");
  const lado = leerDeLista(bruto, "lado", LADOS_RECOGIDA, errores, "lado de la recogida") ?? "cualquiera";
  return nombre ? { nombre, lado } : undefined;
}

function leerMedidas(bruto: unknown, errores: string[]): FiltrosBusqueda["medidas"] {
  if (vacio(bruto)) return undefined;
  if (!esObjeto(bruto)) {
    errores.push("«medidas» no son válidas.");
    return undefined;
  }
  const medidas: Partial<Record<CampoMedida, MedidaFiltro>> = {};
  for (const [campo, medida] of Object.entries(bruto)) {
    if (!(CAMPOS_MEDIDA as readonly string[]).includes(campo)) {
      errores.push(`No se puede buscar por «${campo}».`);
      continue;
    }
    if (vacio(medida)) continue;
    const valor = esObjeto(medida) ? medida.valor : undefined;
    const margen = esObjeto(medida) && !vacio(medida.margen) ? medida.margen : MARGEN_POR_DEFECTO;
    if (!esNumero(valor) || valor < 0 || !esNumero(margen) || margen < 0) {
      errores.push(`La medida «${campo}» no es válida.`);
      continue;
    }
    medidas[campo as CampoMedida] = { valor, margen };
  }
  return Object.keys(medidas).length ? medidas : undefined;
}

/** Los filtros que manda la pantalla, comprobados. Lo vacío se quita; lo mal hecho es un 400 que dice qué. */
export function validarFiltros(bruto: unknown): FiltrosBusqueda {
  if (vacio(bruto)) return {};
  if (!esObjeto(bruto)) throw new ErrorPedidoRemolques("Los filtros de la búsqueda no son válidos.");
  const errores: string[] = [];
  const filtros: FiltrosBusqueda = {
    texto: leerTexto(bruto, "texto", errores),
    cliente: leerTexto(bruto, "cliente", errores),
    tipo: leerDeLista(bruto, "tipo", TIPOS, errores),
    perfil: leerDeLista(bruto, "perfil", TIPOS_PERFIL, errores),
    recogida: leerRecogida(bruto.recogida, errores),
    medidas: leerMedidas(bruto.medidas, errores),
    ventana: leerDeLista(bruto, "ventana", SI_NO, errores),
    rotulacion: leerDeLista(bruto, "rotulacion", SI_NO, errores),
    bastilla: leerDeLista(bruto, "bastilla", SI_NO, errores),
    detrasDistinto: leerDeLista(bruto, "detrasDistinto", SI_NO, errores),
    material: leerTexto(bruto, "material", errores),
    estado: leerDeLista(bruto, "estado", ESTADOS, errores),
    desde: leerFecha(bruto, "desde", errores),
    hasta: leerFecha(bruto, "hasta", errores),
  };
  if (errores.length) throw new ErrorPedidoRemolques(`Los filtros de la búsqueda no son válidos: ${errores.join(" ")}`);
  return Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor !== undefined)) as FiltrosBusqueda;
}

// ── Filtrado ──

const norm = (valor: string | null | undefined) => normalizarNombre(String(valor ?? ""));
const contiene = (donde: string | null | undefined, que: string) => norm(donde).includes(norm(que));
const cerca = (valor: number, filtro: MedidaFiltro) => Math.abs(valor - filtro.valor) <= filtro.margen + 1e-9;
const cumpleSiNo = (filtro: SiNoFiltro | undefined, valor: boolean) => filtro === undefined || (filtro === "si") === valor;

/** Las medidas que solo tienen las lonas; en un baquetón no hay. Lo que no se escribió cuenta como 0. */
const MEDIDA_LONA: Record<Exclude<CampoMedida, "largo" | "ancho">, (lona: LonaInput) => number> = {
  alto: (lona) => lona.altoDelante,
  radioEsquina: (lona) => lona.radioEsquina ?? 0,
  radioCumbrera: (lona) => lona.radioCumbrera ?? 0,
  radioHombro: (lona) => lona.radioHombro ?? 0,
  aguas: (lona) => lona.aguas ?? 0,
  chaflan: (lona) => lona.chaflan ?? 0,
};

function valorMedida(elemento: ElementoGuardado, campo: CampoMedida): number | null {
  if (campo === "largo") return elemento.input.largo;
  if (campo === "ancho") return elemento.input.ancho;
  return elemento.tipo === "lona" ? MEDIDA_LONA[campo](elemento.input as LonaInput) : null;
}

const clienteElemento = (pedido: PedidoRemolques, elemento: ElementoGuardado) =>
  elemento.input.cabecera.cliente?.trim() || pedido.summary.customer || "";

/** La fecha del pedido de un elemento (AAAA-MM-DD): la de su cabecera, la del pedido o el día en que se guardó. */
export function fechaElemento(pedido: PedidoRemolques, elemento: ElementoGuardado): string {
  for (const fecha of [elemento.input.cabecera.fecha, pedido.summary.orderDate, pedido.createdAt]) {
    const corta = String(fecha ?? "").slice(0, 10);
    if (FECHA.test(corta)) return corta;
  }
  return "";
}

function cumpleTexto(pedido: PedidoRemolques, elemento: ElementoGuardado, texto: string): boolean {
  const of = elemento.input.cabecera.ordenFabricacion ?? "";
  const donde = norm([
    pedido.numeroPedido, pedido.orderCode, clienteElemento(pedido, elemento), of, normalizeOf(of), elemento.input.observaciones,
  ].join(" "));
  return texto.split(/\s+/)
    .map((palabra) => ({ palabra: norm(palabra), numero: normalizarNumeroPedido(palabra) }))
    .filter(({ palabra, numero }) => palabra !== "" || numero !== "")
    .every(({ palabra, numero }) => (palabra !== "" && donde.includes(palabra)) || (numero !== "" && pedido.orderCode.includes(numero)));
}

function cumpleRecogida(lona: LonaInput, { nombre, lado }: { nombre: string; lado: LadoRecogida }): boolean {
  const buscada = norm(nombre);
  const delante = norm(lona.recogeDelante) === buscada;
  const atras = norm(lona.recogeAtras) === buscada;
  return lado === "delante" ? delante : lado === "detras" ? atras : delante || atras;
}

/** ¿Cumple este elemento de este pedido todos los filtros? */
export function elementoCumple(pedido: PedidoRemolques, elemento: ElementoGuardado, filtros: FiltrosBusqueda): boolean {
  const f = filtros;
  if (f.texto && !cumpleTexto(pedido, elemento, f.texto)) return false;
  if (f.cliente && !contiene(clienteElemento(pedido, elemento), f.cliente)) return false;
  if (f.tipo && elemento.tipo !== f.tipo) return false;
  if (f.estado && (pedido.status === "PRODUCED") !== (f.estado === "generados")) return false;
  const fecha = fechaElemento(pedido, elemento);
  if (f.desde && (!fecha || fecha < f.desde)) return false;
  if (f.hasta && (!fecha || fecha > f.hasta)) return false;
  if (f.material && !contiene(elemento.input.material, f.material)) return false;
  if (!cumpleSiNo(f.rotulacion, elemento.input.rotulacion === true)) return false;
  for (const [campo, medida] of Object.entries(f.medidas ?? {}) as [CampoMedida, MedidaFiltro][]) {
    const valor = valorMedida(elemento, campo);
    if (valor === null || !cerca(valor, medida)) return false;
  }
  // Lo que solo tienen las lonas: con cualquiera de estos filtros puestos, un baquetón no sale.
  if (!(f.perfil || f.recogida || f.ventana || f.bastilla || f.detrasDistinto)) return true;
  if (elemento.tipo !== "lona") return false;
  const lona = elemento.input as LonaInput;
  if (f.perfil && lona.tipoPerfil !== f.perfil) return false;
  if (f.recogida && !cumpleRecogida(lona, f.recogida)) return false;
  return cumpleSiNo(f.ventana, lona.ventana === true)
    && cumpleSiNo(f.bastilla, lona.bastillaEnfundar === true)
    && cumpleSiNo(f.detrasDistinto, detrasDistinto(lona));
}

/** Lo que enseña la lista de un elemento. */
export function filaBusqueda(pedido: PedidoRemolques, elemento: ElementoGuardado, indice: number): FilaBusqueda {
  const lona = elemento.tipo === "lona" ? (elemento.input as LonaInput) : null;
  return {
    orderCode: pedido.orderCode,
    numeroPedido: pedido.numeroPedido,
    version: elemento.version,
    letra: awningLetter(indice),
    tipo: elemento.tipo,
    cliente: clienteElemento(pedido, elemento),
    fecha: fechaElemento(pedido, elemento),
    modelo: modeloElemento(elemento),
    largo: elemento.input.largo,
    ancho: elemento.input.ancho,
    alto: lona ? lona.altoDelante : null,
    recogeDelante: lona?.recogeDelante ?? "",
    recogeAtras: lona?.recogeAtras ?? "",
    material: elemento.input.material ?? "",
    of: normalizeOf(elemento.input.cabecera.ordenFabricacion ?? ""),
    estado: pedido.status,
  };
}

/**
 * Los elementos que cumplen los filtros, del pedido más nuevo al más antiguo (fecha del pedido; a
 * igual fecha, el guardado más tarde; dentro del pedido, por letra). Como mucho `limite` filas;
 * el total y los pedidos cuentan todos.
 */
export function buscarRemolques(pedidos: readonly PedidoRemolques[], filtros: FiltrosBusqueda, limite = LIMITE_FILAS): ResultadoBusqueda {
  const encontradas: { fila: FilaBusqueda; updatedAt: string; indice: number }[] = [];
  for (const pedido of pedidos) {
    pedido.elementos.forEach((elemento, indice) => {
      if (elementoCumple(pedido, elemento, filtros)) encontradas.push({ fila: filaBusqueda(pedido, elemento, indice), updatedAt: pedido.updatedAt, indice });
    });
  }
  encontradas.sort((a, b) => b.fila.fecha.localeCompare(a.fila.fecha)
    || b.updatedAt.localeCompare(a.updatedAt)
    || a.fila.orderCode.localeCompare(b.fila.orderCode)
    || a.indice - b.indice);
  return {
    filas: encontradas.slice(0, limite).map((e) => e.fila),
    total: encontradas.length,
    pedidos: new Set(encontradas.map((e) => e.fila.orderCode)).size,
    cortado: encontradas.length > limite,
    limite,
  };
}
