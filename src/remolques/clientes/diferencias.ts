import type { BaquetonInput } from "../calc/baqueton.ts";
import type { LonaInput } from "../calc/lona.ts";
import type { RepartoLados } from "../calc/ollaos.ts";
import { findClienteBaqueton, nombrePerfil, type CalcParams } from "../calc/params.ts";
import { etiquetaOpcion } from "../etiquetas.ts";
import { LINEA_CREMALLERA, medidaHabitual } from "./aplicar.ts";
import { CAMPOS_EXTRAS, CAMPOS_PERFIL, normalizarNombre } from "./reglas.ts";
import type { ExtrasBaqueton, FichaCliente, MedidaHabitual, PerfilFicha, VentanaFicha } from "./tipos.ts";

// «Guardar en la ficha del cliente» (fase 3): qué tiene un elemento distinto de la ficha (la medida
// con sus ollaos, marcada; lo habitual, desmarcado) y cómo queda la ficha con lo que se marque.

export type ElementoFicha = { tipo: "lona"; input: LonaInput } | { tipo: "baqueton"; input: BaquetonInput };

export const CLAVES_FICHA = [
  "medida", "perfil", "recogeDelante", "recogeAtras", "bastillaEnfundar", "ventana", "rotulacion", "material",
  "sesgoDetras", "cremallera", "extrasBaqueton",
] as const;
export type ClaveFicha = (typeof CLAVES_FICHA)[number];

export interface ValoresFicha {
  medida?: MedidaHabitual;
  perfil?: PerfilFicha;
  recogeDelante?: string;
  recogeAtras?: string;
  bastillaEnfundar?: boolean;
  ventana?: VentanaFicha;
  rotulacion?: boolean;
  material?: string;
  sesgoDetras?: number;
  cremallera?: boolean;
  extrasBaqueton?: ExtrasBaqueton;
}

export interface DiferenciaFicha {
  clave: ClaveFicha;
  etiqueta: string;
  /** «—» si la ficha no lo tiene. */
  antes: string;
  despues: string;
  /** Solo la medida: «nueva» o «actualiza la de antes». */
  nota?: string;
  /** Marcada al abrir la ventana: solo la medida con sus ollaos. */
  marcada: boolean;
}

const NADA = "—";
const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
const conSigno = (n: number) => (n > 0 ? `+${fmt(n)}` : fmt(n));
const r1 = (v: number) => Math.round(v * 10) / 10;
/** JSON con las claves ordenadas: el mismo valor escrito en otro orden es igual. */
const estable = (valor: unknown) => JSON.stringify(valor, (_clave, v: unknown) => (
  v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
    : v
));
const copiaOllaos = (o: RepartoLados): RepartoLados => ({ delante: [...o.delante], atras: [...o.atras], laterales: [...o.laterales] });

const ETIQUETA_PERFIL: Record<(typeof CAMPOS_PERFIL)[number], string> = {
  aguas: "aguas", radioCumbrera: "radio cumbrera", radioHombro: "radio hombro", radioEsquina: "radio esquina",
  chaflan: "chaflán", radioChaflanAbajo: "radio abajo", radioChaflanArriba: "radio arriba",
};
const ETIQUETAS: Record<Exclude<ClaveFicha, "medida">, string> = {
  perfil: "Perfil y sus medidas", recogeDelante: "Recogida delante", recogeAtras: "Recogida detrás",
  bastillaEnfundar: "Bastilla de enfundar", ventana: "Ventana", rotulacion: "Rotulación", material: "Material",
  sesgoDetras: "Sesgo detrás", cremallera: "Cremallera del 9", extrasBaqueton: "Extras de baquetón",
};

/** Lo que el elemento diría a la ficha; lo que no tiene (sin elegir, vacío), no está. */
export function valoresDelElemento(elemento: ElementoFicha, params: CalcParams): ValoresFicha {
  const valores: ValoresFicha = {};
  const { input } = elemento;
  const o = input.ollaosManuales;
  if (input.modoOllaos === "SEGUN SE INDICA" && input.largo > 0 && input.ancho > 0
    && [o.delante, o.atras, o.laterales].some((lado) => lado.length > 0)) {
    valores.medida = { tipo: elemento.tipo, largo: input.largo, ancho: input.ancho, ollaos: copiaOllaos(o) };
  }
  if (elemento.tipo === "lona") {
    const lona = elemento.input;
    if (lona.tipoPerfil) {
      const perfil: PerfilFicha = { tipoPerfil: lona.tipoPerfil };
      for (const campo of CAMPOS_PERFIL) {
        const valor = lona[campo];
        if (valor != null && valor > 0) perfil[campo] = valor;
      }
      valores.perfil = perfil;
    }
    if (lona.recogeDelante) valores.recogeDelante = lona.recogeDelante;
    if (lona.recogeAtras) valores.recogeAtras = lona.recogeAtras;
    if (lona.bastillaEnfundar !== null) valores.bastillaEnfundar = lona.bastillaEnfundar;
    if (lona.ventana !== null) {
      valores.ventana = lona.ventana
        ? { lleva: true, ...(lona.ventanaAncho ? { ancho: lona.ventanaAncho } : {}), ...(lona.ventanaAlto ? { alto: lona.ventanaAlto } : {}) }
        : { lleva: false };
    }
  }
  if (input.rotulacion !== null) valores.rotulacion = input.rotulacion;
  if (input.material.trim()) valores.material = input.material.trim();
  if (elemento.tipo === "lona") {
    const lona = elemento.input;
    if (lona.ancho > 0 && (lona.anchoAtras ?? 0) > lona.ancho) valores.sesgoDetras = r1((lona.anchoAtras ?? 0) - lona.ancho);
    if (lona.observaciones.split("\n").some((l) => normalizarNombre(l) === normalizarNombre(LINEA_CREMALLERA))) valores.cremallera = true;
  } else {
    const nombre = elemento.input.clienteEspecifico;
    const cliente = nombre && nombre !== "GENERAL" ? findClienteBaqueton(params, nombre) : null;
    if (cliente && cliente.nombre === nombre) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { nombre: _nombre, ...extras } = cliente;
      valores.extrasBaqueton = { ...extras, observaciones: [...extras.observaciones] };
    }
  }
  return valores;
}

function valorEnFicha(ficha: FichaCliente | null, clave: ClaveFicha, nuevos: ValoresFicha): unknown {
  if (!ficha) return undefined;
  if (clave === "medida") {
    const m = nuevos.medida!;
    return medidaHabitual(ficha, m.tipo, m.largo, m.ancho) ?? undefined;
  }
  return ficha[clave];
}

const textoOllaos = (o: RepartoLados) => ([["Delante", o.delante], ["Atrás", o.atras], ["Laterales", o.laterales]] as const)
  .filter(([, posiciones]) => posiciones.length > 0)
  .map(([lado, posiciones]) => `${lado} ${posiciones.map(fmt).join(" · ")}`)
  .join(" | ");

function texto(clave: ClaveFicha, valor: unknown): string {
  if (valor === undefined) return NADA;
  switch (clave) {
    case "medida":
      return textoOllaos((valor as MedidaHabitual).ollaos);
    case "perfil": {
      const perfil = valor as PerfilFicha;
      const medidas = CAMPOS_PERFIL.flatMap((c) => (perfil[c] != null ? [`${ETIQUETA_PERFIL[c]} ${fmt(perfil[c]!)}`] : []));
      return [nombrePerfil(perfil.tipoPerfil), ...medidas].join(" · ");
    }
    case "recogeDelante":
    case "recogeAtras":
      return etiquetaOpcion(String(valor));
    case "bastillaEnfundar":
    case "rotulacion":
    case "cremallera":
      return valor ? "Sí" : "No";
    case "ventana": {
      const ventana = valor as VentanaFicha;
      if (!ventana.lleva) return "No";
      return ventana.ancho && ventana.alto ? `Sí · ${fmt(ventana.ancho)} × ${fmt(ventana.alto)}` : "Sí";
    }
    case "material":
      return String(valor);
    case "sesgoDetras":
      return `${fmt(valor as number)} cm más ancho detrás`;
    case "extrasBaqueton": {
      const e = valor as ExtrasBaqueton;
      return `costura ${conSigno(e.extraLargoCostura)} / ${conSigno(e.extraAnchoCostura)} · baquetón ${conSigno(e.extraBaquetonLargoDelante)} / ${conSigno(e.extraBaquetonLargoDetras)} · final ${conSigno(e.extraLargoFinal)} / ${conSigno(e.extraAnchoFinal)} · trasero ${conSigno(e.extraBaquetonTrasero)}`;
    }
  }
}

function etiqueta(clave: ClaveFicha, nuevos: ValoresFicha): string {
  if (clave !== "medida") return ETIQUETAS[clave];
  const m = nuevos.medida!;
  return `Medida ${fmt(m.largo)} × ${fmt(m.ancho)} de ${m.tipo === "lona" ? "lona" : "baquetón"} con sus ollaos`;
}

/** Lo que el elemento tiene distinto de la ficha (o todo, si el cliente no tiene ficha). */
export function diferenciasConFicha(elemento: ElementoFicha, ficha: FichaCliente | null, params: CalcParams): DiferenciaFicha[] {
  const nuevos = valoresDelElemento(elemento, params);
  const diferencias: DiferenciaFicha[] = [];
  for (const clave of CLAVES_FICHA) {
    const nuevo = nuevos[clave];
    if (nuevo === undefined) continue;
    const antes = valorEnFicha(ficha, clave, nuevos);
    if (estable(antes) === estable(nuevo)) continue;
    diferencias.push({
      clave,
      etiqueta: etiqueta(clave, nuevos),
      antes: texto(clave, antes),
      despues: texto(clave, nuevo),
      ...(clave === "medida" ? { nota: antes === undefined ? "nueva" : "actualiza la de antes" } : {}),
      marcada: clave === "medida",
    });
  }
  return diferencias;
}

/** La ficha con lo marcado del elemento. La medida sustituye a la del mismo elemento y largo × ancho. */
export function fichaConCambios(ficha: FichaCliente, elemento: ElementoFicha, claves: readonly string[], params: CalcParams): FichaCliente {
  const nuevos = valoresDelElemento(elemento, params);
  const siguiente: FichaCliente = { ...ficha };
  for (const clave of CLAVES_FICHA) {
    const valor = nuevos[clave];
    if (!claves.includes(clave) || valor === undefined) continue;
    if (clave === "medida") {
      const medida = valor as MedidaHabitual;
      const actuales = ficha.medidas ?? [];
      const igual = (m: MedidaHabitual) => m.tipo === medida.tipo && m.largo === medida.largo && m.ancho === medida.ancho;
      siguiente.medidas = actuales.some(igual) ? actuales.map((m) => (igual(m) ? medida : m)) : [...actuales, medida];
    } else {
      (siguiente as unknown as Record<string, unknown>)[clave] = valor;
    }
  }
  return siguiente;
}

// Historial de cada ficha (Iván, 01/10/2026): qué cambió entre dos versiones, en frases cortas,
// para no tener que escribir un motivo en cada cambio.

const ETIQUETAS_EXTRAS: Record<(typeof CAMPOS_EXTRAS)[number], string> = {
  extraLargoCostura: "extra de largo a costura", extraAnchoCostura: "extra de ancho a costura",
  extraBaquetonLargoDelante: "extra de baquetón delante", extraBaquetonLargoDetras: "extra de baquetón detrás",
  extraLargoFinal: "extra de largo final", extraAnchoFinal: "extra de ancho final", extraBaquetonTrasero: "extra de baquetón trasero",
};
const textoTrabajo = (v: FichaCliente["trabajo"]) => (v === "lona" ? "Lona" : v === "baqueton" ? "Baquetón" : NADA);
const igual = (a: unknown, b: unknown) => estable(a) === estable(b);
/** «+ 099991, − 009999»: lo que entra y lo que sale de una lista. */
function altasYBajas(antes: readonly string[], despues: readonly string[]): string {
  const altas = despues.filter((x) => !antes.includes(x)).map((x) => `+ ${x}`);
  const bajas = antes.filter((x) => !despues.includes(x)).map((x) => `− ${x}`);
  return [...altas, ...bajas].join(", ") || "otro orden";
}
const claveMedida = (m: MedidaHabitual) => `${m.tipo}:${m.largo}x${m.ancho}`;
const nombreMedida = (m: MedidaHabitual) => `Medida ${fmt(m.largo)} × ${fmt(m.ancho)} de ${m.tipo === "lona" ? "lona" : "baquetón"}`;

function resumenMedidas(antes: readonly MedidaHabitual[], despues: readonly MedidaHabitual[]): string[] {
  const previas = new Map(antes.map((m) => [claveMedida(m), m]));
  const lineas: string[] = [];
  for (const m of despues) {
    const previa = previas.get(claveMedida(m));
    previas.delete(claveMedida(m));
    if (!previa) lineas.push(`${nombreMedida(m)} nueva`);
    else if (!igual(previa.ollaos, m.ollaos)) lineas.push(`${nombreMedida(m)}: ollaos ${textoOllaos(previa.ollaos) || NADA} → ${textoOllaos(m.ollaos) || NADA}`);
  }
  for (const quitada of previas.values()) lineas.push(`${nombreMedida(quitada)} quitada`);
  return lineas;
}

function resumenExtras(antes: ExtrasBaqueton | undefined, despues: ExtrasBaqueton | undefined): string | null {
  if (igual(antes, despues)) return null;
  if (!antes) return "Extras de baquetón: añadidos";
  if (!despues) return "Extras de baquetón: quitados";
  const partes = CAMPOS_EXTRAS.filter((c) => antes[c] !== despues[c])
    .map((c) => `${ETIQUETAS_EXTRAS[c]} ${conSigno(antes[c])} → ${conSigno(despues[c])}`);
  if (!igual(antes.observaciones, despues.observaciones)) partes.push("observaciones cambiadas");
  return `Extras de baquetón: ${partes.join("; ")}`;
}

/**
 * Qué cambió de una ficha, una frase por cosa: «Ficha creada», «Medida 220 × 130 de lona nueva»,
 * «Recogida detrás: — → Goma», «Códigos de RPS: + 099991»… Vacío si no cambió nada (la versión no cuenta).
 */
export function resumenCambios(antes: FichaCliente | null, despues: FichaCliente | null): string[] {
  if (!antes) return despues ? ["Ficha creada"] : [];
  if (!despues) return ["Ficha quitada"];
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { version: _va, ...a } = antes;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { version: _vd, ...d } = despues;
  if (igual(a, d)) return [];
  const lineas: string[] = [];
  const valor = (clave: Exclude<ClaveFicha, "medida" | "extrasBaqueton">) => {
    if (igual(a[clave], d[clave])) return;
    const nombre = clave === "perfil" ? "Perfil" : ETIQUETAS[clave];
    lineas.push(`${nombre}: ${texto(clave, a[clave])} → ${texto(clave, d[clave])}`);
  };
  if (a.nombre !== d.nombre) lineas.push(`Nombre: ${a.nombre || NADA} → ${d.nombre || NADA}`);
  if (!igual(a.codigosRps, d.codigosRps)) lineas.push(`Códigos de RPS: ${altasYBajas(a.codigosRps, d.codigosRps)}`);
  if (a.trabajo !== d.trabajo) lineas.push(`Trabajo habitual: ${textoTrabajo(a.trabajo)} → ${textoTrabajo(d.trabajo)}`);
  (["perfil", "recogeDelante", "recogeAtras"] as const).forEach(valor);
  if (!igual(a.recogidaPropia, d.recogidaPropia)) {
    const [pa, pd] = [a.recogidaPropia, d.recogidaPropia];
    if (!pa) lineas.push(`Recogida propia: + ${pd!.nombre}`);
    else if (!pd) lineas.push(`Recogida propia: − ${pa.nombre}`);
    else if (pa.nombre !== pd.nombre) lineas.push(`Recogida propia: ${pa.nombre} → ${pd.nombre}`);
    else lineas.push(`Recogida propia ${pd.nombre} cambiada`);
  }
  (["bastillaEnfundar", "ventana", "rotulacion", "material", "sesgoDetras", "cremallera"] as const).forEach(valor);
  const extras = resumenExtras(a.extrasBaqueton, d.extrasBaqueton);
  if (extras) lineas.push(extras);
  if (!igual(a.observaciones ?? [], d.observaciones ?? [])) lineas.push(`Observaciones fijas: ${altasYBajas(a.observaciones ?? [], d.observaciones ?? [])}`);
  lineas.push(...resumenMedidas(a.medidas ?? [], d.medidas ?? []));
  return lineas.length ? lineas : ["Ficha cambiada"];
}
