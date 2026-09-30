import { describe, expect, it } from "vitest";
import casos from "../../__fixtures__/produccion-2026-09.json";
import { calcBaqueton, type BaquetonInput } from "../../calc/baqueton.ts";
import { calcLona, type LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { ErrorPedidoHoja, MAX_ELEMENTOS_HOJA, prepararPedidoHoja } from "../pedido.ts";
import type { ElementoPedidoHoja } from "../tipos.ts";

type Caso = { caso: string; tipo: "lona" | "baqueton"; input: LonaInput | BaquetonInput };
const deFixture = (id: string, version: string, numeroPedido = "AR.26.99990"): ElementoPedidoHoja => {
  const c = (casos as Caso[]).find((x) => x.caso === id)!;
  return { version, tipo: c.tipo, input: { ...c.input, cabecera: { ...c.input.cabecera, numeroPedido, version } } };
};
const falla = (elementos: unknown) => {
  try {
    prepararPedidoHoja(elementos, DEFAULT_PARAMS);
  } catch (error) {
    expect(error).toBeInstanceOf(ErrorPedidoHoja);
    expect((error as ErrorPedidoHoja).statusCode).toBe(400);
    return (error as Error).message;
  }
  throw new Error("no ha fallado");
};

describe("prepararPedidoHoja", () => {
  it("ordena por versión y calcula cada elemento con los parámetros comunes", () => {
    const lona = deFixture("lona-02", "11");
    const baqueton = deFixture("baqueton-01", "10");
    const datos = prepararPedidoHoja([lona, baqueton], DEFAULT_PARAMS);
    expect(datos.elementos.map((e) => e.version)).toEqual(["10", "11"]);
    expect(datos.elementos[0].result).toEqual(calcBaqueton(baqueton.input as BaquetonInput, DEFAULT_PARAMS));
    expect(datos.elementos[1].result).toEqual(calcLona(lona.input as LonaInput, DEFAULT_PARAMS));
    expect(datos.params).toBe(DEFAULT_PARAMS);
  });

  it("rechaza un pedido vacío o demasiado grande", () => {
    expect(falla([])).toBe("El pedido no tiene elementos para la hoja de taller.");
    expect(falla(undefined)).toBe("El pedido no tiene elementos para la hoja de taller.");
    const muchos = Array.from({ length: MAX_ELEMENTOS_HOJA + 1 }, (_, i) => deFixture("lona-02", String(10 + i)));
    expect(falla(muchos)).toBe("El pedido tiene 31 elementos y la hoja de taller admite como mucho 30. Divide el pedido o avisa a informática.");
  });

  it("rechaza lo que no tiene forma de elemento", () => {
    expect(falla([{ tipo: "toldo", version: "10", input: {} }])).toBe("El elemento 1 del pedido no tiene el formato esperado.");
    const cambiado = { ...deFixture("lona-02", "10"), tipo: "baqueton" };
    expect(falla([cambiado])).toBe("Baquetón 1: el tipo no cuadra con sus datos.");
  });

  it("un elemento con el número de pedido o el material mal puestos da 400, no un fallo del servidor", () => {
    const base = deFixture("lona-02", "10");
    const cabecera = { ...base.input.cabecera, numeroPedido: 12345 };
    expect(falla([{ ...base, input: { ...base.input, cabecera } }])).toBe("Remolque 1: faltan el número de pedido o el material, o no son texto.");
    const sinMaterial: Record<string, unknown> = { ...base.input };
    delete sinMaterial.material;
    expect(falla([{ ...base, input: sinMaterial }])).toBe("Remolque 1: faltan el número de pedido o el material, o no son texto.");
  });

  it("todos del mismo pedido, con número y sin versiones repetidas", () => {
    expect(falla([deFixture("lona-02", "10"), deFixture("lona-03", "11", "AR.26.99991")]))
      .toBe("Todos los elementos de la hoja tienen que ser del mismo pedido.");
    expect(falla([deFixture("lona-02", "10", "  ")])).toBe("Falta el número de pedido.");
    expect(falla([deFixture("lona-02", "10"), deFixture("lona-03", "10")])).toBe("Hay dos elementos con la misma versión en el pedido.");
    // El mismo pedido escrito con y sin puntos es el mismo pedido.
    expect(prepararPedidoHoja([deFixture("lona-02", "10"), deFixture("lona-03", "11", "AR2699990")], DEFAULT_PARAMS).elementos).toHaveLength(2);
  });

  it("un elemento incompleto dice cuál y qué le falta", () => {
    const incompleto = deFixture("lona-02", "11");
    (incompleto.input as LonaInput).altoDelante = 0;
    expect(falla([deFixture("baqueton-01", "10"), incompleto])).toBe("Remolque 2: Introduce el alto delantero.");
  });
});
