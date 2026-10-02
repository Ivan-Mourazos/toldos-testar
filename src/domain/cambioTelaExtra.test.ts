import { describe, expect, test } from 'vitest';
import { calculateCambioTela } from './cambioTelaRules.js';
import { calculateOrder } from './rules.js';
import { normalizeOrder } from './validation.js';
import { getMissingFields } from './awningCompleteness.js';
import { buildReviewSheetEntries } from './reviewSheetEntries.js';
import { createAwning } from '../client/constants';
import { sanitizeAwning, switchAwningModel } from '../client/hooks/useDraft';

const awning = {
  id: 'cambio', of: '0230001', model: 'CAMBIO TELA', units: 1,
  width: 300, projection: 250, valanceHeight: 0, rotFabric: 'NO'
};
const order = (patch = {}) => ({ fabric: 'ACR NEGRO', awnings: [{ ...awning, ...patch }] });
const calculate = (patch = {}) => calculateCambioTela({ order: order(), awning: { ...awning, ...patch } });

describe('suma para enrolle y tubo del Cambio de tela', () => {
  test('por defecto suma 40 en total: tres paños consumen 8,70 ml', () => {
    expect(calculate().calculation).toMatchObject({ fabricDrop: 290, fabricMl: 8.7 });
    expect(calculate({ cambioTelaExtraCm: 55 }).calculation).toMatchObject({ fabricDrop: 305, fabricMl: 9.15 });
    const result = calculateOrder(order()).ofs[0];
    expect(result.calculation).toMatchObject({ valid: true, fabricDrop: 290, reservedFabricMl: 8.7 });
    expect(result.materials[0].quantity).toBe(8.7);
  });

  test.each([0, 40, 67.5])('aplica %s cm por toldo sin activar una excepción', (cambioTelaExtraCm) => {
    const result = calculateOrder(order({ cambioTelaExtraCm })).ofs[0];
    expect(result.calculation).toMatchObject({ valid: true, fabricDrop: 250 + cambioTelaExtraCm });
    expect(result.calculation).not.toHaveProperty('exception');
  });

  test('la bamba integrada suma su alto y remate; la de otra tela se corta aparte', () => {
    expect(calculate({ cambioTelaExtraCm: 60, valanceHeight: 30 }).calculation.fabricDrop).toBe(345);
    expect(calculate({ cambioTelaExtraCm: 60, valanceHeight: 30, valanceFabric: 'ACR GRANATE' }).calculation)
      .toMatchObject({ fabricDrop: 310, valanceDrop: 35 });
  });

  test.each([null, '', ' ', -1, 'no es un número', true, Number.NaN, Number.POSITIVE_INFINITY])('rechaza el valor %s sin reservar tela', (cambioTelaExtraCm) => {
    const result = calculate({ cambioTelaExtraCm });
    expect(result.calculation.valid).toBe(false);
    expect(result.materials).toEqual([]);
    expect(result.diagnostics.some(({ message }) => /enrolle y tubo/.test(message))).toBe(true);
    const normalized = normalizeOrder(order({ cambioTelaExtraCm })).awnings[0];
    expect(getMissingFields(normalized).some(({ field }) => field === 'cambioTelaExtraCm')).toBe(true);
    const full = calculateOrder(order({ cambioTelaExtraCm }));
    expect(full.ofs[0].calculation?.valid).toBe(false);
    expect(full.ofs[0].materials).toEqual([]);
  });

  test('conserva el valor y los errores al recuperar un borrador', () => {
    expect(createAwning('FABRIC_ONLY').cambioTelaExtraCm).toBe(40);
    expect(sanitizeAwning({ ...awning, cambioTelaExtraCm: 67.5 }).cambioTelaExtraCm).toBe(67.5);
    expect(sanitizeAwning({ ...awning, cambioTelaExtraCm: null }).cambioTelaExtraCm).toBeNull();
    expect(sanitizeAwning({ ...awning, cambioTelaExtraCm: -1 }).cambioTelaExtraCm).toBe(-1);
    expect(sanitizeAwning(awning).cambioTelaExtraCm).toBe(40);
    expect(switchAwningModel(createAwning(), 'CAMBIO TELA').cambioTelaExtraCm).toBe(40);
  });

  test('migra un margen técnico antiguo y da prioridad al nuevo campo', () => {
    const legacy = { ...awning, reglasModificadas: true, fabricJobDropAllowanceCm: 4 };
    expect(sanitizeAwning(legacy).cambioTelaExtraCm).toBe(4);
    expect(calculateOrder({ fabric: 'ACR NEGRO', awnings: [legacy] }).ofs[0].calculation?.fabricDrop).toBe(254);
    expect(calculate({ ...legacy, cambioTelaExtraCm: 60 }).calculation.fabricDrop).toBe(310);
  });

  test('la ficha de revisión muestra lo sumado junto a las medidas, también cero', () => {
    for (const cambioTelaExtraCm of [0, 55, 67.5]) {
      const input = order({ cambioTelaExtraCm });
      const [entry] = buildReviewSheetEntries(input, calculateOrder(input));
      expect(entry.fields).toContainEqual({ label: 'Sumar para enrolle y tubo (cm)', value: cambioTelaExtraCm.toLocaleString('es-ES') });
    }
  });
});
