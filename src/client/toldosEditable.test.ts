import { describe, expect, it } from 'vitest';
import { generateState, puedeCorregir } from './generatePermission';

// Plan del 05/11: sustituye la regla por autor, sin cambiar puertas ni remolques.
describe('permisos de toldos editables', () => {
  it.each(['PENDING_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'])('cualquier compañero edita en %s sin CoordinaOT', status => {
    expect(puedeCorregir(status, [], 'ANA', 'IVÁN', null, true)).toBe(true);
  });
  it('con todas aprobadas o pasadas, genera cualquier compañero', () => {
    const review = { status: 'APPROVED', order: { technician: 'ANA', awnings: [{ of: '1' }, { of: '2' }] } } as Parameters<typeof generateState>[0];
    expect(generateState(review, 'IVÁN', { disponible: true, ofs: { '0000001': { estado: 'aprobada' }, '0000002': { estado: 'pasada' } } }).allowed).toBe(true);
  });
  it('un generado sigue sin corregirse y hace falta haber elegido Soy', () => {
    expect(puedeCorregir('PRODUCED', [], 'ANA', 'IVÁN', null, true)).toBe(false);
    expect(puedeCorregir('APPROVED', [], 'ANA', '', null, true)).toBe(false);
  });
});
