import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exampleAwning, webDrawingVariants } from './drawingCatalog.js';
import { modelNames } from './modelBehavior.js';
import { buildFabricDiagramPreviewPdf } from './planteamientoPdf.js';
import { normalizeOrder } from './validation.js';

const ejemplo = (variant) => normalizeOrder({ orderCode: 'EJEMPLO', awnings: [exampleAwning(variant)] }).awnings[0];
const paginas = (pdf) => (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;

describe('miniaturas de «Lo que sale hoy»', () => {
  it('cada variante con dibujo de la web de cada modelo sale en una hoja', async () => {
    for (const model of modelNames) {
      for (const variant of webDrawingVariants(model).filter((v) => v.webDrawing)) {
        const pdf = await buildFabricDiagramPreviewPdf({ awning: ejemplo(variant) });
        expect(pdf.subarray(0, 5).toString(), `${model} · ${variant.id}`).toBe('%PDF-');
        expect(paginas(pdf), `${model} · ${variant.id}`).toBe(1);
      }
    }
  }, 60000);

  it('es el dibujo de la web: no usa la imagen puesta en el toldo', async () => {
    const image = 'data:image/png;base64,' + readFileSync(new URL('./assets/tgm-logo.png', import.meta.url)).toString('base64');
    const awning = ejemplo(webDrawingVariants('ENROLLABLE')[0]);
    const pdf = await buildFabricDiagramPreviewPdf({ awning: { ...awning, fabricImage: image } });
    expect(pdf.toString('latin1')).not.toContain('/Subtype /Image');
  });
});
