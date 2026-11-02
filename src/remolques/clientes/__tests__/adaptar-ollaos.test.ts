import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { emptyLona } from "../../entradas-vacias.ts";
import { aplicarFichaAlImportar } from "../aplicar.ts";
import { adaptarPosiciones, propuestaOllaos } from "../adaptar-ollaos.ts";
import type { FichaCliente, MedidaHabitual } from "../tipos.ts";

const medida: MedidaHabitual = { tipo: "lona", largo: 200, ancho: 130, hecha: { largo: 201, ancho: 131 }, ollaos: { laterales: [10, 40, 97, 157.5, 191], delante: [10, 42.7, 88.2, 121], atras: [10, 42.7, 88.2, 121] } };
const ficha: FichaCliente = { id: "norte", nombre: "NORTE", codigosRps: [], demasiaLonaHecha: 2, medidas: [medida] };
const input = { ...emptyLona(), largo: 201, ancho: 131, demasiaLonaHecha: 2 };

describe("propuestas de ollaos cercanos", () => {
  it("estira el recorrido útil y conserva las distancias de las puntas", () => {
    expect(adaptarPosiciones([10, 42.7, 88.2, 121], 131, 133)).toEqual([10, 43.3, 66.4, 89.6, 123]);
    expect(adaptarPosiciones([2.5, 50, 97.5], 100, 100.4)).toEqual([2.5, 50.2, 97.9]);
  });
  it("añade intermedios si se supera el mayor hueco original más 0,5", () => {
    expect(adaptarPosiciones([10, 50, 90], 100, 110)).toEqual([10, 32.5, 55, 77.5, 100]);
  });
  it("rechaza medidas inválidas y patrones que no se pueden estirar", () => {
    for (const p of [[], [10], [10, 10], [50, 10], [10, NaN], [10, 110]]) expect(adaptarPosiciones(p, 100, 101)).toBeNull();
    expect(adaptarPosiciones([10, 90], 100, 15)).toBeNull();
  });
  it("la exacta manda aun con siempre repartidos y otra demasía", () => {
    const p = propuestaOllaos({ ...ficha, ollaosRepartidos: true }, "lona", { ...input, largo: 200, ancho: 130 }, DEFAULT_PARAMS);
    expect(p).toEqual({ ollaos: medida.ollaos, origenes: [] });
  });
  it("usa una cercana por lado, con su medida hecha original y con aviso", () => {
    const p = propuestaOllaos(ficha, "lona", input, DEFAULT_PARAMS)!;
    expect(p.ollaos.delante).toEqual([10, 43.3, 66.4, 89.6, 123]);
    expect(p.origenes).toEqual(["200×130"]);
    const linea = aplicarFichaAlImportar({ tipo: "lona", version: "10", input: { ...input, demasiaLonaHecha: undefined } }, ficha);
    expect(linea.input).toMatchObject({ modoOllaos: "SEGUN SE INDICA", ollaosAdaptados: { origenes: ["200×130"] } });
    expect(ficha.medidas).toEqual([medida]);
  });
  it("no toma medidas lejanas, de otro tipo ni fuentes sin referencia de una demasía especial", () => {
    expect(propuestaOllaos(ficha, "lona", { ...input, largo: 260, ancho: 160 }, DEFAULT_PARAMS)).toBeNull();
    expect(propuestaOllaos(ficha, "baqueton", input, DEFAULT_PARAMS)).toBeNull();
    expect(propuestaOllaos({ ...ficha, medidas: [{ ...medida, hecha: undefined }] }, "lona", input, DEFAULT_PARAMS)).toBeNull();
    expect(propuestaOllaos(ficha, "lona", { ...input, largo: 0, ancho: 0 }, DEFAULT_PARAMS)).toBeNull();
  });
  it("siempre repartidos tiene prioridad sobre cualquier propuesta", () => {
    expect(propuestaOllaos({ ...ficha, ollaosRepartidos: true }, "lona", input, DEFAULT_PARAMS)).toBeNull();
  });
  it("el ancho de detrás se adapta por separado y los vacíos siguen vacíos", () => {
    const p = propuestaOllaos(ficha, "lona", { ...input, anchoAtras: 132 }, DEFAULT_PARAMS)!;
    expect(p.ollaos.atras.at(-1)).toBe(124);
    expect(p.ollaos.delante.at(-1)).toBe(123);
    const parcial = { ...ficha, medidas: [{ ...medida, ollaos: { ...medida.ollaos, atras: [] } }] };
    expect(propuestaOllaos(parcial, "lona", input, DEFAULT_PARAMS)!.ollaos.atras).toEqual([]);
  });
});
