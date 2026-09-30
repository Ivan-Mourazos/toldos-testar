import { describe, expect, it } from "vitest";
import casos from "../../__fixtures__/produccion-2026-09.json";
import referencia from "../../__fixtures__/hoja-produccion-2026-09.json";
import type { CalcParams } from "../../calc/params.ts";
import { datosHoja, type DatosHoja } from "../datos-hoja.ts";
import { tablaOllaos, type TablaPosiciones } from "../pagina.ts";
import type { ElementoHoja } from "../tipos.ts";

// Paridad con la web vieja (fase 4): los 32 planteamientos reales dan los mismos textos en
// cada casilla y en la tabla de ollaos. La referencia la generó el código de Remolques-TGM
// (commit a7ffef0) sobre la misma fixture. Única diferencia a propósito: la fila nueva
// «BASTILLA ENFUNDAR» de los acabados de la lona, que la hoja vieja no tenía.
type Caso = { caso: string; tipo: "lona" | "baqueton"; input: unknown; result: unknown; paramsSnapshot: unknown };
type Referencia = { caso: string; hoja: DatosHoja; ollaos: TablaPosiciones };

function sinAnadidos(hoja: DatosHoja): DatosHoja {
  return {
    ...hoja,
    grupos: hoja.grupos.map((grupo) => ({ ...grupo, datos: grupo.datos.filter((dato) => dato.etiqueta !== "BASTILLA ENFUNDAR") })),
  };
}

describe("hoja de taller: paridad con la web vieja", () => {
  const lista = casos as Caso[];
  const esperadas = new Map((referencia as Referencia[]).map((r) => [r.caso, r]));

  it("hay 32 hojas de referencia, una por caso", () => {
    expect(lista.length).toBe(32);
    expect(esperadas.size).toBe(32);
    expect(lista.every((c) => esperadas.has(c.caso))).toBe(true);
  });

  it.each(lista.map((c) => [c.caso, c] as const))("%s da los mismos textos que la web vieja", (_nombre, caso) => {
    const elemento = { version: "10", tipo: caso.tipo, input: caso.input, result: caso.result } as ElementoHoja;
    const esperada = esperadas.get(caso.caso)!;
    expect(sinAnadidos(datosHoja(elemento, 0, 1))).toEqual(esperada.hoja);
    const primerOllao = elemento.input.primerOllao ?? (caso.paramsSnapshot as CalcParams).primerOllao;
    expect(tablaOllaos(elemento.input, elemento.result.reparto, primerOllao)).toEqual(esperada.ollaos);
  });
});
