export const xacobeoDevices = ['MAQ. EXTERIOR', 'MAQ. INTERIOR', 'MOTOR'];

export const xacobeoMinimumLineByProjection = [125, 150, 175, 200, 225, 250]
  .map((projection) => ({
    projection,
    values: {
      'MAQ. EXTERIOR': projection + 32,
      'MAQ. INTERIOR': projection + 37,
      MOTOR: projection + 32
    }
  }));

export const xacobeoEstablishedProjections = xacobeoMinimumLineByProjection
  .map((item) => item.projection);

export const defaultXacobeoParameters = {
  standardMaxWidth: 450,
  fabricDropAllowanceCm: 45,
  seamAllowanceCm: 2.5,
  seamBaseCm: 6.5,
  stockLengths: [600, 700],
  fabricWidthDiscounts: {
    'MAQ. EXTERIOR': 12.5,
    'MAQ. INTERIOR': 12,
    MOTOR: 11
  },
  rollTubeDiscounts: {
    'MAQ. EXTERIOR': 10.9,
    'MAQ. INTERIOR': 10.6,
    MOTOR: 8.9
  },
  loadBarDiscounts: {
    'MAQ. EXTERIOR': 9.9,
    'MAQ. INTERIOR': 9.6,
    MOTOR: 8.7
  },
  minimumLineByProjection: xacobeoMinimumLineByProjection
};

export function normalizeXacobeoParameters(input = {}) {
  const defaults = defaultXacobeoParameters;
  return {
    ...defaults,
    ...input,
    standardMaxWidth: positive(input.standardMaxWidth, defaults.standardMaxWidth),
    fabricDropAllowanceCm: nonNegative(input.fabricDropAllowanceCm, defaults.fabricDropAllowanceCm),
    seamAllowanceCm: nonNegative(input.seamAllowanceCm, defaults.seamAllowanceCm),
    seamBaseCm: nonNegative(input.seamBaseCm, defaults.seamBaseCm),
    stockLengths: normalizeStockLengths(input.stockLengths, defaults.stockLengths),
    fabricWidthDiscounts: normalizeDiscounts(input.fabricWidthDiscounts, defaults.fabricWidthDiscounts),
    rollTubeDiscounts: normalizeDiscounts(input.rollTubeDiscounts, defaults.rollTubeDiscounts),
    loadBarDiscounts: normalizeDiscounts(input.loadBarDiscounts, defaults.loadBarDiscounts),
    minimumLineByProjection: normalizeMinimumLines(input.minimumLineByProjection, defaults.minimumLineByProjection)
  };
}

function normalizeDiscounts(input, defaults) {
  return Object.fromEntries(xacobeoDevices.map((device) => [
    device,
    nonNegative(input?.[device], defaults[device])
  ]));
}

function normalizeMinimumLines(input, defaults) {
  if (!Array.isArray(input)) return structuredClone(defaults);
  return defaults.map((row) => {
    const candidate = input.find((item) => Number(item?.projection) === row.projection);
    return {
      projection: row.projection,
      values: Object.fromEntries(xacobeoDevices.map((device) => [
        device,
        positive(candidate?.values?.[device], row.values[device])
      ]))
    };
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
