import { describe, expect, it } from "vitest";
import { desarrolloContornoSoldado } from "../aguas-soldadas.ts";

const ejemplo = { largo: 245, ancho: 144, alto: 96, aguas: 16, solape: 2, extraDelante: 1, extraAtras: 1, bastilla: 3.5 };
const recorrido = (p: number[][]) => p.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);

describe("contorno con aguas longitudinales y soldaduras en la bajada", () => {
  it("desarrolla un techo y dos laterales con pico, sin deformar sus caras", () => {
    const r = desarrolloContornoSoldado(ejemplo);
    expect(r.lateral.nominal).toEqual([[0, 0], [245, 0], [245, 80], [122.5, 96], [0, 80]]);
    expect(r.techo.largoNominal).toBeCloseTo(247.0809583921837, 10);
    expect(r.techo.anchoNominal).toBe(144);
    expect(r.solape).toBe(2);
    // El techo monta encima del lateral: lleva entero el solape (Iván, 06/11/2026).
    expect(r.margenSoldadura).toBe(2);
  });

  it("conserva la longitud de las dos uniones, también con las demasías de delante y atrás", () => {
    const r = desarrolloContornoSoldado(ejemplo);
    expect(recorrido(r.lateral.union)).toBeCloseTo(r.techo.largoNominal, 10);
    expect(recorrido(r.lateral.corte.slice(2))).toBeCloseTo(r.techo.largoCorte, 10);
    expect(r.techo.largoCorte).toBeCloseTo(249.09794580763, 8);
    expect(r.techo.anchoCorte).toBe(148);
    expect(r.lateral.anchoCorte).toBe(247);
    expect(r.lateral.altoCorte).toBeCloseTo(99.5, 8);
  });

  it("el solape lo pone entero el techo: el lateral se corta por la línea de la unión", () => {
    const r = desarrolloContornoSoldado({ ...ejemplo, solape: 4 });
    const [a, b] = r.lateral.union;
    const p = r.lateral.corte[2];
    const distancia = Math.abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / Math.hypot(b[0] - a[0], b[1] - a[1]);
    expect(distancia).toBeCloseTo(0, 10);
    expect(r.techo.anchoCorte - r.techo.anchoNominal).toBe(8);
  });

  it("uniones iguales con demasías distintas en cada extremo", () => {
    const r = desarrolloContornoSoldado({ ...ejemplo, extraDelante: 13, extraAtras: 4 });
    expect(recorrido(r.lateral.corte.slice(2))).toBeCloseTo(r.techo.largoCorte, 10);
    expect(r.lateral.anchoCorte).toBe(262);
  });

  it.each([{ solape: 0 }, { aguas: 96 }, { largo: 0 }, { extraDelante: -1 }, { bastilla: NaN }])("rechaza medidas que no se pueden cortar: %j", cambio => {
    expect(() => desarrolloContornoSoldado({ ...ejemplo, ...cambio })).toThrow();
  });
});
