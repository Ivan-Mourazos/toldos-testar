import { describe, expect, it } from 'vitest';
import { inboxSections, mergePendingReviews, pendingYears } from './ordersInbox';

const review = (orderCode: string, status: string, technician: string, extra: Record<string, unknown> = {}) => ({
  orderCode, status, updatedAt: '2026-09-24T09:00:00Z',
  summary: { customer: 'Cliente', technician, ofs: ['0230194'], models: ['ARZUA PRO'], awnings: 1, reviewer: '', orderDate: '', diagnostics: 0 },
  ...extra
}) as never;

describe('inboxSections', () => {
  const pending = [
    review('AR1', 'PENDING_REVIEW', 'IVÁN'),
    review('AR2', 'APPROVED', 'JAIME'),
    review('AR3', 'CHANGES_REQUESTED', 'IVÁN')
  ];
  const history = [
    review('AR4', 'PRODUCED', 'IVÁN'),
    review('AR5', 'PENDING_REVIEW', 'IVÁN')
  ];

  it('separa pendientes de generar e historial, cada uno de su fuente', () => {
    const result = inboxSections({ pending, history }, { me: 'IVÁN', scope: 'all', query: '' });
    expect(result.pending.map((r) => r.orderCode)).toEqual(['AR1', 'AR2', 'AR3']);
    // AR5 está en la lista del año del Historial, pero no está generado: no entra.
    expect(result.history.map((r) => r.orderCode)).toEqual(['AR4']);
  });

  it('el año del Historial no filtra los pendientes', () => {
    const result = inboxSections({ pending, history: [] }, { me: 'IVÁN', scope: 'all', query: '' });
    expect(result.pending.map((r) => r.orderCode)).toEqual(['AR1', 'AR2', 'AR3']);
    expect(result.history).toEqual([]);
  });

  it('«Míos» deja solo los del autor, y cuenta los dos ámbitos', () => {
    const result = inboxSections({ pending, history }, { me: 'IVÁN', scope: 'mine', query: '' });
    expect(result.pending.map((r) => r.orderCode)).toEqual(['AR1', 'AR3']);
    expect(result.pendingMine).toBe(2);
    expect(result.pendingAll).toBe(3);
  });

  it('busca por pedido, cliente, OF y modelo', () => {
    const sources = { pending, history };
    expect(inboxSections(sources, { me: 'IVÁN', scope: 'all', query: '0230194' }).pending).toHaveLength(3);
    expect(inboxSections(sources, { me: 'IVÁN', scope: 'all', query: 'arzua' }).pending).toHaveLength(3);
    expect(inboxSections(sources, { me: 'IVÁN', scope: 'all', query: 'ar2' }).pending.map((r) => r.orderCode)).toEqual(['AR2']);
  });
});

describe('mergePendingReviews — pendientes del año actual y el anterior', () => {
  it('junta los dos años por pedido, quita los generados y ordena por fecha', () => {
    const thisYear = [
      review('AR2601', 'PENDING_REVIEW', 'IVÁN', { updatedAt: '2026-01-10T09:00:00Z' }),
      review('AR2602', 'PRODUCED', 'IVÁN', { updatedAt: '2026-02-10T09:00:00Z' })
    ];
    const lastYear = [
      review('AR2512', 'APPROVED', 'JAIME', { updatedAt: '2025-12-20T09:00:00Z' }),
      review('AR2511', 'PRODUCED', 'JAIME', { updatedAt: '2025-11-20T09:00:00Z' })
    ];
    expect(mergePendingReviews([thisYear, lastYear]).map((r) => r.orderCode)).toEqual(['AR2601', 'AR2512']);
  });

  it('si la carpeta no depende del año, el mismo pedido no sale dos veces y gana el más reciente', () => {
    const older = review('AR1', 'PENDING_REVIEW', 'IVÁN', { updatedAt: '2026-09-01T09:00:00Z' });
    const newer = review('AR1', 'PRODUCED', 'IVÁN', { updatedAt: '2026-09-02T09:00:00Z' });
    expect(mergePendingReviews([[older], [newer]])).toEqual([]);
    expect(mergePendingReviews([[older], [older]])).toHaveLength(1);
  });

  it('lee el año actual y el anterior', () => {
    expect(pendingYears(new Date('2026-01-05T10:00:00Z'))).toEqual([2026, 2025]);
  });
});
