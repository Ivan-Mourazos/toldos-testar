import { describe, expect, it } from 'vitest';
import { buscarPedidos, normaliza } from './buscadorPedidos';
import type { PedidoBandeja } from './types';

const pedido = (orderCode: string, extra: { customer?: string; models?: string[]; ofs?: string[]; status?: string; updatedAt?: string; kind?: string; numeroPedido?: string } = {}) => ({
  orderCode,
  kind: extra.kind,
  numeroPedido: extra.numeroPedido,
  status: extra.status ?? 'PENDING_REVIEW',
  updatedAt: extra.updatedAt ?? '2026-11-10T09:00:00',
  summary: { customer: extra.customer ?? 'Cliente', technician: 'IVÁN', ofs: extra.ofs ?? [], models: extra.models ?? ['ARZUA PRO'], awnings: 1 },
}) as unknown as PedidoBandeja;

const lista = [
  pedido('AR2605475', { customer: '2006 PORTANOVA, S.L.', models: ['AUTORREPARABLE'], kind: 'puertas', ofs: ['0232568'] }),
  pedido('AR2605495', { customer: 'MAHOU, S.A. - CAFETERIA O CASTRO', models: ['CAMBIO DE TELA', 'GALICIA'] }),
  pedido('AR2605433', { customer: 'REGUEIRO LORENZO, JOSE', models: ['GALICIA'], status: 'PRODUCED', updatedAt: '2026-11-02T10:00:00' }),
  pedido('AR2504286', { customer: 'Talleres Pérez', models: ['Recto'], kind: 'remolques', numeroPedido: 'AR.25.04286' }),
  pedido('AR2600547', { customer: 'Otro', models: ['IRIS'] }),
];
const codigos = (q: string) => buscarPedidos(q, lista).map((r) => r.pedido.orderCode);

describe('buscador de la cabecera', () => {
  it('normaliza sin acentos, puntos ni espacios', () => {
    expect(normaliza('AR.26.05475')).toBe('AR2605475');
    expect(normaliza(' ar 26 05475 ')).toBe('AR2605475');
    expect(normaliza('Pérez')).toBe('PEREZ');
  });

  it('encuentra el pedido escrito de cualquier forma, primero el exacto', () => {
    for (const q of ['AR2605475', 'ar2605475', 'AR.26.05475', '26.05475', '26.5475', 'AR 26 5475', '2605475', '05475', '5475']) {
      expect(codigos(q)[0], q).toBe('AR2605475');
    }
  });

  it('el número corto no confunde un pedido con otro que lo contiene', () => {
    // «547» empieza el 05475 y el 00547 sin ceros: los dos salen, pero el exacto (00547) primero.
    expect(codigos('547')[0]).toBe('AR2600547');
    expect(codigos('547')).toContain('AR2605475');
  });

  it('por cliente, por palabras y en cualquier orden', () => {
    expect(codigos('portanova')).toEqual(['AR2605475']);
    expect(codigos('castro mahou')).toEqual(['AR2605495']);
    expect(codigos('perez')).toEqual(['AR2504286']);
  });

  it('por modelo, sin acentos ni mayúsculas', () => {
    expect(codigos('galicia').sort()).toEqual(['AR2605433', 'AR2605495']);
    expect(codigos('cambio de tela')).toEqual(['AR2605495']);
    expect(codigos('arzua')).toEqual([]);
  });

  it('por OF y por el tipo de producto', () => {
    expect(codigos('0232568')).toEqual(['AR2605475']);
    expect(codigos('remolque')).toEqual(['AR2504286']);
  });

  it('con menos de dos letras no busca, y como mucho diez resultados', () => {
    expect(codigos('5')).toEqual([]);
    const muchos = Array.from({ length: 30 }, (_, i) => pedido(`AR26${String(10000 + i).padStart(5, '0')}`, { customer: 'Portanova' }));
    expect(buscarPedidos('portanova', muchos)).toHaveLength(10);
  });

  it('dice dónde está: pendiente o generado y cuándo', () => {
    const [pendiente] = buscarPedidos('5475', lista);
    const [generado] = buscarPedidos('5433', lista);
    expect(pendiente.donde).toBe('Pendiente · en Pedidos');
    expect(generado.donde).toBe('Generado el 02/11/26');
  });
});
