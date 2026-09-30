import type { BaquetonInput, BaquetonResult } from "../calc/baqueton.ts";
import type { LonaInput, LonaResult } from "../calc/lona.ts";
import type { CalcParams } from "../calc/params.ts";
import type { TipoPlanteamiento } from "../store/types.ts";

// Lo que viaja de la pantalla al servidor y del servidor a la página interna de la hoja (fase 4).

/** Un elemento tal como lo manda la pantalla: sin resultado, que lo calcula el servidor. */
export interface ElementoPedidoHoja {
  version: string;
  tipo: TipoPlanteamiento;
  input: LonaInput | BaquetonInput;
}

/** Un elemento ya calculado con los parámetros comunes. */
export type ElementoHoja =
  | { version: string; tipo: "lona"; input: LonaInput; result: LonaResult }
  | { version: string; tipo: "baqueton"; input: BaquetonInput; result: BaquetonResult };

/** El pedido entero que pinta la página de la hoja: una hoja por elemento, en este orden. */
export interface DatosHojaPedido {
  elementos: ElementoHoja[];
  params: CalcParams;
}
