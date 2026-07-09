import { models } from './catalog.js';
import { calculateArzuaPro } from './arzuaProRules.js';
import { normalizeOrder } from './validation.js';

const implementedRules = new Map([
  ['ARZUA PRO', calculateArzuaPro]
]);

export function calculateOrder(payload) {
  const order = normalizeOrder(payload);
  const ofs = [];
  const diagnostics = [];

  for (const awning of order.awnings) {
    const model = models.find((item) => item.code === awning.model);
    if (!model) {
      diagnostics.push({
        level: 'error',
        awningId: awning.id,
        message: `Modelo no reconocido: ${awning.model}.`
      });
      continue;
    }

    const overrideSummary = describeOverrides(awning);
    if (overrideSummary) {
      diagnostics.push({
        level: 'warn',
        awningId: awning.id,
        message: `Ajuste técnico en OF ${awning.of}: ${overrideSummary}`
      });
    }

    const rule = implementedRules.get(model.code);
    if (!rule) {
      diagnostics.push({
        level: 'pending',
        awningId: awning.id,
        message: `Reglas pendientes de migrar desde la hoja ${model.ruleSheet}.`
      });
      ofs.push({
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
      of: result.of,
      description: result.description || buildAwningDescription(awning),
      materials: result.materials || [],
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

  const overrides = describeOverrides(awning);
  const base = dimensions ? `Toldo ${awning.model} ${dimensions}` : `Toldo ${awning.model}`;
  return overrides ? `${base} (${overrides})` : base;
}

function describeOverrides(awning) {
  const items = [];
  if (awning.calculationModelOverride) items.push(`reglas ${awning.calculationModelOverride}`);
  if (awning.supportSystemOverride) items.push(`soportes ${awning.supportSystemOverride}`);
  if (awning.minimumLineOverride !== null && awning.minimumLineOverride !== undefined) {
    items.push(`línea mínima ${awning.minimumLineOverride}`);
  }
  if (awning.overrideReason) items.push(`motivo: ${awning.overrideReason}`);
  return items.join(' · ');
}
