import { describe, expect, it } from "vitest";
import { alturasCorreas, esCorreas } from "../correas.ts";

describe("alturasCorreas", () => {
  it("reproduce el AR2504631: oreja de 65 sobre la lona hecha, correas a 15 y 52,5", () => {
    expect(alturasCorreas(65)).toEqual([15, 52.5]);
  });

  it("reparte más correas en una oreja alta, sin separarlas más de 37,5", () => {
    const alturas = alturasCorreas(120);
    expect(alturas[0]).toBe(15);
    expect(alturas.at(-1)).toBe(107.5);
    expect(alturas).toHaveLength(4);
    for (let k = 1; k < alturas.length; k++) expect(alturas[k] - alturas[k - 1]).toBeLessThanOrEqual(37.5);
  });

  it("una oreja baja lleva solo la primera", () => {
    expect(alturasCorreas(25)).toEqual([15]);
    expect(alturasCorreas(10)).toEqual([15]);
  });

  it("reconoce la recogida", () => {
    expect(esCorreas("CORREAS")).toBe(true);
    expect(esCorreas("GOMA")).toBe(false);
  });
});
