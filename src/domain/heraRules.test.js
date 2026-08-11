import { describe, expect, test } from 'vitest';
import { calculateOrder } from './rules.js';
import { normalizeOrder, normalizeReservation } from './validation.js';

const soltis267 = 'SOLTIS96NUBP267|||267|||SOLTIS 96 NUBE|||SOLTIS 96';
const acrylic120 = 'ACRILI2170P120|||120|||LONA ACRILICA NEGRA|||ACR';

function hera(overrides = {}, orderOverrides = {}) {
  return calculateOrder({
    orderCode: 'AR26HERA',
    sameFabric: true,
    fabric: soltis267,
    awnings: [{
      id: 'hera-a',
      of: '0231000',
      model: 'HERA',
      submodel: 'HERA 56 MAQUINA',
      heraJoin: 'NINGUNO',
      units: 1,
      width: 163.5,
      projection: 165,
      height: 230,
      ...overrides
    }],
    ...orderOverrides
  });
}

describe('reglas HERA', () => {
  test('HERA 56 máquina reproduce el caso AR.24.00727 y solo reserva la tela', () => {
    const result = hera();
    const ofBlock = result.ofs[0];

    expect(ofBlock.calculation).toMatchObject({
      valid: true,
      rollTubeLength: 159.8,
      fabricWidth: 159,
      fabricDrop: 190,
      chainLength: 260,
      fabricPanels: 1,
      fabricMl: 1.9,
      reservedFabricMl: 2,
      requiresCad: true
    });
    expect(ofBlock.materials).toEqual([{
      code: 'SOLTIS96NUBP267', quantity: 1.9, description: 'SOLTIS 96 NUBE'
    }]);
    expect(ofBlock.despiece).toBeNull();
    expect(result.diagnostics.some((item) => item.level === 'warn' && item.message.includes('CAD'))).toBe(true);
  });

  test('HERA 43 máquina aplica -3,3, -4, +20 y la cadena desde altura -70', () => {
    const result = hera({
      submodel: 'HERA 43 MAQUINA', width: 205, projection: 140, height: 240,
      heraJoin: 'VERTICAL'
    }, { fabric: acrylic120 });

    expect(result.ofs[0].calculation).toMatchObject({
      valid: true,
      rollTubeLength: 201.7,
      fabricWidth: 201,
      fabricDrop: 160,
      chainLength: 340,
      acrylicHemAllowanceCm: 6,
      fabricCutWidth: 209,
      fabricCutDrop: 170,
      fabricPanels: 2,
      seamCount: 1,
      fabricMl: 3.4,
      reservedFabricMl: 3.5
    });
  });

  test('HERA 56 motor aplica sus descuentos y no calcula cadena ni exige altura', () => {
    const result = hera({
      submodel: 'HERA 56 MOTOR', width: 250, projection: 160, height: 0
    });

    expect(result.ofs[0].calculation).toMatchObject({
      valid: true,
      rollTubeLength: 245.5,
      fabricWidth: 245,
      fabricDrop: 185,
      chainLength: null
    });
  });

  test('el acrílico suma 3 cm por bastilla lateral antes de comprobar el rollo', () => {
    const fits = hera({ width: 100, projection: 100, submodel: 'HERA 43 MAQUINA', height: 200 }, { fabric: acrylic120 });
    expect(fits.ofs[0].calculation).toMatchObject({
      fabricWidth: 96,
      fabricCutWidth: 102,
      acrylicHemAllowanceCm: 6,
      fabricPanels: 1
    });

    const doesNotFit = hera({ width: 205, submodel: 'HERA 43 MAQUINA', height: 200 }, { fabric: acrylic120 });
    expect(doesNotFit.ofs[0].calculation.valid).toBe(false);
    expect(doesNotFit.ofs[0].materials).toEqual([]);
    expect(doesNotFit.diagnostics.some((item) => item.level === 'error' && item.message.includes('no cabe'))).toBe(true);
  });

  test('empate vertical suma 2 cm por unión y 10 cm para escuadrar la caída', () => {
    const result = hera({
      width: 200, projection: 250, heraJoin: 'VERTICAL'
    }, { fabric: acrylic120 });

    expect(result.ofs[0].calculation).toMatchObject({
      fabricWidth: 195.5,
      fabricDrop: 275,
      fabricCutWidth: 203.5,
      fabricCutDrop: 285,
      fabricPanels: 2,
      seamCount: 1,
      seamAllowanceCm: 2,
      squaringAllowanceCm: 10,
      fabricMl: 5.7
    });
  });

  test('empate horizontal suma 2 cm por unión a la caída y consume el frente escuadrado', () => {
    const result = hera({
      width: 200, projection: 250, heraJoin: 'HORIZONTAL'
    }, { fabric: acrylic120 });

    expect(result.ofs[0].calculation).toMatchObject({
      fabricWidth: 195.5,
      fabricDrop: 275,
      fabricCutWidth: 211.5,
      fabricCutDrop: 279,
      fabricPanels: 3,
      seamCount: 2,
      seamAllowanceCm: 4,
      squaringAllowanceCm: 10,
      fabricMl: 6.345,
      reservedFabricMl: 6.5
    });
  });

  test('un empate indicado por cliente fuerza al menos dos paños aunque la pieza cupiese entera', () => {
    const result = hera({ width: 100, projection: 100, heraJoin: 'VERTICAL' });
    expect(result.ofs[0].calculation).toMatchObject({ fabricPanels: 2, seamCount: 1 });
  });

  test('más de 300 cm mantiene el cálculo válido y avisa de tubo especial y presupuesto', () => {
    const result = hera({ width: 320, heraJoin: 'VERTICAL' });
    expect(result.ofs[0].calculation).toMatchObject({ valid: true, specialTubeRequired: true });
    expect(result.diagnostics.some((item) => item.level === 'warn' && item.message.includes('tubo especial') && item.message.includes('presupuesto'))).toBe(true);
  });

  test('máquina exige altura positiva y una cadena resultante mayor que cero', () => {
    const missing = hera({ height: 0 });
    expect(missing.ofs[0].calculation.valid).toBe(false);
    expect(missing.diagnostics.some((item) => item.message.includes('falta altura'))).toBe(true);

    const negative = hera({ height: 90 });
    expect(negative.ofs[0].calculation.valid).toBe(false);
    expect(negative.diagnostics.some((item) => item.message.includes('produce una cadena'))).toBe(true);
  });

  test('rechaza medidas que no producen tubo y tela positivos', () => {
    const result = hera({ width: 3, projection: 100 });

    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.ofs[0].materials).toEqual([]);
    expect(result.diagnostics.some((item) => item.level === 'error' && item.message.includes('tubo y tela positivos'))).toBe(true);
  });

  test('normaliza nombres históricos y conserva la decisión de empate', () => {
    const normalized = normalizeOrder({
      orderCode: 'AR26HERA', fabric: soltis267,
      awnings: [{ of: '1', model: 'HERA56', device: 'MOTOR', width: 200, projection: 150, heraJoin: 'sin empate' }]
    });

    expect(normalized.awnings[0]).toMatchObject({
      model: 'HERA', submodel: 'HERA 56 MOTOR', heraJoin: 'NINGUNO', height: 0
    });
  });

  test('la reserva suma primero los HERA de la misma OF y redondea después a 0,5 ml', () => {
    const calculation = calculateOrder({
      orderCode: 'AR26HERA', fabric: soltis267,
      awnings: [1, 2].map((index) => ({
        id: `hera-${index}`, of: '0231000', model: 'HERA', submodel: 'HERA 56 MOTOR',
        heraJoin: 'NINGUNO', units: 1, width: 200, projection: 101, height: 0
      }))
    });
    const reservation = normalizeReservation({ orderCode: 'AR26HERA', ofs: calculation.ofs });

    expect(calculation.ofs.map((item) => item.calculation.fabricMl)).toEqual([1.26, 1.26]);
    expect(reservation.ofs[0].materials).toEqual([{
      code: 'SOLTIS96NUBP267', description: 'SOLTIS 96 NUBE', quantity: 3
    }]);
  });
});
