/**
 * Casos válidos de cada modelo de toldo completo, para las herramientas que
 * barren el catálogo (validate:reserva, validate:rps-refs).
 *
 * Un caso solo se devuelve si el cálculo lo da por válido. Medir con entradas
 * inválidas devuelve cero materiales, y la herramienta concluía en silencio
 * que el modelo no reserva nada: así se midieron Monoblock, Antica, HERA,
 * Maxiscreem e Iris hasta el 21/09/2026.
 */
import { calculateOrder } from '../../src/domain/rules.js';
import {
  formOptions, fullAwningModelNames, getEstablishedProjections, getFieldVisibility, getModelBehavior
} from '../../src/domain/modelBehavior.js';
import { anticaVariants } from '../../src/domain/anticaRules.js';
import { electraMotors } from '../../src/domain/electraParameters.js';

export const SAMPLE_FABRIC = 'ACRILI2170P120|||120|||ACR NEGRO';
// 110 cabe sin empate en el rollo de 120 de la tela de muestra (HERA lo necesita).
const WIDTHS = [110, 220, 320, 450, 580];

// Datos que el formulario exige a cada toldo aunque no cambien las piezas.
const common = {
  units: 1, valanceHeight: 0, placement: 'FRONTAL', wallType: '', sensor: 'SIN SENSOR',
  rotFabric: 'NO', rotValance: 'NO', crankHeight: 150, machineSide: 'M.F.DER', reglasModificadas: false
};
const noWindow = { curtainHasWindow: false, curtainFinish: 'NORMAL' };
const tubeLoads = ['TUBO DE CARGA EVO 80', 'TUBO DE CARGA UNIVERS 280'];

// Campos propios de cada modelo, con valores de sus listas de opciones.
function modelExtras(model, device) {
  if (model === 'ARZUA PRO') {
    // Arzúa admite soportes Galicia (SOPARTGL, 65 OF): sin ellos el barrido los daría por no reservados.
    const supports = getModelBehavior(model).supportOptions || ['ARZUA'];
    return tubeLoads.flatMap((tubeLoad) => supports.map((supportSystem) => ({ tubeLoad, armCount: 2, supportSystem })));
  }
  if (model === 'GALICIA') return tubeLoads.map((tubeLoad) => ({ tubeLoad, armCount: 3 }));
  if (model === 'ANTICA') return anticaVariants.map((anticaVariant) => ({ anticaVariant, anticaSupportHeight: 40 }));
  if (model === 'HERA') {
    // Con el rollo de 120 de la tela de muestra, un frente mayor exige empate.
    return ['NINGUNO', 'VERTICAL'].map((heraJoin) => ({
      heraJoin, heraTopFinish: 'VARILLA PLANA', heraBottomFinish: 'PLETINA', heraInteriorFace: 'DERECHO', heraChainColor: 'BLANCO', height: 250
    }));
  }
  if (model === 'ELECTRA') {
    const motor = device === 'MOTOR' ? { motorPower: electraMotors[0].value } : {};
    return ['SOPORTE ELIT VERTICAL', 'SOPORTE MAXISCREEM BOX'].map((electraSupport) => ({ electraSupport, ...noWindow, ...motor }));
  }
  if (model === 'IRIS') return [{ irisGuideType: 'ESTÁNDAR', irisGuideFixing: 'PARED', irisAssumeSquare: true, ...noWindow }];
  if (model === 'CORTINA' || model === 'SELENA') return [noWindow];
  return [{}];
}

function devicesOf(model) {
  return getFieldVisibility({ model, device: '' }).deviceOptions || formOptions.dispositivos;
}

function submodelsOf(model) {
  const options = getModelBehavior(model).submodelOptions;
  return options && options.length ? options : [''];
}

// Primera, central y última salida establecida: los cambios de tramo (tubo,
// brazos, motor) caen en los extremos.
function projectionsOf(model) {
  const established = getEstablishedProjections(model);
  if (!established || !established.length) return [150, 250];
  return [...new Set([established[0], established[Math.floor(established.length / 2)], established.at(-1)])];
}

function calculate(awning, structureColor) {
  try {
    return calculateOrder({ orderCode: 'MUESTRA', sameFabric: true, fabric: SAMPLE_FABRIC, structureColor, awnings: [awning] });
  } catch {
    return null;
  }
}

/**
 * Todos los casos válidos de un modelo con el lacado indicado. Cada uno trae
 * el toldo de entrada y el resultado de `calculateOrder`.
 */
export function sampleAwnings(model, structureColor = 'BLANCO') {
  const samples = [];
  for (const submodel of submodelsOf(model)) {
    for (const device of devicesOf(model)) {
      for (const extra of modelExtras(model, device)) {
        for (const projection of projectionsOf(model)) {
          for (const width of WIDTHS) {
            const awning = {
              ...common, ...extra, id: 'a', of: '0000000', model, submodel, device,
              width, projection, structureColor, irisFrontTop: width, irisExitLeft: projection
            };
            const result = calculate(awning, structureColor);
            const block = result?.ofs[0];
            if (block?.calculation?.valid && block.materials.length) samples.push({ awning, result });
          }
        }
      }
    }
  }
  return samples;
}

export { fullAwningModelNames };
