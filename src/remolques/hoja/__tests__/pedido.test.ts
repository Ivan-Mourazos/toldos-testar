import { describe, expect, it } from "vitest";
import casos from "../../__fixtures__/produccion-2026-09.json";
import { calcBaqueton, type BaquetonInput } from "../../calc/baqueton.ts";
import { calcLona, type LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import type { ElementoPedidoHoja } from "../tipos.ts";
import { ErrorPedidoHoja, MAX_ELEMENTOS_HOJA, prepararPedidoHoja } from "../pedido.ts";

type CasoFixture = { caso: string; tipo: "lona" | "baqueton"; input: Record<string, unknown> };

const deFixture = (id: string, version: string, numeroPedido = "AR.26.99990"): ElementoPedidoHoja => {
  const caso = (casos as CasoFixture[]).find((c) => c.caso === id);
  if (!caso) throw new Error(`La fixture no trae el caso ${id}.`);
  const input = caso.input as Record<string, unknown>;
  return {
    version,
    tipo: caso.tipo,
    input: {
      ...input,
      cabecera: { ...(input.cabecera as Record<string, unknown>), numeroPedido },
    } as LonaInput | BaquetonInput,
  };
};

const falla = (elementos?: ElementoPedidoHoja[] | null | object[]): string => {
  try {
    prepararPedidoHoja(elementos as ElementoPedidoHoja[] | null | undefined, DEFAULT_PARAMS);
    return "No falló";
  } catch (e) {
    if (e instanceof ErrorPedidoHoja) return e.message;
    throw e;
  }
};

describe("prepararPedidoHoja", () => {
  it("un pedido válido de dos elementos (uno de cada tipo)", () => {
    const datos = prepararPedidoHoja([deFixture("lona-02", "10"), deFixture("baqueton-01", "11")], DEFAULT_PARAMS);
    expect(datos.elementos).toHaveLength(2);
    const lona = deFixture("lona-02", "10");
    const baqueton = deFixture("baqueton-01", "11");
    expect(datos.elementos[0]).toMatchObject({
      version: "10",
      tipo: "lona",
      input: lona.input,
    });
    expect(datos.elementos[0].result).toEqual(calcLona(lona.input as LonaInput, DEFAULT_PARAMS));
    expect(datos.elementos[1]).toMatchObject({
      version: "11",
      tipo: "baqueton",
      input: baqueton.input,
    });
    expect(datos.elementos[1].result).toEqual(calcBaqueton(baqueton.input as BaquetonInput, DEFAULT_PARAMS));
    expect(datos.params).toBe(DEFAULT_PARAMS);
  });

  it("rechaza un pedido vacío o demasiado grande", () => {
    expect(falla([])).toBe("El pedido no tiene elementos para la hoja de taller.");
    expect(falla(undefined)).toBe("El pedido no tiene elementos para la hoja de taller.");
    const muchos = Array.from({ length: MAX_ELEMENTOS_HOJA + 1 }, (_, i) => deFixture("lona-02", String(10 + i)));
    expect(falla(muchos)).toBe("Un pedido admite como mucho 30 elementos en la hoja de taller.");
  });

  it("rechaza lo que no tiene forma de elemento", () => {
    expect(falla([{ tipo: "lona" as const, version: "10", input: {} }] as ElementoPedidoHoja[])).toBe("El elemento 1 del pedido no tiene el formato esperado.");
    const cambiado: ElementoPedidoHoja = { ...deFixture("lona-02", "10"), tipo: "baqueton" };
    expect(falla([cambiado])).toBe("Baquetón 1: el tipo no cuadra con sus datos.");
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
