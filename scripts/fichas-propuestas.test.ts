import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { PARAMS_GENERALES, paramsConFichas } from "../src/remolques/clientes/params-efectivos.ts";
import { calcBaqueton } from "../src/remolques/calc/baqueton.ts";
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

  it("conserva el índice de identidades y solo propone fichas con respaldo suficiente", () => {
    const codigos = leer("codigos-rps.json") as { codigo: string; nombre: string; fuente: string; ambito: string }[];
    const propuestas = leer("fichas-propuestas.json") as FichaCliente[];
    expect(codigos.filter(c => c.ambito === "historico")).toHaveLength(276);
    for (const c of codigos) {
      expect(c.codigo, c.nombre).toMatch(/^\d{6}$/);
    }
    const base = leer("fichas-vigentes.json") as FichaCliente[];
    for (const ficha of propuestas) {
      expect(codigos.some(c => ficha.codigosRps.includes(c.codigo)) || base.some(b => b.id === ficha.id), ficha.nombre).toBe(true);
      if (!base.some(b => b.id === ficha.id)) expect(Boolean(ficha.medidas?.length) || ficha.ollaosRepartidos === true, ficha.nombre).toBe(true);
      for (const medida of ficha.medidas ?? []) for (const lado of ["delante", "atras", "laterales"] as const) expect(medida.ollaos[lado].length, `${ficha.nombre}/${lado}`).toBeGreaterThan(0);
    }
  });

  it("deja fuera del registro las plantillas antiguas ajenas al histórico", () => {
    const propuestas = leer("fichas-propuestas.json") as FichaCliente[];
    expect(fichaPorCodigo(propuestas, "001021")).toBeNull();
    expect(fichaPorCodigo(propuestas, "000033")).toBeNull();
    for (const codigo of ["012902", "000472", "050254"]) expect(fichaPorCodigo(propuestas, codigo)).toBeNull();
    const fuentes = leer("asociaciones-plantillas.json") as { clientes: { codigo: string; pedidos: string[] }[] };
    expect(fuentes.clientes.find(c => c.codigo === "001021")?.pedidos).toContain("AR1506680");
    expect(fuentes.clientes.find(c => c.codigo === "000033")?.pedidos).toContain("AR1707015");
  });

  it("aplica las confirmaciones de CAMACHO y de la cuenta de CANO acreditada en AR2604501", () => {
    const propuestas = leer("fichas-propuestas.json") as FichaCliente[];
    expect(fichaPorCodigo(propuestas, "031580")).toMatchObject({ recogeAtras: "GOMA" });
    expect(fichaPorCodigo(propuestas, "031580")?.perfil?.aguas).toBeUndefined();
    expect(fichaPorCodigo(propuestas, "030179")).toMatchObject({ recogeAtras: "CREMALLERA", cremallera: true });
    expect(fichaPorCodigo(propuestas, "030179")?.extrasBaqueton).toBeUndefined();
    expect(fichaPorCodigo(propuestas, "045288")?.extrasBaqueton).toBeUndefined();
    expect(fichaPorCodigo(propuestas, "045288")?.cremallera).toBeUndefined();
    expect(fichaPorCodigo(propuestas, "045288")?.observaciones ?? []).not.toContain("LOS 16 CM DE AGUAS VAN INCLUIDOS EN LA ALTURA");
  });

  it("reproduce el baquetón de NORTE AR2603988 sin sumar dos veces la holgura", () => {
    const propuestas = leer("fichas-propuestas.json") as FichaCliente[];
    const norte = fichaPorCodigo(propuestas, "023649")!;
    const result = calcBaqueton({
      cabecera: { numeroPedido: "AR2603988", version: "01", cliente: norte.nombre, revision: "JAIME", realizadoPor: "ADRIAN", fecha: "2026-08-12", fechaSalida: "" },
      cantidad: 1, largo: 250, ancho: 150, baqueton: 15, clienteEspecifico: norte.nombre,
      modoOllaos: "REPARTIDOS", pasoOllaos: 35, ollaosManuales: { delante: [], atras: [], laterales: [] },
      rotulacion: false, material: "", observaciones: "",
    }, paramsConFichas(PARAMS_GENERALES, [norte]));
    expect(result.remolqueHecho).toEqual({ largo: 252, ancho: 152 });
    expect(result.panoUnico).toEqual({ largo: 288, ancho: 188 });
    expect(result.esquinaDelante).toBe(17);
    expect(result.esquinaDetras).toBe(17);
  });

  it("documenta el origen hecho y la justificación de los márgenes superiores a 12 cm", () => {
    const propuestas = leer("fichas-propuestas.json") as FichaCliente[];
    const revision = leer("revision-ivan.json") as { medidas: { codigo: string; tipo: string; largo: number; ancho: number; estado: string; despues?: { alertas: { lado: string }[]; verificacion: string; longitudes: Record<string, number> | null; margenesOriginales?: Record<string, { primero: number; ultimo: number }>; asimetriaDeliberada?: boolean } }[] };
    for (const f of propuestas) for (const m of f.medidas ?? []) {
      const auditada = revision.medidas.find(a => f.codigosRps.includes(a.codigo) && a.tipo === m.tipo && a.largo === m.largo && a.ancho === m.ancho);
      expect(auditada, `${f.nombre}/${m.tipo}/${m.largo}×${m.ancho}`).toBeDefined();
      expect(auditada?.estado).not.toBe("retirada");
      if (auditada?.despues?.alertas.length) expect(["registro-vigente", "manual-cotejado", "pdf-producido", "cad-cotejado"]).toContain(auditada.despues.verificacion);
      if (auditada?.despues?.verificacion === "manual-cotejado" && !auditada.despues.asimetriaDeliberada) for (const alerta of auditada.despues.alertas) {
        const original = auditada.despues.margenesOriginales?.[alerta.lado];
        expect(original).toBeDefined();
        expect(Math.abs(original!.primero - original!.ultimo)).toBeLessThanOrEqual(0.210001);
      }
    }
  });

  it("retira CARMA 206 × 129,5 y los casos con lados sin resolver", () => {
    const propuestas = leer("fichas-propuestas.json") as FichaCliente[];
    for (const [codigo, tipo, largo, ancho] of [["000108", "lona", 206, 129.5], ["054473", "baqueton", 181, 110], ["001138", "baqueton", 150, 105], ["000265", "lona", 380, 235]] as const) {
      expect(fichaPorCodigo(propuestas, codigo)?.medidas?.some(m => m.tipo === tipo && m.largo === largo && m.ancho === ancho) ?? false).toBe(false);
    }
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
