import { expect, test } from 'vitest';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { models } from './catalog.js';
import { exampleAwning, webDrawingVariants } from './drawingCatalog.js';
import { buildFabricDiagramPreviewPdf } from './planteamientoPdf.js';
import { normalizeOrder } from './validation.js';

const variants = models.flatMap(({ code }) => webDrawingVariants(code).filter(variant => variant.webDrawing));
async function inspect(awning, check, options = {}) {
  const buffer = await buildFabricDiagramPreviewPdf({ awning, ...options });
  const loading = getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loading.promise;
  try {
    const page = await pdf.getPage(1);
    const items = (await page.getTextContent()).items.filter(item => item.str?.trim());
    const top = item => page.view[3] - item.transform[5] - item.height;
    const bottom = item => page.view[3] - item.transform[5];
    await check({ items, top, bottom, operators: await page.getOperatorList() });
  } finally { await loading.destroy(); }
}

test.each(variants)('$awning.model / $id: todos los rótulos caben en el recuadro', async variant => {
  const [awning] = normalizeOrder({ awnings: [exampleAwning(variant)] }).awnings;
  await inspect(awning, ({ items, top, bottom }) => {
    for (const item of items.filter(item => top(item) > 30 && Math.abs(item.transform[1]) < 0.1)) {
      expect(item.transform[4], `${item.str}: margen izquierdo`).toBeGreaterThanOrEqual(7);
      expect(item.transform[4] + item.width, `${item.str}: margen derecho`).toBeLessThanOrEqual(251);
      expect(bottom(item), `${item.str}: no sale bajo el recuadro`).toBeLessThanOrEqual(335);
    }
  });
});

test.each(['CORTINA', 'CAMBIO CORTINA', 'IRIS'])('%s: el cuerpo aprovecha el espacio de la miniatura', async model => {
  const variant = webDrawingVariants(model).find(item => item.webDrawing);
  const [awning] = normalizeOrder({ awnings: [exampleAwning(variant)] }).awnings;
  await inspect(awning, ({ operators }) => {
    let fill = '';
    const panels = [];
    operators.fnArray.forEach((operation, i) => {
      if (operation === OPS.setFillRGBColor) fill = operators.argsArray[i][0];
      if (operation === OPS.constructPath && fill === '#fbfcfc') {
        const [left, top, right, bottom] = operators.argsArray[i][2];
        panels.push({ width: right - left, height: bottom - top });
      }
    });
    expect(panels.some(panel => panel.width >= 242 * 0.7 && panel.height >= 300 * 0.53), 'cuerpo legible, no una franja pequeña sobre una caja vacía').toBe(true);
  });
});

test('Toldo con velcro: varilla arriba y pieza A de bamba debajo, como la imagen girada del maestro', async () => {
  await inspect({ model: 'IRIS', fabricDiagramOverride: 'TOLDO-VELCRO', valanceHeight: 20 }, ({ items, top, bottom }) => {
    const upper = items.find(item => item.str === 'VARILLA NEGRA (5,09) EN PVC');
    const white = items.find(item => item.str === 'VARILLA BLANCA (5,5)');
    const piece = items.find(item => item.str === 'A');
    expect(Math.abs(upper.transform[1]), 'la varilla negra va horizontal arriba').toBeLessThan(0.1);
    expect(top(white)).toBeGreaterThan(bottom(upper));
    expect(top(piece), 'la bamba está bajo la cortina, no al lado').toBeGreaterThan(bottom(white));
  });
});

test('Cambio enrollable: varilla plana arriba y pletina de 30 × 6 abajo', async () => {
  await inspect({ model: 'ENROLLABLE', fabricDiagramOverride: 'CAMBIO ENROLLABLE' }, ({ items, top, bottom }) => {
    const upper = items.find(item => item.str.includes('VARILLA PLANA'));
    const lower = items.find(item => item.str.includes('E. PLETINA'));
    expect(Math.abs(upper.transform[1]), 'la varilla plana va horizontal arriba').toBeLessThan(0.1);
    expect(Math.abs(lower.transform[1]), 'la pletina va horizontal abajo').toBeLessThan(0.1);
    expect(top(lower)).toBeGreaterThan(bottom(upper));
  });
});
