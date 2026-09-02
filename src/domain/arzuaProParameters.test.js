import { describe, expect, test } from 'vitest';
import {
  arzuaProManualSpec,
  legacyArzuaMinimumLineByArm,
  minimumLineByArm
} from './arzuaProConstants.js';
import {
  defaultArzuaProParameters,
  normalizeArzuaProParameters,
  resolveArzuaMotorPower,
  resolveArzuaRequiredTorque
} from './arzuaProParameters.js';

describe('ARZUA PRO contra el manual Llaza COMPLET-PRO 350', () => {
  test('usa los límites y las tres últimas líneas mínimas de la revisión 2.1', () => {
    expect(arzuaProManualSpec).toMatchObject({
      maximumWidthCm: 600,
      maximumProjectionCm: 350,
      inclinationDegrees: { min: 0, max: 85 },
      rollingTubeDiameterMm: 80
    });
    expect(minimumLineByArm.slice(-3)).toEqual([
      { arm: 300, values: { 'MAQ. EXTERIOR': 350, 'MAQ. INTERIOR': 345, MOTOR: 345 } },
      { arm: 325, values: { 'MAQ. EXTERIOR': 375, 'MAQ. INTERIOR': 370, MOTOR: 370 } },
      { arm: 350, values: { 'MAQ. EXTERIOR': 400, 'MAQ. INTERIOR': 395, MOTOR: 395 } }
    ]);
  });

  test('migra la tabla antigua del Excel sin borrar ajustes personalizados', () => {
    expect(normalizeArzuaProParameters({
      minimumLineByArm: structuredClone(legacyArzuaMinimumLineByArm)
    }).minimumLineByArm).toEqual(minimumLineByArm);

    const customized = structuredClone(legacyArzuaMinimumLineByArm);
    customized[0].values.MOTOR = 196;
    expect(normalizeArzuaProParameters({ minimumLineByArm: customized }).minimumLineByArm[0].values.MOTOR).toBe(196);
  });

  test('usa literalmente los descuentos del manual Llaza con cualquier barra delantera', () => {
    const parameters = defaultArzuaProParameters;
    expect(arzuaProManualSpec.cuttingDiscountsCm.fabricWidthDiscounts).toEqual({
      MOTOR: 10.8,
      'MAQ. INTERIOR': 12.2,
      'MAQ. EXTERIOR': 12.4
    });
    for (const tube of ['TUBO DE CARGA EVO 80', 'TUBO DE CARGA UNIVERS 280']) {
      expect(parameters.fabricWidthDiscounts[tube]).toEqual(arzuaProManualSpec.cuttingDiscountsCm.fabricWidthDiscounts);
      expect(parameters.rollTubeDiscounts[tube]).toEqual(arzuaProManualSpec.cuttingDiscountsCm.rollTubeDiscounts);
      expect(parameters.widthDiscounts[tube]).toEqual(arzuaProManualSpec.cuttingDiscountsCm.widthDiscounts);
    }
  });

  test('migra los redondeos antiguos del Excel a los valores exactos del manual', () => {
    const parameters = normalizeArzuaProParameters({
      motor70WidthFrom: 600,
      widthDiscounts: {
        'TUBO DE CARGA EVO 80': { MOTOR: 9.8, 'MAQ. INTERIOR': 10.2, 'MAQ. EXTERIOR': 10.4 },
        'TUBO DE CARGA UNIVERS 280': { MOTOR: 9.8, 'MAQ. INTERIOR': 11.2, 'MAQ. EXTERIOR': 11.4 }
      },
      fabricWidthDiscounts: {
        'TUBO DE CARGA EVO 80': { MOTOR: 11, 'MAQ. INTERIOR': 13, 'MAQ. EXTERIOR': 13 },
        'TUBO DE CARGA UNIVERS 280': { MOTOR: 11, 'MAQ. INTERIOR': 13, 'MAQ. EXTERIOR': 13 }
      }
    });

    expect(parameters.motor70WidthFrom).toBe(601);
    expect(parameters.fabricWidthDiscounts['TUBO DE CARGA EVO 80']).toEqual({
      MOTOR: 10.8,
      'MAQ. INTERIOR': 12.2,
      'MAQ. EXTERIOR': 12.4
    });
    expect(parameters.widthDiscounts['TUBO DE CARGA UNIVERS 280']).toEqual({
      MOTOR: 9.8,
      'MAQ. INTERIOR': 10.2,
      'MAQ. EXTERIOR': 10.4
    });
  });

  test('consulta la tabla de par Llaza y mantiene 55/17 en todo el rango estándar', () => {
    expect(resolveArzuaRequiredTorque(195, 150)).toBe(30);
    expect(resolveArzuaRequiredTorque(337, 225)).toBe(40);
    expect(resolveArzuaRequiredTorque(600, 350)).toBe(50);
    expect(resolveArzuaRequiredTorque(601, 350)).toBeNull();
    expect(resolveArzuaMotorPower({ width: 600, projection: 350, motorPower: 'AUTOMÁTICO' })).toBe('55/17');
    expect(resolveArzuaMotorPower({ width: 650, projection: 350, motorPower: 'AUTOMÁTICO' })).toBe('70/17');
  });
});
