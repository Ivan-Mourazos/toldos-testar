import { describe, expect, it } from 'vitest';
import { decisionRegenerar, generarToldosPermitido } from './toldosEditable.js';
import { createReviewPackage } from './workflow.js';

describe('guardar toldos con corte', () => {
  const anterior = { order: { notes: 'Antes' }, corteLona: { toldos: [] } };
  it('pregunta si hay cambios y corte, incluso sin DWG aceptado', () => {
    expect(decisionRegenerar(anterior, { notes: 'Ahora' }, true)).toBe('preguntar');
    expect(decisionRegenerar(anterior, anterior.order, true)).toBe('seguir');
    expect(decisionRegenerar(null, {}, false)).toBe('seguir');
  });
  it('mantener conserva la marca y regenerar la quita', () => {
    expect(decisionRegenerar(anterior, { notes: 'Ahora' }, true, 'mantener')).toBe('mantener');
    expect(decisionRegenerar(anterior, { notes: 'Ahora' }, true, 'regenerar')).toBe('regenerar');
  });
  it('cambiar los ajustes del corte pregunta aunque no cambie el formulario', () => {
    expect(decisionRegenerar(anterior, anterior.order, true, undefined, true)).toBe('preguntar');
  });
  it('cambiar parámetros de cálculo también pregunta; cambiar el cajetín no', () => {
    const existing = { order: { technician: 'ANA', parameters: { aumento: 2 } } };
    expect(decisionRegenerar(existing, { technician: 'IVÁN', parameters: { aumento: 2 } }, true)).toBe('seguir');
    expect(decisionRegenerar(existing, { technician: 'ANA', parameters: { aumento: 3 } }, true)).toBe('preguntar');
  });
  it('generar exige todas las OF aprobadas o pasadas, sin mirar el autor', () => {
    const ofs = [{ letter: 'A', of: '1' }, { letter: 'B', of: '2' }];
    const estado = { disponible: true, ofs: { '0000001': { estado: 'aprobada' }, '0000002': { estado: 'pasada' } } };
    expect(generarToldosPermitido(ofs, estado)).toBeNull();
    estado.ofs['0000002'].estado = 'en_revision';
    expect(generarToldosPermitido(ofs, estado)).toContain('Sin aprobar');
  });
  it('conserva al creador y apunta quién guardó y cuándo en pedidos antiguos', () => {
    const review = createReviewPackage({ order: { orderCode: 'AR2600096', technician: 'ANA', awnings: [] }, calculation: { ofs: [], diagnostics: [] },
      existing: { createdBy: 'ANA', createdAt: 'antes' }, savedBy: 'IVÁN', now: 'ahora' });
    expect(review).toMatchObject({ createdBy: 'ANA', createdAt: 'antes', updatedBy: 'IVÁN', updatedAt: 'ahora' });
  });
});
