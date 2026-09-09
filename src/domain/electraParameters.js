export const electraDevices = ['MAQ. INTERIOR', 'MAQ. EXTERIOR', 'MOTOR'];

export const electraVariants = [
  'CON COFRE / CON GUÍA',
  'CON COFRE / SIN GUÍA',
  'SIN COFRE / CON GUÍA',
  'SIN COFRE / SIN GUÍA'
];

export const electraMatrixSupports = [
  'SOPORTE ELIT VERTICAL',
  'SOPORTES ALMAGRO',
  'UNIVERSAL 3 AGUJEROS',
  'SOPORTE MAXISCREEN'
];

export const electraCofreSupport = 'SOPORTE MAXISCREEM BOX';

export const electraSupports = [
  ...electraMatrixSupports,
  electraCofreSupport
];

export const electraMotors = [
  { value: 'METEOR 20/17', code: 'METEOR20//17', description: 'MOTOR METEOR 20/17' },
  { value: 'SUNILUS 15/17 IO', code: 'SUNILUSIO15//17', description: 'MOTOR SOMFY SUNILUS 15/17 IO' }
];

export const defaultElectraParameters = {
  standardMaxWidth: 500,
  standardMaxDrop: 300,
  fabricDropAllowanceCm: {
    'MAQ. INTERIOR': 45,
    'MAQ. EXTERIOR': 45,
    MOTOR: 40
  },
  seamAllowanceCm: 2.2,
  seamBaseCm: 7,
  rollStockLengths: [600],
  profileStockLengths: [500, 700],
  guideStockLengths: [500, 600],
  supportDiscounts: {
    'SOPORTE ELIT VERTICAL': {
      'MAQ. INTERIOR': { fabric: 10, roll: 8, loadBar: 9.5, guide: 14 },
      'MAQ. EXTERIOR': { fabric: 10, roll: 8, loadBar: 9.5, guide: 14 },
      MOTOR: { fabric: 10, roll: 8, loadBar: 9.5, guide: 14 }
    },
    'SOPORTES ALMAGRO': {
      'MAQ. INTERIOR': { fabric: 10, roll: 9, loadBar: 9.5, guide: 14.5 },
      'MAQ. EXTERIOR': { fabric: 10, roll: 9, loadBar: 9.5, guide: 14.5 },
      MOTOR: { fabric: 9.5, roll: 8.5, loadBar: 9, guide: 14.5 }
    },
    'UNIVERSAL 3 AGUJEROS': {
      'MAQ. INTERIOR': { fabric: 12, roll: 11, loadBar: 11, guide: 14 },
      'MAQ. EXTERIOR': { fabric: 12.5, roll: 11, loadBar: 11, guide: 14 },
      MOTOR: { fabric: 11, roll: 10, loadBar: 10, guide: 14 }
    },
    'SOPORTE MAXISCREEN': {
      'MAQ. INTERIOR': { fabric: 12, roll: 11, loadBar: 11, guide: 14 },
      'MAQ. EXTERIOR': { fabric: 12.5, roll: 11, loadBar: 11, guide: 14 },
      MOTOR: { fabric: 11, roll: 10, loadBar: 10, guide: 14 }
    }
  },
  cofreDiscounts: {
    'MAQ. INTERIOR': { fabric: 14.1, roll: 12.5, loadBar: 15.1, boxProfile: 8.5 },
    'MAQ. EXTERIOR': { fabric: 14.1, roll: 12.5, loadBar: 15.1, boxProfile: 8.5 },
    MOTOR: { fabric: 12.6, roll: 9.7, loadBar: 11.6, boxProfile: 5 }
  }
};

export function normalizeElectraParameters(value = {}) {
  const defaults = defaultElectraParameters;
  return {
    standardMaxWidth: positive(value.standardMaxWidth, defaults.standardMaxWidth),
    standardMaxDrop: positive(value.standardMaxDrop, defaults.standardMaxDrop),
    fabricDropAllowanceCm: normalizeDeviceNumbers(value.fabricDropAllowanceCm, defaults.fabricDropAllowanceCm),
    seamAllowanceCm: nonNegative(value.seamAllowanceCm, defaults.seamAllowanceCm),
    seamBaseCm: nonNegative(value.seamBaseCm, defaults.seamBaseCm),
    rollStockLengths: normalizeStockLengths(value.rollStockLengths, defaults.rollStockLengths),
    profileStockLengths: normalizeStockLengths(value.profileStockLengths, defaults.profileStockLengths),
    guideStockLengths: normalizeStockLengths(value.guideStockLengths, defaults.guideStockLengths),
    supportDiscounts: Object.fromEntries(electraMatrixSupports.map((support) => [
      support,
      Object.fromEntries(electraDevices.map((device) => [
        device,
        normalizeDiscountSet(value.supportDiscounts?.[support]?.[device], defaults.supportDiscounts[support][device], false)
      ]))
    ])),
    cofreDiscounts: Object.fromEntries(electraDevices.map((device) => [
      device,
      normalizeDiscountSet(value.cofreDiscounts?.[device], defaults.cofreDiscounts[device], true)
    ]))
  };
}

export function normalizeElectraVariant(value) {
  const clean = normalizeText(value)
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/GUIA/g, 'GUÍA');
  const aliases = new Map([
    ['CON COFRE CON GUÍA', 'CON COFRE / CON GUÍA'],
    ['CON COFRE SIN GUÍA', 'CON COFRE / SIN GUÍA'],
    ['SIN COFRE CON GUÍA', 'SIN COFRE / CON GUÍA'],
    ['SIN COFRE SIN GUÍA', 'SIN COFRE / SIN GUÍA']
  ]);
  return electraVariants.includes(clean) ? clean : aliases.get(clean) || '';
}

export function normalizeElectraSupport(value) {
  const clean = normalizeText(value);
  if (clean.includes('BOX')) return electraCofreSupport;
  if (clean.includes('MAXIS')) return 'SOPORTE MAXISCREEN';
  if (clean.includes('ALMAGRO')) return 'SOPORTES ALMAGRO';
  if (clean.includes('UNIVERSAL') || clean.includes('3 AGUJEROS')) return 'UNIVERSAL 3 AGUJEROS';
  if (clean.includes('ELIT')) return 'SOPORTE ELIT VERTICAL';
  return '';
}

export function normalizeElectraMotor(value) {
  const clean = normalizeText(value);
  if (/METEOR.*20\s*\/+[\s:]*17/.test(clean)) return 'METEOR 20/17';
  if (/SUNILUS.*15\s*\/+[\s:]*17/.test(clean)) return 'SUNILUS 15/17 IO';
  return '';
}

export function getElectraMotor(value) {
  const normalized = normalizeElectraMotor(value);
  return electraMotors.find((motor) => motor.value === normalized) || null;
}

export function normalizeElectraDevice(value) {
  const clean = normalizeText(value);
  if (clean === 'MOTOR') return 'MOTOR';
  if (clean === 'MAQ. EXTERIOR' || clean === 'MAQUINA EXTERIOR') return 'MAQ. EXTERIOR';
  if (clean === 'MAQ. INTERIOR' || clean === 'MAQUINA INTERIOR' || clean === 'MAQUINA') return 'MAQ. INTERIOR';
  return '';
}

export function electraHasCofre(value) {
  return normalizeElectraVariant(value).startsWith('CON COFRE');
}

export function electraHasGuide(value) {
  return normalizeElectraVariant(value).endsWith('CON GUÍA');
}

export function getElectraDiscounts(parameters, variant, support, device) {
  const normalized = normalizeElectraParameters(parameters);
  const cleanDevice = normalizeElectraDevice(device) || 'MAQ. INTERIOR';
  if (electraHasCofre(variant)) return normalized.cofreDiscounts[cleanDevice];
  const cleanSupport = normalizeElectraSupport(support);
  const matrixSupport = electraMatrixSupports.includes(cleanSupport)
    ? cleanSupport
    : 'SOPORTE ELIT VERTICAL';
  return normalized.supportDiscounts[matrixSupport][cleanDevice];
}

function normalizeDiscountSet(value, defaults, withBoxProfile) {
  /** @type {{ fabric: number, roll: number, loadBar: number, boxProfile?: number, guide?: number }} */
  const result = {
    fabric: nonNegative(value?.fabric, defaults.fabric),
    roll: nonNegative(value?.roll, defaults.roll),
    loadBar: nonNegative(value?.loadBar, defaults.loadBar)
  };
  if (withBoxProfile) result.boxProfile = nonNegative(value?.boxProfile, defaults.boxProfile);
  else result.guide = nonNegative(value?.guide, defaults.guide);
  return result;
}

function normalizeDeviceNumbers(value, defaults) {
  return Object.fromEntries(electraDevices.map((device) => [device, nonNegative(value?.[device], defaults[device])]));
}

function normalizeStockLengths(value, defaults) {
  if (!Array.isArray(value)) return [...defaults];
  const lengths = [...new Set(value.map(Number).filter((item) => Number.isFinite(item) && item > 0))]
    .sort((left, right) => left - right);
  return lengths.length ? lengths : [...defaults];
}

function normalizeText(value) {
  return String(value || '').trim().toUpperCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/GUIA/g, 'GUÍA');
}

function positive(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function nonNegative(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}
