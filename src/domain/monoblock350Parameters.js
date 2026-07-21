export const monoblock350Devices = ['MAQUINA', 'MOTOR'];

export const monoblock350EstablishedProjections = [150, 175, 200, 225, 250, 275, 300, 325, 350];

const rows = [
  [150, [215, 307, 404], [600, 900, 1200], ['40/17', '55/17', '85/17']],
  [175, [237, 345, 454], [600, 900, 1200], ['40/17', '55/17', '85/17']],
  [200, [262, 382, 504], [600, 900, 1200], ['40/17', '55/17', '85/17']],
  [225, [287, 429, 554], [600, 900, 1200], ['40/17', '70/17', '85/17']],
  [250, [312, 457, 604], [600, 900, 1200], ['50/12', '70/17', '100/12']],
  [275, [337, 495, 654], [600, 900, 1200], ['50/12', '70/17', '100/12']],
  [300, [362, 532, 704], [600, 900, 1200], ['50/12', '70/17', '100/12']],
  [325, [387, 570, 754], [550, 750, 1100], ['50/12', '85/17', '100/12']],
  [350, [412, 607, 804], [550, 750, 1100], ['50/12', '85/17', '100/12']]
];

export const defaultMonoblock350Parameters = {
  fabricDropAllowanceCm: 40,
  valanceExtraCm: 5,
  seamAllowanceCm: 2.5,
  seamBaseCm: 6.5,
  stockLengths: [600, 700],
  squareBarStockLength: 700,
  supportGapThresholdCm: 400,
  supportEdgeOffsetCm: 60,
  curronStartWidthCm: 650,
  curronSecondWidthCm: 850,
  discounts: {
    MAQUINA: { fabric: 14.2, roll: 13.2, loadBar: 12.2, squareBar: 1 },
    MOTOR: { fabric: 13, roll: 12, loadBar: 11.5, squareBar: 1 }
  },
  dimensionalRules: rows.map(([projection, minimums, maximums, motors]) => ({
    projection,
    values: Object.fromEntries([2, 3, 4].map((arms, index) => [arms, {
      minimum: minimums[index],
      maximum: maximums[index],
      motorPower: motors[index]
    }]))
  }))
};

export function normalizeMonoblock350Parameters(input = {}) {
  const defaults = defaultMonoblock350Parameters;
  return {
    ...defaults,
    ...input,
    fabricDropAllowanceCm: nonNegative(input.fabricDropAllowanceCm, defaults.fabricDropAllowanceCm),
    valanceExtraCm: nonNegative(input.valanceExtraCm, defaults.valanceExtraCm),
    seamAllowanceCm: nonNegative(input.seamAllowanceCm, defaults.seamAllowanceCm),
    seamBaseCm: nonNegative(input.seamBaseCm, defaults.seamBaseCm),
    stockLengths: normalizeStockLengths(input.stockLengths, defaults.stockLengths),
    squareBarStockLength: positive(input.squareBarStockLength, defaults.squareBarStockLength),
    supportGapThresholdCm: positive(input.supportGapThresholdCm, defaults.supportGapThresholdCm),
    supportEdgeOffsetCm: nonNegative(input.supportEdgeOffsetCm, defaults.supportEdgeOffsetCm),
    curronStartWidthCm: positive(input.curronStartWidthCm, defaults.curronStartWidthCm),
    curronSecondWidthCm: positive(input.curronSecondWidthCm, defaults.curronSecondWidthCm),
    discounts: normalizeDiscounts(input.discounts, defaults.discounts),
    dimensionalRules: normalizeRules(input.dimensionalRules, defaults.dimensionalRules)
  };
}

export function resolveMonoblockRule(projection, armCount, parameters = defaultMonoblock350Parameters) {
  const row = parameters.dimensionalRules.find((item) => Number(item.projection) === Number(projection));
  return row?.values?.[Number(armCount)] || null;
}

export function suggestedMonoblockArmCount(width, projection, parameters = defaultMonoblock350Parameters) {
  return [2, 3, 4].find((arms) => {
    const rule = resolveMonoblockRule(projection, arms, parameters);
    return rule && Number(width) >= rule.minimum && Number(width) <= rule.maximum;
  }) || 2;
}

export function resolveMonoblockSupportCount(width, projection, armCount, parameters = defaultMonoblock350Parameters) {
  const rule = resolveMonoblockRule(projection, armCount, parameters);
  if (!rule) return 0;
  const freeSpan = Number(width) - parameters.supportEdgeOffsetCm
    - (Number(armCount) - 2) * (rule.minimum / Number(armCount));
  const intermediate = freeSpan < parameters.supportGapThresholdCm ? 1 : 2;
  return Number(armCount) * 2 + intermediate;
}

export function resolveMonoblockCurronCount(width, parameters = defaultMonoblock350Parameters) {
  if (Number(width) <= parameters.curronStartWidthCm) return 0;
  return Number(width) <= parameters.curronSecondWidthCm ? 1 : 2;
}

function normalizeDiscounts(input, defaults) {
  return Object.fromEntries(monoblock350Devices.map((device) => [device, {
    fabric: nonNegative(input?.[device]?.fabric, defaults[device].fabric),
    roll: nonNegative(input?.[device]?.roll, defaults[device].roll),
    loadBar: nonNegative(input?.[device]?.loadBar, defaults[device].loadBar),
    squareBar: nonNegative(input?.[device]?.squareBar, defaults[device].squareBar)
  }]));
}

function normalizeRules(input, defaults) {
  return defaults.map((defaultRow) => {
    const row = Array.isArray(input) ? input.find((item) => Number(item?.projection) === defaultRow.projection) : null;
    return {
      projection: defaultRow.projection,
      values: Object.fromEntries([2, 3, 4].map((arms) => [arms, {
        minimum: positive(row?.values?.[arms]?.minimum, defaultRow.values[arms].minimum),
        maximum: positive(row?.values?.[arms]?.maximum, defaultRow.values[arms].maximum),
        motorPower: normalizeMotor(row?.values?.[arms]?.motorPower, defaultRow.values[arms].motorPower)
      }]))
    };
  });
}

function normalizeMotor(value, fallback) {
  const clean = String(value || '').trim();
  return /^\d+\/\d+$/.test(clean) ? clean : fallback;
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
