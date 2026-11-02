import type { BaquetonInput } from "../calc/baqueton.ts";
import type { LonaInput } from "../calc/lona.ts";
import type { RepartoLados } from "../calc/ollaos.ts";
import type { TipoPlanteamiento } from "../store/types.ts";
import type { LineaPedido } from "../workspace/lineas.ts";
import { DEFAULT_PARAMS, type CalcParams } from "../calc/params.ts";
import { hechaParaOllaos, propuestaOllaos } from "./adaptar-ollaos.ts";
import { CAMPOS_PERFIL } from "./reglas.ts";
import type { FichaCliente, MarcaDelCliente, MedidaHabitual } from "./tipos.ts";

// La ficha del cliente sobre los elementos recién creados desde RPS (fase 3): solo rellena lo que
// está vacío y apunta qué ha puesto para marcarlo «del cliente». Lo que el técnico cambie, manda.
// Solo se usa al obtener el pedido: abrir un borrador o «Corregir» no la vuelve a aplicar.

export const LINEA_CREMALLERA = "CREMALLERA DEL 9";

const r1 = (v: number) => Math.round(v * 10) / 10;
const lineasDe = (texto: string) => texto.split("\n").map((l) => l.trim()).filter(Boolean);
const clave = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLocaleUpperCase("es-ES");

export function medidaHabitual(ficha: FichaCliente, tipo: TipoPlanteamiento, largo: number, ancho: number): MedidaHabitual | null {
  return ficha.medidas?.find((m) => m.tipo === tipo && m.largo === largo && m.ancho === ancho) ?? null;
}

/** Lo calculado se copia al pedido; ni abrirlo ni cambiar la ficha vuelven a adaptar sus ollaos. */
function conOllaosDeFicha<T extends LonaInput | BaquetonInput>(input: T, ficha: FichaCliente, tipo: TipoPlanteamiento, campos: string[], params: CalcParams): T {
  if (input.modoOllaos !== "") return input;
  const propuesta = propuestaOllaos(ficha, tipo, input, params);
  const siguiente = conOllaos(input, propuesta?.ollaos ?? null, campos, ficha.ollaosRepartidos);
  return propuesta?.origenes.length ? { ...siguiente, ollaosAdaptados: { origenes: propuesta.origenes, hecha: hechaParaOllaos(tipo, input, params) } } : siguiente;
}

function conObservaciones(actual: string, nuevas: readonly string[], campos: string[]): string {
  const lineas = lineasDe(actual);
  const faltan = nuevas.map((n) => n.trim()).filter((n) => n && !lineas.some((l) => clave(l) === clave(n)));
  if (faltan.length === 0) return actual;
  campos.push("observaciones");
  return [...lineas, ...faltan].join("\n");
}

function conOllaos<T extends LonaInput | BaquetonInput>(input: T, ollaos: RepartoLados | null, campos: string[], repartidos = false): T {
  if (input.modoOllaos !== "") return input;
  // «Siempre repartidos» (Iván, 29/10/2026: CARMA, Camacho): si no hay una medida habitual exacta, repartidos.
  if (repartidos && !ollaos) {
    campos.push("modoOllaos");
    return { ...input, modoOllaos: "REPARTIDOS" };
  }
  if (!ollaos) return input;
  campos.push("modoOllaos", "ollaosManuales");
  return {
    ...input,
    modoOllaos: "SEGUN SE INDICA",
    ollaosManuales: { laterales: [...ollaos.laterales], atras: [...ollaos.atras], delante: [...ollaos.delante] },
  };
}

function aplicarLona(entrada: LonaInput, ficha: FichaCliente, campos: string[], params: CalcParams): LonaInput {
  let input: LonaInput = { ...entrada };
  if (ficha.demasiaLonaHecha !== undefined && input.demasiaLonaHecha === undefined) {
    input.demasiaLonaHecha = ficha.demasiaLonaHecha;
    campos.push("demasiaLonaHecha");
  }
  const perfil = ficha.perfil;
  if (perfil && input.tipoPerfil === "") {
    input.tipoPerfil = perfil.tipoPerfil;
    campos.push("tipoPerfil");
    for (const campo of CAMPOS_PERFIL) {
      const valor = perfil[campo];
      if (valor != null && valor > 0 && !(input[campo] ?? 0)) {
        input[campo] = valor;
        campos.push(campo);
      }
    }
  }
  // RPS solo dice si el texto menciona una recogida: «» si la menciona sin tipo y «NO» si no la
  // menciona. Ninguna de las dos es una decisión: las dos se rellenan con la de la ficha.
  for (const lado of ["recogeDelante", "recogeAtras"] as const) {
    const valor = ficha[lado];
    if (valor && (input[lado] === "" || input[lado] === "NO") && input[lado] !== valor) {
      input[lado] = valor;
      campos.push(lado);
    }
  }
  if (ficha.bastillaEnfundar != null && input.bastillaEnfundar === null) {
    input.bastillaEnfundar = ficha.bastillaEnfundar;
    campos.push("bastillaEnfundar");
  }
  if (ficha.ventana) {
    // Igual con la ventana: un «No» de RPS solo dice que el texto no la menciona.
    if (input.ventana !== true && ficha.ventana.lleva) {
      input.ventana = true;
      campos.push("ventana");
    } else if (input.ventana === null) {
      input.ventana = false;
      campos.push("ventana");
    }
    if (input.ventana) {
      for (const [campo, valor] of [["ventanaAncho", ficha.ventana.ancho], ["ventanaAlto", ficha.ventana.alto]] as const) {
        if (valor != null && valor > 0 && !(input[campo] ?? 0)) {
          input[campo] = valor;
          campos.push(campo);
        }
      }
    }
  }
  if (ficha.rotulacion != null && input.rotulacion === null) {
    input.rotulacion = ficha.rotulacion;
    campos.push("rotulacion");
  }
  if (ficha.material && !input.material.trim()) {
    input.material = ficha.material;
    campos.push("material");
  }
  if (ficha.sesgoDetras && input.ancho > 0 && !(input.anchoAtras ?? 0)) {
    input.anchoAtras = r1(input.ancho + ficha.sesgoDetras);
    campos.push("anchoAtras");
  }
  input = conOllaosDeFicha(input, ficha, "lona", campos, params);
  const fijas = [...(ficha.cremallera ? [LINEA_CREMALLERA] : []), ...(ficha.observaciones ?? [])];
  return { ...input, observaciones: conObservaciones(input.observaciones, fijas, campos) };
}

function aplicarBaqueton(entrada: BaquetonInput, ficha: FichaCliente, campos: string[], params: CalcParams): BaquetonInput {
  let input: BaquetonInput = { ...entrada };
  if (ficha.extrasBaqueton && input.clienteEspecifico === "GENERAL") {
    input.clienteEspecifico = ficha.nombre;
    campos.push("clienteEspecifico");
  }
  if (ficha.rotulacion != null && input.rotulacion === null) {
    input.rotulacion = ficha.rotulacion;
    campos.push("rotulacion");
  }
  if (ficha.material && !input.material.trim()) {
    input.material = ficha.material;
    campos.push("material");
  }
  input = conOllaosDeFicha(input, ficha, "baqueton", campos, params);
  return { ...input, observaciones: conObservaciones(input.observaciones, ficha.observaciones ?? [], campos) };
}

/** La ficha sobre un elemento recién creado desde RPS: solo rellena lo vacío y marca lo que pone. */
export function aplicarFichaAlImportar(linea: LineaPedido, ficha: FichaCliente, params: CalcParams = DEFAULT_PARAMS): LineaPedido {
  // Las fichas de cliente son de lonas y baquetones; el de ganado trae todo de su plantilla.
  if (linea.tipo === "ganado") return linea;
  const campos: string[] = [];
  const input = linea.tipo === "lona"
    ? aplicarLona(linea.input as LonaInput, ficha, campos, params)
    : aplicarBaqueton(linea.input as BaquetonInput, ficha, campos, params);
  return campos.length > 0 ? { ...linea, input, delCliente: { ficha: ficha.nombre, campos } } : linea;
}

export function aplicarFichaALineas(lineas: LineaPedido[], ficha: FichaCliente | null, params: CalcParams = DEFAULT_PARAMS): LineaPedido[] {
  return ficha ? lineas.map((linea) => aplicarFichaAlImportar(linea, ficha, params)) : lineas;
}

/** Tras un cambio del técnico, la marca pierde los campos que ya no tienen el valor de la ficha. */
export function marcasTrasCambio(marca: MarcaDelCliente | undefined, antes: object, despues: object): MarcaDelCliente | undefined {
  if (!marca) return undefined;
  const a = antes as Record<string, unknown>;
  const d = despues as Record<string, unknown>;
  const campos = marca.campos.filter((campo) => JSON.stringify(a[campo]) === JSON.stringify(d[campo]));
  if (campos.length === marca.campos.length) return marca;
  return campos.length > 0 ? { ...marca, campos } : undefined;
}
