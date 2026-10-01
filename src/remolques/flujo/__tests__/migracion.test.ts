import { afterEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import casos from "../../__fixtures__/produccion-2026-09.json";
import { formOptions } from "../../../domain/modelBehavior.js";
import { calcBaqueton, type BaquetonInput } from "../../calc/baqueton.ts";
import { calcLona, type LonaInput } from "../../calc/lona.ts";
import type { CalcParams } from "../../calc/params.ts";
import { normalizarNumeroPedido } from "../../pedidos/numero-pedido.ts";
import type { PlanteamientoRecord } from "../../store/types.ts";
import { crearAlmacenPedidosRemolques } from "../almacen.ts";
import { aplicarMigracion, informeMigracion, planificarMigracion, type EstadoPedidoViejo } from "../migracion.ts";

// Nada fuera de tmp/ del repositorio en las pruebas.
const TMP = path.join(process.cwd(), "tmp");
const temporales: string[] = [];
function carpetaNueva() {
  mkdirSync(TMP, { recursive: true });
  const dir = mkdtempSync(path.join(TMP, "remolques-migracion-"));
  temporales.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of temporales.splice(0)) rmSync(dir, { recursive: true, force: true });
});

const AHORA = "2026-10-01T08:00:00.000Z";
const TECNICOS = formOptions.tecnicos as string[];
type Caso = { caso: string; tipo: "lona" | "baqueton"; creado: string; input: LonaInput | BaquetonInput; result: Record<string, unknown>; paramsSnapshot: CalcParams };

// Los 32 planteamientos reales (anonimizados) como los guarda la web vieja: un pedido nuevo cada vez
// que la versión vuelve a 10, con su OF y su autor («IVAN», sin tilde, como en la web vieja).
function webVieja(): PlanteamientoRecord[] {
  let pedido = 0;
  return (casos as unknown as Caso[]).map((c, i) => {
    if (c.input.cabecera.version === "10") pedido += 1;
    const numeroPedido = `AR.26.9${String(pedido).padStart(4, "0")}`;
    const cliente = `CLIENTE ${pedido}`;
    const fecha = `${c.creado}T08:${String(i).padStart(2, "0")}:00.000Z`;
    return {
      id: `id-${c.caso}`, tipo: c.tipo, numeroPedido, version: c.input.cabecera.version, cliente,
      input: { ...c.input, cabecera: { ...c.input.cabecera, numeroPedido, cliente, realizadoPor: "IVAN", revision: "JAIME", ordenFabricacion: String(230100 + i) } },
      result: c.result, paramsSnapshot: c.paramsSnapshot, createdAt: fecha, updatedAt: fecha,
    } as unknown as PlanteamientoRecord;
  });
}

// Como paridad-produccion.test.ts: los baquetones anteriores a `baquetonDelantero` no lo guardaron.
function sinCamposNuevosVacios(calculado: Record<string, unknown>, guardado: Record<string, unknown>) {
  const copia = { ...calculado };
  if (!("baquetonDelantero" in guardado) && copia.baquetonDelantero === null) delete copia.baquetonDelantero;
  return copia;
}

const planDe = (extra: Partial<Parameters<typeof planificarMigracion>[0]> = {}) => planificarMigracion({
  registros: webVieja(), estados: [], existentes: new Set(), archivados: async () => [], tecnicos: TECNICOS, ahora: AHORA,
  esPedidoDeToldos: async () => false, ...extra,
});

describe("planificarMigracion: lo que no se pasa o no se verá", () => {
  it("no pasa un número que ya es un pedido de toldos y lo dice en el informe", async () => {
    const plan = await planDe({ esPedidoDeToldos: async (codigo) => codigo === "AR2690002" });
    expect(plan.crear.map((p) => p.orderCode)).not.toContain("AR2690002");
    expect(plan.crear).toHaveLength(20);
    const ids = webVieja().filter((r) => normalizarNumeroPedido(r.numeroPedido) === "AR2690002").map((r) => r.id);
    expect(plan.omitidos).toEqual([{ numeroPedido: "AR.26.90002", ids, motivo: "ya es un pedido de toldos" }]);
    for (const simular of [true, false]) {
      const informe = informeMigracion(plan, { simular });
      expect(informe).toContain(`Se deja sin pasar AR.26.90002 (${ids.length} ${ids.length === 1 ? "planteamiento" : "planteamientos"}): ya es un pedido de toldos`);
      expect(informe.join("\n")).not.toContain("carpeta de revisión de toldos");
    }
  });

  it("sin carpeta de toldos configurada no se puede mirar, y el informe lo avisa", async () => {
    const plan = await planDe({ esPedidoDeToldos: null });
    expect(plan.crear).toHaveLength(21);
    for (const simular of [true, false]) {
      expect(informeMigracion(plan, { simular })).toContain(
        "AVISO: no hay carpeta de revisión de toldos configurada: no se ha comprobado si algún número ya es un pedido de toldos.",
      );
    }
  });

  it("avisa de los pendientes de antes del año pasado: no salen en «Por revisar»", async () => {
    const [uno, dos, tres] = webVieja();
    const conNumero = (registro: PlanteamientoRecord, numeroPedido: string) => ({
      ...registro, numeroPedido, input: { ...registro.input, cabecera: { ...registro.input.cabecera, numeroPedido } },
    }) as PlanteamientoRecord;
    const registros = [conNumero(uno, "AR.24.00011"), conNumero(dos, "AR.25.00012"), conNumero(tres, "AR.23.00013")];
    const plan = await planDe({ registros });
    expect(plan.pendientesFueraDeBandeja).toEqual(["AR2300013", "AR2400011"]);
    for (const simular of [true, false]) {
      expect(informeMigracion(plan, { simular })).toContain(
        "AVISO: 2 pedidos pendientes son de antes de 2025 y no saldrán en «Por revisar», que solo enseña 2025 y 2026: AR2300013, AR2400011.",
      );
    }
    const generado = await planDe({
      registros: [conNumero(uno, "AR.24.00011")],
      archivados: async () => [{ type: "pdf" as const, filename: "AR2400011.pdf", savedPath: "/mnt/ot/2024/AR2400011.pdf" }],
    });
    expect(generado.pendientesFueraDeBandeja).toEqual([]);
    expect(informeMigracion(generado, { simular: true }).join("\n")).not.toContain("Por revisar», que solo");
  });
});

describe("planificarMigracion con los 32 casos reales", () => {
  it("un pedido por número, con los elementos tal cual y los mismos resultados que en la web vieja", async () => {
    const plan = await planDe();
    expect(plan.crear).toHaveLength(21);
    expect([plan.omitidos, plan.yaEstan, plan.repetidos]).toEqual([[], [], []]);
    expect(plan.crear.flatMap((p) => p.elementos)).toHaveLength(32);
    const viejos = webVieja();
    for (const p of plan.crear) {
      expect(p).toMatchObject({
        kind: "remolques", status: "PENDING_REVIEW", createdBy: "IVÁN", production: null,
        summary: { technician: "IVÁN", reviewer: "JAIME" }, origen: { web: "remolques-tgm", migradoEn: AHORA },
      });
      for (const e of p.elementos) {
        const viejo = viejos.find((r) => normalizarNumeroPedido(r.numeroPedido) === p.orderCode && r.version === e.version)!;
        expect(e.input).toEqual(viejo.input);
        expect(e.result).toEqual(viejo.result);
        expect(e.paramsSnapshot).toEqual(viejo.paramsSnapshot);
        const recalculado = e.tipo === "lona" ? calcLona(e.input as LonaInput, e.paramsSnapshot) : calcBaqueton(e.input as BaquetonInput, e.paramsSnapshot);
        const guardado = viejo.result as unknown as Record<string, unknown>;
        expect(sinCamposNuevosVacios(recalculado as unknown as Record<string, unknown>, guardado)).toEqual(guardado);
      }
    }
  });

  it("generado si la web vieja lo archivó o su PDF ya está en las carpetas; pendiente si cambió después", async () => {
    const estados: EstadoPedidoViejo[] = [
      {
        pedido: "AR2690001", numeroPedido: "AR.26.90001",
        revision: { estado: "APROBADO", por: "ADRIAN", en: "2026-09-08T09:00:00.000Z" },
        ultimaDecision: { estado: "APROBADO", por: "ADRIAN", en: "2026-09-08T09:00:00.000Z" },
        produccion: { por: "IVAN", en: "2026-09-08T10:00:00.000Z", nombrePdf: "AR2690001-10.pdf", rutas: ["/mnt/plan/AR2690001-10.pdf", "/mnt/ot/2026/AR2690001.pdf"] },
        updatedAt: "2026-09-08T10:00:00.000Z",
      },
      {
        pedido: "AR2690002", numeroPedido: "AR.26.90002",
        revision: { estado: "EN_REVISION", por: "IVAN", en: "2026-09-10T09:00:00.000Z" },
        ultimaDecision: { estado: "APROBADO", por: "JAIME", en: "2026-09-09T09:00:00.000Z" },
        produccion: { por: "IVAN", en: "2026-09-09T10:00:00.000Z", nombrePdf: "AR2690002-10.pdf", rutas: ["/mnt/plan/AR2690002-10.pdf", "/mnt/ot/2026/AR2690002.pdf"] },
        updatedAt: "2026-09-10T09:00:00.000Z",
      },
    ];
    const archivados = async (numero: string) => (numero === "AR.26.90003"
      ? [{ type: "pdf" as const, filename: "AR2690003.pdf", savedPath: "/mnt/ot/2026/AR2690003.pdf" }]
      : []);
    const plan = await planDe({ estados, archivados, existentes: new Set(["AR2690021"]) });
    const de = (codigo: string) => plan.crear.find((p) => p.orderCode === codigo)!;
    expect(de("AR2690001")).toMatchObject({
      status: "PRODUCED", reviewedBy: "ADRIÁN", updatedAt: "2026-09-08T10:00:00.000Z",
      production: {
        createdAt: "2026-09-08T10:00:00.000Z", createdBy: "IVÁN",
        files: [
          { type: "pdf", filename: "AR2690001-10.pdf", savedPath: "/mnt/plan/AR2690001-10.pdf" },
          { type: "pdf", filename: "AR2690001.pdf", savedPath: "/mnt/ot/2026/AR2690001.pdf" },
        ],
      },
    });
    expect(de("AR2690002")).toMatchObject({ status: "PENDING_REVIEW", production: null });
    expect(de("AR2690003")).toMatchObject({ status: "PRODUCED", production: { files: [{ savedPath: "/mnt/ot/2026/AR2690003.pdf" }] } });
    expect(plan.crear.filter((p) => p.status === "PRODUCED").map((p) => p.orderCode).sort()).toEqual(["AR2690001", "AR2690003"]);
    expect(plan.yaEstan).toEqual(["AR2690021"]);
    expect(plan.crear).toHaveLength(20);
  });

  it("deja sin pasar lo que no tiene número de pedido y pasa solo el último guardado de un elemento repetido", async () => {
    const [uno, dos] = webVieja();
    const registros = [
      uno,
      { ...uno, id: "id-repetido", updatedAt: "2026-09-08T09:30:00.000Z", input: { ...uno.input, cantidad: 2 } },
      { ...dos, id: "id-smoke", numeroPedido: "SMOKE-TEST" },
      { ...dos, id: "id-vacio", numeroPedido: "" },
    ] as PlanteamientoRecord[];
    const plan = await planDe({ registros });
    expect(plan.crear.map((p) => [p.orderCode, p.elementos.length, p.elementos[0].input.cantidad])).toEqual([["AR2690001", 1, 2]]);
    expect(plan.repetidos).toEqual([{ orderCode: "AR2690001", descartados: 1 }]);
    expect(plan.omitidos).toEqual([
      { numeroPedido: "SMOKE-TEST", ids: ["id-smoke"], motivo: "«SMOKE-TEST» no tiene forma de número de pedido (dos letras y cinco cifras o más)." },
      { numeroPedido: "", ids: ["id-vacio"], motivo: "No tiene número de pedido." },
    ]);
  });
});

describe("aplicar e informar", () => {
  it("crea los pedidos sin pisar ninguno y el informe lo cuenta", async () => {
    const dir = carpetaNueva();
    const almacen = crearAlmacenPedidosRemolques({ carpeta: async () => dir });
    const plan = await planDe();
    expect(informeMigracion(plan, { simular: true }).slice(0, 2)).toEqual([
      "SIMULACIÓN: no se ha escrito nada.",
      "Se crearían 21 pedidos: 0 generados (a «Generados») y 21 pendientes (a «Por revisar»).",
    ]);
    const codigos = plan.crear.map((p) => p.orderCode);
    expect(await aplicarMigracion(plan, almacen)).toEqual({ creados: codigos, yaEstaban: [] });
    expect(readdirSync(dir)).toHaveLength(21);
    expect(await aplicarMigracion(plan, almacen)).toEqual({ creados: [], yaEstaban: codigos });
  });

  it("el comando simula sin escribir, pasa los 32 casos, no duplica al repetirlo y no toca la web vieja", () => {
    const raiz = carpetaNueva();
    const origen = path.join(raiz, "remolques-tgm");
    mkdirSync(path.join(origen, "data"), { recursive: true });
    const fichero = path.join(origen, "data", "planteamientos.json");
    writeFileSync(fichero, JSON.stringify(webVieja(), null, 1));
    const huella = () => createHash("sha256").update(readFileSync(fichero)).digest("hex");
    const antes = huella();
    const destino = path.join(raiz, "interna");
    const correr = (...extra: string[]) => execFileSync(process.execPath, ["scripts/migrar-remolques.mjs", "--origen", origen, "--destino", destino, ...extra], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const simulado = correr("--simular");
    expect(simulado).toContain("SIMULACIÓN: no se ha escrito nada.");
    expect(simulado).toContain("Se crearían 21 pedidos");
    expect(existsSync(destino)).toBe(false);
    expect(correr()).toContain("Hecho: 21 pedidos creados");
    expect(readdirSync(destino)).toHaveLength(21);
    const otra = correr();
    expect(otra).toContain("Se crean 0 pedidos");
    expect(otra).toContain("Hecho: 0 pedidos creados");
    expect(readdirSync(destino)).toHaveLength(21);
    expect(huella()).toBe(antes);
  }, 60_000);

  it("el comando no pasa los números que ya son de toldos y avisa si no puede mirarlo", () => {
    const raiz = carpetaNueva();
    const origen = path.join(raiz, "remolques-tgm");
    mkdirSync(path.join(origen, "data"), { recursive: true });
    writeFileSync(path.join(origen, "data", "planteamientos.json"), JSON.stringify(webVieja()));
    // Un pedido de toldos AR2690002 guardado en la carpeta de revisión de toldos (formato JSON antiguo).
    const toldos = path.join(raiz, "TOLDOS");
    mkdirSync(path.join(toldos, "2026"), { recursive: true });
    writeFileSync(path.join(toldos, "2026", "AR2690002.toldos.json"), JSON.stringify({ orderCode: "AR2690002" }));
    const destino = path.join(raiz, "interna");
    const correr = (...extra: string[]) => spawnSync(process.execPath, ["scripts/migrar-remolques.mjs", "--origen", origen, "--destino", destino, ...extra], { encoding: "utf8" });
    const sinToldos = correr("--simular");
    expect(sinToldos.status).toBe(0);
    expect(sinToldos.stdout).toContain("AVISO: no hay carpeta de revisión de toldos configurada");
    const simulado = correr("--simular", "--toldos", path.join(toldos, "{YYYY}"));
    expect(simulado.stdout).toContain("Se crearían 20 pedidos");
    expect(simulado.stdout).toMatch(/Se deja sin pasar AR\.26\.90002 \(\d+ planteamientos?\): ya es un pedido de toldos/);
    const real = correr("--toldos", path.join(toldos, "{YYYY}"));
    expect(real.status).toBe(0);
    expect(real.stdout).toMatch(/Se deja sin pasar AR\.26\.90002 \(\d+ planteamientos?\): ya es un pedido de toldos/);
    expect(real.stdout).toContain("Hecho: 20 pedidos creados");
    expect(readdirSync(destino)).not.toContain("AR2690002.json");
  }, 60_000);

  it("el comando corta con un mensaje corto y código 2 ante una opción desconocida o un JSON que no se lee", () => {
    const raiz = carpetaNueva();
    const origen = path.join(raiz, "remolques-tgm");
    mkdirSync(path.join(origen, "data"), { recursive: true });
    writeFileSync(path.join(origen, "data", "planteamientos.json"), "{ roto");
    const correr = (...args: string[]) => spawnSync(process.execPath, ["scripts/migrar-remolques.mjs", ...args], { encoding: "utf8" });
    const desconocida = correr("--origen", origen, "--destino", path.join(raiz, "interna"), "--simualr");
    expect(desconocida.status).toBe(2);
    expect(desconocida.stderr).toContain("Opción no válida");
    expect(desconocida.stderr).toContain("--simualr");
    const roto = correr("--origen", origen, "--destino", path.join(raiz, "interna"), "--simular");
    expect(roto.status).toBe(2);
    expect(roto.stderr).toContain("No se pudo leer");
    for (const salida of [desconocida.stderr, roto.stderr]) expect(salida).not.toMatch(/^\s+at /m);
    expect(existsSync(path.join(raiz, "interna"))).toBe(false);
  }, 60_000);
});
