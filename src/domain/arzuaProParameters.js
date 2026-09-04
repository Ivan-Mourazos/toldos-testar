import { arzuaProManualSpec, legacyArzuaMinimumLineByArm, minimumLineByArm } from './arzuaProConstants.js';

const tubes = ['TUBO DE CARGA EVO 80', 'TUBO DE CARGA UNIVERS 280'];

const legacyWorkshopWidthDiscounts = {
  'TUBO DE CARGA EVO 80': { MOTOR: 9.8, 'MAQ. INTERIOR': 10.2, 'MAQ. EXTERIOR': 10.4 },
  'TUBO DE CARGA UNIVERS 280': { MOTOR: 9.8, 'MAQ. INTERIOR': 11.2, 'MAQ. EXTERIOR': 11.4 }
};

const legacyWorkshopFabricDiscounts = discountMatrix({
  MOTOR: 11,
  'MAQ. INTERIOR': 13,
  'MAQ. EXTERIOR': 13
});

export const defaultArzuaProParameters = {
  standardMaxWidth: 600,
  // El manual llega hasta 600 cm y exige como máximo 50 Nm. El 55/17 cubre
  // todo el rango estándar; el 70/17 queda únicamente para excepciones >600.
  motor70WidthFrom: arzuaProManualSpec.maximumWidthCm + 1,
  fabricDropAllowanceCm: 45,
  seamAllowanceCm: 2.5,
  seamBaseCm: 6.5,
  stockLengths: [600, 650, 700],
  privateTube: 'TUBO DE CARGA EVO 80',
  businessTube: 'TUBO DE CARGA UNIVERS 280',
  widthDiscounts: discountMatrix(arzuaProManualSpec.cuttingDiscountsCm.widthDiscounts),
  rollTubeDiscounts: discountMatrix(arzuaProManualSpec.cuttingDiscountsCm.rollTubeDiscounts),
  fabricWidthDiscounts: discountMatrix(arzuaProManualSpec.cuttingDiscountsCm.fabricWidthDiscounts),
  minimumLineByArm
};

export function normalizeArzuaProParameters(input = {}) {
  const defaults = defaultArzuaProParameters;
  return {
    ...defaults,
    ...input,
    standardMaxWidth: positiveNumber(input.standardMaxWidth, defaults.standardMaxWidth),
    motor70WidthFrom: migrateLegacyPositiveNumber(input.motor70WidthFrom, 600, defaults.motor70WidthFrom),
    fabricDropAllowanceCm: nonNegativeNumber(input.fabricDropAllowanceCm, defaults.fabricDropAllowanceCm),
    seamAllowanceCm: nonNegativeNumber(input.seamAllowanceCm, defaults.seamAllowanceCm),
    seamBaseCm: nonNegativeNumber(input.seamBaseCm, defaults.seamBaseCm),
    stockLengths: normalizeStockLengths(input.stockLengths, defaults.stockLengths),
    privateTube: normalizeTube(input.privateTube, defaults.privateTube),
    businessTube: normalizeTube(input.businessTube, defaults.businessTube),
    widthDiscounts: normalizeDiscounts(input.widthDiscounts, defaults.widthDiscounts, legacyWorkshopWidthDiscounts),
    rollTubeDiscounts: normalizeDiscounts(input.rollTubeDiscounts, defaults.rollTubeDiscounts),
    fabricWidthDiscounts: normalizeDiscounts(input.fabricWidthDiscounts, defaults.fabricWidthDiscounts, legacyWorkshopFabricDiscounts),
    minimumLineByArm: normalizeMinimumLines(input.minimumLineByArm, defaults.minimumLineByArm)
  };
}

export function suggestedTubeForDestination(destination, parameters = defaultArzuaProParameters) {
  const clean = String(destination || '').toUpperCase();
  if (clean === 'PARTICULAR') return parameters.privateTube;
  if (clean === 'HOSTELERÍA / EMPRESA') return parameters.businessTube;
  return '';
}

// Hay Arzúas que se montan con los soportes del Galicia, por el tipo de pared o
// por el sitio donde va colocado: 65 de las OF con imputación desde 2025 llevaron
// SOPARTGL. Lo elige la oficina en el planteamiento, porque no hay ninguna regla
// escrita que lo deduzca de las medidas.
export function resolveArzuaSupport(awning) {
  return String(awning?.supportSystem || '').toUpperCase() === 'GALICIA' ? 'GALICIA' : 'ARZUA';
}

export function resolveArzuaMotorPower(awning, parameters = defaultArzuaProParameters) {
  const selected = String(awning.motorPower || '').toUpperCase();
  if (selected === '55/17' || selected === '70/17') return selected;
  const requiredTorque = resolveArzuaRequiredTorque(awning.width, awning.projection);
  if (requiredTorque !== null) return requiredTorque <= 55 ? '55/17' : '70/17';
  return Number(awning.width) >= parameters.motor70WidthFrom ? '70/17' : '55/17';
}

export function resolveArzuaRequiredTorque(width, projection) {
  const widthIndex = arzuaProManualSpec.motorTube80.widthsCm.findIndex((item) => item >= Number(width));
  const row = arzuaProManualSpec.motorTube80.rows.find((item) => item.projectionCm >= Number(projection));
  if (widthIndex < 0 || !row) return null;
  return row.torqueNm[widthIndex] ?? null;
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function migrateLegacyPositiveNumber(value, legacyValue, fallback) {
  if (Number(value) === legacyValue && legacyValue !== fallback) return fallback;
  return positiveNumber(value, fallback);
}

function nonNegativeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeStockLengths(input, defaults) {
  if (!Array.isArray(input)) return [...defaults];
  const values = input
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);
  return values.length > 0 ? [...new Set(values)] : [...defaults];
}

function normalizeTube(value, fallback) {
  const clean = String(value || '').toUpperCase();
  if (clean.includes('UNIVERS')) return 'TUBO DE CARGA UNIVERS 280';
  if (clean.includes('EVO')) return 'TUBO DE CARGA EVO 80';
  return fallback;
}

function normalizeDiscounts(input, defaults, legacy = null) {
  const result = structuredClone(defaults);
  for (const tube of Object.keys(result)) {
    for (const device of Object.keys(result[tube])) {
      const value = Number(input?.[tube]?.[device]);
      const isLegacyDefault = legacy && value === legacy?.[tube]?.[device]
        && legacy[tube][device] !== defaults[tube][device];
      if (Number.isFinite(value) && value >= 0 && !isLegacyDefault) result[tube][device] = value;
    }
  }
  return result;
}

function discountMatrix(values) {
  return Object.fromEntries(tubes.map((tube) => [tube, { ...values }]));
}

function normalizeMinimumLines(input, defaults) {
  if (!Array.isArray(input)) return structuredClone(defaults);
  // Migra automáticamente la tabla incorrecta que ya pudo quedar guardada en
  // localStorage. Si alguien cambió algún valor a mano, se respeta su ajuste.
  const source = sameMinimumLines(input, legacyArzuaMinimumLineByArm) ? defaults : input;
  return defaults.map((row) => {
    const candidate = source.find((item) => Number(item?.arm) === row.arm);
    return {
      arm: row.arm,
      values: {
        'MAQ. EXTERIOR': positiveNumber(candidate?.values?.['MAQ. EXTERIOR'], row.values['MAQ. EXTERIOR']),
        'MAQ. INTERIOR': positiveNumber(candidate?.values?.['MAQ. INTERIOR'], row.values['MAQ. INTERIOR']),
        MOTOR: positiveNumber(candidate?.values?.MOTOR, row.values.MOTOR)
      }
    };
  });
}

function sameMinimumLines(input, expected) {
  if (!Array.isArray(input) || input.length !== expected.length) return false;
  return expected.every((row) => {
    const candidate = input.find((item) => Number(item?.arm) === row.arm);
    return ['MAQ. EXTERIOR', 'MAQ. INTERIOR', 'MOTOR'].every(
      (device) => Number(candidate?.values?.[device]) === row.values[device]
    );
  });
}
