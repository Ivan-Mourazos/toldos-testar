import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calcBaqueton, type BaquetonInput } from "../../calc/baqueton.ts";
import { calcLona, type LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { emptyBaqueton, emptyLona } from "../../entradas-vacias.ts";
import { cabeEnRollo } from "../../corte/baqueton.js";
import { cortarLonasAltas, soportada } from "../../corte/lonaAlta.js";
import type { ElementoHoja } from "../tipos.ts";
import { LINEA_SOLDADURA, llevaEmpate, paginaHoja } from "../pagina.ts";

// Iván, 26/11/2026: los remolques que llevan empate dicen en las observaciones, en mayúsculas, que necesitan soldadura.

const lona = (extra: Partial<LonaInput> = {}): LonaInput => ({
  ...emptyLona(),
  largo: 200, ancho: 200, altoDelante: 100, tipoPerfil: "TIPO 01", contorno: 400,
  recogeDelante: "NO", recogeAtras: "NO", bastillaEnfundar: false, ventana: false, rotulacion: false,
  modoOllaos: "REPARTIDOS", pasoOllaos: 35, primerOllao: 2.5, material: "PVC GRIS",
  ...extra,
});
const hojaLona = (input: LonaInput) =>
  paginaHoja({ version: "10", tipo: "lona", input, result: calcLona(input, DEFAULT_PARAMS) }, 0, 1, DEFAULT_PARAMS);

describe("«NECESITA SOLDADURA» en las observaciones de lo que lleva empate", () => {
  it("un remolque que cabe en el rollo no lo lleva", () => {
    expect(hojaLona(lona({ observaciones: "REFORZAR ESQUINAS" })).observaciones).toBe("REFORZAR ESQUINAS");
    expect(hojaLona(lona()).observaciones).toBe("—");
  });

  it("un contorno que no cabe ni a lo largo ni a lo ancho lo lleva al final de las observaciones", () => {
    const grande = lona({ largo: 1300, ancho: 255, contorno: 600, observaciones: "REFORZAR ESQUINAS" });
    expect(hojaLona(grande).observaciones).toBe(`REFORZAR ESQUINAS\n${LINEA_SOLDADURA}`);
    expect(hojaLona({ ...grande, observaciones: "" }).observaciones).toBe(LINEA_SOLDADURA);
  });

  it("si ya lo escribieron no se repite", () => {
    const grande = lona({ largo: 1300, ancho: 255, contorno: 600, observaciones: "Necesita soldadura" });
    expect(hojaLona(grande).observaciones).toBe("Necesita soldadura");
  });

  it("el baquetón que no cabe en el rollo también", () => {
    const input: BaquetonInput = { ...emptyBaqueton(), largo: 1300, ancho: 255, baqueton: 30, cantidad: 1 };
    const result = calcBaqueton(input, DEFAULT_PARAMS);
    const pagina = paginaHoja({ version: "10", tipo: "baqueton", input, result }, 0, 1, DEFAULT_PARAMS);
    expect(pagina.observaciones.split("\n")).toContain(LINEA_SOLDADURA);
  });

  // El mismo criterio que el corte en los pedidos reales de las pruebas del corte.
  it("coincide con el corte en los pedidos guardados", () => {
    const dir = join(__dirname, "../../corte/__fixtures__");
    let conEmpate = 0, total = 0;
    for (const archivo of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      const pedido = JSON.parse(readFileSync(join(dir, archivo), "utf8"));
      for (const el of pedido.elementos ?? []) {
        if (el.tipo === "baqueton") {
          expect(llevaEmpate(el as ElementoHoja), `${archivo} ${el.version}`).toBe(!cabeEnRollo(el, pedido.params ?? DEFAULT_PARAMS));
        } else if (el.tipo === "lona" && !soportada(el)) {
          expect(llevaEmpate(el as ElementoHoja), `${archivo} ${el.version}`).toBe(cortarLonasAltas([el]).conTira);
        } else continue;
        total++;
        if (llevaEmpate(el as ElementoHoja)) conEmpate++;
      }
    }
    expect(total).toBeGreaterThan(10);
    expect(conEmpate).toBeGreaterThan(0);
  });
});
