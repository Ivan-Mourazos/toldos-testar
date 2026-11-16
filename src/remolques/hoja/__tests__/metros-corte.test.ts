import { describe, expect, it } from "vitest";
import { metrosCortePorElemento } from "../metros-corte.ts";

describe("metrosCortePorElemento", () => {
  it("pone los ML del corte de su lona, con dos decimales", () => {
    expect(metrosCortePorElemento({ cortes: [{ largo: 12345, versiones: ["10"] }], aMano: [] })).toEqual({ "10": "CORTE: 12,35 ML" });
  });

  it("dice que el corte es conjunto cuando la lona la comparten varios elementos", () => {
    expect(metrosCortePorElemento({ cortes: [{ largo: 8000, versiones: ["10", "11"] }], aMano: [] }))
      .toEqual({ "10": "CORTE: 8,00 ML · JUNTO CON 1 ELEMENTO MÁS", "11": "CORTE: 8,00 ML · JUNTO CON 1 ELEMENTO MÁS" });
    expect(metrosCortePorElemento({ cortes: [{ largo: 8000, versiones: ["10", "11", "12"] }], aMano: [] })["12"])
      .toBe("CORTE: 8,00 ML · JUNTO CON 2 ELEMENTOS MÁS");
  });

  it("con dos opciones, las dos en la misma línea", () => {
    const r = metrosCortePorElemento({ cortes: [
      { largo: 9000, opcion: "OPCIÓN 1 · TIRA EMPATADA EN DOS · ELEGIR SOLO UNA", versiones: ["10"] },
      { largo: 9500, opcion: "OPCIÓN 2 · TIRA ENTERA · ELEGIR SOLO UNA", versiones: ["10"] },
    ], aMano: [] });
    expect(r["10"]).toBe("CORTE: OPCIÓN 1 9,00 ML / OPCIÓN 2 9,50 ML");
  });

  it("lo que se corta a mano lo dice, y sin vista no pone nada", () => {
    expect(metrosCortePorElemento({ cortes: [], aMano: [{ versiones: ["12"] }] })).toEqual({ "12": "CORTE: A MANO" });
    expect(metrosCortePorElemento(null)).toEqual({});
  });
});
