export const cuarzoBoxMinimumLineByProjection = [125, 150, 175, 200, 225, 250]
  .map((projection) => ({
    projection,
    values: { MAQUINA: projection + 34, MOTOR: projection + 34 }
  }));

export const cuarzoBoxEstablishedProjections = cuarzoBoxMinimumLineByProjection
  .map((item) => item.projection);

export const defaultCuarzoBoxParameters = {
  standardMaxWidth: 450,
  fabricDropAllowanceCm: 45,
  seamAllowanceCm: 0,
  seamBaseCm: 6,
  stockLengths: [450],
  profileDiscountCm: { MAQUINA: 15.6, MOTOR: 15.6 },
  rollDiscountCm: { MAQUINA: 17.5, MOTOR: 19.2 },
  fabricWidthDiscountCm: { MAQUINA: 18.5, MOTOR: 20.2 },
  protectorDiscountCm: { MAQUINA: 16.6, MOTOR: 16.6 },
  minimumLineByProjection: cuarzoBoxMinimumLineByProjection,
  motorPowerByProjection: cuarzoBoxMinimumLineByProjection.map(({ projection }) => ({ projection, power: 35 }))
};

export function normalizeCuarzoBoxParameters(input = {}) {
  const defaults = defaultCuarzoBoxParameters;
  return {
    ...defaults,
    ...input,
    standardMaxWidth: positive(input.standardMaxWidth, defaults.standardMaxWidth),
    fabricDropAllowanceCm: nonNegative(input.fabricDropAllowanceCm, defaults.fabricDropAllowanceCm),
    seamAllowanceCm: nonNegative(input.seamAllowanceCm, defaults.seamAllowanceCm),
    seamBaseCm: nonNegative(input.seamBaseCm, defaults.seamBaseCm),
    stockLengths: normalizeStockLengths(input.stockLengths, defaults.stockLengths),
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

function normalizeStockLengths(input, defaults) {
  if (!Array.isArray(input)) return [...defaults];
  const values = [...new Set(input.map(Number).filter((value) => Number.isFinite(value) && value > 0))]
    .sort((left, right) => left - right);
  return values.length ? values : [...defaults];
}

function positive(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegative(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
