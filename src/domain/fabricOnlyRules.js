import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { normalizeCambioCortinaParameters } from './cambioCortinaParameters.js';
import { normalizeFabricJobParameters, resolveFabricJobAllowance } from './fabricJobParameters.js';

const supportedModels = new Set(['CAMBIO TELA', 'CAMBIO CORTINA', 'ENROLLABLE', 'BAMBALINA', 'CAMBIO ANTICA']);

export function calculateFabricOnly({ order, awning }) {
  const model = String(awning.model || '').toUpperCase();
  if (!supportedModels.has(model)) throw new Error(`Trabajo de tela no soportado: ${model}.`);

  const parameters = normalizeFabricJobParameters(order.parameters?.fabricJobs);
  const curtainParameters = normalizeCambioCortinaParameters(order.parameters?.cambioCortina);
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = resolveFabric(fabricSelection);
  const valanceHeight = Math.max(0, Number(awning.valanceHeight) || 0);
  const supportsValance = ['CAMBIO TELA', 'CAMBIO ANTICA', 'BAMBALINA'].includes(model);
  const hasValance = model === 'BAMBALINA' || (supportsValance && valanceHeight > 0);
  const separateValance = hasValance && model !== 'BAMBALINA' && Boolean(awning.valanceFabric);
  const valanceFabric = separateValance ? resolveFabric(awning.valanceFabric) : null;
  const modified = Boolean(awning.reglasModificadas);
  const widthAdjustment = modified ? Number(awning.fabricJobWidthAdjustmentCm) || 0 : 0;
  const fabricWidth = round1(Math.max(0, Number(awning.width) + widthAdjustment));
  const standardAllowance = resolveFabricJobAllowance(model, hasValance, parameters);
  const bodyAllowance = modified && awning.fabricJobDropAllowanceCm !== null && awning.fabricJobDropAllowanceCm !== undefined
    ? Math.max(0, Number(awning.fabricJobDropAllowanceCm) || 0)
    : standardAllowance;
  const valanceExtra = modified && awning.fabricJobValanceExtraCm !== null && awning.fabricJobValanceExtraCm !== undefined
    ? Math.max(0, Number(awning.fabricJobValanceExtraCm) || 0)
    : parameters.valanceExtraCm;

  const curtainDeduction = model === 'CAMBIO CORTINA'
    ? modified
      ? Math.max(0, Number(awning.curtainFabricDeductionCm) || 0)
      : curtainParameters.bottomDeductionCm
    : 0;
  const bodyDrop = calculateBodyDrop({ model, awning, bodyAllowance, valanceHeight, valanceExtra, separateValance, parameters, curtainParameters, curtainDeduction });
  const fabricDrop = round1(bodyDrop);
  const mainUsage = calculateFabricUsage({
    width: fabricWidth,
    drop: fabricDrop,
    units: awning.units,
    rollWidth: fabric?.width || 120,
    seamAllowanceCm: model === 'CAMBIO CORTINA' ? curtainParameters.seamAllowanceCm : parameters.seamAllowanceCm,
    seamBaseCm: model === 'CAMBIO CORTINA' ? curtainParameters.seamBaseCm : parameters.seamBaseCm
  });
  const valanceDrop = separateValance ? round1(valanceHeight + valanceExtra) : 0;
  const valanceUsage = separateValance ? calculateFabricUsage({
    width: fabricWidth,
    drop: valanceDrop,
    units: awning.units,
    rollWidth: valanceFabric?.width || 120,
    seamAllowanceCm: parameters.seamAllowanceCm,
    seamBaseCm: parameters.seamBaseCm
  }) : { panels: 0, ml: 0 };

  const missingWindowDimensions = model === 'CAMBIO CORTINA' && awning.curtainHasWindow
    ? ['curtainWindowExit', 'curtainWindowCorner', 'curtainWindowFloorHeight', 'curtainWindowHeight'].filter((field) => !Number(awning[field]))
    : [];
  const missingCurtainConfig = model === 'CAMBIO CORTINA' && (awning.curtainHasWindow === null || !awning.curtainFinish);
  const valid = Boolean(fabric) && (!separateValance || Boolean(valanceFabric)) && !missingCurtainConfig && missingWindowDimensions.length === 0;
  const totalMl = round2(mainUsage.ml + valanceUsage.ml);
  const calculation = {
    model, valid, minimumLine: 0,
    width: awning.width, projection: awning.projection,
    fabricWidth, fabricDrop, fabricMl: totalMl,
    fabricPanels: mainUsage.panels + valanceUsage.panels,
    fabricCode: fabric?.code || '', fabricDescription: fabric?.description || '', fabricRollWidth: fabric?.width || 120,
    mainFabricMl: mainUsage.ml, mainFabricPanels: mainUsage.panels,
    valanceFabricCode: valanceFabric?.code || '', valanceFabricDescription: valanceFabric?.description || '',
    valanceFabricMl: valanceUsage.ml, valanceFabricPanels: valanceUsage.panels, valanceDrop,
    structureLength: 0, stockLength: 0,
    curtainFabricDeductionCm: model === 'CAMBIO CORTINA' ? curtainDeduction : undefined,
    fabricJobWidthAdjustmentCm: widthAdjustment,
    fabricJobDropAllowanceCm: bodyAllowance,
    fabricJobValanceExtraCm: valanceExtra
  };

  return {
    of: awning.of,
    description: buildDescription(awning, calculation),
    materials: valid ? buildMaterials(fabric, mainUsage.ml, valanceFabric, valanceUsage.ml) : [],
    despiece: null,
    diagnostics: buildDiagnostics({ awning, model, fabric, fabricSelection, separateValance, valanceFabric, missingCurtainConfig, missingWindowDimensions, modified }),
    calculation
  };
}

function calculateBodyDrop({ model, awning, bodyAllowance, valanceHeight, valanceExtra, separateValance, parameters, curtainParameters, curtainDeduction }) {
  if (model === 'BAMBALINA') return valanceHeight + valanceExtra;
  if (model === 'CAMBIO CORTINA') {
    return Number(awning.projection) + valanceHeight + curtainParameters.fabricDropAllowanceCm - curtainDeduction;
  }
  if (model === 'CAMBIO ANTICA') {
    const allowance = separateValance ? parameters.anticaSeparateValanceAllowanceCm : bodyAllowance;
    return Number(awning.projection) + allowance + (separateValance ? 0 : valanceHeight + valanceExtra);
  }
  if (model === 'CAMBIO TELA') {
    return Number(awning.projection) + bodyAllowance + (separateValance ? 0 : valanceHeight + valanceExtra);
  }
  return Number(awning.projection) + bodyAllowance;
}

function buildMaterials(fabric, mainMl, valanceFabric, valanceMl) {
  const lines = [{ code: fabric.code, quantity: mainMl, description: fabric.description }];
  if (valanceFabric && valanceMl > 0) lines.push({ code: valanceFabric.code, quantity: valanceMl, description: `${valanceFabric.description} · BAMBA` });
  return lines;
}

function buildDiagnostics({ awning, model, fabric, fabricSelection, separateValance, valanceFabric, missingCurtainConfig, missingWindowDimensions, modified }) {
  const diagnostics = [];
  if (!fabric) diagnostics.push({ level: 'error', awningId: awning.id, message: fabricSelection ? `Tela no encontrada en el catálogo: "${fabricSelection}".` : `Falta indicar la tela en ${model}, OF ${awning.of}.` });
  if (separateValance && !valanceFabric) diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela de bamba no encontrada en el catálogo: "${awning.valanceFabric}".` });
  if (missingCurtainConfig) diagnostics.push({ level: 'error', awningId: awning.id, message: `CAMBIO CORTINA incompleto en OF ${awning.of}: falta ventana y confección.` });
  if (missingWindowDimensions.length > 0) diagnostics.push({ level: 'error', awningId: awning.id, message: `CAMBIO CORTINA con ventana incompleto en OF ${awning.of}: faltan medidas de ventana.` });
  if (modified && diagnostics.length === 0) diagnostics.push({ level: 'warn', awningId: awning.id, message: `Excepción técnica en OF ${awning.of}: reglas de ${model} modificadas.` });
  return diagnostics;
}

export const calculateCambioCortina = (context) => calculateFabricOnly(context);
export const calculateEnrollable = (context) => calculateFabricOnly(context);
export const calculateBambalina = (context) => calculateFabricOnly(context);
export const calculateCambioAntica = (context) => calculateFabricOnly(context);

function buildDescription(awning, calculation) {
  const valance = calculation.valanceFabricCode ? ` · bamba ${calculation.valanceFabricCode} ${formatNumber(calculation.valanceFabricMl)} ml` : '';
  return `${awning.model} ${formatNumber(awning.width)}x${formatNumber(calculation.fabricDrop)} · ${formatNumber(calculation.fabricMl)} ml${valance}`;
}

function round1(value) { return Math.round((Number(value) + Number.EPSILON) * 10) / 10; }
function round2(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
