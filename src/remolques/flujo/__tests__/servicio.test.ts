import { afterEach, describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import pdfLib from "pdf-lib";
import casos from "../../__fixtures__/produccion-2026-09.json";
import type { BaquetonInput } from "../../calc/baqueton.ts";
import type { LonaInput } from "../../calc/lona.ts";
import { DEFAULT_PARAMS, type CalcParams } from "../../calc/params.ts";
import type { DatosHojaPedido, ElementoPedidoHoja } from "../../hoja/tipos.ts";
import { COORDINA_UNAVAILABLE, PRODUCED_SAVE_ERROR } from "../../../reviewRules.js";
import { leerDatosPedido } from "../adjunto.ts";
import { crearAlmacenPedidosRemolques } from "../almacen.ts";
import { crearServicioPedidosRemolques, paramsDeLaPantalla, type EstadoCoordina } from "../servicio.ts";

// Nada fuera de tmp/ del repositorio en las pruebas.
const TMP = path.join(process.cwd(), "tmp");
const temporales: string[] = [];
afterEach(() => {
  for (const dir of temporales.splice(0)) rmSync(dir, { recursive: true, force: true });
});

type Caso = { caso: string; tipo: "lona" | "baqueton"; input: LonaInput | BaquetonInput };
const elemento = (id: string, version: string, of: string, numeroPedido = "AR.26.04286"): ElementoPedidoHoja => {
  const c = (casos as Caso[]).find((x) => x.caso === id)!;
  return {
    version, tipo: c.tipo,
    input: { ...c.input, cabecera: { ...c.input.cabecera, numeroPedido, version, cliente: "TALLERES CAL", fecha: "2026-09-01", ordenFabricacion: of } },
  };
};
const ELEMENTOS = () => [elemento("lona-02", "10", "231780"), elemento("baqueton-01", "11", "231781")];
const APROBADAS: EstadoCoordina = {
  disponible: true,
  ofs: { "0231780": { estado: "aprobada", revisor: "jaime" }, "0231781": { estado: "aprobada", revisor: "jaime" } },
};

function montar({ generacion = true, coordina = APROBADAS, toldos = [] as string[] } = {}) {
  mkdirSync(TMP, { recursive: true });
  const raiz = mkdtempSync(path.join(TMP, "remolques-servicio-"));
  temporales.push(raiz);
  const planteamientos = path.join(raiz, "PLANTEAMIENTOS");
  const oficina = path.join(raiz, "OFICINA TECNICA");
  mkdirSync(planteamientos);
  mkdirSync(oficina);
  const llamadas = { coordina: [] as Array<{ ofs: string[]; fresh?: boolean }>, pdf: [] as DatosHojaPedido[] };
  let estadoCoordina = coordina;
  let retenido: { entrar: () => void; espera: Promise<void> } | null = null;
  let retenidoToldos: { entrar: () => void; espera: Promise<void> } | null = null;
  const servicio = crearServicioPedidosRemolques({
    almacen: crearAlmacenPedidosRemolques({ carpeta: async () => path.join(raiz, "interna") }),
    ajustes: async () => ({
      productionEnabled: generacion,
      remolquesPlanteamientosDirectory: planteamientos,
      remolquesOficinaTecnicaDirectory: path.join(oficina, "{YYYY}"),
    }),
    parametros: async () => DEFAULT_PARAMS,
    coordina: {
      statusOf: async (ofs, opciones) => {
        llamadas.coordina.push({ ofs, fresh: opciones?.fresh });
        return estadoCoordina;
      },
    },
    tecnicos: ["JAIME", "IVÁN", "ÁNGEL"],
    hacerPdf: async (datos) => {
      llamadas.pdf.push(datos);
      if (retenido) {
        retenido.entrar();
        await retenido.espera;
      }
      const documento = await pdfLib.PDFDocument.create();
      datos.elementos.forEach(() => documento.addPage([842, 595]));
      return documento.save();
    },
    esPedidoDeToldos: async (codigo) => {
      if (retenidoToldos) {
        retenidoToldos.entrar();
        await retenidoToldos.espera;
      }
      return toldos.includes(codigo);
    },
    ahora: () => new Date("2026-10-01T08:00:00.000Z"),
  });
  return {
    servicio,
    llamadas,
    pdfPlan: path.join(planteamientos, "AR2604286-10.pdf"),
    pdfOficina: path.join(oficina, "2026", "AR2604286.pdf"),
    cambiarCoordina: (nuevo: EstadoCoordina) => { estadoCoordina = nuevo; },
    /** El próximo PDF se queda esperando hasta soltarlo; `dentro` se cumple al empezar a hacerlo. */
    retenerPdf: () => {
      let entrar!: () => void;
      let abrir!: () => void;
      const dentro = new Promise<void>((resolver) => { entrar = resolver; });
      retenido = { entrar, espera: new Promise<void>((resolver) => { abrir = resolver; }) };
      return { dentro, soltar: () => { retenido = null; abrir(); } };
    },
    /** El próximo «Guardar» se queda esperando a mitad (al mirar si es de toldos) hasta soltarlo. */
    retenerGuardar: () => {
      let entrar!: () => void;
      let abrir!: () => void;
      const dentro = new Promise<void>((resolver) => { entrar = resolver; });
      retenidoToldos = { entrar, espera: new Promise<void>((resolver) => { abrir = resolver; }) };
      return { dentro, soltar: () => { retenidoToldos = null; abrir(); } };
    },
  };
}

type Servicio = ReturnType<typeof montar>["servicio"];
const guardar = (servicio: Servicio, extra: Record<string, unknown> = {}) =>
  servicio.guardar({ elementos: ELEMENTOS(), params: DEFAULT_PARAMS, savedBy: "IVÁN", ...extra });

async function falla(promesa: Promise<unknown>) {
  try {
    await promesa;
  } catch (error) {
    return [(error as { statusCode?: number }).statusCode, (error as Error).message];
  }
  throw new Error("no ha fallado");
}

describe("guardar para revisión", () => {
  it("crea el pedido pendiente con quien guarda como autor y sale en Pedidos de su año", async () => {
    const { servicio } = montar();
    const r = await guardar(servicio);
    expect(r.status).toBe(200);
    expect(r.cuerpo).toMatchObject({
      ok: true, overwritten: false,
      review: { orderCode: "AR2604286", kind: "remolques", status: "PENDING_REVIEW", summary: { technician: "IVÁN", reviewer: "", ofs: ["0231780", "0231781"] } },
    });
    expect((await servicio.listar(2026)).reviews.map((p) => p.orderCode)).toEqual(["AR2604286"]);
    expect((await servicio.listar(2025)).reviews).toEqual([]);
    const pedido = await servicio.obtener("ar.26.04286");
    expect(pedido.elementos.map((e) => e.input.cabecera.realizadoPor)).toEqual(["IVÁN", "IVÁN"]);
  });

  it("si ya está, pide confirmar; quien lo vuelve a guardar queda de revisor y el autor no cambia", async () => {
    const { servicio } = montar();
    await guardar(servicio);
    expect(await guardar(servicio, { savedBy: "JAIME" })).toEqual({
      status: 409, cuerpo: { needsConfirmation: true, existing: ["AR2604286"], error: "Este pedido ya está guardado en Pedidos." },
    });
    const r = await guardar(servicio, { savedBy: "JAIME", confirmOverwrite: true });
    expect(r.cuerpo).toMatchObject({ overwritten: true, review: { summary: { technician: "IVÁN", reviewer: "JAIME" } } });
  });

  it("guarda con los parámetros que manda la pantalla y, si no manda, con los comunes", async () => {
    const { servicio } = montar();
    const propios: CalcParams = { ...DEFAULT_PARAMS, demasiaAlto: DEFAULT_PARAMS.demasiaAlto + 1 };
    await guardar(servicio, { params: propios });
    expect((await servicio.obtener("AR2604286")).params.demasiaAlto).toBe(propios.demasiaAlto);
    await servicio.guardar({ elementos: ELEMENTOS(), savedBy: "IVÁN", confirmOverwrite: true });
    expect((await servicio.obtener("AR2604286")).params).toEqual(DEFAULT_PARAMS);
    expect(paramsDeLaPantalla(propios)).toEqual(propios);
    expect(() => paramsDeLaPantalla({ ...DEFAULT_PARAMS, pasoOllaosDefecto: 0 }))
      .toThrow("Los parámetros de remolques del pedido no son válidos: «pasoOllaosDefecto» debe ser mayor que 0.");
  });

  it("no guarda un elemento incompleto, un número que es de toldos ni encima de uno generado", async () => {
    const { servicio } = montar({ toldos: ["AR2699999"] });
    const [lona] = ELEMENTOS();
    expect(await falla(servicio.guardar({ elementos: [{ ...lona, input: { ...lona.input, altoDelante: 0 } }], savedBy: "IVÁN" })))
      .toEqual([400, "Remolque 1: Introduce el alto delantero."]);
    expect(await falla(servicio.guardar({ elementos: [elemento("lona-02", "10", "1", "AR.26.99999")], savedBy: "IVÁN" })))
      .toEqual([409, "AR2699999 ya está guardado como pedido de toldos: un pedido es de toldos o de remolques. Revisa el número."]);
    await guardar(servicio);
    await servicio.generar("AR2604286", {});
    expect(await falla(guardar(servicio, { confirmOverwrite: true }))).toEqual([409, PRODUCED_SAVE_ERROR]);
  });
});

describe("generar archivos", () => {
  it("con todo aprobado hace el PDF con el revisor, lo deja en las dos carpetas con los datos dentro y pasa a PRODUCED", async () => {
    const { servicio, llamadas, pdfPlan, pdfOficina } = montar();
    await guardar(servicio);
    const r = await servicio.generar("AR2604286", {});
    expect(r.status).toBe(200);
    expect(r.cuerpo).toMatchObject({
      ok: true, nombre: "AR2604286-10.pdf",
      review: { status: "PRODUCED", reviewedBy: "JAIME" },
      saved: [
        { type: "pdf", filename: "AR2604286-10.pdf", savedPath: pdfPlan },
        { type: "pdf", filename: "AR2604286.pdf", savedPath: pdfOficina },
      ],
    });
    expect(llamadas.coordina).toEqual([{ ofs: ["0231780", "0231781"], fresh: true }]);
    expect(llamadas.pdf[0].revisadoPor).toBe("JAIME");
    expect(llamadas.pdf[0].elementos.map((e) => e.version)).toEqual(["10", "11"]);
    const plan = readFileSync(pdfPlan);
    expect(plan.equals(readFileSync(pdfOficina))).toBe(true);
    const dentro = await leerDatosPedido(plan);
    expect(dentro).toMatchObject({
      orderCode: "AR2604286", status: "PRODUCED", reviewedBy: "JAIME",
      production: { files: [{ savedPath: pdfPlan }, { savedPath: pdfOficina }] },
    });
    expect(dentro.elementos.map((e) => e.input.cabecera.revision)).toEqual(["JAIME", "JAIME"]);
    expect(await servicio.obtener("AR2604286")).toEqual(dentro);
    // Ya generado: no se vuelve a hacer.
    expect(await servicio.generar("AR2604286", {})).toMatchObject({ status: 200, cuerpo: { ok: true, unchanged: true } });
    expect(llamadas.pdf).toHaveLength(1);
  });

  it("no genera con la generación desactivada, sin aprobar o sin CoordinaOT", async () => {
    const apagado = montar({ generacion: false });
    await guardar(apagado.servicio);
    expect(await falla(apagado.servicio.generar("AR2604286", {})))
      .toEqual([403, "La generación de archivos está desactivada en Configuración: no se ha generado nada."]);
    const m = montar({ coordina: { disponible: true, ofs: { "0231780": { estado: "devuelta", nota: "cota" }, "0231781": { estado: "aprobada", revisor: "jaime" } } } });
    await guardar(m.servicio);
    expect(await falla(m.servicio.generar("AR2604286", {}))).toEqual([409, "Sin aprobar en CoordinaOT: A (0231780) devuelta."]);
    m.cambiarCoordina({ disponible: false, motivo: "CoordinaOT no responde." });
    expect(await falla(m.servicio.generar("AR2604286", {}))).toEqual([503, COORDINA_UNAVAILABLE]);
    expect(m.llamadas.pdf).toHaveLength(0);
    expect(existsSync(m.pdfPlan)).toBe(false);
  });

  it("sin OF en un elemento lo dice como elemento", async () => {
    const { servicio } = montar();
    await servicio.guardar({ elementos: [elemento("lona-02", "10", "231780"), elemento("baqueton-01", "11", "")], savedBy: "IVÁN" });
    expect(await falla(servicio.generar("AR2604286", {}))).toEqual([409, "Falta la OF en el elemento B."]);
  });

  it("si un PDF ya está en las carpetas, pregunta antes de hacer nada y sustituye solo confirmando", async () => {
    const { servicio, pdfPlan, pdfOficina, llamadas } = montar();
    await guardar(servicio);
    mkdirSync(path.dirname(pdfOficina), { recursive: true });
    writeFileSync(pdfOficina, "%PDF-viejo");
    expect(await servicio.generar("AR2604286", {})).toEqual({ status: 409, cuerpo: { needsConfirmation: true, existing: ["AR2604286.pdf"] } });
    expect(llamadas.pdf).toHaveLength(0);
    expect((await servicio.generar("AR2604286", { confirmOverwrite: true })).status).toBe(200);
    expect(readFileSync(pdfOficina).equals(readFileSync(pdfPlan))).toBe(true);
  });

  it("no genera dos veces a la vez el mismo pedido", async () => {
    const m = montar();
    await guardar(m.servicio);
    const { dentro, soltar } = m.retenerPdf();
    const primero = m.servicio.generar("AR2604286", {});
    await dentro;
    expect(await m.servicio.generar("AR2604286", {})).toEqual({ status: 409, cuerpo: { error: "Ya se están generando los archivos de este pedido." } });
    soltar();
    expect((await primero).status).toBe(200);
  });

  it("no guarda encima de un pedido mientras se generan sus archivos", async () => {
    const m = montar();
    await guardar(m.servicio);
    const { dentro, soltar } = m.retenerPdf();
    const primero = m.servicio.generar("AR2604286", {});
    await dentro;
    expect(await guardar(m.servicio, { savedBy: "JAIME", confirmOverwrite: true })).toEqual({
      status: 409, cuerpo: { error: "Se están generando los archivos de este pedido: espera a que terminen antes de volver a guardarlo." },
    });
    soltar();
    expect((await primero).status).toBe(200);
    // Lo generado no se ha pisado: sigue PRODUCED y el autor no ha cambiado.
    expect(await m.servicio.obtener("AR2604286")).toMatchObject({ status: "PRODUCED", summary: { technician: "IVÁN" } });
  });

  it("no genera mientras se está guardando el mismo pedido, ni guarda dos veces a la vez", async () => {
    const m = montar();
    await guardar(m.servicio);
    const { dentro, soltar } = m.retenerGuardar();
    const guardando = guardar(m.servicio, { savedBy: "JAIME", confirmOverwrite: true });
    await dentro;
    expect(await m.servicio.generar("AR2604286", {})).toEqual({
      status: 409, cuerpo: { error: "Se está guardando este pedido: vuelve a intentarlo en un momento." },
    });
    expect(await guardar(m.servicio, { confirmOverwrite: true })).toEqual({
      status: 409, cuerpo: { error: "Se está guardando este pedido: vuelve a intentarlo en un momento." },
    });
    expect(m.llamadas.pdf).toHaveLength(0);
    soltar();
    expect((await guardando).status).toBe(200);
    // Terminado el guardado, ya se puede generar.
    expect((await m.servicio.generar("AR2604286", {})).status).toBe(200);
  });
});

describe("ver la hoja guardada y el PDF generado", () => {
  it("la vista previa usa los parámetros guardados, sin revisor, y no escribe nada", async () => {
    const { servicio, llamadas, pdfPlan } = montar();
    const propios: CalcParams = { ...DEFAULT_PARAMS, demasiaAlto: DEFAULT_PARAMS.demasiaAlto + 1 };
    await guardar(servicio, { params: propios });
    const { pdf, nombre } = await servicio.vistaPrevia("AR2604286");
    expect(nombre).toBe("AR2604286-10.pdf");
    expect(Buffer.from(pdf).subarray(0, 4).toString("ascii")).toBe("%PDF");
    expect(llamadas.pdf[0].params.demasiaAlto).toBe(propios.demasiaAlto);
    expect(llamadas.pdf[0].revisadoPor).toBe("");
    expect(existsSync(pdfPlan)).toBe(false);
    expect(await falla(servicio.obtener("AR2600000"))).toEqual([404, "No se encontró el pedido de remolques."]);
  });

  it("el generado se abre de planteamientos o, si RPS ya se lo llevó, de oficina técnica", async () => {
    const { servicio, pdfPlan, pdfOficina } = montar();
    await guardar(servicio);
    expect(await falla(servicio.archivo("AR2604286"))).toEqual([404, "Este pedido todavía no tiene archivos generados."]);
    await servicio.generar("AR2604286", {});
    expect((await servicio.archivo("AR2604286")).nombre).toBe("AR2604286-10.pdf");
    rmSync(pdfPlan);
    expect((await servicio.archivo("AR2604286")).nombre).toBe("AR2604286.pdf");
    rmSync(pdfOficina);
    expect(await falla(servicio.archivo("AR2604286"))).toEqual([404, "El PDF generado ya no está en sus carpetas de archivo."]);
  });
});
