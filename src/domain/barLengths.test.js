import { describe, expect, test } from 'vitest';
import { activeProfileLengths, barsForCut, P801_TUBE_LENGTHS, profileLengthsOrWhite, shortestBar } from './barLengths.js';
import { calculateOrder } from './rules.js';

// Taller, 30/09/2026 (Q-A06): se reserva la barra más corta que llegue al corte.
describe('Largo de barra: la más corta que llega (Q-A06)', () => {
  test('elige la más corta que llega, sin margen', () => {
    expect(shortestBar(P801_TUBE_LENGTHS, 327.2)).toBe(400);
    expect(shortestBar(P801_TUBE_LENGTHS, 400)).toBe(400);
    expect(shortestBar(P801_TUBE_LENGTHS, 400.1)).toBe(500);
    expect(shortestBar(P801_TUBE_LENGTHS, 801)).toBeNull();
  });

  test('por encima de la más larga, barras iguales que juntas llegan', () => {
    expect(barsForCut([500, 600, 700], 706)).toEqual([500, 500]);
    expect(barsForCut([500, 600, 700], 1132)).toEqual([600, 600]);
    expect(barsForCut([500, 600, 700], 0)).toEqual([]);
  });

  test('los largos de cada perfil salen de lo que existe en RPS en ese lacado', () => {
    expect(activeProfileLengths('PEVO80', 'BL16')).toEqual([500, 600, 700]);
    expect(activeProfileLengths('PEVO80', 'NE11')).toEqual([500, 700]);
    expect(activeProfileLengths('PUNI280', 'BL10')).toEqual([400, 500, 600, 700]);
  });

  // El Univers 280 en PL06 y ORO está todo de baja: como con cualquier color que no
  // existe (Q-A02), se toma el blanco y la pieza va a lacar.
  test('un perfil todo de baja en ese color toma los largos del blanco', () => {
    expect(activeProfileLengths('PUNI280', 'PL06')).toEqual([]);
    expect(activeProfileLengths('PUNI280', 'ORO')).toEqual([]);
    expect(profileLengthsOrWhite('PUNI280', 'PL06', 'BL10')).toEqual([400, 500, 600, 700]);
  });
});

function arzua(width, overrides = {}) {
  return calculateOrder({
    orderCode: 'AR-TEST', customer: 'TEST', technician: 'IVÁN', fabric: 'ACR VISON', structureColor: 'BLANCO',
    awnings: [{
      of: '12345', model: 'ARZUA PRO', units: 1, width, projection: 250, valanceHeight: 20, device: 'MOTOR',
      tubeLoad: 'TUBO DE CARGA EVO 80', placement: 'FRONTAL', wallType: 'DIRECTA A PARED', sensor: 'SIN SENSOR',
      crankHeight: 170, machineSide: 'M.F.DER', valanceCurve: 'RECTA', rotFabric: 'NO', rotValance: 'NO',
      reglasModificadas: true, ...overrides
    }]
  }).ofs[0];
}

describe('Arzúa Pro: tubo y barra de carga, cada uno el suyo (Q-A06)', () => {
  test('nunca pide barras de 650, que no existen', () => {
    for (let width = 300; width <= 710; width += 5) {
      const codes = arzua(width).materials.map((line) => line.code);
      expect(codes.some((code) => /^(TURA80HG|PEVO80|PUNI280).*650C$/.test(code))).toBe(false);
    }
  });

  test('más de 6 m de frente: tubo y barra de 700', () => {
    const ofBlock = arzua(650);
    expect(ofBlock.calculation).toMatchObject({ valid: true, rollStockLength: 700, stockLength: 700 });
  });

  test('con 450 de frente: tubo de 500 y EVO de 500', () => {
    const codes = arzua(450).materials.map((line) => line.code);
    expect(codes).toEqual(expect.arrayContaining(['TURA80HG500C', 'PEVO80BL16500C']));
  });

  test('con Univers y 390 de frente, tubo y barra de 400', () => {
    const codes = arzua(390, { tubeLoad: 'TUBO DE CARGA UNIVERS 280' }).materials.map((line) => line.code);
    expect(codes).toEqual(expect.arrayContaining(['TURA80HG400C', 'PUNI280BL10400C']));
  });
});

describe('Ágata Box: patines en un color que ya no existe', () => {
  // Q-AG01 + Q-A02: los patines de gris 7016 están de baja desde 2023; van en blanco a lacar.
  test('gris 7016: patines blancos y aviso de lacar', () => {
    const result = calculateOrder({
      orderCode: 'AR-TEST', customer: 'TEST', technician: 'IVÁN', fabric: 'ACR VISON', structureColor: 'GRIS 7016',
      awnings: [{
        of: '12345', model: 'AGATA BOX', units: 1, width: 500, projection: 300, valanceHeight: 25,
        valanceCurve: 'RECTA', rotFabric: 'NO', rotValance: 'NO',
        structureColor: 'GRIS 7016', device: 'MOTOR', placement: 'FRONTAL', submodel: 'OPEN', armCount: 2,
        sensor: 'SIN SENSOR', machineSide: 'M.F.DER', wallType: ''
      }]
    });
    const codes = result.ofs[0].materials.map((line) => line.code);
    expect(codes).toEqual(expect.arrayContaining(['PABMODULBL16', 'PASBMODULBL16']));
    expect(codes).not.toContain('PABMODULGR16');
    expect(result.diagnostics.some((item) => /lacar fuera: .*PABMODULBL16/.test(item.message))).toBe(true);
  });
});
