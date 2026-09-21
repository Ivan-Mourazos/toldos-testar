/**
 * Parámetros de cálculo comunes a todos los puestos, guardados en el servidor
 * con versión e historial (docs/superpowers/specs/2026-09-21-parametros-
 * comunes-design.md). El fichero guarda solo lo que difiere del código; el
 * historial, una línea por cambio con los valores completos tras el cambio,
 * para poder volver a cualquier versión.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { changedRuleSections, normalizeRuleParameters, ruleParameterOverrides } from './domain/ruleParameters.js';
import { writeFileAtomic } from './workflow.js';

function storeError(code, message, extra = {}) {
  return Object.assign(new Error(message), { code, ...extra });
}

export function createRuleParametersStore({ file, historyFile, technicians }) {
  let cached = null;
  // Una sola escritura a la vez: dos guardados simultáneos sobre la misma
  // versión no pueden pisarse; el segundo encuentra la versión nueva.
  let queue = Promise.resolve();

  async function readCurrent() {
    if (cached) return cached;
    try {
      const stored = JSON.parse(await fs.readFile(file, 'utf8'));
      cached = {
        version: Number(stored.version) || 0,
        updatedAt: String(stored.updatedAt || ''),
        updatedBy: String(stored.updatedBy || ''),
        reason: String(stored.reason || ''),
        parameters: normalizeRuleParameters(stored.overrides)
      };
    } catch (error) {
      if (error.code !== 'ENOENT') console.error('No se pudieron leer los parámetros comunes:', error.message);
      cached = { version: 0, updatedAt: '', updatedBy: '', reason: '', parameters: normalizeRuleParameters() };
    }
    return cached;
  }

  async function get() {
    return readCurrent();
  }

  async function write({ baseVersion, parameters, updatedBy, reason }) {
    const by = String(updatedBy || '').trim().toUpperCase();
    const why = String(reason || '').trim();
    if (!technicians.includes(by)) throw storeError('INVALID_INPUT', 'Elige quién hace el cambio.');
    if (!why) throw storeError('INVALID_INPUT', 'Indica el motivo del cambio.');

    const current = await readCurrent();
    if (Number(baseVersion) !== current.version) {
      throw storeError('VERSION_CONFLICT', 'Otro puesto guardó cambios antes.', { current });
    }
    const next = normalizeRuleParameters(parameters);
    const changedSections = changedRuleSections(current.parameters, next);
    if (!changedSections.length) return current;

    const overrides = ruleParameterOverrides(next);
    const saved = { version: current.version + 1, updatedAt: new Date().toISOString(), updatedBy: by, reason: why };
    await fs.mkdir(path.dirname(file), { recursive: true });
    await writeFileAtomic(file, `${JSON.stringify({ ...saved, overrides }, null, 2)}\n`);
    await fs.appendFile(historyFile, `${JSON.stringify({ ...saved, changedSections, overrides })}\n`);
    cached = { ...saved, parameters: next };
    return cached;
  }

  function save(input) {
    const result = queue.then(() => write(input));
    queue = result.catch(() => {});
    return result;
  }

  async function history(limit = 20) {
    let text = '';
    try {
      text = await fs.readFile(historyFile, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    return text.split('\n').filter(Boolean).map((line) => JSON.parse(line)).reverse().slice(0, limit);
  }

  return { get, save, history };
}
