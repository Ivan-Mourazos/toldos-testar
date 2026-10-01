import pdfLib from "pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { TIPO_PEDIDO_REMOLQUES, type PedidoRemolques } from "./tipos.ts";

// Los datos del pedido dentro de su hoja de taller (fase 5), como los PDF de toldos llevan su
// PEDIDO.toldos.json: con el PDF basta para recuperar o reutilizar el pedido. Chromium no sabe
// adjuntar ficheros al imprimir, así que se añaden después con pdf-lib.

// Import por defecto: pdf-lib es CommonJS y así funciona igual en Node, en vitest y con tsc.
const { PDFDocument } = pdfLib;

export const SUFIJO_ADJUNTO = ".remolques.json";
export const nombreAdjunto = (orderCode: string) => `${orderCode}${SUFIJO_ADJUNTO}`;

type Adjunto = { filename?: string; content?: Uint8Array };

export async function adjuntarDatosPedido(pdf: Uint8Array, pedido: PedidoRemolques, ahora = new Date()): Promise<Buffer> {
  const documento = await PDFDocument.load(pdf, { updateMetadata: false });
  await documento.attach(Buffer.from(`${JSON.stringify(pedido, null, 2)}\n`, "utf8"), nombreAdjunto(pedido.orderCode), {
    mimeType: "application/json",
    description: `Datos del pedido de remolques ${pedido.orderCode}`,
    creationDate: ahora,
    modificationDate: ahora,
  });
  return Buffer.from(await documento.save());
}

export async function leerDatosPedido(pdf: Uint8Array): Promise<PedidoRemolques> {
  const tarea = getDocument({ data: new Uint8Array(pdf) });
  const documento = await tarea.promise;
  try {
    const adjuntos = (await documento.getAttachments()) as Map<string, Adjunto> | Record<string, Adjunto> | null;
    const entradas = adjuntos instanceof Map ? [...adjuntos.entries()] : Object.entries(adjuntos ?? {});
    const encontrado = entradas.find(([, item]) => String(item.filename ?? "").toLowerCase().endsWith(SUFIJO_ADJUNTO));
    // Según la versión de pdfjs el contenido llega en el adjunto o hay que pedirlo por su nombre.
    const contenido = encontrado ? (encontrado[1].content ?? (await documento.getAttachmentContent(encontrado[0]))) : null;
    if (!contenido) throw new Error("El PDF no lleva los datos del pedido de remolques.");
    const datos = JSON.parse(Buffer.from(contenido).toString("utf8")) as Partial<PedidoRemolques> | null;
    if (datos?.kind !== TIPO_PEDIDO_REMOLQUES || !datos.orderCode || !Array.isArray(datos.elementos)) {
      throw new Error("Los datos que lleva el PDF no son de un pedido de remolques.");
    }
    return datos as PedidoRemolques;
  } finally {
    await tarea.destroy();
  }
}
