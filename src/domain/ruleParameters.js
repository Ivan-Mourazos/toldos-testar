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

// Solo las secciones que difieren del código.
export function ruleParameterOverrides(parameters) {
  const defaults = normalizeRuleParameters();
  const overrides = {};
  for (const key of Object.keys(defaults)) {
    if (JSON.stringify(parameters?.[key]) !== JSON.stringify(defaults[key])) overrides[key] = parameters[key];
  }
  return overrides;
}

export function changedRuleSections(before, after) {
  return Object.keys(normalizeRuleParameters())
    .filter((key) => JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]));
}
