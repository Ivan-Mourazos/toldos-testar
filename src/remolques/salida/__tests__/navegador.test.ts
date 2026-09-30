import { describe, expect, it } from "vitest";
import { crearServicioPdf, ErrorSalidaPdf, mensajeFalloLanzar, type NavegadorPdf, type PaginaHojaPdf } from "../navegador.ts";

const PDF = Buffer.from("%PDF-1.7 prueba");

function paginaFalsa(registro: string[], opciones: { error?: string; errores?: string[]; colgada?: boolean; pdf?: Buffer } = {}): PaginaHojaPdf {
  return {
    errores: opciones.errores ?? [],
    async ir(url) { registro.push(`ir ${url}`); await Promise.resolve(); },
    esperarHoja: () => (opciones.colgada ? new Promise<string | null>(() => {}) : Promise.resolve(opciones.error ?? null)),
    async pdf() { registro.push("pdf"); return opciones.pdf ?? PDF; },
    async cerrar() { registro.push("cerrar"); },
  };
}

function navegadorFalso(paginas: () => PaginaHojaPdf) {
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
    await expect(servicio.generar("a")).rejects.toThrow("Falta el Chromium de la hoja de taller en el servidor. Instálalo con: pnpm exec playwright install chromium");
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
