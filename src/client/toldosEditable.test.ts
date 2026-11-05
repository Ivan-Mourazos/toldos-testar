import { describe, expect, it } from 'vitest';
import { generateState, puedeCorregir } from './generatePermission';
import { autoriaToldos, avisoAprobacionToldos } from '../toldosEditable.js';
import { pasoCorteEditable } from './flujoCorteDwg';

// Plan del 05/11: sustituye la regla por autor, sin cambiar puertas ni remolques.
describe('permisos de toldos editables', () => {
  it('editar no convierte al compañero en revisor; se toma a quien aprobó o pasó la OF', () => {
    const order = { technician: 'ANA', reviewer: 'IVÁN', awnings: [{ of: '1' }] };
    expect(autoriaToldos(order, 'IVÁN', null, ['JAIME'])).toEqual({ technician: 'ANA', reviewer: '' });
    expect(autoriaToldos(order, 'IVÁN', { disponible: true, ofs: { '0000001': { estado: 'pasada', revisor: 'jaime' } } }, ['JAIME']))
      .toEqual({ technician: 'ANA', reviewer: 'JAIME' });
  });
  it('avisa aunque solo una OF esté aprobada, e identifica cuáles', () => {
    const aviso = avisoAprobacionToldos([{ of: '1' }, { of: '2' }], { disponible: true,
      ofs: { '0000001': { estado: 'aprobada' }, '0000002': { estado: 'en_revision' } } });
    expect(aviso).toContain('0000001'); expect(aviso).not.toContain('0000002');
    expect(aviso).toContain('estos cambios no los ha revisado nadie');
  });
  it('sin corte previo y sin OF, Abrir corte espera y explica qué falta', () => {
    expect(pasoCorteEditable({ activo: true, borrador: false }, 'Falta la OF')).toEqual({ paso: 'incompleto', motivo: 'Falta la OF' });
  });
  it('no abre como nuevo un plano viejo después de regenerar en simulación', () => {
    expect(pasoCorteEditable({ activo: true, borrador: true, corteSimulado: true }, null))
      .toEqual({ paso: 'incompleto', motivo: 'El corte se calculó en simulación: regénéralo para abrir el plano.' });
  });
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
