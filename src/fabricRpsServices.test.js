import { describe, expect, it, vi } from 'vitest';
import { createCachedValue, createFabricStockService, fabricStockHandler } from './fabricRpsServices.js';

const ROWS = [
  { code: 'ACRILI2170P120', warehouseCode: '1', warehouseName: 'ARZÚA', roll: 'A', meters: 40, reserved: 8 },
  { code: 'ACRILI2170P120', warehouseCode: '1', warehouseName: 'ARZÚA', roll: 'B', meters: 25, reserved: 0 }
];

function fakeRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  return res;
}

describe('createCachedValue', () => {
  it('guarda el valor el tiempo indicado y comparte la consulta en curso', async () => {
    let clock = 0;
    const load = vi.fn(async () => 'valor');
    const cached = createCachedValue({ load, ttlMs: 60_000, now: () => clock });
    await Promise.all([cached.get(), cached.get()]);
    await cached.get();
    expect(load).toHaveBeenCalledTimes(1);
    clock = 60_001;
    await cached.get();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('si la consulta falla, la siguiente vuelve a intentarlo', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('RPS caído')).mockResolvedValueOnce('ok');
    const cached = createCachedValue({ load, ttlMs: 1000 });
    await expect(cached.get()).rejects.toThrow('RPS caído');
    await expect(cached.get()).resolves.toBe('ok');
  });
});

describe('GET /api/catalog/fabrics/stock', () => {
  it('devuelve el resumen de cada código pedido, con la hora de la consulta', async () => {
    const loadRows = vi.fn(async () => ROWS);
    const handler = fabricStockHandler(createFabricStockService({ loadRows, now: () => Date.UTC(2026, 8, 30, 12) }));
    const res = fakeRes();
    await handler({ query: { codes: 'acrili2170p120, NOEXISTE' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.items).toEqual([
      expect.objectContaining({ code: 'ACRILI2170P120', metros: 65, reservado: 8, disponible: 57, bobinasConDisponible: 2, mayorBobinaDisponible: 32, consultado: '2026-09-30T12:00:00.000Z' }),
      expect.objectContaining({ code: 'NOEXISTE', disponible: 0, bobinasConDisponible: 0 })
    ]);
  });

  it('abrir varias tarjetas no repite la consulta a RPS (caché de 60 s)', async () => {
    const loadRows = vi.fn(async () => ROWS);
    const handler = fabricStockHandler(createFabricStockService({ loadRows }));
    await handler({ query: { codes: 'ACRILI2170P120' } }, fakeRes());
    await handler({ query: { codes: 'ACRILI2170P120' } }, fakeRes());
    expect(loadRows).toHaveBeenCalledTimes(1);
  });

  it('con RPS caído responde 503 «Stock no disponible ahora»', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      const handler = fabricStockHandler(createFabricStockService({ loadRows: async () => { throw new Error('timeout'); } }));
      const res = fakeRes();
      await handler({ query: { codes: 'ACRILI2170P120' } }, res);
      expect(res.statusCode).toBe(503);
      expect(res.body).toEqual({ error: 'Stock no disponible ahora' });
    } finally {
      consoleError.mockRestore();
    }
  });

  it('admite los códigos de lona de remolque con barra (NS86B16P/NP250)', async () => {
    const loadRows = vi.fn(async () => [{ code: 'NS86B16P/NP250', warehouseCode: '5', warehouseName: 'NUEVA SEDE ARZÚA', roll: 'A', meters: 90, reserved: 0 }]);
    const res = fakeRes();
    await fabricStockHandler(createFabricStockService({ loadRows }))({ query: { codes: 'ns86b16p/np250' } }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.items).toEqual([expect.objectContaining({ code: 'NS86B16P/NP250', disponible: 90, bobinasConDisponible: 1 })]);
  });

  it('sin códigos válidos responde 400 y no consulta RPS', async () => {
    const loadRows = vi.fn(async () => ROWS);
    const res = fakeRes();
    await fabricStockHandler(createFabricStockService({ loadRows }))({ query: { codes: "'; DROP TABLE x" } }, res);
    expect(res.statusCode).toBe(400);
    expect(loadRows).not.toHaveBeenCalled();
  });
});

