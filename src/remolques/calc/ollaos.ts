import { excelRound } from "./redondeo.ts";
import type { CalcParams } from "./params.ts";

/** "" = sin elegir. «SEGUN GANCHOS»: el pedido trae los ganchos y los ollaos van entre ellos. */
export type ModoOllaos = "REPARTIDOS" | "SEGUN SE INDICA" | "SEGUN GANCHOS" | "";

/** Posiciones por lado, con el convenio de siempre: delante y detrás de izquierda a derecha,
 *  laterales de atrás a delante. */
export interface RepartoLados { laterales: number[]; atras: number[]; delante: number[] }

export const sinPosiciones = (): RepartoLados => ({ laterales: [], atras: [], delante: [] });

export interface EjeOllaos { n: number; dist: number; posiciones: number[] }
export interface OllaosResult { largo: EjeOllaos; ancho: EjeOllaos; anchoAtras: EjeOllaos }

function eje(medida: number, paso: number, params: CalcParams, primerOllao?: number): EjeOllaos {
  if (!(medida > 0) || !(paso > 0)) return { n: 0, dist: 0, posiciones: [] };
  const primero = primerOllao ?? params.primerOllao;
  const ultimo = medida - primero;
  const recorrido = ultimo - primero;
  if (!(recorrido > 0)) return { n: 0, dist: 0, posiciones: [] };
  // Se fijan exactamente el primer y el último ollao; los intermedios se
  // reparten uniformemente buscando el paso objetivo indicado por producción.
  // El Excel histórico decide el nº de intervalos con la medida completa y,
  // después, reparte el tramo útil entre el primer y el último ollao.
  const intervalos = Math.max(1, excelRound(medida / paso, 0));
  const distanciaExacta = recorrido / intervalos;
  const n = intervalos + 1;
  const posiciones = Array.from(
    { length: Math.min(n, params.maxPosicionesOllaos) },
    (_, indice) => excelRound(primero + distanciaExacta * indice, 1),
  );
  const dist = excelRound(distanciaExacta, 1);
  return { n, dist, posiciones };
}

export function calcOllaos(
  medidaLargo: number, medidaAncho: number, paso: number, params: CalcParams,
  /** Distancia del primer (y último) ollao al borde; si falta, la de los parámetros. */
  primerOllao?: number,
  /** Ancho trasero hecho (remolque sesgado); si falta, igual al delantero. */
  medidaAnchoAtras?: number,
): OllaosResult {
  const ancho = eje(medidaAncho, paso, params, primerOllao);
  return {
    largo: eje(medidaLargo, paso, params, primerOllao),
    ancho,
    anchoAtras: medidaAnchoAtras != null && medidaAnchoAtras !== medidaAncho
      ? eje(medidaAnchoAtras, paso, params, primerOllao)
      : ancho,
  };
}
