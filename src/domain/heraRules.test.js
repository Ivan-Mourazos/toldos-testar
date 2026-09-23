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
      heraBottomFinish: 'VARILLA BLANCA',
      heraInteriorFace: 'DERECHO',
      heraChainColor: 'BLANCO',
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
  test.each([
    ['HERA 43 MAQUINA', 220, 'BLANCO', 'SCRANILBLAN150C'],
    ['HERA 56 MAQUINA', 250, 'NEGRO', 'SCRANILNEGRO150C']
  ])('%s reserva un anillo por toldo usando altura y no salida', (submodel, height, heraChainColor, code) => {
    const result = hera({ submodel, height, heraChainColor, projection: 120, units: 3 });
    expect(result.ofs[0].calculation).toMatchObject({ chainLength: 300, chainRingLength: 150, chainRingCode: code });
    const reservation = normalizeReservation({ orderCode: 'AR26HERA', ofs: result.ofs });
    expect(reservation.ofs[0].materials).toContainEqual(expect.objectContaining({ code, quantity: 3 }));
    expect(result.diagnostics.some(item => item.level === 'pending')).toBe(false);
    const otherDrop = hera({ submodel, height, heraChainColor, projection: 200 });
    expect(otherDrop.ofs[0].calculation.chainRingCode).toBe(code);
  });

  test('normaliza y conserva el color elegido para la reserva', () => {
    const result = hera({ height: 250, heraChainColor: ' blanco ' });
    expect(result.ofs[0].calculation.chainRingCode).toBe('SCRANILBLAN150C');
  });

  test('deja pendiente el anillo sin referencia exacta', () => {
    const result = hera({ height: 230, heraChainColor: 'BLANCO' });
    expect(result.diagnostics.some(item => item.level === 'pending')).toBe(true);
    expect(result.ofs[0].materials.some(item => item.code.startsWith('SCRANIL'))).toBe(false);
  });

  test('sin color no calcula: el kit y el adaptador van en blanco o negro', () => {
    const result = hera({ height: 250, heraChainColor: '' });
    expect(result.ofs[0].calculation.valid).toBe(false);
    expect(result.diagnostics.map((item) => item.message).join(' ')).toContain('color cadena');
  });

  test('motor no reserva cadena aunque conserve el color de una variante manual', () => {
    const result = hera({ submodel: 'HERA 56 MOTOR', height: 250, heraChainColor: 'BLANCO' });
    expect(result.ofs[0].materials.some(item => item.code.startsWith('SCRANIL'))).toBe(false);
    expect(result.diagnostics.some(item => item.level === 'pending')).toBe(false);
  });

  test.each(['HERA 43 MAQUINA', 'HERA 56 MAQUINA'])('%s exige pedir cadena sin empalme aunque la tela lleve empate', (submodel) => {
    const result = hera({ submodel, heraJoin: 'VERTICAL' });
    expect(result.diagnostics).toContainEqual(expect.objectContaining({
      level: 'warn',
      awningId: 'hera-a',
      message: expect.stringContaining('pedir siempre cadena sin empalme (anillo de cadena)')
    }));
  });

  test('HERA 56 máquina reproduce el caso AR.24.00727', () => {
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
    expect(ofBlock.materials.map(({ code, quantity }) => [code, quantity])).toEqual([
      ['SOLTIS96NUBP267', 1.9],
      ['SCRKITSW4350BLAN', 1], ['SCRADPSWIFBLAN', 2], ['SCRTUBO53600C', 1],
      ['SCRECONTRCADBLAN', 1], ['SCRUNICADBLAN', 2],
      ['SCRPECBLAN600C', 1], ['SCRTAPINFBLANDCH', 1], ['SCRTAPINFBLANIZQ', 1],
      ['MACALENGUSCREN43', 1.59], ['VARILLAVAINARBLA', 1.59]
    ]);
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
    expect(result.diagnostics.some((item) => item.message.includes('anillo de cadena'))).toBe(false);
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
        heraBottomFinish: 'VARILLA BLANCA', heraInteriorFace: 'DERECHO',
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

test.each([{ heraBottomFinish: '' }, { heraInteriorFace: '' }, { heraInteriorFace: 'OTRO' }])('bloquea reserva si falta remate o cara interior: %j', (patch) => {
  const result = hera(patch);
  expect(result.ofs[0].calculation.valid).toBe(false);
  expect(result.ofs[0].materials).toEqual([]);
  expect(result.diagnostics.some((item) => item.level === 'error')).toBe(true);
});

describe('HERA: estructura según el consumo real', () => {
  const codes = (result) => Object.fromEntries(result.ofs[0].materials.map(({ code, quantity }) => [code, quantity]));

  test('AR2603165 (OF 0229888): cadena, varilla blanca y tubo Ø56 como gastó el almacén', () => {
    const materials = codes(hera({ width: 348.5, projection: 210, height: 260, heraJoin: 'VERTICAL' }));
    // Consumo real: kit, 2 adaptadores, tubo, contrapeso, 2 uniones, perfil de contrapeso
    // con sus tapones, y macarrón y varilla de 3,44 m (el ancho de la tela).
    expect(materials).toMatchObject({
      SCRKITSW4350BLAN: 1, SCRADPSWIFBLAN: 2, SCRTUBO53600C: 1, SCRECONTRCADBLAN: 1, SCRUNICADBLAN: 2,
      SCRPECBLAN600C: 1, SCRTAPINFBLANDCH: 1, SCRTAPINFBLANIZQ: 1, MACALENGUSCREN43: 3.44, VARILLAVAINARBLA: 3.44
    });
  });

  test('AR2602932 (OF 0229643): a motor, un adaptador, rueda LT50 y sin cadena', () => {
    const result = hera({ submodel: 'HERA 56 MOTOR', width: 270, projection: 200, height: 0, units: 3 });
    const materials = codes(result);
    expect(materials).toMatchObject({ SCRKITSW4350BLAN: 3, SCRADPSWIFBLAN: 3, RUEDAAPLT5053: 3, SCRTUBO53600C: 2, SCRPECBLAN600C: 2 });
    expect(Object.keys(materials).some((code) => /^SCR(ANIL|ECONTRCAD|UNICAD)/.test(code))).toBe(false);
    expect(result.diagnostics.map((item) => item.message).join(' ')).toContain('motor y mando sin reservar');
  });

  test('con pletina abajo, pletina 25×4 en negro en vez del perfil de contrapeso', () => {
    const materials = codes(hera({ heraBottomFinish: 'ENTRADA DE PLETINA', heraChainColor: 'NEGRO', height: 250 }));
    expect(materials).toMatchObject({ PLA4NEGR25MM635C: 1, SCRKITSW4350NEGR: 1, SCRADPSWIFNEGR: 2, SCRECONTRCADNEGRO: 1, SCRUNICADNEGR: 2 });
    expect(Object.keys(materials).some((code) => /^(SCRPEC|SCRTAPINF|VARILLA)/.test(code))).toBe(false);
  });

  test('HERA 43: kit solo para el Ø43 y tubo Ø43, sin adaptador', () => {
    const materials = codes(hera({ submodel: 'HERA 43 MAQUINA', height: 220 }));
    expect(materials).toMatchObject({ SCRKITSW43BLAN: 1, SCRTUBO43P600CM: 1 });
    expect(Object.keys(materials).some((code) => code.startsWith('SCRADPSWIF') || code === 'SCRTUBO53600C')).toBe(false);
  });
});
