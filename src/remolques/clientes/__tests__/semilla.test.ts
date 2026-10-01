import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { validarParams } from "../../calc/validar-params.ts";
import { PARAMS_GENERALES, paramsConFichas, sinEntradasDeCliente } from "../params-efectivos.ts";
import { entradasDeCliente, fichasSemilla } from "../semilla.ts";

describe("fichas de partida", () => {
  it("salen de los clientes de baquetón y de la recogida de HPL, con sus códigos de RPS", () => {
    const fichas = fichasSemilla(entradasDeCliente(DEFAULT_PARAMS));
    expect(fichas.map((f) => [f.id, f.nombre, f.codigosRps])).toEqual([
      ["hijos-de-pedro-lopez", "HIJOS DE PEDRO LOPEZ", ["001300"]],
      ["ayala", "AYALA", ["036662", "048286"]],
      ["general-wolder", "GENERAL WOLDER", ["001047"]],
    ]);
    expect(fichas[0].extrasBaqueton).toMatchObject({
      extraLargoCostura: 11, extraBaquetonTrasero: 10, observaciones: ["ABIERTO EN LA PARTE TRASERA (REFORZAR)"],
    });
    expect(fichas[0].recogidaPropia).toEqual({
      nombre: "PUENTES HIJOS DE PEDRO LOPEZ", delante: 42.5, atras: 42.5, lateralSoloAtras: 11.5, lateralSoloDelante: 9,
      panoTraseroConAnchoDelante: true,
    });
    expect(fichas[2].extrasBaqueton?.observaciones).toHaveLength(3);
    expect(fichas.some((f) => f.nombre === "GENERAL")).toBe(false);
  });

  it("toman los valores guardados en Parámetros, no los del código", () => {
    const guardados = {
      ...DEFAULT_PARAMS,
      clientesBaqueton: DEFAULT_PARAMS.clientesBaqueton.map((c) => (c.nombre === "HIJOS DE PEDRO LOPEZ" ? { ...c, extraLargoCostura: 12 } : c)),
    };
    expect(fichasSemilla(entradasDeCliente(guardados))[0].extrasBaqueton?.extraLargoCostura).toBe(12);
  });

  it("si los parámetros ya no tienen clientes, valen los del código", () => {
    expect(fichasSemilla({ clientesBaqueton: [], recogidas: [] })).toEqual(fichasSemilla(entradasDeCliente(DEFAULT_PARAMS)));
  });

  it("un cliente que no está en la lista de códigos se crea sin código", () => {
    const [general] = DEFAULT_PARAMS.clientesBaqueton;
    expect(fichasSemilla({ clientesBaqueton: [{ ...general, nombre: "TALLERES CAL" }], recogidas: [] })).toEqual([{
      id: "talleres-cal", nombre: "TALLERES CAL", codigosRps: [],
      extrasBaqueton: {
        extraLargoCostura: 0, extraAnchoCostura: 0, extraBaquetonLargoDelante: 0, extraBaquetonLargoDetras: 0,
        extraLargoFinal: 0, extraAnchoFinal: 0, extraBaquetonTrasero: 0, observaciones: [],
      },
    }]);
  });
});

describe("parámetros generales y efectivos", () => {
  it("los generales solo tienen GENERAL y las recogidas normales, y son válidos", () => {
    expect(PARAMS_GENERALES.clientesBaqueton.map((c) => c.nombre)).toEqual(["GENERAL"]);
    expect(PARAMS_GENERALES.recogidas.some((r) => r.nombre === "PUENTES HIJOS DE PEDRO LOPEZ")).toBe(false);
    expect(PARAMS_GENERALES.recogidas).toHaveLength(DEFAULT_PARAMS.recogidas.length - 1);
    expect(validarParams(PARAMS_GENERALES).ok).toBe(true);
  });

  it("con las fichas de partida se calcula con los mismos parámetros que antes", () => {
    expect(paramsConFichas(PARAMS_GENERALES, fichasSemilla(entradasDeCliente(DEFAULT_PARAMS)))).toEqual(DEFAULT_PARAMS);
  });

  it("aplicarlo dos veces da lo mismo, y lo de la ficha sustituye a una entrada del mismo nombre", () => {
    const fichas = fichasSemilla(entradasDeCliente(DEFAULT_PARAMS));
    const una = paramsConFichas(PARAMS_GENERALES, fichas);
    expect(paramsConFichas(una, fichas)).toEqual(una);
    const otra = paramsConFichas(DEFAULT_PARAMS, [{ ...fichas[1], extrasBaqueton: { ...fichas[1].extrasBaqueton!, extraLargoCostura: 5 } }]);
    expect(otra.clientesBaqueton.filter((c) => c.nombre === "AYALA")).toEqual([{ ...DEFAULT_PARAMS.clientesBaqueton[2], extraLargoCostura: 5 }]);
  });

  it("una ficha sin extras ni recogida propia no añade nada", () => {
    expect(paramsConFichas(PARAMS_GENERALES, [{ id: "x", nombre: "X", codigosRps: [] }])).toEqual(PARAMS_GENERALES);
  });

  it("sinEntradasDeCliente no cambia nada más", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { clientesBaqueton: _c, recogidas: _r, ...resto } = sinEntradasDeCliente(DEFAULT_PARAMS);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { clientesBaqueton: _c2, recogidas: _r2, ...restoCodigo } = DEFAULT_PARAMS;
    expect(resto).toEqual(restoCodigo);
  });
});
