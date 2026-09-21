import { describe, expect, it } from 'vitest';
import { fullAwningModelNames, sampleAwnings } from './model-samples.mjs';

describe('casos válidos por modelo', () => {
  // Si un modelo no produce ninguno, las herramientas que barren el catálogo
  // concluyen en silencio que no reserva nada. Mejor que falle aquí.
  it.each(fullAwningModelNames)('%s produce al menos un caso válido con materiales', (model) => {
    expect(sampleAwnings(model).length).toBeGreaterThan(0);
  });

  it('solo devuelve casos que el cálculo da por válidos', () => {
    for (const { result } of sampleAwnings('MONOBLOCK 350')) {
      expect(result.ofs[0].calculation.valid).toBe(true);
    }
  });
});
