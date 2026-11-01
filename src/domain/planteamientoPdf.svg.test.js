import { expect, test, vi } from 'vitest';
import { crearLienzoSvg } from './dibujoSvg.js';
import { models } from './catalog.js';
import { exampleAwning, webDrawingVariants } from './drawingCatalog.js';
import { buildFabricDiagramSvg, buildOrderPlanteamientoPdf, getFabricPatternDiagram, SVG_FABRIC_DIAGRAMS } from './planteamientoPdf.js';
import { normalizeOrder } from './validation.js';
import { calculateOrder } from './rules.js';
import { fakeSheets, pageTexts } from './pdfTestHelpers.js';
import { extractReviewPackageFromPdf } from '../workflow.js';

vi.mock('./dibujoSvg.js', async importar => {
  const real = await importar();
  return { ...real, crearLienzoSvg: vi.fn(real.crearLienzoSvg) };
});

const variantes = models.flatMap(({ code }) => webDrawingVariants(code).filter(v => v.webDrawing));
test.each(variantes)('el catálogo completo prepara SVG: $awning.model / $id', (variante) => {
  const [awning] = normalizeOrder({ awnings: [exampleAwning(variante)] }).awnings;
  const svg = buildFabricDiagramSvg({ diagram: getFabricPatternDiagram(awning), awning });
  expect(svg.nodes.length).toBeGreaterThan(5);
  expect(svg.nodes.every(n => n.tag === 'path' || n.tag === 'text')).toBe(true);
});

test.each(SVG_FABRIC_DIAGRAMS)('también los esquemas específicos conservados: %s', (diagram) => {
  const svg = buildFabricDiagramSvg({ diagram, awning: { model: 'CAMBIO TELA', width: 400, projection: 250 } });
  expect(svg.nodes.length).toBeGreaterThan(5);
});

const awning = { id: 'a', model: 'CAMBIO TELA', of: '0230194', units: 1, width: 337, projection: 225 };
const order = normalizeOrder({ orderCode: 'SVG-1', fabric: 'ACRILI2170P120|||120|||NEGRO', awnings: [awning] });
const calculation = calculateOrder(order);

test('con SVG no se incrusta encima el dibujo de pdfkit y se conserva el adjunto reabrible', async () => {
  let hojas;
  const imprimir = fakeSheets();
  const review = { kind: 'toldos-testar-review', orderCode: order.orderCode, order, version: 1 };
  const pdf = await buildOrderPlanteamientoPdf({ order, calculation, review, htmlStructure: false, htmlDiagrams: true,
    renderSheets: sheets => { hojas = sheets; return imprimir(sheets); } });
  expect(hojas[0].diagramSvg.nodes.length).toBeGreaterThan(20);
  // La impresora falsa no pinta SVG: esta ausencia demuestra que no se superpone pdfkit.
  expect((await pageTexts(pdf)).at(-1)).not.toMatch(/BASTILLA|VARILLA/);
  expect(await extractReviewPackageFromPdf(pdf)).toEqual(review);
});

test('al apagar dibujos SVG sigue encajándose el dibujo de pdfkit', async () => {
  let hojas;
  const imprimir = fakeSheets();
  const pdf = await buildOrderPlanteamientoPdf({ order, calculation, htmlStructure: false, htmlDiagrams: false,
    renderSheets: sheets => { hojas = sheets; return imprimir(sheets); } });
  expect(hojas[0].diagramSvg).toBeUndefined();
  expect((await pageTexts(pdf)).at(-1)).toMatch(/BASTILLA|VARILLA/);
});

test('una variante aún no migrada y una imagen del taller quedan en pdfkit', () => {
  expect(buildFabricDiagramSvg({ diagram: 'FUTURO' })).toBeNull();
  expect(buildFabricDiagramSvg({ diagram: 'GENERAL', awning: { fabricImage: 'imagen' } })).toBeNull();
});

test('si preparar un SVG falla, esa hoja lleva el dibujo pdfkit', async () => {
  vi.mocked(crearLienzoSvg).mockImplementationOnce(() => { throw new Error('Error simulado del lienzo SVG'); });
  const errores = [];
  const pdf = await buildOrderPlanteamientoPdf({ order, calculation, htmlStructure: false, htmlDiagrams: true,
    renderSheets: fakeSheets(), onSheetError: error => errores.push(error.message) });
  expect(errores).toContain('Error simulado del lienzo SVG');
  expect((await pageTexts(pdf)).at(-1)).toMatch(/BASTILLA|VARILLA/);
});
