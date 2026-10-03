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
      reservedFabricMl: 2
    });
    expect(ofBlock.materials.map(({ code, quantity }) => [code, quantity])).toEqual([
      ['SOLTIS96NUBP267', 1.9],
      ['SCRKITSW4350BLAN', 1], ['SCRADPSWIFBLAN', 2], ['SCRTUBO53600C', 1],
      ['SCRECONTRCADBLAN', 1], ['SCRUNICADBLAN', 2],
      ['SCRPECBLAN600C', 1], ['SCRTAPINFBLANDCH', 1], ['SCRTAPINFBLANIZQ', 1],
      ['MACALENGUSCREN43', 1.59], ['VARILLAVAINARBLA', 1.59]
    ]);
    // Desde el 03/10/2026 lleva despiece: lo reservado menos la tela, el macarrón y la varilla.
    expect(ofBlock.despiece.rows.map((row) => row.reference)).toEqual(ofBlock.materials.slice(1, 9).map((line) => line.code));
    // El aviso de «completar en CAD» se quitó el 03/10/2026: la web ya hace el planteamiento entero.
    expect(result.diagnostics.some((item) => item.message.includes('CAD'))).toBe(false);
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
    expect(reservation.ofs[0].materials).toHaveLength(3);
    expect(reservation.ofs[0].materials).toEqual(expect.arrayContaining([
      { code: 'SOLTIS96NUBP267', description: 'SOLTIS 96 NUBE', quantity: 3 },
      // Iván, 02/10/2026: a motor, Sunilus IO 6/17 y un Situo 1 por toldo.
      expect.objectContaining({ code: 'SUNILUSIO6//17', quantity: 2 }),
      expect.objectContaining({ code: 'SITUOIO1PURE', quantity: 2 })
    ]));
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
    // Iván, 02/10/2026: Sunilus IO 6/17 y un Situo 1 por motor, lo mismo que gastó esta OF.
    expect(materials).toMatchObject({ 'SUNILUSIO6//17': 3, SITUOIO1PURE: 3 });
    expect(result.diagnostics.map((item) => item.message).join(' ')).not.toContain('sin reservar');
  });

  test('HERA a motor: en la tarjeta se elige otro Sunilus', () => {
    const materials = codes(hera({ submodel: 'HERA 56 MOTOR', width: 270, projection: 200, height: 0, motorPower: '10/17' }));
    expect(materials).toMatchObject({ 'SUNILUSIO10//17': 1, SITUOIO1PURE: 1 });
    expect(materials['SUNILUSIO6//17']).toBeUndefined();
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

// El HERA es un modelo normal desde el 03/10/2026: su página de estructura lleva el despiece
// de lo que ya se reserva, sin añadir ni quitar nada.
describe('HERA: despiece del planteamiento', () => {
  const filas = (result) => result.ofs[0].despiece.rows;
  const resumen = (result) => filas(result).map(({ name, reference, units, length }) => [name, reference, units, length]);
  const reservados = (result) => new Set(result.ofs[0].materials.map((line) => line.code));

  test('con cadena y varilla blanca: kit, adaptadores, tubo, contrapeso, uniones, perfil y tapones; el anillo, en accesorios', () => {
    const result = hera({ width: 348.5, projection: 210, height: 250, units: 2, heraJoin: 'VERTICAL' });
    expect(result.ofs[0].calculation).toMatchObject({ valid: true, rollTubeLength: 344.8, fabricWidth: 344, chainRingCode: 'SCRANILBLAN150C' });
    expect(resumen(result)).toEqual([
      ['KIT MECANISMO SWIFT 43-56', 'SCRKITSW4350BLAN', 2, null],
      ['ADAPTADOR SWIFT', 'SCRADPSWIFBLAN', 4, null],
      ['TUBO DE ENROLLE', 'SCRTUBO53600C', 2, 344.8],
      ['CONTRAPESO DE CADENA', 'SCRECONTRCADBLAN', 2, null],
      ['UNIÓN DE CADENA', 'SCRUNICADBLAN', 4, null],
      ['PERFIL DE CONTRAPESO', 'SCRPECBLAN600C', 2, 344],
      ['TAPÓN INFERIOR DERECHO', 'SCRTAPINFBLANDCH', 2, null],
      ['TAPÓN INFERIOR IZQUIERDO', 'SCRTAPINFBLANIZQ', 2, null],
      ['ANILLO DE CADENA BLANCO 150 CM', 'SCRANILBLAN150C', 2, null]
    ]);
    expect(filas(result).map((row) => row.num)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(filas(result).filter((row) => row.accessory).map((row) => row.reference)).toEqual(['SCRANILBLAN150C']);
    expect(result.ofs[0].despiece.anchoring).toBeNull();
    // El tubo sale por piezas (dos toldos), aunque se reserven barras.
    expect(result.ofs[0].materials.find((line) => line.code === 'SCRTUBO53600C').quantity).toBe(2);
  });

  test('a motor y con pletina: un adaptador, rueda LT50, el motor y la pletina; el mando, en accesorios', () => {
    const result = hera({ submodel: 'HERA 56 MOTOR', width: 270, projection: 200, height: 0, heraBottomFinish: 'PLETINA', heraChainColor: 'NEGRO' });
    expect(resumen(result)).toEqual([
      ['KIT MECANISMO SWIFT 43-56', 'SCRKITSW4350NEGR', 1, null],
      ['ADAPTADOR SWIFT', 'SCRADPSWIFNEGR', 1, null],
      ['TUBO DE ENROLLE', 'SCRTUBO53600C', 1, result.ofs[0].calculation.rollTubeLength],
      ['RUEDA LT50', 'RUEDAAPLT5053', 1, null],
      ['MOTOR SOMFY SUNILUS 6/17 IO', 'SUNILUSIO6//17', 1, null],
      ['PLETINA', 'PLA4NEGR25MM635C', 1, result.ofs[0].calculation.fabricWidth],
      ['MANDO SITUO 1 IO PURE', 'SITUOIO1PURE', 1, null]
    ]);
    expect(filas(result).filter((row) => row.accessory).map((row) => row.reference)).toEqual(['SITUOIO1PURE']);
  });

  test('HERA 43: su kit y su tubo, sin adaptador', () => {
    const result = hera({ submodel: 'HERA 43 MAQUINA', height: 220 });
    expect(resumen(result).slice(0, 2)).toEqual([
      ['KIT MECANISMO SWIFT 43', 'SCRKITSW43BLAN', 1, null],
      ['TUBO DE ENROLLE', 'SCRTUBO43P600CM', 1, result.ofs[0].calculation.rollTubeLength]
    ]);
  });

  test('con E.T. platanero no sale nada abajo, y sin anillo de referencia exacta no hay fila de anillo', () => {
    const result = hera({ heraBottomFinish: 'E.T. PLATANERO', height: 233 });
    expect(result.ofs[0].calculation.chainRingCode).toBe('');
    expect(filas(result).map((row) => row.reference)).toEqual(['SCRKITSW4350BLAN', 'SCRADPSWIFBLAN', 'SCRTUBO53600C', 'SCRECONTRCADBLAN', 'SCRUNICADBLAN']);
  });

  test.each([
    ['cadena y varilla', {}],
    ['cadena y pletina', { heraBottomFinish: 'ENTRADA DE PLETINA' }],
    ['motor', { submodel: 'HERA 56 MOTOR', height: 0 }]
  ])('%s: el macarrón y la varilla no van en el despiece, y cada referencia del despiece está reservada', (_caso, overrides) => {
    const result = hera(overrides);
    const references = filas(result).map((row) => row.reference);
    expect(references.some((code) => /^(MACA|VARILLA)/.test(code))).toBe(false);
    for (const code of references) expect(reservados(result).has(code)).toBe(true);
    // Y al revés: todo lo reservado menos la tela y el material de confección está en el despiece.
    const esperado = result.ofs[0].materials.slice(1).map((line) => line.code).filter((code) => !/^(MACA|VARILLA)/.test(code));
    expect([...references].sort()).toEqual([...esperado].sort());
    expect(reservados(result).has('MACALENGUSCREN43')).toBe(true);
  });

  test('sin cálculo válido no hay despiece', () => {
    expect(hera({ heraInteriorFace: '' }).ofs[0].despiece).toBeNull();
  });
});
