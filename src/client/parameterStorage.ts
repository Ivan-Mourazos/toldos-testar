/**
 * Parámetros de cálculo guardados en el navegador.
 *
 * Hasta el 21/09/2026 la web los escribía enteros en localStorage al arrancar,
 * así que cada puesto se quedaba congelado con los valores de fábrica del día
 * en que lo abrió por primera vez: las correcciones posteriores del código no
 * llegaban nunca. Los dos puestos de OT seguían en septiembre con los de julio
 * (Cambio Antica con 25 cm de caída en vez de 65; Cambio de cortina sin
 * costuras). Ahora solo se guardan las secciones que el usuario cambia, y el
 * resto sigue siempre al código. Los parámetros comunes a todos los puestos
 * son la fase 3 de docs/auditoria-2026-09-21.md.
 */
import type { RuleParameters } from './types';
import { normalizeArzuaProParameters } from '../domain/arzuaProParameters.js';
import { normalizeGaliciaParameters } from '../domain/galiciaParameters.js';
import { normalizeCoralBoxParameters, normalizePerlaBoxParameters } from '../domain/storbox400Parameters.js';
import { normalizeCortinaParameters } from '../domain/cortinaParameters.js';
import { normalizeSelenaParameters } from '../domain/selenaParameters.js';
import { normalizeCambioCortinaParameters } from '../domain/cambioCortinaParameters.js';
import { normalizeCuarzoBoxParameters } from '../domain/storbox250Parameters.js';
import { normalizeXacobeoParameters } from '../domain/xacobeoParameters.js';
import { normalizePuntoRectoParameters } from '../domain/puntoRectoParameters.js';
import { normalizeMonoblock350Parameters } from '../domain/monoblock350Parameters.js';
import { normalizeMaxiscreemParameters } from '../domain/maxiscreemParameters.js';
import { normalizeElectraParameters } from '../domain/electraParameters.js';
import { normalizeAmbarBoxParameters } from '../domain/ambarBoxParameters.js';
import { normalizeAgataBoxParameters } from '../domain/agataBoxParameters.js';
import { normalizeFabricJobParameters } from '../domain/fabricJobParameters.js';
import { normalizeDrawingParameters } from '../domain/drawingParameters.js';

export const PARAMETERS_STORAGE_KEY = 'toldos-testar-parameters-v3';
// v2 guardaba todo, también los valores de fábrica: de ella solo se rescata la
// biblioteca de dibujos, que sí es trabajo del usuario.
const LEGACY_STORAGE_KEY = 'toldos-testar-parameters-v2';

type Saved = (Partial<RuleParameters> & { storbox400?: RuleParameters['perlaBox'] }) | null | undefined;
type ReadableStorage = { getItem: (key: string) => string | null };

// Valores del código, con las secciones de `saved` que haya.
export function defaultRuleParameters(saved?: Saved): RuleParameters {
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
  } as RuleParameters;
}

function readJson(storage: ReadableStorage, key: string): Saved {
  try {
    return JSON.parse(storage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

export function readStoredParameters(storage: ReadableStorage): RuleParameters {
  const current = readJson(storage, PARAMETERS_STORAGE_KEY);
  if (current) return defaultRuleParameters(current);
  const legacy = readJson(storage, LEGACY_STORAGE_KEY);
  return defaultRuleParameters({ drawings: legacy?.drawings });
}

// Solo las secciones que difieren del código: las demás seguirán a sus
// correcciones futuras.
export function serializeParameterOverrides(parameters: RuleParameters): string {
  const defaults = defaultRuleParameters();
  const overrides: Partial<RuleParameters> = {};
  for (const key of Object.keys(defaults) as (keyof RuleParameters)[]) {
    if (JSON.stringify(parameters[key]) !== JSON.stringify(defaults[key])) {
      (overrides as Record<string, unknown>)[key] = parameters[key];
    }
  }
  return JSON.stringify(overrides);
}
