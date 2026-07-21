export const maxiscreemDevices = ['MAQUINA', 'MOTOR'];

export const maxiscreemVariants = [
  'COFRE CON CABLE',
  'COFRE CON VARILLA',
  'COFRE',
  'CON CABLE',
  'CON VARILLA'
];

export const defaultMaxiscreemParameters = {
  standardMaxWidth: 500,
  standardMaxDrop: 500,
  fabricDropAllowanceCm: 40,
  valanceExtraCm: 5,
  seamAllowanceCm: 0,
  seamBaseCm: 0,
  rollStockLengths: [600],
  profileStockLengths: [500, 700],
  guideDiscountCm: 2,
  discounts: {
    COFRE: {
      MAQUINA: { fabric: 14.1, roll: 12.5, loadBar: 15.1, boxProfile: 8.5 },
      MOTOR: { fabric: 12.6, roll: 9.7, loadBar: 11.6, boxProfile: 5 }
    },
    SIN_COFRE: {
      MAQUINA: { fabric: 13, roll: 10.1, loadBar: 10, boxProfile: 0 },
      MOTOR: { fabric: 12, roll: 8.6, loadBar: 10, boxProfile: 0 }
    }
  }
};

export function normalizeMaxiscreemParameters(value = {}) {
  return {
    standardMaxWidth: positive(value.standardMaxWidth, defaultMaxiscreemParameters.standardMaxWidth),
    standardMaxDrop: positive(value.standardMaxDrop, defaultMaxiscreemParameters.standardMaxDrop),
    fabricDropAllowanceCm: nonNegative(value.fabricDropAllowanceCm, defaultMaxiscreemParameters.fabricDropAllowanceCm),
    valanceExtraCm: nonNegative(value.valanceExtraCm, defaultMaxiscreemParameters.valanceExtraCm),
    seamAllowanceCm: nonNegative(value.seamAllowanceCm, defaultMaxiscreemParameters.seamAllowanceCm),
    seamBaseCm: nonNegative(value.seamBaseCm, defaultMaxiscreemParameters.seamBaseCm),
    rollStockLengths: stockLengths(value.rollStockLengths, defaultMaxiscreemParameters.rollStockLengths),
    profileStockLengths: stockLengths(value.profileStockLengths, defaultMaxiscreemParameters.profileStockLengths),
    guideDiscountCm: nonNegative(value.guideDiscountCm, defaultMaxiscreemParameters.guideDiscountCm),
    discounts: normalizeDiscounts(value.discounts)
  };
}

export function normalizeMaxiscreemVariant(value) {
  const clean = String(value || '').trim().toUpperCase().replace(/\s+/g, ' ');
  return maxiscreemVariants.includes(clean) ? clean : '';
}

export function maxiscreemVariantGroup(value) {
  return normalizeMaxiscreemVariant(value).startsWith('COFRE') ? 'COFRE' : 'SIN_COFRE';
}

export function maxiscreemGuide(value) {
  const variant = normalizeMaxiscreemVariant(value);
  if (variant.includes('CABLE')) return 'CABLE';
  if (variant.includes('VARILLA')) return 'VARILLA';
  return '';
}

function normalizeDiscounts(value = {}) {
  return Object.fromEntries(['COFRE', 'SIN_COFRE'].map((group) => [group,
    Object.fromEntries(maxiscreemDevices.map((device) => {
      const defaults = defaultMaxiscreemParameters.discounts[group][device];
      const source = value?.[group]?.[device] || {};
      return [device, {
        fabric: nonNegative(source.fabric, defaults.fabric),
        roll: nonNegative(source.roll, defaults.roll),
        loadBar: nonNegative(source.loadBar, defaults.loadBar),
        boxProfile: nonNegative(source.boxProfile, defaults.boxProfile)
      }];
    }))
  ]));
}

function stockLengths(value, fallback) {
  const values = Array.isArray(value) ? value.map(Number).filter((item) => item > 0) : [];
  return values.length ? [...new Set(values)].sort((left, right) => left - right) : [...fallback];
}

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nonNegative(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}
