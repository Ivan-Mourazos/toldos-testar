import { models } from './catalog.js';
import { calculateArzuaPro } from './arzuaProRules.js';
import { calculateGalicia } from './galiciaRules.js';
import { calculateCambioTela } from './cambioTelaRules.js';
import { calculateBambalina, calculateCambioAntica, calculateCambioCortina, calculateEnrollable } from './fabricOnlyRules.js';
import { normalizeOrder } from './validation.js';
import { getRequiredDimensions } from './modelBehavior.js';

const implementedRules = new Map([
  ['ARZUA PRO', calculateArzuaPro],
  ['GALICIA', calculateGalicia],
  ['CAMBIO TELA', calculateCambioTela],
  ['CAMBIO CORTINA', calculateCambioCortina],
  ['CAMBIO ANTICA', calculateCambioAntica],
  ['BAMBALINA', calculateBambalina],
  ['ENROLLABLE', calculateEnrollable]
]);

export function calculateOrder(payload) {
  const order = normalizeOrder(payload);
  const ofs = [];
  const diagnostics = [];

  for (const [awningIndex, awning] of order.awnings.entries()) {
    if (isIncompleteAwning(awning)) continue;

    const model = models.find((item) => item.code === awning.model);
    if (!model) {
      diagnostics.push({
        level: 'error',
        awningId: awning.id,
        message: `Modelo no reconocido: ${awning.model}.`
      });
      continue;
    }

    const rule = implementedRules.get(model.code);
    if (!rule) {
      diagnostics.push({
        level: 'pending',
        awningId: awning.id,
        message: `Reglas pendientes de migrar desde la hoja ${model.ruleSheet}.`
      });
      ofs.push({
        awningId: awning.id,
        awningIndex,
        of: awning.of,
        description: buildAwningDescription(awning),
        materials: []
      });
      continue;
    }

    const result = rule({ order, awning, model });
    if (Array.isArray(result.diagnostics)) {
      diagnostics.push(...result.diagnostics);
    }
    ofs.push({
      awningId: awning.id,
      awningIndex,
      of: result.of,
      description: result.description || buildAwningDescription(awning),
      materials: result.materials || [],
      despiece: result.despiece || null,
      calculation: result.calculation
    });
  }

  return {
    orderCode: order.orderCode,
    ofs,
    diagnostics,
    totals: {
      awnings: order.awnings.length,
      materials: ofs.reduce((sum, ofBlock) => sum + ofBlock.materials.length, 0)
    }
  };
}

function buildAwningDescription(awning) {
  const dimensions = awning.width && awning.projection
    ? `${awning.width}x${awning.projection}`
    : [awning.width, awning.projection].filter(Boolean).join('x');
  return dimensions ? `Toldo ${awning.model} ${dimensions}` : `Toldo ${awning.model}`;
}

function isIncompleteAwning(awning) {
  if (!awning.of || !awning.model) return true;
  return getRequiredDimensions(awning.model).some((field) => !Number(awning[field]));
}
