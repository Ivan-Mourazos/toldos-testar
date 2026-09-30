import { puntosMedios } from "../calc/ganchos.ts";
import type { RepartoLados } from "../calc/ollaos.ts";
import { GANCHO_BAJO_BORDE, OLLAO_AL_BORDE } from "./constantes.ts";
import type { Cajon, Gancho, Goma, LadoBorde, Marca, Vec3 } from "./tipos.ts";

/** Medidas de la lona hecha (o del baquetón hecho) que fijan dónde cae cada ollao. */
export interface MedidasCuerpo { largo: number; anchoDelante: number; anchoAtras: number }
/** Altura (y) del borde de abajo de la lona o del faldón en cada lado. */
export interface Bordes { delante: number; atras: number; laterales: number }

const limitar = (t: number) => Math.min(Math.max(t, 0), 1);

export const semiancho = (m: MedidasCuerpo, z: number) =>
  (m.anchoAtras + (m.anchoDelante - m.anchoAtras) * limitar(z / m.largo)) / 2;

export function cajonDe(largoCuerpo: number, largo: number, anchoDelante: number, anchoAtras: number, alto: number): Cajon {
  // La lona hecha es algo más grande que el remolque y va centrada sobre él.
  const zDesde = (largoCuerpo - largo) / 2;
  return { largo, anchoDelante, anchoAtras, alto, zDesde, zHasta: zDesde + largo };
}

export const semianchoCajon = (c: Cajon, z: number) =>
  (c.anchoAtras + (c.anchoDelante - c.anchoAtras) * limitar((z - c.zDesde) / c.largo)) / 2;

const marca = (lado: LadoBorde, posicion: number, punto: Vec3, normal: Vec3): Marca => ({ lado, posicion, punto, normal });

export function marcasOllaos(reparto: RepartoLados, m: MedidasCuerpo, bordes: Bordes): Marca[] {
  const y = (borde: number) => borde + OLLAO_AL_BORDE;
  return [
    ...reparto.atras.map((p) => marca("atras", p, [-m.anchoAtras / 2 + p, y(bordes.atras), 0], [0, 0, -1])),
    ...reparto.delante.map((p) => marca("delante", p, [m.anchoDelante / 2 - p, y(bordes.delante), m.largo], [0, 0, 1])),
    ...reparto.laterales.flatMap((p) => [
      marca("izquierdo", p, [-semiancho(m, p), y(bordes.laterales), p], [-1, 0, 0]),
      marca("derecho", p, [semiancho(m, p), y(bordes.laterales), p], [1, 0, 0]),
    ]),
  ];
}

/** Posiciones de los ganchos: las del pedido o, si no las hay, una entre cada par de ollaos. */
export function posicionesGanchos(reparto: RepartoLados, delPedido?: RepartoLados): RepartoLados {
  return delPedido ?? {
    laterales: puntosMedios(reparto.laterales),
    atras: puntosMedios(reparto.atras),
    delante: puntosMedios(reparto.delante),
  };
}

export function marcasGanchos(pos: RepartoLados, delPedido: boolean, m: MedidasCuerpo, c: Cajon, bordes: Bordes): Gancho[] {
  const y = (borde: number) => Math.min(borde, 0) - GANCHO_BAJO_BORDE;
  const gancho = (lado: LadoBorde, posicion: number, punto: Vec3, normal: Vec3): Gancho =>
    ({ lado, posicion, punto, normal, delPedido });
  return [
    ...pos.atras.map((p) => gancho("atras", p, [-m.anchoAtras / 2 + p, y(bordes.atras), c.zDesde], [0, 0, -1])),
    ...pos.delante.map((p) => gancho("delante", p, [m.anchoDelante / 2 - p, y(bordes.delante), c.zHasta], [0, 0, 1])),
    ...pos.laterales.flatMap((p) => [
      gancho("izquierdo", p, [-semianchoCajon(c, p), y(bordes.laterales), p], [-1, 0, 0]),
      gancho("derecho", p, [semianchoCajon(c, p), y(bordes.laterales), p], [1, 0, 0]),
    ]),
  ];
}

const LADOS_BORDE: LadoBorde[] = ["delante", "atras", "izquierdo", "derecho"];

export function gomasDe(ollaos: Marca[], ganchos: Gancho[]): Goma[] {
  return LADOS_BORDE.flatMap((lado) => {
    const deOllaos = ollaos.filter((o) => o.lado === lado);
    const deGanchos = ganchos.filter((g) => g.lado === lado);
    if (deOllaos.length === 0 || deGanchos.length === 0) return [];
    // Orden estable: con la misma posición el ollao va antes que el gancho.
    const puntos = [...deOllaos, ...deGanchos].sort((a, b) => a.posicion - b.posicion).map((x) => x.punto);
    return [{ lado, puntos }];
  });
}
