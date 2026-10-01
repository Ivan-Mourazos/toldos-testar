import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_PARAMS } from '../../remolques/calc/params';
import { PARAMS_GENERALES } from '../../remolques/clientes/params-efectivos';
import { useRemolquesParameters } from './useRemolquesParameters';

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
function renderHook(hook: typeof useRemolquesParameters) {
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
const snapshot = (version = 0, demasiaAlto = 4.5) => ({ version, parameters: { ...DEFAULT_PARAMS, demasiaAlto } });
it('el borrador no cambia los vigentes y guardar envía versión, autor y motivo', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => snapshot() })
    .mockResolvedValueOnce({ ok: true, json: async () => snapshot(1, 9) });
  vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useRemolquesParameters());
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => result.current.update({ demasiaAlto: 9 }));
  expect(result.current.saved.parameters.demasiaAlto).toBe(4.5);
  expect(result.current.parameters.demasiaAlto).toBe(9);
  await act(async () => { expect((await result.current.saveDraft('IVAN', 'Medida confirmada')).status).toBe('saved'); });
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ baseVersion: 0, updatedBy: 'IVAN', reason: 'Medida confirmada', parameters: { demasiaAlto: 9 } });
  expect(result.current.dirty).toBe(false);
  expect(result.current.saved.version).toBe(1);
});
it('un conflicto conserva el borrador y actualiza la versión para revisarlo', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: true, json: async () => snapshot() })
    .mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ current: snapshot(2, 8) }) }));
  const { result } = renderHook(() => useRemolquesParameters());
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => result.current.update({ demasiaAlto: 9 }));
  await act(async () => { expect((await result.current.saveDraft('IVAN', 'Prueba')).status).toBe('conflict'); });
  expect(result.current.parameters.demasiaAlto).toBe(9);
  expect(result.current.saved.parameters.demasiaAlto).toBe(8);
  expect(result.current.saved.version).toBe(2);
  expect(result.current.dirty).toBe(true);
  act(() => result.current.discardDraft());
  expect(result.current.parameters.demasiaAlto).toBe(8);
});
it('restaurar valores y cargar historial solo cambia el borrador y preserva campos no editables', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...snapshot(3, 8), parameters: { ...DEFAULT_PARAMS, demasiaAlto: 8, maxPosicionesOllaos: 22, tecnicos: ['IVÁN'] } }) }));
  const { result } = renderHook(() => useRemolquesParameters());
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => result.current.reset());
  expect(result.current.parameters).toMatchObject({ demasiaAlto: 4.5, maxPosicionesOllaos: 22, tecnicos: ['IVÁN'] });
  expect(result.current.saved.parameters.demasiaAlto).toBe(8);
  act(() => result.current.loadVersion({ ...DEFAULT_PARAMS, demasiaAlto: 12 }));
  expect(result.current.parameters.demasiaAlto).toBe(12);
  expect(result.current.dirty).toBe(true);
});
it('no guarda valores inválidos ni sustituye el borrador si falla la red', async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => snapshot() }).mockRejectedValue(new Error('Sin conexión'));
  vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useRemolquesParameters());
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => result.current.update({ pasoOllaosDefecto: 0 }));
  await act(async () => { expect((await result.current.saveDraft('IVAN', 'Prueba')).status).toBe('error'); });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  act(() => result.current.update({ pasoOllaosDefecto: 40 }));
  await act(async () => { expect((await result.current.saveDraft('IVAN', 'Prueba')).status).toBe('error'); });
  expect(result.current.dirty).toBe(true);
});
it('arranca con los generales y cargar una versión antigua con clientes no los mete en el borrador', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: 4, parameters: PARAMS_GENERALES }) }));
  const { result } = renderHook(() => useRemolquesParameters());
  expect(result.current.parameters.clientesBaqueton.map((c) => c.nombre)).toEqual(['GENERAL']);
  await waitFor(() => expect(result.current.ready).toBe(true));
  act(() => result.current.loadVersion({ ...DEFAULT_PARAMS, demasiaAlto: 12 }));
  expect(result.current.parameters.demasiaAlto).toBe(12);
  expect(result.current.parameters.clientesBaqueton.map((c) => c.nombre)).toEqual(['GENERAL']);
  expect(result.current.parameters.recogidas.some((r) => r.nombre === 'PUENTES HIJOS DE PEDRO LOPEZ')).toBe(false);
  act(() => result.current.reset());
  expect(result.current.parameters.recogidas).toEqual(PARAMS_GENERALES.recogidas);
});
