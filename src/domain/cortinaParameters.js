const devices = ['MAQ. INTERIOR', 'MAQ. EXTERIOR', 'MOTOR'];

export const defaultCortinaParameters = {
  standardMaxWidth: 500,
  standardMaxDrop: 400,
  fabricDropAllowanceCm: 45,
  seamAllowanceCm: 0,
  seamBaseCm: 0,
  stockLengths: [600],
  fabricWidthDiscounts: {
    'MAQ. INTERIOR': 12,
    'MAQ. EXTERIOR': 12.5,
    MOTOR: 11
  },
  rollTubeDiscounts: {
    'MAQ. INTERIOR': 11,
    'MAQ. EXTERIOR': 11,
    MOTOR: 10
  },
  loadProfileDiscounts: {
    'MAQ. INTERIOR': 11,
    'MAQ. EXTERIOR': 11,
    MOTOR: 10
  }
};

export function normalizeCortinaParameters(input = {}) {
  const defaults = defaultCortinaParameters;
  return {
    ...defaults,
    ...input,
    standardMaxWidth: positive(input.standardMaxWidth, defaults.standardMaxWidth),
    standardMaxDrop: positive(input.standardMaxDrop, defaults.standardMaxDrop),
    fabricDropAllowanceCm: nonNegative(input.fabricDropAllowanceCm, defaults.fabricDropAllowanceCm),
    seamAllowanceCm: nonNegative(input.seamAllowanceCm, defaults.seamAllowanceCm),
    seamBaseCm: nonNegative(input.seamBaseCm, defaults.seamBaseCm),
    stockLengths: normalizeStockLengths(input.stockLengths, defaults.stockLengths),
    fabricWidthDiscounts: normalizeDiscounts(input.fabricWidthDiscounts, defaults.fabricWidthDiscounts),
    rollTubeDiscounts: normalizeDiscounts(input.rollTubeDiscounts, defaults.rollTubeDiscounts),
    loadProfileDiscounts: normalizeDiscounts(input.loadProfileDiscounts, defaults.loadProfileDiscounts)
  };
}

function normalizeDiscounts(input, defaults) {
  return Object.fromEntries(devices.map((device) => [
    device,
    nonNegative(input?.[device], defaults[device])
  ]));
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
