import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../params.ts";
import { normalizarParams, validarParams } from "../validar-params.ts";

describe("normalizarParams", () => {
  it("rellena campos ausentes con los valores por defecto", () => {
    const p = normalizarParams({ demasiaAlto: 5 });
    expect(p.demasiaAlto).toBe(5);
    expect(p.ajusteContornoBase).toBe(7);
    expect(p.recogidas).toEqual(DEFAULT_PARAMS.recogidas);
  });
  it("unos Parámetros guardados sin una recogida nueva del código la reciben, sin tocar las suyas", () => {
    const guardadas = [
      { nombre: "NO", delante: 3, atras: 3, lateralSoloAtras: 0, lateralSoloDelante: 0 },
      { nombre: "GOMA", delante: 30, atras: 30, lateralSoloAtras: 0, lateralSoloDelante: 0 },
    ];
    const p = normalizarParams({ recogidas: guardadas });
    expect(p.recogidas.slice(0, 2)).toEqual(guardadas);
    // Solo las recogidas que el código añadió después: una que se quitó a propósito no vuelve.
    expect(p.recogidas.map((r) => r.nombre)).toEqual(["NO", "GOMA", "GANCHOS CORAZON"]);
    expect(p.recogidas[2]).toEqual(DEFAULT_PARAMS.recogidas.find((r) => r.nombre === "GANCHOS CORAZON"));
  });
  it("si ya traen los ganchos corazón con otras medidas, se quedan las guardadas", () => {
    const propia = { nombre: "GANCHOS CORAZON", delante: 20, atras: 20, lateralSoloAtras: 1, lateralSoloDelante: 1 };
    const p = normalizarParams({ recogidas: [DEFAULT_PARAMS.recogidas[0], propia] });
    expect(p.recogidas.filter((r) => r.nombre === "GANCHOS CORAZON")).toEqual([propia]);
  });
  it("la recogida de HPL guardada sin la marca del paño trasero la recibe, sin tocar sus medidas ni las demás", () => {
    const hplGuardada = { nombre: "PUENTES HIJOS DE PEDRO LOPEZ", delante: 44, atras: 43, lateralSoloAtras: 12, lateralSoloDelante: 8 };
    const goma = { nombre: "GOMA", delante: 30, atras: 30, lateralSoloAtras: 0, lateralSoloDelante: 0 };
    const p = normalizarParams({ recogidas: [DEFAULT_PARAMS.recogidas[0], goma, hplGuardada] });
    expect(p.recogidas.find((r) => r.nombre === "PUENTES HIJOS DE PEDRO LOPEZ"))
      .toEqual({ ...hplGuardada, panoTraseroConAnchoDelante: true });
    expect(p.recogidas.find((r) => r.nombre === "GOMA")).toEqual(goma);
    expect(p.recogidas.filter((r) => r.panoTraseroConAnchoDelante)).toHaveLength(1);
  });
  it("si la recogida de HPL se guardó con la marca en «no», se respeta", () => {
    const hpl = { ...DEFAULT_PARAMS.recogidas.at(-1)!, panoTraseroConAnchoDelante: false };
    const p = normalizarParams({ recogidas: [DEFAULT_PARAMS.recogidas[0], hpl] });
    expect(p.recogidas.find((r) => r.nombre === hpl.nombre)?.panoTraseroConAnchoDelante).toBe(false);
  });
  it("con null devuelve los valores por defecto", () => {
    expect(normalizarParams(null)).toEqual(DEFAULT_PARAMS);
  });
});

describe("validarParams", () => {
  it("rechaza extras y observaciones de clientes mal formados, pero permite extras negativos", () => {
    const mal = { ...DEFAULT_PARAMS, clientesBaqueton: [{ ...DEFAULT_PARAMS.clientesBaqueton[0], extraAnchoFinal: null, observaciones: 'texto' }] };
    expect(validarParams(mal).ok).toBe(false);
    expect(validarParams(DEFAULT_PARAMS).ok).toBe(true);
  });
  it("rechaza nombres vacíos y duplicados en las tablas", () => {
    expect(validarParams({ ...DEFAULT_PARAMS, recogidas: [...DEFAULT_PARAMS.recogidas, { ...DEFAULT_PARAMS.recogidas[0], nombre: ' no ' }] }).ok).toBe(false);
    expect(validarParams({ ...DEFAULT_PARAMS, clientesBaqueton: [{ ...DEFAULT_PARAMS.clientesBaqueton[0], nombre: '' }] }).ok).toBe(false);
    expect(validarParams({ ...DEFAULT_PARAMS, clientesBaqueton: [...DEFAULT_PARAMS.clientesBaqueton, DEFAULT_PARAMS.clientesBaqueton[0]] }).ok).toBe(false);
  });
  it("acepta los parámetros por defecto", () => {
    expect(validarParams(DEFAULT_PARAMS)).toEqual({ ok: true, params: DEFAULT_PARAMS });
  });
  it("rechaza números no finitos o ausentes", () => {
    const res = validarParams({ ...DEFAULT_PARAMS, demasiaAlto: "4,5" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errores.join(" ")).toContain("demasiaAlto");
  });
  it("rechaza paso de ollaos no positivo", () => {
    expect(validarParams({ ...DEFAULT_PARAMS, pasoOllaosDefecto: 0 }).ok).toBe(false);
  });
  it("exige la recogida NO y el cliente GENERAL", () => {
    expect(validarParams({ ...DEFAULT_PARAMS, recogidas: DEFAULT_PARAMS.recogidas.slice(1) }).ok).toBe(false);
    expect(validarParams({ ...DEFAULT_PARAMS, clientesBaqueton: [] }).ok).toBe(false);
  });
  it("rechaza una marca del paño trasero que no sea sí o no", () => {
    const rotas = [{ ...DEFAULT_PARAMS.recogidas[0], panoTraseroConAnchoDelante: "si" }];
    expect(validarParams({ ...DEFAULT_PARAMS, recogidas: rotas }).ok).toBe(false);
  });
  it("rechaza recogidas con demasías no numéricas", () => {
    const rotas = [{ ...DEFAULT_PARAMS.recogidas[0], delante: null }];
    expect(validarParams({ ...DEFAULT_PARAMS, recogidas: rotas }).ok).toBe(false);
  });
});
