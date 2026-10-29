import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { PARAMS_GENERALES } from "../src/remolques/clientes/params-efectivos.ts";
import { fichaPorCodigo, validarFichas } from "../src/remolques/clientes/reglas.ts";
import type { FichaCliente } from "../src/remolques/clientes/tipos.ts";

const leer = (nombre: string): unknown => JSON.parse(fs.readFileSync(new URL(`../docs/remolques/fichas-clientes/${nombre}`, import.meta.url), "utf8"));

describe("Propuesta de fichas de remolques del 29/10/2026", () => {
  it("la lista completa pasa la validación que usa el servidor", () => {
    const r = validarFichas(leer("fichas-propuestas.json"), { recogidasGenerales: PARAMS_GENERALES.recogidas.map(r => r.nombre) });
    expect(r).toMatchObject({ ok: true });
  });

  it("conserva las once fichas realmente leídas, con sus versiones, campos y medidas", () => {
    const base = leer("fichas-vigentes.json") as FichaCliente[];
    const propuestas = leer("fichas-propuestas.json") as FichaCliente[];
    expect(base).toHaveLength(11);
    for (const f of base) {
      const propuesta = propuestas.find(p => p.id === f.id);
      const { medidas, ...campos } = f;
      expect(propuesta, f.nombre).toMatchObject(campos);
      for (const m of medidas ?? []) expect(propuesta?.medidas, f.nombre).toContainEqual(m);
    }
  });

  it("todos los clientes del histórico y de los PDF resueltos tienen su ficha por código", () => {
    const codigos = leer("codigos-rps.json") as { codigo: string; nombre: string; fuente: string; ambito: string }[];
    const propuestas = leer("fichas-propuestas.json") as FichaCliente[];
    expect(codigos.filter(c => c.ambito === "historico")).toHaveLength(276);
    for (const c of codigos) {
      expect(c.codigo, c.nombre).toMatch(/^\d{6}$/);
      expect(fichaPorCodigo(propuestas, c.codigo), c.nombre).not.toBeNull();
    }
  });

  it("acredita ESVA y J&B por los pedidos citados en sus plantillas", () => {
    const propuestas = leer("fichas-propuestas.json") as FichaCliente[];
    expect(fichaPorCodigo(propuestas, "001021")).toMatchObject({ rotulacion: false });
    expect(fichaPorCodigo(propuestas, "000033")).toMatchObject({ rotulacion: false, recogeAtras: "CREMALLERA" });
    const fuentes = leer("asociaciones-plantillas.json") as { clientes: { codigo: string; pedidos: string[] }[] };
    expect(fuentes.clientes.find(c => c.codigo === "001021")?.pedidos).toContain("AR1506680");
    expect(fuentes.clientes.find(c => c.codigo === "000033")?.pedidos).toContain("AR1707015");
  });

  it("el radio actual de CAL va en la esquina de su perfil arquillado", () => {
    const propuestas = leer("fichas-propuestas.json") as FichaCliente[];
    expect(fichaPorCodigo(propuestas, "016573")?.perfil).toEqual({ tipoPerfil: "TIPO 05", radioEsquina: 8 });
  });

  it("propone las aguas habituales sin confundirlas con el aumento de NUÑEZ", () => {
    const propuestas = leer("fichas-propuestas.json") as FichaCliente[];
    expect(fichaPorCodigo(propuestas, "045288")?.perfil?.aguas).toBe(16);
    expect(fichaPorCodigo(propuestas, "042412")?.perfil?.aguas).toBe(15);
    expect(fichaPorCodigo(propuestas, "023649")?.perfil?.aguas).toBe(10);
    expect(fichaPorCodigo(propuestas, "001302")?.perfil?.aguas).toBeUndefined();
  });

  it("conserva los círculos de esquina de MALLON y deja pendiente la marca en el borde", () => {
    const propuestas = leer("fichas-propuestas.json") as FichaCliente[];
    const mallon = fichaPorCodigo(propuestas, "001795");
    const rl18 = mallon?.medidas?.find(m => m.tipo === "lona" && m.largo === 178 && m.ancho === 118);
    expect(rl18?.ollaos).toEqual({ delante: [4, 38, 81, 115], atras: [4, 38, 81, 115], laterales: [2, 13, 37, 73, 107, 145, 174] });
    const cad = leer("comprobaciones-cad.json") as { comprobaciones: { referencia: string; cargar?: boolean; ollaos: { laterales: number[] } }[] };
    const rl23 = cad.comprobaciones.find(c => c.referencia === "RL23");
    expect(rl23?.ollaos.laterales).toEqual([0, 13, 30, 58, 78, 105, 125, 152, 172, 199, 219]);
    expect(rl23?.cargar).toBe(false);
    expect(mallon?.medidas?.some(m => m.tipo === "lona" && m.largo === 229 && m.ancho === 139.5)).toBe(false);
    expect(mallon?.medidas?.some(m => m.tipo === "baqueton" && m.largo === 178 && m.ancho === 118)).toBe(false);
  });
});
