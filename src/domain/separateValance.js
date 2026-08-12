import { resolveFabric } from './fabricCatalog.js';
import { calculateFabricUsage } from './fabricMath.js';

/**
 * Calcula una bambalina confeccionada con una tela distinta a la del paño.
 * En el Excel antiguo la bambalina siempre usa el frente bruto del pedido,
 * no el frente descontado que pueda aplicar cada modelo al paño principal.
 */
export function calculateSeparateValance({
  awning,
  extraCm = 5,
  seamAllowanceCm,
  seamBaseCm
}) {
  const height = Math.max(0, Number(awning.valanceHeight) || 0);
  const selection = height > 0 ? String(awning.valanceFabric || '').trim() : '';
  const requested = Boolean(selection);
  const fabric = requested ? resolveFabric(selection) : null;
  const width = requested ? Math.max(0, Number(awning.width) || 0) : 0;
  const drop = requested ? round1(height + Math.max(0, Number(extraCm) || 0)) : 0;
  const usage = requested && fabric
    ? calculateFabricUsage({
      width,
      drop,
      units: awning.units,
      rollWidth: fabric.width || 120,
      seamAllowanceCm,
      seamBaseCm
    })
    : { panels: 0, ml: 0 };

  return {
    requested,
    valid: !requested || Boolean(fabric),
    selection,
    fabric,
    height,
    width,
    drop,
    usage
  };
}

export function separateValanceCalculation(valance) {
  return {
    valanceFabricCode: valance.fabric?.code || '',
    valanceFabricDescription: valance.fabric?.description || '',
    valanceFabricWidth: valance.width,
    valanceFabricMl: valance.usage.ml,
    valanceFabricPanels: valance.usage.panels,
    valanceDrop: valance.drop
  };
}

export function appendSeparateValanceMaterial(materials, valance) {
  if (valance.fabric && valance.usage.ml > 0) {
    materials.push({
      code: valance.fabric.code,
      quantity: valance.usage.ml,
      description: `${valance.fabric.description} · BAMBA`
    });
  }
  return materials;
}

export function appendSeparateValanceDiagnostic(diagnostics, awning, valance) {
  if (valance.requested && !valance.fabric) {
    diagnostics.push({
      level: 'error',
      awningId: awning.id,
      message: `Tela de bamba no encontrada en el catálogo: "${valance.selection}".`
    });
  }
  return diagnostics;
}

function round1(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10) / 10;
}
