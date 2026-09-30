import { describe, expect, it } from "vitest";
import {
  crearServicioPdf, ErrorSalidaPdf, errorConsolaIgnorable, MENSAJE_COLA_LLENA, mensajeFalloLanzar, type NavegadorPdf, type PaginaHojaPdf,
} from "../navegador.ts";

const PDF = Buffer.from("%PDF-1.7 prueba");
function nunca<T>(): Promise<T> { return new Promise<T>(() => {}); }

function paginaFalsa(registro: string[], opciones: {
  error?: string; errores?: string[]; colgada?: boolean; pdf?: Buffer; espera?: Promise<void>; sinCerrar?: boolean; falloIr?: Error;
} = {}): PaginaHojaPdf {
  return {
    errores: opciones.errores ?? [],
    async ir(url) {
      registro.push(`ir ${url}`);
      if (opciones.falloIr) throw opciones.falloIr;
      await Promise.resolve();
    },
    esperarHoja: () => (opciones.colgada ? nunca<string | null>()
      : (opciones.espera ?? Promise.resolve()).then(() => opciones.error ?? null)),
    async pdf() { registro.push("pdf"); return opciones.pdf ?? PDF; },
    cerrar() {
      registro.push("cerrar");
      return opciones.sinCerrar ? nunca<void>() : Promise.resolve();
    },
  };
}

function navegadorFalso(paginas: () => PaginaHojaPdf | Promise<PaginaHojaPdf>) {
  const estado = { lanzados: 0, conectado: true, cerrado: false };
  const lanzar = async (): Promise<NavegadorPdf> => {
    estado.lanzados += 1;
    estado.conectado = true;
    return {
      conectado: () => estado.conectado,
      abrirPagina: async () => paginas(),
      cerrar: async () => { estado.cerrado = true; },
    };
  };
  return { estado, lanzar };
}

const urlHoja = (id: string) => `http://127.0.0.1:4310/hoja-remolques.html?id=${id}`;

describe("servicio de PDF con Chromium", () => {
  it("abre la hoja con su identificador, hace el PDF y cierra la página", async () => {
    const registro: string[] = [];
    const { lanzar } = navegadorFalso(() => paginaFalsa(registro));
    const servicio = crearServicioPdf({ urlHoja, lanzar });
    expect(await servicio.generar("abc")).toEqual(PDF);
    expect(registro).toEqual([`ir ${urlHoja("abc")}`, "pdf", "cerrar"]);
  });

  it("abre Chromium una vez y lo reutiliza; si se cae, lo vuelve a abrir", async () => {
    const registro: string[] = [];
    const { estado, lanzar } = navegadorFalso(() => paginaFalsa(registro));
    const servicio = crearServicioPdf({ urlHoja, lanzar });
    await servicio.generar("a");
    await servicio.generar("b");
    expect(estado.lanzados).toBe(1);
    estado.conectado = false;
    await servicio.generar("c");
    expect(estado.lanzados).toBe(2);
  });

  it("hace los PDF de uno en uno", async () => {
    const registro: string[] = [];
    const { lanzar } = navegadorFalso(() => paginaFalsa(registro));
    const servicio = crearServicioPdf({ urlHoja, lanzar });
    await Promise.all([servicio.generar("a"), servicio.generar("b")]);
    expect(registro).toEqual([`ir ${urlHoja("a")}`, "pdf", "cerrar", `ir ${urlHoja("b")}`, "pdf", "cerrar"]);
  });

  it("corta a los 30 s (aquí, 20 ms) con un mensaje claro y cierra la página", async () => {
    const registro: string[] = [];
    let abiertas = 0;
    // La primera página se cuelga; la segunda va bien.
    const { lanzar } = navegadorFalso(() => paginaFalsa(registro, { colgada: abiertas++ === 0 }));
    const servicio = crearServicioPdf({ urlHoja, lanzar, tiempoMaximoMs: 20 });
    await expect(servicio.generar("a")).rejects.toThrow(/tardó más de 0,02 s en prepararse/);
    expect(registro).toContain("cerrar");
    // La cola sigue: el siguiente PDF no se queda esperando al que se cortó.
    await expect(servicio.generar("b")).resolves.toEqual(PDF);
  });

  it("devuelve lo que dice la página o sus errores de consola", async () => {
    const conError = crearServicioPdf({ urlHoja, lanzar: navegadorFalso(() => paginaFalsa([], { error: "Falta el identificador de la hoja." })).lanzar });
    await expect(conError.generar("a")).rejects.toThrow("No se pudo preparar la hoja de taller: Falta el identificador de la hoja.");
    const conConsola = crearServicioPdf({ urlHoja, lanzar: navegadorFalso(() => paginaFalsa([], { errores: ["TypeError: x"] })).lanzar });
    await expect(conConsola.generar("a")).rejects.toThrow("La hoja de taller dio errores al pintarse: TypeError: x");
    const sinPdf = crearServicioPdf({ urlHoja, lanzar: navegadorFalso(() => paginaFalsa([], { pdf: Buffer.from("<html>") })).lanzar });
    await expect(sinPdf.generar("a")).rejects.toThrow("Chromium no devolvió un PDF válido.");
  });

  it("todos los fallos son 503 para la ruta", async () => {
    const servicio = crearServicioPdf({ urlHoja, lanzar: navegadorFalso(() => paginaFalsa([], { error: "x" })).lanzar });
    await expect(servicio.generar("a")).rejects.toBeInstanceOf(ErrorSalidaPdf);
    await expect(servicio.generar("a")).rejects.toMatchObject({ statusCode: 503 });
  });

  it("sin Chromium instalado dice cómo instalarlo y lo reintenta en la siguiente", async () => {
    let intentos = 0;
    const lanzar = async (): Promise<NavegadorPdf> => {
      intentos += 1;
      throw new Error("browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium-1234/chrome");
    };
    const servicio = crearServicioPdf({ urlHoja, lanzar });
    await expect(servicio.generar("a")).rejects.toThrow("Falta el Chromium de la hoja de taller en el servidor. Instálalo con: PLAYWRIGHT_SKIP_BROWSER_GC=1 pnpm exec playwright-core install chromium");
    await expect(servicio.generar("b")).rejects.toThrow(ErrorSalidaPdf);
    expect(intentos).toBe(2);
    expect(mensajeFalloLanzar(new Error("sin memoria"))).toBe("No se pudo abrir Chromium para hacer el PDF: sin memoria");
  });

  it("al cerrar el servidor cierra Chromium", async () => {
    const { estado, lanzar } = navegadorFalso(() => paginaFalsa([]));
    const servicio = crearServicioPdf({ urlHoja, lanzar });
    await servicio.generar("a");
    await servicio.cerrar();
    expect(estado.cerrado).toBe(true);
  });
});

describe("cierre con una hoja en marcha", () => {
  it("el «Target closed» de Playwright al cerrar sale como el mensaje de cierre del servidor", async () => {
    let servicio!: ReturnType<typeof crearServicioPdf>;
    const pagina = paginaFalsa([]);
    pagina.esperarHoja = async () => {
      await servicio.cerrar();
      throw new Error("page.waitForFunction: Target page, context or browser has been closed");
    };
    const { lanzar } = navegadorFalso(() => pagina);
    servicio = crearServicioPdf({ urlHoja, lanzar, registrar: () => {} });
    await expect(servicio.generar("a")).rejects.toThrow("El servidor se está cerrando: no se pueden hacer más hojas de taller ahora.");
  });
});

describe("la cola nunca se queda parada", () => {
  const callado = () => {};

  it("una página que nunca se cierra no bloquea la siguiente: ese Chromium se descarta", async () => {
    const registro: string[] = [];
    let abiertas = 0;
    const { estado, lanzar } = navegadorFalso(() => paginaFalsa(registro, { sinCerrar: abiertas++ === 0 }));
    const servicio = crearServicioPdf({ urlHoja, lanzar, tiempoCierreMs: 20, registrar: callado });
    await expect(servicio.generar("a")).resolves.toEqual(PDF);
    await expect(servicio.generar("b")).resolves.toEqual(PDF);
    expect(estado.lanzados).toBe(2);
    expect(estado.cerrado).toBe(true);
  });

  it("si Chromium no abre la página a tiempo, falla con un mensaje claro y la siguiente abre otro", async () => {
    const registro: string[] = [];
    let abiertas = 0;
    const { estado, lanzar } = navegadorFalso(() => (abiertas++ === 0 ? nunca<PaginaHojaPdf>() : paginaFalsa(registro)));
    const servicio = crearServicioPdf({ urlHoja, lanzar, tiempoCierreMs: 20, registrar: callado });
    await expect(servicio.generar("a")).rejects.toThrow("No se pudo abrir una página en Chromium: Chromium no abrió la página a tiempo.");
    await expect(servicio.generar("b")).resolves.toEqual(PDF);
    expect(estado.lanzados).toBe(2);
  });

  it("si la hoja se cuelga, también se descarta ese Chromium", async () => {
    let abiertas = 0;
    const { estado, lanzar } = navegadorFalso(() => paginaFalsa([], { colgada: abiertas++ === 0 }));
    const servicio = crearServicioPdf({ urlHoja, lanzar, tiempoMaximoMs: 20, registrar: callado });
    await expect(servicio.generar("a")).rejects.toThrow(/tardó más de/);
    await expect(servicio.generar("b")).resolves.toEqual(PDF);
    expect(estado.lanzados).toBe(2);
  });

  it("si Chromium no se cierra, se mata el proceso", async () => {
    let matado = false;
    const lanzar = async (): Promise<NavegadorPdf> => ({
      conectado: () => true,
      abrirPagina: async () => paginaFalsa([]),
      cerrar: () => nunca<void>(),
      matar: async () => { matado = true; },
    });
    const servicio = crearServicioPdf({ urlHoja, lanzar, tiempoCierreMs: 20, registrar: callado });
    await servicio.generar("a");
    await servicio.cerrar();
    expect(matado).toBe(true);
  });

  it("con la cola llena responde enseguida que se vuelva a intentar", async () => {
    let soltar!: () => void;
    const espera = new Promise<void>((resolver) => { soltar = resolver; });
    const { lanzar } = navegadorFalso(() => paginaFalsa([], { espera }));
    const servicio = crearServicioPdf({ urlHoja, lanzar, maxPendientes: 2 });
    const a = servicio.generar("a");
    const b = servicio.generar("b");
    await expect(servicio.generar("c")).rejects.toThrow(MENSAJE_COLA_LLENA);
    await expect(servicio.generar("c")).rejects.toMatchObject({ statusCode: 503 });
    soltar();
    await expect(Promise.all([a, b])).resolves.toEqual([PDF, PDF]);
    // Al vaciarse, vuelve a admitir.
    await expect(servicio.generar("d")).resolves.toEqual(PDF);
  });

  it("los datos se guardan al salir de la cola y se salta a quien ya no espera", async () => {
    const registro: string[] = [];
    const { lanzar } = navegadorFalso(() => paginaFalsa(registro));
    const servicio = crearServicioPdf({ urlHoja, lanzar, registrar: callado });
    const trabajo = (id: string, sigue = true) => ({
      preparar: () => { registro.push(`preparar ${id}`); return id; },
      sigueEsperando: () => sigue,
    });
    const [a, b, c] = await Promise.allSettled([servicio.generar(trabajo("a")), servicio.generar(trabajo("b", false)), servicio.generar(trabajo("c"))]);
    expect(a.status).toBe("fulfilled");
    expect(b).toMatchObject({ status: "rejected", reason: expect.any(ErrorSalidaPdf) });
    expect(c.status).toBe("fulfilled");
    expect(registro).toEqual([
      "preparar a", `ir ${urlHoja("a")}`, "pdf", "cerrar",
      "preparar c", `ir ${urlHoja("c")}`, "pdf", "cerrar",
    ]);
  });

  it("a la persona, solo la primera línea del error de Chromium; al registro, todo", async () => {
    const detalle: string[] = [];
    const falloIr = new Error("page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4310/hoja\nCall log:\n  - navigating to …");
    const { lanzar } = navegadorFalso(() => paginaFalsa([], { falloIr }));
    const servicio = crearServicioPdf({ urlHoja, lanzar, registrar: (m) => detalle.push(m) });
    const error = await servicio.generar("a").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ErrorSalidaPdf);
    expect((error as Error).message).toBe("No se pudo hacer el PDF: page.goto: net::ERR_CONNECTION_REFUSED at http://127.0.0.1:4310/hoja");
    expect(detalle.join("\n")).toContain("Call log:");
    expect(mensajeFalloLanzar(new Error("browserType.launch: Target closed\n=== logs ===\n…"))).toBe(
      "No se pudo abrir Chromium para hacer el PDF: browserType.launch: Target closed",
    );
  });

  it("si salta el tiempo de Playwright, el mensaje es el mismo de la hoja que tarda", async () => {
    const falloIr = Object.assign(new Error("page.goto: Timeout 31000ms exceeded.\nCall log:\n  - navigating to …"), { name: "TimeoutError" });
    let abiertas = 0;
    const { estado, lanzar } = navegadorFalso(() => paginaFalsa([], abiertas++ === 0 ? { falloIr } : {}));
    const servicio = crearServicioPdf({ urlHoja, lanzar, registrar: callado });
    await expect(servicio.generar("a")).rejects.toThrow("La hoja de taller tardó más de 30 s en prepararse. Vuelve a intentarlo; si se repite, avisa a informática.");
    await expect(servicio.generar("b")).resolves.toEqual(PDF);
    expect(estado.lanzados).toBe(2);
  });

  it("los tiempos de Playwright van por encima del límite de la hoja", async () => {
    const tiempos: number[] = [];
    const pagina: PaginaHojaPdf = {
      ...paginaFalsa([]),
      async ir(_url, tiempoMs) { tiempos.push(tiempoMs); },
      async esperarHoja(tiempoMs) { tiempos.push(tiempoMs); return null; },
    };
    const { lanzar } = navegadorFalso(() => pagina);
    await crearServicioPdf({ urlHoja, lanzar }).generar("a");
    expect(tiempos).toEqual([31_000, 31_000]);
  });

  it("al cerrar, las hojas que esperan en la cola se rechazan enseguida", async () => {
    let soltar!: () => void;
    const espera = new Promise<void>((resolver) => { soltar = resolver; });
    const { lanzar } = navegadorFalso(() => paginaFalsa([], { espera }));
    const servicio = crearServicioPdf({ urlHoja, lanzar });
    const a = servicio.generar("a");
    const b = servicio.generar("b");
    const c = servicio.generar("c");
    await new Promise((resolver) => setTimeout(resolver, 5));
    await servicio.cerrar();
    soltar();
    await a.catch(() => {});
    await expect(b).rejects.toMatchObject({ statusCode: 503, message: expect.stringMatching(/cerrando/) });
    await expect(c).rejects.toMatchObject({ statusCode: 503, message: expect.stringMatching(/cerrando/) });
  });

  it("después de cerrar no vuelve a abrir Chromium", async () => {
    const { estado, lanzar } = navegadorFalso(() => paginaFalsa([]));
    const servicio = crearServicioPdf({ urlHoja, lanzar });
    await servicio.generar("a");
    await servicio.cerrar();
    await expect(servicio.generar("b")).rejects.toMatchObject({ statusCode: 503, message: expect.stringMatching(/cerrando/) });
    expect(estado.lanzados).toBe(1);
  });
});

describe("errores de consola de la hoja", () => {
  it("solo se ignora que falte el icono de la pestaña", () => {
    const falta = "Failed to load resource: the server responded with a status of 404 (Not Found)";
    expect(errorConsolaIgnorable(falta, "http://127.0.0.1:4310/favicon.ico")).toBe(true);
    expect(errorConsolaIgnorable(falta, "http://127.0.0.1:4310/favicon.png?v=2")).toBe(true);
    expect(errorConsolaIgnorable(falta, "http://127.0.0.1:4310/assets/hoja-abc.js")).toBe(false);
    expect(errorConsolaIgnorable(falta, "http://127.0.0.1:4310/api/remolques/hoja/x")).toBe(false);
    expect(errorConsolaIgnorable("TypeError: x", "http://127.0.0.1:4310/favicon.ico")).toBe(false);
  });
});
