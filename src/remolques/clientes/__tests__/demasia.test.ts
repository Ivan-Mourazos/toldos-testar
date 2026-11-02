import { describe, expect, it } from "vitest";
import { calcLona, contornoAutomatico, type LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { emptyLona } from "../../entradas-vacias.ts";
import { aplicarFichaAlImportar } from "../aplicar.ts";
import { diferenciasConFicha, resumenCambios } from "../diferencias.ts";
import { validarFichas } from "../reglas.ts";
import type { FichaCliente } from "../tipos.ts";
import { cuerpoGuardar, lineasDesdePedidoGuardado } from "../../../client/remolques/guardarPedido.ts";
import { piezasLona } from "../../corte/lonaAlta.js";
import { hojaLona } from "../../hoja/datos-hoja.ts";

const ficha: FichaCliente = { id: "norte", nombre: "NORTE", codigosRps: ["023649"], demasiaLonaHecha: 2 };
const input: LonaInput = { ...emptyLona(), largo: 201, ancho: 131, altoDelante: 70, tipoPerfil: "TIPO 01" };

describe("demasía de lona hecha por cliente", () => {
  it("conserva en la entrada el 2 de NORTE: 201 × 131 da 203 × 133", () => {
    const linea = aplicarFichaAlImportar({ version: "10", tipo: "lona", input }, ficha);
    const lona = linea.input as LonaInput;
    expect(lona.demasiaLonaHecha).toBe(2);
    const r = calcLona(lona, DEFAULT_PARAMS);
    expect(r.lonaHecha).toEqual({ largo: 203, ancho: 133, anchoAtras: 133 });
    expect(r.contornoIntroducido).toBe(contornoAutomatico(input, 2));
    expect(contornoAutomatico(lona, 1)).toBe(contornoAutomatico(input, 2));
    const detras = calcLona({ ...lona, anchoAtras: 140, altoAtras: 65 }, DEFAULT_PARAMS);
    expect(detras.lonaHecha.anchoAtras).toBe(142);
    expect(detras.contornoAtrasIntroducido).toBe(contornoAutomatico({ ...input, anchoAtras: 140, altoAtras: 65 }, 2, true));
  });

  it("sin campo mantiene la entrada y el resultado serializados exactamente iguales", () => {
    const general = { id: "otra", nombre: "OTRA", codigosRps: [] };
    const linea = { version: "10", tipo: "lona" as const, input };
    const aplicada = aplicarFichaAlImportar(linea, general);
    expect(JSON.stringify(aplicada)).toBe(JSON.stringify(linea));
    expect(JSON.stringify(calcLona(aplicada.input as LonaInput, DEFAULT_PARAMS))).toBe(JSON.stringify(calcLona(input, DEFAULT_PARAMS)));
  });

  it("hoja, dibujo y piezas del plano y del corte consumen la misma lona hecha", () => {
    const lona = { ...input, demasiaLonaHecha: 2, modoOllaos: "REPARTIDOS" as const, recogeAtras: "NO" };
    const result = calcLona(lona, DEFAULT_PARAMS);
    const piezas = piezasLona({ input: lona, result, paramsSnapshot: DEFAULT_PARAMS });
    expect(piezas.anchoPerfil).toBe(1350); // 133 hecha + 2 de bastillas, en mm.
    const contorno = piezas.c as typeof piezas.c & { geo: { uAtras: number; uDelante: number } };
    expect(contorno.geo.uAtras - contorno.geo.uDelante).toBe(2030);
    expect(JSON.stringify(hojaLona(lona, result))).toContain("203 × 133");
    expect(piezas.ollaos.laterales).toEqual(result.reparto.laterales);
  });

  it("guardar y corregir preserva el valor; un antiguo sin campo conserva sus parámetros", () => {
    const linea = aplicarFichaAlImportar({ version: "10", tipo: "lona", input }, ficha);
    const cuerpo = cuerpoGuardar([linea], DEFAULT_PARAMS, "IVÁN", false);
    const abiertas = lineasDesdePedidoGuardado({ elementos: cuerpo.elementos } as Parameters<typeof lineasDesdePedidoGuardado>[0], "corregir", "IVÁN", "2026-11-02");
    expect((abiertas[0].input as LonaInput).demasiaLonaHecha).toBe(2);
    expect(calcLona(abiertas[0].input as LonaInput, DEFAULT_PARAMS).lonaHecha.largo).toBe(203);
    const antiguas = lineasDesdePedidoGuardado({ elementos: [{ version: "10", tipo: "lona", input }] } as Parameters<typeof lineasDesdePedidoGuardado>[0], "corregir", "IVÁN", "2026-11-02");
    expect(calcLona(antiguas[0].input as LonaInput, DEFAULT_PARAMS).lonaHecha.largo).toBe(202);
    ficha.demasiaLonaHecha = 3;
    expect(calcLona(abiertas[0].input as LonaInput, DEFAULT_PARAMS).lonaHecha.largo).toBe(203);
    ficha.demasiaLonaHecha = 2;
  });

  it("valida el dato, lo resume en el historial y ofrece su diferencia", () => {
    const opciones = { recogidasGenerales: [] };
    for (const valor of [-1, NaN, Infinity, "2", null]) expect(validarFichas([{ ...ficha, demasiaLonaHecha: valor }], opciones).ok).toBe(false);
    for (const valor of [undefined, 0, 1.5, 2]) expect(validarFichas([{ ...ficha, demasiaLonaHecha: valor }], opciones).ok).toBe(true);
    const antes = { ...ficha, demasiaLonaHecha: undefined };
    expect(resumenCambios(antes, ficha)).toContain("Demasía de lona hecha: — → 2 cm");
    expect(diferenciasConFicha({ tipo: "lona", input: { ...input, demasiaLonaHecha: 2 } }, antes, DEFAULT_PARAMS)).toContainEqual(expect.objectContaining({ clave: "demasiaLonaHecha", marcada: false, despues: "2 cm" }));
  });
});
