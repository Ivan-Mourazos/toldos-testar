import { emptyBaqueton, emptyLona } from "../../entradas-vacias.ts";
import { calcLona, type LonaInput } from "../../calc/lona.ts";
import { calcBaqueton, type BaquetonInput } from "../../calc/baqueton.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { construirEscena } from "../index.ts";

/** Lona TIPO 01 de 300 × 200 × 100 (hecha 301 × 201) con tres ollaos a medida por lado. */
export const lonaPrueba = (extra: Partial<LonaInput> = {}): LonaInput => ({
  ...emptyLona(),
  largo: 300, ancho: 200, altoDelante: 100, tipoPerfil: "TIPO 01",
  recogeDelante: "NO", recogeAtras: "NO", material: "PVC ROJO",
  modoOllaos: "SEGUN SE INDICA",
  ollaosManuales: { laterales: [2.5, 150.5, 298.5], atras: [2.5, 100.5, 198.5], delante: [2.5, 100.5, 198.5] },
  ...extra,
});

export const escenaLona = (extra: Partial<LonaInput> = {}) => {
  const input = lonaPrueba(extra);
  return construirEscena({ tipo: "lona", input, res: calcLona(input, DEFAULT_PARAMS) }, DEFAULT_PARAMS);
};

export const escenaBaqueton = (extra: Partial<BaquetonInput> = {}) => {
  const input: BaquetonInput = { ...emptyBaqueton(), largo: 181, ancho: 121, baqueton: 22, modoOllaos: "REPARTIDOS", material: "PVC ROJO", ...extra };
  return construirEscena({ tipo: "baqueton", input, res: calcBaqueton(input, DEFAULT_PARAMS) }, DEFAULT_PARAMS);
};
