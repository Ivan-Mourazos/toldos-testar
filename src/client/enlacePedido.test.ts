import { describe, expect, it } from 'vitest';
import { destinoDeEnlace, pedidoDeEnlace, revisionDeEnlace, sinPedidoEnEnlace } from './enlacePedido';

describe('pedidoDeEnlace', () => {
  it('saca el número de pedido de la dirección', () => {
    expect(pedidoDeEnlace('?pedido=AR2604351')).toBe('AR2604351');
  });

  it('lo deja sin puntos, espacios ni guiones y en mayúsculas: así van los archivos', () => {
    expect(pedidoDeEnlace('?pedido=AR.26.04351')).toBe('AR2604351');
    expect(pedidoDeEnlace('?pedido=%20ar-26-04351%20')).toBe('AR2604351');
  });

  it('sin número, o con algo que no es un pedido, no hay nada que abrir', () => {
    expect(pedidoDeEnlace('')).toBeNull();
    expect(pedidoDeEnlace('?pedido=')).toBeNull();
    expect(pedidoDeEnlace('?pedido=hola')).toBeNull();
    expect(pedidoDeEnlace('?pedido=AR26')).toBeNull();
    expect(pedidoDeEnlace('?otra=AR2604351')).toBeNull();
  });
});

describe('sinPedidoEnEnlace', () => {
  it('quita el pedido y conserva lo demás', () => {
    expect(sinPedidoEnEnlace('http://x:4400/?pedido=AR2604351')).toBe('/');
    expect(sinPedidoEnEnlace('http://x:4400/?a=1&pedido=AR2604351#abajo')).toBe('/?a=1#abajo');
  });
});

describe('revisionDeEnlace', () => {
  it('saca el pedido a revisar, normalizado igual que el de plantear', () => {
    expect(revisionDeEnlace('?revisar=AR.26.04351')).toBe('AR2604351');
    expect(revisionDeEnlace('?revisar=hola')).toBeNull();
    expect(revisionDeEnlace('?pedido=AR2604351')).toBeNull();
  });

  it('sinPedidoEnEnlace también lo quita, para que recargar no lo vuelva a abrir', () => {
    expect(sinPedidoEnEnlace('http://x:4400/?revisar=AR2604351')).toBe('/');
  });
});

describe('destinoDeEnlace — «Plantear» de CoordinaOT con un pedido ya guardado (Iván, 21/10/2026)', () => {
  const respuesta = (status: number) => ({ ok: status < 400, status }) as Response;
  it('si el pedido ya está en Pedidos (toldos o remolques), se abre allí y no se toca Nuevo pedido', async () => {
    const pedidas: string[] = [];
    const toldos = async (url: string) => { pedidas.push(url); return respuesta(url.startsWith('/api/reviews/') ? 200 : 404); };
    expect(await destinoDeEnlace('AR2605158', toldos)).toBe('revisar');
    expect(pedidas[0]).toBe('/api/reviews/AR2605158');
    const remolques = async (url: string) => respuesta(url.startsWith('/api/remolques/') ? 200 : 404);
    expect(await destinoDeEnlace('AR2605158', remolques)).toBe('revisar');
  });
  it('si no está guardado en ninguno, se plantea: se busca y se carga en Nuevo pedido, como hasta ahora', async () => {
    expect(await destinoDeEnlace('AR2605999', async () => respuesta(404))).toBe('plantear');
  });
  it('si no se puede comprobar, se plantea como hasta ahora', async () => {
    expect(await destinoDeEnlace('AR2605999', async () => { throw new Error('sin red'); })).toBe('plantear');
  });
});
