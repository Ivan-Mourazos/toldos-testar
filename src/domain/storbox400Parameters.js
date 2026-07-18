import {
  boxMotorPowerByProjection,
  coralBoxMinimumLineByProjection,
  perlaBoxMinimumLineByProjection
} from './storbox400Constants.js';

const shared = {
  standardMaxWidth: 600,
  fabricDropAllowanceCm: 45,
  seamAllowanceCm: 0,
  stockLengths: [600],
  motorPowerByProjection: boxMotorPowerByProjection
};

export const defaultPerlaBoxParameters = {
  ...shared,
  seamBaseCm: 6,
  profileDiscountCm: { MAQUINA: 15.7, MOTOR: 15.7 },
  rollDiscountCm: { MAQUINA: 13.1, MOTOR: 13.5 },
  fabricWidthDiscountCm: { MAQUINA: 19.2, MOTOR: 19.2 },
  protectorDiscountCm: { MAQUINA: 15.7, MOTOR: 15.7 },
  minimumLineByProjection: perlaBoxMinimumLineByProjection
};

export const defaultCoralBoxParameters = {
  ...shared,
  seamBaseCm: 0,
  profileDiscountCm: { MAQUINA: 18.8, MOTOR: 11.6 },
  rollDiscountCm: { MAQUINA: 21.6, MOTOR: 16 },
  fabricWidthDiscountCm: { MAQUINA: 22.6, MOTOR: 17 },
  protectorDiscountCm: { MAQUINA: 19.2, MOTOR: 12 },
  minimumLineByProjection: coralBoxMinimumLineByProjection
};

export function normalizePerlaBoxParameters(input = {}) {
  return normalizeBoxParameters(input, defaultPerlaBoxParameters);
}

export function normalizeCoralBoxParameters(input = {}) {
  return normalizeBoxParameters(input, defaultCoralBoxParameters);
}

export function resolveBoxMotorPower(projection, parameters) {
  const rows = parameters.motorPowerByProjection;
  const exact = rows.find((item) => item.projection === Number(projection));
  const next = rows.find((item) => item.projection >= Number(projection));
  return Number((exact || next || rows[rows.length - 1]).power);
}

function normalizeBoxParameters(input, defaults) {
  return {
    ...defaults,
    ...input,
    standardMaxWidth: positive(input.standardMaxWidth, defaults.standardMaxWidth),
    fabricDropAllowanceCm: nonNegative(input.fabricDropAllowanceCm, defaults.fabricDropAllowanceCm),
    seamAllowanceCm: nonNegative(input.seamAllowanceCm, defaults.seamAllowanceCm),
    seamBaseCm: nonNegative(input.seamBaseCm, defaults.seamBaseCm),
    stockLengths: stockLengths(input.stockLengths, defaults.stockLengths),
    profileDiscountCm: normalizeDiscounts(input.profileDiscountCm, defaults.profileDiscountCm),
    rollDiscountCm: normalizeDiscounts(input.rollDiscountCm, defaults.rollDiscountCm),
    fabricWidthDiscountCm: normalizeDiscounts(input.fabricWidthDiscountCm, defaults.fabricWidthDiscountCm),
    protectorDiscountCm: normalizeDiscounts(input.protectorDiscountCm, defaults.protectorDiscountCm),
    minimumLineByProjection: normalizeMinimumLines(input.minimumLineByProjection, defaults.minimumLineByProjection),
    motorPowerByProjection: normalizeMotorPowers(input.motorPowerByProjection, defaults.motorPowerByProjection)
  };
}

function normalizeDiscounts(input, defaults) {
  return {
    MAQUINA: nonNegative(input?.MAQUINA, defaults.MAQUINA),
    MOTOR: nonNegative(input?.MOTOR, defaults.MOTOR)
  };
}

function positive(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegative(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function stockLengths(input, defaults) {
  if (!Array.isArray(input)) return [...defaults];
  const values = [...new Set(input.map(Number).filter((value) => Number.isFinite(value) && value > 0))]
    .sort((left, right) => left - right);
  return values.length ? values : [...defaults];
}

function normalizeMinimumLines(input, defaults) {
  if (!Array.isArray(input)) return structuredClone(defaults);
  return defaults.map((row) => {
    const candidate = input.find((item) => Number(item?.projection) === row.projection);
    return {
      projection: row.projection,
      values: {
        MAQUINA: positive(candidate?.values?.MAQUINA, row.values.MAQUINA),
        MOTOR: positive(candidate?.values?.MOTOR, row.values.MOTOR)
      }
    };
  });
}

function normalizeMotorPowers(input, defaults) {
  if (!Array.isArray(input)) return structuredClone(defaults);
  return defaults.map((row) => {
    const candidate = input.find((item) => Number(item?.projection) === row.projection);
    return { projection: row.projection, power: positive(candidate?.power, row.power) };
  });
}
