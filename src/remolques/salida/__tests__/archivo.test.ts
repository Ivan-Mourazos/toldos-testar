import { afterEach, describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { link, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { archivarPdfRemolques, destinosPdfRemolques, MENSAJE_PDF_EXISTENTE, raizPlantilla } from "../archivo.ts";

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, rename: vi.fn(actual.rename), link: vi.fn(actual.link), writeFile: vi.fn(actual.writeFile) };
});

// Nada fuera de tmp/ del repositorio en las pruebas.
const TMP = path.join(process.cwd(), "tmp");
const temporales: string[] = [];
function preparar() {
  mkdirSync(TMP, { recursive: true });
  const raiz = mkdtempSync(path.join(TMP, "remolques-archivo-"));
  temporales.push(raiz);
  const planteamientos = path.join(raiz, "PLANTEAMIENTOS");
  const oficina = path.join(raiz, "OFICINA TECNICA");
  mkdirSync(planteamientos);
  mkdirSync(oficina);
  return {
    planteamientos,
    oficina,
    carpetas: {
      productionEnabled: true,
      remolquesPlanteamientosDirectory: planteamientos,
      remolquesOficinaTecnicaDirectory: path.join(oficina, "{YYYY}"),
    },
  };
}
afterEach(() => {
  vi.mocked(rename).mockReset();
  vi.mocked(link).mockReset();
  vi.mocked(writeFile).mockReset();
  for (const d of temporales.splice(0)) rmSync(d, { recursive: true, force: true });
});
const PDF = new Uint8Array([37, 80, 68, 70, 45, 49, 46, 55]);
const PEDIDO = { numeroPedido: "ar.26.03632", fecha: "2025-12-20" };

describe("dónde va el PDF", () => {
  it("la raíz de una plantilla es lo que hay antes del año", () => {
    expect(raizPlantilla(path.join("/mnt", "oficina", "{YYYY}"))).toBe(path.join("/mnt", "oficina"));
    expect(raizPlantilla(path.join("/mnt", "planteamientos"))).toBe(path.join("/mnt", "planteamientos"));
  });

  it("-10 en planteamientos y <año>/AR….pdf en oficina técnica, con el año del pedido", () => {
    const { planteamientos, oficina, carpetas } = preparar();
    expect(destinosPdfRemolques(PEDIDO.numeroPedido, PEDIDO.fecha, carpetas)).toEqual({
      nombre: "AR2603632-10.pdf",
      anio: 2026,
      destinos: [path.join(planteamientos, "AR2603632-10.pdf"), path.join(oficina, "2026", "AR2603632.pdf")],
      raices: [planteamientos, oficina],
    });
  });

  it("exige las dos carpetas, rutas absolutas y un número de pedido", () => {
    const { carpetas } = preparar();
    expect(() => destinosPdfRemolques("AR2603632", "", { ...carpetas, remolquesOficinaTecnicaDirectory: "" }))
      .toThrow("Faltan las carpetas de remolques en Configuración (planteamientos y oficina técnica). No se ha guardado el PDF.");
    expect(() => destinosPdfRemolques("AR2603632", "", { remolquesPlanteamientosDirectory: "relativa/a", remolquesOficinaTecnicaDirectory: "relativa/{YYYY}" }))
      .toThrow("Las carpetas de remolques deben ser rutas absolutas del servidor.");
    expect(() => destinosPdfRemolques("", "", carpetas)).toThrow("El número de pedido no es válido para archivar el PDF.");
  });
});

describe("archivo del PDF en dos carpetas", () => {
  it("con la escritura desactivada no toca nada", async () => {
    const { planteamientos, oficina, carpetas } = preparar();
    await expect(archivarPdfRemolques(PDF, PEDIDO, { ...carpetas, productionEnabled: false }))
      .rejects.toMatchObject({ statusCode: 403, codigo: "ESCRITURA_DESACTIVADA" });
    expect(readdirSync(planteamientos)).toEqual([]);
    expect(readdirSync(oficina)).toEqual([]);
  });

  it("solo archiva PDF", async () => {
    const { carpetas } = preparar();
    await expect(archivarPdfRemolques(new Uint8Array([60, 104, 116, 109]), PEDIDO, carpetas)).rejects.toMatchObject({ statusCode: 400, codigo: "NO_ES_PDF" });
  });

  it("guarda los mismos bytes en las dos y crea la carpeta del año", async () => {
    const { carpetas } = preparar();
    const hecho = await archivarPdfRemolques(PDF, PEDIDO, carpetas);
    expect(hecho.sustituido).toBe(false);
    for (const d of hecho.destinos) expect(readFileSync(d)).toEqual(Buffer.from(PDF));
  });

  it("no crea una raíz que falta (montaje caído) ni escribe en la otra", async () => {
    const { planteamientos, oficina, carpetas } = preparar();
    rmSync(oficina, { recursive: true });
    await expect(archivarPdfRemolques(PDF, PEDIDO, carpetas)).rejects.toMatchObject({ statusCode: 503, codigo: "CARPETA_NO_DISPONIBLE" });
    expect(existsSync(oficina)).toBe(false);
    expect(readdirSync(planteamientos)).toEqual([]);
  });

  it("si ya existe, 409 sin tocarlo; con «sustituir», sustituye las dos copias", async () => {
    const { carpetas } = preparar();
    const { destinos } = destinosPdfRemolques(PEDIDO.numeroPedido, PEDIDO.fecha, carpetas);
    writeFileSync(destinos[0], "anterior");
    await expect(archivarPdfRemolques(PDF, PEDIDO, carpetas)).rejects.toMatchObject({ statusCode: 409, codigo: "PDF_EXISTENTE", message: MENSAJE_PDF_EXISTENTE });
    expect(readFileSync(destinos[0], "utf8")).toBe("anterior");
    const hecho = await archivarPdfRemolques(PDF, PEDIDO, carpetas, { sustituir: true });
    expect(hecho.sustituido).toBe(true);
    for (const d of destinos) expect(readFileSync(d)).toEqual(Buffer.from(PDF));
  });

  it("si el destino aparece justo antes de publicar (EEXIST), 409 y no queda nada nuevo", async () => {
    const { planteamientos, oficina, carpetas } = preparar();
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    // La primera copia se enlaza bien; la segunda se la ha adelantado otro proceso.
    vi.mocked(link)
      .mockImplementationOnce(actual.link)
      .mockRejectedValueOnce(Object.assign(new Error("ya existe"), { code: "EEXIST" }));
    await expect(archivarPdfRemolques(PDF, PEDIDO, carpetas)).rejects.toMatchObject({ statusCode: 409, codigo: "PDF_EXISTENTE" });
    expect(readdirSync(planteamientos)).toEqual([]);
    expect(readdirSync(path.join(oficina, "2026"))).toEqual([]);
  });

  it("si el sistema de archivos no admite enlaces, copia y comprueba", async () => {
    const { carpetas } = preparar();
    vi.mocked(link).mockRejectedValue(Object.assign(new Error("no soportado"), { code: "EPERM" }));
    const hecho = await archivarPdfRemolques(PDF, PEDIDO, carpetas);
    expect(vi.mocked(link)).toHaveBeenCalledTimes(2);
    for (const d of hecho.destinos) expect(readFileSync(d)).toEqual(Buffer.from(PDF));
    expect(readdirSync(path.dirname(hecho.destinos[0]))).toEqual(["AR2603632-10.pdf"]);
  });

  it("si el temporal no tiene los bytes esperados, no publica nada", async () => {
    const { planteamientos, oficina, carpetas } = preparar();
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(writeFile).mockImplementationOnce((f, _d, o) => actual.writeFile(f, "truncado", o as never));
    await expect(archivarPdfRemolques(PDF, PEDIDO, carpetas)).rejects.toThrow("no coincide");
    expect(vi.mocked(link)).not.toHaveBeenCalled();
    expect(readdirSync(planteamientos)).toEqual([]);
    expect(readdirSync(path.join(oficina, "2026"))).toEqual([]);
  });

  it("un número de pedido hostil no sale de las carpetas de archivo", async () => {
    const { planteamientos, oficina, carpetas } = preparar();
    for (const numeroPedido of ["../x", "AR/..", "..\..\AR2603632", "AR26/../../03632"]) {
      const { destinos } = destinosPdfRemolques(numeroPedido, "", carpetas) as { destinos: string[] };
      expect(path.dirname(destinos[0])).toBe(planteamientos);
      expect(path.dirname(path.dirname(destinos[1]))).toBe(oficina);
    }
  });

  it("rechaza una plantilla de oficina técnica sin {YYYY}", async () => {
    const { oficina, carpetas } = preparar();
    await expect(archivarPdfRemolques(PDF, PEDIDO, { ...carpetas, remolquesOficinaTecnicaDirectory: oficina }))
      .rejects.toMatchObject({ statusCode: 400, codigo: "RUTA_NO_VALIDA" });
  });

  it("si falla la segunda copia, deja la primera como estaba", async () => {
    const { planteamientos, carpetas } = preparar();
    const { destinos } = await archivarPdfRemolques(PDF, PEDIDO, carpetas);
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    vi.mocked(rename)
      .mockImplementationOnce(actual.rename)
      .mockRejectedValueOnce(new Error("segunda carpeta sin red"));
    await expect(archivarPdfRemolques(new Uint8Array([37, 80, 68, 70, 1, 2]), PEDIDO, carpetas, { sustituir: true }))
      .rejects.toThrow("segunda carpeta sin red");
    for (const d of destinos) expect(readFileSync(d)).toEqual(Buffer.from(PDF));
    expect(readdirSync(planteamientos)).toEqual(["AR2603632-10.pdf"]);
  });
});
