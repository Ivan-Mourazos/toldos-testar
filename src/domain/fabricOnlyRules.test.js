import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';

const base = {
  orderCode: 'AR26TEXTIL',
  fabric: 'ACR NEGRO',
  awnings: []
};

function calculate(model, overrides = {}) {
  return calculateOrder({
    ...base,
    awnings: [{
      id: model,
      of: '3300001',
      model,
      units: 1,
      width: 300,
      projection: 250,
      valanceHeight: 30,
      ...overrides
    }]
  });
}

describe('trabajos solo de tela', () => {
  test.each([
    ['CAMBIO TELA', 325],
    ['CAMBIO CORTINA', 307],
    ['ENROLLABLE', 275],
    ['CAMBIO ANTICA', 310]
  ])('%s aplica su fórmula del Excel y no genera estructura', (model, expectedDrop) => {
    const result = calculate(model);
    expect(result.ofs[0].calculation.fabricDrop).toBe(expectedDrop);
    expect(result.ofs[0].calculation.structureLength).toBe(0);
    expect(result.ofs[0].despiece).toBeNull();
  });

  test('BAMBALINA usa frente y alto; no necesita salida', () => {
    const result = calculate('BAMBALINA', { projection: 0, valanceHeight: 30 });
    expect(result.ofs).toHaveLength(1);
    expect(result.ofs[0].calculation.fabricDrop).toBe(35);
    expect(result.ofs[0].despiece).toBeNull();
  });

  test('CAMBIO ANTICA sin bamba mantiene el remate de 5 cm', () => {
    const result = calculate('CAMBIO ANTICA', { valanceHeight: 0 });
    expect(result.ofs[0].calculation.fabricDrop).toBe(280);
  });

  test('reserva la bamba por separado cuando lleva otra tela', () => {
    const result = calculate('CAMBIO TELA', { valanceFabric: 'ACR GRANATE' });
    expect(result.ofs[0].calculation).toMatchObject({
      fabricDrop: 290,
      mainFabricMl: 8.7,
      valanceFabricCode: 'ACRILI2101P120',
      valanceFabricMl: 1.05,
      fabricMl: 9.75
    });
    expect(result.ofs[0].materials).toEqual([
      { code: 'ACRILI2170P120', quantity: 8.7, description: 'ACR NEGRO' },
      { code: 'ACRILI2101P120', quantity: 1.05, description: 'ACR GRANATE · BAMBA' }
    ]);
  });

  test('CAMBIO ANTICA usa +40 en el cuerpo si la bamba lleva otra tela', () => {
    const result = calculate('CAMBIO ANTICA', { valanceFabric: 'ACR GRANATE' });
    expect(result.ofs[0].calculation).toMatchObject({
      fabricDrop: 290,
      valanceFabricCode: 'ACRILI2101P120',
      valanceDrop: 35
    });
  });

  test('los parámetros y la excepción individual controlan el margen', () => {
    const standard = calculateOrder({
      ...base,
      parameters: { fabricJobs: { dropAllowanceByModel: { ENROLLABLE: 30 } } },
      awnings: [{ id: 'roller', of: '3300001', model: 'ENROLLABLE', units: 1, width: 300, projection: 250 }]
    });
    expect(standard.ofs[0].calculation.fabricDrop).toBe(280);

    const modified = calculate('ENROLLABLE', {
      valanceHeight: 0,
      reglasModificadas: true,
      fabricJobWidthAdjustmentCm: -2,
      fabricJobDropAllowanceCm: 35
    });
    expect(modified.ofs[0].calculation).toMatchObject({ fabricWidth: 298, fabricDrop: 285 });
    expect(modified.diagnostics[0].level).toBe('warn');
  });

  test('CAMBIO CORTINA con ventana exige las cuatro medidas del Excel', () => {
    const incomplete = calculate('CAMBIO CORTINA', {
      curtainHasWindow: true,
      curtainFinish: 'NORMAL'
    });
    expect(incomplete.ofs[0].materials).toEqual([]);
    expect(incomplete.diagnostics[0].message).toContain('faltan medidas de ventana');

    const complete = calculate('CAMBIO CORTINA', {
      curtainHasWindow: true,
      curtainFinish: 'NORMAL',
      curtainWindowExit: 240,
      curtainWindowCorner: 35,
      curtainWindowFloorHeight: 95,
      curtainWindowHeight: 120
    });
    expect(complete.ofs[0].materials).toHaveLength(1);
    expect(complete.ofs[0].calculation.valid).toBe(true);
  });

  test('CAMBIO CORTINA exige elegir ventana y confección', () => {
    const result = calculate('CAMBIO CORTINA');

    expect(result.ofs[0].materials).toEqual([]);
    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.diagnostics[0].message).toContain('falta ventana y confección');
  });

  test('CAMBIO CORTINA aplica 18 cm de descuento estándar también sin bamba', () => {
    const result = calculate('CAMBIO CORTINA', {
      projection: 330,
      valanceHeight: 0,
      curtainHasWindow: false,
      curtainFinish: 'NORMAL'
    });

    expect(result.ofs[0].calculation).toMatchObject({
      valid: true,
      fabricDrop: 357,
      curtainFabricDeductionCm: 18
    });
  });

  test('CAMBIO CORTINA permite anular el descuento como excepción individual', () => {
    const result = calculate('CAMBIO CORTINA', {
      projection: 250,
      valanceHeight: 20,
      curtainHasWindow: false,
      curtainFinish: 'NORMAL',
      reglasModificadas: true,
      curtainFabricDeductionCm: 0
    });

    expect(result.ofs[0].calculation).toMatchObject({
      valid: true,
      fabricDrop: 315,
      fabricMl: 9.45,
      curtainFabricDeductionCm: 0
    });
  });

  test('los parámetros editables controlan margen y descuento de CAMBIO CORTINA', () => {
    const result = calculateOrder({
      ...base,
      parameters: {
        cambioCortina: { fabricDropAllowanceCm: 50, bottomDeductionCm: 10 }
      },
      awnings: [{
        id: 'custom-curtain', of: '3300001', model: 'CAMBIO CORTINA', units: 1,
        width: 300, projection: 250, valanceHeight: 20,
        curtainHasWindow: false, curtainFinish: 'NORMAL'
      }]
    });

    expect(result.ofs[0].calculation).toMatchObject({ fabricDrop: 310, curtainFabricDeductionCm: 10 });
  });
});
