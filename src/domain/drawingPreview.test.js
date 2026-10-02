import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exampleAwning, webDrawingVariants } from './drawingCatalog.js';
import { modelNames } from './modelBehavior.js';
import { buildFabricDiagramPreviewPdf } from './planteamientoPdf.js';
import { normalizeOrder } from './validation.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const ejemplo = (variant) => normalizeOrder({ orderCode: 'EJEMPLO', awnings: [exampleAwning(variant)] }).awnings[0];
const paginas = (pdf) => (pdf.toString('latin1').match(/\/Type \/Page\b/g) ?? []).length;

describe('miniaturas de «Lo que sale hoy»', () => {
  it('las ventanas del ejemplo no producen medidas negativas', async () => {
    for (const variant of webDrawingVariants('CORTINA').filter(v => v.awning.curtainHasWindow)) {
      const pdf = await buildFabricDiagramPreviewPdf({ awning: ejemplo(variant) });
      const task = getDocument({ data: new Uint8Array(pdf) });
      try {
        const doc = await task.promise;
        const content = await (await doc.getPage(1)).getTextContent();
        expect(content.items.map(item => item.str).join(' ')).not.toContain('-18');
      } finally { await task.destroy(); }
    }
  });

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
