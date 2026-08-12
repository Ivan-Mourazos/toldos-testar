import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';

const commonOrder = {
  orderCode: 'AR-SAFETY',
  sameFabric: true,
  fabric: 'ALPHANA04P250|||250|||PVC 580 NARANJA|||PLASTICA (LONA)',
  structureColor: 'BLANCO'
};

describe('protecciones del cálculo de tela', () => {
  test.each([
    ['ARZUA PRO', { width: 337, projection: 225, device: 'MAQ. EXTERIOR', tubeLoad: 'TUBO DE CARGA EVO 80', crankHeight: 200 }],
    ['MAXISCREEM', { width: 335, projection: 280, submodel: 'CON CABLE', device: 'MAQUINA', placement: 'FRONTAL', crankHeight: 170 }],
    ['MONOBLOCK 350', { width: 520, projection: 150, armCount: 2, device: 'MAQUINA', placement: 'FRONTAL', crankHeight: 200 }]
  ])('%s ignora una referencia de bamba residual cuando la altura es cero', (model, fields) => {
    const calculate = (valanceFabric) => calculateOrder({
      ...commonOrder,
      awnings: [{
        id: `residual-${model}`,
        of: '0399998',
        model,
        units: 1,
        valanceHeight: 0,
        valanceFabric,
        structureColor: 'BLANCO',
        machineSide: 'M.F.DER',
        wallType: '',
        sensor: 'SIN SENSOR',
        ...fields
      }]
    }).ofs[0].calculation;

    const clean = calculate('');
    const residual = calculate('TELA QUE NO EXISTE');
    expect(residual).toMatchObject({
      valid: true,
      fabricDrop: clean.fabricDrop,
      fabricMl: clean.fabricMl,
      valanceFabricCode: '',
      valanceFabricMl: 0
    });
  });

  test.each([0, -2, 1.5, 'abc', true, Number.POSITIVE_INFINITY])('rechaza la cantidad inválida %s sin producir reservas', (units) => {
    const result = calculateOrder({
      ...commonOrder,
      awnings: [{
        id: `invalid-units-${units}`,
        of: '0399997',
        model: 'CAMBIO TELA',
        units,
        width: 300,
        projection: 250,
        valanceHeight: 0
      }]
    });

    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.ofs[0].materials).toEqual([]);
    expect(result.diagnostics.some(({ message }) => message.includes('entero mayor que cero'))).toBe(true);
  });
});
