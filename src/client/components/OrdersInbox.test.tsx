import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PedidoBandeja } from '../types';
import type { ResumenBorrador } from '../../borradores/tipos.ts';
import { OrdersInbox } from './OrdersInbox';

const fila = (orderCode: string, extra: Record<string, unknown> = {}) => ({
  orderCode, status: 'PENDING_REVIEW', updatedAt: '2026-10-01T09:00:00Z', reviewNote: '',
  summary: { customer: 'Cliente', technician: 'IVÁN', ofs: ['0231780'], models: ['ARZUA PRO'], awnings: 1, reviewer: '', orderDate: '', diagnostics: 0 },
  ...extra,
}) as unknown as PedidoBandeja;

describe('Pedidos con toldos y remolques', () => {
  it('cada fila con su etiqueta, el filtro de tipo y la columna «Elementos»', () => {
    const html = renderToStaticMarkup(
      <OrdersInbox
        pending={[fila('AR2601'), fila('AR2602', { kind: 'remolques', summary: { customer: 'Talleres', technician: 'IVÁN', ofs: ['0231781'], models: ['Recto'], awnings: 1, reviewer: '', orderDate: '', diagnostics: 0 } })]}
        history={[]} currentUser="IVÁN" pendingLoading={false} historyLoading={false} year={2026}
        onYear={() => undefined} onOpen={() => undefined} coordinaStatus={null}
      />,
    );
    expect(html).toContain('aria-label="Qué tipo de pedidos"');
    expect(html).toMatch(/>Todos<\/button>.*>Toldos<\/button>.*>Remolques<\/button>/);
    expect(html).toContain('orders-kind-tag familia-tag is-toldos">Toldo<');
    expect(html).toContain('orders-kind-tag familia-tag is-remolques">Remolque<');
    expect(html).toContain('orders-model-tag familia-tag is-remolques">Recto<');
    expect(html).toContain('<span class="is-end">Elementos</span>');
  });

  it('los borradores van encima de «Por revisar», con su etiqueta, y no cuentan como pendientes', () => {
    const borrador = {
      schemaVersion: 1, kind: 'remolques', orderCode: 'AR2609', numeroPedido: 'AR.26.09', savedBy: 'JAIME',
      createdAt: '2026-10-01T08:00:00Z', updatedAt: '2026-10-01T09:00:00Z',
      summary: { customer: 'Talleres', orderDate: '2026-10-01', elementos: 2, models: ['Recto'] },
    } as ResumenBorrador;
    const html = renderToStaticMarkup(
      <OrdersInbox
        pending={[fila('AR2601')]} history={[]} borradores={[borrador]} currentUser="IVÁN" pendingLoading={false} historyLoading={false} year={2026}
        onYear={() => undefined} onOpen={() => undefined} coordinaStatus={null}
        onSeguirBorrador={() => undefined} onDescartarBorrador={() => undefined}
      />,
    );
    expect(html.indexOf('aria-label="Borradores: 1"')).toBeGreaterThan(-1);
    expect(html.indexOf('aria-label="Borradores: 1"')).toBeLessThan(html.indexOf('Por revisar'));
    expect(html).toContain('orders-borrador-tag">Borrador<');
    expect(html).toContain('orders-kind-tag familia-tag is-remolques">Remolque<');
    // React separa con <!-- --> los textos seguidos: «2», « » y «elementos».
    expect(html).toMatch(/2(<!-- -->)? (<!-- -->)?elementos/);
    expect(html).toMatch(/Todo el equipo (<!-- -->)?1</);
    // Una sola cabecera de columnas para borradores y pendientes.
    expect(html.match(/class="orders-columns"/g)).toHaveLength(1);
  });

  it('sin borradores no sale el apartado', () => {
    const html = renderToStaticMarkup(
      <OrdersInbox pending={[fila('AR2601')]} history={[]} currentUser="IVÁN" pendingLoading={false} historyLoading={false} year={2026}
        onYear={() => undefined} onOpen={() => undefined} coordinaStatus={null} />,
    );
    expect(html).not.toContain('Borradores');
  });
});
