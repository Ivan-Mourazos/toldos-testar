import { describe, expect, it } from 'vitest';
import { pedidoDeEnlace, sinPedidoEnEnlace } from './enlacePedido';

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
