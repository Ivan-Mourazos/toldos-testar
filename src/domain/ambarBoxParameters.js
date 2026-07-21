export const ambarBoxEstablishedProjections = Object.freeze([80, 90, 100, 110, 120, 130, 140]);

export const defaultAmbarBoxParameters = Object.freeze({
  standardMaxWidth: 500,
  fabricDropMultiplier: Math.SQRT2,
  fabricDropAllowanceCm: 55,
  seamAllowanceCm: 2.2,
  seamBaseCm: 7,
  profileStockLengths: [500, 700],
  rollStockLengths: [600],
  fabricWidthDiscounts: {
    FRONTAL_TECHO: { MAQUINA: 11, MOTOR: 11 },
    ENTRE_PAREDES: { MAQUINA: 12.5, MOTOR: 12.5 }
  },
  rollTubeDiscounts: {
    FRONTAL_TECHO: { MAQUINA: 8.3, MOTOR: 7 },
    ENTRE_PAREDES: { MAQUINA: 10.8, MOTOR: 9.5 }
  },
  profileDiscounts: {
    FRONTAL_TECHO: { MAQUINA: 8, MOTOR: 8 },
    ENTRE_PAREDES: { MAQUINA: 10.5, MOTOR: 10.5 }
  },
  motorPower: '15/17'
});

export function normalizeAmbarBoxParameters(input = {}) {
  const defaults = defaultAmbarBoxParameters;
  return {
    standardMaxWidth: positive(input.standardMaxWidth, defaults.standardMaxWidth),
    fabricDropMultiplier: positive(input.fabricDropMultiplier, defaults.fabricDropMultiplier),
    fabricDropAllowanceCm: nonNegative(input.fabricDropAllowanceCm, defaults.fabricDropAllowanceCm),
    seamAllowanceCm: nonNegative(input.seamAllowanceCm, defaults.seamAllowanceCm),
    seamBaseCm: nonNegative(input.seamBaseCm, defaults.seamBaseCm),
    profileStockLengths: stockLengths(input.profileStockLengths, defaults.profileStockLengths),
    rollStockLengths: stockLengths(input.rollStockLengths, defaults.rollStockLengths),
    fabricWidthDiscounts: discountMatrix(input.fabricWidthDiscounts, defaults.fabricWidthDiscounts),
    rollTubeDiscounts: discountMatrix(input.rollTubeDiscounts, defaults.rollTubeDiscounts),
    profileDiscounts: discountMatrix(input.profileDiscounts, defaults.profileDiscounts),
    motorPower: /^\d+\/\d+$/.test(String(input.motorPower || '')) ? String(input.motorPower) : defaults.motorPower
  };
}

export function ambarPlacementGroup(placement) {
  return String(placement || '').trim().toUpperCase() === 'ENTRE PAREDES'
    ? 'ENTRE_PAREDES'
    : 'FRONTAL_TECHO';
}

function discountMatrix(input, defaults) {
  return Object.fromEntries(Object.entries(defaults).map(([placement, devices]) => [
    placement,
    Object.fromEntries(Object.entries(devices).map(([device, fallback]) => [
      device,
      nonNegative(input?.[placement]?.[device], fallback)
    ]))
  ]));
}

function stockLengths(input, defaults) {
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
