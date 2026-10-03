// Hoja de telas de toldos en HTML (fase 1): lo que le pasa el servidor a
// buildOrderPlanteamientoPdf para que Chromium imprima cada página de telas. Si algo falla,
// esa página sale con pdfkit; aquí se cuida además que un Chromium enfermo no haga esperar.

import pdfLib from 'pdf-lib';

const { PDFDocument } = pdfLib;

/** Cuánto descansa Chromium para las hojas de telas tras un fallo lento. */
export const PAUSA_TRAS_FALLO_MS = 60_000;
/** Un fallo que tarda esto o más (tiempo agotado, Chromium que no arranca) pausa Chromium. */
export const FALLO_LENTO_MS = 10_000;

/**
 * @param {object} p
 * @param {boolean} p.activa  TELAS_HTML: si es falso, las opciones van vacías (pdfkit).
 * @param {{ guardar(datos: unknown): string, borrar(id: string): void }} p.fichas
 * @param {{ generar(trabajo: object): Promise<Buffer> }} p.servicio  El Chromium compartido con remolques.
 * @param {(id: string) => string} p.url  Dirección de hoja-telas.html con su identificador.
 */
export function crearImpresoraHojaTelas({
  activa,
  fichas,
  servicio,
  url,
  registrar = (mensaje) => console.error(mensaje),
  ahora = Date.now,
  pausaMs = PAUSA_TRAS_FALLO_MS,
  falloLentoMs = FALLO_LENTO_MS
}) {
  // Si Chromium se cuelga, cada hoja espera hasta 30 s antes de caer a pdfkit. Para que los
  // PDF siguientes no esperen otra vez lo mismo, tras un fallo lento se va directo a pdfkit
  // durante un rato. Un fallo rápido no pausa: no hace esperar a nadie.
  let pausadoHasta = 0;

  /**
   * Opciones para una llamada a buildOrderPlanteamientoPdf (un PDF).
   * @param {{ codigoPedido?: string, sigueEsperando?: () => boolean }} [p]
   *   sigueEsperando: solo la vista previa, que el cliente aborta en cada cambio. Sin él
   *   («Generar archivos», reserva) se espera siempre.
   */
  function opciones({ codigoPedido = '', sigueEsperando } = {}) {
    if (!activa) return {};
    const seFue = () => Boolean(sigueEsperando && !sigueEsperando());

    // Todas las hojas del PDF en una sola impresión: Chromium tarda casi lo mismo con una que
    // con varias, y una a una se notaba en los pedidos con varios modelos.
    async function renderFabricSheets(hojas) {
      if (ahora() < pausadoHasta) throw new Error('Chromium falló hace poco: se descansa un minuto.');
      if (seFue()) throw new Error('Quien pidió el PDF ya no espera.');
      let id = null;
      const inicio = ahora();
      try {
        const pdf = await servicio.generar({
          // La ficha se guarda al salir de la cola: su minuto empieza cuando Chromium va a pedirla.
          preparar: () => (id = fichas.guardar(hojas)),
          url,
          ...(sigueEsperando ? { sigueEsperando } : {})
        });
        return { pdf, pageCounts: await paginasDeCadaHoja(pdf) };
      } catch (error) {
        if (!seFue() && ahora() - inicio >= falloLentoMs) pausadoHasta = ahora() + pausaMs;
        throw error;
      } finally {
        if (id) fichas.borrar(id);
      }
    }

    function onFabricSheetError(error, page) {
      const hoja = page ? `hoja ${page.planIndex}` : 'hojas de telas';
      registrar(`Hoja de telas en HTML del pedido ${codigoPedido || 'sin código'} (${hoja}): sale la de pdfkit. ${error?.message || error}`);
    }

    return { renderFabricSheets, onFabricSheetError };
  }

  return { opciones };
}

/**
 * Cuántas páginas ocupa cada hoja. La página web lo deja en su título («telas-paginas:1,2,1»,
 * src/client/hojaTelas/main.tsx) y Chromium copia el título al PDF.
 */
export async function paginasDeCadaHoja(pdf) {
  const titulo = (await PDFDocument.load(pdf, { updateMetadata: false })).getTitle() ?? '';
  const encontrado = /^telas-paginas:(\d+(?:,\d+)*)$/.exec(titulo.trim());
  if (!encontrado) throw new Error(`La hoja de telas impresa no dice cuántas páginas ocupa cada hoja (título «${titulo}»).`);
  return encontrado[1].split(',').map(Number);
}
