import { chromium } from "playwright-core";

// Chromium sin ventana para la hoja de taller de remolques (fase 4). Se abre una vez y se
// reutiliza (arrancarlo cuesta segundos); los PDF se hacen de uno en uno, con un tiempo máximo y
// mensajes que se entienden. Cada PDF usa un contexto nuevo: sin caché ni estado de otro.

/** WebGL por software (SwiftShader): el servidor .90 no tiene GPU. Los mismos que usan las e2e. */
export const ARGUMENTOS_CHROMIUM = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
export const TIEMPO_MAXIMO_MS = 30_000;
/** A4 apaisado a 96 ppp: la página se pinta al tamaño de la hoja. */
const VENTANA = { width: 1123, height: 794 };

export interface PaginaHojaPdf {
  /** Errores de la página (excepciones y `console.error`) desde que se abrió. */
  errores: string[];
  ir(url: string, tiempoMs: number): Promise<void>;
  /** Espera a `window.hojaLista` o a `window.hojaError`; devuelve el error o null. */
  esperarHoja(tiempoMs: number): Promise<string | null>;
  pdf(): Promise<Buffer>;
  cerrar(): Promise<void>;
}

export interface NavegadorPdf {
  conectado(): boolean;
  abrirPagina(): Promise<PaginaHojaPdf>;
  cerrar(): Promise<void>;
}

export interface ServicioPdf {
  generar(id: string): Promise<Buffer>;
  cerrar(): Promise<void>;
}

/** Cualquier fallo al hacer el PDF: la ruta responde 503 con este mensaje. */
export class ErrorSalidaPdf extends Error {
  statusCode = 503;
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorSalidaPdf";
  }
}

const texto = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function mensajeFalloLanzar(error: unknown): string {
  const detalle = texto(error);
  return /Executable doesn't exist|playwright install/i.test(detalle)
    ? "Falta el Chromium de la hoja de taller en el servidor. Instálalo con: pnpm exec playwright install chromium"
    : `No se pudo abrir Chromium para hacer el PDF: ${detalle}`;
}

export async function lanzarChromium(): Promise<NavegadorPdf> {
  // Arrancar también tiene límite: si no, un Chromium que no llega a abrir dejaría la cola parada.
  const navegador = await chromium.launch({ headless: true, args: ARGUMENTOS_CHROMIUM, timeout: TIEMPO_MAXIMO_MS });
  return {
    conectado: () => navegador.isConnected(),
    cerrar: () => navegador.close(),
    async abrirPagina() {
      const contexto = await navegador.newContext({ viewport: VENTANA, deviceScaleFactor: 1 });
      const pagina = await contexto.newPage();
      const errores: string[] = [];
      pagina.on("pageerror", (error) => errores.push(error.message));
      pagina.on("console", (mensaje) => {
        if (mensaje.type() === "error") errores.push(mensaje.text());
      });
      return {
        errores,
        async ir(url, tiempoMs) {
          await pagina.goto(url, { waitUntil: "load", timeout: tiempoMs });
        },
        async esperarHoja(tiempoMs) {
          await pagina.waitForFunction(
            () => window.hojaLista === true || typeof window.hojaError === "string",
            undefined,
            { timeout: tiempoMs },
          );
          return pagina.evaluate(() => window.hojaError ?? null);
        },
        pdf: () => pagina.pdf({ format: "A4", landscape: true, printBackground: true, preferCSSPageSize: true }),
        cerrar: () => contexto.close(),
      };
    },
  };
}

export function crearServicioPdf({
  urlHoja,
  lanzar = lanzarChromium,
  tiempoMaximoMs = TIEMPO_MAXIMO_MS,
}: {
  urlHoja: (id: string) => string;
  lanzar?: () => Promise<NavegadorPdf>;
  tiempoMaximoMs?: number;
}): ServicioPdf {
  let navegador: Promise<NavegadorPdf> | null = null;
  let cola: Promise<unknown> = Promise.resolve();

  async function abrirNavegador(): Promise<NavegadorPdf> {
    if (navegador) {
      const actual = await navegador.catch(() => null);
      if (actual?.conectado()) return actual;
      await actual?.cerrar().catch(() => {});
    }
    const lanzado = lanzar().catch((error: unknown) => {
      navegador = null;
      throw new ErrorSalidaPdf(mensajeFalloLanzar(error));
    });
    navegador = lanzado;
    return lanzado;
  }

  async function imprimir(pagina: PaginaHojaPdf, id: string): Promise<Buffer> {
    await pagina.ir(urlHoja(id), tiempoMaximoMs);
    const error = await pagina.esperarHoja(tiempoMaximoMs);
    if (error) throw new ErrorSalidaPdf(`No se pudo preparar la hoja de taller: ${error}`);
    if (pagina.errores.length > 0) {
      throw new ErrorSalidaPdf(`La hoja de taller dio errores al pintarse: ${pagina.errores.join(" · ")}`);
    }
    const pdf = await pagina.pdf();
    if (pdf.subarray(0, 4).toString("ascii") !== "%PDF") throw new ErrorSalidaPdf("Chromium no devolvió un PDF válido.");
    return pdf;
  }

  async function hacer(id: string): Promise<Buffer> {
    const nav = await abrirNavegador();
    let pagina: PaginaHojaPdf;
    try {
      pagina = await nav.abrirPagina();
    } catch (error) {
      throw new ErrorSalidaPdf(`No se pudo abrir una página en Chromium: ${texto(error)}`);
    }
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    const limite = new Promise<never>((_, rechazar) => {
      temporizador = setTimeout(() => rechazar(new ErrorSalidaPdf(
        `La hoja de taller tardó más de ${(tiempoMaximoMs / 1000).toLocaleString("es-ES")} s en prepararse. Vuelve a intentarlo; si se repite, avisa a informática.`,
      )), tiempoMaximoMs);
    });
    const trabajo = imprimir(pagina, id);
    // Si gana el tiempo máximo, lo que quede del trabajo no debe acabar en un rechazo sin atender.
    trabajo.catch(() => {});
    try {
      return await Promise.race([trabajo, limite]);
    } catch (error) {
      throw error instanceof ErrorSalidaPdf ? error : new ErrorSalidaPdf(`No se pudo hacer el PDF: ${texto(error)}`);
    } finally {
      clearTimeout(temporizador);
      await pagina.cerrar().catch(() => {});
    }
  }

  return {
    generar(id) {
      const trabajo = cola.then(() => hacer(id));
      cola = trabajo.catch(() => undefined);
      return trabajo;
    },
    async cerrar() {
      const actual = navegador ? await navegador.catch(() => null) : null;
      navegador = null;
      await actual?.cerrar().catch(() => {});
    },
  };
}
