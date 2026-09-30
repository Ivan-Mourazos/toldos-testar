import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRemolquesParametersStore } from './remolquesParametersStore.js';
import { DEFAULT_PARAMS } from './remolques/calc/params.ts';

let dir;
let logger;
const file = () => path.join(dir, 'remolques-parameters.json');
const store = () => createRemolquesParametersStore({ file: file(), logger });

beforeEach(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'remolques-parameters-'));
  logger = { warn: vi.fn() };
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
