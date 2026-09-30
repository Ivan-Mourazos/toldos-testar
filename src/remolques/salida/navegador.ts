import { chromium, type Browser } from "playwright-core";
import { ORDEN_INSTALAR_CHROMIUM } from "../../../scripts/lib/deploy-remolques.mjs";

// Chromium sin ventana para la hoja de taller de remolques (fase 4). Se abre una vez y se
// reutiliza (arrancarlo cuesta segundos); los PDF se hacen de uno en uno, con un tiempo máximo y
// mensajes que se entienden. Cada PDF usa un contexto nuevo: sin caché ni estado de otro.
// Nada puede dejar la cola parada: abrir y cerrar también tienen límite, y un Chromium que se
// cuelga se descarta (se cierra o se mata) para que la siguiente hoja abra otro.

/** WebGL por software (SwiftShader): el servidor .90 no tiene GPU. Los mismos que usan las e2e. */
export const ARGUMENTOS_CHROMIUM = ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];
export const TIEMPO_MAXIMO_MS = 30_000;
/** Abrir o cerrar una página, o cerrar Chromium: si tarda más, se da por colgado. */
export const TIEMPO_CIERRE_MS = 5_000;
/** El PDF en marcha más los que esperan; con más, se responde enseguida que se vuelva a intentar. */
export const MAX_PENDIENTES = 5;
export const MENSAJE_COLA_LLENA = "Hay otras hojas de taller preparándose; vuelve a intentarlo en unos segundos.";
const MENSAJE_CERRADO = "El servidor se está cerrando: no se pueden hacer más hojas de taller ahora.";
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
  /** Una página que solo puede pedir recursos a `origen` (el propio servidor). */
  abrirPagina(origen: string): Promise<PaginaHojaPdf>;
  cerrar(): Promise<void>;
  /** Mata el proceso si `cerrar()` no ha podido. */
  matar?(): Promise<void>;
}

export interface TrabajoPdf {
  /** Se llama cuando el trabajo sale de la cola: guarda los datos de la hoja y devuelve su identificador. */
  preparar(): string;
  /** Falso si quien pidió el PDF ya no espera (cerró la conexión): entonces el trabajo se salta. */
  sigueEsperando?(): boolean;
}

export interface ServicioPdf {
  /** Con un identificador ya guardado o con un trabajo que lo guarda al salir de la cola. */
  generar(trabajo: string | TrabajoPdf): Promise<Buffer>;
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

/** Se acabó el tiempo de algo que hace Chromium. */
class ErrorTiempo extends ErrorSalidaPdf {}

const texto = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Lo que se le enseña a la persona: la primera línea, sin el «Call log» de Playwright. */
export const primeraLinea = (error: unknown) => texto(error).split("\n")[0].trim();

export function mensajeFalloLanzar(error: unknown): string {
  const detalle = texto(error);
  return /Executable doesn't exist|playwright install/i.test(detalle)
    ? `Falta el Chromium de la hoja de taller en el servidor. Instálalo con: ${ORDEN_INSTALAR_CHROMIUM}`
    : `No se pudo abrir Chromium para hacer el PDF: ${primeraLinea(error)}`;
}

/** Los errores de consola que no estropean la hoja: solo que falte el icono de la pestaña. */
export function errorConsolaIgnorable(mensaje: string, url: string): boolean {
  return /^Failed to load resource/.test(mensaje) && /\/favicon\.(?:ico|png)(?:[?#]|$)/.test(url);
}

/** La promesa, o un ErrorTiempo a los `ms`; si llega tarde, su valor se entrega a `sobrante` (para cerrarlo). */
function conLimite<T>(promesa: Promise<T>, ms: number, mensaje: string, sobrante?: (valor: T) => void): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    let vencido = false;
    const temporizador = setTimeout(() => {
      vencido = true;
      rechazar(new ErrorTiempo(mensaje));
    }, ms);
    promesa.then(
      (valor) => {
        clearTimeout(temporizador);
        if (vencido) sobrante?.(valor);
        else resolver(valor);
      },
      (error: unknown) => {
        clearTimeout(temporizador);
        if (!vencido) rechazar(error);
      },
    );
  });
}

export async function lanzarChromium(): Promise<NavegadorPdf> {
  // launchServer y no launch: el servidor de Chromium sabe matar el proceso si no se cierra solo.
  // El precio es un websocket sin autenticación (solo una ruta aleatoria): por eso escucha solo en
  // 127.0.0.1, nunca en la red.
  // Sin los manejadores de señales de Playwright: con ellos, el SIGINT con que PM2 para y recarga
  // hacía process.exit(130) antes de que el cierre ordenado de la web terminara. Chromium lo
  // cierra shutdown() (servicio.cerrar()).
  const servidor = await chromium.launchServer({
    headless: true,
    args: ARGUMENTOS_CHROMIUM,
    timeout: TIEMPO_MAXIMO_MS,
    host: "127.0.0.1",
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
  });
  let navegador: Browser;
  try {
    navegador = await chromium.connect(servidor.wsEndpoint(), { timeout: TIEMPO_MAXIMO_MS });
  } catch (error) {
    await servidor.kill().catch(() => {});
    throw error;
  }
  return {
    conectado: () => navegador.isConnected(),
    async cerrar() {
      await navegador.close().catch(() => {});
      await servidor.close();
    },
    matar: () => servidor.kill(),
    async abrirPagina(origen) {
      const contexto = await navegador.newContext({ viewport: VENTANA, deviceScaleFactor: 1 });
      try {
        // La hoja no tiene nada que pedir fuera del propio servidor.
        await contexto.route("**/*", (ruta) =>
          new URL(ruta.request().url()).origin === origen ? ruta.continue() : ruta.abort("blockedbyclient"));
        const pagina = await contexto.newPage();
        const errores: string[] = [];
        pagina.on("pageerror", (error) => errores.push(error.message));
        pagina.on("console", (mensaje) => {
          if (mensaje.type() === "error" && !errorConsolaIgnorable(mensaje.text(), mensaje.location().url)) {
            errores.push(mensaje.text());
          }
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
      } catch (error) {
        await contexto.close().catch(() => {});
        throw error;
      }
    },
  };
}

export function crearServicioPdf({
  urlHoja,
  lanzar = lanzarChromium,
  tiempoMaximoMs = TIEMPO_MAXIMO_MS,
  tiempoCierreMs = TIEMPO_CIERRE_MS,
  maxPendientes = MAX_PENDIENTES,
  registrar = (mensaje: string) => console.error(mensaje),
}: {
  urlHoja: (id: string) => string;
  lanzar?: () => Promise<NavegadorPdf>;
  tiempoMaximoMs?: number;
  tiempoCierreMs?: number;
  maxPendientes?: number;
  /** Adónde va el detalle completo de los fallos (por defecto, console.error). */
  registrar?: (mensaje: string) => void;
}): ServicioPdf {
  let navegador: NavegadorPdf | null = null;
  let cola: Promise<unknown> = Promise.resolve();
  let pendientes = 0;
  let cerrado = false;

  /** Al cliente, la primera línea; al registro, todo. */
  function fallo(prefijo: string, error: unknown): ErrorSalidaPdf {
    registrar(`${prefijo}: ${error instanceof Error && error.stack ? error.stack : texto(error)}`);
    return new ErrorSalidaPdf(`${prefijo}: ${primeraLinea(error)}`);
  }

  async function cerrarNavegador(nav: NavegadorPdf): Promise<void> {
    try {
      await conLimite(nav.cerrar(), tiempoCierreMs, "Chromium no se cerró a tiempo.");
    } catch (error) {
      registrar(`${texto(error)} Se mata el proceso.`);
      await nav.matar?.().catch((otro: unknown) => registrar(`No se pudo matar Chromium: ${texto(otro)}`));
    }
  }

  /** Deja de usar ese Chromium (sin esperar a que se cierre): la siguiente hoja abre otro. */
  function descartar(nav: NavegadorPdf, motivo: string) {
    if (navegador === nav) navegador = null;
    registrar(`Se descarta el Chromium de la hoja de taller (${motivo}); la siguiente hoja abrirá otro.`);
    void cerrarNavegador(nav);
  }

  async function abrirNavegador(): Promise<NavegadorPdf> {
    if (navegador?.conectado()) return navegador;
    if (navegador) descartar(navegador, "se desconectó");
    let nuevo: NavegadorPdf;
    try {
      nuevo = await conLimite(lanzar(), tiempoMaximoMs, "Chromium tardó demasiado en abrirse.", (tarde) => void cerrarNavegador(tarde));
    } catch (error) {
      registrar(`No se pudo abrir Chromium para la hoja de taller: ${texto(error)}`);
      throw new ErrorSalidaPdf(mensajeFalloLanzar(error));
    }
    if (cerrado) {
      void cerrarNavegador(nuevo);
      throw new ErrorSalidaPdf(MENSAJE_CERRADO);
    }
    navegador = nuevo;
    return nuevo;
  }

  const mensajeTiempo = `La hoja de taller tardó más de ${(tiempoMaximoMs / 1000).toLocaleString("es-ES")} s en prepararse. Vuelve a intentarlo; si se repite, avisa a informática.`;
  // Los tiempos de Playwright van algo por encima del límite de la hoja para que gane siempre el
  // de conLimite, con su mensaje; si aun así salta uno de Playwright, se dice lo mismo.
  const tiempoPlaywrightMs = tiempoMaximoMs + 1_000;

  async function imprimir(pagina: PaginaHojaPdf, url: string): Promise<Buffer> {
    await pagina.ir(url, tiempoPlaywrightMs);
    const error = await pagina.esperarHoja(tiempoPlaywrightMs);
    if (error) throw new ErrorSalidaPdf(`No se pudo preparar la hoja de taller: ${error}`);
    if (pagina.errores.length > 0) {
      throw new ErrorSalidaPdf(`La hoja de taller dio errores al pintarse: ${pagina.errores.join(" · ")}`);
    }
    const pdf = await pagina.pdf();
    if (pdf.subarray(0, 4).toString("ascii") !== "%PDF") throw new ErrorSalidaPdf("Chromium no devolvió un PDF válido.");
    return pdf;
  }

  async function hacer(trabajo: TrabajoPdf): Promise<Buffer> {
    if (cerrado) throw new ErrorSalidaPdf(MENSAJE_CERRADO);
    if (trabajo.sigueEsperando && !trabajo.sigueEsperando()) {
      registrar("Se salta una hoja de taller: quien la pidió ya no espera.");
      throw new ErrorSalidaPdf("Quien pidió la hoja de taller ya no espera: no se hace el PDF.");
    }
    const nav = await abrirNavegador();
    const url = urlHoja(trabajo.preparar());
    let pagina: PaginaHojaPdf;
    try {
      pagina = await conLimite(nav.abrirPagina(new URL(url).origin), tiempoCierreMs, "Chromium no abrió la página a tiempo.",
        (tarde) => void tarde.cerrar().catch(() => {}));
    } catch (error) {
      descartar(nav, "no abrió la página");
      throw fallo("No se pudo abrir una página en Chromium", error);
    }
    let colgada = false;
    try {
      return await conLimite(imprimir(pagina, url), tiempoMaximoMs, mensajeTiempo);
    } catch (error) {
      if (error instanceof ErrorTiempo) colgada = true;
      if (error instanceof Error && error.name === "TimeoutError") {
        colgada = true;
        registrar(`Tiempo agotado en Chromium: ${texto(error)}`);
        throw new ErrorTiempo(mensajeTiempo);
      }
      throw error instanceof ErrorSalidaPdf ? error : fallo("No se pudo hacer el PDF", error);
    } finally {
      if (colgada) {
        // No se espera: cerrar Chromium entero cierra también la página.
        void pagina.cerrar().catch(() => {});
        descartar(nav, "la hoja se quedó colgada");
      } else {
        const cerrada = await conLimite(pagina.cerrar(), tiempoCierreMs, "Chromium no cerró la página a tiempo.").then(
          () => true,
          (error: unknown) => {
            registrar(texto(error));
            return false;
          },
        );
        if (!cerrada) descartar(nav, "no cerró la página");
      }
    }
  }

  return {
    generar(entrada) {
      const trabajo: TrabajoPdf = typeof entrada === "string" ? { preparar: () => entrada } : entrada;
      if (cerrado) return Promise.reject(new ErrorSalidaPdf(MENSAJE_CERRADO));
      if (pendientes >= maxPendientes) return Promise.reject(new ErrorSalidaPdf(MENSAJE_COLA_LLENA));
      pendientes += 1;
      const hecho = cola.then(() => hacer(trabajo)).finally(() => {
        pendientes -= 1;
      });
      cola = hecho.catch(() => undefined);
      return hecho;
    },
    async cerrar() {
      cerrado = true;
      const actual = navegador;
      navegador = null;
      if (actual) await cerrarNavegador(actual);
    },
  };
}
