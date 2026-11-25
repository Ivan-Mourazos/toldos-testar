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
  // Con soportes Galicia es el modelo GALICIA, aunque en RPS se venda como ARZUA.
  if (model === 'ARZUA PRO') return tubeLoads.map((tubeLoad) => ({ tubeLoad, armCount: 2, supportSystem: 'ARZUA' }));
  if (model === 'GALICIA') return tubeLoads.map((tubeLoad) => ({ tubeLoad, armCount: 3 }));
  // Monoblock llega a 12 m: sin frentes grandes no saldrían el currón ni los empalmes.
  if (model === 'MONOBLOCK 350') {
    return tubeLoads.flatMap((tubeLoad) => [2, 3, 4].flatMap((armCount) => ['FRONTAL', 'TECHO'].map((placement) => ({
      tubeLoad, armCount, placement, widths: [320, 450, 580, 700, 800, 900, 1100]
    }))));
  }
  if (model === 'ANTICA') return anticaVariants.map((anticaVariant) => ({ anticaVariant, anticaSupportHeight: 40 }));
  if (model === 'HERA') {
    // Con el rollo de 120 de la tela de muestra, un frente mayor exige empate.
    // Blanco y negro, y los dos remates de abajo con piezas (perfil de contrapeso o pletina).
    return ['NINGUNO', 'VERTICAL'].flatMap((heraJoin) => ['BLANCO', 'NEGRO'].flatMap((heraChainColor) => ['VARILLA BLANCA', 'PLETINA'].map((heraBottomFinish) => ({
      heraJoin, heraTopFinish: 'VARILLA PLANA', heraBottomFinish, heraInteriorFace: 'DERECHO', heraChainColor, height: 250
    }))));
  }
  if (model === 'ELECTRA') {
    const motor = device === 'MOTOR' ? { motorPower: electraMotors[0].value } : {};
    // Todos los soportes y con ventana: sin ellos el barrido daba por no reservados el
    // soporte universal, sus mosquetones y el cristal.
    const withWindow = { curtainHasWindow: true, curtainFinish: 'NORMAL', curtainWindowExit: 150, curtainWindowCorner: 30, curtainWindowFloorHeight: 40, curtainWindowHeight: 100 };
    return ['SOPORTE ELIT VERTICAL', 'SOPORTES ALMAGRO', 'UNIVERSAL 3 AGUJEROS', 'SOPORTE MAXISCREEN', 'SOPORTE MAXISCREEM BOX']
      .flatMap((electraSupport) => [noWindow, withWindow].map((window) => ({ electraSupport, ...window, ...motor })));
  }
  // Las tres guías y las dos formas de cofre: cada una reserva perfiles distintos.
  if (model === 'IRIS') {
    return ['ESTÁNDAR', 'PEQUEÑA', 'COMPENSADORA'].flatMap((irisGuideType) => ['REDONDO', 'CUADRADO'].map((irisBoxShape) => ({
      irisGuideType, irisBoxShape, irisGuideFixing: 'PARED', irisAssumeSquare: true, ...noWindow
    })));
  }
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

// Todas las salidas establecidas: el brazo cambia de código con cada una, y
// probar solo los extremos dejó fuera el Onyx negro de 250 de Perla Box.
function projectionsOf(model) {
  const established = getEstablishedProjections(model);
  return established && established.length ? established : [150, 250];
}

function calculate(awning, structureColor) {
  try {
    return calculateOrder({ orderCode: 'MUESTRA', sameFabric: true, fabric: SAMPLE_FABRIC, structureColor, awnings: [awning] });
  } catch {
    return null;
  }
}

function* generateSamples(model, structureColor) {
  for (const submodel of submodelsOf(model)) {
    for (const device of devicesOf(model)) {
      for (const extra of modelExtras(model, device)) {
        for (const projection of projectionsOf(model)) {
          for (const width of extra.widths || WIDTHS) {
            const fields = { ...extra };
            delete fields.widths;
            const awning = {
              ...common, ...fields, id: 'a', of: '0000000', model, submodel, device,
              width, projection, structureColor, irisFrontTop: width, irisExitLeft: projection
            };
            const result = calculate(awning, structureColor);
            const block = result?.ofs[0];
            if (block?.calculation?.valid && block.materials.length) yield { awning, result };
          }
        }
      }
    }
  }
}

// Los barridos de RPS recorren decenas de lacados por modelo.
// Conservamos las consultas recientes para no acumular todo el catálogo en memoria.
const MAX_CACHED_QUERIES = 32;
const sampleCache = new Map();

/**
 * Casos válidos de un modelo con el lacado indicado, en el orden del catálogo.
 * Con un límite se guarda el punto del barrido para poder continuarlo más tarde.
 * Cada consulta devuelve copias del toldo y del resultado de calculateOrder.
 * @returns {Array<{ awning: object, result: ReturnType<typeof calculateOrder> }>}
 */
export function sampleAwnings(model, structureColor = 'BLANCO', { limit = Infinity } = {}) {
  const key = JSON.stringify([model, structureColor]);
  const cached = sampleCache.get(key) ?? { samples: [], remaining: generateSamples(model, structureColor) };
  sampleCache.delete(key);
  sampleCache.set(key, cached);
  if (sampleCache.size > MAX_CACHED_QUERIES) sampleCache.delete(sampleCache.keys().next().value);
  while (cached.remaining && cached.samples.length < limit) {
    const { value, done } = cached.remaining.next();
    if (done) cached.remaining = null;
    else cached.samples.push(value);
  }
  return structuredClone(cached.samples.slice(0, limit));
}

/** Primer caso válido que cumple el filtro, si se indica uno. */
export function firstSampleAwning(model, matches, structureColor = 'BLANCO') {
  if (!matches) return sampleAwnings(model, structureColor, { limit: 1 })[0];
  for (const sample of generateSamples(model, structureColor)) {
    if (matches(sample)) return sample;
  }
}

export { fullAwningModelNames };
