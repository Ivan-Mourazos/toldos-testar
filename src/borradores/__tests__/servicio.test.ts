import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { emptyLona } from "../../remolques/entradas-vacias.ts";
import { crearAlmacenBorradores, type AlmacenBorradores } from "../almacen.ts";
import {
  MENSAJE_OCUPADO, MENSAJE_OTRO_NUMERO, MENSAJE_SIN_AUTOR, MENSAJE_YA_EN_PEDIDOS, mensajeOtroTipo,
  SIN_CARPETA_BORRADORES,
} from "../reglas.ts";
import { crearServicioBorradores, type DependenciasBorradores } from "../servicio.ts";

// Nada fuera de tmp/ del repositorio en las pruebas.
const TMP = path.join(process.cwd(), "tmp");
const temporales: string[] = [];
afterEach(() => {
  for (const dir of temporales.splice(0)) rmSync(dir, { recursive: true, force: true });
});
function carpetaNueva() {
  mkdirSync(TMP, { recursive: true });
  const dir = mkdtempSync(path.join(TMP, "borradores-servicio-"));
  temporales.push(dir);
  return dir;
}

function montar({ carpeta, ...deps }: Partial<DependenciasBorradores> & { carpeta?: string } = {}) {
  const dir = carpeta ?? carpetaNueva();
  let minuto = 0;
  return crearServicioBorradores({
    almacen: crearAlmacenBorradores({ carpeta: async () => dir, registrar: () => {} }),
    tecnicos: ["IVÁN", "JAIME"],
    esPedidoDeToldos: async () => false,
    esPedidoDeRemolques: async () => false,
    ahora: () => new Date(Date.UTC(2026, 9, 1, 9, minuto++)),
    ...deps,
  });
}

const cuerpoToldos = (numero: string, savedBy = "IVÁN", extra: Record<string, unknown> = {}) => ({
  kind: "toldos", savedBy, contenido: { order: { orderCode: numero, customer: "TOLDOS CAL", awnings: [{ model: "ARZUA PRO" }] } }, ...extra,
});
const lona = emptyLona();
const cuerpoRemolques = (numero: string, savedBy = "IVÁN") => ({
  kind: "remolques", savedBy,
  contenido: { numeroPedido: numero, cliente: "TALLERES CAL", fecha: "2026-10-01", lineas: [{ version: "10", tipo: "lona", input: { ...lona, cabecera: { ...lona.cabecera, numeroPedido: numero } } }] },
});

describe("servicio de borradores", () => {
  it("guarda y lista sin el contenido", async () => {
    const servicio = montar();
    const respuesta = await servicio.guardar("AR.26.04286", cuerpoToldos("AR.26.04286"));
    expect(respuesta.status).toBe(200);
    expect(respuesta.cuerpo).toMatchObject({ ok: true, sustituido: false, borrador: { orderCode: "AR2604286", kind: "toldos", savedBy: "IVÁN" } });
    expect(respuesta.cuerpo).not.toHaveProperty("borrador.contenido");
    const lista = await servicio.listar();
    expect(lista.configurado).toBe(true);
    expect(lista.borradores.map((b) => b.orderCode)).toEqual(["AR2604286"]);
    expect(lista.borradores[0]).not.toHaveProperty("contenido");
    expect((await servicio.obtener("ar2604286"))?.contenido).toMatchObject({ order: { orderCode: "AR.26.04286" } });
  });

  it("sin carpeta: no hay borradores y guardar dice que falta configurarla", async () => {
    const servicio = montar({ carpeta: "" });
    expect(await servicio.listar()).toEqual({ configurado: false, borradores: [] });
    await expect(servicio.guardar("AR2604286", cuerpoToldos("AR2604286"))).rejects.toMatchObject({ message: SIN_CARPETA_BORRADORES, statusCode: 400 });
  });

  it("pide «Soy» de la lista de técnicos y que el número sea el de la dirección", async () => {
    const servicio = montar();
    await expect(servicio.guardar("AR2604286", cuerpoToldos("AR2604286", ""))).rejects.toMatchObject({ message: MENSAJE_SIN_AUTOR, statusCode: 400 });
    await expect(servicio.guardar("AR2604286", cuerpoToldos("AR2604286", "PEPE"))).rejects.toMatchObject({ message: MENSAJE_SIN_AUTOR });
    await expect(servicio.guardar("AR2604286", cuerpoToldos("AR2604287"))).rejects.toMatchObject({ message: MENSAJE_OTRO_NUMERO, statusCode: 400 });
    await expect(servicio.guardar("AR2604286", cuerpoToldos(""))).rejects.toMatchObject({ statusCode: 400 });
  });

  it("el mismo autor lo sustituye sin preguntar; otro autor tiene que confirmarlo", async () => {
    const servicio = montar();
    await servicio.guardar("AR2604286", cuerpoToldos("AR2604286", "IVÁN"));
    const otraVez = await servicio.guardar("AR2604286", cuerpoToldos("AR2604286", "IVÁN"));
    expect(otraVez).toMatchObject({ status: 200, cuerpo: { sustituido: true } });
    const deJaime = await servicio.guardar("AR2604286", cuerpoToldos("AR2604286", "JAIME"));
    expect(deJaime).toEqual({ status: 409, cuerpo: { needsConfirmation: true, savedBy: "IVÁN", error: "Este borrador es de IVÁN." } });
    const confirmado = await servicio.guardar("AR2604286", cuerpoToldos("AR2604286", "JAIME", { confirmOverwrite: true }));
    expect(confirmado).toMatchObject({ status: 200, cuerpo: { sustituido: true, borrador: { savedBy: "JAIME", createdAt: "2026-10-01T09:00:00.000Z" } } });
  });

  it("un número que ya está en Pedidos, de toldos o de remolques, no admite borrador", async () => {
    const deToldos = montar({ esPedidoDeToldos: async (codigo) => codigo === "AR2604286" });
    await expect(deToldos.guardar("AR.26.04286", cuerpoRemolques("AR.26.04286"))).rejects.toMatchObject({ message: MENSAJE_YA_EN_PEDIDOS, statusCode: 409 });
    const deRemolques = montar({ esPedidoDeRemolques: async (codigo) => codigo === "AR2604286" });
    await expect(deRemolques.guardar("AR2604286", cuerpoToldos("AR2604286"))).rejects.toMatchObject({ message: MENSAJE_YA_EN_PEDIDOS, statusCode: 409 });
  });

  it("un número es de toldos o de remolques: no se cambia el tipo de un borrador", async () => {
    const servicio = montar();
    await servicio.guardar("AR.26.04286", cuerpoRemolques("AR.26.04286"));
    await expect(servicio.guardar("AR2604286", cuerpoToldos("AR2604286", "IVÁN", { confirmOverwrite: true })))
      .rejects.toMatchObject({ message: mensajeOtroTipo("AR2604286", "remolques"), statusCode: 409 });
  });

  it("dos guardados del mismo número no se cruzan", async () => {
    let soltar!: () => void;
    const espera = new Promise<void>((resolver) => { soltar = resolver; });
    const servicio = montar({ esPedidoDeToldos: async () => { await espera; return false; } });
    const primero = servicio.guardar("AR2604286", cuerpoToldos("AR2604286"));
    await new Promise((resolver) => setTimeout(resolver, 0));
    expect(await servicio.guardar("AR2604286", cuerpoToldos("AR2604286"))).toEqual({ status: 409, cuerpo: { error: MENSAJE_OCUPADO } });
    expect(await servicio.descartar("AR2604286")).toEqual({ status: 409, cuerpo: { error: MENSAJE_OCUPADO } });
    soltar();
    expect((await primero).status).toBe(200);
  });

  it("abrir uno que no está da null (no es un error); descartar dice si estaba", async () => {
    const servicio = montar();
    expect(await servicio.obtener("AR2604286")).toBeNull();
    await servicio.guardar("AR2604286", cuerpoToldos("AR2604286"));
    expect(await servicio.descartar("AR.26.04286")).toEqual({ status: 200, cuerpo: { ok: true, existia: true } });
    expect(await servicio.descartar("AR2604286")).toEqual({ status: 200, cuerpo: { ok: true, existia: false } });
  });

  it("al pasar a revisión se borra; si falla, se apunta y no se rompe nada", async () => {
    const servicio = montar();
    await servicio.guardar("AR2604286", cuerpoToldos("AR2604286"));
    await servicio.borrarTrasRevision("AR.26.04286");
    expect((await servicio.listar()).borradores).toEqual([]);
    await expect(servicio.borrarTrasRevision("")).resolves.toBeUndefined();

    const apuntes: string[] = [];
    const roto: AlmacenBorradores = {
      configurada: async () => true, obtener: async () => null, guardar: async () => "", listar: async () => [],
      borrar: async () => { throw new Error("EACCES"); },
    };
    const conFallo = crearServicioBorradores({
      almacen: roto, tecnicos: ["IVÁN"], esPedidoDeToldos: async () => false, esPedidoDeRemolques: async () => false,
      registrar: (mensaje) => apuntes.push(mensaje),
    });
    await expect(conFallo.borrarTrasRevision("AR2604286")).resolves.toBeUndefined();
    expect(apuntes).toEqual(["El pedido AR2604286 se ha guardado para revisión, pero no se pudo borrar su borrador: EACCES"]);
  });
});
