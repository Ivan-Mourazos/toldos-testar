export const agataBoxEstablishedProjections = Object.freeze([150, 175, 200, 225, 250, 275, 300, 325, 350, 375, 400]);
export const agataBoxSubmodels = Object.freeze(['OPEN', 'SEMIOPEN', 'SEMICLOSE', 'COFRE']);

const minimumRows = [
  [150, 197.5, 297.3, 397, 207.5, 307.3, 407],
  [175, 222.5, 334.8, 447, 232.5, 344.8, 457],
  [200, 247.5, 372.3, 497, 257.5, 382.3, 507],
  [225, 272.5, 409.8, 547, 282.5, 419.8, 557],
  [250, 297.5, 447.3, 597, 307.5, 457.3, 607],
  [275, 344.1, 506.4, 668.6, 344.1, 506.4, 686.6],
  [300, 369.1, 543.9, 718.6, 369.1, 543.9, 718.6],
  [325, 394.1, 581.4, 768.6, 394.1, 581.4, 768.6],
  [350, 417.1, 618.9, 818.6, 419.1, 618.9, 818.6],
  [375, 444.1, 656.4, 868.6, 444.1, 656.4, 868.6],
  [400, 469.1, 693.9, 918.6, 469.1, 693.9, 918.6]
];

const motorRows = [
  [150, 35, 55, 70], [175, 35, 55, 70], [200, 35, 55, 70],
  [225, 40, 70, 85], [250, 55, 70, 85], [275, 55, 70, 85],
  [300, 55, 70, 100], [325, 55, 70, 100], [350, 55, 85, 100],
  [375, 55, 85, 100], [400, 55, 85, 100]
];

const openMachine = { squareBar: 3.8, loadBar: 11, diffuser: 14.2, lira: 12.5, protector: 12.5, enclosure: 0, roll: 13.2, fabric: 14.2 };
const openMotor = { squareBar: 3.8, loadBar: 11, diffuser: 14.2, lira: 7.9, protector: 7.9, enclosure: 0, roll: 12, fabric: 13 };
const semiMachine = { squareBar: 3.8, loadBar: 7.9, diffuser: 7.9, lira: 12.5, protector: 7.9, enclosure: 7.9, roll: 13.2, fabric: 14.2 };
const semiMotor = { squareBar: 3.8, loadBar: 7.9, diffuser: 7.9, lira: 12.5, protector: 7.9, enclosure: 7.9, roll: 13.2, fabric: 13 };
const cofreMotor = { squareBar: 3.8, loadBar: 7.9, diffuser: 7.9, lira: 7.9, protector: 7.9, enclosure: 7.9, roll: 12, fabric: 13 };

export const defaultAgataBoxParameters = Object.freeze({
  standardMaxWidth: 1200,
  maxWidthByArms: { 2: 600, 3: 900, 4: 1200 },
  fabricDropAllowanceCm: 45,
  seamAllowanceCm: 2.2,
  seamBaseCm: 7,
  rollStockLengths: [600, 700],
  profileStockLength: 700,
  supportBaseStartWidth: 600,
  supportBaseStepWidth: 150,
  minimumLineByProjection: minimumRows.map(([projection, m2, m3, m4, q2, q3, q4]) => ({
    projection,
    values: {
      MOTOR: { 2: m2, 3: m3, 4: m4 },
      MAQUINA: { 2: q2, 3: q3, 4: q4 }
    }
  })),
  motorPowerByProjection: motorRows.map(([projection, a2, a3, a4]) => ({
    projection,
    values: { 2: a2, 3: a3, 4: a4 }
  })),
  discounts: {
    OPEN: { MAQUINA: openMachine, MOTOR: openMotor },
    SEMI: { MAQUINA: semiMachine, MOTOR: semiMotor },
    COFRE: { MAQUINA: cofreMotor, MOTOR: cofreMotor }
  }
});

export function normalizeAgataBoxParameters(input = {}) {
  const defaults = defaultAgataBoxParameters;
  return {
    standardMaxWidth: positive(input.standardMaxWidth, defaults.standardMaxWidth),
    maxWidthByArms: armNumbers(input.maxWidthByArms, defaults.maxWidthByArms),
    fabricDropAllowanceCm: nonNegative(input.fabricDropAllowanceCm, defaults.fabricDropAllowanceCm),
    seamAllowanceCm: nonNegative(input.seamAllowanceCm, defaults.seamAllowanceCm),
    seamBaseCm: nonNegative(input.seamBaseCm, defaults.seamBaseCm),
    rollStockLengths: stockLengths(input.rollStockLengths, defaults.rollStockLengths),
    profileStockLength: positive(input.profileStockLength, defaults.profileStockLength),
    supportBaseStartWidth: positive(input.supportBaseStartWidth, defaults.supportBaseStartWidth),
    supportBaseStepWidth: positive(input.supportBaseStepWidth, defaults.supportBaseStepWidth),
    minimumLineByProjection: normalizeMinimumRows(input.minimumLineByProjection, defaults.minimumLineByProjection),
    motorPowerByProjection: normalizeMotorRows(input.motorPowerByProjection, defaults.motorPowerByProjection),
    discounts: normalizeDiscounts(input.discounts, defaults.discounts)
  };
}

export function normalizeAgataSubmodel(value) {
  const clean = String(value || '').trim().toUpperCase().replace(/[ _-]/g, '');
  if (clean === 'OPEN') return 'OPEN';
  if (clean === 'SEMI' || clean === 'SEMIOPEN' || clean === 'SEMICLOSE') return 'SEMI';
  if (clean === 'COFRE' || clean === 'FULLBOX') return 'COFRE';
  return '';
}

export function suggestedAgataArmCount(width) {
  const value = Number(width) || 0;
  if (value <= 600) return 2;
  if (value <= 900) return 3;
  return 4;
}

export function resolveAgataMinimumLine(projection, device, arms, parameters = defaultAgataBoxParameters) {
  const row = parameters.minimumLineByProjection.find((item) => item.projection === Number(projection));
  return Number(row?.values?.[device]?.[arms]) || 0;
}

export function resolveAgataMotorPower(projection, arms, parameters = defaultAgataBoxParameters) {
  const row = parameters.motorPowerByProjection.find((item) => item.projection === Number(projection));
  return Number(row?.values?.[arms]) || 0;
}

function normalizeMinimumRows(input, defaults) {
  return defaults.map((fallback) => {
    const row = Array.isArray(input) ? input.find((item) => Number(item?.projection) === fallback.projection) : null;
    return {
      projection: fallback.projection,
      values: {
        MOTOR: armNumbers(row?.values?.MOTOR, fallback.values.MOTOR),
        MAQUINA: armNumbers(row?.values?.MAQUINA, fallback.values.MAQUINA)
      }
    };
  });
}

function normalizeMotorRows(input, defaults) {
  return defaults.map((fallback) => {
    const row = Array.isArray(input) ? input.find((item) => Number(item?.projection) === fallback.projection) : null;
    return { projection: fallback.projection, values: armNumbers(row?.values, fallback.values) };
  });
}

function normalizeDiscounts(input, defaults) {
  return Object.fromEntries(Object.entries(defaults).map(([submodel, devices]) => [
    submodel,
    Object.fromEntries(Object.entries(devices).map(([device, pieces]) => [
      device,
      Object.fromEntries(Object.entries(pieces).map(([piece, fallback]) => [
        piece,
        nonNegative(input?.[submodel]?.[device]?.[piece], fallback)
      ]))
    ]))
  ]));
}

function armNumbers(input, defaults) {
  return Object.fromEntries(([2, 3, 4]).map((arms) => [arms, positive(input?.[arms], defaults[arms])]));
}

function stockLengths(input, defaults) {
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
