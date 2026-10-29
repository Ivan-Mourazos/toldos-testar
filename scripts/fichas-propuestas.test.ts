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
    const codigos = leer("codigos-rps.json") as { codigo: string; nombre: string; fuente: string }[];
    const propuestas = leer("fichas-propuestas.json") as FichaCliente[];
    expect(codigos.filter(c => c.fuente !== "GET RPS pedido PDF producido")).toHaveLength(276);
    for (const c of codigos) {
      expect(c.codigo, c.nombre).toMatch(/^\d{6}$/);
      expect(fichaPorCodigo(propuestas, c.codigo), c.nombre).not.toBeNull();
    }
  });

  it("el radio actual de CAL va en la esquina de su perfil arquillado", () => {
    const propuestas = leer("fichas-propuestas.json") as FichaCliente[];
    expect(fichaPorCodigo(propuestas, "016573")?.perfil).toEqual({ tipoPerfil: "TIPO 05", radioEsquina: 8 });
  });
});
