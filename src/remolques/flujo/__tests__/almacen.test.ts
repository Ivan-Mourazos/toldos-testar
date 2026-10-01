import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { crearAlmacenPedidosRemolques, ficheroPedido, SIN_CARPETA_INTERNA } from "../almacen.ts";
import type { PedidoRemolques } from "../tipos.ts";

// Nada fuera de tmp/ del repositorio en las pruebas.
const TMP = path.join(process.cwd(), "tmp");
const temporales: string[] = [];
function carpetaNueva() {
  mkdirSync(TMP, { recursive: true });
  const dir = mkdtempSync(path.join(TMP, "remolques-almacen-"));
  temporales.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of temporales.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const pedido = (orderCode: string, updatedAt: string, extra: Partial<PedidoRemolques> = {}): PedidoRemolques => ({
  schemaVersion: 1, kind: "remolques", orderCode, numeroPedido: orderCode, status: "PENDING_REVIEW",
  createdAt: updatedAt, updatedAt, createdBy: "IVÁN", reviewedAt: null, reviewedBy: "", reviewNote: "", production: null,
  summary: { customer: "", orderDate: "2026-09-01", technician: "IVÁN", reviewer: "", awnings: 0, ofs: [], models: [], diagnostics: 0 },
  params: DEFAULT_PARAMS, elementos: [], ...extra,
});

describe("almacén de pedidos de remolques", () => {
  it("guarda un JSON por pedido con el número normalizado y lo vuelve a leer", async () => {
    const dir = carpetaNueva();
    const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => dir });
    expect(await almacen.guardar(pedido("AR2604286", "2026-10-01T08:00:00.000Z"))).toBe(path.join(dir, "AR2604286.json"));
    expect(await almacen.obtener("ar.26.04286")).toMatchObject({ orderCode: "AR2604286" });
    expect(await almacen.obtener("AR2699999")).toBeNull();
    expect(readdirSync(dir)).toEqual(["AR2604286.json"]);
  });

  it("guardar sustituye; crear nunca pisa lo que ya está", async () => {
    const dir = carpetaNueva();
    const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => dir });
    expect(await almacen.crear(pedido("AR2604286", "2026-10-01T08:00:00.000Z"))).toBe("creado");
    expect(await almacen.crear(pedido("AR2604286", "2026-10-02T08:00:00.000Z", { createdBy: "OTRO" }))).toBe("ya-existe");
    expect((await almacen.obtener("AR2604286"))?.createdBy).toBe("IVÁN");
    await almacen.guardar(pedido("AR2604286", "2026-10-03T08:00:00.000Z", { createdBy: "JAIME" }));
    expect((await almacen.obtener("AR2604286"))?.createdBy).toBe("JAIME");
    expect(readdirSync(dir)).toEqual(["AR2604286.json"]);
  });

  it("lista del más reciente al más antiguo y salta lo que no es un pedido", async () => {
    const dir = carpetaNueva();
    const avisos: string[] = [];
    const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => dir, registrar: (mensaje) => avisos.push(mensaje) });
    await almacen.guardar(pedido("AR2600001", "2026-09-01T08:00:00.000Z"));
    await almacen.guardar(pedido("AR2600002", "2026-09-05T08:00:00.000Z"));
    writeFileSync(path.join(dir, "roto.json"), "{no es json");
    writeFileSync(path.join(dir, "otro.json"), JSON.stringify({ kind: "toldos-testar-review" }));
    writeFileSync(path.join(dir, "nota.txt"), "x");
    expect((await almacen.listar()).map((p) => p.orderCode)).toEqual(["AR2600002", "AR2600001"]);
    expect(avisos).toHaveLength(2);
  });

  it("sin carpeta puesta no hay pedidos, y guardar lo dice", async () => {
    const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => "" });
    expect(await almacen.listar()).toEqual([]);
    expect(await almacen.obtener("AR2604286")).toBeNull();
    await expect(almacen.guardar(pedido("AR2604286", "2026-10-01T08:00:00.000Z"))).rejects.toThrow(SIN_CARPETA_INTERNA);
  });

  it("crea la carpeta interna si aún no existe", async () => {
    const dir = path.join(carpetaNueva(), "remolques", "pedidos");
    const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => dir });
    await almacen.guardar(pedido("AR2604286", "2026-10-01T08:00:00.000Z"));
    expect(readdirSync(dir)).toEqual(["AR2604286.json"]);
  });

  it("el nombre del fichero no deja salir de la carpeta", () => {
    expect(ficheroPedido(path.join("/x"), "../../etc/passwd")).toBe(path.join("/x", "ETCPASSWD.json"));
  });
});
