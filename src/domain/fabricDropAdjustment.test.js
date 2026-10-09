import { describe, expect, test } from 'vitest';
import { normalizeOrder } from './validation.js';
import { calculateOrder } from './rules.js';
import { fabricDropAdjustmentCm, fabricDropSummary, supportsFabricDropAdjustment } from './fabricDropAdjustment.js';
import { sampleAwnings, SAMPLE_FABRIC } from '../../scripts/lib/model-samples.mjs';

// Iván, 09/10/2026 (AR2604955): poder sumar o quitar centímetros a la caída de la tela en la
// tarjeta, sin candado, como ya hace la Cortina. Por ejemplo, una bambalina pisada doble.
const run = (awning, patch = {}) => {
  const order = normalizeOrder({
    orderCode: 'X', customer: 'X', technician: 'IVÁN', fabric: SAMPLE_FABRIC, sameFabric: true, structureColor: 'BLANCO',
    awnings: [{ ...awning, ...patch }]
  });
  return calculateOrder(order);
};
const drop = (result) => Number(result.ofs[0].calculation.fabricUsageDrop ?? result.ofs[0].calculation.fabricDrop);

describe('ajuste de la caída de tela en la tarjeta', () => {
  const models = ['ARZUA PRO', 'GALICIA', 'XACOBEO', 'PUNTO RECTO', 'MONOBLOCK 350', 'PERLA BOX', 'CORAL BOX', 'CUARZO BOX',
    'AMBAR BOX', 'AGATA BOX', 'MAXISCREEM', 'ELECTRA', 'SELENA', 'IRIS', 'HERA', 'ANTICA'];

  test.each(models)('%s: +10 suma 10 cm a la caída y −5 quita 5, sin excepción técnica', (model) => {
    const [{ awning }] = sampleAwnings(model);
    const base = run(awning);
    const more = run(awning, { fabricDropAdjustmentCm: 10 });
    const less = run(awning, { fabricDropAdjustmentCm: -5 });
    expect(more.ofs[0].calculation.valid).toBe(true);
    expect(Math.round((drop(more) - drop(base)) * 10) / 10).toBe(10);
    expect(Math.round((drop(less) - drop(base)) * 10) / 10).toBe(-5);
    expect(more.ofs[0].calculation.fabricMl).toBeGreaterThanOrEqual(base.ofs[0].calculation.fabricMl);
  });

  test('avisa en la tarjeta de cuánto se ha ajustado', () => {
    const [{ awning }] = sampleAwnings('ARZUA PRO');
    const messages = run(awning, { fabricDropAdjustmentCm: 10 }).diagnostics.map((item) => `${item.level}: ${item.message}`).join(' | ');
    expect(messages).toMatch(/warn: .*10 cm.*caída de tela/);
    expect(run(awning).diagnostics.map((item) => item.message).join(' ')).not.toMatch(/caída de tela/);
  });

  test('la Cortina tiene su propio ajuste: este no le afecta', () => {
    expect(supportsFabricDropAdjustment('CORTINA')).toBe(false);
    expect(supportsFabricDropAdjustment('CAMBIO CORTINA')).toBe(false);
    expect(supportsFabricDropAdjustment('CAMBIO TELA')).toBe(false);
    expect(fabricDropAdjustmentCm({ model: 'CORTINA', fabricDropAdjustmentCm: 10 })).toBe(0);
    expect(fabricDropAdjustmentCm({ model: 'ARZUA PRO', fabricDropAdjustmentCm: '7,5' })).toBe(0);
    expect(fabricDropAdjustmentCm({ model: 'ARZUA PRO', fabricDropAdjustmentCm: 7.5 })).toBe(7.5);
  });

  test('el servidor conserva el ajuste solo donde vale', () => {
    const keep = (model) => normalizeOrder({ orderCode: 'X', awnings: [{ id: 'a', model, fabricDropAdjustmentCm: 12 }] }).awnings[0].fabricDropAdjustmentCm;
    expect(keep('PERLA BOX')).toBe(12);
    expect(keep('CORTINA')).toBe(0);
  });
});

describe('resumen de aumentos de la caída de tela', () => {
  const summary = (model, patch = {}) => {
    const [{ awning }] = sampleAwnings(model);
    const result = run(awning, patch);
    return fabricDropSummary(normalizeOrder({ orderCode: 'X', awnings: [{ ...awning, ...patch }] }).awnings[0], result.ofs[0].calculation);
  };
  const valance = { hasValance: true, valanceHeight: 20, valanceCurve: 'RECTA', rotValance: 'NO' };

  test('sin bamba: salida + 40', () => {
    expect(summary('ARZUA PRO').text).toBe('Caída de tela 190 cm = salida 150 + aumento 40');
  });

  test('con bamba y ajuste: cada parte por separado', () => {
    expect(summary('ARZUA PRO', { ...valance, fabricDropAdjustmentCm: 10 }).text)
      .toBe('Caída de tela 225 cm = salida 150 + aumento 45 + bamba 20 + ajuste 10');
    expect(summary('GALICIA', { fabricDropAdjustmentCm: -5 }).text).toBe('Caída de tela 185 cm = salida 150 + aumento 40 − ajuste 5');
  });

  test('el Electra a motor suma 40, como a máquina', () => {
    expect(summary('ELECTRA', { device: 'MOTOR', motorPower: 'METEOR 20/17', crankHeight: null }).text).toBe('Caída de tela 190 cm = salida 150 + aumento 40');
  });

  test('Punto Recto dice la salida por su multiplicador; el Iris, la caída menor del hueco', () => {
    expect(summary('PUNTO RECTO').text).toBe('Caída de tela 154 cm = salida 70 × 1,41 99 + aumento 55');
    expect(summary('IRIS').text).toBe('Caída de tela 175 cm = caída menor del hueco 150 + aumento para el enrolle 25');
  });

  test.each(['ARZUA PRO', 'PERLA BOX', 'AMBAR BOX', 'ANTICA', 'SELENA', 'HERA', 'MAXISCREEM'])('%s: las partes suman la caída', (model) => {
    const result = summary(model, { ...valance, fabricDropAdjustmentCm: 7.5 });
    expect(Math.round(result.parts.reduce((sum, part) => sum + part.cm, 0) * 10) / 10).toBe(result.total);
  });

  test('la Cortina no lleva este resumen', () => {
    expect(fabricDropSummary({ model: 'CORTINA', projection: 150 }, { fabricDrop: 200 })).toBeNull();
  });
});
