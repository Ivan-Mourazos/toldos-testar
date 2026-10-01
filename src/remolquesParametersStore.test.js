import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRemolquesParametersStore } from './remolquesParametersStore.js';
import { DEFAULT_PARAMS } from './remolques/calc/params.ts';

let dir;
let logger;
const file = () => path.join(dir, 'remolques-parameters.json');
const store = () => createRemolquesParametersStore({ file: file(), logger });

beforeEach(async () => {
  const root = path.resolve('tmp/tests/remolques-parameters');
  await mkdir(root, { recursive: true });
  dir = await mkdtemp(path.join(root, 'caso-'));
  logger = { warn: vi.fn() };
});

describe('edición con versión e historial', () => {
  const input = (parameters, baseVersion = 0) => ({ parameters, baseVersion, updatedBy: 'IVAN', reason: 'Medida comprobada' });

  it('guarda una versión y su historial, y otra instancia lee los valores guardados', async () => {
    const s = store();
    expect((await s.getSnapshot()).version).toBe(0);
    const next = structuredClone(DEFAULT_PARAMS);
    next.recogidas[1].delante = 31;
    const saved = await s.save(input(next));
    expect(saved).toMatchObject({ version: 1, updatedBy: 'IVAN', reason: 'Medida comprobada' });
    expect((await store().get()).recogidas[1].delante).toBe(31);
    expect(await s.history()).toMatchObject([{ version: 1, changedSections: ['recogidas'], parameters: { recogidas: next.recogidas } }]);
    expect(JSON.parse(await readFile(file(), 'utf8')).version).toBe(1);
  });

  it('dos guardados simultáneos de la misma versión no se pisan', async () => {
    const s = store();
    const results = await Promise.allSettled([
      s.save(input({ ...DEFAULT_PARAMS, demasiaAlto: 6 })),
      s.save(input({ ...DEFAULT_PARAMS, demasiaAlto: 8 }))
    ]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find(r => r.status === 'rejected').reason).toMatchObject({ code: 'VERSION_CONFLICT', current: { version: 1 } });
    expect(await s.history()).toHaveLength(1);
  });

  it('mantiene campos no editables y campos futuros del fichero antiguo', async () => {
    await writeFile(file(), JSON.stringify({ ...DEFAULT_PARAMS, maxPosicionesOllaos: 22, campoFuturo: { medida: 17 } }));
    const s = createRemolquesParametersStore({ file: file(), logger, technicians: ['IVÁN', 'ADRIÁN'] });
    const saved = await s.save({ ...input({ ...DEFAULT_PARAMS, demasiaAlto: 9, maxPosicionesOllaos: 2, tecnicos: ['INVENTADO'] }), updatedBy: 'IVÁN' });
    expect(saved.parameters.maxPosicionesOllaos).toBe(22);
    expect(saved.parameters.tecnicos).toEqual(['IVÁN', 'ADRIÁN']);
    expect(JSON.parse(await readFile(file(), 'utf8')).parameters.campoFuturo).toEqual({ medida: 17 });
  });

  it('las filas retiradas de un fichero versionado no reaparecen como una migración antigua', async () => {
    const next = { ...DEFAULT_PARAMS, recogidas: DEFAULT_PARAMS.recogidas.filter(r => r.nombre !== 'GANCHOS CORAZON') };
    const s = store();
    await s.save(input(next));
    expect((await s.get()).recogidas.some(r => r.nombre === 'GANCHOS CORAZON')).toBe(false);
  });

  it('exige autor, motivo y versión; rechaza parámetros inválidos sin escribir', async () => {
    const s = store();
    await expect(s.save({ ...input(DEFAULT_PARAMS), updatedBy: '' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(s.save({ ...input(DEFAULT_PARAMS), reason: ' ' })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(s.save({ ...input(DEFAULT_PARAMS), baseVersion: undefined })).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(s.save(input({ ...DEFAULT_PARAMS, pasoOllaosDefecto: 0 }))).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(await s.history()).toEqual([]);
  });

  it('sin cambios no crea una versión, y cargar el historial permite volver atrás con una versión nueva', async () => {
    const s = store();
    expect((await s.save(input(DEFAULT_PARAMS))).version).toBe(0);
    await s.save(input({ ...DEFAULT_PARAMS, demasiaAlto: 8 }));
    await s.save(input(DEFAULT_PARAMS, 1));
    expect((await s.getSnapshot()).version).toBe(2);
    expect((await s.get()).demasiaAlto).toBe(DEFAULT_PARAMS.demasiaAlto);
    expect(await s.history(1)).toHaveLength(1);
  });
});

describe('almacén de parámetros de remolques', () => {
  it('sin fichero son los del código, sin avisar', async () => {
    expect(await store().get()).toEqual(DEFAULT_PARAMS);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('con un fichero válido usa sus valores y completa lo que falte con los del código', async () => {
    await writeFile(file(), JSON.stringify({ demasiaAlto: 7, tecnicos: ['ANA'] }), 'utf8');
    const params = await store().get();
    expect(params.demasiaAlto).toBe(7);
    expect(params.tecnicos).toEqual(['ANA']);
    expect(params.demasiaContornoNormal).toBe(DEFAULT_PARAMS.demasiaContornoNormal);
    expect(params.recogidas).toEqual(DEFAULT_PARAMS.recogidas);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('un fichero guardado antes de los ganchos corazón los recibe del código', async () => {
    const guardadas = DEFAULT_PARAMS.recogidas.filter((r) => r.nombre !== 'GANCHOS CORAZON');
    await writeFile(file(), JSON.stringify({ recogidas: guardadas }), 'utf8');
    const { recogidas } = await store().get();
    expect(recogidas.slice(0, guardadas.length)).toEqual(guardadas);
    expect(recogidas.at(-1)).toEqual(DEFAULT_PARAMS.recogidas.find((r) => r.nombre === 'GANCHOS CORAZON'));
  });

  it('un fichero guardado antes de la marca del paño trasero de HPL la recibe sin cambiar sus medidas', async () => {
    const guardadas = DEFAULT_PARAMS.recogidas.map(({ panoTraseroConAnchoDelante: _marca, ...r }) => r);
    await writeFile(file(), JSON.stringify({ recogidas: guardadas }), 'utf8');
    const { recogidas } = await store().get();
    expect(recogidas).toEqual(DEFAULT_PARAMS.recogidas);
  });

  it('con un fichero roto vale el del código y se avisa en el log', async () => {
    await writeFile(file(), '{ esto no es json', 'utf8');
    expect(await store().get()).toEqual(DEFAULT_PARAMS);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(String(logger.warn.mock.calls[0][0])).toContain('remolques-parameters.json');
  });

  it('lee el fichero en cada petición', async () => {
    const s = store();
    expect((await s.get()).demasiaAlto).toBe(DEFAULT_PARAMS.demasiaAlto);
    await writeFile(file(), JSON.stringify({ demasiaAlto: 9 }), 'utf8');
    expect((await s.get()).demasiaAlto).toBe(9);
  });
});
