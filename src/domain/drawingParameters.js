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

// Cómo se usa cada dibujo del taller (Iván, 02/10/2026): «Solo a mano» sale solo si se elige en la
// tarjeta del toldo; «Automático» sale solo cuando el toldo cumple sus condiciones (sin condiciones,
// siempre en su modelo) y también se puede elegir a mano. Los guardados antes eran todos automáticos.
export const drawingUsages = ['manual', 'auto'];

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
    usage: input.usage === 'manual' ? 'manual' : 'auto',
    image,
    conditions
  };
}

function normalizeCondition(input) {
  if (!input || typeof input !== 'object' || !conditionFieldSet.has(input.field)) return null;
  return { field: input.field, value: clean(input.value) };
}

const usable = (variant) => variant.enabled && Boolean(variant.image);
const variantsOf = (model, input) => normalizeDrawingParameters(input).byModel[normalizeModelName(model)] || [];

/** Los dibujos del taller de un modelo que se pueden elegir en la tarjeta: activos y con imagen. */
export function selectableDrawings(model, input = defaultDrawingParameters) {
  return variantsOf(model, input).filter(usable).map(({ id, name, usage }) => ({ id, name, usage }));
}

/** El dibujo autom\u00e1tico del taller que le toca a este toldo, sin mirar su imagen propia ni el elegido a mano. */
export function resolveAutomaticDrawing(awning = {}, input = defaultDrawingParameters) {
  const matches = variantsOf(awning.model, input)
    .map((variant, index) => ({ variant, index }))
    .filter(({ variant }) => variant.usage === 'auto' && usable(variant) && variant.conditions.every((condition) => drawingConditionMatches(awning, condition)))
    .sort((left, right) => right.variant.conditions.length - left.variant.conditions.length || left.index - right.index);
  const selected = matches[0]?.variant;
  return selected ? { id: selected.id, image: selected.image, name: selected.name, source: 'parameters' } : null;
}

/** El dibujo del taller elegido a mano en la tarjeta, si sigue activo y con imagen en Par\u00e1metros. */
export function resolveChosenDrawing(awning = {}, input = defaultDrawingParameters) {
  const id = clean(awning.workshopDrawingId);
  if (!id) return null;
  const variant = variantsOf(awning.model, input).find((item) => item.id === id && usable(item));
  return variant ? { id: variant.id, image: variant.image, name: variant.name, source: 'chosen' } : null;
}

/** El toldo tiene un dibujo elegido a mano que ya no est\u00e1 (se quit\u00f3, se desactiv\u00f3 o no tiene imagen). */
export function chosenDrawingMissing(awning = {}, input = defaultDrawingParameters) {
  return Boolean(clean(awning.workshopDrawingId)) && !resolveChosenDrawing(awning, input);
}

// Qu\u00e9 sale en el PDF: la imagen puesta en el toldo; si no, el dibujo del taller elegido a mano;
// si no, el autom\u00e1tico del taller que encaje; si tampoco (null), el dibujo de la web.
export function resolveConfiguredDrawing(awning = {}, input = defaultDrawingParameters) {
  if (awning.fabricImage) {
    return { image: normalizeFabricImage(awning.fabricImage), name: 'Imagen manual del pedido', source: 'manual' };
  }
  return resolveChosenDrawing(awning, input) ?? resolveAutomaticDrawing(awning, input);
}

export function drawingConditionMatches(awning, condition) {
  return Boolean(condition.value) && comparableDrawingValue(awning?.[condition.field]) === comparableDrawingValue(condition.value);
}

/** Para comparar valores de condiciones: sin acentos, espacios de m\u00e1s ni may\u00fasculas; S\u00ed/No de los booleanos. */
export function comparableDrawingValue(input) {
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
