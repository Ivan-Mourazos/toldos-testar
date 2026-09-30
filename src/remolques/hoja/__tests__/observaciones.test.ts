import { describe, expect, it } from "vitest";
import { limpiarObservaciones, lineasObservaciones } from "../observaciones.ts";

// Iván, 30/09/2026: las observaciones se escriben por líneas, como las de tela de los toldos. Se
// siguen guardando en un solo texto (`observaciones: string`, una línea por renglón) para que los
// planteamientos de antes y los de la web vieja sigan valiendo.
describe("observaciones por líneas", () => {
  it("un texto de una línea, como los de antes, es una sola línea", () => {
    expect(lineasObservaciones("REFORZAR ESQUINAS")).toEqual(["REFORZAR ESQUINAS"]);
  });

  it("parte por saltos de línea (también los de Windows) y quita las vacías y los espacios de las puntas", () => {
    expect(lineasObservaciones("  UNA \r\n\nDOS\r  \nTRES  \n")).toEqual(["UNA", "DOS", "TRES"]);
  });

  it("sin nada escrito no hay líneas", () => {
    expect(lineasObservaciones("")).toEqual([]);
    expect(lineasObservaciones(" \n \n")).toEqual([]);
  });

  it("al guardar se juntan con saltos de línea, sin las vacías", () => {
    expect(limpiarObservaciones("UNA\n\n  DOS \n")).toBe("UNA\nDOS");
    expect(limpiarObservaciones("\n")).toBe("");
    expect(limpiarObservaciones("SOLO UNA")).toBe("SOLO UNA");
  });
});
