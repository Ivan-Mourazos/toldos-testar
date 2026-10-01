import { describe, expect, it } from "vitest";
import casos from "../../__fixtures__/produccion-2026-09.json";
import type { BaquetonInput } from "../../calc/baqueton.ts";
import type { LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { prepararPedidoHoja } from "../../hoja/pedido.ts";
import type { ElementoPedidoHoja } from "../../hoja/tipos.ts";
import {
  anioPedido, codigoPedido, crearPedidoRemolques, elementosAprobacion, elementosPedidoHoja, marcarPedidoGenerado,
  modeloElemento, resumenBandeja,
} from "../pedido.ts";

type Caso = { caso: string; tipo: "lona" | "baqueton"; input: LonaInput | BaquetonInput };
const deFixture = (id: string, version: string, of: string): ElementoPedidoHoja => {
  const c = (casos as Caso[]).find((x) => x.caso === id)!;
  return {
    version, tipo: c.tipo,
    input: { ...c.input, cabecera: { ...c.input.cabecera, numeroPedido: "AR.26.04286", cliente: "TALLERES CAL", version, ordenFabricacion: of, fecha: "2026-09-01", realizadoPor: "OTRO" } },
  };
};
const datos = () => prepararPedidoHoja([deFixture("lona-02", "10", "231780"), deFixture("baqueton-01", "11", "0231781")], DEFAULT_PARAMS);
const AHORA = "2026-10-01T08:00:00.000Z";
const nuevo = () => crearPedidoRemolques({ datos: datos(), autoria: { technician: "IVÁN", reviewer: "" }, existente: null, ahora: AHORA });

describe("crearPedidoRemolques", () => {
  it("guarda los elementos completos con su resultado, los parámetros y el resumen para Pedidos", () => {
    const pedido = nuevo();
    expect(pedido).toMatchObject({
      schemaVersion: 1, kind: "remolques", orderCode: "AR2604286", numeroPedido: "AR.26.04286",
      status: "PENDING_REVIEW", createdAt: AHORA, updatedAt: AHORA, createdBy: "IVÁN",
      reviewedAt: null, reviewedBy: "", reviewNote: "", production: null,
      summary: {
        customer: "TALLERES CAL", orderDate: "2026-09-01", technician: "IVÁN", reviewer: "", awnings: 2,
        ofs: ["0231780", "0231781"], models: ["Arquillado con aguas", "Baquetón"], diagnostics: 0,
      },
    });
    expect(pedido.params).toBe(DEFAULT_PARAMS);
    expect(pedido.elementos.map((e) => [e.version, e.tipo, e.input.cabecera.realizadoPor])).toEqual([["10", "lona", "IVÁN"], ["11", "baqueton", "IVÁN"]]);
    expect(pedido.elementos[0].result).toEqual(datos().elementos[0].result);
    expect(pedido.elementos[1].paramsSnapshot).toBe(DEFAULT_PARAMS);
  });

  it("al volver a guardarlo conserva la fecha de creación y el autor", () => {
    const primero = nuevo();
    const segundo = crearPedidoRemolques({ datos: datos(), autoria: { technician: "IVÁN", reviewer: "JAIME" }, existente: primero, ahora: "2026-10-02T08:00:00.000Z" });
    expect(segundo).toMatchObject({ createdAt: AHORA, updatedAt: "2026-10-02T08:00:00.000Z", createdBy: "IVÁN", summary: { reviewer: "JAIME" } });
  });

  it("la clave es el número sin puntos y en mayúsculas; sin número no hay pedido", () => {
    expect(codigoPedido("ar.26.04286")).toBe("AR2604286");
    expect(() => codigoPedido("  ")).toThrow("Falta el número de pedido.");
  });
});

describe("lo que necesitan Pedidos, CoordinaOT y la hoja", () => {
  it("las letras y OF de cada elemento, en orden, con la OF en siete cifras", () => {
    expect(elementosAprobacion(nuevo())).toEqual([{ letter: "A", of: "0231780" }, { letter: "B", of: "0231781" }]);
  });

  it("el resumen de la bandeja no lleva los elementos ni los parámetros y sí el estado de cada elemento", () => {
    const resumen = resumenBandeja(nuevo());
    expect("elementos" in resumen).toBe(false);
    expect("params" in resumen).toBe(false);
    expect(resumen.summary.awningList).toEqual([
      { letter: "A", model: "Arquillado con aguas", of: "0231780", state: "ok", notes: [] },
      { letter: "B", model: "Baquetón", of: "0231781", state: "ok", notes: [] },
    ]);
  });

  it("un elemento incompleto (de la web vieja) sale con error y lo que le falta", () => {
    const p = nuevo();
    const incompleto = { ...p, elementos: [{ ...p.elementos[0], input: { ...p.elementos[0].input, altoDelante: 0 } }] };
    expect(resumenBandeja(incompleto).summary.awningList?.[0]).toMatchObject({ state: "error", notes: ["Introduce el alto delantero."] });
  });

  it("el modelo es el perfil de la lona o «Baquetón»", () => {
    const p = nuevo();
    expect(modeloElemento(p.elementos[0])).toBe("Arquillado con aguas");
    expect(modeloElemento({ tipo: "lona", input: { ...p.elementos[0].input, tipoPerfil: "" } as LonaInput })).toBe("Remolque");
    expect(modeloElemento(p.elementos[1])).toBe("Baquetón");
  });

  it("el año sale del número (AR26…) o, si no lo lleva, de la fecha", () => {
    const p = nuevo();
    expect(anioPedido(p)).toBe(2026);
    expect(anioPedido({ ...p, numeroPedido: "PEDIDO-X", summary: { ...p.summary, orderDate: "2025-12-30" } })).toBe(2025);
  });

  it("la hoja recibe los elementos sin resultado", () => {
    expect(elementosPedidoHoja(nuevo()).map((e) => Object.keys(e))).toEqual([["version", "tipo", "input"], ["version", "tipo", "input"]]);
  });
});

describe("marcarPedidoGenerado", () => {
  it("pasa a PRODUCED con sus dos PDF y apunta el revisor de CoordinaOT en el pedido y en cada elemento", () => {
    const p = nuevo();
    const ficheros = [
      { type: "pdf" as const, filename: "AR2604286-10.pdf", savedPath: "/p/AR2604286-10.pdf" },
      { type: "pdf" as const, filename: "AR2604286.pdf", savedPath: "/o/2026/AR2604286.pdf" },
    ];
    const g = marcarPedidoGenerado(p, { revisor: "JAIME", ficheros, ahora: "2026-10-03T09:00:00.000Z" });
    expect(g).toMatchObject({
      status: "PRODUCED", updatedAt: "2026-10-03T09:00:00.000Z", reviewedBy: "JAIME", reviewedAt: "2026-10-03T09:00:00.000Z",
      summary: { reviewer: "JAIME" }, production: { createdAt: "2026-10-03T09:00:00.000Z", createdBy: "IVÁN", files: ficheros },
    });
    expect(g.elementos.map((e) => e.input.cabecera.revision)).toEqual(["JAIME", "JAIME"]);
    expect(p.status).toBe("PENDING_REVIEW");
  });

  it("sin revisor de CoordinaOT no nombra a nadie: ni el guardado ni el de la web vieja, como la hoja", () => {
    const p = nuevo();
    const viejo = {
      ...p,
      reviewedBy: "ADRIÁN", reviewedAt: "2026-09-01T08:00:00.000Z",
      summary: { ...p.summary, reviewer: "ADRIÁN" },
      elementos: p.elementos.map((e) => ({ ...e, input: { ...e.input, cabecera: { ...e.input.cabecera, revision: "ADRIÁN" } } })),
    };
    const g = marcarPedidoGenerado(viejo, { revisor: "", ficheros: [], ahora: "2026-10-03T09:00:00.000Z" });
    expect(g).toMatchObject({ status: "PRODUCED", reviewedBy: "", reviewedAt: null, summary: { reviewer: "" } });
    expect(g.elementos.map((e) => e.input.cabecera.revision)).toEqual(["", ""]);
  });
});
