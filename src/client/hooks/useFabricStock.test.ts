import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadFabricStocks } from './useFabricStock';

afterEach(() => vi.unstubAllGlobals());

describe('stock de las propuestas', () => {
  it('consulta juntos los códigos distintos y comparte la caché con la tela elegida', async () => {
    const fetchStock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [{ code: 'PRUEBA-A', disponible: 12 }, { code: 'PRUEBA-B', disponible: 0 }] }) });
    vi.stubGlobal('fetch', fetchStock);
    const result = await loadFabricStocks(['PRUEBA-A', 'PRUEBA-B', 'PRUEBA-A', '']);
    expect(fetchStock).toHaveBeenCalledExactlyOnceWith('/api/catalog/fabrics/stock?codes=PRUEBA-A%2CPRUEBA-B');
    expect(result['PRUEBA-A']).toMatchObject({ status: 'ready', stock: { disponible: 12 } });
    expect(result['PRUEBA-B']).toMatchObject({ status: 'ready', stock: { disponible: 0 } });
    await loadFabricStocks(['PRUEBA-A']);
    expect(fetchStock).toHaveBeenCalledTimes(1);
  });

  it('no confunde un código ausente con cero metros y permite reintentar el fallo', async () => {
    const fetchStock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [{ code: 'PRUEBA-C', disponible: 20 }] }) });
    vi.stubGlobal('fetch', fetchStock);
    const result = await loadFabricStocks(['PRUEBA-C', 'PRUEBA-D']);
    expect(result['PRUEBA-C'].status).toBe('ready');
    expect(result['PRUEBA-D'].status).toBe('error');
    await loadFabricStocks(['PRUEBA-D']);
    expect(fetchStock).toHaveBeenCalledTimes(2);
  });

  it('un error de RPS afecta a todas las opciones y sin códigos no consulta', async () => {
    const fetchStock = vi.fn().mockRejectedValue(new Error('RPS caído'));
    vi.stubGlobal('fetch', fetchStock);
    expect(await loadFabricStocks([])).toEqual({});
    expect(fetchStock).not.toHaveBeenCalled();
    expect(await loadFabricStocks(['PRUEBA-E', 'PRUEBA-F'])).toEqual({ 'PRUEBA-E': { status: 'error' }, 'PRUEBA-F': { status: 'error' } });
  });
});
