import { expect, it } from 'vitest';
import pdfLib from 'pdf-lib';
import revision from './corteLona/fixtures/revision-AR2604784.json' with { type: 'json' };
import { buildOrderPlanteamientoPdf, buildPlanteamientoPlan } from './planteamientoPdf.js';
import { calculateOrder } from './rules.js';
import { extractReviewPackageFromPdf } from '../workflow.js';

// Toldos de PVC con el corte confirmado (Iván, 25/10/2026): la hoja de telas no se imprime, ya son los CAD; la estructura sí.
it('sin hoja de telas para los toldos que van en el CAD, con su estructura y los datos del pedido dentro', async () => {
  const order = structuredClone(revision.order);
  const calculation = calculateOrder(order);
  const plan = buildPlanteamientoPlan(order, calculation, { sinHojaTelas: () => true });
  expect(plan.fabricPages).toEqual([]);
  expect(plan.structureEntries).toHaveLength(1);
  const review = { ...revision, order };
  const entero = await buildOrderPlanteamientoPdf({ order, calculation, review });
  const sin = await buildOrderPlanteamientoPdf({ order, calculation, review, sinHojaTelas: (_t, i) => i === 0 });
  const hojas = async (pdf) => (await pdfLib.PDFDocument.load(pdf)).getPageCount();
  expect(await hojas(sin)).toBe(await hojas(entero) - 1);
  expect((await extractReviewPackageFromPdf(Buffer.from(sin))).orderCode).toBe(revision.orderCode);
});
