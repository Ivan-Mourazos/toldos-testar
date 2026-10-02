import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';
import { normalizeOrder } from './validation.js';
import { buildCurtainDiagramSpec, buildOrderPlanteamientoPdf } from './planteamientoPdf.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const fabric = 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA|||ACR';
function payload(model, patch = {}) {
  return {
    orderCode: 'AR-CORTINA', customer: 'PRUEBA', technician: 'IVÁN', fabric, structureColor: 'BLANCO',
    awnings: [{
      id: 'a', of: '0232626', model, workType: model === 'CORTINA' ? 'FULL_AWNING' : 'FABRIC_ONLY',
      units: 1, width: 200, projection: 275, valanceHeight: 0,
      device: 'MAQ. INTERIOR', crankHeight: 170, machineSide: 'M.F.DER', placement: 'TECHO',
      rotFabric: 'NO', rotValance: 'NO', valanceCurve: 'RECTA', remate: 'COMO TELA',
      curtainHasWindow: false, curtainFinish: 'NORMAL', curtainBottomFinish: 'TUBO DE CARGA',
      curtainWindowReference: 'SUELO', curtainFabricAdjustment: 'NINGUNO', curtainFabricAdjustmentCm: 0,
      ...patch
    }]
  };
}
function calc(model, patch = {}) {
  const result = calculateOrder(payload(model, patch));
  expect(result.ofs[0].calculation.valid).toBe(true);
  return result.ofs[0].calculation;
}

describe.each(['CORTINA', 'CAMBIO CORTINA'])('%s · configuraciones independientes (Iván, 02/10/2026)', (model) => {
  test('suma 40 sin descontar 18 por defecto', () => {
    expect(calc(model).fabricDrop).toBe(315);
  });
  test.each(['NORMAL', 'VELCRO'])('laterales %s con ET abajo suman 10 más', (curtainFinish) => {
    expect(calc(model, { curtainFinish, curtainBottomFinish: 'ET' }).fabricDrop).toBe(325);
  });
  test('la bamba de la misma tela suma su medida y 5; ET sigue sumando 10', () => {
    expect(calc(model, { valanceHeight: 20 }).fabricDrop).toBe(340);
    expect(calc(model, { valanceHeight: 20, curtainBottomFinish: 'ET' }).fabricDrop).toBe(350);
  });
  test('una bamba de otra tela se corta aparte con 5 de remate', () => {
    const result = calc(model, { valanceHeight: 20, valanceFabric: 'ACRILI2018P120|||120|||LONA AZUL|||ACR' });
    expect(result.fabricDrop).toBe(315);
    expect(result.valanceDrop ?? result.valanceFabricDrop).toBe(25);
  });
  test.each([
    ['TUBO DE CARGA', 0, 297], ['ET', 0, 304], ['PERSONALIZADO', -23, 292], ['PERSONALIZADO', 12.5, 327.5]
  ])('ajuste %s %s se aplica sin candado', (curtainFabricAdjustment, curtainFabricAdjustmentCm, expected) => {
    expect(calc(model, { curtainFabricAdjustment, curtainFabricAdjustmentCm }).fabricDrop).toBe(expected);
  });
  test('salida del toldo sustituye a salida ventana y la cota no afecta a la tela', () => {
    const patch = { curtainHasWindow: true, curtainWindowCorner: 15, curtainWindowHeight: 137, curtainWindowFloorHeight: 70 };
    expect(calc(model, patch).fabricDrop).toBe(315);
    expect(calc(model, { ...patch, curtainWindowReference: 'TUBO DE CARGA', curtainWindowExit: 999 }).fabricDrop).toBe(315);
  });
  test('el dibujo lleva velcro lateral y ET inferior a la vez', () => {
    const awning = normalizeOrder(payload(model, { curtainFinish: 'VELCRO', curtainBottomFinish: 'ET' })).awnings[0];
    expect(buildCurtainDiagramSpec('CORTINA-VELCRO', awning)).toMatchObject({ finish: 'VELCRO', bottomFinish: 'ET' });
  });
  test('la configuración y el ajuste con signo sobreviven a normalizar dos veces', () => {
    const order = normalizeOrder(payload(model, { curtainFinish: 'VELCRO', curtainBottomFinish: 'ET', curtainFabricAdjustment: 'PERSONALIZADO', curtainFabricAdjustmentCm: -23, curtainWindowReference: 'TUBO DE CARGA' }));
    expect(normalizeOrder(order).awnings[0]).toMatchObject({ curtainFinish: 'VELCRO', curtainBottomFinish: 'ET', curtainFabricAdjustment: 'PERSONALIZADO', curtainFabricAdjustmentCm: -23, curtainWindowReference: 'TUBO DE CARGA' });
  });
});

test('un antiguo Tubo se interpreta como laterales normales y ET abajo', () => {
  const old = payload('CORTINA', { curtainFinish: 'TUBO' });
  delete old.awnings[0].curtainBottomFinish;
  expect(normalizeOrder(old).awnings[0]).toMatchObject({ curtainFinish: 'NORMAL', curtainBottomFinish: 'ET' });
});

test.each(['CORTINA', 'CAMBIO CORTINA'])('%s rechaza un ajuste vacío o una salida de tela que no sea positiva', (model) => {
  for (const curtainFabricAdjustmentCm of [null, -315, -500]) {
    const result = calculateOrder(payload(model, { curtainFabricAdjustment: 'PERSONALIZADO', curtainFabricAdjustmentCm }));
    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.ofs[0].materials).toEqual([]);
  }
});

test.each(['NINGUNO', 'TUBO DE CARGA', 'ET', 'PERSONALIZADO'])('la cota a suelo es 52 y a tubo 70, independiente del ajuste %s', async (curtainFabricAdjustment) => {
  for (const [curtainWindowReference, measure] of [['SUELO', '52'], ['TUBO DE CARGA', '70']]) {
    const order = payload('CORTINA', {
      curtainHasWindow: true, curtainFinish: 'VELCRO', curtainBottomFinish: 'ET',
      curtainWindowCorner: 15, curtainWindowHeight: 137, curtainWindowFloorHeight: 70,
      curtainWindowReference, curtainFabricAdjustment, curtainFabricAdjustmentCm: 7
    });
    const result = calculateOrder(order);
    const bytes = await buildOrderPlanteamientoPdf({ order: normalizeOrder(order), calculation: result });
    const loading = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
    const pdf = await loading.promise;
    const texts = [];
    for (let n = 1; n <= pdf.numPages; n++) texts.push(...(await (await pdf.getPage(n)).getTextContent()).items.map((item) => item.str));
    await loading.destroy?.();
    expect(texts).toContain(measure);
    expect(texts.some((text) => text.includes('E.T.'))).toBe(true);
  }
});
