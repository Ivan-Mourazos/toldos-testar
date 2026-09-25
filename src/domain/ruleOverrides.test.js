// Iván, 25/09/2026: el aviso de la excepción técnica tiene que casar con lo cambiado.
import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';

const base = { orderCode: 'AR-EXCEPCION', fabric: 'ACR NEGRO', sameFabric: true, structureColor: 'BLANCO' };
// Cortina de 598 con el candado y los valores que rellena la tarjeta al activarlo.
const cortina = {
  id: 'c', of: '0200001', model: 'CORTINA', units: 1, width: 598, projection: 200, valanceHeight: 0,
  device: 'MAQ. INTERIOR', crankHeight: 170, machineSide: 'M.F.DER', placement: 'FRONTAL', rotFabric: 'NO',
  curtainHasWindow: false, curtainFinish: 'NORMAL', reglasModificadas: true, curtainFabricDeductionCm: 18,
  curtainFabricWidthDiscountCm: 12, curtainRollTubeDiscountCm: 11, curtainLoadProfileDiscountCm: 11
};
const exceptionWarnings = (result) => result.diagnostics.filter((item) => /^Excepción técnica/.test(item.message));

describe('excepción técnica coherente', () => {
  test('un frente por encima del máximo, sin tocar nada más: el aviso dice solo eso', () => {
    const result = calculateOrder({ ...base, awnings: [cortina] });
    const [warning] = exceptionWarnings(result);
    expect(exceptionWarnings(result)).toHaveLength(1);
    expect(warning.message).toContain('598x200 cm, máximo 500x400 cm');
    expect(warning.message).not.toContain('normal');
    expect(result.ofs[0].calculation.exception.changes).toEqual([]);
  });

  test('un descuento cambiado sale con su valor normal; los que no se tocan, no', () => {
    const result = calculateOrder({ ...base, awnings: [{ ...cortina, curtainFabricWidthDiscountCm: 13 }] });
    expect(result.ofs[0].calculation.exception.changes).toEqual([
      { field: 'curtainFabricWidthDiscountCm', label: 'Descuento frente tela', value: 13, standard: 12 }
    ]);
    expect(exceptionWarnings(result)[0].message).toContain('Descuento frente tela 13 (normal 12)');
  });

  test('candado activado sin cambios ni motivo: lo dice así', () => {
    const result = calculateOrder({ ...base, awnings: [{ ...cortina, width: 400 }] });
    expect(exceptionWarnings(result)[0].message).toContain('activada sin cambios');
  });
});
