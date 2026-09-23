/**
 * Qué le falta a un toldo para darlo por completo. Es la única regla: la usan
 * la tarjeta del formulario, el cálculo y, a través de sus errores, la
 * generación de archivos. Hasta el 21/09/2026 la tarjeta tenía la suya propia y
 * el cálculo no exigía curva, remate ni rotulación, así que un toldo con bamba
 * y sin curva llegaba al planteamiento definitivo diciendo "SIN BAMBA".
 */
import { getFieldVisibility, getRequiredDimensions, normalizeValanceFinish } from './modelBehavior.js';
import { normalizeAnticaVariant, resolveAnticaRoundEntry } from './anticaRules.js';
import { electraMotors } from './electraParameters.js';

const windowDimensions = [
  ['curtainWindowExit', 'salida ventana'],
  ['curtainWindowCorner', 'esquina'],
  ['curtainWindowFloorHeight', 'suelo-ventana'],
  ['curtainWindowHeight', 'altura ventana']
];

function dimensionLabel(model, field) {
  if (field === 'width') return 'frente';
  // La misma palabra que el rótulo del campo en la tarjeta: solo Selena y
  // Electra dicen caída; Cortina, aunque sea vertical, pregunta por la salida.
  if (field === 'projection') return model === 'SELENA' || model === 'ELECTRA' ? 'caída' : 'salida';
  if (field === 'valanceHeight') return 'alto terminado';
  if (field === 'irisFrontTop') return 'frente superior';
  if (field === 'irisExitLeft') return 'salida izquierda';
  return field;
}

// Modelos cuya regla exige colocación (el resto la pregunta pero no la necesita).
const placementRequired = new Set(['AGATA BOX', 'AMBAR BOX', 'ELECTRA', 'IRIS', 'MAXISCREEM', 'MONOBLOCK 350']);
// HERA y Selena llevan su propia comprobación de tela.
const fabricOwnCheck = new Set(['HERA', 'SELENA']);

// `order` (opcional) trae la tela del pedido: con "misma tela" la tela no está en
// el toldo. Sin `order` no se comprueba la tela.
/**
 * @param {any} awning
 * @param {{ fabric?: string, sameFabric?: boolean } | null} [order]
 */
export function getMissingFields(awning, order = null) {
  const missing = [];
  const add = (field, label) => {
    if (!missing.some((item) => item.field === field)) missing.push({ field, label });
  };
  const model = String(awning?.model || '').toUpperCase();
  if (!model) return [{ field: 'model', label: 'modelo' }];

  const fields = getFieldVisibility({ model, device: awning.device });
  const device = String(awning.device || '').toUpperCase();
  const isElectra = model === 'ELECTRA';
  const isHera = model === 'HERA';
  const isSelena = model === 'SELENA';
  const isAntica = model === 'ANTICA' || model === 'CAMBIO ANTICA';
  const curtain = model.includes('CORTINA') || isElectra;
  const standaloneValance = model === 'BAMBALINA';
  const hasValance = standaloneValance || Number(awning.valanceHeight) > 0;

  if (!awning.of) add('of', 'OF');
  // Lo mismo que exigía cada modelo en su cálculo y la tarjeta no decía: la tarjeta
  // ponía "FALTA · rotulación" y el cálculo "falta tela y dispositivo" (pedido 4611).
  if (order && fields.workType === 'FULL_AWNING' && !fabricOwnCheck.has(model)) {
    const fabric = order.sameFabric !== false ? order.fabric : awning.fabric;
    if (!String(fabric || '').trim()) add('fabric', 'tela');
  }
  if (fields.device && !device) add('device', 'dispositivo');
  if (fields.crankHeight && !Number(awning.crankHeight)) add('crankHeight', 'altura manivela');
  // Sin tubo elegido, Arzúa y Galicia lo proponen según el destino.
  if (fields.tubeLoad && !awning.tubeLoad && !awning.destination) add('tubeLoad', 'tubo de carga');
  if (fields.device && placementRequired.has(model) && !awning.placement) add('placement', 'colocación');
  if (fields.submodel && !awning.submodel) add('submodel', 'variante');
  if (isElectra && !awning.electraSupport) add('electraSupport', 'tipo de soporte');
  for (const field of getRequiredDimensions(model)) {
    if (!Number(awning[field])) add(field, dimensionLabel(model, field));
  }
  if (isHera) {
    const withChain = awning.submodel !== 'HERA 56 MOTOR';
    if (!awning.heraJoin) add('heraJoin', 'empate');
    if (withChain && !Number(awning.height)) add('height', 'altura de instalación');
    if (!awning.heraTopFinish) add('heraTopFinish', 'remate superior');
    if (!awning.heraBottomFinish) add('heraBottomFinish', 'remate inferior');
    if (!awning.heraInteriorFace) add('heraInteriorFace', 'cara interior');
    // El kit Swift y el adaptador van en blanco o negro también a motor.
    if (!awning.heraChainColor) add('heraChainColor', withChain ? 'color cadena' : 'color mecanismos');
  }
  // Iris también pregunta si lleva ventana de cristal: su cálculo ya lo exigía
  // y la tarjeta no, así que el toldo quedaba sin calcular sin decir por qué.
  if ((curtain || isSelena || model === 'IRIS') && typeof awning.curtainHasWindow !== 'boolean') add('curtainHasWindow', 'ventana');
  if (curtain && !awning.curtainFinish) add('curtainFinish', 'confección');
  if ((curtain || isSelena) && awning.curtainHasWindow === true) {
    for (const [field, label] of windowDimensions) {
      if (!Number(awning[field])) add(field, label);
    }
  }
  if (isElectra && device === 'MOTOR' && !electraMotors.some(({ value }) => value === awning.motorPower)) add('motorPower', 'motor Electra');
  if (fields.motorLocation && !awning.machineSide) add('machineSide', 'posición del motor');
  if ((isElectra || isSelena) && fields.machineLocation && !awning.machineSide) add('machineSide', 'lado máquina');
  if (isAntica && !awning.anticaVariant) add('anticaVariant', 'configuración Antica');
  if (model === 'ANTICA') {
    const variant = normalizeAnticaVariant(awning.anticaVariant);
    const needsSupportHeight = variant === 'SOPORTE FIJO 3 AGUJEROS' || Boolean(resolveAnticaRoundEntry(variant));
    if (needsSupportHeight && !Number(awning.anticaSupportHeight)) add('anticaSupportHeight', 'altura soporte-brazo');
  }
  if (hasValance) {
    const finish = normalizeValanceFinish(awning, awning.remate);
    if (!awning.valanceCurve) add('valanceCurve', 'curva bamba');
    if (!finish) add('remate', 'remate');
    if (finish === 'OTRO' && !awning.remateColor) add('remateColor', 'color remate');
  }
  if (fields.requiresRotFabric && !standaloneValance && !awning.rotFabric) add('rotFabric', 'rotulación tela');
  if (hasValance && !awning.rotValance) add('rotValance', 'rotulación bamba');
  if (fields.requiresStructureColor && !awning.structureColor) add('structureColor', 'lacado');
  return missing;
}

export function describeMissing(missing) {
  const labels = missing.map((item) => item.label);
  if (labels.length <= 1) return labels.join('');
  return `${labels.slice(0, -1).join(', ')} y ${labels.at(-1)}`;
}

export function awningLetter(index) {
  let value = index + 1;
  let label = '';
  while (value > 0) {
    value -= 1;
    label = String.fromCharCode(65 + (value % 26)) + label;
    value = Math.floor(value / 26);
  }
  return label;
}
