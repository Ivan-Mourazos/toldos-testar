import { describe, expect, it } from 'vitest';
import { emptyLona } from '../../remolques/entradas-vacias.ts';
import type { PedidoRps } from '../../remolques/rps/types.ts';
import type { LineaPedido } from '../../remolques/workspace/lineas.ts';
import { clienteDeLinea, elementoDeLinea } from './guardarEnFicha';

const CLIENTE = { codigo: '009999', nombre: 'TALLERES CAL S.L.', alias: 'TALLERES CAL' };
const linea = (cliente?: typeof CLIENTE): LineaPedido => ({
  version: '10', tipo: 'lona', input: emptyLona(),
  origenRps: cliente ? { numeroPedido: 'AR.26.04286', numeroLinea: 1, idLinea: 'L1', ordenFabricacion: null, importadoEn: '', cliente } : null,
});
const pedido: PedidoRps = { numero: 'AR.26.04286', fecha: null, fechaSalida: null, cliente: CLIENTE, lineas: [] };

describe('el cliente de RPS de un elemento', () => {
  it('el que guardó al importarse', () => {
    expect(clienteDeLinea(linea(CLIENTE), 'AR.26.04286', null)).toEqual(CLIENTE);
  });
  it('si no lo tiene, el del pedido de RPS en pantalla, si es este pedido', () => {
    expect(clienteDeLinea(linea(), 'AR2604286', pedido)).toEqual(CLIENTE);
    expect(clienteDeLinea(linea(), 'AR.26.04287', pedido)).toBeNull();
    expect(clienteDeLinea(linea(), 'AR.26.04286', null)).toBeNull();
  });
  it('el elemento para la ficha: su tipo y su entrada', () => {
    expect(elementoDeLinea(linea())).toEqual({ tipo: 'lona', input: emptyLona() });
  });
});
