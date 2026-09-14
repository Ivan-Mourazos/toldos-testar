import { readFileSync } from 'node:fs';
import { describe, test, expect } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { calculateOrder } from './rules.js';
import { buildFinalRows } from './reservationWorkbook.js';
import { buildOrderPlanteamientoPdf, buildPlanteamientoPlan } from './planteamientoPdf.js';

const baseAwning = { id: 'a', of: '0230001', model: 'BAMBALINA', units: 1, width: 300, projection: 0, valanceHeight: 30, valanceCurve: 'RECTA' };
const baseOrder = { orderCode: 'PRUEBA-BAMBA', fabric: 'ACR NEGRO', awnings: [baseAwning] };
async function pages(order) {
  const calculation = calculateOrder(order);
  const task = getDocument({ data: new Uint8Array(await buildOrderPlanteamientoPdf({ order, calculation })) });
  const pdf = await task.promise;
  try {
    const text = [];
    for (let i = 1; i <= pdf.numPages; i++) text.push((await (await pdf.getPage(i)).getTextContent()).items.map(item => item.str).join(' '));
    return text;
  } finally { await task.destroy(); }
}
describe('Bambalina para taller', () => {
  test.each([[0, 30], [5, 35], [8, 38]])('el corte del dibujo respeta el remate global %s', async (extra, expected) => {
    const [text] = await pages({ ...baseOrder, parameters: { fabricJobs: { valanceExtraCm: extra } } });
    expect(text).toContain('CORTE ' + expected + ' CM');
    expect(text).toContain('ALTO TERMINADO');
    expect(text).toContain('VARILLA BLANCA');
    expect(text).toContain('BASTILLA');
  });
  test('distingue corte de frente y alto con una excepción individual', async () => {
    const [text] = await pages({ ...baseOrder, awnings: [{ ...baseAwning, reglasModificadas: true, fabricJobValanceExtraCm: 12, fabricJobWidthAdjustmentCm: -2 }] });
    expect(text).toContain('CORTE 42 CM');
    expect(text).toContain('298,0');
    expect(text).toContain('ALTO TERMINADO 30 CM');
  });
  test('dos bambalinas de misma curva conservan su material y corte propios', async () => {
    const order = { ...baseOrder, sameFabric: false, awnings: [
      { ...baseAwning, fabric: 'ACR NEGRO' },
      { ...baseAwning, id: 'b', fabric: 'PVC-AUDIT|||300|||PVC VERDE DE PRUEBA|||PVC', reglasModificadas: true, fabricJobValanceExtraCm: 8 }
    ] };
    expect(buildPlanteamientoPlan(order, calculateOrder(order)).fabricPages).toHaveLength(2);
    const text = await pages(order);
    expect(text[0]).toContain('CORTE 35 CM');
    expect(text[0]).not.toContain('PVC VERDE DE PRUEBA');
    expect(text[1]).toContain('CORTE 38 CM');
    expect(text[1]).toContain('PVC VERDE DE PRUEBA');
    expect(text[1]).not.toContain('ACRÍLICO');
  });
  test('la imagen sustituta conserva medidas, tejido y notas fuera del dibujo', async () => {
    const fabricImage = 'data:image/png;base64,' + readFileSync(new URL('./assets/tgm-logo.png', import.meta.url)).toString('base64');
    const [text] = await pages({ ...baseOrder, parameters: { fabricJobs: { valanceExtraCm: 8 } }, awnings: [{ ...baseAwning, fabricImage, fabricNotes: 'ALINEAR TEXTO DEL CLIENTE', structureNotes: 'COMPROBAR REMATE' }] });
    expect(text).toContain('SALIDA');
    expect(text).toContain('38,0');
    expect(text).toContain('MATERIAL');
    expect(text).toContain('ALINEAR TEXTO DEL CLIENTE');
    expect(text).toContain('COMPROBAR REMATE');
    expect(text).toContain('VARILLA BLANCA');
    expect(text).toContain('BASTILLAS LATERALES');
  });
  test('mantiene el formato anterior con hasta cuatro bambalinas compatibles por página', async () => {
    const order = { ...baseOrder, awnings: Array.from({ length: 5 }, (_, i) => ({ ...baseAwning, id: String(i), width: 300 + i })) };
    const plan = buildPlanteamientoPlan(order, calculateOrder(order));
    expect(plan.fabricPages.map(page => page.entries.length)).toEqual([4, 1]);
    const text = await pages(order);
    expect(text).toHaveLength(2);
    expect(text[0]).toContain('DATOS BÁSICOS');
    expect(text[0]).toContain('ROTULACIÓN');
    expect(text[0]).not.toContain('FRENTE TERMINADO');
  });
});

// Medidas de los Excel de OT leídos el 14/09/2026. No unificar las OF del 4111: discrepancia pendiente.
describe('Bambalina: históricos y redondeo confirmado por OT', () => {
  test.each([
    ['AR2604031', '0231362', 379.5, 25, 'ACR AZUL', 30, 1.2, 1.5],
    ['AR2604111', '0231486', 419.5, 20, 'ACR INTEGRAL', 25, 1, 1],
    ['AR2604111', '0234186', 422.5, 20, 'ACR INTEGRAL', 25, 1, 1]
  ])('%s / %s conserva corte, consumo bruto y reserva a medios metros', (orderCode, of, width, valanceHeight, fabric, drop, raw, rounded) => {
    const calculation = calculateOrder({ ...baseOrder, orderCode, fabric, awnings: [{ ...baseAwning, of, width, valanceHeight }] });
    expect(calculation.ofs[0].calculation.fabricWidth).toBe(width);
    expect(calculation.ofs[0].calculation.fabricDrop).toBe(drop);
    expect(calculation.ofs[0].calculation.fabricMl).toBeCloseTo(raw);
    const rows = buildFinalRows(calculation.ofs);
    expect(rows).toHaveLength(1);
    expect(rows[0].of).toBe(of);
    expect(rows[0].quantity).toBe(rounded);
  });
});

// Sujeción y bastillas del suplemento, según docs/superpowers/specs/2026-09-14-suplemento-bambalina-design.md.
// Medidas del plano AR2604220 (F-B11): sirven para probar el mecanismo, no acreditan un estándar.
describe('Suplemento: sujeción, paso y bastillas configurables', () => {
  const suplemento = { ...baseAwning, fabricDiagramOverride: 'SUPLEMENTO' };
  const conSuplemento = (extra) => pages({ ...baseOrder, awnings: [{ ...suplemento, ...extra }] });

  test('sin rellenar nada no inventa sujeción, paso ni bastillas', async () => {
    const [text] = await conSuplemento({});
    expect(text).toContain('SUPLEMENTO');
    expect(text).not.toContain('BROCHES');
    expect(text).not.toContain('VELCRO');
    expect(text).not.toContain('C/');
    expect(text).not.toContain('BN(');
    expect(text).not.toContain('DEBEN COINCIDIR');
  });

  test('reproduce el plano del 4220: broches cada 34 con bastillas 3, 1 y 4', async () => {
    const [text] = await conSuplemento({
      supplementFastening: 'BROCHES',
      supplementFasteningPitchCm: 34,
      supplementJoinHemCm: 3,
      supplementSideHemCm: 1,
      supplementBottomHemCm: 4,
      supplementBottomFinish: 'OLLAOS'
    });
    expect(text).toContain('BROCHES');
    expect(text).toContain('C/34');
    expect(text).toContain('BN(3)');
    expect(text).toContain('BN(1)');
    expect(text).toContain('BN(4)');
    expect(text).toContain('OLLAOS');
    expect(text).toContain('DEBEN COINCIDIR');
  });

  test('el velcro sustituye a los broches y no reserva material', async () => {
    const order = { ...baseOrder, awnings: [{ ...suplemento, supplementFastening: 'VELCRO' }] };
    const [text] = await pages(order);
    expect(text).toContain('VELCRO');
    expect(text).not.toContain('BROCHES');
    // Velcro, broches y ollaos no se inventarían: la OF solo lleva tejido.
    const materials = calculateOrder(order).ofs[0].materials;
    expect(materials).toHaveLength(1);
    expect(materials[0].description).toBe('ACR NEGRO');
  });

  test('una forma de sujeción que no está en la lista se rotula tal cual', async () => {
    const [text] = await conSuplemento({
      supplementFastening: 'OTRO', supplementFasteningOther: 'CREMALLERA',
      supplementBottomFinish: 'OTRO', supplementBottomFinishOther: 'CADENILLA DE BOLAS'
    });
    expect(text).toContain('CREMALLERA');
    expect(text).toContain('CADENILLA DE BOLAS');
    expect(text).not.toContain('OTRO');
  });

  test('el paso solo aparece si se ha indicado', async () => {
    const [conPaso] = await conSuplemento({ supplementFastening: 'BROCHES', supplementFasteningPitchCm: 25 });
    expect(conPaso).toContain('C/25');
    const [sinPaso] = await conSuplemento({ supplementFastening: 'BROCHES' });
    expect(sinPaso).toContain('BROCHES');
    expect(sinPaso).not.toContain('C/');
  });

  test('una bambalina sin suplemento no muestra ninguno de estos datos', async () => {
    const [text] = await pages({ ...baseOrder, awnings: [{ ...baseAwning, supplementFastening: 'BROCHES', supplementJoinHemCm: 3 }] });
    expect(text).toContain('VARILLA BLANCA');
    expect(text).not.toContain('BN(');
    expect(text).not.toContain('DEBEN COINCIDIR');
  });
});
