import { describe, expect, it } from "vitest";
import type { LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { emptyBaqueton, emptyLona } from "../../entradas-vacias.ts";
import { etiquetaOpcion } from "../../etiquetas.ts";
import { diferenciasConFicha, fichaConCambios, type ElementoFicha } from "../diferencias.ts";
import type { FichaCliente, MedidaHabitual } from "../tipos.ts";

const lona = (cambios: Partial<LonaInput> = {}): ElementoFicha => ({ tipo: "lona", input: { ...emptyLona(), largo: 200, ancho: 120, ...cambios } });
const OLLAOS = { delante: [2.5, 60.5, 118.5], atras: [2.5, 60.5, 118.5], laterales: [2.5, 100, 197.5] };
const conOllaos = (cambios: Partial<LonaInput> = {}) => lona({ modoOllaos: "SEGUN SE INDICA", ollaosManuales: OLLAOS, ...cambios });
const BASE: FichaCliente = { id: "talleres-cal", nombre: "TALLERES CAL", codigosRps: ["009999"] };

describe("diferenciasConFicha", () => {
  it("la medida con sus ollaos sale marcada y «nueva»; lo habitual, desmarcado con antes y después", () => {
    const d = diferenciasConFicha(conOllaos({ tipoPerfil: "TIPO 02", aguas: 20, recogeDelante: "GOMA", rotulacion: true }), BASE, DEFAULT_PARAMS);
    expect(d.map(({ clave, marcada }) => [clave, marcada])).toEqual([["medida", true], ["perfil", false], ["recogeDelante", false], ["rotulacion", false]]);
    expect(d[0]).toMatchObject({
      etiqueta: "Medida 200 × 120 de lona con sus ollaos", nota: "nueva", antes: "—",
      despues: "Delante 2,5 · 60,5 · 118,5 | Atrás 2,5 · 60,5 · 118,5 | Laterales 2,5 · 100 · 197,5",
    });
    expect(d[1]).toMatchObject({ etiqueta: "Perfil y sus medidas", antes: "—", despues: "Recto con aguas · aguas 20" });
    expect(d[2]).toMatchObject({ etiqueta: "Recogida delante", antes: "—", despues: etiquetaOpcion("GOMA") });
    expect(d[3]).toMatchObject({ etiqueta: "Rotulación", antes: "—", despues: "Sí" });
    expect(d[1]).not.toHaveProperty("nota");
  });

  it("la misma medida con otras posiciones «actualiza la de antes»; igual, no sale", () => {
    const vieja: MedidaHabitual = { tipo: "lona", largo: 200, ancho: 120, ollaos: { delante: [2.5, 118.5], atras: [], laterales: [] } };
    expect(diferenciasConFicha(conOllaos(), { ...BASE, medidas: [vieja] }, DEFAULT_PARAMS)[0])
      .toMatchObject({ clave: "medida", nota: "actualiza la de antes", antes: "Delante 2,5 · 118,5" });
    const igual: MedidaHabitual = { ancho: 120, largo: 200, tipo: "lona", ollaos: { laterales: OLLAOS.laterales, delante: OLLAOS.delante, atras: OLLAOS.atras } };
    expect(diferenciasConFicha(conOllaos(), { ...BASE, medidas: [igual] }, DEFAULT_PARAMS)).toEqual([]);
  });

  it("sin ollaos a medida no hay medida que guardar; sin ficha, todo es nuevo", () => {
    expect(diferenciasConFicha(lona({ modoOllaos: "REPARTIDOS" }), BASE, DEFAULT_PARAMS)).toEqual([]);
    expect(diferenciasConFicha(lona({ bastillaEnfundar: true }), null, DEFAULT_PARAMS))
      .toEqual([{ clave: "bastillaEnfundar", etiqueta: "Bastilla de enfundar", antes: "—", despues: "Sí", marcada: false }]);
  });

  it("el sesgo, la ventana y la cremallera del 9", () => {
    const d = diferenciasConFicha(lona({ anchoAtras: 121.5, ventana: true, ventanaAncho: 50, ventanaAlto: 35, observaciones: "CREMALLERA DEL 9" }), BASE, DEFAULT_PARAMS);
    expect(d.map((x) => [x.clave, x.despues])).toEqual([
      ["ventana", "Sí · 50 × 35"], ["sesgoDetras", "1,5 cm más ancho detrás"], ["cremallera", "Sí"],
    ]);
  });

  it("baquetón: los extras del cliente que usa, si no son los de la ficha", () => {
    const b: ElementoFicha = { tipo: "baqueton", input: { ...emptyBaqueton(), largo: 200, ancho: 120, clienteEspecifico: "AYALA" } };
    expect(diferenciasConFicha(b, BASE, DEFAULT_PARAMS)).toEqual([{
      clave: "extrasBaqueton", etiqueta: "Extras de baquetón", antes: "—",
      despues: "costura +1 / +1 · baquetón 0 / 0 · final +1 / +1 · trasero 0", marcada: false,
    }]);
    expect(diferenciasConFicha({ ...b, input: { ...b.input, clienteEspecifico: "GENERAL" } }, BASE, DEFAULT_PARAMS)).toEqual([]);
  });
});

describe("fichaConCambios", () => {
  it("guarda solo lo marcado; la medida sustituye a la del mismo largo × ancho, en su sitio", () => {
    const otra: MedidaHabitual = { tipo: "lona", largo: 300, ancho: 120, ollaos: { delante: [2.5], atras: [], laterales: [] } };
    const conMedidas: FichaCliente = { ...BASE, medidas: [{ tipo: "lona", largo: 200, ancho: 120, ollaos: { delante: [1], atras: [], laterales: [] } }, otra] };
    const elemento = conOllaos({ recogeDelante: "GOMA" });
    const nueva = fichaConCambios(conMedidas, elemento, ["medida"], DEFAULT_PARAMS);
    expect(nueva.medidas).toEqual([{ tipo: "lona", largo: 200, ancho: 120, ollaos: OLLAOS }, otra]);
    expect(nueva.recogeDelante).toBeUndefined();
    expect(fichaConCambios(BASE, elemento, ["recogeDelante"], DEFAULT_PARAMS)).toEqual({ ...BASE, recogeDelante: "GOMA" });
    expect(fichaConCambios(BASE, elemento, ["medida"], DEFAULT_PARAMS).medidas).toEqual([{ tipo: "lona", largo: 200, ancho: 120, ollaos: OLLAOS }]);
  });

  it("los extras de otro cliente pasan a la ficha", () => {
    const b: ElementoFicha = { tipo: "baqueton", input: { ...emptyBaqueton(), clienteEspecifico: "GENERAL WOLDER" } };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { nombre: _n, ...extras } = DEFAULT_PARAMS.clientesBaqueton.find((c) => c.nombre === "GENERAL WOLDER")!;
    expect(fichaConCambios(BASE, b, ["extrasBaqueton"], DEFAULT_PARAMS).extrasBaqueton).toEqual(extras);
  });
});
