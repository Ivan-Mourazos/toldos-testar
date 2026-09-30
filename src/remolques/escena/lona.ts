import type { LonaInput, LonaResult } from "../calc/lona.ts";
import type { CalcParams, TipoPerfil } from "../calc/params.ts";
import { colorBaseMaterial } from "../geometry/color-lona.ts";
import { perfilForma, type PerfilOpts } from "../geometry/perfil.ts";
import { cierresLona } from "./cierres.ts";
import { cajaDe, cajonDe, gomasDe, marcasGanchos, marcasOllaos, posicionesGanchos } from "./comun.ts";
import { ALTO_CAJON, BASTILLA } from "./constantes.ts";
import { cotasCuerpo, etiquetasMarcas } from "./cotas.ts";
import type { CuerpoLona, EscenaRemolque, Perfil2D } from "./tipos.ts";
import { ventanaLona } from "./ventana.ts";

/** El mismo criterio que el dibujo técnico: sin la forma decidida y sus medidas no hay nada que dibujar. */
export function lonaDibujable(input: LonaInput): boolean {
  if (!(input.largo > 0 && input.ancho > 0 && input.altoDelante > 0) || input.tipoPerfil === "") return false;
  if ((input.tipoPerfil === "TIPO 02" || input.tipoPerfil === "TIPO 03") && !((input.aguas ?? 0) > 0)) return false;
  if (input.tipoPerfil === "TIPO 04" && !((input.chaflan ?? 0) > 0)) return false;
  if (input.tipoPerfil === "TIPO 05" && !((input.radioEsquina ?? 0) > 0)) return false;
  return true;
}

function opcionesPerfil(input: LonaInput, ancho: number, alto: number): PerfilOpts {
  return {
    ancho, altoDelante: alto,
    alturaPico: input.aguas ?? 0,
    radioCumbrera: input.radioCumbrera ?? 0,
    radioHombro: input.radioHombro ?? 0,
    chaflan: input.chaflan ?? 0,
    radioChaflanAbajo: input.radioChaflanAbajo ?? 0,
    radioChaflanArriba: input.radioChaflanArriba ?? 0,
    radio: input.radioEsquina ?? 0,
  };
}

const centrar = (puntos: Perfil2D, ancho: number): Perfil2D => puntos.map(([x, y]) => [x - ancho / 2, y]);

export function perfilesLona(input: LonaInput, wD: number, wA: number, hD: number, hA: number) {
  const tipo = input.tipoPerfil as TipoPerfil;
  const delante = perfilForma(tipo, opcionesPerfil(input, wD, hD)).puntos;
  const calculadoAtras = perfilForma(tipo, opcionesPerfil(input, wA, hA)).puntos;
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
  const hA = input.altoAtras > 0 ? input.altoAtras : input.altoDelante;
  const perfiles = perfilesLona(input, wD, wA, hD, hA);
  const cuerpo: CuerpoLona = {
    tipo: "lona", perfilDelante: perfiles.delante, perfilAtras: perfiles.atras, largo,
    bastilla: input.bastillaEnfundar ? BASTILLA : 0,
  };
  const anchoAtrasRemolque = (input.anchoAtras ?? 0) > 0 ? input.anchoAtras! : input.ancho;
  const cajon = cajonDe(largo, input.largo, input.ancho, anchoAtrasRemolque, ALTO_CAJON);
  const medidas = { largo, anchoDelante: wD, anchoAtras: wA };
  const bordes = { delante: 0, atras: 0, laterales: 0 };
  const ollaos = marcasOllaos(res.reparto, medidas, bordes);
  const ganchos = marcasGanchos(posicionesGanchos(res.reparto, res.ganchos), Boolean(res.ganchos), medidas, cajon, bordes);
  return {
    cuerpo,
    color: colorBaseMaterial(input.material),
    cajon, ollaos, ganchos,
    gomas: gomasDe(ollaos, ganchos),
    cierres: cierresLona(input, cuerpo, params, cajon),
    ventana: ventanaLona(input, cuerpo),
    cotas: cotasCuerpo(cuerpo, cajon),
    etiquetas: etiquetasMarcas(ollaos, ganchos),
    caja: cajaDe(Math.max(wD, wA), Math.max(hD, hA), largo, cajon.alto),
  };
}
