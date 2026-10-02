import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { crearAlmacenPedidosRemolques } from "../almacen.ts";
import { completarClienteRps, informeCompletar } from "../completar-cliente-rps.ts";
import type { ClienteRpsPedido } from "../tipos.ts";
import { PEDIDOS_BUSQUEDA } from "./pedidos-busqueda.ts";

// Nada fuera de tmp/ del repositorio en las pruebas; RPS nunca: la consulta es una función de prueba.
const TMP = path.join(process.cwd(), "tmp");
const temporales: string[] = [];
afterEach(() => {
  for (const dir of temporales.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** AR2604286 y AR2605000 ya tienen cliente de RPS; se quita a los dos y se deja AR2501234 sin él. */
async function montar({ conCliente = false } = {}) {
  mkdirSync(TMP, { recursive: true });
  const carpeta = path.join(mkdtempSync(path.join(TMP, "remolques-completar-")), "interna");
  temporales.push(path.dirname(carpeta));
  const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => carpeta });
  for (const pedido of PEDIDOS_BUSQUEDA()) {
    if (!conCliente || pedido.orderCode !== "AR2605000") delete pedido.clienteRps;
    await almacen.guardar(pedido);
  }
  return { almacen, carpeta };
}

const EN_RPS: Record<string, ClienteRpsPedido> = {
  "AR.26.04286": { codigo: "000450", nombre: "TALLERES CAL, S.L." },
  "AR.26.05000": { codigo: "001300", nombre: "HIJOS DE PEDRO LOPEZ, S.L." },
};
const leerJson = (carpeta: string, orderCode: string) => JSON.parse(readFileSync(path.join(carpeta, `${orderCode}.json`), "utf8"));

describe("completar el código de cliente de RPS de los pedidos guardados", () => {
  it("simulando no escribe nada y dice qué haría", async () => {
    const { almacen, carpeta } = await montar();
    const antes = PEDIDOS_BUSQUEDA().map((p) => readFileSync(path.join(carpeta, `${p.orderCode}.json`), "utf8"));
    const buscarCliente = vi.fn(async (numero: string) => EN_RPS[numero] ?? null);
    const r = await completarClienteRps({ almacen, buscarCliente, simular: true });
    expect(r.completados.map((c) => `${c.orderCode} ${c.cliente.codigo}`)).toEqual(["AR2605000 001300", "AR2604286 000450"]);
    expect(r.noEncontrados.map((c) => c.orderCode)).toEqual(["AR2501234"]);
    expect(PEDIDOS_BUSQUEDA().map((p) => readFileSync(path.join(carpeta, `${p.orderCode}.json`), "utf8"))).toEqual(antes);
    expect(informeCompletar(r, { simular: true })).toEqual([
      "SIMULACIÓN: no se ha escrito nada.",
      "Pedidos sin código de cliente de RPS: 3.",
      "Se completarían 2:",
      "  AR.26.05000 → 001300 HIJOS DE PEDRO LOPEZ, S.L. (en el pedido: HIJOS DE PEDRO LÓPEZ, S.L.)",
      "  AR.26.04286 → 000450 TALLERES CAL, S.L. (en el pedido: TALLERES CAL)",
      "No están en RPS (se quedan sin código): 1:",
      "  AR.25.01234 (REMOLQUES AYALA)",
    ]);
  });

  it("de verdad pone solo el cliente de RPS, sin tocar nada más, y repetirlo no cambia nada", async () => {
    const { almacen, carpeta } = await montar();
    const antes = leerJson(carpeta, "AR2604286");
    const buscarCliente = vi.fn(async (numero: string) => EN_RPS[numero] ?? null);
    const r = await completarClienteRps({ almacen, buscarCliente, simular: false });
    expect(r.completados).toHaveLength(2);
    expect(leerJson(carpeta, "AR2604286")).toEqual({ ...antes, clienteRps: { codigo: "000450", nombre: "TALLERES CAL, S.L." } });
    expect("clienteRps" in leerJson(carpeta, "AR2501234")).toBe(false);

    buscarCliente.mockClear();
    const otra = await completarClienteRps({ almacen, buscarCliente, simular: false });
    expect(otra).toMatchObject({ completados: [], yaTenian: 2, fallos: [] });
    expect(buscarCliente).toHaveBeenCalledTimes(1);
    expect(informeCompletar(otra, { simular: false })).toEqual([
      "Pedidos sin código de cliente de RPS: 1.",
      "Completados: 0.",
      "No están en RPS (se quedan sin código): 1:",
      "  AR.25.01234 (REMOLQUES AYALA)",
    ]);
  });

  it("no pregunta por los que ya lo tienen y no pisa uno que lo ganó mientras tanto", async () => {
    const { almacen, carpeta } = await montar({ conCliente: true });
    const buscarCliente = vi.fn(async (numero: string) => {
      if (numero === "AR.26.04286") {
        // Mientras se pregunta a RPS, alguien vuelve a guardar el pedido con su cliente.
        const pedido = (await almacen.obtener("AR2604286"))!;
        await almacen.guardar({ ...pedido, clienteRps: { codigo: "999999", nombre: "GUARDADO EN LA WEB" } });
      }
      return EN_RPS[numero] ?? null;
    });
    const r = await completarClienteRps({ almacen, buscarCliente, simular: false });
    expect(buscarCliente.mock.calls.map(([numero]) => numero)).toEqual(["AR.26.04286", "AR.25.01234"]);
    expect(r).toMatchObject({ completados: [], yaTenian: 2 });
    expect(leerJson(carpeta, "AR2604286").clienteRps).toEqual({ codigo: "999999", nombre: "GUARDADO EN LA WEB" });
  });

  it("si RPS falla con un pedido lo cuenta y sigue con los demás", async () => {
    const { almacen, carpeta } = await montar();
    const buscarCliente = vi.fn(async (numero: string) => {
      if (numero === "AR.26.05000") throw new Error("tiempo de espera agotado");
      return EN_RPS[numero] ?? null;
    });
    const r = await completarClienteRps({ almacen, buscarCliente, simular: false });
    expect(r.fallos).toEqual([{ orderCode: "AR2605000", numeroPedido: "AR.26.05000", cliente: "HIJOS DE PEDRO LÓPEZ, S.L.", motivo: "tiempo de espera agotado" }]);
    expect(leerJson(carpeta, "AR2604286").clienteRps.codigo).toBe("000450");
    expect(informeCompletar(r, { simular: false })).toContain("No se pudo mirar en RPS: 1:");
    expect(informeCompletar(r, { simular: false })).toContain("  AR.26.05000: tiempo de espera agotado");
  });

  it("un cliente de RPS sin código no se guarda", async () => {
    const { almacen, carpeta } = await montar();
    const r = await completarClienteRps({ almacen, buscarCliente: async () => ({ codigo: "  ", nombre: "X" }), simular: false });
    expect(r.completados).toEqual([]);
    expect(r.noEncontrados).toHaveLength(3);
    expect("clienteRps" in leerJson(carpeta, "AR2604286")).toBe(false);
  });
});

describe("el comando scripts/completar-codigo-cliente-remolques.mjs", () => {
  const comando = (...args: string[]) => spawnSync(process.execPath, [path.join(process.cwd(), "scripts", "completar-codigo-cliente-remolques.mjs"), ...args], { encoding: "utf8" });

  it("una opción mal escrita sale con código 2 y dice cómo se usa", () => {
    const r = comando("--simulr");
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("Opción no válida: --simulr.");
    expect(r.stderr).toContain("Uso: node scripts/completar-codigo-cliente-remolques.mjs");
    expect(comando("--destino", " ").status).toBe(2);
  });

  it("si todos tienen código no abre RPS y no cambia nada", async () => {
    const { almacen, carpeta } = await montar();
    for (const pedido of await almacen.listar()) await almacen.guardar({ ...pedido, clienteRps: { codigo: "1", nombre: "" } });
    const antes = readFileSync(path.join(carpeta, "AR2604286.json"), "utf8");
    const r = comando("--simular", "--destino", carpeta);
    expect(r.stderr).toBe("");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("SIMULACIÓN: no se ha escrito nada.");
    expect(r.stdout).toContain("Pedidos sin código de cliente de RPS: 0.");
    expect(readFileSync(path.join(carpeta, "AR2604286.json"), "utf8")).toBe(antes);
  });
});
