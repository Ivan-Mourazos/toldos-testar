import { describe, expect, it } from "vitest";
import { etiquetaOpcion } from "../../etiquetas.ts";
import { resumenCambios } from "../diferencias.ts";
import { historialDeFicha, type EntradaHistorialFicha } from "../historial.ts";
import type { FichaCliente } from "../tipos.ts";

const BASE: FichaCliente = { id: "talleres-cal", nombre: "TALLERES CAL", codigosRps: ["009999"] };
const OLLAOS = { delante: [2.5, 118.5], atras: [], laterales: [] };

describe("resumenCambios", () => {
  it("crear y quitar la ficha", () => {
    expect(resumenCambios(null, BASE)).toEqual(["Ficha creada"]);
    expect(resumenCambios(BASE, null)).toEqual(["Ficha quitada"]);
  });

  it("sin cambios, nada; la versión no cuenta", () => {
    expect(resumenCambios(BASE, { ...BASE })).toEqual([]);
    expect(resumenCambios({ ...BASE, version: 1 }, { ...BASE, version: 4 })).toEqual([]);
  });

  it("nombre, códigos y valores sueltos con antes → después", () => {
    expect(resumenCambios(BASE, {
      ...BASE, nombre: "TALLERES CAL, C. B.", codigosRps: ["099991"], recogeAtras: "GOMA", rotulacion: false, trabajo: "lona",
    })).toEqual([
      "Nombre: TALLERES CAL → TALLERES CAL, C. B.",
      "Códigos de RPS: + 099991, − 009999",
      "Trabajo habitual: — → Lona",
      `Recogida detrás: — → ${etiquetaOpcion("GOMA")}`,
      "Rotulación: — → No",
    ]);
    expect(resumenCambios({ ...BASE, sesgoDetras: 1.5 }, { ...BASE, sesgoDetras: 2 }))
      .toEqual(["Sesgo detrás: 1,5 cm más ancho detrás → 2 cm más ancho detrás"]);
  });

  it("medidas: nueva, quitada y con otros ollaos", () => {
    const m = (largo: number, delante = OLLAOS.delante) => ({ tipo: "lona" as const, largo, ancho: 130, ollaos: { ...OLLAOS, delante } });
    expect(resumenCambios(BASE, { ...BASE, medidas: [m(220)] })).toEqual(["Medida 220 × 130 de lona nueva"]);
    expect(resumenCambios({ ...BASE, medidas: [m(220), m(610.5)] }, { ...BASE, medidas: [m(220, [3])] }))
      .toEqual(["Medida 220 × 130 de lona: ollaos Delante 2,5 · 118,5 → Delante 3", "Medida 610,5 × 130 de lona quitada"]);
  });

  it("observaciones, recogida propia y extras de baquetón", () => {
    const extras = { extraLargoCostura: 2, extraAnchoCostura: 0, extraBaquetonLargoDelante: 0, extraBaquetonLargoDetras: 0, extraLargoFinal: 0, extraAnchoFinal: 0, extraBaquetonTrasero: 0, observaciones: [] };
    const propia = { nombre: "PUENTES CAL", delante: 10, atras: 10, lateralSoloAtras: 0, lateralSoloDelante: 0 };
    expect(resumenCambios(
      { ...BASE, observaciones: ["UNA", "DOS"], extrasBaqueton: extras },
      { ...BASE, observaciones: ["DOS", "TRES"], extrasBaqueton: { ...extras, extraLargoCostura: 3, observaciones: ["REFORZAR"] }, recogidaPropia: propia },
    )).toEqual([
      "Recogida propia: + PUENTES CAL",
      "Extras de baquetón: extra de largo a costura +2 → +3; observaciones cambiadas",
      "Observaciones fijas: + TRES, − UNA",
    ]);
    expect(resumenCambios({ ...BASE, recogidaPropia: propia }, { ...BASE, recogidaPropia: { ...propia, delante: 12 } }))
      .toEqual(["Recogida propia PUENTES CAL cambiada"]);
    expect(resumenCambios({ ...BASE, extrasBaqueton: extras }, BASE)).toEqual(["Extras de baquetón: quitados"]);
  });
});

describe("historialDeFicha", () => {
  const ayala: FichaCliente = { id: "ayala", nombre: "AYALA", codigosRps: ["036662"] };
  // El historial de antes (un renglón por guardado, con todas las fichas) y luego el nuevo (uno por ficha).
  const lineas = [
    { version: 1, updatedAt: "2026-10-01T08:00:00.000Z", updatedBy: "", reason: "Fichas de partida", changedSections: ["AYALA", "TALLERES CAL"], parameters: { fichas: [ayala, BASE] } },
    { version: 2, updatedAt: "2026-10-01T09:00:00.000Z", updatedBy: "IVÁN", reason: "Otra cosa", changedSections: ["TALLERES CAL"], parameters: { fichas: [ayala, { ...BASE, rotulacion: true }] } },
    { version: 3, updatedAt: "2026-10-01T10:00:00.000Z", updatedBy: "JAIME", reason: "AYALA confirmado", changedSections: ["AYALA"], parameters: { fichas: [{ ...ayala, codigosRps: ["036662", "048286"] }, { ...BASE, rotulacion: true }] } },
    { fichaId: "ayala", nombre: "AYALA", version: 2, updatedAt: "2026-10-02T08:00:00.000Z", updatedBy: "IVÁN", motivo: "", resumen: ["Rotulación: — → Sí"], ficha: { ...ayala, codigosRps: ["036662", "048286"], rotulacion: true, version: 2 } },
    { fichaId: "talleres-cal", nombre: "TALLERES CAL", version: 2, updatedAt: "2026-10-02T09:00:00.000Z", updatedBy: "IVÁN", motivo: "", resumen: ["Ficha quitada"], quitada: true, ficha: { ...BASE, version: 1 } },
  ];

  it("las entradas nuevas de la ficha y, de las de antes, solo cuando esa ficha cambió (con su resumen)", () => {
    const h = historialDeFicha(lineas, "ayala");
    expect(h.map((e: EntradaHistorialFicha) => [e.anterior ?? false, e.updatedBy, e.motivo, e.resumen])).toEqual([
      [false, "IVÁN", "", ["Rotulación: — → Sí"]],
      [true, "JAIME", "AYALA confirmado", ["Códigos de RPS: + 048286"]],
      [true, "", "Fichas de partida", ["Ficha creada"]],
    ]);
    expect(h[1].ficha).toEqual({ ...ayala, codigosRps: ["036662", "048286"] });
    expect(h[0]).toMatchObject({ version: 2 });
    expect(h[1].version).toBeUndefined();
  });

  it("la quitada sale en su historial; y el límite cuenta desde la más nueva", () => {
    expect(historialDeFicha(lineas, "talleres-cal").map((e) => e.resumen[0])).toEqual(["Ficha quitada", "Rotulación: — → Sí", "Ficha creada"]);
    expect(historialDeFicha(lineas, "ayala", 1)).toHaveLength(1);
  });

  it("renglones que no se entienden no rompen el historial", () => {
    expect(historialDeFicha([null, 3, { parameters: { fichas: "no" } }, { fichaId: "ayala" }], "ayala")).toEqual([]);
  });
});
