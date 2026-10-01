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
const waitFor = vi.waitFor;
afterEach(() => { runtime.cleanups.forEach((fn) => fn()); vi.unstubAllGlobals(); });

const AYALA = { id: 'ayala', nombre: 'AYALA', codigosRps: ['036662'], version: 1 };
const HPL = { id: 'hpl', nombre: 'HPL', codigosRps: ['001300'], version: 4 };
const respuesta = (datos: unknown, status = 200) => ({ ok: status < 400, status, json: async () => datos });
const lectura = (fichas = [HPL, AYALA]) => respuesta({ fichas });

async function preparado(...siguientes: unknown[]) {
  const fetchMock = vi.fn().mockResolvedValueOnce(lectura());
  for (const r of siguientes) fetchMock.mockResolvedValueOnce(r);
  fetchMock.mockResolvedValue(lectura());
  vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useFichasClientes());
  await waitFor(() => expect(result.current.ready).toBe(true));
  return { result, fetchMock };
}

it('cada ficha tiene su borrador; guardar una manda solo esa, con su versión, quién y el motivo (opcional)', async () => {
  const guardada = { ...AYALA, codigosRps: ['048286'], version: 2 };
  const { result, fetchMock } = await preparado(respuesta({ ficha: guardada, snapshot: { fichas: [HPL, guardada] } }));
  result.current.update('ayala', { ...AYALA, codigosRps: ['048286'] });
  result.current.update('hpl', { ...HPL, cremallera: true });
  expect(result.current.pendientes).toEqual(['ayala', 'hpl']);
  expect(result.current.fichas.map((f) => f.codigosRps[0])).toEqual(['001300', '048286']);
  expect((await result.current.guardar('ayala', 'IVÁN', '')).status).toBe('saved');
  expect(fetchMock.mock.calls[1][0]).toBe('/api/remolques/clientes/ayala');
  expect(fetchMock.mock.calls[1][1].method).toBe('PUT');
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ ficha: { ...AYALA, codigosRps: ['048286'] }, baseVersion: 1, updatedBy: 'IVÁN', motivo: '' });
  expect(result.current.pendientes).toEqual(['hpl']);
  expect(result.current.guardadas.find((f) => f.id === 'ayala')?.version).toBe(2);
});

it('volver a dejarla como estaba no deja borrador; descartar quita solo el de esa ficha', async () => {
  const { result } = await preparado();
  result.current.update('ayala', { ...AYALA, rotulacion: true });
  result.current.update('ayala', { ...AYALA });
  expect(result.current.pendientes).toEqual([]);
  result.current.update('ayala', { ...AYALA, rotulacion: true });
  result.current.update('hpl', { ...HPL, rotulacion: true });
  result.current.descartar('ayala');
  expect(result.current.pendientes).toEqual(['hpl']);
});

it('un conflicto conserva el borrador de esa ficha con la versión nueva', async () => {
  const otra = { ...AYALA, rotulacion: false, version: 3 };
  const { result } = await preparado(respuesta({ error: 'Otro puesto guardó esta ficha antes.', current: otra }, 409));
  result.current.update('ayala', { ...AYALA, rotulacion: true });
  expect((await result.current.guardar('ayala', 'IVÁN', '')).status).toBe('conflict');
  expect(result.current.guardadas.find((f) => f.id === 'ayala')?.version).toBe(3);
  expect(result.current.pendientes).toEqual(['ayala']);
  expect(result.current.fichas.find((f) => f.id === 'ayala')?.rotulacion).toBe(true);
});

it('un error del servidor (código repetido, 503) enseña su mensaje y conserva el borrador', async () => {
  const mensaje = 'El código de RPS 001300 está en dos fichas';
  const { result } = await preparado(respuesta({ error: mensaje }, 400));
  result.current.update('ayala', { ...AYALA, codigosRps: ['001300'] });
  expect(await result.current.guardar('ayala', 'IVÁN', '')).toEqual({ status: 'error', message: mensaje });
  expect(result.current.pendientes).toEqual(['ayala']);
});

it('crear y quitar se guardan al momento', async () => {
  const nueva = { id: 'talleres-cal', nombre: 'TALLERES CAL', codigosRps: [], version: 1 };
  const { result, fetchMock } = await preparado(
    respuesta({ ficha: nueva, snapshot: { fichas: [HPL, AYALA, nueva] } }, 201),
    respuesta({ snapshot: { fichas: [HPL, nueva] } }),
  );
  expect(await result.current.crear('TALLERES CAL', 'IVÁN')).toEqual({ status: 'saved', id: 'talleres-cal' });
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ ficha: { nombre: 'TALLERES CAL', codigosRps: [] }, updatedBy: 'IVÁN' });
  result.current.update('ayala', { ...AYALA, rotulacion: true });
  expect((await result.current.quitar('ayala', 'JAIME')).status).toBe('saved');
  expect(fetchMock.mock.calls[2][0]).toBe('/api/remolques/clientes/ayala');
  expect(fetchMock.mock.calls[2][1].method).toBe('DELETE');
  expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({ baseVersion: 1, updatedBy: 'JAIME' });
  expect(result.current.fichas.map((f) => f.id)).toEqual(['hpl', 'talleres-cal']);
  expect(result.current.pendientes).toEqual([]);
});

it('cargar una versión del historial la pone como borrador de esa ficha', async () => {
  const { result } = await preparado();
  result.current.cargarVersion('ayala', { ...AYALA, codigosRps: ['999999'], version: 1 });
  expect(result.current.pendientes).toEqual(['ayala']);
  expect(result.current.fichas.find((f) => f.id === 'ayala')?.codigosRps).toEqual(['999999']);
});

it('si el fichero de fichas está roto, lo enseña', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta({ fichas: [], ilegible: true })));
  const { result } = renderHook(() => useFichasClientes());
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current.error).toContain('no se pueden leer');
});
