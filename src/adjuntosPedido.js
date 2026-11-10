import pdfLib from 'pdf-lib';

/** PDFKit usa un árbol Kids; pdf-lib añade Names en la raíz. Se conserva un único adjunto por nombre. */
function sustituirAdjunto(documento, nombre) {
  const { PDFName, PDFDict, PDFArray } = pdfLib;
  const nombres = documento.catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
  const arbol = nombres?.lookupMaybe(PDFName.of('EmbeddedFiles'), PDFDict);
  if (!arbol) return;
  const entradas = [];
  const retirados = new Set();
  function leer(nodo) {
    const hojas = nodo.lookupMaybe(PDFName.of('Names'), PDFArray);
    for (let i = 0; hojas && i < hojas.size(); i += 2) {
      const clave = hojas.lookup(i), referencia = hojas.get(i + 1);
      if (clave.decodeText() === nombre) retirados.add(referencia.toString());
      else entradas.push([clave, referencia]);
    }
    const hijos = nodo.lookupMaybe(PDFName.of('Kids'), PDFArray);
    for (let i = 0; hijos && i < hijos.size(); i++) leer(hijos.lookup(i, PDFDict));
  }
  leer(arbol);
  entradas.sort((a, b) => a[0].decodeText().localeCompare(b[0].decodeText()));
  nombres.set(PDFName.of('EmbeddedFiles'), documento.context.obj({ Names: entradas.flat() }));
  const asociados = documento.catalog.lookupMaybe(PDFName.of('AF'), PDFArray);
  for (let i = (asociados?.size() ?? 0) - 1; i >= 0; i--) {
    if (retirados.has(asociados.get(i).toString())) asociados.remove(i);
  }
}

/** Se adjunta al final, después de unir o imprimir páginas: todas las copias conservan el paquete completo. */
export async function adjuntarPedido(pdf, pedido, sufijo) {
  const documento = await pdfLib.PDFDocument.load(pdf, { updateMetadata: false });
  const nombre = `${pedido.orderCode}.${sufijo}.json`;
  sustituirAdjunto(documento, nombre);
  await documento.attach(Buffer.from(`${JSON.stringify(pedido, null, 2)}\n`, 'utf8'), nombre, {
    mimeType: 'application/json', description: `Datos editables del pedido ${pedido.orderCode}`,
  });
  return Buffer.from(await documento.save());
}
