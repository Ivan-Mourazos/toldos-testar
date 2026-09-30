import { describe, expect, it } from "vitest";
import casos from "../../__fixtures__/produccion-2026-09.json";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { normalizarNumeroPedido } from "../../pedidos/numero-pedido.ts";
import { muestrasHoja, NOMBRES_MUESTRAS, type CasoFixture } from "../muestras.ts";
import { tablaGanchos } from "../pagina.ts";
import { prepararPedidoHoja } from "../pedido.ts";

const ELEMENTOS: Record<(typeof NOMBRES_MUESTRAS)[number], number> = {
  "lona-ventana": 1, baqueton: 1, "segun-ganchos": 1, bastilla: 1, perfiles: 5, varios: 3, sesgado: 1,
};

describe("muestras de la hoja de taller", () => {
  const muestras = muestrasHoja(casos as CasoFixture[]);

  it.each(NOMBRES_MUESTRAS)("%s es un pedido completo", (nombre) => {
    expect(prepararPedidoHoja(muestras[nombre], DEFAULT_PARAMS).elementos).toHaveLength(ELEMENTOS[nombre]);
  });

  it("cada muestra es un pedido distinto de prueba (AR.26.9999x)", () => {
    const numeros = NOMBRES_MUESTRAS.map((n) => normalizarNumeroPedido(muestras[n][0].input.cabecera.numeroPedido));
    expect(new Set(numeros).size).toBe(NOMBRES_MUESTRAS.length);
    expect(numeros.every((n) => n.startsWith("AR269999"))).toBe(true);
  });

  it("la de ganchos lleva la tabla de ganchos con delante medido al revés", () => {
    const tabla = tablaGanchos(muestras["segun-ganchos"][0].input)!;
    expect(tabla.filas[2].nombre).toBe("GANCHOS DELANTE DE DERECHA A IZQUIERDA (MEDIDO AL REVÉS)");
  });

  it("los cinco perfiles, la ventana, la bastilla y observaciones largas", () => {
    expect(muestras.perfiles.map((e) => ("tipoPerfil" in e.input ? e.input.tipoPerfil : ""))).toEqual(["TIPO 01", "TIPO 02", "TIPO 03", "TIPO 04", "TIPO 05"]);
    expect("ventana" in muestras["lona-ventana"][0].input && muestras["lona-ventana"][0].input.ventana).toBe(true);
    expect("bastillaEnfundar" in muestras.bastilla[0].input && muestras.bastilla[0].input.bastillaEnfundar).toBe(true);
    expect(muestras.varios.map((e) => e.tipo)).toEqual(["lona", "baqueton", "lona"]);
    expect(muestras.varios[2].input.observaciones.length).toBeGreaterThan(200);
  });
});
