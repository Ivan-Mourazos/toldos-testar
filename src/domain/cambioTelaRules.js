import { roundQuantity, formatNumber } from './math.js';
import { resolveFabric } from './fabricCatalog.js';

const HEM_ALLOWANCE_CM = 40;
const VALANCE_EXTRA_CM = 5;
const SEAM_ALLOWANCE_CM = 2.5;
const SEAM_BASE_CM = 6.5;

export function calculateCambioTela({ order, awning }) {
  const fabric = resolveFabric(order.fabric);

  if (!fabric) {
    return {
      of: awning.of,
      description: buildDescription(awning),
      materials: [],
      diagnostics: [{
        level: 'error',
        awningId: awning.id,
        message: `Tela no encontrada en el catálogo: "${order.fabric}".`
      }]
    };
  }

  const fabricWidth = awning.width;
  const fabricDrop = awning.projection + HEM_ALLOWANCE_CM + awning.valanceHeight + VALANCE_EXTRA_CM;
  const panels = countPanels(fabricWidth, fabric.width);
  const fabricMl = roundQuantity(awning.units * fabricDrop * panels / 100);

  return {
    of: awning.of,
    description: buildDescription(awning, { fabricWidth, fabricDrop, fabricMl }),
    materials: [
      { code: fabric.code, quantity: fabricMl, description: fabric.description }
    ],
    diagnostics: [],
    calculation: {
      model: 'CAMBIO TELA',
      valid: true,
      minimumLine: 0,
      width: awning.width,
      projection: awning.projection,
      fabricWidth,
      fabricDrop,
      fabricMl,
      structureLength: 0,
      stockLength: 0
    }
  };
}

function countPanels(width, rollWidth) {
  const initial = roundUp(width / rollWidth);
  const adjustedWidth = width + (initial - 1) * SEAM_ALLOWANCE_CM + SEAM_BASE_CM;
  return roundUp(adjustedWidth / rollWidth);
}

function roundUp(value) {
  return Math.ceil(value - 1e-9);
}

function buildDescription(awning, calc) {
  if (!calc) return `Toldo CAMBIO TELA ${awning.width}x${awning.projection}`;
  return `Toldo CAMBIO TELA ${awning.width}x${awning.projection} · tela ${formatNumber(calc.fabricWidth)}x${formatNumber(calc.fabricDrop)} · paño ${formatNumber(calc.fabricMl)} ml`;
}
