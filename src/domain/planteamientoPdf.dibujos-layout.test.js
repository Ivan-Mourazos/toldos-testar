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
    const box = item => {
      const [a, b, c, d, e, f] = item.transform;
      const along = Math.hypot(a, b);
      const across = Math.hypot(c, d);
      const corners = [0, item.width].flatMap(width => [0, item.height].map(height => [
        e + a / along * width + c / across * height,
        page.view[3] - (f + b / along * width + d / across * height)
      ]));
      return { left: Math.min(...corners.map(point => point[0])), right: Math.max(...corners.map(point => point[0])), top: Math.min(...corners.map(point => point[1])), bottom: Math.max(...corners.map(point => point[1])) };
    };
    await check({ items, top, bottom, box, operators: await page.getOperatorList() });
  } finally { await loading.destroy(); }
}

test.each(variants)('$awning.model / $id: todos los rótulos caben en el recuadro', async variant => {
  const [awning] = normalizeOrder({ awnings: [exampleAwning(variant)] }).awnings;
  await inspect(awning, ({ items, box }) => {
    for (const item of items.filter(item => box(item).top > 30)) {
      const bounds = box(item);
      expect(bounds.left, `${item.str}: margen izquierdo`).toBeGreaterThanOrEqual(7);
      expect(bounds.right, `${item.str}: margen derecho`).toBeLessThanOrEqual(251);
      expect(bounds.bottom, `${item.str}: no sale bajo el recuadro`).toBeLessThanOrEqual(335);
    }
  });
});

test.each([[363, 450], [484, 300]])('el recuadro %s × %s conserva la proporción de letras y dibujo', async (width, height) => {
  const [awning] = normalizeOrder({ awnings: [exampleAwning(webDrawingVariants('CORTINA')[0])] }).awnings;
  let original;
  await inspect(awning, ({ items }) => { original = items.find(item => item.str === 'H. VENTANA:'); });
  await inspect(awning, ({ items, box }) => {
    const scaled = items.find(item => item.str === 'H. VENTANA:');
    expect(scaled.height / original.height).toBeCloseTo(Math.min(width / 242, height / 300));
    expect(Math.hypot(scaled.transform[0], scaled.transform[1]) / scaled.height, 'letras sin estirar').toBeCloseTo(Math.hypot(original.transform[0], original.transform[1]) / original.height);
    for (const item of items.filter(item => box(item).top > 30)) {
      expect(box(item).left).toBeGreaterThanOrEqual(7);
      expect(box(item).right).toBeLessThanOrEqual(width + 9);
      expect(box(item).bottom).toBeLessThanOrEqual(height + 35);
    }
  }, { width, height });
});

// El Iris dibuja el escuadrado con las proporciones del hueco (Iván, 08/10/2026): el toldo, en
// amarillo, llena el ancho o el alto según sea más ancho o más alto.
const bodies = {
  CORTINA: { fill: '#fbfcfc', fits: panel => panel.width >= 242 * 0.7 && panel.height >= 300 * 0.53 },
  'CAMBIO CORTINA': { fill: '#fbfcfc', fits: panel => panel.width >= 242 * 0.7 && panel.height >= 300 * 0.53 },
  IRIS: { fill: '#fff8df', fits: panel => panel.width >= 242 * 0.6 || panel.height >= 300 * 0.5 }
};
test.each(Object.keys(bodies))('%s: el cuerpo aprovecha el espacio de la miniatura', async model => {
  const variant = webDrawingVariants(model).find(item => item.webDrawing);
  const [awning] = normalizeOrder({ awnings: [exampleAwning(variant)] }).awnings;
  await inspect(awning, ({ operators }) => {
    let fill = '';
    const panels = [];
    operators.fnArray.forEach((operation, i) => {
      if (operation === OPS.setFillRGBColor) fill = operators.argsArray[i][0];
      if (operation === OPS.constructPath && fill === bodies[model].fill) {
        const [left, top, right, bottom] = operators.argsArray[i][2];
        panels.push({ width: right - left, height: bottom - top });
      }
    });
    expect(panels.some(bodies[model].fits), 'cuerpo legible, no una franja pequeña sobre una caja vacía').toBe(true);
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
