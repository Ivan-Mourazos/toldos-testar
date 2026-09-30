import { describe, expect, it } from "vitest";
import type { EscenaRemolque, LadoBorde } from "../tipos.ts";
import { escenaBaqueton, escenaLona } from "./casos.ts";

const delLado = (e: EscenaRemolque, lado: LadoBorde) => e.ollaos.filter((o) => o.lado === lado);

describe("escena de la lona", () => {
  const e = escenaLona()!;

  it("la lona hecha con su perfil centrado, sobre un cajón con las medidas del remolque", () => {
    expect(e.cuerpo).toMatchObject({ tipo: "lona", largo: 301, bastilla: 0 });
    if (e.cuerpo.tipo !== "lona") throw new Error("no es lona");
    expect(e.cuerpo.perfilDelante).toEqual([[-100.5, 0], [-100.5, 100], [100.5, 100], [100.5, 0]]);
    expect(e.cajon).toEqual({ largo: 300, anchoDelante: 200, anchoAtras: 200, alto: 40, zDesde: 0.5, zHasta: 300.5 });
    expect(e.color).toBe("#b82b2f");
  });

  it("cada ollao cae en su borde con el convenio de siempre", () => {
    expect(delLado(e, "atras")[0]).toEqual({ lado: "atras", posicion: 2.5, punto: [-98, 2.5, 0], normal: [0, 0, -1] });
    expect(delLado(e, "delante")[0]).toEqual({ lado: "delante", posicion: 2.5, punto: [98, 2.5, 301], normal: [0, 0, 1] });
    expect(delLado(e, "izquierdo")[1].punto).toEqual([-100.5, 2.5, 150.5]);
    expect(delLado(e, "derecho")[1].punto).toEqual([100.5, 2.5, 150.5]);
    expect(e.ollaos).toHaveLength(12);
  });

  it("sin ganchos del pedido, un gancho genérico entre cada par de ollaos, en el cajón", () => {
    const derechos = e.ganchos.filter((g) => g.lado === "derecho");
    expect(derechos.map((g) => g.posicion)).toEqual([76.5, 224.5]);
    expect(derechos[0]).toEqual({ lado: "derecho", posicion: 76.5, punto: [100, -8, 76.5], normal: [1, 0, 0], delPedido: false });
    expect(e.ganchos.find((g) => g.lado === "atras")!.punto).toEqual([-49, -8, 0.5]);
    expect(e.ganchos).toHaveLength(8);
  });

  it("la goma va de ollao a gancho a lo largo de cada borde", () => {
    expect(e.gomas).toHaveLength(4);
    expect(e.gomas.find((g) => g.lado === "derecho")!.puntos).toEqual([
      [100.5, 2.5, 2.5], [100, -8, 76.5], [100.5, 2.5, 150.5], [100, -8, 224.5], [100.5, 2.5, 298.5],
    ]);
  });

  it("en el remolque sesgado los laterales siguen el ancho de cada punto", () => {
    const sesgada = escenaLona({ anchoAtras: 150 })!;
    expect(delLado(sesgada, "derecho")[1].punto).toEqual([88, 2.5, 150.5]);
  });

  it("con «Según ganchos» los ganchos son los del pedido", () => {
    const g = escenaLona({
      modoOllaos: "SEGUN GANCHOS",
      ganchos: { laterales: [5, 100, 200, 295], atras: [10, 190], delante: [10, 190] },
    })!;
    const derechos = g.ganchos.filter((x) => x.lado === "derecho");
    expect(derechos.map((x) => x.posicion)).toEqual([5.5, 100.5, 200.5, 295.5]);
    expect(derechos.every((x) => x.delPedido)).toBe(true);
    expect(delLado(g, "derecho").map((o) => o.posicion)).toEqual([2.5, 53, 150.5, 248, 298.5]);
  });

  it("sin forma decidida no hay escena", () => {
    expect(escenaLona({ tipoPerfil: "" })).toBeNull();
    expect(escenaLona({ tipoPerfil: "TIPO 05", radioEsquina: 0 })).toBeNull();
  });
});

describe("escena del baquetón", () => {
  it("cubierta plana con faldones, ollaos en el borde del faldón y cajón más alto", () => {
    const e = escenaBaqueton()!;
    expect(e.cuerpo).toEqual({ tipo: "baqueton", largo: 182, ancho: 122, caidaLateral: 22, caidaDelante: 22, caidaAtras: 22 });
    expect(e.cajon.alto).toBe(47);
    expect(delLado(e, "derecho")[0].punto).toEqual([61, -19.5, 2.5]);
    expect(e.ganchos.find((g) => g.lado === "derecho")!.punto[1]).toBe(-30);
    expect(e.cierres).toEqual([]);
  });
  it("sin baquetón no hay escena", () => {
    expect(escenaBaqueton({ baqueton: 0 })).toBeNull();
  });
});
