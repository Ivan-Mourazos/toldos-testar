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
    const fetchImpl = reply([{ of: '0230194', estado: 'aprobada', nota: '', actualizado: '2026-09-29T08:00:00Z', revisor: 'jaime' }]);
    const client = createCoordinaClient({ url: 'http://coordina:4300/', key: 'secreta', fetchImpl });
    const result = await client.statusOf(['0230194', '0230194', '']);
    expect(result).toEqual({ disponible: true, ofs: { '0230194': { estado: 'aprobada', nota: '', actualizado: '2026-09-29T08:00:00Z', revisor: 'jaime' } } });
    // Sin `revisor` en la respuesta (CoordinaOT antiguo o OF no aprobada) el valor es vacío.
    const old = createCoordinaClient({ url: 'http://c', key: 'k', fetchImpl: reply([{ of: '0000009', estado: 'en_revision' }]) });
    expect((await old.statusOf(['9'])).ofs['0000009'].revisor).toBe('');
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

  it('rellena con ceros y recorta antes de preguntar', async () => {
    const fetchImpl = reply([{ of: '0230194', estado: 'aprobada', nota: '', actualizado: null }]);
    const client = createCoordinaClient({ url: 'http://c', key: 'k', fetchImpl });
    const result = await client.statusOf(['230194', ' 0230194 ']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe('http://c/api/integracion/ofs?ofs=0230194');
    expect(Object.keys(result.ofs)).toEqual(['0230194']);
  });

  it('una OF sin formato no se envía y sale como invalida; las buenas siguen', async () => {
    const fetchImpl = reply([{ of: '0230194', estado: 'aprobada', nota: '', actualizado: null }]);
    const client = createCoordinaClient({ url: 'http://c', key: 'k', fetchImpl });
    const result = await client.statusOf(['0230194', '231486.0', '0230194/1', 'OF0230194', '1234567890']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe('http://c/api/integracion/ofs?ofs=0230194');
    expect(result.disponible).toBe(true);
    expect(result.ofs['0230194'].estado).toBe('aprobada');
    const invalida = { estado: 'invalida', nota: '', actualizado: null, revisor: '' };
    for (const of of ['231486.0', '0230194/1', 'OF0230194', '1234567890']) expect(result.ofs[of]).toEqual(invalida);
  });

  it('solo OF no válidas: no llama y sigue disponible', async () => {
    const fetchImpl = reply([]);
    const result = await createCoordinaClient({ url: 'http://c', key: 'k', fetchImpl }).statusOf(['ABC']);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result).toEqual({ disponible: true, ofs: { ABC: { estado: 'invalida', nota: '', actualizado: null, revisor: '' } } });
  });

  it('sin nada que preguntar: disponible y vacío', async () => {
    const fetchImpl = reply([]);
    expect(await createCoordinaClient({ url: 'http://c', key: 'k', fetchImpl }).statusOf([])).toEqual({ disponible: true, ofs: {} });
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
