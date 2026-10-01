import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PedidoBandeja } from '../types';
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
});
