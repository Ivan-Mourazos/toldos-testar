import { describe, expect, it } from "vitest";
import { emptyLona } from "../../entradas-vacias.ts";
import { erroresPlanteamiento } from "../../pedidos/validar-planteamiento.ts";
import { soportada } from "../../corte/lonaAlta.js";
import { calcLona, contornoAutomatico, type LonaInput } from "../lona.ts";
import { DEFAULT_PARAMS } from "../params.ts";

const ejemplo: LonaInput = {
  ...emptyLona(), largo: 244, ancho: 143, altoDelante: 96,
  tipoPerfil: "TIPO 02", aguas: 16, direccionAguas: "delante-atras",
  recogeDelante: "NO", recogeAtras: "NO", bastillaEnfundar: false,
};

describe("confección con aguas hacia delante y atrás", () => {
  it("mantiene las demasías y baja los paños separados a la altura de los extremos", () => {
    const r = calcLona(ejemplo, DEFAULT_PARAMS);
    expect(r.panoDelantero).toMatchObject({ ancho: 146, alto: 84.5 });
    expect(r.panoTrasero).toMatchObject({ ancho: 146, alto: 84.5 });
    expect(r.lonaHecha).toEqual({ largo: 245, ancho: 144, anchoAtras: 144 });
  });

  it.each([{ contorno: undefined }, { contorno: 999 }, { contornoScad: 999 }])(
    "no reutiliza un contorno transversal aunque estuviera escrito: %j", (extra) => {
      const input = { ...ejemplo, ...extra };
      const r = calcLona(input, DEFAULT_PARAMS);
      expect(contornoAutomatico(input, 1)).toBeNull();
      expect(r.panoContorno).toBeNull();
      expect(r.contornoAjustado).toBe(0);
      expect(r.contornoSoldado?.techo).toMatchObject({ ancho: 249.1, alto: 148 });
      expect(r.contornoSoldado?.lateral).toMatchObject({ ancho: 247, alto: 99.5 });
      expect(r.contornoSoldado?.desarrollo.solape).toBe(2);
      expect(r.metrosTela).toBe(5.16);
      expect(erroresPlanteamiento(input).filter(e => e.campo === "direccionAguas")).toEqual([]);
      expect(soportada({ input, result: r })).toBeNull();
    },
  );

  it("el solape se conserva con el pedido y modifica solo la unión", () => {
    const normal = calcLona(ejemplo, DEFAULT_PARAMS);
    const r = calcLona({ ...ejemplo, solapeSoldaduraLateral: 4 }, DEFAULT_PARAMS);
    expect(r.contornoSoldado?.techo.alto).toBe(152);
    expect(r.panoDelantero).toEqual(normal.panoDelantero);
    expect(r.reparto).toEqual(normal.reparto);
  });

  it("conserva las demasías de los extremos al cambiar el aumento de lona hecha", () => {
    const r = calcLona({ ...ejemplo, demasiaLonaHecha: 5 }, DEFAULT_PARAMS);
    expect(r.lonaHecha.largo).toBe(249);
    expect(r.contornoSoldado?.lateral.ancho).toBe(251);
    expect(r.contornoSoldado?.desarrollo.lateral.desdeDelante).toBe(1);
  });

  it("la ventana debe caber en la cabeza de 80 cm, aunque el centro tenga 96", () => {
    const input = { ...ejemplo, ventana: true, ventanaAncho: 70, ventanaAlto: 85 };
    expect(erroresPlanteamiento(input).some(e => e.campo === "ventanaAlto")).toBe(true);
  });

  it("no fabrica por suposición una variante sesgada o un solape inválido", () => {
    for (const cambio of [{ anchoAtras: 150 }, { altoAtras: 105 }, { solapeSoldaduraLateral: 0 }]) {
      const input = { ...ejemplo, ...cambio };
      expect(calcLona(input, DEFAULT_PARAMS).contornoSoldado).toBeUndefined();
      expect(erroresPlanteamiento(input).some(e => ["direccionAguas", "solapeSoldaduraLateral"].includes(e.campo))).toBe(true);
    }
  });

  it("ignora la orientación guardada en los otros perfiles", () => {
    const input = { ...ejemplo, tipoPerfil: "TIPO 01" as const };
    const historico = { ...input };
    delete historico.direccionAguas;
    expect(calcLona(input, DEFAULT_PARAMS)).toEqual(calcLona(historico, DEFAULT_PARAMS));
  });
});
