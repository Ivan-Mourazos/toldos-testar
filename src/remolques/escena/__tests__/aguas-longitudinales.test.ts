import { describe, expect, it } from "vitest";
import { emptyLona } from "../../entradas-vacias.ts";
import { calcLona, type LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { escenaLona } from "../lona.ts";

const ejemplo = (): LonaInput => ({
  ...emptyLona(), largo: 244, ancho: 143, altoDelante: 96,
  tipoPerfil: "TIPO 02", aguas: 16, direccionAguas: "delante-atras",
  recogeDelante: "NO", recogeAtras: "NO", bastillaEnfundar: false,
});

describe("aguas hacia delante y atrás", () => {
  it("conserva las cabezas rectangulares a 80 y la cumbrera transversal a 96", () => {
    const input = ejemplo();
    const escena = escenaLona(input, calcLona(input, DEFAULT_PARAMS), DEFAULT_PARAMS)!;
    expect(escena.cuerpo.tipo).toBe("lona");
    if (escena.cuerpo.tipo !== "lona") throw Error("Falta la lona");
    expect(escena.cuerpo.perfilDelante).toEqual([[-72, 0], [-72, 80], [72, 80], [72, 0]]);
    expect(escena.cuerpo.perfilAtras).toEqual(escena.cuerpo.perfilDelante);
    expect(escena.cuerpo.cumbreraTransversal).toBe(96);
    expect(escena.cotas.filter((c) => c.texto === "16").every((c) => c.vistas.includes("lateral"))).toBe(true);
  });

  it("mantiene la orientación histórica cuando no se ha indicado otra", () => {
    const input = { ...ejemplo(), direccionAguas: undefined };
    const escena = escenaLona(input, calcLona(input, DEFAULT_PARAMS), DEFAULT_PARAMS)!;
    expect(escena.cuerpo.tipo === "lona" && escena.cuerpo.perfilDelante).toEqual([
      [-72, 0], [-72, 80], [0, 96], [72, 80], [72, 0],
    ]);
    expect(escena.cuerpo).not.toHaveProperty("cumbreraTransversal");
  });
});
