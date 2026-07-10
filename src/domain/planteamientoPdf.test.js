import { describe, expect, test } from 'vitest';
import { resolveMaterialRows } from './planteamientoPdf.js';

function materialsOf(count) {
  return Array.from({ length: count }, (_, index) => ({
    code: `ART-${index}`,
    description: `Descripcion ${index}`,
    quantity: index + 1
  }));
}

describe('resolveMaterialRows', () => {
  test('deja pasar todas las lineas cuando caben (<= maxRows)', () => {
    const materials = materialsOf(11);
    const { rows, overflowLabel } = resolveMaterialRows(materials);
    expect(rows).toHaveLength(11);
    expect(rows).toEqual(materials);
    expect(overflowLabel).toBeNull();
  });

  test('10 lineas (MAQ. EXTERIOR EVO) se muestran completas sin recorte', () => {
    const materials = materialsOf(10);
    const { rows, overflowLabel } = resolveMaterialRows(materials);
    expect(rows).toHaveLength(10);
    expect(overflowLabel).toBeNull();
  });

  test('nunca pierde lineas en silencio: si excede maxRows, recorta y añade fila de resumen', () => {
    const materials = materialsOf(14);
    const { rows, overflowLabel } = resolveMaterialRows(materials, 11);
    expect(rows).toHaveLength(10);
    expect(rows).toEqual(materials.slice(0, 10));
    expect(overflowLabel).toBe('... y 4 lineas mas (ver RPS)');
  });

  test('respeta un maxRows distinto al por defecto', () => {
    const materials = materialsOf(5);
    const { rows, overflowLabel } = resolveMaterialRows(materials, 4);
    expect(rows).toHaveLength(3);
    expect(overflowLabel).toBe('... y 2 lineas mas (ver RPS)');
  });
});
