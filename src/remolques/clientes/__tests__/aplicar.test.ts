import { describe, expect, it } from "vitest";
import type { BaquetonInput } from "../../calc/baqueton.ts";
import type { LonaInput } from "../../calc/lona.ts";
import { emptyBaqueton, emptyLona } from "../../entradas-vacias.ts";
import type { LineaPedido } from "../../workspace/lineas.ts";
import { aplicarFichaALineas, aplicarFichaAlImportar, LINEA_CREMALLERA, marcasTrasCambio } from "../aplicar.ts";
import type { ExtrasBaqueton, FichaCliente, MedidaHabitual } from "../tipos.ts";

// Como sale de RPS: medidas y aguas, «NO» en la recogida que no menciona y «» en la que sí,
// ventana sí/no según la mencione, rotulación sin dato y sin bobina.
const deRps = (cambios: Partial<LonaInput> = {}): LineaPedido => ({
  version: "10", tipo: "lona",
  input: {
    ...emptyLona(), largo: 200, ancho: 120, altoDelante: 100, altoAtras: 100, aguas: 15,
    recogeDelante: "NO", recogeAtras: "", ventana: false, rotulacion: null, material: "", ...cambios,
  },
});
const baqueton = (cambios: Partial<BaquetonInput> = {}): LineaPedido => ({
  version: "11", tipo: "baqueton", input: { ...emptyBaqueton(), largo: 200, ancho: 120, baqueton: 28, ...cambios },
});
const MEDIDA: MedidaHabitual = {
  tipo: "lona", largo: 200, ancho: 120,
  ollaos: { delante: [2.5, 10, 40, 70, 100, 108.5], atras: [2.5, 60.5, 118.5], laterales: [2.5, 100, 197.5] },
};
const EXTRAS: ExtrasBaqueton = {
  extraLargoCostura: 1, extraAnchoCostura: 1, extraBaquetonLargoDelante: 0, extraBaquetonLargoDetras: 0,
  extraLargoFinal: 1, extraAnchoFinal: 1, extraBaquetonTrasero: 0, observaciones: [],
};
const FICHA: FichaCliente = {
  id: "talleres-cal", nombre: "TALLERES CAL", codigosRps: ["009999"],
  perfil: { tipoPerfil: "TIPO 02", aguas: 20 },
  recogeDelante: "GOMA", recogeAtras: "PUENTES ESVA", bastillaEnfundar: false,
  ventana: { lleva: true, ancho: 50, alto: 35 }, rotulacion: true, material: "LONA GRIS",
  observaciones: ["ETIQUETA DETRÁS"], medidas: [MEDIDA],
};

describe("aplicarFichaAlImportar · lona", () => {
  it("rellena lo vacío con la ficha y lo marca «del cliente»", () => {
    const linea = aplicarFichaAlImportar(deRps(), FICHA);
    expect(linea.input).toMatchObject({
      tipoPerfil: "TIPO 02", aguas: 15, recogeDelante: "GOMA", recogeAtras: "PUENTES ESVA", bastillaEnfundar: false,
      ventana: true, ventanaAncho: 50, ventanaAlto: 35, rotulacion: true, material: "LONA GRIS",
      modoOllaos: "SEGUN SE INDICA", ollaosManuales: MEDIDA.ollaos, observaciones: "ETIQUETA DETRÁS",
    });
    expect(linea.delCliente).toEqual({ ficha: "TALLERES CAL", campos: [
      "tipoPerfil", "recogeDelante", "recogeAtras", "bastillaEnfundar", "ventana", "ventanaAncho", "ventanaAlto",
      "rotulacion", "material", "modoOllaos", "ollaosManuales", "observaciones",
    ] });
  });

  it("lo que RPS dice de verdad manda: rotulación, material, aguas y la ventana con su medida", () => {
    const linea = aplicarFichaAlImportar(deRps({ rotulacion: false, material: "LONA AZUL", ventana: true, ventanaAncho: 60 }), FICHA);
    expect(linea.input).toMatchObject({ rotulacion: false, material: "LONA AZUL", aguas: 15, ventana: true, ventanaAncho: 60, ventanaAlto: 35 });
    for (const campo of ["rotulacion", "material", "ventana", "ventanaAncho"]) expect(linea.delCliente?.campos).not.toContain(campo);
    expect(linea.delCliente?.campos).toContain("ventanaAlto");
  });

  it("medida exacta: ollaos «según se indica» con sus posiciones, en una copia; otra medida no", () => {
    const linea = aplicarFichaAlImportar(deRps(), FICHA);
    const ollaos = (linea.input as LonaInput).ollaosManuales;
    expect(ollaos).toEqual(MEDIDA.ollaos);
    expect(ollaos.delante).not.toBe(MEDIDA.ollaos.delante);
    expect((aplicarFichaAlImportar(deRps({ ancho: 121 }), FICHA).input as LonaInput).modoOllaos).toBe("");
    expect((aplicarFichaAlImportar(deRps({ modoOllaos: "REPARTIDOS" }), FICHA).input as LonaInput).modoOllaos).toBe("REPARTIDOS");
  });

  it("el sesgo pone el ancho de detrás", () => {
    const linea = aplicarFichaAlImportar(deRps(), { id: "h", nombre: "HPL", codigosRps: [], sesgoDetras: 1.5 });
    expect((linea.input as LonaInput).anchoAtras).toBe(121.5);
    expect(linea.delCliente).toEqual({ ficha: "HPL", campos: ["anchoAtras"] });
  });

  it("la cremallera del 9 y las observaciones fijas se añaden sin repetir", () => {
    const linea = aplicarFichaAlImportar(deRps({ observaciones: "ETIQUETA DETRAS" }), {
      id: "c", nombre: "C", codigosRps: [], cremallera: true, observaciones: ["Etiqueta detrás"],
    });
    expect((linea.input as LonaInput).observaciones).toBe(`ETIQUETA DETRAS\n${LINEA_CREMALLERA}`);
  });

  it("sin nada que poner, devuelve la misma línea", () => {
    const linea = deRps();
    expect(aplicarFichaAlImportar(linea, { id: "v", nombre: "V", codigosRps: [] })).toBe(linea);
  });
});

describe("aplicarFichaAlImportar · baquetón", () => {
  it("pone el cliente de los extras si estaba en GENERAL, no si RPS ya dio otro", () => {
    const ficha: FichaCliente = { ...FICHA, extrasBaqueton: EXTRAS, medidas: [{ ...MEDIDA, tipo: "baqueton" }] };
    const linea = aplicarFichaAlImportar(baqueton(), ficha);
    expect(linea.input).toMatchObject({ clienteEspecifico: "TALLERES CAL", rotulacion: true, material: "LONA GRIS", modoOllaos: "SEGUN SE INDICA" });
    expect(linea.delCliente?.campos).toEqual(["clienteEspecifico", "rotulacion", "material", "modoOllaos", "ollaosManuales", "observaciones"]);
    expect((aplicarFichaAlImportar(baqueton({ clienteEspecifico: "AYALA" }), ficha).input as BaquetonInput).clienteEspecifico).toBe("AYALA");
  });

  it("una medida de lona no se aplica a un baquetón", () => {
    expect((aplicarFichaAlImportar(baqueton(), FICHA).input as BaquetonInput).modoOllaos).toBe("");
  });
});

describe("aplicarFichaALineas y marcasTrasCambio", () => {
  it("sin ficha deja las líneas como están", () => {
    const lineas = [deRps(), baqueton()];
    expect(aplicarFichaALineas(lineas, null)).toBe(lineas);
    expect(aplicarFichaALineas(lineas, FICHA)[0].delCliente?.ficha).toBe("TALLERES CAL");
  });

  it("cambiar un campo quita su marca; sin marcas, nada", () => {
    const linea = aplicarFichaAlImportar(deRps(), FICHA);
    const antes = linea.input as LonaInput;
    const marca = marcasTrasCambio(linea.delCliente, antes, { ...antes, recogeDelante: "NO" });
    expect(marca?.campos).not.toContain("recogeDelante");
    expect(marca?.campos).toContain("recogeAtras");
    expect(marcasTrasCambio(linea.delCliente, antes, { ...antes })).toBe(linea.delCliente);
    expect(marcasTrasCambio({ ficha: "X", campos: ["material"] }, antes, { ...antes, material: "OTRA" })).toBeUndefined();
    expect(marcasTrasCambio(undefined, antes, antes)).toBeUndefined();
  });
});
