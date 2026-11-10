import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { renombrarAtomico } from './renombrarAtomico.js';
import { writeFileAtomic } from './workflow.js';

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
it.each(['EPERM', 'EACCES', 'EBUSY'])('reintenta el bloqueo transitorio %s sin borrar el destino', async code => {
  vi.useFakeTimers();
  const rename = vi.spyOn(fs, 'rename').mockRejectedValueOnce(Object.assign(new Error('Ocupado'), { code })).mockResolvedValue();
  const borrar = vi.spyOn(fs, 'rm');
  const resultado = renombrarAtomico('tmp/nuevo', 'tmp/anterior');
  const comprobar = expect(resultado).resolves.toBeUndefined();
  await vi.runAllTimersAsync(); await comprobar;
  expect(rename).toHaveBeenCalledTimes(2); expect(borrar).not.toHaveBeenCalled();
});
it('un permiso denegado persistente tiene un límite y conserva el error', async () => {
  vi.useFakeTimers(); const error = Object.assign(new Error('Sin permiso'), { code: 'EPERM' });
  const rename = vi.spyOn(fs, 'rename').mockRejectedValue(error);
  const comprobar = expect(renombrarAtomico('tmp/nuevo', 'tmp/anterior')).rejects.toBe(error);
  await vi.runAllTimersAsync(); await comprobar; expect(rename).toHaveBeenCalledTimes(5);
});
it('un error ajeno al bloqueo no se reintenta', async () => {
  const error = Object.assign(new Error('No existe'), { code: 'ENOENT' });
  const rename = vi.spyOn(fs, 'rename').mockRejectedValue(error);
  await expect(renombrarAtomico('tmp/nuevo', 'tmp/anterior')).rejects.toBe(error); expect(rename).toHaveBeenCalledOnce();
});

// Iván, 10/11/2026: sin carpeta «_anteriores». El anterior se aparta junto al plano y se borra al terminar bien.
describe('sustituir planos en una carpeta compartida que no deja reemplazar', () => {
  let raiz;
  let destino;
  let renombrar;
  const fallo = code => Object.assign(new Error(code), { code });
  beforeEach(async () => {
    await fs.mkdir(path.resolve('tmp'), { recursive: true });
    raiz = await fs.mkdtemp(path.resolve('tmp/sustituir-plano-'));
    destino = path.join(raiz, 'AR2605473.dwg');
    await fs.writeFile(destino, 'PLANO ANTERIOR');
    renombrar = fs.rename.bind(fs);
  });
  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(raiz, { recursive: true, force: true });
  });
  const copias = async raiz => (await fs.readdir(raiz)).filter(n => n.includes('.anterior-'));
  function simularReemplazoDenegado() {
    return vi.spyOn(fs, 'rename').mockImplementation(async (origen, hasta) => {
      if (hasta === destino && origen.startsWith(`${destino}.tmp-`) && await fs.stat(destino).then(() => true, () => false)) throw fallo('EACCES');
      return renombrar(origen, hasta);
    });
  }

  it('publica el plano y borra el anterior si la red rechaza reemplazar el existente', async () => {
    simularReemplazoDenegado();
    await writeFileAtomic(destino, 'PLANO NUEVO', { conservarAnterior: true });
    expect(await fs.readFile(destino, 'utf8')).toBe('PLANO NUEVO');
    expect(await copias(raiz)).toEqual([]);
    expect((await fs.readdir(raiz)).filter(n => n.includes('.tmp-'))).toEqual([]);
  });
  it('el reemplazo directo sigue siendo el primer intento y no crea copias innecesarias', async () => {
    const rename = vi.spyOn(fs, 'rename');
    await writeFileAtomic(destino, 'PLANO NUEVO', { conservarAnterior: true });
    expect(rename).toHaveBeenCalledOnce();
    expect(await copias(raiz)).toEqual([]);
  });
  it('si tampoco puede apartar el anterior, conserva el original y devuelve el error', async () => {
    vi.spyOn(fs, 'rename').mockRejectedValue(fallo('EACCES'));
    await expect(writeFileAtomic(destino, 'PLANO NUEVO', { conservarAnterior: true })).rejects.toMatchObject({ code: 'EACCES' });
    expect(await fs.readFile(destino, 'utf8')).toBe('PLANO ANTERIOR');
    expect(await copias(raiz)).toEqual([]);
  });
  it('restaura el anterior si falla publicar el nuevo después de apartarlo', async () => {
    const rename = vi.spyOn(fs, 'rename').mockImplementation(async (origen, hasta) => {
      if (origen.startsWith(`${destino}.tmp-`)) throw fallo('EACCES');
      return renombrar(origen, hasta);
    });
    await expect(writeFileAtomic(destino, 'PLANO NUEVO', { conservarAnterior: true })).rejects.toMatchObject({ code: 'EACCES' });
    expect(await fs.readFile(destino, 'utf8')).toBe('PLANO ANTERIOR');
    expect(await copias(raiz)).toEqual([]);
    expect(rename.mock.calls.some(([, hasta]) => hasta.includes('.anterior-'))).toBe(true);
    expect((await fs.readdir(raiz)).filter(n => n.includes('.tmp-'))).toEqual([]);
  });
  it('si falla restaurar, conserva la copia e indica su ubicación', async () => {
    vi.spyOn(fs, 'rename').mockImplementation(async (origen, hasta) => {
      if (hasta === destino) throw fallo('EACCES');
      return renombrar(origen, hasta);
    });
    await expect(writeFileAtomic(destino, 'PLANO NUEVO', { conservarAnterior: true })).rejects.toMatchObject({
      statusCode: 500, message: expect.stringContaining('.anterior-'),
    });
    const anteriores = await copias(raiz);
    expect(anteriores).toHaveLength(1);
    expect(await fs.readFile(path.join(raiz, anteriores[0]), 'utf8')).toBe('PLANO ANTERIOR');
  });
  it('cada guardado deja solo la última versión, sin copias', async () => {
    simularReemplazoDenegado();
    await writeFileAtomic(destino, 'SEGUNDA VERSIÓN', { conservarAnterior: true });
    await writeFileAtomic(destino, 'TERCERA VERSIÓN', { conservarAnterior: true });
    expect(await fs.readFile(destino, 'utf8')).toBe('TERCERA VERSIÓN');
    expect(await copias(raiz)).toEqual([]);
  });
  it('si otro programa ocupa el destino durante el intento, lo respeta y conserva el anterior en la copia', async () => {
    vi.spyOn(fs, 'rename').mockImplementation(async (origen, hasta) => {
      if (hasta === destino && origen.startsWith(`${destino}.tmp-`)) {
        if (!(await fs.stat(destino).then(() => true, () => false))) await fs.writeFile(destino, 'DE OTRO PROGRAMA');
        throw fallo('EACCES');
      }
      return renombrar(origen, hasta);
    });
    await expect(writeFileAtomic(destino, 'PLANO NUEVO', { conservarAnterior: true })).rejects.toMatchObject({ statusCode: 500 });
    expect(await fs.readFile(destino, 'utf8')).toBe('DE OTRO PROGRAMA');
    const anteriores = await copias(raiz);
    expect(anteriores).toHaveLength(1);
    expect(await fs.readFile(path.join(raiz, anteriores[0]), 'utf8')).toBe('PLANO ANTERIOR');
  });
  it('si el plano está abierto (EBUSY) no lo aparta: hay que cerrarlo y volver a guardar', async () => {
    vi.spyOn(fs, 'rename').mockImplementation(async (origen, hasta) => {
      if (hasta === destino) throw fallo('EBUSY');
      return renombrar(origen, hasta);
    });
    await expect(writeFileAtomic(destino, 'PLANO NUEVO', { conservarAnterior: true })).rejects.toMatchObject({ code: 'EBUSY' });
    expect(await fs.readFile(destino, 'utf8')).toBe('PLANO ANTERIOR');
    expect(await copias(raiz)).toEqual([]);
  });
  it.each(['EIO', 'ENOSPC'])('no aparta el original ante un error %s', async code => {
    const rename = vi.spyOn(fs, 'rename').mockRejectedValue(fallo(code));
    await expect(writeFileAtomic(destino, 'PLANO NUEVO', { conservarAnterior: true })).rejects.toMatchObject({ code });
    expect(rename).toHaveBeenCalledOnce();
    expect(await fs.readFile(destino, 'utf8')).toBe('PLANO ANTERIOR');
    expect(await copias(raiz)).toEqual([]);
  });
  it('sin activar la copia conserva el reemplazo atómico habitual de los JSON y PDF', async () => {
    simularReemplazoDenegado();
    await expect(writeFileAtomic(destino, 'PLANO NUEVO')).rejects.toMatchObject({ code: 'EACCES' });
    expect(await fs.readFile(destino, 'utf8')).toBe('PLANO ANTERIOR');
    expect(await copias(raiz)).toEqual([]);
  });
});
