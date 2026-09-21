import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRuleParametersStore } from './ruleParametersStore.js';
import { normalizeRuleParameters } from './domain/ruleParameters.js';

const technicians = ['IVÁN', 'ADRIÁN'];
let dir;
let store;
const file = () => path.join(dir, 'rule-parameters.json');
const cortinaA50 = () => normalizeRuleParameters({ cortina: { fabricDropAllowanceCm: 50 } });

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'rule-parameters-'));
  store = createRuleParametersStore({ file: file(), historyFile: path.join(dir, 'rule-parameters-history.jsonl'), technicians });
});

describe('almacén de parámetros comunes', () => {
  it('sin fichero son los del código, versión 0', async () => {
    expect(await store.get()).toEqual({ version: 0, updatedAt: '', updatedBy: '', reason: '', parameters: normalizeRuleParameters() });
  });

  it('guarda una versión nueva con solo las secciones cambiadas', async () => {
    const saved = await store.save({ baseVersion: 0, parameters: cortinaA50(), updatedBy: 'IVÁN', reason: 'Prueba' });
    expect(saved.version).toBe(1);
    expect(saved.parameters.cortina.fabricDropAllowanceCm).toBe(50);
    const onDisk = JSON.parse(await readFile(file(), 'utf8'));
    expect(Object.keys(onDisk.overrides)).toEqual(['cortina']);
    expect((await store.get()).parameters.cortina.fabricDropAllowanceCm).toBe(50);
  });

  it('rechaza guardar sobre una versión que ya no es la vigente', async () => {
    await store.save({ baseVersion: 0, parameters: cortinaA50(), updatedBy: 'IVÁN', reason: 'Primero' });
    const before = await readFile(file(), 'utf8');
    await expect(store.save({ baseVersion: 0, parameters: normalizeRuleParameters(), updatedBy: 'ADRIÁN', reason: 'Segundo' }))
      .rejects.toMatchObject({ code: 'VERSION_CONFLICT', current: { version: 1 } });
    expect(await readFile(file(), 'utf8')).toBe(before);
  });

  it('exige un técnico de la lista y un motivo', async () => {
    await expect(store.save({ baseVersion: 0, parameters: cortinaA50(), updatedBy: 'NADIE', reason: 'x' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(store.save({ baseVersion: 0, parameters: cortinaA50(), updatedBy: 'IVÁN', reason: '  ' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('guardar lo mismo no crea versión', async () => {
    await store.save({ baseVersion: 0, parameters: cortinaA50(), updatedBy: 'IVÁN', reason: 'Primero' });
    const again = await store.save({ baseVersion: 1, parameters: cortinaA50(), updatedBy: 'IVÁN', reason: 'Otra vez' });
    expect(again.version).toBe(1);
    expect(await store.history()).toHaveLength(1);
  });

  it('el historial permite volver a una versión anterior, que queda como una nueva', async () => {
    await store.save({ baseVersion: 0, parameters: cortinaA50(), updatedBy: 'IVÁN', reason: 'Cortina a 50' });
    await store.save({ baseVersion: 1, parameters: normalizeRuleParameters({ cortina: { fabricDropAllowanceCm: 55 } }), updatedBy: 'ADRIÁN', reason: 'Cortina a 55' });
    const history = await store.history();
    expect(history.map((entry) => entry.version)).toEqual([2, 1]);
    expect(history[0]).toMatchObject({ updatedBy: 'ADRIÁN', reason: 'Cortina a 55', changedSections: ['cortina'] });
    const restored = await store.save({ baseVersion: 2, parameters: normalizeRuleParameters(history[1].overrides), updatedBy: 'IVÁN', reason: 'Volver a 50' });
    expect(restored.version).toBe(3);
    expect(restored.parameters.cortina.fabricDropAllowanceCm).toBe(50);
  });

  it('dos guardados a la vez sobre la misma versión: uno gana y el otro recibe el conflicto', async () => {
    const results = await Promise.allSettled([
      store.save({ baseVersion: 0, parameters: cortinaA50(), updatedBy: 'IVÁN', reason: 'A' }),
      store.save({ baseVersion: 0, parameters: normalizeRuleParameters({ cortina: { fabricDropAllowanceCm: 55 } }), updatedBy: 'ADRIÁN', reason: 'B' })
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
    expect((await store.get()).version).toBe(1);
  });
});
