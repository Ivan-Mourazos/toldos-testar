import { describe, expect, it } from 'vitest';
import { cargarDatosHoja } from './cargarHoja';

const respuesta = (status: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } }));

describe('cargarDatosHoja', () => {
  it('pide los datos con el identificador de la dirección, sin caché', async () => {
    const pedidas: Array<[string, RequestInit | undefined]> = [];
    const datos = await cargarDatosHoja('?id=abc%20123', (url, init) => {
      pedidas.push([url, init]);
      return respuesta(200, { elementos: [], params: {} });
    });
    expect(pedidas).toEqual([['/api/remolques/hoja/abc%20123', { cache: 'no-store' }]]);
    expect(datos).toEqual({ elementos: [], params: {} });
  });

  it('sin identificador no pide nada', async () => {
    await expect(cargarDatosHoja('', () => respuesta(200, {}))).rejects.toThrow('Falta el identificador de la hoja.');
  });

  it('devuelve el error del servidor tal cual', async () => {
    await expect(cargarDatosHoja('?id=x', () => respuesta(404, { error: 'Los datos de esta hoja ya no están disponibles: vuelve a pedir el PDF.' })))
      .rejects.toThrow('Los datos de esta hoja ya no están disponibles: vuelve a pedir el PDF.');
    await expect(cargarDatosHoja('?id=x', () => Promise.resolve(new Response('roto', { status: 500 }))))
      .rejects.toThrow('No se pudieron leer los datos de la hoja (500).');
  });
});
