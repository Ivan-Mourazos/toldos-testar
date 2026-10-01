import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { crearAlmacenBorradores, ficheroBorrador } from "../almacen.ts";
import { crearBorrador, leerContenido, SIN_CARPETA_BORRADORES } from "../reglas.ts";

// Nada fuera de tmp/ del repositorio en las pruebas.
const TMP = path.join(process.cwd(), "tmp");
const temporales: string[] = [];
function carpetaNueva() {
  mkdirSync(TMP, { recursive: true });
  const dir = mkdtempSync(path.join(TMP, "borradores-almacen-"));
  temporales.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of temporales.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const borrador = (numero: string, ahora: string, savedBy = "IVÁN") =>
  crearBorrador({ leido: leerContenido("toldos", { order: { orderCode: numero, awnings: [] } }), savedBy, existente: null, ahora });

describe("almacén de borradores", () => {
  it("guarda un JSON por número normalizado, sin dejar temporales, y lo vuelve a leer", async () => {
    const dir = carpetaNueva();
    const almacen = crearAlmacenBorradores({ carpeta: async () => dir });
    expect(await almacen.configurada()).toBe(true);
    expect(await almacen.guardar(borrador("AR.26.04286", "2026-10-01T08:00:00.000Z"))).toBe(path.join(dir, "AR2604286.json"));
    expect(readdirSync(dir)).toEqual(["AR2604286.json"]);
    expect(await almacen.obtener("ar2604286")).toMatchObject({ orderCode: "AR2604286", savedBy: "IVÁN" });
    expect(await almacen.obtener("AR2699999")).toBeNull();
    expect(ficheroBorrador(dir, "AR.26.04286")).toBe(path.join(dir, "AR2604286.json"));
  });

  it("guardar sustituye; listar va del más reciente al más antiguo y salta los ficheros rotos", async () => {
    const dir = carpetaNueva();
    const avisos: string[] = [];
    const almacen = crearAlmacenBorradores({ carpeta: async () => dir, registrar: (m) => avisos.push(m) });
    await almacen.guardar(borrador("AR2604286", "2026-10-01T08:00:00.000Z"));
    await almacen.guardar(borrador("AR2604287", "2026-10-01T09:00:00.000Z"));
    await almacen.guardar(borrador("AR2604286", "2026-10-01T10:00:00.000Z", "JAIME"));
    writeFileSync(path.join(dir, "ROTO.json"), "{no es json");
    writeFileSync(path.join(dir, "OTRO.json"), JSON.stringify({ hola: 1 }));
    writeFileSync(path.join(dir, "notas.txt"), "no es un borrador");
    const lista = await almacen.listar();
    expect(lista.map((b) => [b.orderCode, b.savedBy])).toEqual([["AR2604286", "JAIME"], ["AR2604287", "IVÁN"]]);
    expect(avisos).toHaveLength(2);
    expect(avisos[0]).toContain("No se pudo leer el borrador");
  });

  it("borrar dice si estaba", async () => {
    const dir = carpetaNueva();
    const almacen = crearAlmacenBorradores({ carpeta: async () => dir });
    await almacen.guardar(borrador("AR2604286", "2026-10-01T08:00:00.000Z"));
    expect(await almacen.borrar("AR.26.04286")).toBe(true);
    expect(await almacen.borrar("AR2604286")).toBe(false);
    expect(await almacen.obtener("AR2604286")).toBeNull();
  });

  it("sin carpeta: no hay borradores y guardar dice que falta", async () => {
    const almacen = crearAlmacenBorradores({ carpeta: async () => "  " });
    expect(await almacen.configurada()).toBe(false);
    expect(await almacen.listar()).toEqual([]);
    expect(await almacen.obtener("AR2604286")).toBeNull();
    expect(await almacen.borrar("AR2604286")).toBe(false);
    await expect(almacen.guardar(borrador("AR2604286", "2026-10-01T08:00:00.000Z"))).rejects.toMatchObject({ message: SIN_CARPETA_BORRADORES, statusCode: 400 });
  });

  it("una carpeta que aún no existe se crea al guardar", async () => {
    const dir = path.join(carpetaNueva(), "nueva");
    const almacen = crearAlmacenBorradores({ carpeta: async () => dir });
    expect(await almacen.listar()).toEqual([]);
    await almacen.guardar(borrador("AR2604286", "2026-10-01T08:00:00.000Z"));
    expect(readdirSync(dir)).toEqual(["AR2604286.json"]);
  });
});
