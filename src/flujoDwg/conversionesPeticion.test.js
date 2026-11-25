import { expect, it, vi } from 'vitest';
import { conConversionesDwg, convertirDwgUnaVez } from './conversionesPeticion.js';

it('reutiliza cada plano solo durante la petición y vuelve a convertir si cambian sus bytes', async () => {
  const convertir = vi.fn(async bytes => bytes.toString());
  const leer = (ruta, texto) => convertirDwgUnaVez(ruta, Buffer.from(texto), convertir);
  await conConversionesDwg(async () => {
    expect(await Promise.all([leer('a.dwg', 'uno'), leer('a.dwg', 'uno')])).toEqual(['uno', 'uno']);
    expect(await leer('b.dwg', 'uno')).toBe('uno');
    expect(await leer('a.dwg', 'dos')).toBe('dos');
    expect(await leer('a.dwg', 'dos')).toBe('dos');
    expect(convertir).toHaveBeenCalledTimes(3);
  });
  await conConversionesDwg(() => leer('a.dwg', 'dos'));
  expect(convertir).toHaveBeenCalledTimes(4);
});

it('no comparte entre peticiones simultáneas ni conserva un fallo', async () => {
  const convertir = vi.fn().mockRejectedValueOnce(new Error('ODA')).mockResolvedValue('DXF');
  const leer = () => convertirDwgUnaVez('a.dwg', Buffer.from('plano'), convertir);
  await Promise.all([
    conConversionesDwg(async () => {
      await expect(leer()).rejects.toThrow('ODA');
      await expect(leer()).resolves.toBe('DXF');
    }),
    conConversionesDwg(async () => {
      await expect(leer()).resolves.toBe('DXF');
    }),
  ]);
  expect(convertir).toHaveBeenCalledTimes(3);
});
