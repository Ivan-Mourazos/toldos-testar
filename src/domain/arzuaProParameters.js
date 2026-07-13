import { minimumLineByArm } from './arzuaProConstants.js';

export const defaultArzuaProParameters = {
  standardMaxWidth: 600,
  motor70WidthFrom: 600,
  privateTube: 'TUBO DE CARGA EVO 80',
  businessTube: 'TUBO DE CARGA UNIVERS 280',
  widthDiscounts: {
    'TUBO DE CARGA EVO 80': { MOTOR: 9.8, 'MAQ. INTERIOR': 10.2, 'MAQ. EXTERIOR': 10.4 },
    'TUBO DE CARGA UNIVERS 280': { MOTOR: 9.8, 'MAQ. INTERIOR': 11.2, 'MAQ. EXTERIOR': 11.4 }
  },
  rollTubeDiscounts: {
    'TUBO DE CARGA EVO 80': { MOTOR: 9.8, 'MAQ. INTERIOR': 11.2, 'MAQ. EXTERIOR': 11.4 },
    'TUBO DE CARGA UNIVERS 280': { MOTOR: 9.8, 'MAQ. INTERIOR': 11.2, 'MAQ. EXTERIOR': 11.4 }
  },
  fabricWidthDiscounts: {
    'TUBO DE CARGA EVO 80': { MOTOR: 11, 'MAQ. INTERIOR': 13, 'MAQ. EXTERIOR': 13 },
    'TUBO DE CARGA UNIVERS 280': { MOTOR: 11, 'MAQ. INTERIOR': 13, 'MAQ. EXTERIOR': 13 }
  },
  minimumLineByArm
};

export function normalizeArzuaProParameters(input = {}) {
  const defaults = defaultArzuaProParameters;
  return {
    ...defaults,
    ...input,
    standardMaxWidth: positiveNumber(input.standardMaxWidth, defaults.standardMaxWidth),
    motor70WidthFrom: positiveNumber(input.motor70WidthFrom, defaults.motor70WidthFrom),
    privateTube: normalizeTube(input.privateTube, defaults.privateTube),
    businessTube: normalizeTube(input.businessTube, defaults.businessTube),
    widthDiscounts: normalizeDiscounts(input.widthDiscounts, defaults.widthDiscounts),
    rollTubeDiscounts: normalizeDiscounts(input.rollTubeDiscounts, defaults.rollTubeDiscounts),
    fabricWidthDiscounts: normalizeDiscounts(input.fabricWidthDiscounts, defaults.fabricWidthDiscounts),
    minimumLineByArm: normalizeMinimumLines(input.minimumLineByArm, defaults.minimumLineByArm)
  };
}

export function suggestedTubeForDestination(destination, parameters = defaultArzuaProParameters) {
  const clean = String(destination || '').toUpperCase();
  if (clean === 'PARTICULAR') return parameters.privateTube;
  if (clean === 'HOSTELERÍA / EMPRESA') return parameters.businessTube;
  return '';
}

export function resolveArzuaSupport() {
  return 'ARZUA';
}

export function resolveArzuaMotorPower(awning, parameters = defaultArzuaProParameters) {
  const selected = String(awning.motorPower || '').toUpperCase();
  if (selected === '55/17' || selected === '70/17') return selected;
  return Number(awning.width) >= parameters.motor70WidthFrom ? '70/17' : '55/17';
}

function positiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
    const candidate = input.find((item) => Number(item?.arm) === row.arm);
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
