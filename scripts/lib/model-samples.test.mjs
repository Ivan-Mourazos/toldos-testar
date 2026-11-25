import { describe, expect, it } from 'vitest';
import { firstSampleAwning, fullAwningModelNames, sampleAwnings } from './model-samples.mjs';

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

  it('devuelve copias independientes para cada consulta del mismo modelo y lacado', () => {
    const original = sampleAwnings('ARZUA PRO');
    const copia = sampleAwnings('ARZUA PRO');
    copia[0].awning.width = 9999;
    copia[0].result.ofs[0].materials.length = 0;
    copia.pop();
    expect(sampleAwnings('ARZUA PRO')).toEqual(original);
  });

  it('distingue los lacados de un mismo modelo', () => {
    expect(sampleAwnings('ARZUA PRO')[0].awning.structureColor).toBe('BLANCO');
    const lacado = 'GRIS (R-07022)';
    const primeras = sampleAwnings('ARZUA PRO', lacado, { limit: 3 });
    const todas = sampleAwnings('ARZUA PRO', lacado);
    expect(todas.length).toBeGreaterThan(3);
    expect(todas.slice(0, 3)).toEqual(primeras);
    expect(todas.every(({ awning }) => awning.structureColor === lacado)).toBe(true);
  });

  it('el primer caso válido respeta el orden y el filtro del barrido completo', () => {
    const filtro = ({ awning }) => awning.projection === 300;
    const muestras = sampleAwnings('ARZUA PRO');
    expect(firstSampleAwning('ARZUA PRO')).toEqual(muestras[0]);
    expect(firstSampleAwning('ARZUA PRO', filtro)).toEqual(muestras.find(filtro));
  });
});
