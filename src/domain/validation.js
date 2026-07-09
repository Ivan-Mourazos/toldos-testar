import { roundQuantity } from './math.js';

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
    technician: cleanText(payload.technician),
    fabric: cleanText(payload.fabric),
    structureColor: cleanText(payload.structureColor),
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

function normalizeAwning(awning, index) {
  const of = cleanText(awning?.of);
  const model = cleanText(awning?.model).toUpperCase();
  const units = numberOrDefault(awning?.units, 1);
  const width = numberOrDefault(awning?.width, 0);
  const projection = numberOrDefault(awning?.projection, 0);
  const device = cleanText(awning?.device).toUpperCase();

  if (!of) throw new Error(`El toldo ${index + 1} no tiene OF.`);
  if (!model) throw new Error(`El toldo ${index + 1} no tiene modelo.`);
  if (units <= 0) throw new Error(`Las unidades del toldo ${index + 1} deben ser mayores que cero.`);

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
    valance: cleanText(awning?.valance).toUpperCase(),
    tubeLoad: cleanText(awning?.tubeLoad).toUpperCase(),
    sensor: cleanText(awning?.sensor).toUpperCase(),
    machineSide: cleanText(awning?.machineSide).toUpperCase(),
    crankHeight: numberOrDefault(awning?.crankHeight, 0),
    calculationModelOverride: normalizeDefaultOverride(awning?.calculationModelOverride),
    supportSystemOverride: normalizeDefaultOverride(awning?.supportSystemOverride),
    minimumLineOverride: optionalNumber(awning?.minimumLineOverride),
    overrideReason: cleanText(awning?.overrideReason),
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

function optionalNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeDefaultOverride(value) {
  const text = cleanText(value).toUpperCase();
  return text && text !== 'SEGÚN MODELO' && text !== 'SEGUN MODELO' ? text : '';
}


