import { models } from './catalog.js';
import { calculateArzuaPro } from './arzuaProRules.js';
import { calculateGalicia } from './galiciaRules.js';
import { calculateCoralBox, calculatePerlaBox } from './storbox400Rules.js';
import { calculateCuarzoBox } from './storbox250Rules.js';
import { calculateXacobeo } from './xacobeoRules.js';
import { calculatePuntoRecto } from './puntoRectoRules.js';
import { calculateAntica } from './anticaRules.js';
import { calculateMonoblock350 } from './monoblock350Rules.js';
import { calculateMaxiscreem } from './maxiscreemRules.js';
import { calculateAmbarBox } from './ambarBoxRules.js';
import { calculateAgataBox } from './agataBoxRules.js';
import { calculateCortina } from './cortinaRules.js';
import { calculateSelena } from './selenaRules.js';
import { calculateHera } from './heraRules.js';
import { calculateCambioTela } from './cambioTelaRules.js';
import { calculateBambalina, calculateCambioAntica, calculateCambioCortina, calculateEnrollable } from './fabricOnlyRules.js';
import { normalizeOrder } from './validation.js';
import { getFieldVisibility, getRequiredDimensions } from './modelBehavior.js';
import { applyLegacyRpsFabricReservation } from './legacyRpsReservation.js';

const implementedRules = new Map([
  ['ARZUA PRO', calculateArzuaPro],
  ['GALICIA', calculateGalicia],
  ['CORAL BOX', calculateCoralBox],
  ['PERLA BOX', calculatePerlaBox],
  ['CUARZO BOX', calculateCuarzoBox],
  ['XACOBEO', calculateXacobeo],
  ['PUNTO RECTO', calculatePuntoRecto],
  ['ANTICA', calculateAntica],
  ['MONOBLOCK 350', calculateMonoblock350],
  ['MAXISCREEM', calculateMaxiscreem],
  ['AMBAR BOX', calculateAmbarBox],
  ['AGATA BOX', calculateAgataBox],
  ['CORTINA', calculateCortina],
  ['SELENA', calculateSelena],
  ['HERA', calculateHera],
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

    const invalidUnits = !Number.isInteger(Number(awning.units)) || Number(awning.units) < 1;
    const calculationAwning = invalidUnits ? { ...awning, units: 1 } : awning;
    let result = rule({ order, awning: calculationAwning, model });
    if (Array.isArray(result.diagnostics)) {
      diagnostics.push(...result.diagnostics);
    }
    if (invalidUnits) {
      diagnostics.push({
        level: 'error',
        awningId: awning.id,
        message: `${awning.model} en OF ${awning.of}: la cantidad debe ser un número entero mayor que cero.`
      });
      result = {
        ...result,
        materials: [],
        despiece: null,
        calculation: { ...result.calculation, valid: false }
      };
    }
    const fields = getFieldVisibility({ model: awning.model, device: awning.device });
    if (fields.motorLocation && !awning.machineSide) {
      diagnostics.push({
        level: 'error',
        awningId: awning.id,
        message: `${awning.model} incompleto en OF ${awning.of}: falta posición del motor.`
      });
      result = {
        ...result,
        materials: [],
        despiece: null,
        calculation: { ...result.calculation, valid: false }
      };
    }
    result = applyLegacyRpsFabricReservation({ awning, result });
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
