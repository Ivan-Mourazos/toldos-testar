import { afterEach, describe, expect, it, vi } from 'vitest';
import { guardarDesdePedido, leerFichas, nombreClienteRps, REMOLQUES_CLIENTES_SAVED } from './fichasClientes';
import { REMOLQUES_PARAMETERS_SAVED } from './useRemolquesParameters';

afterEach(() => vi.unstubAllGlobals());
const respuesta = (status: number, datos: unknown) => ({ ok: status < 400, status, json: async () => datos });

describe('fichas de cliente en la web', () => {
  it('el nombre del cliente de RPS: el alias si lo tiene', () => {
    expect(nombreClienteRps({ nombre: 'ENGANCHES Y REMOLQUES AYALA S.L.U', alias: ' REMOLQUES AYALA ' })).toBe('REMOLQUES AYALA');
    expect(nombreClienteRps({ nombre: ' TALLERES CAL ', alias: null })).toBe('TALLERES CAL');
  });

  it('lee las fichas y rechaza una respuesta sin su forma', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(respuesta(200, { version: 3, fichas: [] })).mockResolvedValueOnce(respuesta(200, {})));
    expect(await leerFichas()).toEqual({ version: 3, fichas: [] });
    await expect(leerFichas()).rejects.toThrow('Las fichas de cliente recibidas no son válidas.');
  });

  it('guardar desde un pedido manda el cuerpo y avisa a Remolques y a Parámetros', async () => {
    const fetchMock = vi.fn().mockResolvedValue(respuesta(200, { ficha: { id: 'a', nombre: 'A', codigosRps: ['1'] }, snapshot: { version: 2, fichas: [] } }));
    const dispatchEvent = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('window', { dispatchEvent });
    const cuerpo = { numeroPedido: 'AR.26.04286', cliente: { codigo: '1', nombre: 'A' }, fichaId: 'a', claves: [], updatedBy: 'IVÁN' };
    expect((await guardarDesdePedido(cuerpo)).ficha.nombre).toBe('A');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/remolques/clientes/desde-pedido');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(cuerpo);
    expect(dispatchEvent.mock.calls.map(([e]) => e.type)).toEqual([REMOLQUES_CLIENTES_SAVED, REMOLQUES_PARAMETERS_SAVED]);
  });

  it('si el servidor no lo guarda, su mensaje', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuesta(409, { error: 'El código 1 ya está en la ficha «B».' })));
    await expect(guardarDesdePedido({ numeroPedido: 'AR.26.04286', cliente: { codigo: '1', nombre: 'A' }, claves: [], updatedBy: 'IVÁN' }))
      .rejects.toThrow('El código 1 ya está en la ficha «B».');
  });
});
