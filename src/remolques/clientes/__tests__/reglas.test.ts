import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { PARAMS_GENERALES } from "../params-efectivos.ts";
import { fichaPorCodigo, fichasCambiadas, idFicha, normalizarNombre, sugerirFicha, validarFichas } from "../reglas.ts";
import { entradasDeCliente, fichasSemilla } from "../semilla.ts";
import type { FichaCliente, MedidaHabitual } from "../tipos.ts";

const generales = PARAMS_GENERALES.recogidas.map((r) => r.nombre);
const semilla = () => fichasSemilla(entradasDeCliente(DEFAULT_PARAMS));
const ficha = (cambios: Partial<FichaCliente> = {}): FichaCliente => ({
  id: "talleres-cal", nombre: "TALLERES CAL", codigosRps: ["009999"], ...cambios,
});
const validar = (fichas: unknown) => validarFichas(fichas, { recogidasGenerales: generales });

describe("normalizarNombre e idFicha", () => {
  it("sin acentos, signos ni mayúsculas", () => {
    expect(normalizarNombre(" Hijos de Pedro López, S.L. ")).toBe("HIJOS DE PEDRO LOPEZ S L");
  });

  it("el identificador sale del nombre y no se repite", () => {
    expect(idFicha("Hijos de Pedro López", new Set())).toBe("hijos-de-pedro-lopez");
    expect(idFicha("AYALA", new Set(["ayala", "ayala-2"]))).toBe("ayala-3");
    expect(idFicha("  ", new Set())).toBe("ficha");
  });
});

describe("fichaPorCodigo y sugerirFicha", () => {
  it("busca por el código de cliente de RPS", () => {
    const fichas = semilla();
    expect(fichaPorCodigo(fichas, " 001300 ")?.nombre).toBe("HIJOS DE PEDRO LOPEZ");
    expect(fichaPorCodigo(fichas, "048286")?.nombre).toBe("AYALA");
    expect(fichaPorCodigo(fichas, "000000")).toBeNull();
    expect(fichaPorCodigo(fichas, "")).toBeNull();
  });

  it("sugiere la ficha cuyo nombre está en el nombre o el alias de RPS, sin acentos ni mayúsculas", () => {
    const fichas = semilla();
    expect(sugerirFicha(fichas, { nombre: "ENGANCHES Y REMOLQUES AYALA S.L.U", alias: null })?.nombre).toBe("AYALA");
    expect(sugerirFicha(fichas, { nombre: "OTRO NOMBRE", alias: "Hijos de Pedro López" })?.nombre).toBe("HIJOS DE PEDRO LOPEZ");
    expect(sugerirFicha(fichas, { nombre: "TALLERES CAL", alias: null })).toBeNull();
  });

  it("si casan varias, la de nombre más largo", () => {
    const fichas = [ficha({ id: "wolder", nombre: "WOLDER" }), ficha({ id: "gw", nombre: "GENERAL WOLDER", codigosRps: [] })];
    expect(sugerirFicha(fichas, { nombre: "GENERAL WOLDER S.L.", alias: null })?.id).toBe("gw");
  });
});

describe("validarFichas", () => {
  it("las fichas de partida son válidas", () => {
    expect(validar(semilla())).toMatchObject({ ok: true });
  });

  it("limpia el nombre, los códigos y las observaciones vacías", () => {
    expect(validar([ficha({ nombre: " TALLERES CAL ", codigosRps: [" 009999 ", ""], observaciones: ["UNA", " ", "DOS "] })]))
      .toEqual({ ok: true, fichas: [ficha({ observaciones: ["UNA", "DOS"] })] });
  });

  it("un código solo puede estar en una ficha", () => {
    expect(validar([ficha(), ficha({ id: "otra", nombre: "OTRA" })]))
      .toEqual({ ok: false, errores: ["El código de RPS 009999 está en dos fichas: «TALLERES CAL» y «OTRA»"] });
  });

  it("el nombre: obligatorio, sin repetir y nunca GENERAL", () => {
    expect(validar([
      ficha({ nombre: " " }),
      ficha({ id: "b", nombre: "general", codigosRps: [] }),
      ficha({ id: "c", nombre: "Talleres Cal", codigosRps: ["1"] }),
      ficha({ id: "d", nombre: "TALLERES CAL", codigosRps: ["2"] }),
    ])).toEqual({ ok: false, errores: [
      "Ficha 1: falta el nombre",
      "Ficha «general»: «GENERAL» es el valor general del baquetón; usa otro nombre",
      "Ficha «TALLERES CAL»: el nombre está repetido",
    ] });
  });

  it("la recogida propia no se llama como una de Parámetros, y las habituales tienen que existir", () => {
    expect(validar([ficha({
      recogidaPropia: { nombre: "GOMA", delante: 1, atras: 1, lateralSoloAtras: 0, lateralSoloDelante: 0 },
      recogeDelante: "INVENTADA",
    })])).toEqual({ ok: false, errores: [
      "Ficha «TALLERES CAL»: la recogida propia «GOMA» se llama como una de Parámetros; usa otro nombre",
      "Ficha «TALLERES CAL»: la recogida de delante «INVENTADA» no existe",
    ] });
  });

  it("una recogida habitual puede ser la propia de la ficha", () => {
    const propia = { nombre: "PUENTES CAL", delante: 30, atras: 30, lateralSoloAtras: 5, lateralSoloDelante: 5, panoTraseroConAnchoDelante: true };
    expect(validar([ficha({ recogidaPropia: propia, recogeDelante: "PUENTES CAL", recogeAtras: "GOMA" })])).toMatchObject({ ok: true });
  });

  it("las medidas habituales: elemento, largo y ancho, posiciones y sin repetir", () => {
    const medida: MedidaHabitual = { tipo: "lona", largo: 200, ancho: 120, ollaos: { delante: [2.5, 60.5, 118.5], atras: [], laterales: [] } };
    expect(validar([ficha({ medidas: [medida, medida] })]))
      .toEqual({ ok: false, errores: ["Ficha «TALLERES CAL»: medida 2: la medida 200 × 120 está repetida"] });
    expect(validar([ficha({ medidas: [{ ...medida, ollaos: { delante: [], atras: [], laterales: [] } }] })]))
      .toEqual({ ok: false, errores: ["Ficha «TALLERES CAL»: medida 1: no tiene ningún ollao"] });
    expect(validar([ficha({ medidas: [{ ...medida, largo: 0 }] })]).ok).toBe(false);
    expect(validar([ficha({ medidas: [medida, { ...medida, tipo: "baqueton" }] })]).ok).toBe(true);
  });

  it("no es una lista: 400", () => {
    expect(validar({})).toEqual({ ok: false, errores: ["Las fichas tienen que ser una lista."] });
  });
});

describe("fichasCambiadas", () => {
  it("dice qué fichas se añaden, cambian o quitan", () => {
    const [hpl, ayala, wolder] = semilla();
    expect(fichasCambiadas([hpl, ayala, wolder], [{ ...hpl, sesgoDetras: 1.5 }, wolder, ficha()]))
      .toEqual(["HIJOS DE PEDRO LOPEZ", "TALLERES CAL", "AYALA"]);
    expect(fichasCambiadas([hpl], [{ ...hpl }])).toEqual([]);
  });
});
