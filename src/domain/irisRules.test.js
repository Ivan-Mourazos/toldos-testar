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

  test('reserva la lona y, con ventana, el cristal estabilizado', () => {
    expect(calculate().materials).toEqual([
      { code: 'IRISTESTP120', quantity: 8.7, description: 'LONA DE PRUEBA IRIS' }
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
