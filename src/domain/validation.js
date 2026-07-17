import { roundQuantity } from './math.js';
import { normalizeArzuaProParameters } from './arzuaProParameters.js';
import { normalizeGaliciaParameters } from './galiciaParameters.js';
import { getModelWorkType } from './modelBehavior.js';

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
    curvaBamba: cleanText(payload.curvaBamba),
    bambaDistinta: Boolean(payload.bambaDistinta),
    telaBamba: cleanText(payload.telaBamba),
    structureColor: cleanText(payload.structureColor),
    rotTela: cleanText(payload.rotTela).toUpperCase(),
    rotBamba: cleanText(payload.rotBamba).toUpperCase(),
    notes: cleanText(payload.notes),
    parameters: {
      arzuaPro: normalizeArzuaProParameters(payload.parameters?.arzuaPro),
      galicia: normalizeGaliciaParameters(payload.parameters?.galicia)
    },
    awnings: awnings.map((awning, index) => normalizeAwning(awning, index))
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

function normalizeAwning(awning, _index) {
  const of = cleanText(awning?.of);
  const model = cleanText(awning?.model).toUpperCase();
  const units = numberOrDefault(awning?.units, 1) || 1;
  const width = numberOrDefault(awning?.width, 0);
  const projection = numberOrDefault(awning?.projection, 0);
  const device = cleanText(awning?.device).toUpperCase();

  return {
    id: cleanText(awning?.id),
    workType: getModelWorkType(model),
    of,
    model,
    units,
    width,
    projection,
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
    curtainHasWindow: Boolean(awning?.curtainHasWindow),
    curtainFinish: normalizeCurtainFinish(awning?.curtainFinish),
    curtainWindowExit: numberOrDefault(awning?.curtainWindowExit, 0),
    curtainWindowCorner: numberOrDefault(awning?.curtainWindowCorner, 0),
    curtainWindowFloorHeight: numberOrDefault(awning?.curtainWindowFloorHeight, 0),
    curtainWindowHeight: numberOrDefault(awning?.curtainWindowHeight, 0),
    valanceHeight: numberOrDefault(awning?.valanceHeight, 0),
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
      current.quantity = roundQuantity(current.quantity + Number(material.quantity || 0));
      target.materials.set(code, current);
    }
    groupedOfs.set(ofKey, target);
  }

  return {
    orderCode: reservation.orderCode,
    ofs: Array.from(groupedOfs.values()).map((ofBlock) => ({
      of: ofBlock.of,
      description: ofBlock.description,
      materials: Array.from(ofBlock.materials.values())
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

function normalizeCurtainFinish(value) {
  const finish = cleanText(value).toUpperCase();
  return ['NORMAL', 'VELCRO', 'TUBO'].includes(finish) ? finish : 'NORMAL';
}

