import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DEFAULT_PARAMS } from "../../calc/params.ts";
import { crearAlmacenPedidosRemolques } from "../almacen.ts";
import { ErrorPedidoRemolques } from "../pedido.ts";
import { crearServicioPedidosRemolques } from "../servicio.ts";
import { PEDIDOS_BUSQUEDA } from "./pedidos-busqueda.ts";

// Nada fuera de tmp/ del repositorio en las pruebas.
const TMP = path.join(process.cwd(), "tmp");
const temporales: string[] = [];
afterEach(() => {
  for (const dir of temporales.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function carpetaDePrueba() {
  mkdirSync(TMP, { recursive: true });
  const raiz = mkdtempSync(path.join(TMP, "remolques-buscar-"));
  temporales.push(raiz);
  return path.join(raiz, "interna");
}

function montar(carpeta: string) {
  const registrar = vi.fn();
  const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => carpeta, registrar });
  const servicio = crearServicioPedidosRemolques({
    almacen,
    ajustes: async () => { throw new Error("El buscador no mira las carpetas compartidas."); },
    parametros: async () => DEFAULT_PARAMS,
    coordina: { statusOf: async () => ({ disponible: false }) },
    tecnicos: ["IVÁN"],
    hacerPdf: async () => new Uint8Array(),
    esPedidoDeToldos: async () => false,
  });
  return { almacen, servicio, registrar };
}

describe("buscar en los pedidos de remolques guardados", () => {
  it("busca en todos los pedidos de la carpeta interna, de todos los años, y se salta lo que no es un pedido", async () => {
    const carpeta = carpetaDePrueba();
    const { almacen, servicio, registrar } = montar(carpeta);
    for (const pedido of PEDIDOS_BUSQUEDA()) await almacen.guardar(pedido);
    writeFileSync(path.join(carpeta, "ROTO.json"), "{ roto");

    const todos = await servicio.buscar({});
    expect(todos).toMatchObject({ total: 4, pedidos: 3, cortado: false });
    expect(todos.filas.map((f) => `${f.orderCode}-${f.letra}`)).toEqual(["AR2605000-A", "AR2604286-A", "AR2604286-B", "AR2501234-A"]);
    expect(registrar).toHaveBeenCalledTimes(1);

    const cremallera = await servicio.buscar({ recogida: { nombre: "CREMALLERA", lado: "cualquiera" }, estado: "pendientes" });
    expect(cremallera.filas.map((f) => `${f.orderCode}-${f.letra}`)).toEqual(["AR2501234-A"]);
  });

  it("sin carpeta interna no hay nada que buscar", async () => {
    const { servicio } = montar("");
    expect(await servicio.buscar({})).toEqual({ filas: [], total: 0, pedidos: 0, cortado: false, limite: 500 });
  });

  it("unos filtros mal hechos son un 400 que dice cuál", async () => {
    const { servicio } = montar(carpetaDePrueba());
    const error = await servicio.buscar({ medidas: { largo: { valor: "x" } } }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorPedidoRemolques);
    expect((error as ErrorPedidoRemolques).statusCode).toBe(400);
    expect((error as Error).message).toContain("largo");
  });
});
