import { describe, expect, it } from "vitest";
import { emptyBaqueton, emptyLona } from "../../entradas-vacias.ts";
import { DEFAULT_PARAMS } from "../params.ts";
import { calcLona, type LonaInput } from "../lona.ts";
import { calcBaqueton, type BaquetonInput } from "../baqueton.ts";
import {
  avisosGanchos, erroresGanchos, ganchosSobreLona, medidasRemolque, ollaosSegunGanchos, puntosMedios, sinReves,
} from "../ganchos.ts";

// Pedidos que traen las posiciones de los ganchos del remolque en vez de las de los ollaos:
// el taller pone un ollao en el medio de cada par de ganchos (Iván, 30/09/2026).
const lona = (extra: Partial<LonaInput> = {}): LonaInput => ({
  ...emptyLona(),
  largo: 250, ancho: 151, altoDelante: 62,
  tipoPerfil: "TIPO 01", recogeDelante: "NO", recogeAtras: "NO",
  modoOllaos: "SEGUN GANCHOS",
  ganchos: { laterales: [5, 125, 245], atras: [15, 75, 135], delante: [15, 75, 135] },
  ...extra,
});

describe("puntosMedios", () => {
  it("un punto en el medio de cada par seguido, ordenando antes", () => {
    expect(puntosMedios([30, 10, 20])).toEqual([15, 25]);
    expect(puntosMedios([10])).toEqual([]);
  });
  it("redondea a 0,1 cm alejándose de cero en la mitad", () => {
    expect(puntosMedios([10.5, 25.8])).toEqual([18.2]);
  });
});

describe("ganchosSobreLona", () => {
  it("suma la mitad de lo que la lona hecha es más grande que el remolque", () => {
    expect(ganchosSobreLona([15, 75], { remolque: 151, hecha: 152 }, false)).toEqual([15.5, 75.5]);
    expect(ganchosSobreLona([10], { remolque: 181, hecha: 183 }, false)).toEqual([11]);
  });
  it("medido al revés cuenta desde el otro extremo del remolque y ordena", () => {
    expect(ganchosSobreLona([16, 76, 136], { remolque: 151, hecha: 152 }, true)).toEqual([15.5, 75.5, 135.5]);
  });
});

describe("ollaosSegunGanchos", () => {
  const medidas = {
    laterales: { remolque: 250, hecha: 251 },
    atras: { remolque: 151, hecha: 152 },
    delante: { remolque: 151, hecha: 152 },
  };
  it("sin extremos, solo los puntos medios", () => {
    const r = ollaosSegunGanchos({
      ganchos: { laterales: [5, 125, 245], atras: [15, 75, 135], delante: [15, 75, 135] },
      alReves: sinReves(), extremos: false, distanciaExtremo: 2.5, medidas,
    });
    expect(r.ollaos).toEqual({ laterales: [65.5, 185.5], atras: [45.5, 105.5], delante: [45.5, 105.5] });
    expect(r.ganchos.laterales).toEqual([5.5, 125.5, 245.5]);
  });
  it("con extremos, uno a la distancia elegida de cada borde de la lona hecha", () => {
    const r = ollaosSegunGanchos({
      ganchos: { laterales: [5, 125, 245], atras: [], delante: [15, 75, 135] },
      alReves: sinReves(), extremos: true, distanciaExtremo: 4, medidas,
    });
    expect(r.ollaos.delante).toEqual([4, 45.5, 105.5, 148]);
    expect(r.ollaos.laterales).toEqual([4, 65.5, 185.5, 247]);
    // Un lado sin ganchos no inventa extremos: está sin hacer y la validación lo dice.
    expect(r.ollaos.atras).toEqual([]);
  });
});

describe("calcLona con SEGUN GANCHOS", () => {
  it("reparte los ollaos entre los ganchos y extremos a primerOllao por defecto", () => {
    const res = calcLona(lona(), DEFAULT_PARAMS);
    expect(res.lonaHecha).toEqual({ largo: 251, ancho: 152, anchoAtras: 152 });
    expect(res.reparto).toEqual({
      laterales: [2.5, 65.5, 185.5, 248.5],
      atras: [2.5, 45.5, 105.5, 149.5],
      delante: [2.5, 45.5, 105.5, 149.5],
    });
    expect(res.ganchos).toEqual({ laterales: [5.5, 125.5, 245.5], atras: [15.5, 75.5, 135.5], delante: [15.5, 75.5, 135.5] });
  });
  it("sin extremos si se pide", () => {
    expect(calcLona(lona({ ollaosExtremos: false }), DEFAULT_PARAMS).reparto.delante).toEqual([45.5, 105.5]);
  });
  it("medido al revés detrás usa el ancho trasero del remolque sesgado", () => {
    const res = calcLona(lona({
      anchoAtras: 141,
      ganchos: { laterales: [5, 125, 245], atras: [10, 130], delante: [15, 75, 135] },
      ganchosAlReves: { laterales: false, atras: true, delante: false },
    }), DEFAULT_PARAMS);
    expect(res.lonaHecha.anchoAtras).toBe(142);
    expect(res.ganchos?.atras).toEqual([11.5, 131.5]);
    expect(res.reparto.atras).toEqual([2.5, 71.5, 139.5]);
  });
  it("los otros modos no llevan ganchos en el resultado", () => {
    const res = calcLona(lona({ modoOllaos: "REPARTIDOS" }), DEFAULT_PARAMS);
    expect("ganchos" in res).toBe(false);
  });
});

describe("calcBaqueton con SEGUN GANCHOS", () => {
  const baqueton = (extra: Partial<BaquetonInput> = {}): BaquetonInput => ({
    ...emptyBaqueton(),
    largo: 181, ancho: 121, baqueton: 22,
    modoOllaos: "SEGUN GANCHOS",
    ganchos: { laterales: [10, 90, 170], atras: [20, 100], delante: [20, 100] },
    ...extra,
  });
  it("pasa los ganchos al remolque hecho del baquetón", () => {
    const res = calcBaqueton(baqueton(), DEFAULT_PARAMS);
    expect(res.remolqueHecho).toEqual({ largo: 182, ancho: 122 });
    expect(res.reparto).toEqual({
      laterales: [2.5, 50.5, 130.5, 179.5],
      atras: [2.5, 60.5, 119.5],
      delante: [2.5, 60.5, 119.5],
    });
    expect(res.ganchos?.laterales).toEqual([10.5, 90.5, 170.5]);
  });
  it("sigue la demasía del cliente, no un medio centímetro fijo", () => {
    const res = calcBaqueton(baqueton({ clienteEspecifico: "AYALA", ganchos: { laterales: [10, 90], atras: [20, 100], delante: [20, 100] } }), DEFAULT_PARAMS);
    expect(res.remolqueHecho.largo).toBe(183);
    expect(res.ganchos?.laterales).toEqual([11, 91]);
  });
});

describe("medidasRemolque", () => {
  it("detrás es el ancho trasero si va sesgado", () => {
    expect(medidasRemolque({ largo: 600, ancho: 250, anchoAtras: 200 })).toEqual({ laterales: 600, atras: 200, delante: 250 });
    expect(medidasRemolque({ largo: 600, ancho: 250 })).toEqual({ laterales: 600, atras: 250, delante: 250 });
  });
});

describe("avisos y errores", () => {
  it("avisa de medidas que bajan y de ganchos repetidos, sin bloquear", () => {
    const avisos = avisosGanchos({ laterales: [5, 100, 100], atras: [160, 110, 60], delante: [10, 60] });
    expect(avisos.map((a) => a.lado)).toEqual(["laterales", "atras"]);
    expect(avisos[0].mensaje).toBe("Hay dos ganchos de laterales en la misma posición.");
    expect(avisos[1].mensaje).toBe("Los ganchos de atrás van bajando: ¿está medido al revés? La web los ordena de menor a mayor.");
  });
  it("un lado con menos de dos ganchos o con ganchos fuera del remolque es un error", () => {
    const errores = erroresGanchos(
      { laterales: [5, 700], atras: [10], delante: [10, 60] },
      { laterales: 600, atras: 250, delante: 250 },
    );
    expect(errores).toEqual([
      { lado: "laterales", mensaje: "Hay ganchos de laterales fuera del remolque (0 a 600 cm)." },
      { lado: "atras", mensaje: "Pon al menos dos ganchos en atrás: los ollaos van entre ellos." },
    ]);
  });
});
