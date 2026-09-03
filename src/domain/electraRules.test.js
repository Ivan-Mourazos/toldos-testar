import { describe, expect, test } from 'vitest';
import { calculateElectra } from './electraRules.js';

const fabric = 'ELECTRATESTP120|||120|||LONA DE PRUEBA ELECTRA';

function awning(overrides = {}) {
  return {
    id: 'electra-test',
    of: '0239999',
    model: 'ELECTRA',
    units: 1,
    width: 300,
    projection: 250,
    valanceHeight: 0,
    submodel: 'SIN COFRE / CON GUÍA',
    electraSupport: 'SOPORTE ELIT VERTICAL',
    device: 'MAQ. INTERIOR',
    motorPower: 'METEOR 20/17',
    machineSide: 'M.F.DER',
    crankHeight: 150,
    placement: 'FRONTAL',
    structureColor: '',
    wallType: '',
    curtainHasWindow: false,
    curtainFinish: 'NORMAL',
    reglasModificadas: false,
    ...overrides
  };
}

function calculate(awningOverrides = {}, orderOverrides = {}) {
  return calculateElectra({
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

describe('ELECTRA / Elit Vertical · descuentos según soporte', () => {
  test.each([
    ['SOPORTE ELIT VERTICAL', 'MAQ. INTERIOR', 290, 292, 290.5, 236, 295],
    ['SOPORTE ELIT VERTICAL', 'MAQ. EXTERIOR', 290, 292, 290.5, 236, 295],
    ['SOPORTE ELIT VERTICAL', 'MOTOR', 290, 292, 290.5, 236, 290],
    ['SOPORTES ALMAGRO', 'MAQ. INTERIOR', 290, 291, 290.5, 235.5, 295],
    ['SOPORTES ALMAGRO', 'MAQ. EXTERIOR', 290, 291, 290.5, 235.5, 295],
    ['SOPORTES ALMAGRO', 'MOTOR', 290.5, 291.5, 291, 235.5, 290],
    ['UNIVERSAL 3 AGUJEROS', 'MAQ. INTERIOR', 288, 289, 289, 236, 295],
    ['UNIVERSAL 3 AGUJEROS', 'MAQ. EXTERIOR', 287.5, 289, 289, 236, 295],
    ['UNIVERSAL 3 AGUJEROS', 'MOTOR', 289, 290, 290, 236, 290]
  ])(
    '%s con %s aplica literalmente la tabla guía',
    (electraSupport, device, fabricWidth, rollTubeLength, loadBarLength, guideLength, fabricDrop) => {
      const result = calculate({
        electraSupport,
        device,
        crankHeight: device === 'MOTOR' ? null : 150
      });

      expect(result.calculation).toMatchObject({
        valid: true,
        fabricWidth,
        rollTubeLength,
        loadBarLength,
        structureLength: loadBarLength,
        guideLength,
        fabricDrop
      });
    }
  );

  test('el tipo de soporte es obligatorio y nunca se presupone', () => {
    const result = calculate({ electraSupport: '' });

    expect(result.calculation.valid).toBe(false);
    expect(result.materials).toEqual([]);
    expect(result.despiece).toBeNull();
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ level: 'error', message: expect.stringContaining('tipo de soporte') })
    ]));
  });

  test.each([
    ['SOPORTE ELIT VERTICAL', 'ELITSOSTBL16'],
    ['SOPORTES ALMAGRO', 'SOPALMAGRBLAN'],
    ['UNIVERSAL 3 AGUJEROS', 'SOPUNI3AGUBL16'],
    ['SOPORTE MAXISCREEN', 'SOPMAXSCRBL16']
  ])('%s reserva su referencia propia', (electraSupport, supportCode) => {
    const result = calculate({ electraSupport });

    expect(result.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: supportCode, quantity: 1 })
    ]));
  });

  test('el soporte Universal reproduce el perfil y accesorios observados en pedidos reales', () => {
    const result = calculate({ electraSupport: 'UNIVERSAL 3 AGUJEROS' });

    expect(result.calculation.profileStockLength).toBe(600);
    expect(result.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PUNI280BL16600C', quantity: 1 }),
      expect.objectContaining({ code: 'TAPOPLUN280BL16', quantity: 1 }),
      expect.objectContaining({ code: 'MOSQBOACIN60MM', quantity: 2 })
    ]));
  });

  test('el soporte Maxiscreen usa los mismos descuentos que Cortina con Maxiscreen', () => {
    const result = calculate({ electraSupport: 'SOPORTE MAXISCREEN' });

    expect(result.calculation).toMatchObject({
      valid: true,
      fabricWidth: 288,
      rollTubeLength: 289,
      loadBarLength: 289,
      guideLength: 236
    });
    expect(result.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SOPMAXSCRBL16', quantity: 1 })
    ]));
  });
});

describe('ELECTRA / Elit Vertical · variantes', () => {
  test.each([
    ['CON COFRE / SIN GUÍA', 'SOPORTE MAXISCREEM BOX', true, false],
    ['SIN COFRE / CON GUÍA', 'SOPORTE ELIT VERTICAL', false, true]
  ])('%s genera solo los perfiles históricamente contrastados', (submodel, electraSupport, hasCofre, hasGuide) => {
    const result = calculate({ submodel, electraSupport });
    const codes = result.materials.map(({ code }) => code);

    expect(result.calculation.valid).toBe(true);
    expect(result.calculation.boxProfileLength > 0).toBe(hasCofre);
    expect(result.calculation.guideLength > 0).toBe(hasGuide);
    expect(codes.some((code) => code.startsWith('PERPRLON'))).toBe(hasCofre);
    expect(codes.some((code) => code.startsWith('ELITGU12'))).toBe(hasGuide);
    expect(codes.some((code) => code.startsWith('KITRETENEDOR'))).toBe(hasGuide);
  });

  test.each(['CON COFRE / CON GUÍA', 'SIN COFRE / SIN GUÍA'])(
    '%s queda bloqueada sin excepción por falta de histórico reciente',
    (submodel) => {
      const result = calculate({
        submodel,
        electraSupport: submodel.startsWith('CON COFRE') ? 'SOPORTE MAXISCREEM BOX' : 'SOPORTE ELIT VERTICAL'
      });

      expect(result.calculation.valid).toBe(false);
      expect(result.materials).toEqual([]);
      expect(result.diagnostics).toEqual(expect.arrayContaining([
        expect.objectContaining({ level: 'error', message: expect.stringContaining('no hay fabricación reciente validada') })
      ]));
    }
  );

  test('una excepción técnica habilita la variante sin cofre y sin guía', () => {
    const result = calculate({
      submodel: 'SIN COFRE / SIN GUÍA',
      reglasModificadas: true
    });

    expect(result.calculation.valid).toBe(true);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ level: 'warn', message: expect.stringContaining('variante sin caso reciente') })
    ]));
  });

  test('cofre con guía exige además indicar su descuento no documentado', () => {
    const incomplete = calculate({
      submodel: 'CON COFRE / CON GUÍA',
      electraSupport: 'SOPORTE MAXISCREEM BOX',
      reglasModificadas: true,
      electraGuideDiscountCm: null
    });
    const confirmed = calculate({
      submodel: 'CON COFRE / CON GUÍA',
      electraSupport: 'SOPORTE MAXISCREEM BOX',
      reglasModificadas: true,
      electraGuideDiscountCm: 12
    });

    expect(incomplete.calculation.valid).toBe(false);
    expect(incomplete.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining('descuento de guía confirmado') })
    ]));
    expect(confirmed.calculation).toMatchObject({ valid: true, guideLength: 238 });
  });

  test('con cofre y máquina aplica los descuentos históricos de MAXISCREEM', () => {
    const result = calculate({
      submodel: 'CON COFRE / SIN GUÍA',
      electraSupport: 'SOPORTE MAXISCREEM BOX'
    });

    expect(result.calculation).toMatchObject({
      valid: true,
      fabricWidth: 285.9,
      rollTubeLength: 287.5,
      loadBarLength: 284.9,
      boxProfileLength: 291.5,
      guideLength: 0
    });
    expect(result.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SOPMAXSCRBOXBL16', quantity: 1 }),
      expect.objectContaining({ code: 'PERPRLONBL16500C', quantity: 1 })
    ]));
  });

  test('el lacado especial conserva las referencias reales de stock sin sufijo', () => {
    const result = calculate({
      submodel: 'CON COFRE / SIN GUÍA',
      electraSupport: 'SOPORTE MAXISCREEM BOX',
      structureColor: 'LACADO ESPECIAL'
    }, { structureColor: '' });

    expect(result.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PECARMAX500C' }),
      expect.objectContaining({ code: 'PERPRLON500C' })
    ]));
  });

  test('el soporte de cofre negro conserva su referencia histórica', () => {
    const result = calculate({
      submodel: 'CON COFRE / SIN GUÍA',
      electraSupport: 'SOPORTE MAXISCREEM BOX',
      structureColor: 'NEGRO (R-09011)'
    }, { structureColor: '' });

    expect(result.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'SOPMAXSCRBOXNE11' })
    ]));
  });

  test('con cofre y motor aplica su juego de descuentos y el motor confirmado', () => {
    const result = calculate({
      submodel: 'CON COFRE / SIN GUÍA',
      electraSupport: 'SOPORTE MAXISCREEM BOX',
      device: 'MOTOR',
      crankHeight: null
    });

    expect(result.calculation).toMatchObject({
      valid: true,
      fabricWidth: 287.4,
      rollTubeLength: 290.3,
      loadBarLength: 288.4,
      boxProfileLength: 295,
      guideLength: 0,
      motorPower: 'METEOR 20/17'
    });
    expect(result.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'METEOR20//17', quantity: 1 })
    ]));
  });

  test('el motor no se presupone y debe confirmarse en el pedido', () => {
    const result = calculate({ device: 'MOTOR', motorPower: '', crankHeight: null });

    expect(result.calculation.valid).toBe(false);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining('motor Electra confirmado') })
    ]));
  });

  test('el soporte elegido debe corresponder a la construcción con o sin cofre', () => {
    const result = calculate({
      submodel: 'CON COFRE / SIN GUÍA',
      electraSupport: 'SOPORTE ELIT VERTICAL'
    });

    expect(result.calculation.valid).toBe(false);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining('SOPORTE MAXISCREEM BOX') })
    ]));
  });

  test('usa casquillo de 50 mm sin cofre y de 63 mm con cofre', () => {
    expect(calculate().materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'CASMAQEJE5078MM' })
    ]));
    expect(calculate({
      submodel: 'CON COFRE / SIN GUÍA',
      electraSupport: 'SOPORTE MAXISCREEM BOX'
    }).materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'CASMAQEJE6378MM' })
    ]));
  });

  test('usa referencia base y avisa cuando no existe perfil terminado activo', () => {
    const result = calculate({ structureColor: 'MARFIL (R-01015)' }, { structureColor: '' });

    expect(result.materials).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'PECARMAX' })
    ]));
    expect(result.materials.some(({ code }) => code === 'PECARMAXMA15500C')).toBe(false);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ level: 'warn', message: expect.stringContaining('referencia base PECARMAX') })
    ]));
  });

  test('ventana, bamba o confección especial requieren excepción técnica', () => {
    const blocked = calculate({ curtainHasWindow: true, curtainWindowExit: 20, curtainWindowCorner: 20, curtainWindowFloorHeight: 40, curtainWindowHeight: 80 });
    const authorized = calculate({ curtainFinish: 'VELCRO', reglasModificadas: true });

    expect(blocked.calculation.valid).toBe(false);
    expect(blocked.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining('confección especial') })
    ]));
    expect(authorized.calculation.valid).toBe(true);
  });
});

describe('ELECTRA / Elit Vertical · límites técnicos', () => {
  test('admite exactamente el estándar 500x300', () => {
    const result = calculate({ width: 500, projection: 300 });

    expect(result.calculation).toMatchObject({ valid: true, width: 500, projection: 300 });
  });

  test('rechaza medidas superiores a 500x300 sin excepción', () => {
    const result = calculate({ width: 520, projection: 320 });

    expect(result.calculation.valid).toBe(false);
    expect(result.materials).toEqual([]);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ level: 'error', message: expect.stringContaining('máximo 500x300') })
    ]));
  });

  test('acepta una medida fuera de estándar con excepción técnica', () => {
    const result = calculate({
      width: 520,
      projection: 320,
      reglasModificadas: true
    });

    expect(result.calculation).toMatchObject({
      valid: true,
      width: 520,
      projection: 320,
      profileStockLength: 700,
      guideStockLength: 500
    });
    expect(result.materials.length).toBeGreaterThan(0);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ level: 'warn', message: expect.stringContaining('Excepción técnica') })
    ]));
  });
});
