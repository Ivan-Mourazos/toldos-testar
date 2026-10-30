import { describe, expect, it } from "vitest";
import { emptyBaqueton, emptyLona } from "../../entradas-vacias.ts";
import { calcLona, type LonaInput } from "../lona.ts";
import { calcBaqueton, type BaquetonInput } from "../baqueton.ts";
import { DEFAULT_PARAMS } from "../params.ts";
import { erroresPlanteamiento } from "../../pedidos/validar-planteamiento.ts";
import { tablaOllaos, tramosTabla } from "../../hoja/pagina.ts";

describe("ollaos dinámicos en lonas y baquetones", () => {
  for (const tipo of ["lona", "baqueton"] as const) {
    const input = {
      ...(tipo === "lona" ? emptyLona() : emptyBaqueton()),
      largo: 1000, ancho: 200, modoOllaos: "REPARTIDOS" as const,
      pasoOllaos: 35, pasoOllaosCabezas: 20,
    };
    const calcular = (i: LonaInput | BaquetonInput) => "baqueton" in i ? calcBaqueton(i, DEFAULT_PARAMS) : calcLona(i, DEFAULT_PARAMS);

    it(`${tipo}: aplica los pasos independientes hasta el último ollao y la hoja los conserva`, () => {
      const res = calcular(input);
      expect(res.reparto.laterales).toHaveLength(30);
      expect(res.reparto.delante).toHaveLength(11);
      expect(res.reparto.atras).toHaveLength(11);
      expect(res.reparto.laterales.at(-1)).toBe(998.5);
      const tabla = tablaOllaos(input, res.reparto, 2.5);
      expect(tabla.columnas).toBe(30);
      expect(tabla.filas[0].posiciones).toEqual(res.reparto.laterales);
    });

    it(`${tipo}: un pedido anterior sin paso de cabezas conserva el paso común`, () => {
      const res = calcular({ ...input, pasoOllaosCabezas: undefined });
      expect(res.reparto.delante).toHaveLength(7);
    });

    it(`${tipo}: un paso por debajo del mínimo no reparte: una errata no pide 100.000 ollaos`, () => {
      expect(calcular({ ...input, pasoOllaos: 0.01 }).reparto.laterales).toEqual([]);
      expect(erroresPlanteamiento({ ...input, pasoOllaos: 0.01 }))
        .toContainEqual(expect.objectContaining({ campo: "pasoOllaos" }));
    });

    it("la hoja parte en tramos legibles la tabla larga y deja entera la de siempre", () => {
      const tramos = tramosTabla(tablaOllaos(input, { laterales: Array.from({ length: 40 }, (_, i) => i + 1), atras: [1, 2], delante: [1, 2] }, 2.5));
      expect(tramos.map((t) => t.inicio)).toEqual([0, 20]);
      expect(tramos.map((t) => t.columnas)).toEqual([20, 20]);
      expect(tramos.map((t) => t.filas.length)).toEqual([3, 1]);
      const corta = tramosTabla(tablaOllaos(input, { laterales: [1, 2], atras: [1], delante: [1] }, 2.5));
      expect(corta).toHaveLength(1);
      expect(corta[0].columnas).toBe(12);
    });

    it.each([0, -1, 0.5, NaN, Infinity])(`${tipo}: rechaza el paso de cabezas inválido %s`, (pasoOllaosCabezas) => {
      expect(erroresPlanteamiento({ ...input, pasoOllaosCabezas }))
        .toContainEqual(expect.objectContaining({ campo: "pasoOllaosCabezas" }));
      expect(erroresPlanteamiento({ ...input, pasoOllaosCabezas, modoOllaos: "SEGUN SE INDICA" }))
        .not.toContainEqual(expect.objectContaining({ campo: "pasoOllaosCabezas" }));
    });
  }
});
