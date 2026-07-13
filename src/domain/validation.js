import { roundQuantity } from './math.js';
import { normalizeArzuaProParameters } from './arzuaProParameters.js';
import { normalizeGaliciaParameters } from './galiciaParameters.js';

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
    remate: cleanText(payload.remate),
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

  return {
    orderCode,
    ofs: ofs.map((ofBlock, index) => normalizeOfBlock(ofBlock, index))
  };
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
    valanceHeight: numberOrDefault(awning?.valanceHeight, 0),
    reglasModificadas: Boolean(awning?.reglasModificadas),
    notes: cleanText(awning?.notes)
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

