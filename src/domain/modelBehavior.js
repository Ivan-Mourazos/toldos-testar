import behavior from './data/modelBehavior.json' with { type: 'json' };
import { lacadoNames } from './lacados.js';
import { arzuaProEstablishedProjections } from './arzuaProRules.js';

const fallbackModel = { tipo01: null, tipo02: null, multipleBrazos: false, implemented: false };

export const modelNames = Object.keys(behavior.models);

export const formOptions = { ...behavior.options, lacados: lacadoNames };

export function getModelBehavior(modelCode) {
  return behavior.models[String(modelCode || '').toUpperCase()] || fallbackModel;
}

export function getFieldVisibility({ model, device }) {
  const modelBehavior = getModelBehavior(model);
  const hasInstallation = modelBehavior.tipo01 !== null;
  const isCofre = modelBehavior.tipo01 === 'COFRE';
  const cleanDevice = String(device || '').toUpperCase();
  const isMotor = cleanDevice === 'MOTOR';

  return {
    tubeLoad: modelBehavior.tipo02 === 'TUBO DE CARGA',
    submodel: modelBehavior.tipo02 === 'SUBMODELO',
    device: hasInstallation,
    deviceOptions: isCofre ? behavior.options.dispositivosCofre : behavior.options.dispositivos,
    sensor: hasInstallation && isMotor,
    machineLocation: hasInstallation && !isMotor,
    crankHeight: hasInstallation && !isMotor,
    placement: hasInstallation,
    wallType: hasInstallation,
    arms: modelBehavior.multipleBrazos
  };
}

export function getEstablishedProjections(modelCode) {
  const code = String(modelCode || '').toUpperCase();
  if (code === 'ARZUA PRO') return arzuaProEstablishedProjections;
  return null;
}
