import { describe, expect, it } from 'vitest';
import { inboxSections } from './ordersInbox';

const review = (orderCode: string, status: string, technician: string, extra: Record<string, unknown> = {}) => ({
  orderCode, status, updatedAt: '2026-09-24T09:00:00Z',
  summary: { customer: 'Cliente', technician, ofs: ['0230194'], models: ['ARZUA PRO'], awnings: 1, reviewer: '', orderDate: '', diagnostics: 0 },
  ...extra
}) as never;

describe('inboxSections', () => {
  const reviews = [
    review('AR1', 'PENDING_REVIEW', 'IVÁN'),
    review('AR2', 'APPROVED', 'JAIME'),
    review('AR3', 'CHANGES_REQUESTED', 'IVÁN'),
    review('AR4', 'PRODUCED', 'IVÁN')
  ];

  it('separa pendientes de generar e historial', () => {
    const result = inboxSections(reviews, { me: 'IVÁN', scope: 'all', query: '' });
    expect(result.pending.map((r) => r.orderCode)).toEqual(['AR1', 'AR2', 'AR3']);
    expect(result.history.map((r) => r.orderCode)).toEqual(['AR4']);
  });

  it('«Míos» deja solo los del autor, y cuenta los dos ámbitos', () => {
    const result = inboxSections(reviews, { me: 'IVÁN', scope: 'mine', query: '' });
    expect(result.pending.map((r) => r.orderCode)).toEqual(['AR1', 'AR3']);
    expect(result.pendingMine).toBe(2);
    expect(result.pendingAll).toBe(3);
  });

  it('busca por pedido, cliente, OF y modelo', () => {
    expect(inboxSections(reviews, { me: 'IVÁN', scope: 'all', query: '0230194' }).pending).toHaveLength(3);
    expect(inboxSections(reviews, { me: 'IVÁN', scope: 'all', query: 'arzua' }).pending).toHaveLength(3);
    expect(inboxSections(reviews, { me: 'IVÁN', scope: 'all', query: 'ar2' }).pending.map((r) => r.orderCode)).toEqual(['AR2']);
  });
});
