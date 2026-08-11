export const HERA_VARIANTS = Object.freeze([
  'HERA 43 MAQUINA',
  'HERA 56 MAQUINA',
  'HERA 56 MOTOR'
]);

export const HERA_JOINS = Object.freeze(['NINGUNO', 'VERTICAL', 'HORIZONTAL']);

export const HERA_RULES = Object.freeze({
  'HERA 43 MAQUINA': Object.freeze({
    rollTubeDiscountCm: 3.3,
    fabricWidthDiscountCm: 4,
    fabricDropAllowanceCm: 20,
    chainHeightDiscountCm: 70,
    motor: false
  }),
  'HERA 56 MAQUINA': Object.freeze({
    rollTubeDiscountCm: 3.7,
    fabricWidthDiscountCm: 4.5,
    fabricDropAllowanceCm: 25,
    chainHeightDiscountCm: 100,
    motor: false
  }),
  'HERA 56 MOTOR': Object.freeze({
    rollTubeDiscountCm: 4.5,
    fabricWidthDiscountCm: 5,
    fabricDropAllowanceCm: 25,
    chainHeightDiscountCm: null,
    motor: true
  })
});

export const HERA_FABRIC_ALLOWANCES = Object.freeze({
  acrylicSideHemCm: 3,
  joinCm: 2,
  squaringEachEndCm: 5
});

export const HERA_SPECIAL_TUBE_FROM_CM = 300;

export function normalizeHeraVariant(value) {
  const text = normalize(value);
  if (!text) return '';
  if (text.includes('43')) return 'HERA 43 MAQUINA';
  if (text.includes('56') && text.includes('MOTOR')) return 'HERA 56 MOTOR';
  if (text.includes('56')) return 'HERA 56 MAQUINA';
  return '';
}

export function inferHeraVariant({ model, submodel, device } = {}) {
  const selected = normalizeHeraVariant(submodel);
  if (selected) return selected;
  const modelText = normalize(model);
  if (modelText.includes('43')) return 'HERA 43 MAQUINA';
  if (modelText.includes('56')) {
    return normalize(device).includes('MOTOR') ? 'HERA 56 MOTOR' : 'HERA 56 MAQUINA';
  }
  return '';
}

export function normalizeHeraJoin(value) {
  const text = normalize(value);
  if (text === 'SIN EMPATE' || text === 'SIN UNION' || text === 'NINGUNO' || text === 'NO') return 'NINGUNO';
  if (text === 'VERTICAL') return 'VERTICAL';
  if (text === 'HORIZONTAL') return 'HORIZONTAL';
  return '';
}

export function heraRuleFor(value) {
  return HERA_RULES[normalizeHeraVariant(value)] || null;
}

function normalize(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');
}
