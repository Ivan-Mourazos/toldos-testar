import { expect, it } from 'vitest';
import pdfLib from 'pdf-lib';
import { extractReviewPackageFromPdf } from '../workflow.js';
import { conHojasDelante } from './unirPdf.js';

const { PDFDocument } = pdfLib;
/** Un PDF con una hoja por ancho (para saber cuál es cuál) y, si se pide, los datos del pedido adjuntos. */
async function pdf(anchos, adjunto) {
  const doc = await PDFDocument.create();
  for (const ancho of anchos) doc.addPage([ancho, 400]);
  if (adjunto) await doc.attach(Buffer.from(JSON.stringify(adjunto)), 'AR2600097.toldos.json', { mimeType: 'application/json' });
  return doc.save();
}

it('pone las presentaciones del CAD delante del planteamiento y conserva los datos del pedido', async () => {
  const review = { kind: 'toldos-testar-review', orderCode: 'AR2600097', order: { orderCode: 'AR2600097' } };
  const planteamiento = await pdf([500, 501], review);
  expect((await extractReviewPackageFromPdf(Buffer.from(planteamiento))).orderCode).toBe('AR2600097');
  const unido = await conHojasDelante(planteamiento, [await pdf([300]), await pdf([310, 311])]);
  const doc = await PDFDocument.load(unido);
  expect(doc.getPages().map((p) => Math.round(p.getWidth()))).toEqual([300, 310, 311, 500, 501]);
  expect(await extractReviewPackageFromPdf(unido)).toEqual(review);
  expect(await conHojasDelante(planteamiento, [])).toBe(planteamiento);
});
