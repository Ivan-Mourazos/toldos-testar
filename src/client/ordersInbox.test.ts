import { describe, expect, it } from 'vitest';
import { borradoresVisibles, claveBandeja, collapseAwnings, detalleEnColumnas, notasDevolucion, fechaBorrador, groupByDay, inboxSections, limitModels, mergePendingReviews, pendingGroups, pendingYears, productoDe } from './ordersInbox';
import type { ResumenBorrador } from '../borradores/tipos.ts';
import type { CoordinaStatus, PedidoBandeja, ReviewSummary } from './types';

const review = (orderCode: string, status: string, technician: string, extra: Record<string, unknown> = {}) => ({
  orderCode, status, updatedAt: '2026-09-24T09:00:00Z',
  summary: { customer: 'Cliente', technician, ofs: ['0230194'], models: ['ARZUA PRO'], awnings: 1, reviewer: '', orderDate: '', diagnostics: 0 },
  ...extra
}) as unknown as PedidoBandeja;

describe('System Dock en Pedidos', () => {
  it('clasifica y filtra pedidos antiguos guardados como puertas, también en el historial', () => {
    const lona = review('AR2600001', 'PENDING_REVIEW', 'IVÁN', { kind: 'puertas', summary: { models: ['System Dock'], technician: 'IVÁN' } });
    const puerta = review('AR2600002', 'PENDING_REVIEW', 'IVÁN', { kind: 'puertas', summary: { models: ['Enrollable'], technician: 'IVÁN' } });
    expect(productoDe(lona)).toBe('systemdock');
    expect(claveBandeja(lona)).toBe('systemdock:AR2600001');
    const listas = { pending: [lona, puerta], history: [{ ...lona, status: 'PRODUCED' } as PedidoBandeja] };
    const filtro = { me: 'IVÁN', scope: 'all' as const, query: '', producto: 'systemdock' as const };
    expect(inboxSections(listas, filtro).pending).toEqual([lona]);
    expect(inboxSections(listas, filtro).history).toHaveLength(1);
    expect(inboxSections(listas, { ...filtro, producto: 'puertas' }).pending).toEqual([puerta]);
  });
});

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

  it('el historial va del más reciente al más antiguo aunque mezcle toldos y remolques (Iván, 21/10/2026)', () => {
    // Llegan primero los toldos y después los remolques: el remolque generado hoy (AR2605158) quedaba al final.
    const toldos = [review('AR2605104', 'PRODUCED', 'TAMARA', { updatedAt: '2026-10-20T12:00:00Z' }), review('AR2605001', 'PRODUCED', 'IVÁN', { updatedAt: '2026-10-19T12:00:00Z' })];
    const remolques = [review('AR2605158', 'PRODUCED', 'IVÁN', { kind: 'remolques', updatedAt: '2026-10-21T09:00:00Z' })];
    const result = inboxSections({ pending: [], history: [...toldos, ...remolques] }, { me: 'IVÁN', scope: 'all', query: '' });
    expect(result.history.map((r) => r.orderCode)).toEqual(['AR2605158', 'AR2605104', 'AR2605001']);
    expect(groupByDay(result.history)[0].reviews.map((r) => r.orderCode)).toEqual(['AR2605158']);
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

describe('notasDevolucion — la nota de CoordinaOT, una vez por OF', () => {
  const devuelta = { disponible: true, ofs: { '0232762': { estado: 'devuelta', nota: 'Falta la medida de la solapa' }, '0232764': { estado: 'aprobada' } } } as CoordinaStatus;

  it('18 cortinas con la misma OF (AR2604890): la nota sale en la primera, con los toldos que la comparten', () => {
    const items = Array.from({ length: 18 }, (_, i) => ({ letter: String.fromCharCode(65 + i), of: '232762' }));
    const notas = notasDevolucion([...items, { letter: 'S', of: '0232764' }], devuelta);
    expect(Object.keys(notas)).toEqual(['A']);
    expect(notas.A).toEqual({ nota: 'Falta la medida de la solapa', letras: 'A–R' });
  });

  it('con una OF por toldo, cada nota en su toldo y sin letras', () => {
    const status = { disponible: true, ofs: { '0230001': { estado: 'devuelta', nota: 'uno' }, '0230002': { estado: 'en_revision', nota: '' }, '0230003': { estado: 'devuelta', nota: 'tres' } } } as CoordinaStatus;
    const notas = notasDevolucion([{ letter: 'A', of: '0230001' }, { letter: 'B', of: '0230002' }, { letter: 'C', of: '0230003' }], status);
    expect(notas).toEqual({ A: { nota: 'uno', letras: '' }, C: { nota: 'tres', letras: '' } });
  });

  it('toldos de la misma OF que no son seguidos se nombran uno a uno', () => {
    const notas = notasDevolucion([{ letter: 'A', of: '0232762' }, { letter: 'B', of: '0232764' }, { letter: 'C', of: '0232762' }], devuelta);
    expect(notas).toEqual({ A: { nota: 'Falta la medida de la solapa', letras: 'A, C' } });
  });

  it('sin CoordinaOT no hay notas', () => {
    expect(notasDevolucion([{ letter: 'A', of: '0232762' }], { disponible: false } as CoordinaStatus)).toEqual({});
    expect(notasDevolucion([{ letter: 'A', of: '0232762' }], null)).toEqual({});
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

describe('limitModels', () => {
  it('quita repetidos y con hasta 4 modelos los enseña todos', () => {
    expect(limitModels(['A', 'B', 'A', 'C', 'D'])).toEqual({ visible: ['A', 'B', 'C', 'D'], hidden: [] });
  });

  it('con más de 4 enseña los 3 primeros y deja el resto para el «+N»', () => {
    expect(limitModels(['A', 'B', 'C', 'D', 'E', 'F', 'G'])).toEqual({ visible: ['A', 'B', 'C'], hidden: ['D', 'E', 'F', 'G'] });
  });

  it('sin modelos devuelve vacío', () => {
    expect(limitModels(undefined)).toEqual({ visible: [], hidden: [] });
  });
});

describe('toldos y remolques juntos (fase 5)', () => {
  const toldo = review('AR2601', 'PENDING_REVIEW', 'IVÁN');
  const remolque = review('AR2601', 'PENDING_REVIEW', 'JAIME', {
    kind: 'remolques', numeroPedido: 'AR.26.01',
    summary: { customer: 'Talleres', technician: 'JAIME', ofs: ['0231780'], models: ['Arquillado con aguas'], awnings: 1, reviewer: '', orderDate: '', diagnostics: 0 },
  });
  const generadoRemolque = review('AR2602', 'PRODUCED', 'JAIME', { kind: 'remolques', numeroPedido: 'AR.26.02' });
  const generadoToldo = review('AR2603', 'PRODUCED', 'IVÁN');

  it('cada pedido dice de qué es; el mismo número en los dos son dos filas', () => {
    expect([productoDe(toldo), productoDe(remolque)]).toEqual(['toldos', 'remolques']);
    expect([claveBandeja(toldo), claveBandeja(remolque)]).toEqual(['toldos:AR2601', 'remolques:AR2601']);
    expect(mergePendingReviews([[toldo], [remolque]])).toHaveLength(2);
  });

  it('el filtro deja solo los de un tipo, en pendientes y en generados, y cuenta solo esos', () => {
    const fuentes = { pending: [toldo, remolque], history: [generadoRemolque, generadoToldo] };
    const solo = inboxSections(fuentes, { me: 'IVÁN', scope: 'all', query: '', producto: 'remolques' });
    expect([solo.pending.map(claveBandeja), solo.history.map(claveBandeja), solo.pendingAll]).toEqual([['remolques:AR2601'], ['remolques:AR2602'], 1]);
    const toldos = inboxSections(fuentes, { me: 'IVÁN', scope: 'all', query: '', producto: 'toldos' });
    expect([toldos.pending.map(claveBandeja), toldos.history.map(claveBandeja)]).toEqual([['toldos:AR2601'], ['toldos:AR2603']]);
    expect(inboxSections(fuentes, { me: 'IVÁN', scope: 'all', query: '' }).pending).toHaveLength(2);
  });

  it('busca el perfil del remolque y el número como se escribió', () => {
    const fuentes = { pending: [toldo, remolque], history: [] };
    expect(inboxSections(fuentes, { me: 'IVÁN', scope: 'all', query: 'arquillado' }).pending.map(claveBandeja)).toEqual(['remolques:AR2601']);
    expect(inboxSections(fuentes, { me: 'IVÁN', scope: 'all', query: 'AR.26.01' }).pending.map(claveBandeja)).toEqual(['remolques:AR2601']);
  });
});

describe('borradoresVisibles', () => {
  const borrador = (orderCode: string, kind: 'toldos' | 'remolques', savedBy: string, updatedAt: string, extra: Partial<ResumenBorrador> = {}) => ({
    schemaVersion: 1, kind, orderCode, numeroPedido: orderCode, savedBy, createdAt: updatedAt, updatedAt,
    summary: { customer: 'Cliente', orderDate: '', elementos: 1, models: ['ARZUA PRO'] }, ...extra,
  }) as ResumenBorrador;
  const lista = [
    borrador('AR2601', 'toldos', 'IVÁN', '2026-10-01T08:00:00Z'),
    borrador('AR2602', 'remolques', 'JAIME', '2026-10-01T09:00:00Z', { numeroPedido: 'AR.26.02', summary: { customer: 'Talleres', orderDate: '', elementos: 2, models: ['Arquillado'] } }),
  ];
  const codigos = (filtro: Parameters<typeof borradoresVisibles>[1]) => borradoresVisibles(lista, filtro).map((b) => b.orderCode);

  it('todos, del más reciente al más antiguo', () => {
    expect(codigos({ me: 'IVÁN', scope: 'all', query: '' })).toEqual(['AR2602', 'AR2601']);
  });
  it('el filtro de tipo y «Míos» (los que guardé yo)', () => {
    expect(codigos({ me: 'IVÁN', scope: 'all', query: '', producto: 'toldos' })).toEqual(['AR2601']);
    expect(codigos({ me: 'IVÁN', scope: 'all', query: '', producto: 'remolques' })).toEqual(['AR2602']);
    expect(codigos({ me: 'IVÁN', scope: 'mine', query: '' })).toEqual(['AR2601']);
  });
  it('busca número (también como se escribió), cliente y modelo, sin tildes ni mayúsculas', () => {
    expect(codigos({ me: 'IVÁN', scope: 'all', query: 'ar.26.02' })).toEqual(['AR2602']);
    expect(codigos({ me: 'IVÁN', scope: 'all', query: 'talleres' })).toEqual(['AR2602']);
    expect(codigos({ me: 'IVÁN', scope: 'all', query: 'arzua' })).toEqual(['AR2601']);
  });
  it('fechaBorrador: día, mes y hora', () => {
    expect(fechaBorrador('2026-10-01T09:30:00')).toMatch(/^01\/10,? 09:30$/);
    expect(fechaBorrador('no')).toBe('—');
  });
});

// Iván, 02/10/2026: con muchos elementos, el desplegable en columnas en vez de una fila por OF.
describe('detalleEnColumnas', () => {
  it('hasta 3 elementos, una fila por OF; con más, en columnas', () => {
    expect([0, 1, 3].map(detalleEnColumnas)).toEqual([false, false, false]);
    expect([4, 11].map(detalleEnColumnas)).toEqual([true, true]);
  });
});
