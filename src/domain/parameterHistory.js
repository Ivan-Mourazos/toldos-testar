/**
 * Historial de cada modelo (Iván, 02/10/2026: «versiones por modelo»). El fichero guarda un renglón
 * por guardado, siempre con todos los valores tras el cambio (`overrides`). Los de ahora traen su
 * modelo (`ambito`), su versión y su resumen; los de antes (una versión para todos) se reparten al
 * leerlos, comparando cada uno con el anterior: así no se pierde nada de lo ya guardado.
 */
import { scopeChangeSummary } from './parameterChanges.js';
import { changedScopes } from './parameterScopes.js';
import { normalizeRuleParameters } from './ruleParameters.js';

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value) => (typeof value === 'string' ? value : '');

function walk(lines) {
  const counters = {};
  const entries = [];
  let previous = normalizeRuleParameters();
  for (const line of lines) {
    if (!isObject(line) || !isObject(line.overrides)) continue;
    const current = normalizeRuleParameters(line.overrides);
    const common = { version: Number(line.version) || 0, updatedAt: text(line.updatedAt), updatedBy: text(line.updatedBy), overrides: line.overrides };
    if (typeof line.ambito === 'string' && line.ambito) {
      const scope = line.ambito;
      counters[scope] = Number.isInteger(line.versionAmbito) ? line.versionAmbito : (counters[scope] ?? 0) + 1;
      const resumen = Array.isArray(line.resumen) ? line.resumen.filter((item) => typeof item === 'string') : scopeChangeSummary(previous, current, scope);
      entries.push({ ambito: scope, versionAmbito: counters[scope], ...common, motivo: text(line.motivo), resumen });
    } else {
      for (const scope of changedScopes(previous, current)) {
        counters[scope] = (counters[scope] ?? 0) + 1;
        entries.push({ ambito: scope, versionAmbito: counters[scope], ...common, motivo: text(line.reason), resumen: scopeChangeSummary(previous, current, scope), anterior: true });
      }
    }
    previous = current;
  }
  return entries;
}

/** Las entradas del ámbito `scope`, de la más nueva a la más vieja (como mucho `limit`). */
export function scopeHistory(lines, scope, limit = Infinity) {
  return walk(lines).filter((entry) => entry.ambito === scope).reverse().slice(0, limit);
}

/** La versión de cada ámbito según el historial, con quién, cuándo y el motivo de la última. */
export function scopeVersions(lines) {
  const versions = {};
  for (const entry of walk(lines)) {
    versions[entry.ambito] = { version: entry.versionAmbito, updatedAt: entry.updatedAt, updatedBy: entry.updatedBy, motivo: entry.motivo };
  }
  return versions;
}
