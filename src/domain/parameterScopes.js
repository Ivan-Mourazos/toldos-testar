/**
 * Versiones por modelo de los parámetros de toldos (Iván, 02/10/2026). Un «ámbito» es un modelo de
 * Parámetros (su apartado, su margen de caída si es un trabajo de tela y sus dibujos) o lo común de
 * los trabajos de tela (lo que comparten Cambio de tela, Enrollable, Bambalina y Cambio Antica).
 * Cada ámbito se guarda con su versión e historial; los valores siguen en un solo RuleParameters.
 */
import { modelNames } from './modelBehavior.js';
import { normalizeModelName } from './modelNames.js';
import { normalizeRuleParameters, sameParameterValue } from './ruleParameters.js';

export const COMMON_FABRIC_SCOPE = 'TRABAJOS DE TELA';
export const fabricJobScopes = ['CAMBIO TELA', 'ENROLLABLE', 'BAMBALINA', 'CAMBIO ANTICA'];
export const parameterScopes = [...modelNames, COMMON_FABRIC_SCOPE];

const sectionByScope = {
  'ARZUA PRO': 'arzuaPro', GALICIA: 'galicia', 'PERLA BOX': 'perlaBox', 'CORAL BOX': 'coralBox', 'CUARZO BOX': 'cuarzoBox',
  CORTINA: 'cortina', SELENA: 'selena', 'CAMBIO CORTINA': 'cambioCortina', XACOBEO: 'xacobeo', 'PUNTO RECTO': 'puntoRecto',
  'MONOBLOCK 350': 'monoblock350', MAXISCREEM: 'maxiscreem', ELECTRA: 'electra', 'AMBAR BOX': 'ambarBox', 'AGATA BOX': 'agataBox'
};

export const isParameterScope = (scope) => parameterScopes.includes(scope);

/** Lo que enseña la ficha de un modelo: el modelo y, en los trabajos de tela, lo común. */
export function pageScopes(model) {
  const code = normalizeModelName(model);
  return fabricJobScopes.includes(code) ? [code, COMMON_FABRIC_SCOPE] : [code];
}

/** Lo que es de un ámbito: sus valores y sus dibujos. */
export function scopeParts(parameters, scope) {
  const p = parameters || normalizeRuleParameters();
  if (scope === COMMON_FABRIC_SCOPE) {
    const common = { ...p.fabricJobs };
    delete common.dropAllowanceByModel;
    return { values: common, drawings: [] };
  }
  const section = sectionByScope[scope];
  const values = section ? p[section] : fabricJobScopes.includes(scope) ? p.fabricJobs.dropAllowanceByModel[scope] : null;
  return { values: values ?? null, drawings: p.drawings.byModel[scope] ?? [] };
}

/** `target` con lo del ámbito `scope` tomado de `source` (sin sus dibujos si `includeDrawings` es false). */
export function applyScope(target, source, scope, { includeDrawings = true } = {}) {
  const next = { ...target };
  if (scope === COMMON_FABRIC_SCOPE) {
    next.fabricJobs = { ...source.fabricJobs, dropAllowanceByModel: target.fabricJobs.dropAllowanceByModel };
    return next;
  }
  const section = sectionByScope[scope];
  if (section) next[section] = source[section];
  else if (fabricJobScopes.includes(scope)) {
    next.fabricJobs = {
      ...target.fabricJobs,
      dropAllowanceByModel: { ...target.fabricJobs.dropAllowanceByModel, [scope]: source.fabricJobs.dropAllowanceByModel[scope] }
    };
  }
  if (includeDrawings) {
    const byModel = { ...target.drawings.byModel };
    const drawings = source.drawings.byModel[scope];
    if (drawings?.length) byModel[scope] = drawings;
    else delete byModel[scope];
    next.drawings = { byModel };
  }
  return next;
}

/** Los ámbitos que cambian entre dos juegos de parámetros (también dibujos de un modelo que ya no está). */
export function changedScopes(before, after) {
  const a = before || normalizeRuleParameters();
  const b = after || normalizeRuleParameters();
  const extra = [...Object.keys(a.drawings.byModel), ...Object.keys(b.drawings.byModel)].filter((scope) => !isParameterScope(scope));
  return [...parameterScopes, ...new Set(extra)].filter((scope) => !sameParameterValue(scopeParts(a, scope), scopeParts(b, scope)));
}

/** Las secciones del fichero donde vive un ámbito (para `changedSections`, que leía la web de antes). */
export function scopeSections(scope) {
  if (scope === COMMON_FABRIC_SCOPE || fabricJobScopes.includes(scope)) return ['fabricJobs', 'drawings'];
  return sectionByScope[scope] ? [sectionByScope[scope], 'drawings'] : ['drawings'];
}

/**
 * El borrador sobre unos valores guardados nuevos: lo que estaba pendiente de cada ámbito (frente a
 * lo guardado antes) se conserva; lo demás es lo guardado nuevo. Null si no queda nada pendiente.
 */
export function rebaseDraft(previousShared, nextShared, draft) {
  if (!draft) return null;
  const next = changedScopes(previousShared, draft).reduce((acc, scope) => applyScope(acc, draft, scope), nextShared);
  return changedScopes(nextShared, next).length ? next : null;
}
