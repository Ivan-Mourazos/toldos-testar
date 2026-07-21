export const puntoRectoDevices = ['MAQUINA', 'MOTOR'];

export const puntoRectoEstablishedProjections = [80, 90, 100, 110, 120, 130, 140, 150, 160];

export const defaultPuntoRectoParameters = {
  standardMaxWidth: 600,
  armSwitchWidth: 400,
  fabricDropMultiplier: Math.SQRT2,
  fabricDropAllowanceCm: 60,
  seamAllowanceCm: 2.5,
  seamBaseCm: 6.5,
  stockLengths: [600, 700],
  fabricWidthDiscounts: { MAQUINA: 12, MOTOR: 11 },
  rollTubeDiscounts: { MAQUINA: 11, MOTOR: 10 },
  loadBarDiscounts: { MAQUINA: 11, MOTOR: 10 },
  motorPowerByArm: { 2: '15/17', 3: '35/17', 4: '50/17' }
};

export function normalizePuntoRectoParameters(input = {}) {
  const defaults = defaultPuntoRectoParameters;
  return {
    ...defaults,
    ...input,
    standardMaxWidth: positive(input.standardMaxWidth, defaults.standardMaxWidth),
    armSwitchWidth: positive(input.armSwitchWidth, defaults.armSwitchWidth),
    fabricDropMultiplier: positive(input.fabricDropMultiplier, defaults.fabricDropMultiplier),
    fabricDropAllowanceCm: nonNegative(input.fabricDropAllowanceCm, defaults.fabricDropAllowanceCm),
    seamAllowanceCm: nonNegative(input.seamAllowanceCm, defaults.seamAllowanceCm),
    seamBaseCm: nonNegative(input.seamBaseCm, defaults.seamBaseCm),
    stockLengths: normalizeStockLengths(input.stockLengths, defaults.stockLengths),
    fabricWidthDiscounts: normalizeDeviceValues(input.fabricWidthDiscounts, defaults.fabricWidthDiscounts),
    rollTubeDiscounts: normalizeDeviceValues(input.rollTubeDiscounts, defaults.rollTubeDiscounts),
    loadBarDiscounts: normalizeDeviceValues(input.loadBarDiscounts, defaults.loadBarDiscounts),
    motorPowerByArm: normalizeMotorPower(input.motorPowerByArm, defaults.motorPowerByArm)
  };
}

export function suggestedPuntoRectoArmCount(width, parameters = defaultPuntoRectoParameters) {
  return Number(width) > parameters.armSwitchWidth ? 3 : 2;
}

export function resolvePuntoRectoMotorPower(armCount, parameters = defaultPuntoRectoParameters) {
  return parameters.motorPowerByArm[Number(armCount)] || parameters.motorPowerByArm[2];
}

function normalizeDeviceValues(input, defaults) {
  return Object.fromEntries(puntoRectoDevices.map((device) => [
    device,
    nonNegative(input?.[device], defaults[device])
  ]));
}

function normalizeMotorPower(input, defaults) {
  return Object.fromEntries([2, 3, 4].map((arms) => {
    const value = String(input?.[arms] || defaults[arms]);
    return [arms, ['15/17', '35/17', '50/17'].includes(value) ? value : defaults[arms]];
  }));
}

function normalizeStockLengths(input, defaults) {
  if (!Array.isArray(input)) return [...defaults];
  const values = [...new Set(input.map(Number).filter((value) => Number.isFinite(value) && value > 0))].sort((a, b) => a - b);
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
