/**
 * Lo que necesita Parámetros › Dibujos para hablar con valores reales (Iván, 02/10/2026): las
 * condiciones de cada modelo con sus valores (los mismos que ofrece el formulario), las variantes
 * del dibujo de la web de cada modelo con su toldo de ejemplo, y qué dibujo automático del taller
 * sustituye a cada variante.
 */
import { anticaVariants } from './anticaRules.js';
import { comparableDrawingValue, drawingConditionMatches, normalizeDrawingParameters } from './drawingParameters.js';
import { electraSupports } from './electraParameters.js';
import { irisGuideFixings, irisGuideTypes } from './irisParameters.js';
import { formOptions, getFabricDiagramOptions, getFieldVisibility, getModelBehavior } from './modelBehavior.js';
import { normalizeModelName } from './modelNames.js';

const YES_NO = ['SÍ', 'NO'];
const CURTAIN_FINISHES = ['NORMAL', 'VELCRO', 'TUBO'];

export const drawingConditionLabels = {
  device: 'Accionamiento',
  placement: 'Colocación',
  submodel: 'Variante',
  machineSide: 'Lado de la máquina',
  supportSystem: 'Soporte',
  tubeLoad: 'Tubo de carga',
  hasValance: 'Lleva bamba',
  valanceCurve: 'Curva de la bamba',
  curtainHasWindow: 'Con ventana',
  curtainFinish: 'Confección',
  curtainBottomFinish: 'Acabado inferior',
  curtainSupport: 'Soporte de la cortina',
  electraSupport: 'Tipo de soporte',
  irisGuideType: 'Tipo de guía',
  irisGuideFixing: 'Fijación de la guía',
  irisWindBlock: 'Secur Wind Block',
  anticaVariant: 'Variante',
  anticaMeasurementMode: 'Medición',
  fabricDiagramOverride: 'Trabajo especial'
};

const valueLabels = {
  BASE: 'Medida base',
  FINISHED: 'Tela terminada',
  'TOLDO-VELCRO': 'Toldo con velcro',
  'CAMBIO ENROLLABLE': 'Cambio enrollable',
  SUPLEMENTO: 'Suplemento'
};

/** El nombre de un valor que no se entiende por sí solo («FINISHED» → «Tela terminada»); los demás, tal cual. */
export function drawingConditionValueLabel(value) {
  return valueLabels[value] ?? String(value ?? '');
}

/** Los campos que tiene cada modelo para «Automático cuando…», con sus valores reales. */
export function drawingConditionOptions(model) {
  const code = normalizeModelName(model);
  const behavior = getModelBehavior(code);
  const visible = getFieldVisibility({ model: code, device: '' });
  const supportsValance = (behavior.dimensions || []).includes('valanceHeight');
  const curtain = code.includes('CORTINA') || code === 'ELECTRA';
  const options = [];
  const add = (field, values) => {
    if (values.length) options.push({ field, label: field === 'curtainFinish' && code.includes('CORTINA') ? 'Laterales' : drawingConditionLabels[field], values: [...values] });
  };
  if (visible.device) add('device', visible.deviceOptions || []);
  if (visible.placement) add('placement', formOptions.colocaciones);
  add('submodel', behavior.submodelOptions || []);
  if (visible.device) add('machineSide', formOptions.localizacionesMaquina);
  add('supportSystem', behavior.supportOptions || []);
  add('tubeLoad', behavior.tubeOptions || []);
  if (supportsValance && code !== 'BAMBALINA') add('hasValance', YES_NO);
  if (supportsValance) add('valanceCurve', formOptions.curvasBamba);
  if (curtain || code === 'SELENA') add('curtainHasWindow', YES_NO);
  if (curtain) add('curtainFinish', code.includes('CORTINA') ? ['NORMAL', 'VELCRO'] : CURTAIN_FINISHES);
  if (code.includes('CORTINA')) add('curtainBottomFinish', ['TUBO DE CARGA', 'ET']);
  if (code === 'CORTINA' || code === 'SELENA') add('curtainSupport', ['UNIVERSAL 3 AGUJEROS', 'MAXISCREEM']);
  if (code === 'ELECTRA') add('electraSupport', electraSupports);
  if (code === 'IRIS') {
    add('irisGuideType', irisGuideTypes);
    add('irisGuideFixing', irisGuideFixings);
    add('irisWindBlock', YES_NO);
  }
  if (code === 'ANTICA' || code === 'CAMBIO ANTICA') add('anticaVariant', anticaVariants);
  if (code === 'CAMBIO ANTICA') add('anticaMeasurementMode', ['BASE', 'FINISHED']);
  add('fabricDiagramOverride', getFabricDiagramOptions(code).filter((option) => option.value).map((option) => option.value));
  return options;
}

const sameValue = (left, right) => comparableDrawingValue(left) === comparableDrawingValue(right);

/** Una condición guardada que no casa con un campo o un valor real del modelo: se marca para revisar. */
export function drawingConditionNeedsReview(model, condition) {
  const option = drawingConditionOptions(model).find((item) => item.field === condition?.field);
  return !option || !option.values.some((value) => sameValue(value, condition.value));
}

/** El valor de la lista que corresponde al guardado («si» → «SÍ»), o el guardado tal cual si no casa. */
export function drawingConditionShownValue(model, condition) {
  const option = drawingConditionOptions(model).find((item) => item.field === condition?.field);
  return option?.values.find((value) => sameValue(value, condition.value)) ?? String(condition?.value ?? '');
}

/** «Accionamiento = MOTOR y Confección = VELCRO». */
export function drawingConditionsText(conditions) {
  return conditions
    .map((condition) => `${drawingConditionLabels[condition.field] ?? condition.field} = ${drawingConditionValueLabel(condition.value)}`)
    .join(' y ');
}

const slug = (text) => String(text)
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const CURTAIN_VARIANTS = [
  { id: 'con-ventana', label: 'Con ventana', awning: { curtainHasWindow: true, curtainFinish: 'NORMAL' } },
  { id: 'con-ventana-velcro', label: 'Con ventana · velcro', awning: { curtainHasWindow: true, curtainFinish: 'VELCRO' } },
  { id: 'con-ventana-tubo', label: 'Con ventana · tubo', awning: { curtainHasWindow: true, curtainFinish: 'TUBO' } },
  { id: 'sin-ventana', label: 'Sin ventana', awning: { curtainHasWindow: false, curtainFinish: 'NORMAL' } },
  { id: 'sin-ventana-velcro', label: 'Sin ventana · velcro', awning: { curtainHasWindow: false, curtainFinish: 'VELCRO' } },
  { id: 'sin-ventana-tubo', label: 'Sin ventana · tubo', awning: { curtainHasWindow: false, curtainFinish: 'TUBO' } }
];

/**
 * Las variantes del dibujo de la web de un modelo («Lo que sale hoy»), cada una con lo que fija de
 * su toldo de ejemplo. Hera no tiene dibujo de la web: su hoja es una tabla por toldo.
 */
export function webDrawingVariants(model) {
  const code = normalizeModelName(model);
  if (code === 'HERA') return [{ id: 'hera', label: 'Hera', webDrawing: false, awning: { model: code } }];
  let base;
  if (code === 'SELENA') {
    base = [
      { id: 'sin-ventana', label: 'Sin ventana', awning: { curtainHasWindow: false } },
      { id: 'con-ventana', label: 'Con ventana', awning: { curtainHasWindow: true } }
    ];
  } else if (code.includes('CORTINA') || code === 'ELECTRA') {
    base = code === 'ELECTRA' ? CURTAIN_VARIANTS : [
      ...CURTAIN_VARIANTS.map((variant) => ({
        ...variant,
        label: variant.label.replace(' · tubo', ' · ET abajo'),
        awning: { ...variant.awning, curtainFinish: variant.awning.curtainFinish === 'TUBO' ? 'NORMAL' : variant.awning.curtainFinish, curtainBottomFinish: variant.awning.curtainFinish === 'TUBO' ? 'ET' : 'TUBO DE CARGA' }
      })),
      { id: 'con-ventana-velcro-tubo', label: 'Con ventana · velcro · ET abajo', awning: { curtainHasWindow: true, curtainFinish: 'VELCRO', curtainBottomFinish: 'ET' } },
      { id: 'sin-ventana-velcro-tubo', label: 'Sin ventana · velcro · ET abajo', awning: { curtainHasWindow: false, curtainFinish: 'VELCRO', curtainBottomFinish: 'ET' } }
    ];
  } else if (code === 'ANTICA' || code === 'CAMBIO ANTICA') {
    base = anticaVariants.map((variant) => ({ id: slug(variant), label: variant, awning: { anticaVariant: variant } }));
  } else if (code === 'IRIS') {
    base = (getModelBehavior(code).submodelOptions || []).map((submodel) => ({ id: slug(submodel), label: submodel, awning: { submodel } }));
  } else {
    base = [{ id: 'general', label: 'General', awning: {} }];
  }
  const specials = getFabricDiagramOptions(code)
    .filter((option) => option.value)
    .map((option) => ({ id: slug(option.value), label: drawingConditionValueLabel(option.value), awning: { fabricDiagramOverride: option.value } }));
  return [
    ...base.map((variant) => ({ ...variant, awning: { fabricDiagramOverride: '', ...variant.awning } })),
    ...specials
  ].map((variant) => ({ webDrawing: true, ...variant, awning: { model: code, ...variant.awning } }));
}

/** El toldo de ejemplo de una variante (400 × 250 cm), para pasarlo por normalizeOrder y dibujarlo. */
export function exampleAwning(variant) {
  const ventana = variant.awning.curtainHasWindow
    ? { curtainWindowExit: 20, curtainWindowCorner: 60, curtainWindowFloorHeight: 90, curtainWindowHeight: 120 }
    : {};
  return { id: 'ejemplo', of: '0200001', units: 1, width: 400, projection: 250, ...ventana, ...variant.awning };
}

/**
 * Los dibujos automáticos del taller que pueden sustituir a una variante, del más concreto al más
 * general. `pending` son las condiciones sobre campos que la variante no fija (dependen del toldo).
 */
export function automaticDrawingsForVariant(variant, input) {
  const fixed = new Set(Object.keys(variant.awning).filter((key) => key !== 'model'));
  const drawings = normalizeDrawingParameters(input).byModel[variant.awning.model] || [];
  return drawings
    .map((drawing, index) => ({ drawing, index }))
    .filter(({ drawing }) => drawing.usage === 'auto' && drawing.enabled && drawing.image
      && drawing.conditions.every((condition) => condition.value && (!fixed.has(condition.field) || drawingConditionMatches(variant.awning, condition))))
    .sort((left, right) => right.drawing.conditions.length - left.drawing.conditions.length || left.index - right.index)
    .map(({ drawing }) => ({ id: drawing.id, name: drawing.name, pending: drawing.conditions.filter((condition) => !fixed.has(condition.field)) }));
}

/** Lo de arriba en frases, hasta el primero que sustituye siempre. */
export function replacementLines(replacements) {
  if (!replacements.length) return ['Sale el de la web.'];
  const lines = [];
  for (const replacement of replacements) {
    if (!replacement.pending.length) {
      lines.push(`«${replacement.name}» lo sustituye siempre.`);
      return lines;
    }
    lines.push(`«${replacement.name}» lo sustituye cuando ${drawingConditionsText(replacement.pending)}.`);
  }
  lines.push('Si no, sale el de la web.');
  return lines;
}
