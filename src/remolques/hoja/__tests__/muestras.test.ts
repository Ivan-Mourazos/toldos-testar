import { describe, expect, it } from "vitest";
import casos from "../../__fixtures__/produccion-2026-09.json";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { normalizarNumeroPedido } from "../../pedidos/numero-pedido.ts";
import { muestrasHoja, type NombreMuestra } from "../muestras.ts";
import { prepararPedidoHoja } from "../pedido.ts";

type CasoFixture = { caso: string; tipo: "lona" | "baqueton"; input: Record<string, unknown> };

const NOMBRES_MUESTRAS: NombreMuestra[] = ["lona-ventana", "baqueton", "segun-ganchos", "bastilla", "perfiles", "varios"];

const ELEMENTOS: Record<NombreMuestra, number> = {
  "lona-ventana": 1,
  baqueton: 1,
  "segun-ganchos": 1,
  bastilla: 1,
  perfiles: 5,
  varios: 3,
};

describe("muestras de la hoja de taller", () => {
  const muestras = muestrasHoja(casos as CasoFixture[]);

  it.each(NOMBRES_MUESTRAS)("%s es un pedido completo", (nombre) => {
    expect(prepararPedidoHoja(muestras[nombre], DEFAULT_PARAMS).elementos).toHaveLength(ELEMENTOS[nombre]);
  });

  it("cada muestra es un pedido distinto de prueba (AR.26.9999x)", () => {
    const numeros = NOMBRES_MUESTRAS.map((n) => normalizarNumeroPedido(muestras[n][0].input.cabecera.numeroPedido));
    expect(new Set(numeros).size).toBe(NOMBRES_MUESTRAS.length);
    expect(numeros.every((n) => n.startsWith("AR26999"))).toBe(true);
  });

  it("lona-ventana es el caso TIPO 03 de 200 × 121 con ventana de 50 × 35 y recogida con goma", () => {
    const lona = muestras["lona-ventana"];
    expect(lona).toHaveLength(1);
    expect(lona[0].tipo).toBe("lona");
    expect(lona[0].input.largo).toBe(200);
    expect(lona[0].input.ancho).toBe(121);
    const input = lona[0].input as Record<string, unknown>;
    expect(input.ventana).toBe(true);
    expect(input.ventanaAncho).toBe(50);
    expect(input.ventanaAlto).toBe(35);
    expect(input.recogeAtras).toBe("GOMA");
  });

  it("baqueton es el caso TIPO 01", () => {
    const baqueton = muestras.baqueton;
    expect(baqueton).toHaveLength(1);
    expect(baqueton[0].tipo).toBe("baqueton");
  });

  it("segun-ganchos es el TIPO 03 recta sin ventana con los ganchos del pedido", () => {
    const sg = muestras["segun-ganchos"];
    expect(sg).toHaveLength(1);
    expect(sg[0].tipo).toBe("lona");
    const input = sg[0].input as Record<string, unknown>;
    expect(input.ventana).toBe(false);
    expect(input.modoOllaos).toBe("SEGUN GANCHOS");
  });

  it("bastilla tiene un elemento con bastilla de enfundar", () => {
    const bastilla = muestras.bastilla;
    expect(bastilla).toHaveLength(1);
    expect("bastillaEnfundar" in bastilla[0].input && bastilla[0].input.bastillaEnfundar).toBe(true);
  });

  it("perfiles son cinco lonas de tipos diferentes", () => {
    const perfiles = muestras.perfiles;
    expect(perfiles).toHaveLength(5);
    const tipos = perfiles.map((e) => (e.input as Record<string, unknown>).tipoPerfil);
    expect(tipos).toEqual(["TIPO 01", "TIPO 02", "TIPO 03", "TIPO 04", "TIPO 05"]);
  });

  it("varios es un pedido completo de tres remolques (lona, baqueton, lona con observaciones largas)", () => {
    const varios = muestras.varios;
    expect(varios).toHaveLength(3);
    expect(varios.map((e) => e.tipo)).toEqual(["lona", "baqueton", "lona"]);
    expect(varios[2].input.observaciones.length).toBeGreaterThan(200);
  });
});
