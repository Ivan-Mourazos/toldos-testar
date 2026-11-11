import { errorChaflanConAguas } from "../geometry/chaflan.ts";
import { aguasLongitudinales, type LonaInput, type LonaResult } from "../calc/lona.ts";
import type { CalcParams, TipoPerfil } from "../calc/params.ts";
import { colorBaseMaterial } from "../geometry/color-lona.ts";
import { perfilForma, type PerfilOpts } from "../geometry/perfil.ts";
import { cierresLona, tipoCierre } from "./cierres.ts";
import { cajaDe, chasisDe, rotulosDe } from "./chasis.ts";
import { cajonDe, gomasDe, marcasGanchos, marcasOllaos, posicionesGanchos } from "./comun.ts";
import { ALTO_CAJON, BASTILLA } from "./constantes.ts";
import { cotasAguas, cotasCuerpo, cotasPlanoSuperior, cotasVentana, etiquetasMarcas } from "./cotas.ts";
import type { CuerpoLona, EscenaRemolque, Perfil2D } from "./tipos.ts";
import { ventanaLona } from "./ventana.ts";

/** El mismo criterio que el dibujo técnico: sin la forma decidida y sus medidas no hay nada que dibujar. */
export function lonaDibujable(input: LonaInput): boolean {
  if (!(input.largo > 0 && input.ancho > 0 && input.altoDelante > 0) || input.tipoPerfil === "") return false;
  if ((input.tipoPerfil === "TIPO 02" || input.tipoPerfil === "TIPO 03") && !((input.aguas ?? 0) > 0)) return false;
  if (aguasLongitudinales(input) && (input.aguas ?? 0) >= Math.min(input.altoDelante, input.altoAtras > 0 ? input.altoAtras : input.altoDelante)) return false;
  if (input.tipoPerfil === "TIPO 04" && (input.modoChaflan === "plano-aguas" ? errorChaflanConAguas(input) != null : !((input.chaflan ?? 0) > 0))) return false;
  if (input.tipoPerfil === "TIPO 05" && !((input.radioEsquina ?? 0) > 0)) return false;
  return true;
}

function opcionesPerfil(input: LonaInput, ancho: number, alto: number, anchoRemolque: number): PerfilOpts {
  return {
    ancho, altoDelante: alto,
    alturaPico: input.aguas ?? 0,
    radioCumbrera: input.radioCumbrera ?? 0,
    radioHombro: input.radioHombro ?? 0,
    chaflan: input.chaflan ?? 0,
    modoChaflan: input.modoChaflan,
    // La lona hecha es el remolque desplazado medio centímetro (la mitad de lo que gana el ancho):
    // el plano mide lo mismo entre curvas y la pendiente no cambia.
    anchoPlanoSuperior: input.anchoPlanoSuperior ?? 0,
    desfaseChaflan: input.modoChaflan === "plano-aguas" ? Math.max((ancho - anchoRemolque) / 2, 0) : 0,
    // Los radios marcados son los de la lona terminada (la que se dibuja).
    radiosEnDesfase: input.modoChaflan === "plano-aguas" ? Math.max((ancho - anchoRemolque) / 2, 0) : 0,
    radioChaflanAbajo: input.radioChaflanAbajo ?? 0,
    radioChaflanArriba: input.radioChaflanArriba ?? 0,
    radio: input.radioEsquina ?? 0,
  };
}

const centrar = (puntos: Perfil2D, ancho: number): Perfil2D => puntos.map(([x, y]) => [x - ancho / 2, y]);

export function perfilesLona(input: LonaInput, wD: number, wA: number, hD: number, hA: number) {
  const longitudinal = aguasLongitudinales(input);
  const tipo = longitudinal ? "TIPO 01" : input.tipoPerfil as TipoPerfil;
  if (longitudinal) {
    hD -= input.aguas ?? 0;
    hA -= input.aguas ?? 0;
  }
  const delante = perfilForma(tipo, opcionesPerfil(input, wD, hD, input.ancho)).puntos;
  const calculadoAtras = perfilForma(tipo, opcionesPerfil(input, wA, hA, (input.anchoAtras ?? 0) > 0 ? input.anchoAtras! : input.ancho)).puntos;
  // Las dos caras se emparejan punto a punto para tejer el contorno, como en el dibujo técnico:
  // si el acotado de radios deja distinto número de puntos, la trasera es la delantera escalada.
  const atras = calculadoAtras.length === delante.length
    ? calculadoAtras
    : delante.map(([x, y]) => [(x * wA) / wD, (y * hA) / hD] as [number, number]);
  return { delante: centrar(delante, wD), atras: centrar(atras, wA) };
}

export function escenaLona(input: LonaInput, res: LonaResult, params: CalcParams): EscenaRemolque | null {
  if (!lonaDibujable(input)) return null;
  const largo = res.lonaHecha.largo;
  const wD = res.lonaHecha.ancho;
  const wA = res.lonaHecha.anchoAtras;
  const hD = input.altoDelante;
  // Con la trasera a la línea por arriba, el remolque sigue con el alto de delante: solo el paño trasero es más corto.
  const hA = input.altoAtras > 0 && !input.traseraPorArriba ? input.altoAtras : input.altoDelante;
  const perfiles = perfilesLona(input, wD, wA, hD, hA);
  // El paño trasero a la línea por arriba y más corto: empieza tantos cm por encima de la base como le faltan.
  const traseraDesde = input.traseraPorArriba && input.altoAtras > 0 && input.altoAtras < input.altoDelante
    ? input.altoDelante - input.altoAtras
    : 0;
  const cuerpo: CuerpoLona = {
    tipo: "lona", perfilDelante: perfiles.delante, perfilAtras: perfiles.atras, largo,
    bastilla: input.bastillaEnfundar ? BASTILLA : 0,
    ...(aguasLongitudinales(input) ? { cumbreraTransversal: Math.max(hD, hA) } : {}),
    ...(traseraDesde > 0 ? { traseraDesde } : {}),
  };
  const anchoAtrasRemolque = (input.anchoAtras ?? 0) > 0 ? input.anchoAtras! : input.ancho;
  const cajon = cajonDe(largo, input.largo, input.ancho, anchoAtrasRemolque, ALTO_CAJON);
  const medidas = { largo, anchoDelante: wD, anchoAtras: wA };
  const bordes = { delante: 0, atras: 0, laterales: 0 };
  const ollaos = marcasOllaos(res.reparto, medidas, bordes);
  const ganchos = marcasGanchos(posicionesGanchos(res.reparto, res.ganchos), Boolean(res.ganchos), medidas, cajon, bordes);
  const chasis = chasisDe(cajon);
  const caja = cajaDe(Math.max(wD, wA) / 2, Math.max(hD, hA), largo, chasis);
  const ventana = ventanaLona(input, cuerpo);
  const conAguas = input.tipoPerfil === "TIPO 02" || input.tipoPerfil === "TIPO 03" || (input.tipoPerfil === "TIPO 04" && input.modoChaflan === "plano-aguas");
  return {
    cuerpo,
    color: colorBaseMaterial(input.material),
    cajon, chasis, ollaos, ganchos,
    gomas: gomasDe(ollaos, ganchos),
    cierres: cierresLona(input, cuerpo, params, cajon, ganchos),
    ventana,
    cotas: [
      ...cotasCuerpo(cuerpo, chasis.suelo),
      ...(input.tipoPerfil === "TIPO 04" && input.modoChaflan === "plano-aguas"
        ? cotasPlanoSuperior(cuerpo, input.anchoPlanoSuperior!, { delante: hD, atras: hA }) : []),
      ...(conAguas ? cotasAguas(cuerpo, input.aguas ?? 0, { delante: hD, atras: hA }) : []),
      ...cotasVentana(ventana, cuerpo.perfilDelante, { cremallera: tipoCierre(input.recogeDelante) === "CREMALLERA" }),
    ],
    etiquetas: etiquetasMarcas(ollaos, ganchos),
    rotulos: rotulosDe(caja),
    caja,
  };
}
