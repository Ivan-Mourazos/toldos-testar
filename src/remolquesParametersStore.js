/**
 * Parámetros de cálculo de remolques (recogidas, clientes con baquetón, demasías...).
 * Viven en un JSON junto a los parámetros comunes y, si
 * no existe o está roto, valen los del código (los mismos que usaba Remolques-TGM).
 * Se lee en cada petición para que un cambio a mano en el fichero se vea sin reiniciar.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { DEFAULT_PARAMS } from './remolques/calc/params.ts';
import { normalizarParams, validarParams } from './remolques/calc/validar-params.ts';
import { writeFileAtomic } from './workflow.js';

const sections = {
  lona: ['demasiaAlto', 'demasiaContornoNormal', 'demasiaContornoEnfundar', 'demasiaLonaHecha', 'ajusteContornoBase', 'ajusteContornoCurva'],
  ollaos: ['pasoOllaosDefecto', 'primerOllao'],
  recogidas: ['recogidas'],
  baqueton: ['baquetonDemasiaLargoCostura', 'baquetonDemasiaAnchoCostura', 'baquetonDemasiaCostura', 'baquetonDemasiaFinal'],
  clientesBaqueton: ['clientesBaqueton']
};
const editable = Object.values(sections).flat();
const storeError = (code, message, extra = {}) => Object.assign(new Error(message), { code, ...extra });

export function createRemolquesParametersStore({ file, historyFile = file.replace(/\.json$/i, '') + '-history.jsonl', technicians, logger = console }) {
  let queue = Promise.resolve();
  async function readCurrent() {
    let stored = {};
    try {
      stored = JSON.parse(await fs.readFile(file, 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') logger.warn(`No se pudieron leer los parámetros de remolques (${file}): ${error.message}. Se usan los del código.`);
    }
    const modern = stored?.parameters && Number.isInteger(stored.version);
    const raw = modern ? stored.parameters : stored;
    const parameters = normalizarParams(raw, { migrar: !modern });
    if (technicians) parameters.tecnicos = [...technicians];
    return { raw, snapshot: {
      version: modern ? stored.version : 0,
      updatedAt: modern ? String(stored.updatedAt || '') : '',
      updatedBy: modern ? String(stored.updatedBy || '') : '',
      reason: modern ? String(stored.reason || '') : '', parameters
    } };
  }
  async function getSnapshot() { return (await readCurrent()).snapshot; }
  async function get() { return (await getSnapshot()).parameters; }
  async function write(input) {
    const { baseVersion, parameters, updatedBy, reason } = input || {};
    const by = typeof updatedBy === 'string' ? updatedBy.trim().toUpperCase() : '';
    const why = typeof reason === 'string' ? reason.trim() : '';
    if (!(technicians || DEFAULT_PARAMS.tecnicos).includes(by)) throw storeError('INVALID_INPUT', 'Elige quién hace el cambio.');
    if (!why) throw storeError('INVALID_INPUT', 'Indica el motivo del cambio.');
    if (!Number.isInteger(baseVersion) || baseVersion < 0) throw storeError('INVALID_INPUT', 'Indica la versión que estás editando.');
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) throw storeError('INVALID_INPUT', 'Indica los parámetros del cambio.');
    const { snapshot: current, raw } = await readCurrent();
    if (baseVersion !== current.version) throw storeError('VERSION_CONFLICT', 'Otro puesto guardó cambios antes.', { current });
    const next = { ...current.parameters };
    for (const field of editable) {
      if (Object.hasOwn(parameters, field)) next[field] = parameters[field];
    }
    const validation = validarParams(next);
    if (!validation.ok) throw storeError('INVALID_INPUT', validation.errores.join('. '));
    const changedSections = Object.entries(sections).filter(([, fields]) => fields.some((field) => JSON.stringify(current.parameters[field]) !== JSON.stringify(next[field]))).map(([name]) => name);
    if (!changedSections.length) return current;
    const saved = { version: current.version + 1, updatedAt: new Date().toISOString(), updatedBy: by, reason: why, parameters: { ...raw, ...next } };
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.mkdir(path.dirname(historyFile), { recursive: true });
    await writeFileAtomic(file, `${JSON.stringify(saved, null, 2)}\n`);
    await fs.appendFile(historyFile, `${JSON.stringify({ ...saved, changedSections })}\n`);
    return { ...saved, parameters: next };
  }
  function save(input) {
    const result = queue.then(() => write(input));
    queue = result.catch(() => {});
    return result;
  }
  async function history(limit = 20) {
    try {
      const content = await fs.readFile(historyFile, 'utf8');
      return content.split('\n').filter(Boolean).map((line) => JSON.parse(line)).reverse().slice(0, limit);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw error;
    }
  }
  return { get, getSnapshot, save, history };
}
