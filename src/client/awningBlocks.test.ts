import { describe, expect, it } from 'vitest';
import { awningStatus, cardsPerPage, pageCount, pageLabel, pageOfIndex } from './awningBlocks';

describe('toldos por bloques (rediseño 24/09/2026 §6)', () => {
  it('caben tarjetas de 420 px como mínimo, hasta 3', () => {
    expect(cardsPerPage(1208)).toBe(2); // 1280 menos márgenes
    expect(cardsPerPage(1528)).toBe(3); // 1600 menos márgenes
    expect(cardsPerPage(800)).toBe(1);
    expect(cardsPerPage(0)).toBe(1);
    expect(cardsPerPage(2400)).toBe(3);
  });

  it('páginas y página de cada toldo', () => {
    expect(pageCount(10, 3)).toBe(4);
    expect(pageCount(0, 3)).toBe(1);
    expect(pageOfIndex(0, 3)).toBe(0);
    expect(pageOfIndex(3, 3)).toBe(1);
    expect(pageOfIndex(9, 2)).toBe(4);
  });

  it('rótulo «D – F de 10» y uno solo «J de 10»', () => {
    expect(pageLabel(1, 3, 10)).toBe('D – F de 10');
    expect(pageLabel(3, 3, 10)).toBe('J de 10');
    expect(pageLabel(0, 2, 2)).toBe('A – B de 2');
  });

  it('estado de cada toldo para el índice', () => {
    expect(awningStatus([], [])).toEqual({ kind: 'ok', label: '✓' });
    expect(awningStatus([{}, {}], [{ level: 'error' }])).toEqual({ kind: 'missing', label: 'falta 2' });
    expect(awningStatus([], [{ level: 'error' }, { level: 'pending' }])).toEqual({ kind: 'error', label: '2 errores' });
    expect(awningStatus([], [{ level: 'error' }])).toEqual({ kind: 'error', label: '1 error' });
    expect(awningStatus([], [{ level: 'warn' }])).toEqual({ kind: 'warn', label: '1 aviso' });
    expect(awningStatus([], [{ level: 'warn' }, { level: 'warn' }])).toEqual({ kind: 'warn', label: '2 avisos' });
  });
});
