import { describe, expect, it } from 'vitest';
import type { PedidoRemolques } from '../../remolques/flujo/tipos.ts';
import { estadoGenerarRemolques, ficherosPrevistos } from './generarPedido';

const elemento = (of: string) => ({ input: { cabecera: { ordenFabricacion: of } } });
const pedido = (extra: Partial<PedidoRemolques> = {}) => ({
  status: 'PENDING_REVIEW',
  summary: { technician: 'IVÁN', customer: '', orderDate: '2026-09-01', reviewer: '', awnings: 2, ofs: [], models: [], diagnostics: 0 },
  elementos: [elemento('231780'), elemento('0231781')],
  ...extra,
}) as unknown as PedidoRemolques;
const aprobada = { estado: 'aprobada', revisor: 'jaime' };

describe('estadoGenerarRemolques', () => {
  it('un generado no se genera', () => {
    expect(estadoGenerarRemolques(pedido({ status: 'PRODUCED' }), 'IVÁN', null)).toEqual({ allowed: false, note: '' });
  });

  it('solo el autor, y mientras no se sabe qué dice CoordinaOT, espera', () => {
    expect(estadoGenerarRemolques(pedido(), 'JAIME', null)).toEqual({ allowed: false, note: 'Lo genera el autor (Iván)' });
    expect(estadoGenerarRemolques(pedido(), 'IVÁN', null)).toEqual({ allowed: false, note: 'Comprobando la aprobación en CoordinaOT…' });
  });

  it('dice qué falta: la OF de un elemento o la aprobación', () => {
    expect(estadoGenerarRemolques(pedido({ elementos: [elemento('231780'), elemento('')] as never }), 'IVÁN', { disponible: true, ofs: {} }))
      .toEqual({ allowed: false, note: 'Falta la OF en el elemento B.' });
    expect(estadoGenerarRemolques(pedido(), 'IVÁN', { disponible: true, ofs: { '0231780': { estado: 'devuelta' }, '0231781': aprobada } }))
      .toEqual({ allowed: false, note: 'Sin aprobar en CoordinaOT: A (0231780) devuelta.' });
  });

  it('con todo aprobado puede el autor; un pedido sin autor (de la web vieja), cualquiera', () => {
    const todo = { disponible: true, ofs: { '0231780': aprobada, '0231781': aprobada } };
    expect(estadoGenerarRemolques(pedido(), 'IVÁN', todo)).toEqual({ allowed: true, note: '' });
    const sinAutor = pedido({ summary: { ...pedido().summary, technician: '' } });
    expect(estadoGenerarRemolques(sinAutor, 'JAIME', todo)).toEqual({ allowed: true, note: '' });
  });
});

describe('ficherosPrevistos', () => {
  it('los dos PDF de siempre, con el año del pedido', () => {
    expect(ficherosPrevistos({ numeroPedido: 'AR.26.04286', summary: pedido().summary, createdAt: '2026-10-01T08:00:00.000Z' }))
      .toEqual(['Planteamientos: AR2604286-10.pdf', 'Oficina técnica: 2026/AR2604286.pdf']);
  });
});
