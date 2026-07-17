import { formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';

const HEM_ALLOWANCE_CM = 40;
const VALANCE_EXTRA_CM = 5;
const CURTAIN_BOTTOM_ALLOWANCE_CM = 18;
const ROLLER_ALLOWANCE_CM = 25;
const ANTICA_ALLOWANCE_CM = 65;

const fabricJobRules = {
  'CAMBIO TELA': (awning) => Number(awning.projection) + HEM_ALLOWANCE_CM + Number(awning.valanceHeight || 0) + VALANCE_EXTRA_CM,
  'CAMBIO CORTINA': (awning) => Number(awning.projection) + HEM_ALLOWANCE_CM
    + (awning.valanceHeight ? Number(awning.valanceHeight) + VALANCE_EXTRA_CM : 0)
    - CURTAIN_BOTTOM_ALLOWANCE_CM,
  'ENROLLABLE': (awning) => Number(awning.projection) + ROLLER_ALLOWANCE_CM,
  'BAMBALINA': (awning) => Number(awning.valanceHeight) + VALANCE_EXTRA_CM,
  'CAMBIO ANTICA': (awning) => Number(awning.projection) + (awning.valanceHeight ? Number(awning.valanceHeight) + ANTICA_ALLOWANCE_CM + VALANCE_EXTRA_CM : HEM_ALLOWANCE_CM)
};

export function calculateFabricOnly({ order, awning }) {
  const model = String(awning.model || '').toUpperCase();
  const calculateDrop = fabricJobRules[model];
  if (!calculateDrop) throw new Error(`Trabajo de tela no soportado: ${model}.`);

  const fabricSelection = order.sameFabric !== false ? order.fabric : awning.fabric;
  const fabric = resolveFabric(fabricSelection);
  const fabricWidth = round1(awning.width);
  const fabricDrop = round1(calculateDrop(awning));
  const fabricUsage = calculateFabricUsage({
    width: fabricWidth,
    drop: fabricDrop,
    units: awning.units,
    rollWidth: fabric?.width || 120
  });
  const missingWindowDimensions = model === 'CAMBIO CORTINA' && awning.curtainHasWindow
    ? ['curtainWindowExit', 'curtainWindowCorner', 'curtainWindowFloorHeight', 'curtainWindowHeight']
      .filter((field) => !Number(awning[field]))
    : [];
  const missingCurtainConfig = model === 'CAMBIO CORTINA'
    && (awning.curtainHasWindow === null || !awning.curtainFinish);
  const valid = Boolean(fabric) && !missingCurtainConfig && missingWindowDimensions.length === 0;
  const calculation = {
    model,
    valid,
    minimumLine: 0,
    width: awning.width,
    projection: awning.projection,
    fabricWidth,
    fabricDrop,
    fabricMl: fabricUsage.ml,
    fabricPanels: fabricUsage.panels,
    fabricCode: fabric?.code || '',
    fabricDescription: fabric?.description || '',
    fabricRollWidth: fabric?.width || 120,
    structureLength: 0,
    stockLength: 0
  };

  return {
    of: awning.of,
    description: buildDescription(awning, calculation),
    materials: valid ? [{ code: fabric.code, quantity: fabricUsage.ml, description: fabric.description }] : [],
    despiece: null,
    diagnostics: buildDiagnostics({ awning, model, fabric, fabricSelection, missingCurtainConfig, missingWindowDimensions }),
    calculation
  };
}

function buildDiagnostics({ awning, model, fabric, fabricSelection, missingCurtainConfig, missingWindowDimensions }) {
  const diagnostics = [];
  if (!fabric) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: fabricSelection
        ? `Tela no encontrada en el catálogo: "${fabricSelection}".`
        : `Falta indicar la tela en ${model}, OF ${awning.of}.`
    });
  }
  if (missingCurtainConfig) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `CAMBIO CORTINA incompleto en OF ${awning.of}: falta ventana y confección.`
    });
  }
  if (missingWindowDimensions.length > 0) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `CAMBIO CORTINA con ventana incompleto en OF ${awning.of}: faltan medidas de ventana.`
    });
  }
  return diagnostics;
}

export const calculateCambioCortina = (context) => calculateFabricOnly(context);
export const calculateEnrollable = (context) => calculateFabricOnly(context);
export const calculateBambalina = (context) => calculateFabricOnly(context);
export const calculateCambioAntica = (context) => calculateFabricOnly(context);

function buildDescription(awning, calculation) {
  return `${awning.model} ${formatNumber(awning.width)}x${formatNumber(calculation.fabricDrop)} · ${formatNumber(calculation.fabricMl)} ml`;
}

function round1(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}
