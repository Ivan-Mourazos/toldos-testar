import { afterEach, expect, it, vi } from 'vitest';
import { useFichasClientes } from './useFichasClientes';

// El proyecto prueba sin DOM; la interacción real se comprueba con Playwright.
const runtime = vi.hoisted(() => ({ slots: [] as unknown[], index: 0, first: true, effects: [] as (() => unknown)[], cleanups: [] as (() => void)[] }));
vi.mock('react', () => ({
  useState: (initial: unknown) => {
    const i = runtime.index++;
    if (runtime.first) runtime.slots[i] = initial;
    return [runtime.slots[i], (value: unknown) => { runtime.slots[i] = typeof value === 'function' ? value(runtime.slots[i]) : value; }];
  },
  useRef: (value: unknown) => {
    const i = runtime.index++;
    if (runtime.first) runtime.slots[i] = { current: value };
    return runtime.slots[i];
  },
  useCallback: (fn: unknown) => fn,
  useEffect: (effect: () => unknown) => { if (runtime.first) runtime.effects.push(effect); }
}));
function renderHook(hook: typeof useFichasClientes) {
  runtime.slots = []; runtime.first = true; runtime.index = 0; runtime.effects = [];
  hook();
  runtime.first = false;
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(), setInterval: () => 1, clearInterval: vi.fn() });
  runtime.cleanups = runtime.effects.map((effect) => effect()).filter((value): value is () => void => typeof value === 'function');
  return { result: { get current() { runtime.index = 0; return hook(); } } };
}
async function act(fn: () => unknown) { await fn(); }
const waitFor = vi.waitFor;
afterEach(() => { runtime.cleanups.forEach((fn) => fn()); vi.unstubAllGlobals(); });

const FICHA = { id: 'ayala', nombre: 'AYALA', codigosRps: ['036662'] };
const snapshot = (version = 1, fichas = [FICHA]) => ({ version, updatedAt: '', updatedBy: '', reason: '', fichas });

it('el borrador no cambia lo guardado y guardar manda versión, fichas, autor y motivo', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => snapshot() })
    .mockResolvedValueOnce({ ok: true, json: async () => snapshot(2, [{ ...FICHA, codigosRps: ['048286'] }]) });
  vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useFichasClientes());
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => result.current.update([{ ...FICHA, codigosRps: ['048286'] }]));
  expect(result.current.saved.fichas[0].codigosRps).toEqual(['036662']);
  expect(result.current.dirty).toBe(true);
  await act(async () => { expect((await result.current.saveDraft('IVÁN', 'AYALA confirmado')).status).toBe('saved'); });
  expect(fetchMock.mock.calls[1][0]).toBe('/api/remolques/clientes');
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ baseVersion: 1, fichas: [{ ...FICHA, codigosRps: ['048286'] }], updatedBy: 'IVÁN', reason: 'AYALA confirmado' });
  expect(result.current.dirty).toBe(false);
  expect(result.current.saved.version).toBe(2);
});

it('un conflicto conserva el borrador con la versión nueva', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => snapshot() })
    .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ current: snapshot(3) }) }));
  const { result } = renderHook(() => useFichasClientes());
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => result.current.update([]));
  await act(async () => { expect((await result.current.saveDraft('IVÁN', 'Prueba')).status).toBe('conflict'); });
  expect(result.current.saved.version).toBe(3);
  expect(result.current.dirty).toBe(true);
});

it('cargar una versión del historial la pone como borrador; lo que no tiene fichas, no', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => snapshot() }));
  const { result } = renderHook(() => useFichasClientes());
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => result.current.loadVersion({ demasiaAlto: 3 }));
  expect(result.current.dirty).toBe(false);
  act(() => result.current.loadVersion({ fichas: [] }));
  expect(result.current.fichas).toEqual([]);
  expect(result.current.dirty).toBe(true);
});

it('si el fichero de fichas está roto, lo enseña', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...snapshot(), ilegible: true }) }));
  const { result } = renderHook(() => useFichasClientes());
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.error).toContain('no se pueden leer');
});

it('un 409 por código repetido (sin versión nueva) enseña el mensaje del servidor y conserva el borrador', async () => {
  const mensaje = 'El código 001300 ya está en la ficha «HIJOS DE PEDRO LOPEZ».';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => snapshot() })
    .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: mensaje }) }));
  const { result } = renderHook(() => useFichasClientes());
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => result.current.update([]));
  await act(async () => { expect(await result.current.saveDraft('IVÁN', 'Prueba')).toEqual({ status: 'error', message: mensaje }); });
  expect(result.current.dirty).toBe(true);
  expect(result.current.saved.version).toBe(1);
});

it('un 503 enseña el mensaje del servidor', async () => {
  const mensaje = 'El guardado de ficheros está desactivado en este equipo.';
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => snapshot() })
    .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: mensaje }) }));
  const { result } = renderHook(() => useFichasClientes());
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => result.current.update([]));
  await act(async () => { expect(await result.current.saveDraft('IVÁN', 'Prueba')).toEqual({ status: 'error', message: mensaje }); });
  expect(result.current.dirty).toBe(true);
});
