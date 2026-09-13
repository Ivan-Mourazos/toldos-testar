import { test, expect } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildOrderPlanteamientoPdf } from './planteamientoPdf.js';
test('HERA imprime aclaraciones largas completas y pagina sin perder el final', async () => {
  const notes = 'TELA 6cm MÁS CORTA EN LADO IZQ MIRANDO POR DENTRO. ' + 'COMPROBAR TORNILLOS ROSCA-CHAPA. '.repeat(100) + 'FIN DE LA ACLARACION';
  const order = { orderCode: 'AR2603981', awnings: [{ id: 'a', model: 'HERA', submodel: 'HERA 56 MAQUINA', structureNotes: notes, heraInteriorFace: 'DERECHO' }] };
  const pdf = await buildOrderPlanteamientoPdf({ order, calculation: { ofs: [{ awningId: 'a', calculation: { model: 'HERA', fabricWidth: 284.2, fabricDrop: 288 } }] } });
  const doc = await getDocument({ data: new Uint8Array(pdf) }).promise;
  expect(doc.numPages).toBeGreaterThan(1);
  let text = '';
  for (let i=1; i<=doc.numPages; i++) text += (await (await doc.getPage(i)).getTextContent()).items.map(item => item.str).join(' ');
  expect(text).toContain('6cm MÁS CORTA'); expect(text).toContain('FIN DE LA ACLARACION');
});
