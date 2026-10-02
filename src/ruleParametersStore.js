/**
 * Parámetros de cálculo de toldos, comunes a todos los puestos (docs/superpowers/specs/2026-09-21-
 * parametros-comunes-design.md). Desde el 02/10/2026 cada modelo tiene su versión e historial
 * (docs/superpowers/specs/2026-10-02-dibujos-y-versiones-por-modelo-design.md): guardar un modelo no
 * choca con quien guarda otro; quién es obligatorio y el motivo, opcional; el historial dice solo qué
 * cambió.
 *
 * El fichero guarda solo lo que difiere del código (`overrides`, como siempre), la versión de todo el
 * fichero (sigue subiendo, para que la web de antes lo lea si hubiera que volver a ella) y la de cada
 * modelo (`modelos`). El de antes (sin `modelos`) se lee tal cual: la versión de cada modelo sale de su
 * historial, que se reparte por modelo al leerlo. Nada se reescribe al leer: el primer guardado escribe
 * ya el formato nuevo, de una vez (writeFileAtomic). Un fichero que no se puede leer no se sobrescribe.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { scopeChangeSummary } from './domain/parameterChanges.js';
import { scopeHistory, scopeVersions } from './domain/parameterHistory.js';
import { applyScope, changedScopes, isParameterScope, scopeSections } from './domain/parameterScopes.js';
import { changedRuleSections, normalizeRuleParameters, ruleParameterOverrides } from './domain/ruleParameters.js';
import { writeFileAtomic } from './workflow.js';

const FORMAT = 2;
const UNREADABLE_MESSAGE = 'Los parámetros guardados no se pueden leer: revisa el fichero antes de guardar.';
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value) => (typeof value === 'string' ? value : '');

function storeError(code, message, extra = {}) {
  return Object.assign(new Error(message), { code, ...extra });
}

function cleanVersions(input) {
  const versions = {};
  for (const [scope, value] of Object.entries(input)) {
    if (!isObject(value) || !Number.isInteger(value.version) || value.version < 0) continue;
    versions[scope] = { version: value.version, updatedAt: text(value.updatedAt), updatedBy: text(value.updatedBy), motivo: text(value.motivo) };
  }
  return versions;
}

const publicState = ({ version, updatedAt, updatedBy, reason, parameters, modelos }) => ({ version, updatedAt, updatedBy, reason, parameters, modelos });

export function createRuleParametersStore({ file, historyFile, technicians }) {
  let cached = null;
  let warned = false;
  // Una sola escritura a la vez: dos guardados del mismo modelo no se pisan; el segundo encuentra la
  // versión nueva y recibe el 409. Dos de modelos distintos entran uno tras otro.
  let queue = Promise.resolve();
  const inQueue = (task) => {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  };

  async function readLines() {
    let content = '';
    try {
      content = await fs.readFile(historyFile, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return content.split('\n').filter(Boolean).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null; // un renglón a medias no tapa el resto
      }
    });
  }

  async function readCurrent() {
    if (cached) return cached;
    let stored = null;
    try {
      stored = JSON.parse(await fs.readFile(file, 'utf8'));
      if (!isObject(stored)) throw new Error('no tiene la forma esperada');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        if (!warned) console.error(`No se pudieron leer los parámetros comunes (${file}):`, error.message);
        warned = true;
        // Se calcula con los del código, pero no se guarda en memoria: en cuanto se arregle el fichero, se lee.
        return { version: 0, updatedAt: '', updatedBy: '', reason: '', parameters: normalizeRuleParameters(), modelos: {}, unreadable: true };
      }
      stored = null;
    }
    const modelos = stored?.formato === FORMAT && isObject(stored.modelos)
      ? cleanVersions(stored.modelos)
      : scopeVersions(await readLines());
    cached = {
      version: Number(stored?.version) || 0,
      updatedAt: text(stored?.updatedAt),
      updatedBy: text(stored?.updatedBy),
      reason: text(stored?.reason),
      parameters: normalizeRuleParameters(stored?.overrides),
      modelos
    };
    return cached;
  }

  async function get() {
    const current = await readCurrent();
    return current.unreadable ? { ...publicState(current), ilegible: true } : publicState(current);
  }

  function author(updatedBy) {
    const by = String(updatedBy || '').trim().toUpperCase();
    if (!technicians.includes(by)) throw storeError('INVALID_INPUT', 'Elige quién hace el cambio («Soy»).');
    return by;
  }
  const reasonOf = (value) => (typeof value === 'string' ? value.trim() : '');

  /** Guarda lo del ámbito `scope` de `parameters` sobre lo vigente, con su versión siguiente y su renglón. */
  async function writeScope(current, { scope, parameters, by, why }) {
    const next = applyScope(current.parameters, normalizeRuleParameters(parameters), scope);
    if (!changedScopes(current.parameters, next).length) return current;
    const when = new Date().toISOString();
    const versionAmbito = (current.modelos[scope]?.version ?? 0) + 1;
    const version = current.version + 1;
    const modelos = { ...current.modelos, [scope]: { version: versionAmbito, updatedAt: when, updatedBy: by, motivo: why } };
    const overrides = ruleParameterOverrides(next);
    const changedSections = changedRuleSections(current.parameters, next).filter((section) => scopeSections(scope).includes(section));
    const resumen = scopeChangeSummary(current.parameters, next, scope);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await writeFileAtomic(file, `${JSON.stringify({ formato: FORMAT, version, updatedAt: when, updatedBy: by, reason: why, modelos, overrides }, null, 2)}\n`);
    await fs.mkdir(path.dirname(historyFile), { recursive: true });
    // `reason` y `changedSections` son los que leía el historial de la web de antes.
    await fs.appendFile(historyFile, `${JSON.stringify({ ambito: scope, versionAmbito, version, updatedAt: when, updatedBy: by, motivo: why, resumen, reason: why, changedSections, overrides })}\n`);
    cached = { version, updatedAt: when, updatedBy: by, reason: why, parameters: next, modelos };
    return cached;
  }

  async function saveScope({ scope, baseVersion, parameters, updatedBy, motivo } = {}) {
    const by = author(updatedBy);
    if (!isParameterScope(scope)) throw storeError('INVALID_INPUT', 'Ese modelo no tiene parámetros.');
    if (!Number.isInteger(baseVersion) || baseVersion < 0) throw storeError('INVALID_INPUT', 'Indica la versión del modelo que estás editando.');
    const current = await readCurrent();
    if (current.unreadable) throw storeError('UNREADABLE', UNREADABLE_MESSAGE);
    if ((current.modelos[scope]?.version ?? 0) !== baseVersion) {
      throw storeError('VERSION_CONFLICT', 'Otro puesto guardó este modelo antes.', { current: publicState(current) });
    }
    return publicState(await writeScope(current, { scope, parameters, by, why: reasonOf(motivo) }));
  }

  // La ruta de antes (una pestaña abierta con la web anterior): versión de todo el fichero y, si vale,
  // cada modelo cambiado se guarda con su renglón.
  async function saveAll({ baseVersion, parameters, updatedBy, reason } = {}) {
    const by = author(updatedBy);
    let current = await readCurrent();
    if (current.unreadable) throw storeError('UNREADABLE', UNREADABLE_MESSAGE);
    if (Number(baseVersion) !== current.version) {
      throw storeError('VERSION_CONFLICT', 'Otro puesto guardó cambios antes.', { current: publicState(current) });
    }
    const next = normalizeRuleParameters(parameters);
    for (const scope of changedScopes(current.parameters, next)) {
      current = await writeScope(current, { scope, parameters: next, by, why: reasonOf(reason) });
    }
    return publicState(current);
  }

  async function history(limit = 20, { scope = '' } = {}) {
    const lines = await readLines();
    if (scope) return scopeHistory(lines, scope, limit);
    return lines.filter(isObject).reverse().slice(0, limit);
  }

  return {
    get,
    save: (input) => inQueue(() => saveAll(input)),
    saveScope: (input) => inQueue(() => saveScope(input)),
    history
  };
}
