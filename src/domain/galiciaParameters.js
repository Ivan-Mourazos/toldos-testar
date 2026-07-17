import { galiciaMinimumLineByProjection } from './galiciaConstants.js';

export const defaultGaliciaParameters = {
  standardMaxWidth: 700,
  armSwitchWidth: 550,
  privateTube: 'TUBO DE CARGA EVO 80',
  businessTube: 'TUBO DE CARGA UNIVERS 280',
  fabricDropAllowanceCm: 45,
  seamAllowanceCm: 2.5,
  seamBaseCm: 6.5,
  stockLengths: [600, 700],
  widthDiscounts: {
    'TUBO DE CARGA EVO 80': { MOTOR: 10, 'MAQ. INTERIOR': 11.5, 'MAQ. EXTERIOR': 11.5 },
    'TUBO DE CARGA UNIVERS 280': { MOTOR: 10, 'MAQ. INTERIOR': 11.5, 'MAQ. EXTERIOR': 11.5 }
  },
  rollTubeDiscounts: {
    'TUBO DE CARGA EVO 80': { MOTOR: 9, 'MAQ. INTERIOR': 10.5, 'MAQ. EXTERIOR': 10.5 },
    'TUBO DE CARGA UNIVERS 280': { MOTOR: 10, 'MAQ. INTERIOR': 11.5, 'MAQ. EXTERIOR': 11.5 }
  },
  fabricWidthDiscounts: {
    'TUBO DE CARGA EVO 80': { MOTOR: 11, 'MAQ. INTERIOR': 13, 'MAQ. EXTERIOR': 13 },
    'TUBO DE CARGA UNIVERS 280': { MOTOR: 11, 'MAQ. INTERIOR': 13, 'MAQ. EXTERIOR': 13 }
  },
  minimumLineByProjection: galiciaMinimumLineByProjection
};

export function normalizeGaliciaParameters(input = {}) {
  const defaults = defaultGaliciaParameters;
  return {
    ...defaults,
    ...input,
    standardMaxWidth: positiveNumber(input.standardMaxWidth, defaults.standardMaxWidth),
    armSwitchWidth: positiveNumber(input.armSwitchWidth, defaults.armSwitchWidth),
    privateTube: normalizeTube(input.privateTube, defaults.privateTube),
    businessTube: normalizeTube(input.businessTube, defaults.businessTube),
    fabricDropAllowanceCm: nonNegativeNumber(input.fabricDropAllowanceCm, defaults.fabricDropAllowanceCm),
    seamAllowanceCm: nonNegativeNumber(input.seamAllowanceCm, defaults.seamAllowanceCm),
    seamBaseCm: nonNegativeNumber(input.seamBaseCm, defaults.seamBaseCm),
    stockLengths: normalizeStockLengths(input.stockLengths, defaults.stockLengths),
    widthDiscounts: normalizeDiscounts(input.widthDiscounts, defaults.widthDiscounts),
    rollTubeDiscounts: normalizeDiscounts(input.rollTubeDiscounts, defaults.rollTubeDiscounts),
    fabricWidthDiscounts: normalizeDiscounts(input.fabricWidthDiscounts, defaults.fabricWidthDiscounts),
    minimumLineByProjection: normalizeMinimumLines(input.minimumLineByProjection, defaults.minimumLineByProjection)
  };
}

export function suggestedGaliciaTube(destination, parameters = defaultGaliciaParameters) {
  const clean = String(destination || '').toUpperCase();
  if (clean === 'PARTICULAR') return parameters.privateTube;
  if (clean === 'HOSTELERÍA / EMPRESA') return parameters.businessTube;
  return '';
}

export function suggestedGaliciaArmCount(width, parameters = defaultGaliciaParameters) {
  return Number(width) > parameters.armSwitchWidth ? 3 : 2;
}

export function resolveGaliciaMotorPower(awning, parameters = defaultGaliciaParameters) {
  const selected = String(awning.motorPower || '').toUpperCase();
  if (awning.reglasModificadas && (selected === '55/17' || selected === '70/17')) return selected;
  return Number(awning.armCount) === 3 || suggestedGaliciaArmCount(awning.width, parameters) === 3 ? '70/17' : '55/17';
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function normalizeStockLengths(input, defaults) {
  if (!Array.isArray(input)) return [...defaults];
  const values = [...new Set(input.map(Number).filter((value) => Number.isFinite(value) && value > 0))].sort((a, b) => a - b);
  return values.length > 0 ? values : [...defaults];
}

function normalizeTube(value, fallback) {
  const clean = String(value || '').toUpperCase();
  if (clean.includes('UNIVERS')) return 'TUBO DE CARGA UNIVERS 280';
  if (clean.includes('EVO')) return 'TUBO DE CARGA EVO 80';
  return fallback;
}

function normalizeDiscounts(input, defaults) {
  const result = structuredClone(defaults);
  for (const tube of Object.keys(result)) {
    for (const device of Object.keys(result[tube])) {
      const value = Number(input?.[tube]?.[device]);
      if (Number.isFinite(value) && value >= 0) result[tube][device] = value;
    }
  }
  return result;
}

function normalizeMinimumLines(input, defaults) {
  if (!Array.isArray(input)) return structuredClone(defaults);
  return defaults.map((row) => {
    const candidate = input.find((item) => Number(item?.projection) === row.projection);
    const values = {};
    for (const arms of [2, 3]) {
      values[arms] = {};
      for (const device of ['MOTOR', 'MAQ. INTERIOR', 'MAQ. EXTERIOR']) {
        values[arms][device] = positiveNumber(candidate?.values?.[arms]?.[device], row.values[arms][device]);
      }
    }
    return { projection: row.projection, values };
  });
}
