import { describe, expect, it } from 'vitest';
import { collapseAwnings, inboxSections, mergePendingReviews, pendingGroups, pendingYears } from './ordersInbox';
import type { ReviewSummary } from './types';

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

describe('pendingGroups según CoordinaOT', () => {
  const coordinaReview = (code: string, ofs: string[]) => ({
    orderCode: code,
    status: 'PENDING_REVIEW',
    updatedAt: '2026-09-29T08:00:00Z',
    summary: { technician: 'IVÁN', customer: '', models: [], awnings: ofs.length, ofs, awningList: ofs.map((of, index) => ({ letter: String.fromCharCode(65 + index), model: 'ARZUA PRO', of, state: 'ok' as const, notes: [] })) }
  }) as unknown as ReviewSummary;
  const aprobada = { estado: 'aprobada', nota: '' };

  it('reparte por lo que dice CoordinaOT, en orden fijo', () => {
    const status = { disponible: true, ofs: { '0230191': aprobada, '0230192': aprobada, '0230193': { estado: 'devuelta', nota: 'Falta cota' }, '0230194': { estado: 'en_revision' } } };
    const groups = pendingGroups([coordinaReview('R', ['0230194']), coordinaReview('A', ['230191', '0230192']), coordinaReview('D', ['0230191', '0230193'])], status);
    expect(groups.map((group) => [group.key, group.label, group.reviews.map((item) => item.orderCode)])).toEqual([
      ['por_revisar', 'Por revisar', ['R']],
      ['devuelto', 'Devueltos', ['D']],
      ['aprobado', 'Aprobados · falta generar', ['A']]
    ]);
  });

  it('sin respuesta de CoordinaOT, todo por revisar', () => {
    const groups = pendingGroups([coordinaReview('A', ['0230191'])], { disponible: false });
    expect(groups.map((group) => group.key)).toEqual(['por_revisar']);
    expect(pendingGroups([coordinaReview('A', ['0230191'])], null).map((group) => group.key)).toEqual(['por_revisar']);
  });
});

describe('formato de fechas de Pedidos', () => {
  it('escribe las fechas con dos cifras', async () => {
    const { formatListDate } = await import('./ordersInbox');
    expect(formatListDate('2026-09-04T10:00:00.000Z')).toBe('04/09/2026');
  });
});

describe('historial por días', () => {
  it('agrupa por día con el nombre del día y respeta el orden', async () => {
    const { groupByDay } = await import('./ordersInbox');
    const make = (orderCode: string, updatedAt: string) => ({ orderCode, updatedAt, summary: {} }) as never;
    const groups = groupByDay([make('A', '2026-09-24T10:00:00'), make('B', '2026-09-24T08:00:00'), make('C', '2026-09-23T10:00:00')]);
    expect(groups.map((group) => [group.label, group.reviews.length])).toEqual([['Jueves 24/09/26', 2], ['Miércoles 23/09/26', 1]]);
  });
});

describe('collapseAwnings', () => {
  const items = (states: string[]) => states.map((state, index) => ({ letter: String.fromCharCode(65 + index), state }));
  const keyOf = (item: { state: string }) => item.state;

  it('con pocos toldos deja una etiqueta por toldo', () => {
    const groups = collapseAwnings(items(['a', 'a', 'a', 'b']), keyOf, 6);
    expect(groups.map((g) => g.label)).toEqual(['A', 'B', 'C', 'D']);
    expect(groups.every((g) => g.items.length === 1)).toBe(true);
  });

  it('con muchos agrupa los consecutivos del mismo estado: A–C y D', () => {
    const groups = collapseAwnings(items(['a', 'a', 'a', 'b', 'a', 'a', 'a']), keyOf, 6);
    expect(groups.map((g) => g.label)).toEqual(['A–C', 'D', 'E–G']);
    expect(groups[0].items.map((i) => i.letter)).toEqual(['A', 'B', 'C']);
  });

  it('no junta toldos iguales que no son vecinos', () => {
    const groups = collapseAwnings(items(['a', 'b', 'a', 'b', 'a', 'b', 'a']), keyOf, 6);
    expect(groups).toHaveLength(7);
  });

  it('justo en el límite no agrupa', () => {
    expect(collapseAwnings(items(['a', 'a', 'a', 'a', 'a', 'a']), keyOf, 6)).toHaveLength(6);
    expect(collapseAwnings(items(['a', 'a', 'a', 'a', 'a', 'a', 'a']), keyOf, 6)).toHaveLength(1);
  });
});
