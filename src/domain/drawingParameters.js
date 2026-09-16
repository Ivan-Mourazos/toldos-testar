import { normalizeFabricImage } from './fabricImage.js';
import { normalizeModelName } from './modelNames.js';

export const drawingConditionFields = [
  'device',
  'placement',
  'submodel',
  'machineSide',
  'supportSystem',
  'tubeLoad',
  'hasValance',
  'valanceCurve',
  'curtainHasWindow',
  'curtainFinish',
  'curtainSupport',
  'electraSupport',
  'irisGuideType',
  'irisGuideFixing',
  'irisWindBlock',
  'anticaVariant',
  'anticaMeasurementMode',
  'fabricDiagramOverride'
];

const conditionFieldSet = new Set(drawingConditionFields);

export const defaultDrawingParameters = { byModel: {} };

export function normalizeDrawingParameters(input = defaultDrawingParameters) {
  const source = input && typeof input === 'object' ? input.byModel : null;
  const byModel = {};
  if (!source || typeof source !== 'object') return { byModel };

  Object.entries(source).forEach(([rawModel, rawVariants]) => {
    const model = normalizeModelName(rawModel);
    if (!model || !Array.isArray(rawVariants)) return;
    const variants = rawVariants.map((variant, index) => normalizeDrawingVariant(variant, index)).filter(Boolean);
    if (variants.length) byModel[model] = variants;
  });
  return { byModel };
}

function normalizeDrawingVariant(input, index) {
  if (!input || typeof input !== 'object') return null;
  let image = null;
  try {
    image = normalizeFabricImage(input.image);
  } catch {
    image = null;
  }
  const conditions = Array.isArray(input.conditions)
    ? input.conditions.map(normalizeCondition).filter(Boolean)
    : [];
  return {
    id: clean(input.id) || `drawing-${index + 1}`,
    name: clean(input.name) || `Dibujo ${index + 1}`,
    enabled: input.enabled !== false,
    image,
    conditions
  };
}

function normalizeCondition(input) {
  if (!input || typeof input !== 'object' || !conditionFieldSet.has(input.field)) return null;
  return { field: input.field, value: clean(input.value) };
}

export function resolveConfiguredDrawing(awning = {}, input = defaultDrawingParameters) {
  if (awning.fabricImage) {
    return { image: normalizeFabricImage(awning.fabricImage), name: 'Imagen manual del pedido', source: 'manual' };
  }
  const parameters = normalizeDrawingParameters(input);
  const model = normalizeModelName(awning.model);
  const variants = parameters.byModel[model] || [];
  const matches = variants
    .map((variant, index) => ({ variant, index }))
    .filter(({ variant }) => variant.enabled && variant.image && variant.conditions.every((condition) => conditionMatches(awning, condition)))
    .sort((left, right) => right.variant.conditions.length - left.variant.conditions.length || left.index - right.index);
  const selected = matches[0]?.variant;
  return selected ? { image: selected.image, name: selected.name, source: 'parameters' } : null;
}

function conditionMatches(awning, condition) {
  return Boolean(condition.value) && comparable(awning?.[condition.field]) === comparable(condition.value);
}

function comparable(input) {
  if (typeof input === 'boolean') return input ? 'SI' : 'NO';
  return clean(input)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function clean(input) {
  return String(input ?? '').trim();
}
