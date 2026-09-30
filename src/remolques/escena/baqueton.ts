import type { BaquetonInput, BaquetonResult } from "../calc/baqueton.ts";
import { colorBaseMaterial } from "../geometry/color-lona.ts";
import { cajaDe, chasisDe, rotulosDe } from "./chasis.ts";
import { cajonDe, gomasDe, marcasGanchos, marcasOllaos, posicionesGanchos } from "./comun.ts";
import { ALTO_CAJON, CAJON_BAJO_FALDON } from "./constantes.ts";
import { cotasCuerpo, etiquetasMarcas } from "./cotas.ts";
import type { CuerpoBaqueton, EscenaRemolque } from "./tipos.ts";

export function baquetonDibujable(input: BaquetonInput): boolean {
  return input.largo > 0 && input.ancho > 0 && input.baqueton > 0;
}

export function escenaBaqueton(input: BaquetonInput, res: BaquetonResult): EscenaRemolque | null {
  if (!baquetonDibujable(input)) return null;
  const largo = res.remolqueHecho.largo;
  const ancho = res.remolqueHecho.ancho;
  const cuerpo: CuerpoBaqueton = {
    tipo: "baqueton", largo, ancho,
    caidaLateral: input.baqueton,
    caidaDelante: res.baquetonDelantero ?? input.baqueton,
    caidaAtras: res.baquetonTrasero ?? input.baqueton,
  };
  const alto = Math.max(ALTO_CAJON, Math.max(cuerpo.caidaLateral, cuerpo.caidaDelante, cuerpo.caidaAtras) + CAJON_BAJO_FALDON);
  const cajon = cajonDe(largo, input.largo, input.ancho, input.ancho, alto);
  const medidas = { largo, anchoDelante: ancho, anchoAtras: ancho };
  const bordes = { delante: -cuerpo.caidaDelante, atras: -cuerpo.caidaAtras, laterales: -cuerpo.caidaLateral };
  const ollaos = marcasOllaos(res.reparto, medidas, bordes);
  const ganchos = marcasGanchos(posicionesGanchos(res.reparto, res.ganchos), Boolean(res.ganchos), medidas, cajon, bordes);
  const chasis = chasisDe(cajon);
  const caja = cajaDe(ancho / 2, 0, largo, chasis);
  return {
    cuerpo,
    color: colorBaseMaterial(input.material),
    cajon, chasis, ollaos, ganchos,
    gomas: gomasDe(ollaos, ganchos),
    cierres: [],
    ventana: null,
    cotas: cotasCuerpo(cuerpo, chasis.suelo),
    etiquetas: etiquetasMarcas(ollaos, ganchos),
    rotulos: rotulosDe(caja),
    caja,
  };
}
