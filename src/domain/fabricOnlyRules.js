import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';
import { normalizeCambioCortinaParameters } from './cambioCortinaParameters.js';
import { normalizeFabricJobParameters, resolveFabricJobAllowance } from './fabricJobParameters.js';
import { normalizeAnticaVariant, resolveAnticaRoundEntry } from './anticaRules.js';

const supportedModels = new Set(['CAMBIO TELA', 'CAMBIO CORTINA', 'ENROLLABLE', 'BAMBALINA', 'CAMBIO ANTICA']);

export function calculateFabricOnly({ order, awning }) {
  const model = String(awning.model || '').toUpperCase();
  if (!supportedModels.has(model)) throw new Error(`Trabajo de tela no soportado: ${model}.`);

  const parameters = normalizeFabricJobParameters(order.parameters?.fabricJobs);
  const curtainParameters = normalizeCambioCortinaParameters(order.parameters?.cambioCortina);
  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = resolveFabric(fabricSelection);
  const valanceHeight = Math.max(0, Number(awning.valanceHeight) || 0);
  const supportsValance = ['CAMBIO TELA', 'CAMBIO CORTINA', 'CAMBIO ANTICA', 'BAMBALINA'].includes(model);
  const hasValance = model === 'BAMBALINA' || (supportsValance && valanceHeight > 0);
  const separateValance = hasValance && model !== 'BAMBALINA' && Boolean(awning.valanceFabric);
  const valanceFabric = separateValance ? resolveFabric(awning.valanceFabric) : null;
  const modified = Boolean(awning.reglasModificadas);
  const anticaVariant = model === 'CAMBIO ANTICA' ? normalizeAnticaVariant(awning.anticaVariant) : '';
  const roundAnticaEntry = resolveAnticaRoundEntry(anticaVariant);
  // Iván, 25/09/2026: en un cambio de tela el pedido trae la medida de la tela vieja,
  // tal cual (se abre y se mide). Solo se suma lo que el técnico ponga en la tarjeta.
  const cambioAnticaExtra = model === 'CAMBIO ANTICA' ? Number(awning.cambioAnticaExtraCm) || 0 : 0;
  const widthAdjustment = modified ? Number(awning.fabricJobWidthAdjustmentCm) || 0 : 0;
  const fabricWidth = round1(Math.max(0, Number(awning.width) + widthAdjustment));
  const bodyAllowance = model === 'CAMBIO ANTICA'
    ? cambioAnticaExtra
    : modified && awning.fabricJobDropAllowanceCm !== null && awning.fabricJobDropAllowanceCm !== undefined
      ? Math.max(0, Number(awning.fabricJobDropAllowanceCm) || 0)
      : resolveFabricJobAllowance(model, hasValance, parameters);
  const valanceExtra = modified && awning.fabricJobValanceExtraCm !== null && awning.fabricJobValanceExtraCm !== undefined
    ? Math.max(0, Number(awning.fabricJobValanceExtraCm) || 0)
    : parameters.valanceExtraCm;

  const curtainDeduction = model === 'CAMBIO CORTINA'
    ? modified
      ? Math.max(0, Number(awning.curtainFabricDeductionCm) || 0)
      : curtainParameters.bottomDeductionCm
    : 0;
  const bodyDrop = calculateBodyDrop({
    model, awning, bodyAllowance, valanceHeight, valanceExtra, separateValance, curtainParameters, curtainDeduction
  });
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
    // La hoja BAMBALINA del libro antiguo usa siempre el frente bruto.
    width: Math.max(0, Number(awning.width) || 0),
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
  const missingAnticaConfig = model === 'CAMBIO ANTICA' && !anticaVariant;
  const invalidAnticaValance = model === 'CAMBIO ANTICA'
    && anticaVariant === 'TUBO 50X30 SIN BAMBA' && valanceHeight > 0;
  const valid = Boolean(fabric) && (!separateValance || Boolean(valanceFabric))
    && !missingCurtainConfig && missingWindowDimensions.length === 0
    && !missingAnticaConfig && !invalidAnticaValance;
  const totalMl = round2(mainUsage.ml + valanceUsage.ml);
  const calculation = {
    model, valid, minimumLine: 0,
    width: awning.width, projection: awning.projection,
    fabricWidth, fabricDrop, fabricMl: mainUsage.ml,
    fabricPanels: mainUsage.panels,
    totalFabricMl: totalMl,
    fabricCode: fabric?.code || '', fabricDescription: fabric?.description || '', fabricRollWidth: fabric?.width || 120,
    mainFabricMl: mainUsage.ml, mainFabricPanels: mainUsage.panels,
    valanceFabricCode: valanceFabric?.code || '', valanceFabricDescription: valanceFabric?.description || '',
    valanceFabricWidth: separateValance ? Math.max(0, Number(awning.width) || 0) : 0,
    valanceFabricMl: valanceUsage.ml, valanceFabricPanels: valanceUsage.panels, valanceDrop,
    structureLength: 0, stockLength: 0,
    curtainFabricDeductionCm: model === 'CAMBIO CORTINA' ? curtainDeduction : undefined,
    fabricJobWidthAdjustmentCm: widthAdjustment,
    fabricJobDropAllowanceCm: bodyAllowance,
    fabricJobValanceExtraCm: valanceExtra,
    anticaEntryDiameterMm: roundAnticaEntry?.diameterMm
  };

  return {
    of: awning.of,
    description: buildDescription(awning, calculation),
    materials: valid ? buildMaterials(fabric, mainUsage.ml, valanceFabric, valanceUsage.ml) : [],
    despiece: null,
    diagnostics: buildDiagnostics({
      awning, model, fabric, fabricSelection, separateValance, valanceFabric,
      missingCurtainConfig, missingWindowDimensions, missingAnticaConfig, invalidAnticaValance, modified
    }),
    calculation
  };
}

function calculateBodyDrop({ model, awning, bodyAllowance, valanceHeight, valanceExtra, separateValance, curtainParameters, curtainDeduction }) {
  if (model === 'BAMBALINA') return valanceHeight + valanceExtra;
  if (model === 'CAMBIO CORTINA') {
    // El margen de 45 incluye el remate de 5 de la bamba: sin bamba de la misma
    // tela no se suma (Iván, 22/09/2026; mismo criterio que Cambio de tela).
    const integratedValance = !separateValance && valanceHeight > 0;
    const curtainAllowance = curtainParameters.fabricDropAllowanceCm - (integratedValance ? 0 : valanceExtra);
    return Number(awning.projection)
      + (separateValance ? 0 : valanceHeight)
      + Math.max(0, curtainAllowance)
      - curtainDeduction;
  }
  // La medida de la tela vieja ya incluye la entrada de tubo y la bamba de la misma
  // tela; la bamba de otra tela se corta aparte (valanceDrop).
  if (model === 'CAMBIO ANTICA') return Number(awning.projection) + bodyAllowance;
  if (model === 'CAMBIO TELA') {
    // El remate solo existe si hay bamba. Sumarlo con alto 0 añadía 5 cm a cada
    // cambio de tela sin bambalina: 17 de los 24 desajustes de caída de 2026.
    const integratedValance = separateValance || valanceHeight <= 0 ? 0 : valanceHeight + valanceExtra;
    return Number(awning.projection) + bodyAllowance + integratedValance;
  }
  return Number(awning.projection) + bodyAllowance;
}

function buildMaterials(fabric, mainMl, valanceFabric, valanceMl) {
  const lines = [{ code: fabric.code, quantity: mainMl, description: fabric.description }];
  if (valanceFabric && valanceMl > 0) lines.push({ code: valanceFabric.code, quantity: valanceMl, description: `${valanceFabric.description} · BAMBA` });
  return lines;
}

function buildDiagnostics({ awning, model, fabric, fabricSelection, separateValance, valanceFabric, missingCurtainConfig, missingWindowDimensions, missingAnticaConfig, invalidAnticaValance, modified }) {
  const diagnostics = [];
  if (!fabric) diagnostics.push({ level: 'error', awningId: awning.id, message: fabricSelection ? `Tela no encontrada en el catálogo: "${fabricSelection}".` : `Falta indicar la tela en ${model}, OF ${awning.of}.` });
  if (separateValance && !valanceFabric) diagnostics.push({ level: 'error', awningId: awning.id, message: `Tela de bamba no encontrada en el catálogo: "${awning.valanceFabric}".` });
  if (missingCurtainConfig) diagnostics.push({ level: 'error', awningId: awning.id, message: `CAMBIO CORTINA incompleto en OF ${awning.of}: falta ventana y confección.` });
  if (missingWindowDimensions.length > 0) diagnostics.push({ level: 'error', awningId: awning.id, message: `CAMBIO CORTINA con ventana incompleto en OF ${awning.of}: faltan medidas de ventana.` });
  if (missingAnticaConfig) diagnostics.push({ level: 'error', awningId: awning.id, message: `CAMBIO ANTICA incompleto en OF ${awning.of}: falta configuración Antica.` });
  if (invalidAnticaValance) diagnostics.push({ level: 'error', awningId: awning.id, message: 'CAMBIO ANTICA TUBO 50X30 SIN BAMBA no admite bambalina.' });
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
