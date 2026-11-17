import { describe, expect, it } from "vitest";
import { esLonaPvcProduccion, rowsToMateriales } from "./materiales.ts";

describe("lonas de producción de remolques", () => {
  it("admite la LAC640 tal como viene de RPS", () => {
    expect(esLonaPvcProduccion("Lona lac640 2L 640GR :blanco ral9010 :250 an")).toBe(true);
    expect(esLonaPvcProduccion("LONA LAC 640 2L 640GR: NEGRO RAL9005 :300 AN")).toBe(true);
    const m = rowsToMateriales([{ CodArticle: "LAC640BL10P300", Description: "Lona lac640 2L 640GR :blanco ral9010 :300 an", StockArzua: 280.22 }]);
    expect(m).toEqual([{ codigoBobina: "LAC640BL10P300", nombre: "Lona lac640 2L 640GR :blanco ral9010 :300 an", stockArzua: 280.22 }]);
  });

  it("sigue admitiendo 580 y 650 y deja fuera otras lonas", () => {
    expect(esLonaPvcProduccion("LONA ALPHA 1L 580 :NEGRO :250 AN")).toBe(true);
    expect(esLonaPvcProduccion("LONA G650 2L 650 :NEGRO :250 AN (M5734)")).toBe(true);
    expect(esLonaPvcProduccion("LONA LAC900 :AZUL 5002 :250 AN")).toBe(false);
    expect(esLonaPvcProduccion("LONA GAMMA2 IGN.M2 620:NEGRO:250 AN")).toBe(false);
  });
});
