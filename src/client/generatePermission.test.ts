import { describe, expect, it } from 'vitest';
import { canGenerateReview, generateState } from './generatePermission';

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

  it('un estado que el servidor no genera tampoco se puede generar aquí', () => {
    expect(canGenerateReview('ARCHIVED', 'IVÁN', 'IVÁN')).toBe(false);
    expect(canGenerateReview('', '', 'IVÁN')).toBe(false);
  });

  it('pedido histórico sin autor: puede generarlo cualquiera', () => {
    expect(canGenerateReview('PENDING_REVIEW', '', 'IVÁN')).toBe(true);
    expect(canGenerateReview('APPROVED', '', 'ÁNGEL')).toBe(true);
    expect(canGenerateReview('PENDING_REVIEW', '', '')).toBe(true);
  });
});

const review = (technician: string, ofs: string[], status = 'PENDING_REVIEW') => ({
  status,
  order: { technician, awnings: ofs.map((of) => ({ of })) }
}) as unknown as Parameters<typeof generateState>[0];
const aprobado = { disponible: true, ofs: { '0230194': { estado: 'aprobada' } } };

describe('generateState', () => {
  it('el autor con todo aprobado puede', () => {
    expect(generateState(review('IVÁN', ['0230194']), 'IVÁN', aprobado)).toEqual({ allowed: true, note: '' });
  });
  it('otro usuario no, aunque esté aprobado', () => {
    expect(generateState(review('ÁNGEL', ['0230194']), 'IVÁN', aprobado)).toEqual({ allowed: false, note: 'Lo genera el autor (Ángel)' });
  });
  it('sin aprobar, dice qué falta', () => {
    expect(generateState(review('IVÁN', ['0230194']), 'IVÁN', { disponible: true, ofs: { '0230194': { estado: 'en_revision' } } }))
      .toEqual({ allowed: false, note: 'Sin aprobar en CoordinaOT: A (0230194) en revisión.' });
  });
  it('mientras carga, apagado y con nota', () => {
    expect(generateState(review('IVÁN', ['0230194']), 'IVÁN', null)).toEqual({ allowed: false, note: 'Comprobando la aprobación en CoordinaOT…' });
  });
  it('ya generado: nada', () => {
    expect(generateState(review('IVÁN', ['0230194'], 'PRODUCED'), 'IVÁN', aprobado)).toEqual({ allowed: false, note: '' });
  });
});
