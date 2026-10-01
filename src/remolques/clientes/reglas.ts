import { TIPOS_PERFIL, type TipoPerfil } from "../calc/params.ts";
import type { ClienteRps } from "../rps/types.ts";
import type { FichaCliente } from "./tipos.ts";

// Reglas puras de las fichas de cliente: las usan el servidor (almacén) y la web.

/** Sin acentos, signos ni mayúsculas: así se comparan nombres de cliente (como hacía el baquetón). */
export const normalizarNombre = (valor: string): string => valor
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^A-Z0-9]+/gi, " ")
  .trim()
  .toLocaleUpperCase("es-ES");

export const CAMPOS_PERFIL = [
  "aguas", "radioCumbrera", "radioHombro", "radioEsquina", "chaflan", "radioChaflanAbajo", "radioChaflanArriba",
] as const;
export const CAMPOS_EXTRAS = [
  "extraLargoCostura", "extraAnchoCostura", "extraBaquetonLargoDelante", "extraBaquetonLargoDetras",
  "extraLargoFinal", "extraAnchoFinal", "extraBaquetonTrasero",
] as const;
export const LADOS_OLLAOS = ["delante", "atras", "laterales"] as const;

const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const esNumero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const esTexto = (v: unknown): v is string => typeof v === "string";
const listaDeTextos = (v: unknown): v is string[] => Array.isArray(v) && v.every(esTexto);
const noNegativo = (v: unknown) => esNumero(v) && v >= 0;
const positivo = (v: unknown) => esNumero(v) && v > 0;

/** Identificador estable sacado del nombre («hijos-de-pedro-lopez»), sin repetir ninguno de `usados`. */
export function idFicha(nombre: string, usados: ReadonlySet<string>): string {
  const base = normalizarNombre(nombre).toLowerCase().replace(/ /g, "-") || "ficha";
  let id = base;
  for (let n = 2; usados.has(id); n++) id = `${base}-${n}`;
  return id;
}

export function fichaPorCodigo(fichas: readonly FichaCliente[], codigo: string | null | undefined): FichaCliente | null {
  const buscado = String(codigo ?? "").trim();
  if (!buscado) return null;
  return fichas.find((f) => f.codigosRps.some((c) => c.trim() === buscado)) ?? null;
}

/**
 * La ficha cuyo nombre está dentro del nombre o del alias del cliente de RPS, sin acentos ni
 * mayúsculas (como se buscaban hasta ahora los clientes de baquetón). Si casan varias, la de
 * nombre más largo, que es la más concreta.
 */
export function sugerirFicha(fichas: readonly FichaCliente[], cliente: Pick<ClienteRps, "nombre" | "alias">): FichaCliente | null {
  const textos = [cliente.alias ?? "", cliente.nombre].map(normalizarNombre).filter(Boolean);
  const casan = fichas.filter((f) => {
    const nombre = normalizarNombre(f.nombre);
    return nombre !== "" && textos.some((texto) => texto.includes(nombre));
  });
  return [...casan].sort((a, b) => normalizarNombre(b.nombre).length - normalizarNombre(a.nombre).length)[0] ?? null;
}

/** Nombres de las fichas añadidas, cambiadas o quitadas (para el historial). */
export function fichasCambiadas(antes: readonly FichaCliente[], despues: readonly FichaCliente[]): string[] {
  const pendientes = new Map(antes.map((f) => [f.id, f]));
  const nombres: string[] = [];
  for (const ficha of despues) {
    const anterior = pendientes.get(ficha.id);
    if (!anterior || JSON.stringify(anterior) !== JSON.stringify(ficha)) nombres.push(ficha.nombre);
    pendientes.delete(ficha.id);
  }
  for (const quitada of pendientes.values()) nombres.push(quitada.nombre);
  return nombres;
}

type Resultado = { ok: true; fichas: FichaCliente[] } | { ok: false; errores: string[] };

/**
 * Validación estricta antes de guardar todas las fichas. Devuelve las fichas limpias (nombre y
 * códigos sin espacios, sin observaciones vacías) o los errores en castellano llano.
 */
export function validarFichas(bruto: unknown, { recogidasGenerales }: { recogidasGenerales: readonly string[] }): Resultado {
  if (!Array.isArray(bruto)) return { ok: false, errores: ["Las fichas tienen que ser una lista."] };
  const errores: string[] = [];
  const ids = new Set<string>();
  const nombres = new Set<string>();
  const codigos = new Map<string, string>();
  const generales = new Set(recogidasGenerales.map(normalizarNombre));
  const propias = new Set<string>();
  const fichas = bruto.map((elemento, i) => {
    const ficha = esObjeto(elemento) ? elemento : {};
    const nombre = esTexto(ficha.nombre) ? ficha.nombre.trim() : "";
    const quien = nombre ? `Ficha «${nombre}»` : `Ficha ${i + 1}`;
    const mal = (texto: string) => { errores.push(`${quien}: ${texto}`); };
    if (!esTexto(ficha.id) || !ficha.id.trim()) mal("falta el identificador");
    else if (ids.has(ficha.id)) mal("el identificador está repetido");
    else ids.add(ficha.id);
    const clave = normalizarNombre(nombre);
    if (!nombre) mal("falta el nombre");
    else if (clave === "GENERAL") mal("«GENERAL» es el valor general del baquetón; usa otro nombre");
    else if (nombres.has(clave)) mal("el nombre está repetido");
    nombres.add(clave);
    const codigosRps = listaDeTextos(ficha.codigosRps) ? ficha.codigosRps.map((c) => c.trim()).filter(Boolean) : null;
    if (!codigosRps) mal("los códigos de RPS tienen que ser textos");
    else for (const codigo of codigosRps) {
      const otra = codigos.get(codigo);
      if (otra === undefined) codigos.set(codigo, nombre);
      else if (otra === nombre) mal(`el código ${codigo} está repetido`);
      else errores.push(`El código de RPS ${codigo} está en dos fichas: «${otra}» y «${nombre}»`);
    }
    comprobarOpcionales(ficha, mal, generales, propias);
    const observaciones = listaDeTextos(ficha.observaciones)
      ? { observaciones: ficha.observaciones.map((o) => o.trim()).filter(Boolean) }
      : {};
    return { ...ficha, nombre, codigosRps: codigosRps ?? [], ...observaciones } as unknown as FichaCliente;
  });
  return errores.length > 0 ? { ok: false, errores } : { ok: true, fichas };
}

function comprobarOpcionales(
  f: Record<string, unknown>, mal: (texto: string) => void, generales: Set<string>, propias: Set<string>,
) {
  if (f.trabajo !== undefined && f.trabajo !== "lona" && f.trabajo !== "baqueton") mal("el trabajo habitual es lona o baquetón");
  if (f.perfil !== undefined) {
    const perfil = esObjeto(f.perfil) ? f.perfil : {};
    if (!TIPOS_PERFIL.includes(perfil.tipoPerfil as TipoPerfil)) mal("elige el perfil");
    for (const campo of CAMPOS_PERFIL) {
      if (perfil[campo] !== undefined && !noNegativo(perfil[campo])) mal(`el perfil: «${campo}» tiene que ser un número`);
    }
  }
  let propia = "";
  if (f.recogidaPropia !== undefined) {
    const recogida = esObjeto(f.recogidaPropia) ? f.recogidaPropia : {};
    propia = esTexto(recogida.nombre) ? recogida.nombre.trim() : "";
    const clave = normalizarNombre(propia);
    if (!propia) mal("la recogida propia necesita un nombre");
    else if (generales.has(clave)) mal(`la recogida propia «${propia}» se llama como una de Parámetros; usa otro nombre`);
    else if (propias.has(clave)) mal(`la recogida «${propia}» ya es la propia de otra ficha`);
    propias.add(clave);
    for (const campo of ["delante", "atras", "lateralSoloAtras", "lateralSoloDelante"] as const) {
      if (!esNumero(recogida[campo])) mal(`la recogida propia: «${campo}» tiene que ser un número`);
    }
    if (recogida.panoTraseroConAnchoDelante !== undefined && typeof recogida.panoTraseroConAnchoDelante !== "boolean") {
      mal("la recogida propia: «paño trasero con el ancho de delante» es sí o no");
    }
  }
  for (const [lado, texto] of [["recogeDelante", "de delante"], ["recogeAtras", "de detrás"]] as const) {
    const valor = f[lado];
    if (valor === undefined) continue;
    const existe = esTexto(valor)
      && (generales.has(normalizarNombre(valor)) || (propia !== "" && normalizarNombre(valor) === normalizarNombre(propia)));
    if (!existe) mal(`la recogida ${texto} «${String(valor)}» no existe`);
  }
  for (const campo of ["bastillaEnfundar", "rotulacion", "cremallera"] as const) {
    if (f[campo] !== undefined && typeof f[campo] !== "boolean") mal(`«${campo}» es sí o no`);
  }
  if (f.ventana !== undefined) {
    const ventana = esObjeto(f.ventana) ? f.ventana : {};
    if (typeof ventana.lleva !== "boolean") mal("la ventana es sí o no");
    for (const campo of ["ancho", "alto"] as const) {
      if (ventana[campo] !== undefined && !noNegativo(ventana[campo])) mal(`la ventana: «${campo}» tiene que ser un número`);
    }
  }
  if (f.material !== undefined && !esTexto(f.material)) mal("el material tiene que ser un texto");
  if (f.sesgoDetras !== undefined && !positivo(f.sesgoDetras)) mal("el sesgo detrás tiene que ser un número mayor que 0");
  if (f.extrasBaqueton !== undefined) {
    const extras = esObjeto(f.extrasBaqueton) ? f.extrasBaqueton : {};
    for (const campo of CAMPOS_EXTRAS) {
      if (!esNumero(extras[campo])) mal(`los extras de baquetón: «${campo}» tiene que ser un número`);
    }
    if (!listaDeTextos(extras.observaciones)) mal("los extras de baquetón: las observaciones son líneas de texto");
  }
  if (f.observaciones !== undefined && !listaDeTextos(f.observaciones)) mal("las observaciones fijas son líneas de texto");
  if (f.medidas !== undefined) comprobarMedidas(f.medidas, mal);
}

function comprobarMedidas(medidas: unknown, mal: (texto: string) => void) {
  if (!Array.isArray(medidas)) {
    mal("las medidas habituales tienen que ser una lista");
    return;
  }
  const vistas = new Set<string>();
  medidas.forEach((elemento, i) => {
    const medida = esObjeto(elemento) ? elemento : {};
    const n = `medida ${i + 1}`;
    if (medida.tipo !== "lona" && medida.tipo !== "baqueton") mal(`${n}: es de lona o de baquetón`);
    if (!positivo(medida.largo) || !positivo(medida.ancho)) {
      mal(`${n}: el largo y el ancho tienen que ser mayores que 0`);
    } else {
      const clave = `${String(medida.tipo)}:${medida.largo}x${medida.ancho}`;
      if (vistas.has(clave)) mal(`${n}: la medida ${fmt(medida.largo as number)} × ${fmt(medida.ancho as number)} está repetida`);
      vistas.add(clave);
    }
    const ollaos = esObjeto(medida.ollaos) ? medida.ollaos : {};
    const lados = LADOS_OLLAOS.map((lado) => ollaos[lado]);
    if (!lados.every((p) => Array.isArray(p) && p.every(positivo))) {
      mal(`${n}: las posiciones de los ollaos tienen que ser números mayores que 0`);
    } else if (lados.every((p) => (p as unknown[]).length === 0)) {
      mal(`${n}: no tiene ningún ollao`);
    }
  });
}
