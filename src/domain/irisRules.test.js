import { describe, expect, test } from 'vitest';
import { calculateIris } from './irisRules.js';

const fabric = 'IRISTESTP120|||120|||LONA DE PRUEBA IRIS';

// Las medidas del CAD de referencia. Ojo: 400 cm de caída superan los 300 que
// el manual da al 110, así que el caso solo es válido con excepción técnica.
// Es fiel a la realidad: el ejemplo de la oficina está fuera de tabla.
const skewed = {
  irisAssumeSquare: false,
  irisFrontTop: 355,
  irisFrontBottom: 350,
  irisExitLeft: 400,
  irisExitRight: 405,
  irisDiagonal1: 533.1,
  irisDiagonal2: 537,
  reglasModificadas: true
};

function awning(overrides = {}) {
  return {
    id: 'iris-test',
    of: '0239999',
    model: 'IRIS',
    units: 1,
    submodel: 'IRIS 110 CON COFRE',
    irisGuideType: 'ESTÁNDAR',
    irisGuideFixing: 'PARED',
    irisBoxShape: 'REDONDO',
    irisWindBlock: false,
    irisAssumeSquare: true,
    irisFrontTop: 300,
    irisFrontBottom: 0,
    irisExitLeft: 250,
    irisExitRight: 0,
    irisDiagonal1: 0,
    irisDiagonal2: 0,
    device: 'MAQUINA',
    machineSide: 'M.F.DER',
    crankHeight: 150,
    placement: 'FRONTAL',
    structureColor: 'BLANCO',
    wallType: '',
    curtainHasWindow: false,
    reglasModificadas: false,
    ...overrides
  };
}

function calculate(awningOverrides = {}, orderOverrides = {}) {
  return calculateIris({
    order: {
      orderCode: 'AR2609999',
      sameFabric: true,
      fabric,
      structureColor: 'BLANCO',
      parameters: {},
      ...orderOverrides
    },
    awning: awning(awningOverrides)
  });
}

describe('IRIS · medidas de corte', () => {
  test('110 con cofre a máquina aplica literalmente la tabla', () => {
    expect(calculate().calculation).toMatchObject({
      model: 'IRIS',
      irisConfigCode: '00000',
      width: 300,
      projection: 250,
      fabricWidth: 291,
      boxProfileLength: 298.6,
      rollTubeLength: 284.2,
      loadBarLength: 286.8,
      ballastLength: 273.8,
      guideLeftLength: 238,
      guideRightLength: 238,
      zipLeftLength: 0
    });
  });

  test('a motor cambia solo el tubo de enrolle', () => {
    expect(calculate({ device: 'MOTOR', crankHeight: null }).calculation)
      .toMatchObject({ rollTubeLength: 285.2, fabricWidth: 291 });
  });

  test('la fijación de techo cambia solo las guías', () => {
    expect(calculate({ irisGuideFixing: 'TECHO' }).calculation)
      .toMatchObject({ guideLeftLength: 237.8, guideRightLength: 237.8, fabricWidth: 291 });
  });

  test('entre paredes descuenta 6 mm más en cada pieza horizontal, no en las guías', () => {
    expect(calculate({ placement: 'ENTRE PAREDES' }).calculation).toMatchObject({
      fabricWidth: 290.4,
      boxProfileLength: 298,
      rollTubeLength: 283.6,
      loadBarLength: 286.2,
      ballastLength: 273.2,
      guideLeftLength: 238,
      guideRightLength: 238
    });
  });

  test('cada guía sale por la altura de su lado', () => {
    const { calculation } = calculate({ ...skewed, irisGuideType: 'COMPENSADORA' });
    expect(calculation.guideLeftLength).toBeCloseTo(388, 1);
    expect(calculation.guideRightLength).toBeCloseTo(393, 1);
    expect(calculation.compensatorLeftLength).toBeCloseTo(388.8, 1);
    expect(calculation.compensatorRightLength).toBeCloseTo(393.8, 1);
    expect(calculation.zipLeftLength).toBeCloseTo(388, 1);
    expect(calculation.zipRightLength).toBeCloseTo(393, 1);
  });

  test('con compensadora y la medida mayor arriba, el cofre va por el frente mayor', () => {
    const { calculation } = calculate({ ...skewed, irisGuideType: 'COMPENSADORA' });
    expect(calculation.boxProfileLength).toBeCloseTo(353.6, 1);
    expect(calculation.fabricWidth).toBeCloseTo(340.4, 1);
  });

  test('el 150 no lleva ZIP', () => {
    expect(calculate({ submodel: 'IRIS 150 CON COFRE', device: 'MOTOR', crankHeight: null }).calculation)
      .toMatchObject({
        irisConfigCode: '20010',
        boxProfileLength: 299.4,
        rollTubeLength: 283.2,
        ballastLength: 272.2,
        guideLeftLength: 234.5,
        zipLeftLength: 0
      });
  });
});

describe('IRIS · lona y cristal', () => {
  test('el metraje replica la fórmula del libro maestro', () => {
    // telón 291 sobre rollo de 120 → 3 paños; caída 250 + 40 = 290
    // ml = techo(3 × 290 / 100 ; 1 decimal) = 8,7
    expect(calculate().calculation).toMatchObject({ fabricPanels: 3, fabricMl: 8.7, mainFabricMl: 8.7 });
  });

  test('la ventana de cristal ahorra 1,4 m por paño', () => {
    // 8,7 − 1,4 × 3 = 4,5
    expect(calculate({ curtainHasWindow: true }).calculation)
      .toMatchObject({ fabricMl: 4.5, glassSize: 300, glassCode: 'CRISESTP140300C' });
  });

  test('el metraje escala con las unidades', () => {
    expect(calculate({ units: 2 }).calculation.fabricMl).toBe(17.4);
  });

  test('reserva la lona, las piezas comunes, el cofre, las guías y, con ventana, el cristal estabilizado', () => {
    // Piezas comunes de las OF de IRIS110C/CO a máquina (casquillo Ø70, placa, tubo P701,
    // pletina terminal, tapones, goma, casquillo de eje cuadrado, MB-11 y manivela), el
    // cofre redondo, la guía ÚNICA, la cremallera XL y la varilla y el macarrón.
    expect(calculate().materials.map(({ code, quantity }) => [code, quantity])).toEqual([
      ['IRISTESTP120', 8.7],
      ['CASNMOSZ70MM', 1], ['CASPLACASZ', 1], ['TURA70HG500C', 1], ['PLETSCR13300C', 1],
      ['TAPTERSZ13BLAN', 2], ['GOMASSCR700C', 1],
      ['CASCES132070MM', 1], ['MAQMB11L12BLAN', 1], ['MANIVEBL16150C', 1],
      ['PECOSSU1BLAN500C', 1], ['PECORSU1BLAN700C', 1], ['TAPASSUN1BLAN', 1],
      ['PEMMSU13BLAN600C', 1], ['PECGSU13BLAN600C', 1], ['PEGIZS1BLAN600C', 1], ['PIEGMMSUBLAN', 4],
      ['ZIPXLBLAN', 2.9], ['VARILLAVAINARBLA', 3.1], ['MACARRNEGR8MM', 3.1]
    ]);
    expect(calculate({ curtainHasWindow: true, units: 2 }).materials).toContainEqual({
      code: 'CRISESTP140300C',
      quantity: 2,
      description: 'CRISTAL ESTABILIZADO :140 AN :300CM'
    });
  });
});

describe('IRIS · diagnósticos', () => {
  test('un pedido completo es válido y no genera errores', () => {
    const result = calculate();
    expect(result.calculation.valid).toBe(true);
    expect(result.diagnostics.filter((item) => item.level === 'error')).toEqual([]);
  });

  test('exige las medidas y la configuración', () => {
    const result = calculate({ irisGuideFixing: '', irisExitLeft: 0 });
    expect(result.calculation.valid).toBe(false);
    expect(result.diagnostics.some((item) => item.level === 'error' && item.message.includes('falta'))).toBe(true);
  });

  test('bloquea la guía pequeña a máquina, que el fabricante no contempla', () => {
    const result = calculate({ irisGuideType: 'PEQUEÑA' });
    expect(result.calculation.valid).toBe(false);
    expect(result.diagnostics.some((item) => item.message.includes('no está contemplada'))).toBe(true);
  });

  test('bloquea el 150 a máquina', () => {
    const result = calculate({ submodel: 'IRIS 150 CON COFRE', device: 'MAQUINA' });
    expect(result.calculation.valid).toBe(false);
    expect(result.diagnostics.some((item) => item.message.includes('siempre va a motor'))).toBe(true);
  });

  test('bloquea fuera de los límites del manual', () => {
    const result = calculate({ irisFrontTop: 460 });
    expect(result.calculation.valid).toBe(false);
    expect(result.diagnostics.some((item) => item.message.includes('fuera de medidas'))).toBe(true);
  });

  test('avisa cuando la compensadora pasa de 2,5 cm sin llegar a bloquear', () => {
    const result = calculate({ ...skewed, irisGuideType: 'COMPENSADORA' });
    expect(result.calculation.valid).toBe(true);
    expect(result.diagnostics.some((item) => item.level === 'warn' && item.message.includes('2,5'))).toBe(true);
  });

  test('avisa a comercial si hay desnivel sin compensadora', () => {
    const result = calculate({
      irisAssumeSquare: false,
      irisFrontTop: 300, irisFrontBottom: 297,
      irisExitLeft: 250, irisExitRight: 250,
      irisDiagonal1: 390.5, irisDiagonal2: 390.5
    });
    expect(result.diagnostics.some((item) => item.level === 'warn' && item.message.includes('comercial'))).toBe(true);
  });

  test('avisa del plazo del cristal estabilizado', () => {
    expect(calculate({ curtainHasWindow: true }).diagnostics.some((item) => item.message.includes('un mes'))).toBe(true);
  });

  test('avisa de que el 130 sin cofre no tiene tabla del fabricante', () => {
    const result = calculate({ submodel: 'IRIS 130 SIN COFRE' });
    expect(result.calculation.valid).toBe(true);
    expect(result.diagnostics.some((item) => item.level === 'warn' && item.message.includes('sin tabla'))).toBe(true);
  });

  test('bloquea un hueco tan pequeño que los descuentos dejan piezas en negativo, aunque haya excepción técnica', () => {
    const result = calculate({
      reglasModificadas: true,
      irisFrontTop: 20,
      irisExitLeft: 20
    });
    expect(result.calculation.valid).toBe(false);
    expect(result.calculation.ballastLength).toBeLessThan(0);
    expect(result.diagnostics.some((item) => item.level === 'error'
      && item.message.includes('no dan para los descuentos de fabricación'))).toBe(true);
  });

  test('bloquea la ventana cuando el frente de tela supera el mayor cristal del catálogo, y no avisa del plazo', () => {
    const result = calculate({
      submodel: 'IRIS 150 CON COFRE',
      device: 'MOTOR',
      crankHeight: null,
      irisFrontTop: 780,
      curtainHasWindow: true
    });
    expect(result.calculation.valid).toBe(false);
    expect(result.calculation.glassSize).toBe(0);
    expect(result.diagnostics.some((item) => item.level === 'error'
      && item.message.includes('450'))).toBe(true);
    expect(result.diagnostics.some((item) => item.message.includes('un mes'))).toBe(false);
    // Ni cristal ni lona: antes componia CRISESTP140500C, que no existe en RPS.
    expect(result.materials).toEqual([]);
  });

  test('materials queda vacío cuando el toldo no es válido', () => {
    const result = calculate({ irisGuideType: 'PEQUEÑA' });
    expect(result.calculation.valid).toBe(false);
    expect(result.materials).toEqual([]);
  });
});

describe('IRIS · despiece', () => {
  test('numera las piezas del planteamiento con su medida', () => {
    expect(calculate().despiece.rows).toEqual([
      { num: 1, name: 'PERFIL COFRE', reference: null, units: 1, length: 298.6 },
      { num: 2, name: 'TUBO DE ENROLLE', reference: null, units: 1, length: 284.2 },
      { num: 3, name: 'TUBO DE CARGA', reference: null, units: 1, length: 286.8 },
      { num: 4, name: 'LASTRE', reference: null, units: 1, length: 273.8 },
      { num: 5, name: 'PERFIL GUÍA MFI', reference: null, units: 1, length: 238 },
      { num: 6, name: 'PERFIL GUÍA MFD', reference: null, units: 1, length: 238 },
      { num: 7, name: 'TELÓN', reference: 'IRISTESTP120', units: 1, length: 291 }
    ]);
  });

  test('añade compensación y ZIP cuando la guía es compensadora', () => {
    const names = calculate({ ...skewed, irisGuideType: 'COMPENSADORA' }).despiece.rows.map((row) => row.name);
    expect(names).toContain('GUÍA DE COMPENSACIÓN MFI');
    expect(names).toContain('PERFIL GUÍA INTERIOR ZIP MFD');
  });

  test('no hay despiece cuando el toldo no es válido', () => {
    expect(calculate({ irisGuideType: 'PEQUEÑA' }).despiece).toBeNull();
  });
});

describe('IRIS · piezas comunes según el consumo real', () => {
  const codes = (result) => Object.fromEntries(result.materials.map(({ code, quantity }) => [code, quantity]));

  test('130 a motor: casquillos Ø80, tubo P801, rueda P-801 mecanizada y soporte Hipro, sin máquina', () => {
    const result = calculate({ submodel: 'IRIS 130 CON COFRE', device: 'MOTOR', structureColor: 'NEGRO (R-09011)' });
    const materials = codes(result);
    expect(materials).toMatchObject({ CASNMOSZ78MM: 1, CASADMOSZ78MM: 1, RUEDAMOT801MEC: 1, SOPORTEUNVHIPRO: 1, TAPTERSZ13NEGR: 2, GOMASSCRN700C: 1 });
    expect(Object.keys(materials).some((code) => /^(MAQ|MANIVE|CASCES|TURA70)/.test(code))).toBe(false);
    expect(Object.keys(materials).some((code) => code.startsWith('TURA80HG'))).toBe(true);
    expect(result.diagnostics.map((item) => item.message).join(' ')).toContain('motor y mando sin reservar');
  });
});

// Casos reales: la configuración, el lacado y las medidas salen del texto de la línea de
// pedido; lo "gastado" es CPRImputationMaterialMO de esa OF. La cremallera antes de
// octubre de 2025 era la normal: ahora siempre la XL (acuerdo del 09/10/2025).
describe('IRIS · cofre, guías y cremallera según las respuestas de taller (24/09/2026)', () => {
  const real = (overrides) => calculate({ curtainHasWindow: false, ...overrides });
  const reserved = (result, from) => {
    const lines = result.materials.map(({ code, quantity }) => [code, quantity]);
    return lines.slice(lines.findIndex(([code]) => code === from));
  };

  test('OF 0216104 (AR2502025): 110 cofre cuadrado, antracita, motor, 247 × 217, pieza a pieza como lo gastado', () => {
    // Gastó PECOSSU1GR16400C, PECOCSU1GR16400C, TAPASCOU1GR16, PEMMSU13GR16500C,
    // PECGSU13GR16500C, PEGIZS1NEGR600C y 4 PIEGMMSUNEGR (y 3 m de cremallera normal).
    const result = real({ of: '0216104', irisBoxShape: 'CUADRADO', device: 'MOTOR', structureColor: 'ANTRACITA (RAL 7016)', irisFrontTop: 247, irisExitLeft: 217 });
    expect(reserved(result, 'PECOSSU1GR16400C')).toEqual([
      ['PECOSSU1GR16400C', 1], ['PECOCSU1GR16400C', 1], ['TAPASCOU1GR16', 1],
      ['PEMMSU13GR16500C', 1], ['PECGSU13GR16500C', 1], ['PEGIZS1NEGR600C', 1], ['PIEGMMSUNEGR', 4],
      ['ZIPXLGRIS', 2.47], ['VARILLAVAINARBLA', 2.57], ['MACARRNEGR8MM', 2.57]
    ]);
  });

  test('OF 0221340 (AR2505024): 110 cofre redondo, negro, máquina, 253 × 281,5: negro 9005 de BAT y XL gris', () => {
    // Gastó PECORSU1NE05700C, TAPASSUN1NE05, PECGSU13NEGR600C, PEGIZS1NEGR600C, 4 pies y
    // 3,3 m de ZIPXLGRIS; la caída de tela es 281,5 + 40 = 321,5.
    const result = real({ of: '0221340', structureColor: 'NEGRO (R-09011)', irisFrontTop: 253, irisExitLeft: 281.5 });
    expect(reserved(result, 'PECOSSU1NEGR700C')).toEqual([
      ['PECOSSU1NEGR700C', 1], ['PECORSU1NE05400C', 1], ['TAPASSUN1NE05', 1],
      ['PEMMSU13NEGR600C', 1], ['PECGSU13NEGR600C', 1], ['PEGIZS1NEGR600C', 1], ['PIEGMMSUNEGR', 4],
      ['ZIPXLGRIS', 3.22], ['VARILLAVAINARBLA', 2.63], ['MACARRNEGR8MM', 2.63]
    ]);
  });

  test('OF 0214360 (AR2501096): 130 cofre redondo, blanco, motor, 408 × 458: guías de más de 3 m, dos barras', () => {
    // Gastó PECOSSU3BLAN500C, PECORSU3BLAN500C, TAPASCOR3BLAN, 2 PEMMSU13BLAN600C,
    // 2 PECGSU13BLAN600C, 3 PEGIZS1BLAN600C, 4 PIEGMMSUBLAN y 5 m de cremallera blanca.
    const result = real({ of: '0214360', submodel: 'IRIS 130 CON COFRE', device: 'MOTOR', irisFrontTop: 408, irisExitLeft: 458 });
    expect(reserved(result, 'PECOSSU3BLAN500C')).toEqual([
      ['PECOSSU3BLAN500C', 1], ['PECORSU3BLAN500C', 1], ['TAPASCOR3BLAN', 1],
      ['PEMMSU13BLAN600C', 2], ['PECGSU13BLAN600C', 2], ['PEGIZS1BLAN600C', 2], ['PIEGMMSUBLAN', 4],
      ['ZIPXLBLAN', 4.98], ['VARILLAVAINARBLA', 4.18], ['MACARRNEGR8MM', 4.18]
    ]);
  });

  test('OF 0222767 (AR2505799): guía pequeña (GPZ ÚNICA M), perfil de guía solo motor y pies de enganche', () => {
    const result = real({ of: '0222767', irisGuideType: 'PEQUEÑA', device: 'MOTOR', structureColor: 'ANTRACITA (RAL 7016)', irisFrontTop: 294.5, irisExitLeft: 144.5 });
    const codes = Object.fromEntries(result.materials.map(({ code, quantity }) => [code, quantity]));
    // Gastó PEMoSU13GR16600CM (código terminado en CM) y 4 PIEGURSZ13NEGR.
    expect(codes).toMatchObject({ PEMoSU13GR16600CM: 1, PIEGURSZ13NEGR: 4, TAPASSUN1GR16: 1 });
    expect(Object.keys(codes).some((code) => code.startsWith('PEMMSU13') || code.startsWith('PIEGMMSU'))).toBe(false);
  });

  test('OF 0205831 (AR2403290): compensadora (GPZ C), blanco, máquina, 247 × 254', () => {
    // Gastó PEGSZ13BLAN600C, PEGCZ13BLAN600C, 2 PEGEZ13BLAN600C, PEGIZ13BLAN600C,
    // 2 PIEBLAN y TAPASSUN1BLAN. Dos guías de 242 caben en la barra de 500.
    const result = real({ of: '0205831', irisGuideType: 'COMPENSADORA', irisFrontTop: 247, irisExitLeft: 254 });
    expect(reserved(result, 'PEGSZ13BLAN500C')).toEqual([
      ['PEGSZ13BLAN500C', 1], ['PEGCZ13BLAN600C', 1], ['PEGEZ13BLAN600C', 2], ['PEGIZ13BLAN600C', 1], ['PIEBLAN', 2],
      ['ZIPXLBLAN', 2.94], ['VARILLAVAINARBLA', 2.57], ['MACARRNEGR8MM', 2.57]
    ]);
    expect(Object.fromEntries(result.materials.map(({ code, quantity }) => [code, quantity]))).toMatchObject({ TAPASSUN1BLAN: 1 });
  });

  test('OF 0218395 (AR2503239): 130 sin cofre, blanco, 450 × 252: sin cofre, con pernos de guía', () => {
    // Gastó PECGSU13BLAN600C, PEGIZS1BLAN600C, 4 PIEGMMSUBLAN, PERGUIA y 2,89 m de cremallera.
    const result = real({ of: '0218395', submodel: 'IRIS 130 SIN COFRE', irisBoxShape: '', irisFrontTop: 450, irisExitLeft: 252 });
    expect(reserved(result, 'PEMMSU13BLAN600C')).toEqual([
      ['PEMMSU13BLAN600C', 1], ['PECGSU13BLAN600C', 1], ['PEGIZS1BLAN600C', 1], ['PIEGMMSUBLAN', 4], ['PERGUIA', 1],
      ['ZIPXLBLAN', 2.92], ['VARILLAVAINARBLA', 4.6], ['MACARRNEGR8MM', 4.6]
    ]);
    expect(result.materials.some(({ code }) => /^(PECO|TAPAS)/.test(code))).toBe(false);
  });

  test('con cofre en el 110 y el 130 pide la forma; el 150 va siempre redondo', () => {
    const missing = real({ irisBoxShape: '' });
    expect(missing.calculation.valid).toBe(false);
    expect(missing.diagnostics.some((item) => item.level === 'error' && item.message.includes('forma del cofre'))).toBe(true);
    const iris150 = real({ submodel: 'IRIS 150 CON COFRE', device: 'MOTOR', irisBoxShape: '', irisFrontTop: 600, irisExitLeft: 300 });
    expect(iris150.calculation.valid).toBe(true);
    expect(iris150.calculation.irisBoxShape).toBe('REDONDO');
    expect(iris150.materials.map(({ code }) => code)).toEqual(
      expect.arrayContaining(['PECOSSU5BL10600C', 'PECORSU5BL10600C', 'TAPASSUN5BL10'])
    );
  });

  test('sin el color en BAT va en bruto para lacar fuera; si tampoco hay bruto, avisa sin inventar el código', () => {
    // 130 negro: no hay cofre 130 en 9005 (bruto, como la OF 0214385), ni tapas cuadradas
    // en negro o bruto, ni perfil de guía solo motor en negro.
    const result = real({ submodel: 'IRIS 130 CON COFRE', irisBoxShape: 'CUADRADO', irisGuideType: 'PEQUEÑA', device: 'MOTOR', structureColor: 'NEGRO (R-09011)' });
    const codes = result.materials.map(({ code }) => code);
    expect(codes).toEqual(expect.arrayContaining(['PECOSSU3BRUT500C', 'PECOCSU3BRUT500C']));
    expect(codes.some((code) => code.startsWith('TAPASCOU3') || code.startsWith('PEMoSU13'))).toBe(false);
    const messages = result.diagnostics.map((item) => item.message).join(' ');
    expect(messages).toContain('en bruto para lacarlo fuera');
    expect(messages).toContain('tapas del cofre cuadrado, perfil de guía solo motor');
  });

  test('a motor avisa de que el motor no se reserva y de que lo habitual es el Sunilus (Q-I05)', () => {
    const messages = real({ device: 'MOTOR' }).diagnostics.map((item) => item.message).join(' ');
    expect(messages).toContain('Lo habitual es el Sunilus, pero lo elige taller');
    expect(messages).not.toContain('guías y cremallera sin reservar');
  });
});
