import { describe, expect, it, vi } from 'vitest';
import { createCoordinaClient } from './coordinaStatus.js';

const reply = (ofs, status = 200) => vi.fn(async () => ({ ok: status < 400, status, json: async () => ({ ofs }) }));

describe('cliente de CoordinaOT', () => {
  it('sin URL o sin clave: no disponible, sin llamar', async () => {
    const fetchImpl = reply([]);
    const client = createCoordinaClient({ url: '', key: 'k', fetchImpl });
    expect(await client.statusOf(['0230194'])).toEqual({ disponible: false, motivo: 'CoordinaOT no está configurado.' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('pide con la clave en la cabecera y devuelve por OF', async () => {
    const fetchImpl = reply([{ of: '0230194', estado: 'aprobada', nota: '', actualizado: '2026-09-29T08:00:00Z' }]);
    const client = createCoordinaClient({ url: 'http://coordina:4300/', key: 'secreta', fetchImpl });
    const result = await client.statusOf(['0230194', '0230194', '']);
    expect(result).toEqual({ disponible: true, ofs: { '0230194': { estado: 'aprobada', nota: '', actualizado: '2026-09-29T08:00:00Z' } } });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('http://coordina:4300/api/integracion/ofs?ofs=0230194');
    expect(init.headers['X-Clave-Integracion']).toBe('secreta');
  });

  it('guarda 30 s y fresh vuelve a preguntar', async () => {
    let now = 1000;
    const fetchImpl = reply([{ of: '0230194', estado: 'aprobada', nota: '', actualizado: null }]);
    const client = createCoordinaClient({ url: 'http://c', key: 'k', fetchImpl, now: () => now });
    await client.statusOf(['0230194']);
    await client.statusOf(['0230194']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await client.statusOf(['0230194'], { fresh: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    now += 30001;
    await client.statusOf(['0230194']);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('respuesta de error o fallo de red: no disponible', async () => {
    expect(await createCoordinaClient({ url: 'http://c', key: 'k', fetchImpl: reply([], 401) }).statusOf(['0230194']))
      .toEqual({ disponible: false, motivo: 'CoordinaOT respondió 401.' });
    const failing = vi.fn(async () => { throw new Error('timeout'); });
    expect(await createCoordinaClient({ url: 'http://c', key: 'k', fetchImpl: failing }).statusOf(['0230194']))
      .toEqual({ disponible: false, motivo: 'CoordinaOT no responde.' });
  });

  it('parte en bloques de 50 OF', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ofs: [] }) }));
    const client = createCoordinaClient({ url: 'http://c', key: 'k', fetchImpl });
    await client.statusOf(Array.from({ length: 120 }, (_, i) => String(1000000 + i)));
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('sin nada que preguntar: disponible y vacío', async () => {
    const fetchImpl = reply([]);
    expect(await createCoordinaClient({ url: 'http://c', key: 'k', fetchImpl }).statusOf([])).toEqual({ disponible: true, ofs: {} });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
