import { describe, expect, test } from 'vitest';
import { calculateIris } from './irisRules.js';
import { getMissingFields } from './awningCompleteness.js';
import { getIrisWindow } from './irisWindow.js';
import { normalizeOrder } from './validation.js';

const order = { sameFabric: true, fabric: 'IRISTESTP120|||120|||LONA DE PRUEBA IRIS', parameters: {} };
const base = {
  id: 'iris-ventana', of: '0239999', model: 'IRIS', units: 1,
  submodel: 'IRIS 110 CON COFRE', irisGuideType: 'ESTÁNDAR', irisGuideFixing: 'PARED', irisBoxShape: 'REDONDO',
  irisAssumeSquare: true, irisFrontTop: 300, irisExitLeft: 250,
  device: 'MOTOR', machineSide: 'M.F.DER', placement: 'FRONTAL', structureColor: 'BLANCO', rotFabric: 'NO',
  curtainHasWindow: true
};
const calculate = (patch = {}) => calculateIris({ order, awning: { ...base, ...patch } });
const missing = (patch = {}) => getMissingFields({ ...base, ...patch }, order).map(item => item.field);

describe('medidas de la ventana del Iris', () => {
  test('tarjeta y cálculo piden alto y suelo-ventana, sin esquina ni laterales', () => {
    expect(missing()).toEqual(expect.arrayContaining(['curtainWindowHeight', 'curtainWindowFloorHeight']));
    expect(missing()).not.toContain('curtainWindowCorner');
    expect(missing()).not.toContain('curtainWindowExit');
    const result = calculate();
    expect(result.calculation.valid).toBe(false);
    expect(result.materials).toEqual([]);
    expect(result.diagnostics.map(item => item.message).join(' ')).toMatch(/altura ventana/);
  });

  test('lona y todo cristal ignoran las medidas guardadas de una ventana anterior', () => {
    for (const patch of [{ curtainHasWindow: false }, { irisGlassCurtain: true }]) {
      expect(missing(patch)).not.toContain('curtainWindowHeight');
      expect(missing(patch)).not.toContain('curtainWindowFloorHeight');
      expect(calculate(patch).calculation.valid).toBe(true);
    }
  });

  test.each([null, 0, -2, Infinity, NaN])('rechaza alto de ventana %s y no reserva materiales', (curtainWindowHeight) => {
    const patch = { curtainWindowHeight, curtainWindowFloorHeight: 50 };
    expect(missing(patch)).toContain('curtainWindowHeight');
    expect(calculate(patch).calculation.valid).toBe(false);
    expect(calculate(patch).materials).toEqual([]);
  });

  test.each([null, 0, -2, Infinity, NaN])('rechaza posición %s', (curtainWindowFloorHeight) => {
    const patch = { curtainWindowHeight: 100, curtainWindowFloorHeight };
    expect(missing(patch)).toContain('curtainWindowFloorHeight');
    expect(calculate(patch).calculation.valid).toBe(false);
  });

  test('la ventana debe caber en el hueco dejando lona encima', () => {
    const patch = { curtainWindowHeight: 140, curtainWindowFloorHeight: 140 };
    expect(missing(patch)).toContain('curtainWindowHeight');
    const result = calculate(patch);
    expect(result.calculation.valid).toBe(false);
    expect(result.materials).toEqual([]);
    expect(result.diagnostics.map(item => item.message).join(' ')).toMatch(/ventana.*hueco/i);
  });

  test('acepta medidas decimales sin exigir esquinas', () => {
    const patch = { curtainWindowHeight: 100.5, curtainWindowFloorHeight: 60.5 };
    expect(missing(patch)).not.toContain('curtainWindowHeight');
    expect(missing(patch)).not.toContain('curtainWindowFloorHeight');
    expect(calculate(patch).calculation.valid).toBe(true);
  });

  test('suelo descuenta 18 como la cortina y tubo conserva la distancia, también al guardar', () => {
    const patch = { ...base, curtainWindowHeight: 140, curtainWindowFloorHeight: 60 };
    expect(getIrisWindow(patch)).toMatchObject({ floor: 42, measure: 60, reference: 'SUELO' });
    const normalized = normalizeOrder({ ...order, awnings: [{ ...patch, curtainWindowReference: 'TUBO DE CARGA' }] });
    expect(getIrisWindow(normalizeOrder(normalized).awnings[0])).toMatchObject({ floor: 60, reference: 'TUBO DE CARGA' });
    expect(missing({ ...patch, curtainWindowFloorHeight: 18 })).toContain('curtainWindowFloorHeight');
  });

  test.each([[100, 5.3, 1], [140, 4.1, 1], [150, 3.8, 2], [280, 4.4, 2], [281, 4.4, 3]])(
    'alto %i: la lona descuenta el alto y el cristal reserva las piezas necesarias', (curtainWindowHeight, fabricMl, glassPieces) => {
      const patch = { curtainWindowHeight, curtainWindowFloorHeight: 60, units: 2,
        ...(curtainWindowHeight >= 280 ? { submodel: 'IRIS 130 CON COFRE', irisExitLeft: 400 } : {}) };
      const result = calculate(patch);
      expect(result.calculation).toMatchObject({ valid: true, fabricMl: fabricMl * 2, glassPieces });
      expect(result.materials.find(item => item.code === 'CRISESTP140300C')?.quantity).toBe(glassPieces * 2);
      expect(result.diagnostics.some(item => /empate/.test(item.message))).toBe(curtainWindowHeight > 140);
    }
  );
});
