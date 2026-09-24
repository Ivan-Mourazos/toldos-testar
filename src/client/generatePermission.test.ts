import { describe, expect, it } from 'vitest';
import { canGenerateReview } from './generatePermission';

describe('canGenerateReview — el permiso de generar (autor sí, otros no)', () => {
  it('el autor puede generar', () => {
    expect(canGenerateReview('PENDING_REVIEW', 'IVÁN', 'IVÁN')).toBe(true);
    expect(canGenerateReview('APPROVED', 'IVÁN', 'IVÁN')).toBe(true);
    expect(canGenerateReview('CHANGES_REQUESTED', 'IVÁN', 'IVÁN')).toBe(true);
  });

  it('otro técnico no puede generar', () => {
    expect(canGenerateReview('PENDING_REVIEW', 'IVÁN', 'ÁNGEL')).toBe(false);
    expect(canGenerateReview('APPROVED', 'IVÁN', 'ÁNGEL')).toBe(false);
  });

  it('ya generado (PRODUCED), nadie puede volver a generar, ni el autor', () => {
    expect(canGenerateReview('PRODUCED', 'IVÁN', 'IVÁN')).toBe(false);
    expect(canGenerateReview('PRODUCED', '', 'IVÁN')).toBe(false);
  });

  it('pedido histórico sin autor: puede generarlo cualquiera', () => {
    expect(canGenerateReview('PENDING_REVIEW', '', 'IVÁN')).toBe(true);
    expect(canGenerateReview('APPROVED', '', 'ÁNGEL')).toBe(true);
    expect(canGenerateReview('PENDING_REVIEW', '', '')).toBe(true);
  });
});
