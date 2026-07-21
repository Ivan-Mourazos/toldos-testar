import { roundQuantity } from './math.js';
import { normalizeArzuaProParameters } from './arzuaProParameters.js';
import { normalizeGaliciaParameters } from './galiciaParameters.js';
import { normalizeCoralBoxParameters, normalizePerlaBoxParameters } from './storbox400Parameters.js';
import { normalizeCuarzoBoxParameters } from './storbox250Parameters.js';
import { normalizeXacobeoParameters } from './xacobeoParameters.js';
import { normalizePuntoRectoParameters } from './puntoRectoParameters.js';
import { normalizeMonoblock350Parameters } from './monoblock350Parameters.js';
import { normalizeMaxiscreemParameters } from './maxiscreemParameters.js';
import { normalizeAmbarBoxParameters } from './ambarBoxParameters.js';
import { normalizeAgataBoxParameters } from './agataBoxParameters.js';
import { normalizeFabricJobParameters } from './fabricJobParameters.js';
import { normalizeCortinaParameters } from './cortinaParameters.js';
import { normalizeCambioCortinaParameters } from './cambioCortinaParameters.js';
import { getModelWorkType } from './modelBehavior.js';
import { normalizeModelName } from './modelNames.js';

export function normalizeOrder(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('La solicitud no tiene formato válido.');
  }

  const orderCode = cleanText(payload.orderCode || payload.pedido || '');
  const awnings = Array.isArray(payload.awnings) ? payload.awnings : [];

  if (awnings.length === 0) {
    throw new Error('Añade al menos un toldo.');
  }

  return {
    orderCode,
    customer: cleanText(payload.customer),
    orderDate: cleanText(payload.orderDate),
    technician: cleanText(payload.technician),
    reviewer: cleanText(payload.reviewer),
    fabric: cleanText(payload.fabric),
    sameFabric: payload.sameFabric !== false,
    remate: cleanText(payload.remate),
    remateColor: cleanText(payload.remateColor),
    structureColor: cleanText(payload.structureColor),
    rotTela: cleanText(payload.rotTela).toUpperCase(),
    rotBamba: cleanText(payload.rotBamba).toUpperCase(),
    notes: cleanText(payload.notes),
    parameters: {
      arzuaPro: normalizeArzuaProParameters(payload.parameters?.arzuaPro),
      galicia: normalizeGaliciaParameters(payload.parameters?.galicia),
      perlaBox: normalizePerlaBoxParameters(payload.parameters?.perlaBox || payload.parameters?.storbox400),
      coralBox: normalizeCoralBoxParameters(payload.parameters?.coralBox),
      cuarzoBox: normalizeCuarzoBoxParameters(payload.parameters?.cuarzoBox),
      xacobeo: normalizeXacobeoParameters(payload.parameters?.xacobeo),
      puntoRecto: normalizePuntoRectoParameters(payload.parameters?.puntoRecto),
      monoblock350: normalizeMonoblock350Parameters(payload.parameters?.monoblock350),
      maxiscreem: normalizeMaxiscreemParameters(payload.parameters?.maxiscreem),
      ambarBox: normalizeAmbarBoxParameters(payload.parameters?.ambarBox),
      agataBox: normalizeAgataBoxParameters(payload.parameters?.agataBox),
      fabricJobs: normalizeFabricJobParameters(payload.parameters?.fabricJobs),
      cortina: normalizeCortinaParameters(payload.parameters?.cortina),
      cambioCortina: normalizeCambioCortinaParameters(payload.parameters?.cambioCortina)
    },
    awnings: awnings.map((awning, index) => normalizeAwning(awning, index, payload))
  };
}

export function normalizeReservation(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('La solicitud no tiene formato válido.');
  }

  const orderCode = cleanText(payload.orderCode || payload.pedido || '');
  const ofs = Array.isArray(payload.ofs) ? payload.ofs : [];

  if (ofs.length === 0) {
    throw new Error('Añade al menos una OF.');
  }

  const normalized = {
    orderCode,
    ofs: ofs.map((ofBlock, index) => normalizeOfBlock(ofBlock, index))
  };
  return consolidateReservation(normalized);
}

function normalizeAwning(awning, _index, legacyOrder = {}) {
  const of = cleanText(awning?.of);
  const model = normalizeModelName(awning?.model);
  const units = numberOrDefault(awning?.units, 1) || 1;
  const width = numberOrDefault(awning?.width, 0);
  const projection = numberOrDefault(awning?.projection, 0);
  const device = cleanText(awning?.device).toUpperCase();
  const hasValance = typeof awning?.hasValance === 'boolean'
    ? awning.hasValance
    : numberOrDefault(awning?.valanceHeight, 0) > 0 ? true : null;

  return {
    id: cleanText(awning?.id),
    workType: getModelWorkType(model),
    of,
    model,
    units,
    width,
    projection,
    hasValance,
    armCount: numberOrDefault(awning?.armCount, 0),
    device,
    placement: cleanText(awning?.placement).toUpperCase(),
    wallType: cleanText(awning?.wallType).toUpperCase(),
    submodel: cleanText(awning?.submodel).toUpperCase(),
    tubeLoad: cleanText(awning?.tubeLoad).toUpperCase(),
    destination: cleanText(awning?.destination).toUpperCase(),
    supportSystem: cleanText(awning?.supportSystem || 'AUTOMÁTICO').toUpperCase(),
    motorPower: cleanText(awning?.motorPower || 'AUTOMÁTICO').toUpperCase(),
    sensor: cleanText(awning?.sensor).toUpperCase(),
    machineSide: cleanText(awning?.machineSide).toUpperCase(),
    crankHeight: numberOrDefault(awning?.crankHeight, 0),
    curtainHasWindow: typeof awning?.curtainHasWindow === 'boolean' ? awning.curtainHasWindow : null,
    curtainFinish: normalizeCurtainFinish(awning?.curtainFinish),
    curtainWindowExit: numberOrDefault(awning?.curtainWindowExit, 0),
    curtainWindowCorner: numberOrDefault(awning?.curtainWindowCorner, 0),
    curtainWindowFloorHeight: numberOrDefault(awning?.curtainWindowFloorHeight, 0),
    curtainWindowHeight: numberOrDefault(awning?.curtainWindowHeight, 0),
    curtainFabricDeductionCm: numberOrDefault(awning?.curtainFabricDeductionCm, 0),
    curtainFabricWidthDiscountCm: nullableNumber(awning?.curtainFabricWidthDiscountCm),
    curtainRollTubeDiscountCm: nullableNumber(awning?.curtainRollTubeDiscountCm),
    curtainLoadProfileDiscountCm: nullableNumber(awning?.curtainLoadProfileDiscountCm),
    boxMinimumLineCm: nullableNumber(awning?.boxMinimumLineCm),
    boxProfileDiscountCm: nullableNumber(awning?.boxProfileDiscountCm),
    boxRollDiscountCm: nullableNumber(awning?.boxRollDiscountCm),
    boxFabricWidthDiscountCm: nullableNumber(awning?.boxFabricWidthDiscountCm),
    boxProtectorDiscountCm: nullableNumber(awning?.boxProtectorDiscountCm),
    xacMinimumLineCm: nullableNumber(awning?.xacMinimumLineCm),
    xacFabricWidthDiscountCm: nullableNumber(awning?.xacFabricWidthDiscountCm),
    xacRollDiscountCm: nullableNumber(awning?.xacRollDiscountCm),
    xacLoadBarDiscountCm: nullableNumber(awning?.xacLoadBarDiscountCm),
    pointFabricWidthDiscountCm: nullableNumber(awning?.pointFabricWidthDiscountCm),
    pointRollDiscountCm: nullableNumber(awning?.pointRollDiscountCm),
    pointLoadBarDiscountCm: nullableNumber(awning?.pointLoadBarDiscountCm),
    pointFabricDropMultiplier: nullableNumber(awning?.pointFabricDropMultiplier),
    pointFabricDropAllowanceCm: nullableNumber(awning?.pointFabricDropAllowanceCm),
    monoblockMinimumLineCm: nullableNumber(awning?.monoblockMinimumLineCm),
    monoblockMaximumLineCm: nullableNumber(awning?.monoblockMaximumLineCm),
    monoblockSupportCount: nullableNumber(awning?.monoblockSupportCount),
    monoblockFabricWidthDiscountCm: nullableNumber(awning?.monoblockFabricWidthDiscountCm),
    monoblockRollDiscountCm: nullableNumber(awning?.monoblockRollDiscountCm),
    monoblockLoadBarDiscountCm: nullableNumber(awning?.monoblockLoadBarDiscountCm),
    monoblockSquareBarDiscountCm: nullableNumber(awning?.monoblockSquareBarDiscountCm),
    monoblockFabricDropAllowanceCm: nullableNumber(awning?.monoblockFabricDropAllowanceCm),
    maxisFabricWidthDiscountCm: nullableNumber(awning?.maxisFabricWidthDiscountCm),
    maxisRollDiscountCm: nullableNumber(awning?.maxisRollDiscountCm),
    maxisLoadBarDiscountCm: nullableNumber(awning?.maxisLoadBarDiscountCm),
    maxisBoxProfileDiscountCm: nullableNumber(awning?.maxisBoxProfileDiscountCm),
    maxisFabricDropAllowanceCm: nullableNumber(awning?.maxisFabricDropAllowanceCm),
    ambarFabricWidthDiscountCm: nullableNumber(awning?.ambarFabricWidthDiscountCm),
    ambarRollDiscountCm: nullableNumber(awning?.ambarRollDiscountCm),
    ambarProfileDiscountCm: nullableNumber(awning?.ambarProfileDiscountCm),
    ambarFabricDropMultiplier: nullableNumber(awning?.ambarFabricDropMultiplier),
    ambarFabricDropAllowanceCm: nullableNumber(awning?.ambarFabricDropAllowanceCm),
    agataMinimumLineCm: nullableNumber(awning?.agataMinimumLineCm),
    agataSupportCount: nullableNumber(awning?.agataSupportCount),
    agataFabricWidthDiscountCm: nullableNumber(awning?.agataFabricWidthDiscountCm),
    agataRollDiscountCm: nullableNumber(awning?.agataRollDiscountCm),
    agataFabricDropAllowanceCm: nullableNumber(awning?.agataFabricDropAllowanceCm),
    fabricJobWidthAdjustmentCm: nullableNumber(awning?.fabricJobWidthAdjustmentCm),
    fabricJobDropAllowanceCm: nullableNumber(awning?.fabricJobDropAllowanceCm),
    fabricJobValanceExtraCm: nullableNumber(awning?.fabricJobValanceExtraCm),
    valanceHeight: hasValance === false ? 0 : numberOrDefault(awning?.valanceHeight, 0),
    valanceCurve: cleanText(awning?.valanceCurve || legacyOrder.curvaBamba).toUpperCase(),
    valanceFabric: cleanText(awning?.valanceFabric || (legacyOrder.bambaDistinta ? legacyOrder.telaBamba : '')),
    remate: cleanText(awning?.remate || legacyOrder.remate).toUpperCase(),
    remateColor: cleanText(awning?.remateColor || legacyOrder.remateColor),
    structureColor: cleanText(awning?.structureColor || legacyOrder.structureColor).toUpperCase(),
    rotFabric: cleanText(awning?.rotFabric || legacyOrder.rotTela).toUpperCase(),
    rotValance: cleanText(awning?.rotValance || legacyOrder.rotBamba).toUpperCase(),
    reglasModificadas: Boolean(awning?.reglasModificadas),
    fabric: cleanText(awning?.fabric),
    structureNotes: cleanText(awning?.structureNotes || awning?.notes),
    fabricNotes: cleanText(awning?.fabricNotes)
  };
}

export function consolidateReservation(reservation) {
  const groupedOfs = new Map();

  for (const ofBlock of reservation.ofs || []) {
    const ofKey = cleanText(ofBlock.of).toUpperCase();
    const target = groupedOfs.get(ofKey) || {
      of: ofBlock.of,
      description: ofBlock.description || '',
      materials: new Map()
    };
    if (!target.description && ofBlock.description) target.description = ofBlock.description;

    for (const material of ofBlock.materials || []) {
      const code = cleanText(material.code).toUpperCase();
      const current = target.materials.get(code) || { ...material, code, quantity: 0 };
      current.quantity = material.aggregation === 'max'
        ? roundQuantity(Math.max(current.quantity, Number(material.quantity || 0)))
        : roundQuantity(current.quantity + Number(material.quantity || 0));
      target.materials.set(code, current);
    }
    groupedOfs.set(ofKey, target);
  }

  return {
    orderCode: reservation.orderCode,
    ofs: Array.from(groupedOfs.values()).map((ofBlock) => ({
      of: ofBlock.of,
      description: ofBlock.description,
      materials: Array.from(ofBlock.materials.values()).map(({ aggregation: _aggregation, ...material }) => material)
    }))
  };
}

function normalizeOfBlock(ofBlock, index) {
  const of = cleanText(ofBlock?.of);
  if (!of) throw new Error(`La OF ${index + 1} no tiene número.`);

  const materials = Array.isArray(ofBlock?.materials) ? ofBlock.materials : [];
  const normalizedMaterials = materials.flatMap((line) => {
    const code = cleanText(line?.code || line?.codArticle || line?.articleCode).toUpperCase();
    const description = cleanText(line?.description);
    const quantity = Number(line?.quantity);

    if (!code && !description && !quantity) return [];
    if (!code) throw new Error(`Hay una línea sin artículo en la OF ${of}.`);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new Error(`La cantidad de ${code} en la OF ${of} debe ser mayor que cero.`);
    }

    return [{ code, description, quantity: roundQuantity(quantity) }];
  });

  if (normalizedMaterials.length === 0) {
    throw new Error(`La OF ${of} no tiene materiales.`);
  }

  return {
    of,
    description: cleanText(ofBlock?.description).slice(0, 120),
    materials: normalizedMaterials
  };
}

function cleanText(value) {
  return String(value ?? '').trim();
}

function numberOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeCurtainFinish(value) {
  const finish = cleanText(value).toUpperCase();
  return ['NORMAL', 'VELCRO', 'TUBO'].includes(finish) ? finish : '';
}

