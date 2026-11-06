import { afterEach, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import { renombrarAtomico } from './renombrarAtomico.js';

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
