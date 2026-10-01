import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../../remolques/calc/params.ts";
import { emptyBaqueton, emptyLona } from "../../remolques/entradas-vacias.ts";
import type { LineaPedido } from "../../remolques/workspace/lineas.ts";
import {
  codigoBorrador, crearBorrador, ErrorBorrador, esBorrador, leerContenido, MENSAJE_SIN_NUMERO, mensajeOtroTipo,
  resumenContenido, resumenDeBorrador,
} from "../reglas.ts";

const lona = emptyLona();
const baqueton = emptyBaqueton();
const lineaLona = (cliente = "TALLERES CAL"): LineaPedido => ({
  version: "10", tipo: "lona",
  input: { ...lona, tipoPerfil: "TIPO 02", cabecera: { ...lona.cabecera, numeroPedido: "AR.26.04286", version: "10", cliente } },
});
const lineaBaqueton: LineaPedido = {
  version: "11", tipo: "baqueton",
  input: { ...baqueton, cabecera: { ...baqueton.cabecera, numeroPedido: "AR.26.04286", version: "11", cliente: "" } },
};
const ordenToldos = { orderCode: "AR.26.04286", customer: " TOLDOS CAL ", orderDate: "2026-10-01", awnings: [{ id: "a", model: "ARZUA PRO" }, { id: "b", model: "ARZUA PRO" }, { id: "c", model: "" }] };

describe("codigoBorrador", () => {
  it("es el número sin puntos ni espacios, en mayúsculas", () => {
    expect(codigoBorrador(" ar.26.04286 ")).toBe("AR2604286");
  });
  it("sin número no hay borrador", () => {
    expect(() => codigoBorrador("")).toThrow(MENSAJE_SIN_NUMERO);
    expect(() => codigoBorrador(" .. ")).toThrow(ErrorBorrador);
  });
});

describe("leerContenido", () => {
  it("toldos: el formulario tal cual, aunque esté incompleto", () => {
    const leido = leerContenido("toldos", { order: { orderCode: "AR.26.04286", awnings: [] } });
    expect(leido).toEqual({ kind: "toldos", numeroPedido: "AR.26.04286", contenido: { order: { orderCode: "AR.26.04286", awnings: [] } } });
  });

  it("toldos sin la forma del formulario: 400", () => {
    expect(() => leerContenido("toldos", { order: { awnings: [] } })).toThrow("El borrador de toldos no tiene la forma del formulario.");
    expect(() => leerContenido("toldos", {})).toThrow(ErrorBorrador);
  });

  it("remolques: número, cliente, fecha y líneas; los parámetros solo si son válidos", () => {
    const leido = leerContenido("remolques", { numeroPedido: " AR.26.04286 ", cliente: "TALLERES CAL", fecha: "2026-10-01", lineas: [lineaLona()] });
    expect(leido).toEqual({
      kind: "remolques", numeroPedido: "AR.26.04286",
      contenido: { numeroPedido: "AR.26.04286", cliente: "TALLERES CAL", fecha: "2026-10-01", lineas: [lineaLona()] },
    });
    const conParams = leerContenido("remolques", { numeroPedido: "AR.26.04286", lineas: [], paramsGuardados: DEFAULT_PARAMS });
    expect(conParams.contenido).toEqual({ numeroPedido: "AR.26.04286", cliente: "", fecha: "", lineas: [], paramsGuardados: DEFAULT_PARAMS });
    expect(() => leerContenido("remolques", { numeroPedido: "AR.26.04286", lineas: [], paramsGuardados: { demasiaAlto: "x" } }))
      .toThrow("Los parámetros guardados del borrador no son válidos");
  });

  it("remolques con una línea que no lo es: 400", () => {
    expect(() => leerContenido("remolques", { numeroPedido: "AR.26.04286", lineas: [{ version: "10", tipo: "otra", input: {} }] }))
      .toThrow("El borrador de remolques no tiene la forma de la pantalla.");
  });

  it("otro tipo: 400", () => {
    expect(() => leerContenido("persianas", {})).toThrow("El borrador tiene que ser de toldos o de remolques.");
  });
});

describe("resumenContenido", () => {
  it("toldos: cliente, fecha, cuántos toldos y los modelos sin repetir", () => {
    expect(resumenContenido({ kind: "toldos", contenido: { order: ordenToldos } }))
      .toEqual({ customer: "TOLDOS CAL", orderDate: "2026-10-01", elementos: 3, models: ["ARZUA PRO"] });
  });

  it("remolques: el perfil o «Baquetón» como modelo, y el cliente de las líneas si la cabecera no lo tiene", () => {
    expect(resumenContenido({ kind: "remolques", contenido: { numeroPedido: "AR.26.04286", cliente: "", fecha: "2026-10-01", lineas: [lineaLona(), lineaBaqueton] } }))
      .toEqual({ customer: "TALLERES CAL", orderDate: "2026-10-01", elementos: 2, models: ["Recto con aguas", "Baquetón"] });
  });
});

describe("crearBorrador y resumenDeBorrador", () => {
  it("el número normalizado como clave, quién y cuándo; al sustituir conserva cuándo se creó", () => {
    const leido = leerContenido("toldos", { order: ordenToldos });
    const primero = crearBorrador({ leido, savedBy: "IVÁN", existente: null, ahora: "2026-10-01T08:00:00.000Z" });
    expect(primero).toMatchObject({
      schemaVersion: 1, kind: "toldos", orderCode: "AR2604286", numeroPedido: "AR.26.04286", savedBy: "IVÁN",
      createdAt: "2026-10-01T08:00:00.000Z", updatedAt: "2026-10-01T08:00:00.000Z",
      summary: { customer: "TOLDOS CAL", elementos: 3 },
    });
    const segundo = crearBorrador({ leido, savedBy: "JAIME", existente: primero, ahora: "2026-10-01T09:00:00.000Z" });
    expect(segundo).toMatchObject({ savedBy: "JAIME", createdAt: "2026-10-01T08:00:00.000Z", updatedAt: "2026-10-01T09:00:00.000Z" });
    const resumen = resumenDeBorrador(segundo);
    expect(resumen).not.toHaveProperty("contenido");
    expect(resumen).toMatchObject({ orderCode: "AR2604286", kind: "toldos", savedBy: "JAIME" });
    expect(esBorrador(segundo)).toBe(true);
    expect(esBorrador(resumen)).toBe(false);
    expect(esBorrador({ kind: "remolques", orderCode: "" })).toBe(false);
  });

  it("dice de qué es el borrador que ya está", () => {
    expect(mensajeOtroTipo("AR2604286", "remolques"))
      .toBe("AR2604286 ya tiene un borrador de remolques: un pedido es de toldos o de remolques. Ábrelo desde Pedidos o revisa el número.");
  });
});
