import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { conAguasDelPedido } from "../../calc/alto-sin-aguas.ts";
import type { LonaInput } from "../../calc/lona.ts";
import { emptyLona } from "../../entradas-vacias.ts";
import { aplicarFichaAlImportar } from "../aplicar.ts";
import { propuestaOllaos } from "../adaptar-ollaos.ts";
import { erroresPlanteamiento } from "../../pedidos/validar-planteamiento.ts";
import type { FichaCliente, MedidaHabitual } from "../tipos.ts";

// AR2605676 (Hijos de Pedro López, 20/11/2026): lona 220 × 130 × 40, 1,5 cm más ancha detrás.
// Su medida habitual 220 × 130 se guardó sin lona hecha de referencia, con los ollaos de atrás
// ya tomados sobre la lona de detrás (132,5). Y su pedido da el alto sin las aguas («Arquillo p.8»).
const ollaos = {
  laterales: [2.65, 31.55, 63.15, 94.75, 126.35, 157.95, 189.55, 218.35],
  atras: [3.4, 43.3, 89.1, 129.1],
  delante: [2.65, 42.55, 88.35, 128.35],
};
const medida: MedidaHabitual = { tipo: "lona", largo: 220, ancho: 130, ollaos };
const ficha: FichaCliente = { id: "hijos-de-pedro-lopez", nombre: "HIJOS DE PEDRO LOPEZ", codigosRps: ["001300"], sesgoDetras: 1.5, medidas: [medida] };
const params = { ...DEFAULT_PARAMS, demasiaLonaHecha: 1 };
const deRps = (): LonaInput => ({ ...emptyLona(), largo: 220, ancho: 130, altoDelante: 40, altoAtras: 40 });

describe("medida habitual de un cliente más ancho detrás", () => {
  it("sin lona hecha guardada, la referencia de atrás lleva el sesgo de la ficha: es exacta", () => {
    expect(propuestaOllaos(ficha, "lona", { ...deRps(), anchoAtras: 131.5 }, params)).toEqual({ ollaos, origenes: [] });
  });

  it("con «siempre repartidos» la medida exacta sigue mandando", () => {
    const linea = aplicarFichaAlImportar({ tipo: "lona", version: "10", input: deRps() }, { ...ficha, ollaosRepartidos: true }, params);
    expect(linea.input).toMatchObject({ anchoAtras: 131.5, modoOllaos: "SEGUN SE INDICA", ollaosManuales: ollaos });
    expect((linea.input as LonaInput).ollaosAdaptados).toBeUndefined();
  });

  it("una lona hecha guardada sin ancho de detrás no se toca", () => {
    const conHecha = { ...ficha, medidas: [{ ...medida, hecha: { largo: 221, ancho: 131 } }] };
    expect(propuestaOllaos(conHecha, "lona", { ...deRps(), anchoAtras: 131.5 }, params)?.origenes).toEqual(["220×130"]);
  });
});

describe("alto del pedido sin las aguas", () => {
  const fichaSinAguas: FichaCliente = { ...ficha, altoSinAguas: true };

  it("al importar guarda el alto del pedido y lo marca del cliente", () => {
    const linea = aplicarFichaAlImportar({ tipo: "lona", version: "10", input: deRps() }, fichaSinAguas, params);
    expect(linea.input).toMatchObject({ altoDelante: 40, altoAtras: 40, altoSinAguas: { delante: 40, atras: 40 } });
    expect(linea.delCliente?.campos).toContain("altoSinAguas");
  });

  it("si las aguas ya vienen, las suma al importar", () => {
    const linea = aplicarFichaAlImportar({ tipo: "lona", version: "10", input: { ...deRps(), aguas: 8 } }, fichaSinAguas, params);
    expect(linea.input).toMatchObject({ altoDelante: 48, altoAtras: 48, aguas: 8, altoSinAguas: { delante: 40, atras: 40 } });
  });

  it("sin la marca en la ficha no cambia nada", () => {
    const linea = aplicarFichaAlImportar({ tipo: "lona", version: "10", input: deRps() }, ficha, params);
    expect((linea.input as LonaInput).altoSinAguas).toBeUndefined();
  });

  it("al escribir las aguas, el alto es el del pedido más las aguas; cambiarlas no acumula", () => {
    const input = { ...deRps(), altoSinAguas: { delante: 40, atras: 40 } };
    expect(conAguasDelPedido(input, 8)).toMatchObject({ aguas: 8, altoDelante: 48, altoAtras: 48 });
    expect(conAguasDelPedido(conAguasDelPedido(input, 8), 6.5)).toMatchObject({ aguas: 6.5, altoDelante: 46.5, altoAtras: 46.5 });
    expect(conAguasDelPedido(input, 0)).toMatchObject({ aguas: 0, altoDelante: 40, altoAtras: 40 });
  });

  it("sin alto del pedido guardado solo cambia las aguas; alto de detrás vacío se queda vacío", () => {
    expect(conAguasDelPedido(deRps(), 8)).toMatchObject({ aguas: 8, altoDelante: 40, altoAtras: 40 });
    const soloDelante = { ...deRps(), altoAtras: 0, altoSinAguas: { delante: 40, atras: 0 } };
    expect(conAguasDelPedido(soloDelante, 8)).toMatchObject({ altoDelante: 48, altoAtras: 0 });
  });

  it("no deja generar con el alto del pedido sin las aguas", () => {
    const mensaje = (i: LonaInput) => erroresPlanteamiento(i).filter((e) => e.campo === "altoDelante").map((e) => e.mensaje);
    const input = { ...deRps(), altoSinAguas: { delante: 40, atras: 40 } };
    expect(mensaje(input)).toEqual([expect.stringContaining("alto sin aguas")]);
    expect(mensaje(conAguasDelPedido(input, 8))).toEqual([]);
  });
});
