import pdfLib from 'pdf-lib';

const { PDFDocument } = pdfLib;

/**
 * Flujo del DWG, fase 4 en toldos (Iván, 25/10/2026: «guardar los cads y sumarle el pdf del planteamiento»): las hojas de
 * `delante` (las presentaciones del DWG), en orden, antes de las de `pdf` (el planteamiento de la web). Se trabaja sobre
 * el propio `pdf`, así conserva su adjunto con los datos del pedido (extractReviewPackageFromPdf).
 */
export async function conHojasDelante(pdf, delante) {
  if (!delante.length) return pdf;
  const base = await PDFDocument.load(pdf);
  await insertarHojasDelante(base, delante);
  return Buffer.from(await base.save());
}

export async function insertarHojasDelante(base, delante) {
  let posicion = 0;
  for (const otro of delante) {
    const origen = await PDFDocument.load(otro);
    for (const hoja of await base.copyPages(origen, origen.getPageIndices())) base.insertPage(posicion++, hoja);
  }
}
