import { describe, expect, it } from 'vitest';
import { cargarHojaTelas } from './cargarHojaTelas';

const respuesta = (status: number, cuerpo: unknown) =>
  Promise.resolve(new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } }));

describe('cargarHojaTelas', () => {
  it('pide los datos con el identificador de la dirección, sin caché', async () => {
    const pedidas: Array<[string, RequestInit | undefined]> = [];
    const datos = await cargarHojaTelas('?id=abc%20123', (url, init) => {
      pedidas.push([url, init]);
      return respuesta(200, { planIndex: 0 });
    });
    expect(pedidas).toEqual([['/api/hoja-telas/abc%20123', { cache: 'no-store' }]]);
    expect(datos).toEqual({ planIndex: 0 });
  });

  it('sin identificador no pide nada', async () => {
    await expect(cargarHojaTelas('', () => respuesta(200, {}))).rejects.toThrow('Falta el identificador de la hoja.');
  });

  it('devuelve el error del servidor tal cual', async () => {
    await expect(cargarHojaTelas('?id=x', () => respuesta(404, { error: 'Ya no está.' }))).rejects.toThrow('Ya no está.');
    await expect(cargarHojaTelas('?id=x', () => Promise.resolve(new Response('roto', { status: 500 }))))
      .rejects.toThrow('No se pudieron leer los datos de la hoja (500).');
  });
});
