import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createRuleParametersStore } from './ruleParametersStore.js';
import { normalizeRuleParameters, ruleParameterOverrides } from './domain/ruleParameters.js';

const technicians = ['IVÁN', 'ADRIÁN', 'ALBERTO'];
const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
let dir;
let store;
const file = () => path.join(dir, 'rule-parameters.json');
const historyFile = () => path.join(dir, 'rule-parameters-history.jsonl');
const nuevo = () => createRuleParametersStore({ file: file(), historyFile: historyFile(), technicians });
const cortina = (cm) => normalizeRuleParameters({ cortina: { fabricDropAllowanceCm: cm } });
const galicia = (cm) => normalizeRuleParameters({ galicia: { fabricDropAllowanceCm: cm } });
const conDibujo = (p, model) => ({ ...p, drawings: { byModel: { ...p.drawings.byModel, [model]: [{ id: 'general', name: 'General', usage: 'manual', enabled: true, image, conditions: [] }] } } });
const lineas = async () => (await readFile(historyFile(), 'utf8')).split('\n').filter(Boolean).map((line) => JSON.parse(line));

beforeEach(async () => {
  await mkdir(path.join(process.cwd(), 'tmp'), { recursive: true });
  dir = await mkdtemp(path.join(process.cwd(), 'tmp', 'rule-parameters-'));
  store = nuevo();
});

// Lo que hay hoy en el servidor: fichero con una versión para todos y su historial.
async function sembrarFormatoDeAntes() {
  const ov1 = ruleParameterOverrides(cortina(50));
  const ov2 = ruleParameterOverrides(conDibujo(cortina(55), 'ENROLLABLE'));
  const fichero = `${JSON.stringify({ version: 2, updatedAt: '2026-09-26T08:00:00.000Z', updatedBy: 'ALBERTO', reason: 'Dibujo y cortina', overrides: ov2 }, null, 2)}\n`;
  const historial = [
    { version: 1, updatedAt: '2026-09-25T08:00:00.000Z', updatedBy: 'IVÁN', reason: 'Cortina a 50', changedSections: ['cortina'], overrides: ov1 },
    { version: 2, updatedAt: '2026-09-26T08:00:00.000Z', updatedBy: 'ALBERTO', reason: 'Dibujo y cortina', changedSections: ['cortina', 'drawings'], overrides: ov2 }
  ].map((line) => `${JSON.stringify(line)}\n`).join('');
  await writeFile(file(), fichero);
  await writeFile(historyFile(), historial);
  store = nuevo();
  return { fichero, historial };
}

describe('parámetros de toldos: una versión por modelo', () => {
  it('sin fichero son los del código, versión 0 y ningún modelo guardado', async () => {
    expect(await store.get()).toEqual({ version: 0, updatedAt: '', updatedBy: '', reason: '', parameters: normalizeRuleParameters(), modelos: {} });
  });

  it('guardar un modelo sube su versión y la de todo el fichero; la web de antes lo sigue leyendo', async () => {
    const saved = await store.saveScope({ scope: 'CORTINA', baseVersion: 0, parameters: cortina(50), updatedBy: 'iván' });
    expect(saved.version).toBe(1);
    expect(saved.modelos).toEqual({ CORTINA: { version: 1, updatedAt: expect.any(String), updatedBy: 'IVÁN', motivo: '' } });
    const onDisk = JSON.parse(await readFile(file(), 'utf8'));
    expect(onDisk).toMatchObject({ formato: 2, version: 1, updatedBy: 'IVÁN', reason: '' });
    expect(Object.keys(onDisk.overrides)).toEqual(['cortina']);
    const [linea] = await lineas();
    expect(linea).toMatchObject({ ambito: 'CORTINA', versionAmbito: 1, version: 1, updatedBy: 'IVÁN', motivo: '', resumen: ['Margen de caída: 45 → 50'], reason: '', changedSections: ['cortina'] });
    expect(linea.overrides.cortina.fabricDropAllowanceCm).toBe(50);
  });

  it('del borrador entra solo lo del modelo que se guarda', async () => {
    const borrador = conDibujo({ ...cortina(50), galicia: galicia(60).galicia }, 'ENROLLABLE');
    const saved = await store.saveScope({ scope: 'GALICIA', baseVersion: 0, parameters: borrador, updatedBy: 'IVÁN' });
    expect(saved.parameters.galicia.fabricDropAllowanceCm).toBe(60);
    expect(saved.parameters.cortina.fabricDropAllowanceCm).toBe(45);
    expect(saved.parameters.drawings.byModel).toEqual({});
  });

  it('409 solo si otro guardó ese mismo modelo; otro modelo entra sin chocar', async () => {
    await store.saveScope({ scope: 'CORTINA', baseVersion: 0, parameters: cortina(50), updatedBy: 'IVÁN' });
    const before = await readFile(file(), 'utf8');
    await expect(store.saveScope({ scope: 'CORTINA', baseVersion: 0, parameters: cortina(55), updatedBy: 'ADRIÁN' }))
      .rejects.toMatchObject({ code: 'VERSION_CONFLICT', current: { modelos: { CORTINA: { version: 1 } } } });
    expect(await readFile(file(), 'utf8')).toBe(before);
    const otro = await store.saveScope({ scope: 'GALICIA', baseVersion: 0, parameters: galicia(60), updatedBy: 'ADRIÁN' });
    expect(otro.parameters.cortina.fabricDropAllowanceCm).toBe(50);
    expect(otro.modelos.GALICIA.version).toBe(1);
  });

  it('dos puestos guardan a la vez: modelos distintos entran los dos; el mismo, solo uno', async () => {
    const distintos = await Promise.allSettled([
      store.saveScope({ scope: 'CORTINA', baseVersion: 0, parameters: cortina(50), updatedBy: 'IVÁN' }),
      store.saveScope({ scope: 'GALICIA', baseVersion: 0, parameters: galicia(60), updatedBy: 'ADRIÁN' })
    ]);
    expect(distintos.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled']);
    const now = await nuevo().get();
    expect(now.version).toBe(2);
    expect(now.parameters.cortina.fabricDropAllowanceCm).toBe(50);
    expect(now.parameters.galicia.fabricDropAllowanceCm).toBe(60);
    const mismo = await Promise.allSettled([
      store.saveScope({ scope: 'CORTINA', baseVersion: 1, parameters: cortina(51), updatedBy: 'IVÁN' }),
      store.saveScope({ scope: 'CORTINA', baseVersion: 1, parameters: cortina(52), updatedBy: 'ADRIÁN' })
    ]);
    expect(mismo.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected']);
  });

  it('quién es obligatorio; el motivo, opcional; el modelo y su versión tienen que valer', async () => {
    await expect(store.saveScope({ scope: 'CORTINA', baseVersion: 0, parameters: cortina(50), updatedBy: 'NADIE' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(store.saveScope({ scope: 'TOLDO RARO', baseVersion: 0, parameters: cortina(50), updatedBy: 'IVÁN' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(store.saveScope({ scope: 'CORTINA', baseVersion: -1, parameters: cortina(50), updatedBy: 'IVÁN' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    const saved = await store.saveScope({ scope: 'CORTINA', baseVersion: 0, parameters: cortina(50), updatedBy: 'IVÁN', motivo: '  confirmado por OT ' });
    expect(saved.modelos.CORTINA.motivo).toBe('confirmado por OT');
  });

  it('guardar lo mismo no crea versión', async () => {
    await store.saveScope({ scope: 'CORTINA', baseVersion: 0, parameters: cortina(50), updatedBy: 'IVÁN' });
    const again = await store.saveScope({ scope: 'CORTINA', baseVersion: 1, parameters: cortina(50), updatedBy: 'IVÁN' });
    expect(again.version).toBe(1);
    expect(await lineas()).toHaveLength(1);
  });
});

describe('lo que ya está guardado en el servidor', () => {
  it('se lee tal cual, con la versión de cada modelo sacada de su historial, sin escribir nada', async () => {
    const { fichero, historial } = await sembrarFormatoDeAntes();
    const current = await store.get();
    expect(current.version).toBe(2);
    expect(current.parameters.cortina.fabricDropAllowanceCm).toBe(55);
    expect(current.modelos).toMatchObject({ CORTINA: { version: 2, updatedBy: 'ALBERTO' }, ENROLLABLE: { version: 1 } });
    expect((await store.history(20, { scope: 'CORTINA' })).map((e) => [e.versionAmbito, e.resumen])).toEqual([
      [2, ['Margen de caída: 50 → 55']], [1, ['Margen de caída: 45 → 50']]
    ]);
    expect(await store.history(20, { scope: 'ARZUA PRO' })).toEqual([]);
    expect(await readFile(file(), 'utf8')).toBe(fichero);
    expect(await readFile(historyFile(), 'utf8')).toBe(historial);
  });

  it('el primer guardado escribe el formato nuevo de una vez y no pierde nada de antes', async () => {
    const { historial } = await sembrarFormatoDeAntes();
    const current = await store.get();
    const saved = await store.saveScope({ scope: 'ENROLLABLE', baseVersion: 1, parameters: { ...current.parameters, drawings: { byModel: {} } }, updatedBy: 'IVÁN' });
    expect(saved.version).toBe(3);
    expect(saved.modelos).toMatchObject({ CORTINA: { version: 2, updatedBy: 'ALBERTO' }, ENROLLABLE: { version: 2, updatedBy: 'IVÁN' } });
    expect(saved.parameters.cortina.fabricDropAllowanceCm).toBe(55);
    const onDisk = JSON.parse(await readFile(file(), 'utf8'));
    expect(onDisk).toMatchObject({ formato: 2, version: 3, modelos: { CORTINA: { version: 2 }, ENROLLABLE: { version: 2 } } });
    expect((await readFile(historyFile(), 'utf8')).startsWith(historial)).toBe(true);
    expect((await store.history(20, { scope: 'ENROLLABLE' })).map((e) => [e.versionAmbito, e.resumen])).toEqual([
      [2, ['Dibujo «General» quitado']], [1, ['Dibujo «General» añadido']]
    ]);
    expect((await nuevo().get()).modelos.ENROLLABLE.version).toBe(2);
  });

  it('un fichero que no se puede leer no se sobrescribe', async () => {
    await writeFile(file(), '{roto');
    store = nuevo();
    expect(await store.get()).toMatchObject({ version: 0, ilegible: true });
    await expect(store.saveScope({ scope: 'CORTINA', baseVersion: 0, parameters: cortina(50), updatedBy: 'IVÁN' })).rejects.toMatchObject({ code: 'UNREADABLE' });
    expect(await readFile(file(), 'utf8')).toBe('{roto');
  });

  it('la ruta de antes (pestaña abierta con la web anterior): versión de todo y un renglón por modelo', async () => {
    const saved = await store.save({ baseVersion: 0, parameters: { ...cortina(50), galicia: galicia(60).galicia }, updatedBy: 'IVÁN', reason: 'Desde otra pestaña' });
    expect(saved.version).toBe(2);
    expect((await lineas()).map((l) => [l.ambito, l.motivo])).toEqual([['GALICIA', 'Desde otra pestaña'], ['CORTINA', 'Desde otra pestaña']]);
    await expect(store.save({ baseVersion: 0, parameters: cortina(55), updatedBy: 'IVÁN' })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  });

  it('el historial sin modelo es el de siempre, del más nuevo al más viejo', async () => {
    await sembrarFormatoDeAntes();
    const entries = await store.history(20);
    expect(entries.map((e) => e.version)).toEqual([2, 1]);
    expect(entries[0]).toMatchObject({ updatedBy: 'ALBERTO', reason: 'Dibujo y cortina', changedSections: ['cortina', 'drawings'] });
  });
});
