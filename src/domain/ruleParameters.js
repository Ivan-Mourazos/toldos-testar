/**
 * Parámetros de cálculo comunes a servidor y navegador. Lo que se guarda son
 * solo las secciones que difieren del código, para que las correcciones del
 * código sigan llegando a todo lo que nadie ha cambiado (docs/superpowers/
 * specs/2026-09-21-parametros-comunes-design.md).
 */
import { normalizeArzuaProParameters } from './arzuaProParameters.js';
import { normalizeGaliciaParameters } from './galiciaParameters.js';
import { normalizeCoralBoxParameters, normalizePerlaBoxParameters } from './storbox400Parameters.js';
import { normalizeCortinaParameters } from './cortinaParameters.js';
import { normalizeSelenaParameters } from './selenaParameters.js';
import { normalizeCambioCortinaParameters } from './cambioCortinaParameters.js';
import { normalizeCuarzoBoxParameters } from './storbox250Parameters.js';
import { normalizeXacobeoParameters } from './xacobeoParameters.js';
import { normalizePuntoRectoParameters } from './puntoRectoParameters.js';
import { normalizeMonoblock350Parameters } from './monoblock350Parameters.js';
import { normalizeMaxiscreemParameters } from './maxiscreemParameters.js';
import { normalizeElectraParameters } from './electraParameters.js';
import { normalizeAmbarBoxParameters } from './ambarBoxParameters.js';
import { normalizeAgataBoxParameters } from './agataBoxParameters.js';
import { normalizeFabricJobParameters } from './fabricJobParameters.js';
import { normalizeDrawingParameters } from './drawingParameters.js';

// Valores del código, con las secciones de `saved` que haya.
export function normalizeRuleParameters(saved) {
  return {
    arzuaPro: normalizeArzuaProParameters(saved?.arzuaPro),
    galicia: normalizeGaliciaParameters(saved?.galicia),
    perlaBox: normalizePerlaBoxParameters(saved?.perlaBox || saved?.storbox400),
    coralBox: normalizeCoralBoxParameters(saved?.coralBox),
    cuarzoBox: normalizeCuarzoBoxParameters(saved?.cuarzoBox),
    cortina: normalizeCortinaParameters(saved?.cortina),
    selena: normalizeSelenaParameters(saved?.selena),
    cambioCortina: normalizeCambioCortinaParameters(saved?.cambioCortina),
    xacobeo: normalizeXacobeoParameters(saved?.xacobeo),
    puntoRecto: normalizePuntoRectoParameters(saved?.puntoRecto),
    monoblock350: normalizeMonoblock350Parameters(saved?.monoblock350),
    maxiscreem: normalizeMaxiscreemParameters(saved?.maxiscreem),
    electra: normalizeElectraParameters(saved?.electra),
    ambarBox: normalizeAmbarBoxParameters(saved?.ambarBox),
    agataBox: normalizeAgataBoxParameters(saved?.agataBox),
    fabricJobs: normalizeFabricJobParameters(saved?.fabricJobs),
    drawings: normalizeDrawingParameters(saved?.drawings)
  };
}

// Compara sin depender del orden de las claves: la tabla de frentes mínimos de
// Galicia sale con las claves en otro orden al normalizarla dos veces, y una
// comparación por texto la daba por cambiada sin que cambiara ningún valor.
function sameValue(left, right) {
  return stableJson(left) === stableJson(right);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// Solo las secciones que difieren del código.
export function ruleParameterOverrides(parameters) {
  const defaults = normalizeRuleParameters();
  const overrides = {};
  for (const key of Object.keys(defaults)) {
    if (!sameValue(parameters?.[key], defaults[key])) overrides[key] = parameters[key];
  }
  return overrides;
}

export function changedRuleSections(before, after) {
  return Object.keys(normalizeRuleParameters())
    .filter((key) => !sameValue(before?.[key], after?.[key]));
}
