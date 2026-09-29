import type { CalcParams } from "../calc/params.ts";
import { escenaBaqueton } from "./baqueton.ts";
import { escenaLona } from "./lona.ts";
import type { ElementoEscena, EscenaRemolque } from "./tipos.ts";

export function construirEscena(elemento: ElementoEscena, params: CalcParams): EscenaRemolque | null {
  return elemento.tipo === "lona"
    ? escenaLona(elemento.input, elemento.res, params)
    : escenaBaqueton(elemento.input, elemento.res);
}
