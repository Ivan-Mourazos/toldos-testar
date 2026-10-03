// Ayudas comunes de las pruebas del PDF del planteamiento (hoja de telas y de estructura).
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import pdfLib from 'pdf-lib';

const { PDFDocument } = pdfLib;

/** Página A4 y A5 apaisadas, en puntos. */
const A4 = [841.89, 595.28];
const A5 = [595.28, 419.53];

/**
 * Imita a Chromium: todas las hojas en un solo PDF y cuántas páginas ocupa cada una
 * (`counts[i]`, 1 si no se dice). Cada página lleva su número dentro de la hoja (desde 1):
 * «HOJA HTML n PLAN i» las de telas (A4; i = su índice en el plan) y
 * «HOJA ESTRUCTURA n TOLDO i» las de estructura (A5; i = structureIndex).
 */
export function fakeSheets(counts = []) {
  return async (sheets) => {
    const doc = await PDFDocument.create();
    const pageCounts = sheets.map((_, index) => counts[index] ?? 1);
    sheets.forEach((sheet, index) => {
      const estructura = sheet.kind === 'estructura';
      for (let i = 0; i < pageCounts[index]; i += 1) {
        const texto = estructura
          ? `HOJA ESTRUCTURA ${i + 1} TOLDO ${sheet.structureIndex}`
          : `HOJA HTML ${i + 1} PLAN ${sheet.planIndex}`;
        doc.addPage(estructura ? A5 : A4).drawText(texto, { x: 200, y: 200, size: 10 });
      }
    });
    return { pdf: Buffer.from(await doc.save()), pageCounts };
  };
}

/** El texto de cada página del PDF. */
export async function pageTexts(pdf) {
  const task = getDocument({ data: new Uint8Array(pdf) });
  const doc = await task.promise;
  try {
    const texts = [];
    for (let n = 1; n <= doc.numPages; n += 1) texts.push((await (await doc.getPage(n)).getTextContent()).items.map((item) => item.str).join(' '));
    return texts;
  } finally { await task.destroy(); }
}

/** «A4» o «A5» por cada página del PDF. */
export async function pageSizes(pdf) {
  const doc = await PDFDocument.load(pdf);
  return doc.getPages().map((page) => (page.getWidth() > 700 ? 'A4' : 'A5'));
}

export const heraAwning = { id: 'h', of: '0231000', model: 'HERA', submodel: 'HERA 56 MAQUINA', heraJoin: 'NINGUNO', heraBottomFinish: 'VARILLA BLANCA', heraInteriorFace: 'DERECHO', heraChainColor: 'BLANCO', units: 1, width: 163.5, projection: 165, height: 230 };
