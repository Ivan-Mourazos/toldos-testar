import pdfLib from 'pdf-lib';

/** Se adjunta al final, después de unir o imprimir páginas: todas las copias conservan el paquete completo. */
export async function adjuntarPedido(pdf, pedido, sufijo) {
  const documento = await pdfLib.PDFDocument.load(pdf, { updateMetadata: false });
  await documento.attach(Buffer.from(`${JSON.stringify(pedido, null, 2)}\n`, 'utf8'), `${pedido.orderCode}.${sufijo}.json`, {
    mimeType: 'application/json', description: `Datos editables del pedido ${pedido.orderCode}`,
  });
  return Buffer.from(await documento.save());
}
