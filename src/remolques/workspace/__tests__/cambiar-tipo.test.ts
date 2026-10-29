import { describe, expect, it } from "vitest";
import type { BaquetonInput } from "../../calc/baqueton.ts";
import type { LonaInput } from "../../calc/lona.ts";
import type { FichaCliente } from "../../clientes/tipos.ts";
import { emptyBaqueton } from "../../entradas-vacias.ts";
import { cambiarTipoLinea } from "../cambiar-tipo.ts";
import type { LineaPedido } from "../lineas.ts";

// AR2605299: RPS lo trae como baquetón 140 × 108 × 25 y el cliente pide «ARQUILLOS P.65», que es lona alta.
const baqueton: LineaPedido = {
  version: "10", tipo: "baqueton", id: "guardado-1",
  origenRps: { idLinea: "l1", numeroLinea: 1, cliente: { codigo: "001300", nombre: "HIJOS DE PEDRO LOPEZ GARCIA, S. L.", alias: null } } as LineaPedido["origenRps"],
  input: {
    ...emptyBaqueton(),
    cabecera: { ...emptyBaqueton().cabecera, numeroPedido: "AR.26.05299", ordenFabricacion: "0233442" },
    cantidad: 1, largo: 140, ancho: 108, baqueton: 25, clienteEspecifico: "HIJOS DE PEDRO LOPEZ",
    modoOllaos: "SEGUN SE INDICA", ollaosManuales: { laterales: [1, 2], atras: [], delante: [] },
    rotulacion: true, material: "LONA 650 GRIS 7038", observaciones: "ROTULADA",
  },
  delCliente: { ficha: "HIJOS DE PEDRO LOPEZ", campos: ["clienteEspecifico"] },
};

const ficha: FichaCliente = {
  id: "hijos-de-pedro-lopez", nombre: "HIJOS DE PEDRO LOPEZ", codigosRps: ["001300"],
  recogeAtras: "PUENTES HIJOS DE PEDRO LOPEZ", recogeDelante: "NO", bastillaEnfundar: false,
  medidas: [{ tipo: "lona", largo: 140, ancho: 108, ollaos: { delante: [2.5, 37.1, 71.8, 106.5], atras: [2.5, 37.6, 72.8, 108], laterales: [2.5, 37.1, 71.7, 106.3, 141] } }],
};

describe("cambiar el tipo de un elemento sin salir del pedido", () => {
  it("de baquetón a lona alta conserva lo común, el alto pasa a la lona y aplica la ficha", () => {
    const lona = cambiarTipoLinea(baqueton, "lona", ficha);
    const input = lona.input as LonaInput;
    expect([lona.tipo, lona.version, lona.id, lona.origenRps]).toEqual(["lona", "10", "guardado-1", baqueton.origenRps]);
    expect(input.cabecera.ordenFabricacion).toBe("0233442");
    expect([input.cantidad, input.largo, input.ancho, input.altoDelante, input.altoAtras]).toEqual([1, 140, 108, 25, 25]);
    expect([input.material, input.rotulacion, input.observaciones]).toEqual(["LONA 650 GRIS 7038", true, "ROTULADA"]);
    // Lo del baquetón no pasa; la ficha pone los ollaos de su 140 × 108 y sus recogidas.
    expect(input.modoOllaos).toBe("SEGUN SE INDICA");
    expect(input.ollaosManuales.laterales).toEqual([2.5, 37.1, 71.7, 106.3, 141]);
    expect(input.recogeAtras).toBe("PUENTES HIJOS DE PEDRO LOPEZ");
    expect(lona.delCliente?.campos).toEqual(expect.arrayContaining(["ollaosManuales", "recogeAtras"]));
  });

  it("de lona alta a baquetón, el alto de delante pasa a ser el baquetón; sin ficha no se rellena nada", () => {
    const vuelta = cambiarTipoLinea(cambiarTipoLinea(baqueton, "lona", null), "baqueton", null);
    const input = vuelta.input as BaquetonInput;
    expect([vuelta.tipo, input.largo, input.ancho, input.baqueton, input.clienteEspecifico, input.modoOllaos]).toEqual(["baqueton", 140, 108, 25, "GENERAL", ""]);
    expect(vuelta.delCliente).toBeUndefined();
  });

  it("al mismo tipo o con el de ganado no cambia nada", () => {
    expect(cambiarTipoLinea(baqueton, "baqueton", ficha)).toBe(baqueton);
  });
});
