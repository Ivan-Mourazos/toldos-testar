import { applyStructureEdit } from './structureEdits.js';
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
import { calculateElectra } from './electraRules.js';
import { calculateIris } from './irisRules.js';
import { calculateSelena } from './selenaRules.js';
import { calculateHera } from './heraRules.js';
import { calculateCambioTela } from './cambioTelaRules.js';
import { calculateBambalina, calculateCambioAntica, calculateCambioCortina, calculateEnrollable } from './fabricOnlyRules.js';
import { normalizeOrder } from './validation.js';
import { getRequiredDimensions } from './modelBehavior.js';
import { awningLetter, describeMissing, getMissingFields } from './awningCompleteness.js';
import { applyLegacyRpsFabricReservation } from './legacyRpsReservation.js';
import { withRpsCodes } from './rpsIrregularCodes.js';
import { withLacadoFallback } from './lacadoFallback.js';

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
  ['ELECTRA', calculateElectra],
  ['IRIS', calculateIris],
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
    result = applyStructureEdit(awning, result);
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
    result = applyLegacyRpsFabricReservation({ awning, result });
    result = withRpsCodes(result);
    // Lacado poco habitual: lo que no existe en ese color va en blanco para lacar fuera.
    const knownDiagnostics = result.diagnostics?.length || 0;
    result = withLacadoFallback(result, { awning, order });
    diagnostics.push(...(result.diagnostics || []).slice(knownDiagnostics));
    // Una sola regla para tarjeta, cálculo y generación. Va después de la reserva
    // legada, que solo se aplica a toldos válidos: un toldo incompleto muestra
    // la misma reserva que tendrá al completarlo, y el error basta para
    // bloquear la generación de archivos.
    const missingFields = getMissingFields(awning, order);
    if (missingFields.length) {
      // El "X incompleto en OF …" de la regla del modelo dice lo mismo con otras
      // palabras: se queda solo esta lista, que es la que enseña la tarjeta.
      for (let i = diagnostics.length - 1; i >= 0; i -= 1) {
        if (diagnostics[i].awningId === awning.id && / incompleto en OF /.test(diagnostics[i].message || '')) diagnostics.splice(i, 1);
      }
      diagnostics.push({
        level: 'error',
        awningId: awning.id,
        awningIndex,
        missingFields,
        message: `Toldo ${awningLetter(awningIndex)} (${awning.model}, OF ${awning.of}): falta ${describeMissing(missingFields)}.`
      });
      result = { ...result, calculation: { ...result.calculation, valid: false, missingFields } };
    }
    ofs.push({
      awningId: awning.id,
      awningIndex,
      of: result.of,
      description: result.description || buildAwningDescription(awning),
      materials: result.materials || [],
      despiece: result.despiece || null,
      structureEditor: result.structureEditor,
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
