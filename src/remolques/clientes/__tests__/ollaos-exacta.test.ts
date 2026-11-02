import { describe, expect, it } from "vitest";
import casos from "../../__fixtures__/produccion-2026-09.json";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { emptyLona } from "../../entradas-vacias.ts";
import { aplicarFichaAlImportar } from "../aplicar.ts";
import { propuestaOllaos } from "../adaptar-ollaos.ts";
import { fichaConCambios } from "../diferencias.ts";
import type { FichaCliente, MedidaHabitual } from "../tipos.ts";
import type { LonaInput } from "../../calc/lona.ts";

const ollaos = { delante: [10.5, 43.2, 88.7, 121.5], atras: [10.5, 43.2, 88.7, 121.5], laterales: [10.5, 40.6, 80.9, 121.1, 161.4, 191.5] };
const medida: MedidaHabitual = { tipo: "lona", largo: 201, ancho: 131, hecha: { largo: 202, ancho: 132 }, ollaos };
const ficha: FichaCliente = { id: "norte", nombre: "NORTE", codigosRps: ["023649"], demasiaLonaHecha: 2, medidas: [medida] };
const input = { ...emptyLona(), largo: 201, ancho: 131 };

describe("referencia de ollaos de la medida exacta", () => {
  it("con la misma lona hecha conserva literalmente las posiciones sin aviso", () => {
    const p = propuestaOllaos(ficha, "lona", { ...input, demasiaLonaHecha: 1 }, DEFAULT_PARAMS)!;
    expect(p).toEqual({ ollaos, origenes: [] });
    expect(p.ollaos).toBe(ollaos);
  });

  it("NORTE 201×131 pasa de 202×132 a 203×133 una sola vez y avisa", () => {
    const linea = aplicarFichaAlImportar({ tipo: "lona", version: "10", input }, ficha);
    expect(linea.input).toMatchObject({
      ollaosManuales: {
        delante: [10.5, 43.5, 89.4, 122.5], atras: [10.5, 43.5, 89.4, 122.5],
        laterales: [10.5, 40.8, 81.3, 121.7, 162.2, 192.5],
      },
      ollaosAdaptados: { hecha: { largo: 203, ancho: 133 }, referencia: { largo: 202, ancho: 132 } },
    });
    expect(ficha.medidas).toEqual([medida]);
    const guardada = fichaConCambios(ficha, { tipo: "lona", input: linea.input as typeof input }, ["medida"], DEFAULT_PARAMS);
    expect(guardada.medidas![0].hecha).toEqual({ largo: 203, ancho: 133, anchoAtras: 133 });
    const segunda = aplicarFichaAlImportar({ tipo: "lona", version: "10", input }, guardada);
    expect((segunda.input as LonaInput).ollaosAdaptados).toBeUndefined();
    expect((segunda.input as LonaInput).ollaosManuales).toEqual((linea.input as LonaInput).ollaosManuales);
  });

  it("sin referencia explícita usa la demasía general de los parámetros", () => {
    const antigua = { ...ficha, demasiaLonaHecha: undefined, medidas: [{ ...medida, hecha: undefined }] };
    expect(propuestaOllaos(antigua, "lona", input, DEFAULT_PARAMS)).toEqual({ ollaos, origenes: [] });
    expect(propuestaOllaos(antigua, "lona", input, { ...DEFAULT_PARAMS, demasiaLonaHecha: 1.5 })).toEqual({ ollaos, origenes: [] });
  });

  it("una referencia dudosa avisa sin copiar ni inventar posiciones", () => {
    const dudosa = { ...ficha, medidas: [{ ...medida, hecha: undefined, hechaDudosa: "Fuentes de distintos periodos" }] };
    const linea = aplicarFichaAlImportar({ tipo: "lona", version: "10", input }, dudosa);
    expect((linea.input as LonaInput).modoOllaos).toBe("");
    expect((linea.input as LonaInput).ollaosManuales).toEqual(emptyLona().ollaosManuales);
    expect((linea.input as LonaInput).ollaosAdaptados).toMatchObject({ sinAdaptar: "Fuentes de distintos periodos" });
  });

  it("siempre repartidos impide adaptar también una exacta con otra referencia", () => {
    const linea = aplicarFichaAlImportar({ tipo: "lona", version: "10", input }, { ...ficha, ollaosRepartidos: true });
    expect((linea.input as LonaInput).modoOllaos).toBe("REPARTIDOS");
    expect((linea.input as LonaInput).ollaosAdaptados).toBeUndefined();
  });

  it("los patrones exactos generales de los 32 fixtures conservan sus bytes", () => {
    for (const caso of casos) {
      const i = caso.input;
      const o = { ...i.ollaosManuales };
      const f: FichaCliente = { id: "general", nombre: "GENERAL", codigosRps: [], medidas: [{ tipo: caso.tipo as "lona" | "baqueton", largo: i.largo, ancho: i.ancho, ollaos: o }] };
      expect(JSON.stringify(propuestaOllaos(f, caso.tipo as "lona" | "baqueton", i, caso.paramsSnapshot)!.ollaos)).toBe(JSON.stringify(o));
    }
  });
});
