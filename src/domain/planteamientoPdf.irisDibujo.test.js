import { describe, expect, test } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { buildOrderPlanteamientoPdf } from './planteamientoPdf.js';
import { normalizeOrder } from './validation.js';
import { calculateOrder } from './rules.js';

// Iván, 08/10/2026: el dibujo del escuadrado de la tarjeta es el del planteamiento, para que el
// taller vea cómo queda el toldo en el hueco sin dibujarlo en CAD.
async function pdfText(awning) {
  const order = normalizeOrder({
    orderCode: 'AR2609999', customer: 'PRUEBA', technician: 'IVÁN', sameFabric: true, structureColor: 'BLANCO',
    fabric: 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA|||ACR', awnings: [awning]
  });
  const calculation = calculateOrder(order);
  const buffer = await buildOrderPlanteamientoPdf({ order, calculation, htmlStructure: false, htmlFabric: false });
  const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
  const texts = [];
  for (let n = 1; n <= document.numPages; n += 1) {
    const page = await document.getPage(n);
    texts.push((await page.getTextContent()).items.map((item) => item.str).join(' '));
  }
  return { text: texts.join(' '), calculation: calculation.ofs[0].calculation };
}

const base = {
  id: 'a', of: '0239999', model: 'IRIS', units: 1, submodel: 'IRIS 130 CON COFRE', irisGuideType: 'ESTÁNDAR',
  irisGuideFixing: 'PARED', irisBoxShape: 'REDONDO', device: 'MOTOR', machineSide: 'M.F.DER', placement: 'FRONTAL',
  structureColor: 'BLANCO', curtainHasWindow: false, rotFabric: 'NO'
};

describe('dibujo del escuadrado del Iris en el planteamiento', () => {
  test('el CAD de referencia: toldo, corte de cada guía con su hueco, desfases y exagerado', async () => {
    const { text, calculation } = await pdfText({
      ...base, irisAssumeSquare: false, reglasModificadas: true,
      irisFrontTop: 355, irisFrontBottom: 350, irisExitLeft: 400, irisExitRight: 405, irisDiagonal1: 533.1, irisDiagonal2: 537
    });
    expect(text).toContain('TOLDO 350,1 × 400');
    expect(text).toContain(`MFI: CORTE ${String(calculation.guideLeftLength).replace('.', ',')} · HUECO 400`);
    expect(text).toContain(`MFD: CORTE ${String(calculation.guideRightLength).replace('.', ',')} · HUECO 405`);
    expect(text).toContain('D1 533,1');
    expect(text).toContain('2,6 CM');
    expect(text).toMatch(/DESFASES EXAGERADOS ×\d+/);
    expect(text).toContain('COMPROBAR DIAGONALES · CREMALLERA XL');
  });

  test('escuadrado: el rectángulo, sin desfases ni exagerado', async () => {
    const { text } = await pdfText({ ...base, irisAssumeSquare: true, irisFrontTop: 300, irisExitLeft: 250 });
    expect(text).toContain('TOLDO 300 × 250');
    expect(text).not.toMatch(/DESFASES EXAGERADOS/);
  });
});
