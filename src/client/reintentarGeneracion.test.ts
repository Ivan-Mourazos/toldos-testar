import { afterEach, describe, expect, it, vi } from 'vitest';
import { solicitarGeneracion } from './reintentarGeneracion';

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const cerrado = () => new Response(JSON.stringify({ error: 'El servidor se está cerrando: no se pueden hacer más hojas de taller ahora.' }), { status: 503 });
const pedir = (aviso: () => void = vi.fn(), signal?: AbortSignal) => solicitarGeneracion('/generar', { method: 'POST', body: '{}', signal }, r => r.json(), aviso);

describe('generación durante un reinicio', () => {
  it('repite el mismo cuerpo tras cierre y corte de conexión, sin mostrar el error intermedio', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValueOnce(cerrado()).mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(new Response('{"ok":true}'));
    vi.stubGlobal('fetch', fetch);
    const aviso = vi.fn();
    const resultado = pedir(aviso);
    await vi.runAllTimersAsync();
    expect(await resultado).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls.every(([, init]) => init.body === '{}')).toBe(true);
    expect(aviso).toHaveBeenCalledTimes(1);
  });

  it('termina tras dos reintentos si la conexión sigue caída', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetch);
    const resultado = expect(pedir()).rejects.toThrow('Failed to fetch');
    await vi.runAllTimersAsync();
    await resultado;
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('no repite otros 503 ni los conflictos que necesitan confirmación', async () => {
    const fetch = vi.fn().mockResolvedValueOnce(new Response('{"error":"Falta Chromium"}', { status: 503 })).mockResolvedValueOnce(new Response('{"needsConfirmation":true}', { status: 409 }));
    vi.stubGlobal('fetch', fetch);
    expect(await pedir()).toEqual({ error: 'Falta Chromium' });
    expect(await pedir()).toEqual({ needsConfirmation: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('reintenta también si el reinicio corta la lectura del PDF', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValueOnce({ status: 200, blob: () => Promise.reject(new TypeError('terminated')) }).mockResolvedValue(new Response('PDF'));
    vi.stubGlobal('fetch', fetch);
    const resultado = solicitarGeneracion('/pdf', {}, r => r.blob(), vi.fn());
    await vi.runAllTimersAsync();
    expect((await resultado).size).toBe(3);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('cancelar durante la espera impide volver a pedir una hoja obsoleta', async () => {
    vi.useFakeTimers();
    const fetch = vi.fn().mockResolvedValue(cerrado());
    vi.stubGlobal('fetch', fetch);
    const abortar = new AbortController();
    const resultado = expect(pedir(() => abortar.abort(), abortar.signal)).rejects.toHaveProperty('name', 'AbortError');
    await vi.runAllTimersAsync();
    await resultado;
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
