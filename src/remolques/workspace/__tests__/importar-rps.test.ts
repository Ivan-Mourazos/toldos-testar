import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { emptyLona } from "../../entradas-vacias.ts";
import type { LonaInput } from "../../calc/lona.ts";
import type { LineaPedidoRps, PedidoRps } from "../../rps/types.ts";
import type { LineaPedido } from "../lineas.ts";
import {
  avisosLineaRps, indiceElementoDeLineaRps, lineasDesdePedidoRps, lineasTrasImportar,
  planificarImportacionRps,
} from "../importar-rps.ts";

// Iván, 30/09/2026: «que en los remolques se inserten los datos como en los toldos: al darle a
// Obtener, no que aparezcan las líneas y des en una línea y después tengas que ir a la otra».
// Obtener el pedido crea un elemento por línea de RPS; si el pedido ya tiene elementos, se
// pregunta si sustituirlos o añadir solo las que faltan.

const lineaRps = (numero: number, cambios: Partial<LineaPedidoRps> = {}): LineaPedidoRps => ({
  idLinea: `L${numero}`, numeroLinea: numero, codigoArticulo: "LONAREMOLQUE",
  ordenFabricacion: `023000${numero}`, cantidad: 1, tipoTrabajo: "lona",
  largo: 250, ancho: 143, alto: 88, altoDelante: null, altoAtras: null,
  aguas: null, baqueton: null, ventana: false, rotulacion: true,
  recogidaDelante: false, recogidaAtras: false,
  materialRps: { gramaje: 580, color: "VERDE 6024", texto: "PVC 580 · color VERDE 6024" },
  materialSugerido: "LONA ALPHA 1L 580 g/m² :VERDE 6024 :250 AN (580)",
  tipoRotulacion: null, textoRotulacion: null,
  descripcion: "LONA REMOLQUE", detalle: `POR CONFECCION DE LONA REMOLQUE ${numero}`,
  requiereRevision: false,
  ...cambios,
});

const pedido = (lineas: LineaPedidoRps[]): PedidoRps => ({
  numero: "AR.26.04414", fecha: "2026-09-07", fechaSalida: "2026-09-11",
  cliente: { codigo: "049971", nombre: "SANTABALLA PALAS, S.L.", alias: "TALLERES SANTABALLA" },
  lineas,
});

const baqueton = (numero: number) => lineaRps(numero, {
  tipoTrabajo: "baqueton", largo: 260, ancho: 160, alto: null, baqueton: 12,
});

const opciones = { materiales: [], params: DEFAULT_PARAMS, realizadoPor: "IVÁN", importadoEn: "2026-09-30T10:00:00Z" };

const aMano = (version: string, cambios: Partial<LonaInput> = {}): LineaPedido => {
  const plantilla = emptyLona();
  return {
    version, tipo: "lona",
    input: { ...plantilla, cabecera: { ...plantilla.cabecera, version, numeroPedido: "AR2604414" }, ...cambios },
  };
};

describe("lineasDesdePedidoRps", () => {
  const cuatro = pedido([baqueton(1), lineaRps(2, { aguas: 8 }), lineaRps(3), baqueton(4)]);

  it("una línea del pedido por cada línea de RPS, en su orden, lona o baquetón según el artículo", () => {
    const lineas = lineasDesdePedidoRps(cuatro, opciones);
    expect(lineas.map((l) => [l.version, l.tipo])).toEqual([
      ["10", "baqueton"], ["11", "lona"], ["12", "lona"], ["13", "baqueton"],
    ]);
  });

  it("con lo que da RPS: OF, cantidad, medidas, material y cliente; y de qué línea salió", () => {
    const [primera, segunda] = lineasDesdePedidoRps(cuatro, opciones);
    expect(primera.input).toMatchObject({
      largo: 260, ancho: 160, baqueton: 12, cantidad: 1,
      material: "LONA ALPHA 1L 580 g/m² :VERDE 6024 :250 AN (580)",
      cabecera: { ordenFabricacion: "0230001", cliente: "TALLERES SANTABALLA", realizadoPor: "IVÁN", fecha: "2026-09-07" },
    });
    expect(segunda.input).toMatchObject({ largo: 250, ancho: 143, altoDelante: 88, aguas: 8 });
    expect(primera.origenRps).toMatchObject({
      numeroPedido: "AR.26.04414", numeroLinea: 1, idLinea: "L1", ordenFabricacion: "0230001",
      importadoEn: "2026-09-30T10:00:00Z", requiereRevision: false,
      cliente: cuatro.cliente,
    });
    expect(primera.snapshotSvg).toBeNull();
  });

  it("la línea que RPS marca para revisar también se crea, y lo lleva apuntado", () => {
    const [patron] = lineasDesdePedidoRps(pedido([lineaRps(1, {
      largo: null, ancho: null, alto: null, requiereRevision: true,
      detalle: "CONFECCIÓN SEGÚN PATRÓN",
    })]), opciones);
    expect(patron.input).toMatchObject({ largo: 0, ancho: 0 });
    expect(patron.origenRps?.requiereRevision).toBe(true);
    expect(patron.origenRps?.texto).toBe("CONFECCIÓN SEGÚN PATRÓN");
    expect(patron.origenRps?.avisos?.[0]).toMatch(/RPS no da las medidas/);
  });
});

describe("avisosLineaRps", () => {
  it("una línea clara, con bobina y rotulación, no avisa de nada", () => {
    expect(avisosLineaRps(lineaRps(1), true)).toEqual([]);
  });

  it("avisa de lo que hay que comprobar a mano", () => {
    const avisos = avisosLineaRps(lineaRps(1, {
      requiereRevision: true, rotulacion: null, recogidaAtras: true, textoRotulacion: "TALLERES X",
    }), false);
    expect(avisos).toEqual([
      "RPS no da las medidas completas: revísalas con el texto de la línea.",
      "RPS pide PVC 580 · color VERDE 6024: elige la bobina.",
      "RPS no indica si lleva rotulación.",
      "RPS menciona una recogida detrás: elige de qué tipo.",
      "Texto de rotulación en RPS: «TALLERES X».",
    ]);
  });
});

describe("planificarImportacionRps", () => {
  const tres = lineasDesdePedidoRps(pedido([lineaRps(1), lineaRps(2), lineaRps(3)]), opciones);

  it("un pedido vacío: todas faltan", () => {
    const plan = planificarImportacionRps([], tres);
    expect(plan.faltan.map((l) => l.origenRps?.idLinea)).toEqual(["L1", "L2", "L3"]);
    expect(plan.ajenas).toEqual([]);
    expect(plan.alDia).toBe(false);
  });

  it("volver a obtener lo mismo está al día: no hay nada que traer", () => {
    const otraVez = lineasDesdePedidoRps(pedido([lineaRps(1), lineaRps(2), lineaRps(3)]), {
      ...opciones, importadoEn: "2026-09-30T11:00:00Z",
    });
    const plan = planificarImportacionRps(tres, otraVez);
    expect(plan.faltan).toEqual([]);
    expect(plan.alDia).toBe(true);
  });

  it("un elemento retocado a mano ya no está al día, aunque no falte ninguna línea", () => {
    const retocado = tres.map((l, i) => (i === 1 ? { ...l, input: { ...l.input, largo: 251 } } : l));
    const plan = planificarImportacionRps(retocado, tres);
    expect(plan.faltan).toEqual([]);
    expect(plan.alDia).toBe(false);
  });

  it("casa por la línea de RPS y, si no, por la OF; lo tecleado sin OF no casa con nada", () => {
    const conOf = aMano("10", { cabecera: { ...aMano("10").input.cabecera, ordenFabricacion: " 0230002 " } });
    const sinOf = aMano("11");
    const plan = planificarImportacionRps([conOf, sinOf, tres[2]], tres);
    expect(plan.coincidencias.map((c) => c.existente?.version ?? null)).toEqual([null, "10", "12"]);
    expect(plan.faltan.map((l) => l.origenRps?.idLinea)).toEqual(["L1"]);
    expect(plan.ajenas.map((l) => l.version)).toEqual(["11"]);
  });

  it("una línea de otro pedido no casa aunque tenga el mismo id de línea", () => {
    const deOtro = { ...tres[0], origenRps: { ...tres[0].origenRps!, numeroPedido: "AR.26.00001" }, input: {
      ...tres[0].input, cabecera: { ...tres[0].input.cabecera, ordenFabricacion: "" },
    } };
    expect(planificarImportacionRps([deOtro], tres).coincidencias[0].existente).toBeNull();
  });
});

describe("lineasTrasImportar", () => {
  const tres = lineasDesdePedidoRps(pedido([lineaRps(1), lineaRps(2), lineaRps(3)]), opciones);

  it("sustituir deja exactamente las líneas de RPS, con el id guardado de la que casaba", () => {
    const guardada = { ...tres[1], id: "reg-2", input: { ...tres[1].input, largo: 999 } };
    const resultado = lineasTrasImportar([aMano("10"), guardada], tres, "sustituir");
    expect(resultado.lineas.map((l) => l.version)).toEqual(["10", "11", "12"]);
    expect(resultado.lineas[1]).toMatchObject({ id: "reg-2", input: { largo: 250 } });
    expect(resultado.lineas[0].origenRps?.idLinea).toBe("L1");
    expect(resultado.versionActiva).toBe("10");
  });

  it("añadir solo las que faltan no toca lo que había y numera detrás de lo último", () => {
    const tecleado = aMano("10", { largo: 300 });
    const yaEsta = { ...tres[2], version: "11", input: { ...tres[2].input, largo: 251, cabecera: { ...tres[2].input.cabecera, version: "11" } } };
    const resultado = lineasTrasImportar([tecleado, yaEsta], tres, "anadir");
    expect(resultado.lineas.map((l) => [l.version, l.origenRps?.idLinea ?? null])).toEqual([
      ["10", null], ["11", "L3"], ["12", "L1"], ["13", "L2"],
    ]);
    expect(resultado.lineas[0]).toBe(tecleado);
    expect(resultado.lineas[1]).toBe(yaEsta);
    expect(resultado.lineas[2].input.cabecera.version).toBe("12");
    expect(resultado.versionActiva).toBe("12");
  });

  it("añadir cuando no falta ninguna no cambia nada", () => {
    const resultado = lineasTrasImportar(tres, tres, "anadir");
    expect(resultado.lineas).toEqual(tres);
    expect(resultado.versionActiva).toBeNull();
  });

  it("obtener dos veces seguidas no duplica elementos", () => {
    const primera = lineasTrasImportar([], tres, "sustituir").lineas;
    expect(lineasTrasImportar(primera, tres, "anadir").lineas).toHaveLength(3);
    expect(lineasTrasImportar(primera, tres, "sustituir").lineas).toHaveLength(3);
  });
});

describe("indiceElementoDeLineaRps", () => {
  it("dice qué elemento del pedido contiene cada línea de RPS, o -1", () => {
    const tres = lineasDesdePedidoRps(pedido([lineaRps(1), lineaRps(2), lineaRps(3)]), opciones);
    const lineas = [tres[2], tres[0]];
    expect(indiceElementoDeLineaRps(lineas, "AR2604414", lineaRps(1))).toBe(1);
    expect(indiceElementoDeLineaRps(lineas, "AR2604414", lineaRps(2))).toBe(-1);
    expect(indiceElementoDeLineaRps(lineas, "AR2604414", lineaRps(3))).toBe(0);
  });
});
