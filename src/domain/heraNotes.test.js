import { test, expect } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildOrderPlanteamientoPdf } from './planteamientoPdf.js';

// Las aclaraciones del HERA iban en su página propia («ACLARACIONES PARA TALLER»). Desde el
// 03/10/2026 van en OBSERVACIONES, en la página de estructura y en la hoja de telas, y siguen
// saliendo enteras: lo que no cabe continúa en otra página.
test('HERA imprime aclaraciones largas completas y pagina sin perder el final', async () => {
  const notes = 'TELA 6cm MÁS CORTA EN LADO IZQ MIRANDO POR DENTRO. ' + 'COMPROBAR TORNILLOS ROSCA-CHAPA. '.repeat(100) + 'FIN DE LA ACLARACION';
  const order = { orderCode: 'AR2603981', notes: 'OBSERVACION DE TELA DEL PEDIDO', awnings: [{ id: 'a', model: 'HERA', submodel: 'HERA 56 MAQUINA', structureNotes: notes, heraInteriorFace: 'DERECHO' }] };
  const pdf = await buildOrderPlanteamientoPdf({ order, calculation: { ofs: [{ awningId: 'a', calculation: { model: 'HERA', fabricWidth: 284.2, fabricDrop: 288 } }] } });
  const doc = await getDocument({ data: new Uint8Array(pdf) }).promise;
  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    pages.push({ a4: page.getViewport({ scale: 1 }).width > 700, text: (await page.getTextContent()).items.map(item => item.str).join(' ') });
  }
  // Enteras en la estructura (A5) y enteras otra vez en la hoja de telas (A4), cada una con
  // sus continuaciones.
  for (const a4 of [false, true]) {
    const sheet = pages.filter((page) => page.a4 === a4);
    const text = sheet.map((page) => page.text).join(' ');
    expect(sheet.length).toBeGreaterThan(1);
    expect(text).toContain('6cm MÁS CORTA');
    expect(text).toContain('FIN DE LA ACLARACION');
    // Las cien frases, contadas por palabras que pdfkit no parte al cambiar de línea.
    expect(text.match(/COMPROBAR/g)).toHaveLength(100);
    expect(text.match(/TORNILLOS/g)).toHaveLength(100);
    expect(text).toContain('Observaciones (continuación)');
    expect(text).not.toContain('Planteamiento HERA');
    expect(text).not.toContain('VER NOTAS COMPLETAS');
  }
  const fabric = pages.filter((page) => page.a4).map((page) => page.text).join(' ');
  expect(fabric).toContain('OBSERVACION DE TELA DEL PEDIDO');
  expect(fabric).toContain('A: ACLARACIONES: TELA 6cm MÁS CORTA');
});
