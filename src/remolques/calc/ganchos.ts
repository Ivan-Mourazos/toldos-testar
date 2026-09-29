import { excelRound } from "./redondeo.ts";
import type { RepartoLados } from "./ollaos.ts";

// Ollaos «según ganchos» (Iván, 30/09/2026): hay pedidos que traen las posiciones de los
// ganchos del remolque en vez de las de los ollaos, y el taller pone un ollao en el medio de
// cada par de ganchos y, si se quiere, uno en cada extremo. Las medidas siguen el convenio de
// los ollaos y van sobre el remolque; la lona hecha es algo más grande y va centrada, así que
// se les suma la mitad de esa diferencia. A veces el pedido viene medido desde el otro extremo.

export type Lado = keyof RepartoLados;
export const LADOS: Lado[] = ["laterales", "atras", "delante"];
export const NOMBRE_LADO: Record<Lado, string> = { laterales: "laterales", atras: "atrás", delante: "delante" };

/** Once ganchos dan diez ollaos entre ellos y, con los dos extremos, los doce que caben en la
 *  tabla de ollaos y en la hoja de taller. */
export const MAX_GANCHOS_POR_LADO = 11;

export type LadosAlReves = Record<Lado, boolean>;
export const sinReves = (): LadosAlReves => ({ laterales: false, atras: false, delante: false });

export interface MedidaLado { remolque: number; hecha: number }

export interface OpcionesGanchos {
  /** Sobre el remolque, como vienen en el pedido. */
  ganchos: RepartoLados;
  alReves: LadosAlReves;
  extremos: boolean;
  distanciaExtremo: number;
  medidas: Record<Lado, MedidaLado>;
}

export interface ResultadoGanchos {
  ollaos: RepartoLados;
  /** Ya sobre la lona hecha, ordenados. */
  ganchos: RepartoLados;
}

export interface AvisoGanchos { lado: Lado; mensaje: string }

const r1 = (v: number) => excelRound(v, 1);
const fmt = (n: number) => n.toLocaleString("es-ES", { maximumFractionDigits: 1 });

export function puntosMedios(posiciones: number[]): number[] {
  const orden = [...posiciones].sort((a, b) => a - b);
  return orden.slice(1).map((p, i) => r1((orden[i] + p) / 2));
}

export function ganchosSobreLona(ganchos: number[], medida: MedidaLado, alReves: boolean): number[] {
  const desfase = (medida.hecha - medida.remolque) / 2;
  return ganchos
    .map((x) => (alReves ? medida.remolque - x : x))
    .sort((a, b) => a - b)
    .map((x) => r1(x + desfase));
}

export function ollaosSegunGanchos(o: OpcionesGanchos): ResultadoGanchos {
  const ollaos = {} as RepartoLados;
  const ganchos = {} as RepartoLados;
  for (const lado of LADOS) {
    const sobreLona = ganchosSobreLona(o.ganchos[lado], o.medidas[lado], o.alReves[lado]);
    const medios = puntosMedios(sobreLona);
    // Sin al menos dos ganchos el lado está sin hacer: no se inventan los extremos.
    ollaos[lado] = o.extremos && sobreLona.length >= 2
      ? [r1(o.distanciaExtremo), ...medios, r1(o.medidas[lado].hecha - o.distanciaExtremo)]
      : medios;
    ganchos[lado] = sobreLona;
  }
  return { ollaos, ganchos };
}

export function medidasRemolque(input: { largo: number; ancho: number; anchoAtras?: number }): Record<Lado, number> {
  const atras = (input.anchoAtras ?? 0) > 0 ? input.anchoAtras! : input.ancho;
  return { laterales: input.largo, atras, delante: input.ancho };
}

export function avisosGanchos(ganchos: RepartoLados): AvisoGanchos[] {
  const avisos: AvisoGanchos[] = [];
  for (const lado of LADOS) {
    const v = ganchos[lado];
    if (new Set(v).size !== v.length) {
      avisos.push({ lado, mensaje: `Hay dos ganchos de ${NOMBRE_LADO[lado]} en la misma posición.` });
    }
    if (v.some((x, i) => i > 0 && x < v[i - 1])) {
      avisos.push({
        lado,
        mensaje: `Los ganchos de ${NOMBRE_LADO[lado]} van bajando: ¿está medido al revés? La web los ordena de menor a mayor.`,
      });
    }
  }
  return avisos;
}

export function erroresGanchos(ganchos: RepartoLados, remolque: Record<Lado, number>): AvisoGanchos[] {
  const errores: AvisoGanchos[] = [];
  for (const lado of LADOS) {
    const v = ganchos[lado];
    if (v.length < 2) {
      errores.push({ lado, mensaje: `Pon al menos dos ganchos en ${NOMBRE_LADO[lado]}: los ollaos van entre ellos.` });
    } else if (remolque[lado] > 0 && v.some((x) => x < 0 || x > remolque[lado])) {
      errores.push({
        lado,
        mensaje: `Hay ganchos de ${NOMBRE_LADO[lado]} fuera del remolque (0 a ${fmt(remolque[lado])} cm).`,
      });
    }
  }
  return errores;
}
