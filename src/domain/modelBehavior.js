import behavior from './data/modelBehavior.json' with { type: 'json' };
import { lacadoNames } from './lacados.js';
import { arzuaProEstablishedProjections } from './arzuaProConstants.js';
import { galiciaEstablishedProjections } from './galiciaConstants.js';
import { coralBoxEstablishedProjections, perlaBoxEstablishedProjections } from './storbox400Constants.js';
import { cuarzoBoxEstablishedProjections } from './storbox250Parameters.js';
import { xacobeoEstablishedProjections } from './xacobeoParameters.js';
import { puntoRectoEstablishedProjections } from './puntoRectoParameters.js';
import { monoblock350EstablishedProjections } from './monoblock350Parameters.js';
import { ambarBoxEstablishedProjections } from './ambarBoxParameters.js';
import { agataBoxEstablishedProjections } from './agataBoxParameters.js';
import { normalizeModelName } from './modelNames.js';

const fallbackModel = {
  tipo01: null,
  tipo02: null,
  multipleBrazos: false,
  implemented: false,
  workType: 'FULL_AWNING',
  diagram: 'GENERAL',
  dimensions: ['width', 'projection', 'valanceHeight']
};

export const modelNames = Object.keys(behavior.models);
export const fullAwningModelNames = modelNames.filter((model) => behavior.models[model].workType === 'FULL_AWNING');
export const fabricOnlyModelNames = modelNames.filter((model) => behavior.models[model].workType === 'FABRIC_ONLY');

export const formOptions = { ...behavior.options, lacados: lacadoNames };

export function getModelBehavior(modelCode) {
  const code = normalizeModelName(modelCode);
  return behavior.models[code] || fallbackModel;
}

export function getModelWorkType(modelCode) {
  return getModelBehavior(modelCode).workType || 'FULL_AWNING';
}

export function isFabricOnlyModel(modelCode) {
  return getModelWorkType(modelCode) === 'FABRIC_ONLY';
}

export function getModelDiagram(modelCode) {
  return getModelBehavior(modelCode).diagram || 'GENERAL';
}

export function getAwningDiagram(awning) {
  const model = String(awning?.model || '').toUpperCase();
  if (!model.includes('CORTINA')) return getModelDiagram(model);
  const finish = ['VELCRO', 'TUBO'].includes(awning?.curtainFinish) ? awning.curtainFinish : 'NORMAL';
  if (awning?.curtainHasWindow) {
    if (finish === 'VELCRO') return 'CORTINA-VENTANA-VELCRO';
    if (finish === 'TUBO') return 'CORTINA-TUBO-VENTANA';
    return 'CORTINA-VENTANA';
  }
  if (finish === 'VELCRO') return 'CORTINA-VELCRO';
  if (finish === 'TUBO') return 'CORTINA-TUBO';
  return 'CORTINA-SIN-VENTANA';
}

export function getRequiredDimensions(modelCode) {
  const code = String(modelCode || '').toUpperCase();
  if (code === 'BAMBALINA') return ['width', 'valanceHeight'];
  return (getModelBehavior(code).dimensions || fallbackModel.dimensions).filter((field) => field !== 'valanceHeight');
}

export function getFieldVisibility({ model, device }) {
  const modelBehavior = getModelBehavior(model);
  const hasInstallation = modelBehavior.tipo01 !== null;
  const isCofre = modelBehavior.tipo01 === 'COFRE';
  const cleanDevice = String(device || '').toUpperCase();
  const isMotor = cleanDevice === 'MOTOR';
  const isMachine = cleanDevice.includes('MAQ') || cleanDevice === 'MAQUINA';

  return {
    workType: modelBehavior.workType,
    fabricOnly: modelBehavior.workType === 'FABRIC_ONLY',
    dimensions: modelBehavior.dimensions || fallbackModel.dimensions,
    tubeLoad: modelBehavior.tipo02 === 'TUBO DE CARGA',
    submodel: modelBehavior.tipo02 === 'SUBMODELO',
    device: hasInstallation,
    deviceOptions: isCofre ? behavior.options.dispositivosCofre : behavior.options.dispositivos,
    sensor: hasInstallation && isMotor && modelBehavior.sensors !== false,
    machineLocation: hasInstallation && isMachine,
    crankHeight: hasInstallation && isMachine,
    placement: hasInstallation,
    wallType: hasInstallation,
    arms: modelBehavior.multipleBrazos
  };
}

export function getEstablishedProjections(modelCode) {
  const code = normalizeModelName(modelCode);
  if (code === 'ARZUA PRO') return arzuaProEstablishedProjections;
  if (code === 'GALICIA') return galiciaEstablishedProjections;
  if (code === 'CORAL BOX') return coralBoxEstablishedProjections;
  if (code === 'PERLA BOX') return perlaBoxEstablishedProjections;
  if (code === 'CUARZO BOX') return cuarzoBoxEstablishedProjections;
  if (code === 'XACOBEO') return xacobeoEstablishedProjections;
  if (code === 'PUNTO RECTO') return puntoRectoEstablishedProjections;
  if (code === 'MONOBLOCK 350') return monoblock350EstablishedProjections;
  if (code === 'AMBAR BOX') return ambarBoxEstablishedProjections;
  if (code === 'AGATA BOX') return agataBoxEstablishedProjections;
  return null;
}
