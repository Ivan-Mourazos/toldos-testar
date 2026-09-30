import { describe, expect, it } from "vitest";
import { calcBaqueton, type BaquetonInput } from "../../calc/baqueton.ts";
import { calcLona, type LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { emptyBaqueton, emptyLona } from "../../entradas-vacias.ts";
import { cabeceraHoja, fechaEs, paginaHoja, tablaGanchos, tablaOllaos, tituloOllaos } from "../pagina.ts";

const lona = (extra: Partial<LonaInput> = {}): LonaInput => ({
  ...emptyLona(),
  cabecera: { ...emptyLona().cabecera, numeroPedido: "ar.26.04329", cliente: "TALLERES CAL", realizadoPor: "IVÁN", ordenFabricacion: "0231234", fecha: "2026-09-30" },
  largo: 300, ancho: 200, altoDelante: 100, tipoPerfil: "TIPO 01", contorno: 400,
  recogeDelante: "NO", recogeAtras: "NO", bastillaEnfundar: false, ventana: false, rotulacion: false,
  modoOllaos: "REPARTIDOS", pasoOllaos: 35, primerOllao: 2.5, material: "PVC GRIS",
  ...extra,
});

describe("cabecera de la hoja", () => {
  it("fecha en castellano y pedido en mayúsculas", () => {
    expect(fechaEs("2026-09-30")).toBe("30/09/2026");
    expect(fechaEs("30/09/2026")).toBe("30/09/2026");
    expect(cabeceraHoja(lona().cabecera)).toEqual({
      cliente: "TALLERES CAL", realizadoPor: "IVÁN", revisadoPor: "",
      numeroPedido: "AR.26.04329", of: "0231234", fecha: "30/09/2026",
    });
  });
  it("lo que falta sale con raya; «REVISADO POR» queda vacío hasta la fase 5", () => {
    const c = cabeceraHoja({ ...emptyLona().cabecera, fecha: "" });
    expect(c).toMatchObject({ cliente: "—", realizadoPor: "—", numeroPedido: "—", of: "—", fecha: "—", revisadoPor: "" });
  });
});

describe("tabla de ollaos", () => {
  it("el título dice el modo, como la hoja vieja", () => {
    expect(tituloOllaos(lona(), 2.5)).toBe("OLLAOS · REPARTIDOS · PRIMER Y ÚLTIMO OLLAO A 2,5 CM DEL BORDE");
    expect(tituloOllaos(lona({ modoOllaos: "SEGUN SE INDICA" }), 2.5)).toBe("OLLAOS · SEGUN SE INDICA");
    expect(tituloOllaos(lona({ modoOllaos: "" }), 2.5)).toBe("OLLAOS · SIN ELEGIR");
  });
  it("según ganchos dice que van entre ellos y si lleva los de los extremos", () => {
    expect(tituloOllaos(lona({ modoOllaos: "SEGUN GANCHOS" }), 4))
      .toBe("OLLAOS · SEGÚN GANCHOS · UNO ENTRE CADA DOS GANCHOS Y LOS DE LOS EXTREMOS A 4 CM DEL BORDE");
    expect(tituloOllaos(lona({ modoOllaos: "SEGUN GANCHOS", ollaosExtremos: false }), 4))
      .toBe("OLLAOS · SEGÚN GANCHOS · UNO ENTRE CADA DOS GANCHOS, SIN OLLAOS EN LOS EXTREMOS");
  });
  it("12 columnas como siempre, y más si un lado lleva más (la vieja cortaba en 12)", () => {
    const corta = tablaOllaos(lona(), { laterales: [2.5, 150], atras: [2.5], delante: [2.5] }, 2.5);
    expect(corta.columnas).toBe(12);
    expect(corta.filas.map((f) => f.nombre)).toEqual([
      "OLLAOS LATERALES DE ATRÁS A ADELANTE", "OLLAOS ATRÁS DE IZQUIERDA A DERECHA", "OLLAOS DELANTE DE IZQUIERDA A DERECHA",
    ]);
    const larga = tablaOllaos(lona(), { laterales: Array.from({ length: 15 }, (_, i) => i * 10 + 2.5), atras: [], delante: [] }, 2.5);
    expect(larga.columnas).toBe(15);
  });
});

describe("tabla de ganchos", () => {
  it("solo con «Según ganchos»", () => {
    expect(tablaGanchos(lona())).toBeNull();
  });
  it("los ganchos tal cual vienen en el pedido, sobre el remolque, y el lado medido al revés lo dice", () => {
    const tabla = tablaGanchos(lona({
      modoOllaos: "SEGUN GANCHOS",
      ganchos: { laterales: [5, 150, 295], atras: [160, 110, 60, 10], delante: [40, 90, 140, 190] },
      ganchosAlReves: { laterales: false, atras: false, delante: true },
    }))!;
    expect(tabla.titulo).toBe("GANCHOS · SOBRE EL REMOLQUE, COMO VIENEN EN EL PEDIDO");
    expect(tabla.filas).toEqual([
      { nombre: "GANCHOS LATERALES DE ATRÁS A ADELANTE", posiciones: [5, 150, 295] },
      { nombre: "GANCHOS ATRÁS DE IZQUIERDA A DERECHA", posiciones: [160, 110, 60, 10] },
      { nombre: "GANCHOS DELANTE DE DERECHA A IZQUIERDA (MEDIDO AL REVÉS)", posiciones: [40, 90, 140, 190] },
    ]);
    expect(tabla.columnas).toBe(12);
  });
});

describe("paginaHoja", () => {
  it("junta cabecera, textos y tablas de un elemento, sin notas del cálculo", () => {
    const input = lona({ rotulacion: true });
    const result = calcLona(input, DEFAULT_PARAMS);
    const pagina = paginaHoja({ version: "11", tipo: "lona", input, result }, 1, 2, DEFAULT_PARAMS);
    expect(pagina.clave).toBe("11");
    expect(pagina.titulo).toBe("REMOLQUE · 2 DE 2");
    expect(pagina.cabecera.numeroPedido).toBe("AR.26.04329");
    expect(pagina.ollaos.filas[0].posiciones).toEqual(result.reparto.laterales);
    expect(pagina.ganchos).toBeNull();
    expect(pagina).not.toHaveProperty("notas");
  });
  // Iván, 30/09/2026: la recogida se lee en el propio dibujo, de frente la de delante y de espaldas
  // la de atrás, con el nombre que se ve en el formulario.
  it("la recogida de cada cara, para escribirla en su vista, con el nombre del formulario en mayúsculas", () => {
    const input = lona({ recogeDelante: "PUENTES HIJOS DE PEDRO LOPEZ", recogeAtras: "GOMA" });
    const pagina = paginaHoja({ version: "10", tipo: "lona", input, result: calcLona(input, DEFAULT_PARAMS) }, 0, 1, DEFAULT_PARAMS);
    expect(pagina.notasVistas).toEqual({ delante: "RECOGIDA: PUENTES HIJOS DE PEDRO LÓPEZ", detras: "RECOGIDA: GOMA" });
    const sinRecogida = lona({ recogeDelante: "NO", recogeAtras: "GANCHOS CORAZON" });
    expect(paginaHoja({ version: "10", tipo: "lona", input: sinRecogida, result: calcLona(sinRecogida, DEFAULT_PARAMS) }, 0, 1, DEFAULT_PARAMS).notasVistas)
      .toEqual({ delante: "RECOGIDA: NO", detras: "RECOGIDA: GANCHOS CORAZÓN" });
  });
  it("el baquetón no lleva recogidas", () => {
    const input: BaquetonInput = { ...emptyBaqueton(), largo: 181, ancho: 121, baqueton: 22, modoOllaos: "REPARTIDOS", material: "PVC" };
    expect(paginaHoja({ version: "10", tipo: "baqueton", input, result: calcBaqueton(input, DEFAULT_PARAMS) }, 0, 1, DEFAULT_PARAMS).notasVistas).toBeNull();
  });
  it("sin primer ollao en la entrada usa el de los parámetros", () => {
    const input = lona({ primerOllao: undefined });
    const pagina = paginaHoja({ version: "10", tipo: "lona", input, result: calcLona(input, DEFAULT_PARAMS) }, 0, 1, DEFAULT_PARAMS);
    expect(pagina.ollaos.titulo).toContain(`A ${DEFAULT_PARAMS.primerOllao.toLocaleString("es-ES")} CM DEL BORDE`);
  });
});
